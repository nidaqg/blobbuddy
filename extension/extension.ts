import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export function activate(context: vscode.ExtensionContext) {
  console.log("BlobBuddy extension activated");

  // Prompt for user name so their Wisp can address them
  // Only prompt once and store the name in global state
  const storedName = context.globalState.get<string>('userName');
  if (!storedName) {
    vscode.window.showInputBox({
      prompt: "What should I call you?",
      value: 'Friend'
    }).then(name => {
      if (name) {
        context.globalState.update('userName', name);
      }
    });
  }

  // Command to open standalone Wisp panel
  context.subscriptions.push(
    vscode.commands.registerCommand('blobbuddy.showWisp', () => {
      const panel = vscode.window.createWebviewPanel(
        'blobbuddy',
        'Your Wisp',
        vscode.ViewColumn.One,
        {
          enableScripts: true,
          localResourceRoots: [vscode.Uri.file(path.join(context.extensionPath, 'media'))]
        }
      );
      setWebviewContent(panel.webview, context);
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

  resolveWebviewView(webviewView: vscode.WebviewView) {
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.file(path.join(this.context.extensionPath, 'media'))]
    };
    setWebviewContent(webviewView.webview, this.context);
    
  }
}

// Common loader for both panel and sidebar
function setWebviewContent(webview: vscode.Webview | vscode.WebviewView['webview'], context: vscode.ExtensionContext) {
  const htmlPath = path.join(context.extensionPath, 'media', 'index.html');
  let html = fs.readFileSync(htmlPath, 'utf8');
  // Replace asset paths and inject state message
  html = html.replace(/(src|href)=['"]([^'"]+)['"]/g, (_, attr, src) => {
    const assetPath = vscode.Uri.file(path.join(context.extensionPath, 'media', src));
    const webviewUri = webview.asWebviewUri(assetPath);
    return `${attr}="${webviewUri}"`;
  });
  webview.html = html;

  // Prepare state
  const userName = context.globalState.get<string>('userName') || 'Wisp';
  const quips = [
    `Keep going, ${userName}!`,
    `${userName}, you're doing great!`,
    `Take a breath, ${userName}.`,
    `One step at a time, ${userName}.`,
    `You've got this, ${userName}!`
  ];
  const quip = quips[Math.floor(Math.random() * quips.length)];

  // Send init message
  webview.postMessage({ type: 'init', userName, quip });
}