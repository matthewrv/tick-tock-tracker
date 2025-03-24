import * as vscode from "vscode";

let TimerStatusBarItem: vscode.StatusBarItem;

const timerStorageKey = "time-tracker.timeSpent";

const pauseCommandId = "time-tracker.pauseTimer";
const resumeCommandId = "time-tracker.resumeTimer";

const resumeTooltip = "Click to resume time tracking";
const pauseTooltip = "Click to pause time tracking";

export function activate(context: vscode.ExtensionContext) {
  const activatedAt = new Date();
  const previouslySpent = context.workspaceState.get<number>(timerStorageKey);
  const timer = new WorkspaceTimer(activatedAt, previouslySpent);

  const pauseTimer = vscode.commands.registerCommand(pauseCommandId, () => {
    timer.pause();
    TimerStatusBarItem.command = resumeCommandId;
    TimerStatusBarItem.tooltip = resumeTooltip;
    TimerStatusBarItem.color = new vscode.ThemeColor(
      "statusBarItem.warningForeground"
    );
    TimerStatusBarItem.backgroundColor = new vscode.ThemeColor(
      "statusBarItem.warningBackground"
    );
  });
  context.subscriptions.push(pauseTimer);

  const resumeTimer = vscode.commands.registerCommand(resumeCommandId, () => {
    timer.resume();
    TimerStatusBarItem.command = pauseCommandId;
    TimerStatusBarItem.tooltip = pauseTooltip;
    TimerStatusBarItem.color = undefined;
    TimerStatusBarItem.backgroundColor = undefined;
  });
  context.subscriptions.push(resumeTimer);

  TimerStatusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100
  );
  context.subscriptions.push(TimerStatusBarItem);

  TimerStatusBarItem.command = pauseCommandId;
  TimerStatusBarItem.tooltip = pauseTooltip;
  TimerStatusBarItem.show();

  setInterval(() => {
    const timeSpent = timer.timeSpent;
    TimerStatusBarItem.text = `$(timeline-view-icon) ${formatTimeSpent(
      timeSpent
    )}`;
    context.workspaceState.update(timerStorageKey, timeSpent);
  }, 1000);
}

// This method is called when your extension is deactivated
export function deactivate() {}

class WorkspaceTimer {
  #countFrom?: number;
  #timeSpent: number;

  constructor(activationTime: Date, timeSpent?: number) {
    this.#countFrom = activationTime.getTime();
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
}

function formatTimeSpent(timeSpent: number): string {
  const dividers = [1000, 60, 60];

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

  console.log("Milliseconds: %d", timeSpent);
  console.log(timeSpentSplit);

  return `${format(h)}h ${format(m)}m ${format(s)}s`;
}
