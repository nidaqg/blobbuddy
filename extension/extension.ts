import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { generateQuip } from "./quips";

// ─── Typing‐based break reminder config ───
const CONTINUOUS_HOUR = 60 * 60 * 1000;
const PAUSE_THRESHOLD = 5 * 60 * 1000;
let cumulativeTyping = 0;
let lastTypingTime: number | undefined;

// ─── Mood tracking ───
let errorCount = 0;
function computeMood(): "happy" | "focused" | "worried" {
  if (errorCount > 5) return "worried";
  if (errorCount > 0) return "focused";
  return "happy";
}

// ─── Reminder keys ───
const TODAY_KEY = "reminderToday";
const TOMORROW_KEY = "reminderTomorrow";

// Helpers for date keys
function getTodayDateKey(): string {
  return new Date().toISOString().split("T")[0];
}
function getTomorrowDateKey(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
}

// On activation, immediately migrate reminders if needed
function checkRollover(context: vscode.ExtensionContext) {
  const todayKey = getTodayDateKey();

  // Clear stale Today reminder
  const todayRec = context.globalState.get<{ date: string; text: string }>(
    TODAY_KEY
  );
  if (todayRec?.date !== todayKey) {
    context.globalState.update(TODAY_KEY, undefined);
  }

  // Move Tomorrow → Today if it’s for today
  const tomRec = context.globalState.get<{ date: string; text: string }>(
    TOMORROW_KEY
  );
  if (tomRec?.date === todayKey) {
    context.globalState.update(TODAY_KEY, tomRec);
    context.globalState.update(TOMORROW_KEY, undefined);
  }
}

// Schedule rollover at midnight
function scheduleMidnightRollover(context: vscode.ExtensionContext) {
  const now = new Date();
  const nextMidnight = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
    0,
    0,
    1
  );
  const ms = nextMidnight.getTime() - now.getTime();

  setTimeout(async () => {
    await context.globalState.update(TODAY_KEY, undefined);
    const tom = context.globalState.get<{ text: string }>(TOMORROW_KEY);
    if (tom) {
      await context.globalState.update(TODAY_KEY, tom);
    }

    await context.globalState.update(TOMORROW_KEY, undefined);

    scheduleMidnightRollover(context);
  }, ms);
}

// Schedule UI refresh at midnight
function scheduleUIRefresh(context: vscode.ExtensionContext) {
  const now = new Date();
  const nextMidnight = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
    0,
    0,
    1
  );
  const ms = nextMidnight.getTime() - now.getTime();
  setTimeout(() => {
    // Refresh sidebar content if open
    const view = wispProviderGlobal?.view;
    if (view?.visible) {
      sendReminders(view.webview, context);
    }
    // Schedule again
    scheduleUIRefresh(context);
  }, ms);
}

let wispProviderGlobal: WispSidebarProvider | undefined;

export function activate(context: vscode.ExtensionContext) {
  console.log("BlobBuddy extension activated");

  // Migrate reminders on load
  checkRollover(context);

  // ─── Sidebar provider ───
  const wispProvider = new WispSidebarProvider(context);
  wispProviderGlobal = wispProvider;
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider("wispView", wispProvider)
  );

  // Schedule UI-only refresh at midnight
  scheduleUIRefresh(context);

  // ─── Schedule Midnight Rollover ───
  scheduleMidnightRollover(context);

  // ─── Command: Set Reminder for Today ───
  context.subscriptions.push(
    vscode.commands.registerCommand("blobbuddy.setReminderToday", async () => {
      const text = await vscode.window.showInputBox({
        prompt: "What should I remind you of *today*?",
      });
      if (text) {
        const rec = { date: getTodayDateKey(), text };
        await context.globalState.update(TODAY_KEY, rec);
        vscode.window.showInformationMessage(`Reminder for today set: ${text}`);
        const view = wispProvider.view;
        if (view?.visible) {
          view.webview.postMessage({ type: "reminderToday", text });
        }
      }
    })
  );

  // ─── Command: Set Reminder for Tomorrow ───
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "blobbuddy.setReminderTomorrow",
      async () => {
        const text = await vscode.window.showInputBox({
          prompt: "What should I remind you of *tomorrow*?",
        });
        if (text) {
          const rec = { date: getTomorrowDateKey(), text };
          await context.globalState.update(TOMORROW_KEY, rec);
          vscode.window.showInformationMessage(
            `Reminder for tomorrow set: ${text}`
          );
          const view = wispProvider.view;
          if (view?.visible) {
            view.webview.postMessage({ type: "reminderTomorrow", text });
          }
        }
      }
    )
  );

  // ─── Command: Clear Reminder for Today ───
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "blobbuddy.clearReminderToday",
      async () => {
        await context.globalState.update(TODAY_KEY, undefined);
        vscode.window.showInformationMessage("✅ Cleared reminder for today.");
        const view = wispProvider.view;
        if (view?.visible) {
          view.webview.postMessage({ type: "reminderToday", text: "" });
        }
      }
    )
  );

  // ─── Command: Clear Reminder for Tomorrow ───
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "blobbuddy.clearReminderTomorrow",
      async () => {
        await context.globalState.update(TOMORROW_KEY, undefined);
        vscode.window.showInformationMessage(
          "✅ Cleared reminder for tomorrow."
        );
        const view = wispProvider.view;
        if (view?.visible) {
          view.webview.postMessage({ type: "reminderTomorrow", text: "" });
        }
      }
    )
  );

  // ─── Mood Updates ───
  const diagListener = vscode.languages.onDidChangeDiagnostics(() => {
    const allDiags = vscode.languages.getDiagnostics();
    errorCount = allDiags.reduce(
      (sum, [_, diags]) =>
        sum +
        diags.filter((d) => d.severity === vscode.DiagnosticSeverity.Error)
          .length,
      0
    );
    const view = wispProvider.view;
    if (view?.visible) {
      view.webview.postMessage({ type: "mood", mood: computeMood() });
    }
  });
  context.subscriptions.push(diagListener);

  // ─── Break Reminder ───
  const typingListener = vscode.workspace.onDidChangeTextDocument(() => {
    const now = Date.now();
    if (lastTypingTime !== undefined) {
      const gap = now - lastTypingTime;
      if (gap < PAUSE_THRESHOLD) cumulativeTyping += gap;
      else cumulativeTyping = 0;
    }
    lastTypingTime = now;

    if (cumulativeTyping >= CONTINUOUS_HOUR) {
      vscode.window.showInformationMessage(
        "🐝 You’ve been coding non-stop for an hour, don't forget to take breaks! 🐝",
        "Sounds good"
      );
      cumulativeTyping = 0;
      lastTypingTime = now;
    }
  });
  context.subscriptions.push(typingListener);

  // ─── Command: Show Wisp Panel ───
  context.subscriptions.push(
    vscode.commands.registerCommand("blobbuddy.showWisp", () => {
      const panel = vscode.window.createWebviewPanel(
        "blobbuddy",
        "Your Wisp",
        vscode.ViewColumn.One,
        {
          enableScripts: true,
          localResourceRoots: [
            vscode.Uri.file(path.join(context.extensionPath, "media")),
          ],
        }
      );
      setWebviewContent(panel.webview, context);
      panel.onDidChangeViewState((e) => {
        if (e.webviewPanel.visible) {
          postQuip(panel.webview, context);
          panel.webview.postMessage({
            type: "mood",
            mood: computeMood(),
          });
          sendReminders(panel.webview, context);
        }
      });
    })
  );

  // ─── Command: Prompt for user name once if none stored ───
  const storedName = context.globalState.get<string>("userName");
  if (!storedName) {
    vscode.window
      .showInputBox({ prompt: "What should I call you?", value: "" })
      .then((name) => {
        if (name) context.globalState.update("userName", name);
        const view = wispProvider.view;
        if (view?.visible) {
          view.webview.postMessage({
            type: "quip",
            quip: generateQuip(context, computeMood()),
          });
        }
      });
  }

  // ─── Command: Reset Name ───
  context.subscriptions.push(
    vscode.commands.registerCommand("blobbuddy.resetName", async () => {
      await context.globalState.update("userName", undefined);
      const newName = await vscode.window.showInputBox({
        prompt: "What should I call you?",
        value: "",
      });
      if (newName) {
        await context.globalState.update("userName", newName);
        vscode.window.showInformationMessage(
          `Got it! I'll call you ${newName}.`
        );
        const view = wispProvider.view;
        if (view?.visible) {
          view.webview.postMessage({
            type: "init",
            quip: generateQuip(context, computeMood()),
            mood: computeMood(),
          });
        }
      }
    })
  );
}

export function deactivate() {}

class WispSidebarProvider implements vscode.WebviewViewProvider {
  private _view?: vscode.WebviewView;
  constructor(private readonly context: vscode.ExtensionContext) {}
  resolveWebviewView(view: vscode.WebviewView) {
    this._view = view;
    view.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.file(path.join(this.context.extensionPath, "media")),
      ],
    };
    setWebviewContent(view.webview, this.context);
    view.onDidChangeVisibility(() => {
      if (view.visible) {
        postQuip(view.webview, this.context);
        view.webview.postMessage({
          type: "mood",
          mood: computeMood(),
        });
        sendReminders(view.webview, this.context);
      }
    });
  }
  public get view() {
    return this._view;
  }
}

// ─── Shared Loader ───
function setWebviewContent(
  webview: vscode.Webview,
  context: vscode.ExtensionContext
) {
  const htmlPath = path.join(context.extensionPath, "media", "index.html");
  let html = fs.readFileSync(htmlPath, "utf8");
  html = html.replace(/(src|href)=["'](.+?)["']/g, (_, attr, src) => {
    const uri = webview.asWebviewUri(
      vscode.Uri.file(path.join(context.extensionPath, "media", src))
    );
    return `${attr}="${uri}"`;
  });
  webview.html = html;
  webview.postMessage({
    type: "init",
    quip: generateQuip(context, computeMood()),
    mood: computeMood(),
  });
  sendReminders(webview, context);
}

function postQuip(webview: vscode.Webview, context: vscode.ExtensionContext) {
  webview.postMessage({
    type: "quip",
    quip: generateQuip(context, computeMood()),
  });
}

function sendReminders(
  webview: vscode.Webview,
  context: vscode.ExtensionContext
) {
  // today
  const todayRec = context.globalState.get<{ text: string }>(TODAY_KEY);
  const todayText = todayRec?.text || "";
  webview.postMessage({ type: "reminderToday", text: todayText });
  // tomorrow
  const tomRec = context.globalState.get<{ text: string }>(TOMORROW_KEY);
  const tomText = tomRec?.text || "";
  webview.postMessage({ type: "reminderTomorrow", text: tomText });
}
