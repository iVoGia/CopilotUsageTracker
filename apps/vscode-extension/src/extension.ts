import * as vscode from 'vscode';
import { createHash, randomUUID } from 'crypto';
import { EventQueue } from './event-queue';
import { ApiClient } from './api-client';
import { estimateTokens } from './token-estimate';
import { AutoCaptureManager, type CapturedTurn } from './auto-capture';
import type { TokenSource } from './types';

const EXTENSION_VERSION = require('../package.json').version as string;

let statusBar: vscode.StatusBarItem;
let queue: EventQueue;
let api: ApiClient;
let autoCapture: AutoCaptureManager | undefined;
let currentTaskLabel: string | undefined;
let loggedIn = false;
let lastError: string | undefined;
let displayName: string | undefined;
let lastTurnInputTokens: number | undefined;
let lastTurnOutputTokens: number | undefined;
let autoCaptureHint: string | undefined;

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

  autoCapture = new AutoCaptureManager(context, {
    onTurn: async (turn) => {
      if (!loggedIn) return;
      await recordCapturedTurn(turn);
      await queue.flush().catch(() => undefined);
      lastTurnInputTokens = turn.inputTokens;
      lastTurnOutputTokens = turn.outputTokens;
      updateStatus();
      console.log(`[ghc] auto-captured turn ${turn.tokenSource} in=${turn.inputTokens} out=${turn.outputTokens}`);
    },
    onStatus: (msg) => {
      autoCaptureHint = msg;
      updateStatus();
    },
  });

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
    autoCapture.start();
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
  autoCapture?.stop();
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
    autoCapture?.start();
    updateStatus();
    vscode.window.showInformationMessage(
      `Logged in as ${name}. Auto-capture is on — Start Task, then use Cursor/Copilot Chat normally.`,
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
      tokenSource: 'manual',
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

function formatTokenShort(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
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

  const tokenSuffix =
    lastTurnInputTokens != null && lastTurnOutputTokens != null
      ? ` · ↑${formatTokenShort(lastTurnInputTokens)} ↓${formatTokenShort(lastTurnOutputTokens)}`
      : '';

  if (currentTaskLabel) {
    statusBar.text = `$(pulse) GHC: ${currentTaskLabel}${tokenSuffix}`;
    statusBar.tooltip = [
      `Logged in as ${displayName ?? 'user'}`,
      autoCaptureHint,
      'Auto-capture on · click to change task',
    ]
      .filter(Boolean)
      .join('\n');
    statusBar.command = 'ghc.startTask';
    return;
  }
  statusBar.text = `$(pulse) GHC: ${displayName ?? 'auto on'}${tokenSuffix}`;
  statusBar.tooltip = [autoCaptureHint, 'Start a task to attribute usage'].filter(Boolean).join('\n');
  statusBar.command = 'ghc.startTask';
}

async function recordCapturedTurn(turn: CapturedTurn) {
  await recordChatMetadata({
    promptLength: turn.promptLength,
    responseLength: turn.responseLength,
    model: turn.model,
    provider: turn.provider,
    success: turn.success,
    durationMs: turn.durationMs ?? 0,
    errorCode: undefined,
    tokenSource: turn.tokenSource,
    idempotencyKey: turn.idempotencyKey,
    inputTokens: turn.inputTokens,
    outputTokens: turn.outputTokens,
    occurredAt: turn.occurredAt,
  });
}

async function recordChatMetadata(input: {
  promptLength: number;
  responseLength: number;
  provider: string;
  model: string;
  success: boolean;
  durationMs: number;
  errorCode?: string;
  tokenSource?: TokenSource;
  idempotencyKey?: string;
  inputTokens?: number;
  outputTokens?: number;
  occurredAt?: string;
}) {
  const machineId = createHash('sha256')
    .update(vscode.env.machineId)
    .digest('hex')
    .slice(0, 32);

  const useProvidedTokens =
    (input.tokenSource === 'cursor-local' || input.tokenSource === 'copilot-debug') &&
    input.inputTokens != null &&
    input.outputTokens != null;

  const inputTokens = useProvidedTokens
    ? input.inputTokens!
    : estimateTokens(input.provider, input.model, input.promptLength);
  const outputTokens = useProvidedTokens
    ? input.outputTokens!
    : estimateTokens(input.provider, input.model, input.responseLength);

  // Credits are computed on the API for GitHub Copilot only (official AI Credits formula).
  // Cursor / non-Copilot events must not send heuristic credits.
  const estimatedCredits =
    input.tokenSource === 'copilot-debug' || /copilot|github/i.test(input.provider)
      ? undefined
      : 0;

  const folder = vscode.workspace.workspaceFolders?.[0];
  await queue.enqueue({
    idempotencyKey: input.idempotencyKey ?? randomUUID(),
    kind: 'CHAT',
    provider: input.provider,
    model: input.model,
    promptLength: input.promptLength,
    responseLength: input.responseLength,
    estimatedInputTokens: inputTokens,
    estimatedOutputTokens: outputTokens,
    estimatedCredits,
    tokenSource: input.tokenSource,
    durationMs: input.durationMs,
    success: input.success,
    errorCode: input.errorCode,
    occurredAt: input.occurredAt,
    project: folder
      ? {
          workspaceName: folder.name,
          gitBranch: undefined,
        }
      : undefined,
    environment: {
      machineId,
      vscodeVersion: vscode.version,
      copilotExtensionVersion: EXTENSION_VERSION,
    },
  });
}
