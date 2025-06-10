import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { generateQuip } from "./quips";

// ─── Typing‐Based Break Reminder Config ───
const CONTINUOUS_HOUR = 60 * 60 * 1000;
const PAUSE_THRESHOLD = 5 * 60 * 1000;
let cumulativeTyping = 0;
let lastTypingTime: number | undefined;

// ─── Mood Tracking ───
let errorCount = 0;
function computeMood(): "happy" | "focused" | "worried" {
  if (errorCount > 5) return "worried";
  if (errorCount > 0) return "focused";
  return "happy";
}

// ─── Reminder Keys ───
const TODAY_KEY = "reminderToday";
const TOMORROW_KEY = "reminderTomorrow";

// Helpers for date keys
function getTomorrowDateKey(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
}

// Schedule rollover at midnight
function scheduleMidnightRollover(context: vscode.ExtensionContext) {
  const now = new Date();
  const nextMidnight = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
    0, 0, 1
  );
  const ms = nextMidnight.getTime() - now.getTime();
  setTimeout(() => {
    // Move tomorrow → today
    const tom = context.globalState.get<{ text: string }>(TOMORROW_KEY);
    if (tom) {
      context.globalState.update(TODAY_KEY, tom);
    }
    // Clear old today & tomorrow
    context.globalState.update(TOMORROW_KEY, undefined);
    context.globalState.update(TODAY_KEY, undefined);
    scheduleMidnightRollover(context);
  }, ms);
}

export function activate(context: vscode.ExtensionContext) {
  console.log("BlobBuddy extension activated");

  // ─── Sidebar Provider ───
  const wispProvider = new WispSidebarProvider(context);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider("wispView", wispProvider)
  );

  // ─── Schedule Midnight Rollover ───
  scheduleMidnightRollover(context);

  // ─── Command: Set Reminder for Today ───
  context.subscriptions.push(
    vscode.commands.registerCommand("blobbuddy.setReminderToday", async () => {
      const text = await vscode.window.showInputBox({
        prompt: "What should I remind you of *today*?",
      });
      if (text) {
        await context.globalState.update(TODAY_KEY, { text });
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
    vscode.commands.registerCommand("blobbuddy.setReminderTomorrow", async () => {
      const text = await vscode.window.showInputBox({
        prompt: "What should I remind you of *tomorrow*?",
      });
      if (text) {
        await context.globalState.update(TOMORROW_KEY, { text });
        vscode.window.showInformationMessage(`Reminder for tomorrow set: ${text}`);
        const view = wispProvider.view;
        if (view?.visible) {
          view.webview.postMessage({ type: "reminderTomorrow", text });
        }
      }
    })
  );

  // ─── Diagnostics → Mood Updates ───
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

  // ─── Typing Listener → Break Reminder ───
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
        "🛌 You’ve been coding non-stop for an hour—time for a break!",
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
          // live reminders
          sendReminders(panel.webview, context);
        }
      });
    })
  );

  // ─── Command: Reset Name ───
  context.subscriptions.push(
    vscode.commands.registerCommand("blobbuddy.resetName", async () => {
      await context.globalState.update("userName", undefined);
      const newName = await vscode.window.showInputBox({
        prompt: "What should I call you?",
        value: "Friend",
      });
      if (newName) {
        await context.globalState.update("userName", newName);
        vscode.window.showInformationMessage(`Got it! I'll call you ${newName}.`);
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

function sendReminders(webview: vscode.Webview, context: vscode.ExtensionContext) {
  // today
  const todayRec = context.globalState.get<{ text: string }>(TODAY_KEY);
  const todayText = todayRec?.text || "";
  webview.postMessage({ type: "reminderToday", text: todayText });
  // tomorrow
  const tomRec = context.globalState.get<{ text: string }>(TOMORROW_KEY);
  const tomText = tomRec?.text || "";
  webview.postMessage({ type: "reminderTomorrow", text: tomText });
}
