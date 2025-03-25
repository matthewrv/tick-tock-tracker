import * as vscode from "vscode";

const timerStorageKey = "time-tracker.timeSpent";

const pauseCommandId = "time-tracker.pauseTimer";
const resumeCommandId = "time-tracker.resumeTimer";
const resetCommandId = "time-tracker.resetTimer";

const resumeTooltip = "Click to resume time tracking";
const pauseTooltip = "Click to pause time tracking";

const refreshTick = 1000; // [ms]

export function activate(context: vscode.ExtensionContext) {
  const statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100
  );
  context.subscriptions.push(statusBarItem);

  const integration = new VSCodeIntegration(
    context.workspaceState,
    statusBarItem
  );

  const pauseTimer = vscode.commands.registerCommand(
    pauseCommandId,
    integration.pauseTimer,
    integration
  );
  context.subscriptions.push(pauseTimer);

  const resumeTimer = vscode.commands.registerCommand(
    resumeCommandId,
    integration.resumeTimer,
    integration
  );
  context.subscriptions.push(resumeTimer);

  const resetTimer = vscode.commands.registerCommand(
    resetCommandId,
    integration.resetTimer,
    integration
  );
  context.subscriptions.push(resetTimer);
}

// This method is called when extension is deactivated
export function deactivate() {}

class VSCodeIntegration {
  #workspaceState: vscode.Memento;
  #statusBarItem: vscode.StatusBarItem;
  #timer: WorkspaceTimer;
  #task: NodeJS.Timeout;

  constructor(
    workspaceState: vscode.Memento,
    statusBarItem: vscode.StatusBarItem
  ) {
    this.#workspaceState = workspaceState;

    this.#statusBarItem = statusBarItem;
    this.#statusBarItem.command = pauseCommandId;
    this.#statusBarItem.tooltip = pauseTooltip;
    this.#statusBarItem.show();

    const previouslySpent = workspaceState.get<number>(timerStorageKey);
    this.#timer = new WorkspaceTimer(previouslySpent);

    this.#task = setInterval(() => this.#updateStatusBarText(), refreshTick);
  }

  #updateStatusBarText() {
    const timeSpent = this.#timer.timeSpent;
    const icon = this.#timer.isPaused ? "run" : "clock";
    this.#statusBarItem.text = `$(${icon}) ${formatTimeSpent(timeSpent)}`;
    this.#workspaceState.update(timerStorageKey, timeSpent);
  }

  pauseTimer() {
    this.#timer.pause();
    this.#statusBarItem.command = resumeCommandId;
    this.#statusBarItem.tooltip = resumeTooltip;
    this.#statusBarItem.color = new vscode.ThemeColor(
      "statusBarItem.warningForeground"
    );
    this.#statusBarItem.backgroundColor = new vscode.ThemeColor(
      "statusBarItem.warningBackground"
    );

    this.#updateStatusBarText(); // immediately update view
  }

  resumeTimer() {
    this.#timer.resume();
    this.#statusBarItem.command = pauseCommandId;
    this.#statusBarItem.tooltip = pauseTooltip;
    this.#statusBarItem.color = undefined;
    this.#statusBarItem.backgroundColor = undefined;

    this.#updateStatusBarText(); // immediately update view
  }

  resetTimer() {
    clearInterval(this.#task); // avoid race condition

    this.#timer.reset();
    this.#updateStatusBarText(); // immedeatly update view

    this.#task = setInterval(() => this.#updateStatusBarText(), refreshTick);
  }
}

class WorkspaceTimer {
  #countFrom?: number;
  #timeSpent: number;

  constructor(timeSpent?: number) {
    this.#countFrom = Date.now();
    this.#timeSpent = timeSpent || 0;
  }

  get timeSpent(): number {
    if (this.#countFrom) {
      const elapsed = Date.now() - this.#countFrom;
      return elapsed + this.#timeSpent;
    }
    return this.#timeSpent;
  }

  get isPaused(): boolean {
    return this.#countFrom === undefined;
  }

  pause() {
    if (this.#countFrom) {
      this.#timeSpent = this.timeSpent;
    }
    this.#countFrom = undefined;
  }

  resume() {
    this.#countFrom = Date.now();
  }

  reset() {
    if (this.#countFrom) {
      this.#countFrom = Date.now();
    }
    this.#timeSpent = 0;
  }
}

function formatTimeSpent(timeSpent: number): string {
  const dividers = [1000, 60, 60]; // ms, s, m

  let remainder = timeSpent;
  let timeSpentSplit = Array<number>();
  for (const divider of dividers) {
    const tmp = remainder % divider;
    timeSpentSplit.push(tmp);
    remainder = (remainder - tmp) / divider;
  }
  const [ms, s, m] = timeSpentSplit;
  const h = remainder;

  const format = Intl.NumberFormat(vscode.env.language, {
    minimumIntegerDigits: 2,
    maximumFractionDigits: 0,
  }).format;

  return `${format(h)}h ${format(m)}m ${format(s)}s`;
}
