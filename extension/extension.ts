import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { generateQuip } from './quips';

// Track errors to determine mood
let errorCount = 0;

//Compute mood based on current error count.
function computeMood(): 'happy' | 'focused' | 'worried' {
  if (errorCount > 5) {
    return 'worried';
  }
  if (errorCount > 0) {
    return 'focused';
  }
  return 'happy';
}

export function activate(context: vscode.ExtensionContext) {
  console.log("BlobBuddy extension activated");

  // Listen for diagnostics changes to update errorCount and broadcast mood
  const diagListener = vscode.languages.onDidChangeDiagnostics(() => {
    const allDiags = vscode.languages.getDiagnostics();
    errorCount = allDiags.reduce((sum, [_, diags]) =>
      sum + diags.filter(d => d.severity === vscode.DiagnosticSeverity.Error).length
    , 0);
    sendMoodUpdate(context);
  });
  context.subscriptions.push(diagListener);

  // Prompt for user name once
  const storedName = context.globalState.get<string>('userName');
  if (!storedName) {
    vscode.window.showInputBox({ prompt: "What should I call you?", value: 'Friend' })
      .then(name => { if (name) context.globalState.update('userName', name); });
  }

  // Command: open standalone Wisp panel
  context.subscriptions.push(
    vscode.commands.registerCommand('blobbuddy.showWisp', () => {
      const panel = vscode.window.createWebviewPanel(
        'blobbuddy', 'Your Wisp', vscode.ViewColumn.One,
        { enableScripts: true, localResourceRoots: [vscode.Uri.file(path.join(context.extensionPath, 'media'))] }
      );
      setWebviewContent(panel.webview, context);
      panel.onDidChangeViewState(e => {
        if (e.webviewPanel.visible) {
          postQuip(panel.webview, context);
          panel.webview.postMessage({ type: 'mood', mood: computeMood() });
        }
      });
    })
  );

  // Command: Reset name and prompt for new one
  context.subscriptions.push(
    vscode.commands.registerCommand('blobbuddy.resetName', async () => {
      await context.globalState.update('userName', undefined);
      const newName = await vscode.window.showInputBox({ prompt: "What should I call you now?", value: 'Friend' });
      if (newName) {
        await context.globalState.update('userName', newName);
        vscode.window.showInformationMessage(`Got it! I'll call you ${newName}.`);
      }
    })
  );

  // Sidebar Webview View Provider
  const wispProvider = new WispSidebarProvider(context);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('wispView', wispProvider)
  );
}

export function deactivate() {}

class WispSidebarProvider implements vscode.WebviewViewProvider {
  private _view?: vscode.WebviewView;

  constructor(private readonly context: vscode.ExtensionContext) {}

  resolveWebviewView(view: vscode.WebviewView) {
    this._view = view;
    view.webview.options = { enableScripts: true, localResourceRoots: [vscode.Uri.file(path.join(this.context.extensionPath, 'media'))] };
    setWebviewContent(view.webview, this.context);
    view.onDidChangeVisibility(() => {
      if (view.visible) {
        postQuip(view.webview, this.context);
        view.webview.postMessage({ type: 'mood', mood: computeMood() });
      }
    });
  }
}

// shared loader
function setWebviewContent(webview: vscode.Webview, context: vscode.ExtensionContext) {
  const htmlPath = path.join(context.extensionPath, 'media', 'index.html');
  let html = fs.readFileSync(htmlPath, 'utf8');
  html = html.replace(/(src|href)="(.+?)"/g, (_, attr, src) => {
    const uri = webview.asWebviewUri(vscode.Uri.file(path.join(context.extensionPath, 'media', src)));
    return `${attr}="${uri}"`;
  });
  webview.html = html;
  webview.postMessage({ type: 'init', quip: generateQuip(context), mood: computeMood() });
}

function postQuip(webview: vscode.Webview, context: vscode.ExtensionContext) {
  webview.postMessage({ type: 'quip', quip: generateQuip(context) });
}

function sendMoodUpdate(context: vscode.ExtensionContext) {
  const mood = computeMood();
  vscode.window.visibleTextEditors; 
  vscode.commands.executeCommand('workbench.view.extension.blobbuddySidebar');
}
