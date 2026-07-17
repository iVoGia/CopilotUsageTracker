import * as vscode from 'vscode';
import { createHash, randomUUID } from 'crypto';
import { defaultTokenEstimator } from '@ghc/token-estimator';
import { EventQueue } from './event-queue';
import { ApiClient } from './api-client';

let statusBar: vscode.StatusBarItem;
let queue: EventQueue;
let api: ApiClient;
let currentTaskLabel: string | undefined;
let loggedIn = false;
let lastError: string | undefined;
let displayName: string | undefined;

const MODEL_PRESETS: { label: string; model: string; provider: string }[] = [
  { label: 'GPT-4.1 (OpenAI)', model: 'gpt-4.1', provider: 'OpenAI' },
  { label: 'Claude Sonnet (Anthropic)', model: 'claude-sonnet', provider: 'Anthropic' },
  { label: 'Gemini 2.0 (Google)', model: 'gemini-2.0', provider: 'Google' },
  { label: 'Custom…', model: '', provider: '' },
];

export async function activate(context: vscode.ExtensionContext) {
  statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  statusBar.show();

  api = new ApiClient(() =>
    vscode.workspace.getConfiguration('ghc').get<string>('apiBaseUrl', 'http://localhost:3001/api'),
  );
  queue = new EventQueue(api);

  context.subscriptions.push(
    statusBar,
    vscode.commands.registerCommand('ghc.setup', () => runSetup(context)),
    vscode.commands.registerCommand('ghc.login', () => runSetup(context)),
    vscode.commands.registerCommand('ghc.startTask', () => startTask()),
    vscode.commands.registerCommand('ghc.endTask', () => endTask()),
    vscode.commands.registerCommand('ghc.flush', () => flushSafe()),
    vscode.commands.registerCommand('ghc.recordChatTurn', () => recordChatTurn()),
  );

  const token = await context.secrets.get('ghc.accessToken');
  displayName = (await context.secrets.get('ghc.displayName')) ?? undefined;
  if (token) {
    api.setToken(token);
    loggedIn = true;
  }

  updateStatus();

  if (!loggedIn) {
    const choice = await vscode.window.showInformationMessage(
      'Set up Copilot Usage Tracker to start logging metadata (never prompt content).',
      'Set up',
    );
    if (choice === 'Set up') {
      await runSetup(context);
    }
  }

  const flushInterval = setInterval(() => {
    queue.flush().catch((err) => {
      lastError = (err as Error).message;
      updateStatus();
    });
  }, 2000);
  context.subscriptions.push({ dispose: () => clearInterval(flushInterval) });
}

export function deactivate() {
  return queue?.flush().catch(() => undefined);
}

async function runSetup(context: vscode.ExtensionContext) {
  const cfg = vscode.workspace.getConfiguration('ghc');

  const apiBaseUrl = await vscode.window.showInputBox({
    prompt: 'API base URL',
    value: cfg.get<string>('apiBaseUrl', 'http://localhost:3001/api'),
    ignoreFocusOut: true,
  });
  if (!apiBaseUrl) return;

  await cfg.update('apiBaseUrl', apiBaseUrl.replace(/\/$/, ''), vscode.ConfigurationTarget.Global);

  const githubId =
    cfg.get<string>('githubId') ||
    (await vscode.window.showInputBox({
      prompt: 'GitHub ID (pilot login)',
      ignoreFocusOut: true,
      placeHolder: 'your-github-username-or-id',
    }));
  if (!githubId) return;

  const name =
    cfg.get<string>('displayName') ||
    (await vscode.window.showInputBox({
      prompt: 'Display name',
      value: githubId,
      ignoreFocusOut: true,
    }));
  if (!name) return;

  await cfg.update('githubId', githubId, vscode.ConfigurationTarget.Global);
  await cfg.update('displayName', name, vscode.ConfigurationTarget.Global);

  try {
    const healthy = await api.health();
    if (!healthy) {
      lastError = `API not reachable at ${apiBaseUrl}`;
      updateStatus();
      vscode.window.showErrorMessage(
        `Cannot reach API at ${apiBaseUrl}. Start the stack with: npm run dev:local`,
      );
      return;
    }

    const result = await api.devLogin(githubId, name);
    await context.secrets.store('ghc.accessToken', result.accessToken);
    await context.secrets.store('ghc.refreshToken', result.refreshToken);
    await context.secrets.store('ghc.displayName', name);
    api.setToken(result.accessToken);
    loggedIn = true;
    displayName = name;
    lastError = undefined;
    updateStatus();
    vscode.window.showInformationMessage(
      `Logged in as ${name}. Next: Start Task, then Record Chat Turn (lengths only).`,
    );
  } catch (err) {
    loggedIn = false;
    lastError = (err as Error).message;
    updateStatus();
    vscode.window.showErrorMessage(`Setup failed: ${(err as Error).message}`);
  }
}

async function startTask() {
  if (!ensureLoggedIn()) return;
  const label = await vscode.window.showInputBox({
    prompt: 'Task label (e.g. ABC-123 or Login Refactor)',
    placeHolder: 'ABC-123',
    ignoreFocusOut: true,
  });
  if (!label) return;
  currentTaskLabel = label.replace(/^\/start\s+/i, '').trim();
  try {
    await api.startTask(currentTaskLabel);
    lastError = undefined;
    vscode.window.showInformationMessage(`Task started: ${currentTaskLabel}`);
  } catch (err) {
    lastError = (err as Error).message;
    vscode.window.showErrorMessage(`Failed to start task: ${(err as Error).message}`);
  }
  updateStatus();
}

async function endTask() {
  if (!ensureLoggedIn()) return;
  currentTaskLabel = undefined;
  try {
    await api.endTask();
    lastError = undefined;
  } catch (err) {
    lastError = (err as Error).message;
    vscode.window.showErrorMessage(`Failed to end task: ${(err as Error).message}`);
  }
  updateStatus();
}

async function recordChatTurn() {
  if (!ensureLoggedIn()) return;

  const pick = await vscode.window.showQuickPick(
    MODEL_PRESETS.map((m) => ({ label: m.label, description: m.model || 'enter manually', preset: m })),
    { placeHolder: 'Select model (metadata only — no prompt content)', ignoreFocusOut: true },
  );
  if (!pick) return;

  let model = pick.preset.model;
  let provider = pick.preset.provider;
  if (!model) {
    model =
      (await vscode.window.showInputBox({
        prompt: 'Model name',
        value: 'gpt-4.1',
        ignoreFocusOut: true,
      })) ?? '';
    provider =
      (await vscode.window.showInputBox({
        prompt: 'Provider',
        value: 'OpenAI',
        ignoreFocusOut: true,
      })) ?? '';
  }
  if (!model || !provider) return;

  const promptLength = await vscode.window.showInputBox({
    prompt: 'Prompt length (characters) — Do NOT paste the prompt',
    validateInput: (v) => (/^\d+$/.test(v) ? undefined : 'Enter a number'),
    ignoreFocusOut: true,
  });
  const responseLength = await vscode.window.showInputBox({
    prompt: 'Response length (characters) — Do NOT paste the response',
    validateInput: (v) => (/^\d+$/.test(v) ? undefined : 'Enter a number'),
    ignoreFocusOut: true,
  });
  if (!promptLength || !responseLength) return;

  try {
    await recordChatMetadata({
      promptLength: Number(promptLength),
      responseLength: Number(responseLength),
      model,
      provider,
      success: true,
      durationMs: 0,
    });
    await queue.flush();
    lastError = undefined;
    vscode.window.showInformationMessage('Queued 1 event and flushed to API.');
    updateStatus();
  } catch (err) {
    lastError = (err as Error).message;
    updateStatus();
    vscode.window.showErrorMessage(`Failed to record: ${(err as Error).message}`);
  }
}

async function flushSafe() {
  try {
    await queue.flush();
    lastError = undefined;
    vscode.window.showInformationMessage('Events flushed.');
  } catch (err) {
    lastError = (err as Error).message;
    vscode.window.showErrorMessage(`Flush failed: ${(err as Error).message}`);
  }
  updateStatus();
}

function ensureLoggedIn(): boolean {
  if (loggedIn && api.getToken()) return true;
  vscode.window
    .showWarningMessage('Not signed in. Run Copilot Tracker: Setup first.', 'Set up')
    .then((c) => {
      if (c === 'Set up') vscode.commands.executeCommand('ghc.setup');
    });
  return false;
}

function updateStatus() {
  if (lastError) {
    statusBar.text = '$(warning) GHC: offline';
    statusBar.tooltip = lastError;
    statusBar.command = 'ghc.setup';
    return;
  }
  if (!loggedIn) {
    statusBar.text = '$(account) GHC: Sign in';
    statusBar.tooltip = 'Set up Copilot Usage Tracker';
    statusBar.command = 'ghc.setup';
    return;
  }
  if (currentTaskLabel) {
    statusBar.text = `$(pulse) GHC: ${currentTaskLabel}`;
    statusBar.tooltip = `Logged in as ${displayName ?? 'user'} · click to change task`;
    statusBar.command = 'ghc.startTask';
    return;
  }
  statusBar.text = `$(pulse) GHC: ${displayName ?? 'ready'}`;
  statusBar.tooltip = 'Start a task to attribute usage';
  statusBar.command = 'ghc.startTask';
}

async function recordChatMetadata(input: {
  promptLength: number;
  responseLength: number;
  provider: string;
  model: string;
  success: boolean;
  durationMs: number;
  errorCode?: string;
}) {
  const machineId = createHash('sha256')
    .update(vscode.env.machineId)
    .digest('hex')
    .slice(0, 32);

  const inputTokens = defaultTokenEstimator.estimateInput({
    provider: input.provider,
    model: input.model,
    charLength: input.promptLength,
  });
  const outputTokens = defaultTokenEstimator.estimateOutput({
    provider: input.provider,
    model: input.model,
    charLength: input.responseLength,
  });
  const estimatedCredits = defaultTokenEstimator.estimateCredits({
    provider: input.provider,
    model: input.model,
    inputTokens,
    outputTokens,
  });

  const folder = vscode.workspace.workspaceFolders?.[0];
  await queue.enqueue({
    idempotencyKey: randomUUID(),
    kind: 'CHAT',
    provider: input.provider,
    model: input.model,
    promptLength: input.promptLength,
    responseLength: input.responseLength,
    estimatedInputTokens: inputTokens,
    estimatedOutputTokens: outputTokens,
    estimatedCredits,
    durationMs: input.durationMs,
    success: input.success,
    errorCode: input.errorCode,
    project: folder
      ? {
          workspaceName: folder.name,
          gitBranch: undefined,
        }
      : undefined,
    environment: {
      machineId,
      vscodeVersion: vscode.version,
      copilotExtensionVersion: '1.0.0',
    },
  });
}
