import * as vscode from 'vscode';
import { CopilotPoller } from './copilot-poller';
import { CursorPoller } from './cursor-poller';
import type { CapturedTurn } from './types';

export type AutoCaptureOptions = {
  onTurn: (turn: CapturedTurn) => Promise<void>;
  onStatus?: (message: string) => void;
};

export class AutoCaptureManager {
  private cursorPoller: CursorPoller | undefined;
  private copilotPoller: CopilotPoller | undefined;
  private readonly configListener: vscode.Disposable;

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly options: AutoCaptureOptions,
  ) {
    this.configListener = vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('ghc.autoCapture')) {
        this.restartPollers();
      }
    });
    context.subscriptions.push(this.configListener);
  }

  start() {
    this.restartPollers();
  }

  stop() {
    this.cursorPoller?.stop();
    this.copilotPoller?.stop();
    this.cursorPoller = undefined;
    this.copilotPoller = undefined;
  }

  private restartPollers() {
    this.stop();
    const cfg = vscode.workspace.getConfiguration('ghc');
    if (!cfg.get<boolean>('autoCapture.enabled', true)) return;

    const intervalMs = cfg.get<number>('autoCapture.pollIntervalMs', 3000);
    const sources = cfg.get<string>('autoCapture.sources', 'both');

    const callbacks = {
      onTurn: this.options.onTurn,
      onStatus: this.options.onStatus,
    };

    if (sources === 'cursor' || sources === 'both') {
      this.cursorPoller = new CursorPoller(callbacks);
      this.cursorPoller.start(intervalMs);
    }
    if (sources === 'copilot' || sources === 'both') {
      this.copilotPoller = new CopilotPoller(callbacks);
      this.copilotPoller.start(intervalMs);
    }
  }
}

export type { CapturedTurn } from './types';
