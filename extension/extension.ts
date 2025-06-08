import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { generateQuip } from './quips';

export function activate(context: vscode.ExtensionContext) {
  console.log("BlobBuddy extension activated");

  // Prompt for user name once (should we build a more complex flow?)
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
      // reload quip on panel reveal
      panel.onDidChangeViewState(e => {
        if (e.webviewPanel.visible) postQuip(panel.webview, context);
      });
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
  constructor(private readonly context: vscode.ExtensionContext) {}

  resolveWebviewView(view: vscode.WebviewView) {
    view.webview.options = { enableScripts: true, localResourceRoots: [vscode.Uri.file(path.join(this.context.extensionPath, 'media'))] };
    setWebviewContent(view.webview, this.context);
    // reload quip when sidebar gains focus
    view.onDidChangeVisibility(() => {
      if (view.visible) {
        postQuip(view.webview, this.context);
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
  webview.postMessage({ type: 'init', quip: generateQuip(context) });
}

// helper to post only quip
function postQuip(webview: vscode.Webview, context: vscode.ExtensionContext) {
  webview.postMessage({ type: 'quip', quip: generateQuip(context) });
}
