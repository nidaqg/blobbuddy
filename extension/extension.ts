import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export function activate(context: vscode.ExtensionContext) {
  console.log("BlobBuddy extension activated");

  // Command to open the standalone panel
  context.subscriptions.push(
    vscode.commands.registerCommand('blobbuddy.showWisp', () => {
      const panel = vscode.window.createWebviewPanel(
        'blobbuddy',
        'Your Wisp',
        vscode.ViewColumn.One,
        {
          enableScripts: true,
          localResourceRoots: [
            vscode.Uri.file(path.join(context.extensionPath, 'media'))
          ]
        }
      );

      let html = fs.readFileSync(
        path.join(context.extensionPath, 'media', 'index.html'),
        'utf8'
      );
      html = html.replace(/(src|href)=["']([^"']+)["']/g, (_, attr, src) => {
        const asset = vscode.Uri.file(
          path.join(context.extensionPath, 'media', src)
        );
        return `${attr}="${panel.webview.asWebviewUri(asset)}"`;
      });

      panel.webview.html = html;
    })
  );

  // Sidebar (Activity Bar) view provider
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
      localResourceRoots: [
        vscode.Uri.file(path.join(this.context.extensionPath, 'media'))
      ]
    };

    let html = fs.readFileSync(
      path.join(this.context.extensionPath, 'media', 'index.html'),
      'utf8'
    );
    html = html.replace(/(src|href)=["']([^"']+)["']/g, (_, attr, src) => {
      const asset = vscode.Uri.file(
        path.join(this.context.extensionPath, 'media', src)
      );
      return `${attr}="${webviewView.webview.asWebviewUri(asset)}"`;
    });

    webviewView.webview.html = html;
  }
}
