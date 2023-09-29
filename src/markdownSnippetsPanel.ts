import * as vscode from "vscode";
import { Uri } from 'vscode';
import MarkdownIt from "markdown-it";

const markdown = MarkdownIt({ linkify: true });

function getUri(
    webview: vscode.Webview,
    extensionUri: Uri,
    pathList: string[]
) {
    return webview.asWebviewUri(Uri.joinPath(extensionUri, ...pathList));
}

function generateNonce() {
    let text = '';
    const possible =
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

export class MarkdownSnippetsPanel {
    public static currentPanel: MarkdownSnippetsPanel | undefined;
    private _disposables: vscode.Disposable[] = [];

    private constructor(
        private readonly _panel: vscode.WebviewPanel,
        extensionUri: Uri
    ) {
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
        this._panel.webview.html = this._getWebviewContent(
            this._panel.webview,
            extensionUri
        );
        this._setWebviewMessageListener(this._panel.webview);
    }

    public static render(
        extensionUri: Uri,
    ) {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            return;
        }
        const column = editor.viewColumn
            ? editor.viewColumn + 1
            : vscode.ViewColumn.Active;
        if (MarkdownSnippetsPanel.currentPanel) {
            MarkdownSnippetsPanel.currentPanel._panel.reveal(
                column,
                true
            );
        } else {
            const panel = vscode.window.createWebviewPanel(
                "markdownSnippetsRenderer",
                "Rendered Snippet",
                { viewColumn: column, preserveFocus: true },
                {
                    enableScripts: true,
                    localResourceRoots: [
                        Uri.joinPath(extensionUri, "out"),
                        Uri.joinPath(extensionUri, "view"),
                    ],
                }
            );
            MarkdownSnippetsPanel.currentPanel = new MarkdownSnippetsPanel(
                panel,
                extensionUri
            );
        }
        if (editor) {
            MarkdownSnippetsPanel.activeEditorChanged(editor);
        }
    }

    public static activeEditorChanged(
        editor: vscode.TextEditor | undefined,
    ) {
        if (!editor) {
            return;
        }
        const panel = MarkdownSnippetsPanel.currentPanel;
        if (!panel) {
            return;
        }
        panel._panel.webview.postMessage({
            command: "setExerciseInfo",
        });
    }

    public static selectionChanged(
        event: vscode.TextEditorSelectionChangeEvent,
    ) {
        const panel = MarkdownSnippetsPanel.currentPanel;
        if (!panel) {
            return;
        }
        const editor = event.textEditor;
        const documentText = editor.document.getText();
        const selection = editor.selection;
        const activeOffset = editor.document.offsetAt(selection.active);
        const snippetStart = documentText.lastIndexOf('"""', activeOffset) + 3;
        const snippetEnd = documentText.indexOf('"""', activeOffset); 
        const snippetText = documentText.slice(snippetStart, snippetEnd);
        // Convert to HTML
        const snippetHtml = markdown.render(snippetText);
        // Send to panel
        panel._panel.webview.postMessage({
            command: 'showHtml',
            html: snippetHtml,
        });
    }

    public dispose() {
        MarkdownSnippetsPanel.currentPanel = undefined;

        this._panel.dispose();

        while (this._disposables.length) {
            const disposable = this._disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }
    }

    private _getWebviewContent(webview: vscode.Webview, extensionUri: Uri) {
        const webviewUri = getUri(webview, extensionUri, ["out", "webview.js"]);

        const nonce = generateNonce();

        return /*html*/ `
            <!DOCTYPE html>
            <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta 
                        name="viewport" 
                        content="width=device-width,initial-scale=1.0"
                    >
                    <meta
                        http-equiv="Content-Security-Policy"
                        content="default-src 'none';
                            style-src ${webview.cspSource};
                            font-src ${webview.cspSource};
                            img-src ${webview.cspSource} https:;
                            script-src 'nonce-${nonce}';"
                    >
                    <title>Hello World!</title>
                </head>
                <body>
                    <script type="module" nonce="${nonce}" src="${webviewUri}">
                    </script>
                </body>
            </html>
        `;
    }

    private _setWebviewMessageListener(webview: vscode.Webview) {
        webview.onDidReceiveMessage(
            (message: any) => {
                const command = message.command;
                const text = message.text;

                switch (command) {
                    case "hello":
                        vscode.window.showInformationMessage(text);
                        return;
                }
            },
            undefined,
            this._disposables
        );
    }
}
