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
    private _startDelimiter?: string;
    private _endDelimiter?: string;
    private _delimtersSame?: boolean;
    private _lastEditor: vscode.TextEditor | undefined;

    private constructor(
        private readonly _panel: vscode.WebviewPanel,
        extensionUri: Uri
    ) {
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
        this._panel.webview.html = this._getWebviewContent(
            this._panel.webview,
            extensionUri,
        );
        MarkdownSnippetsPanel.updateConfig();
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
        MarkdownSnippetsPanel.selectionChanged(editor);
    }

    public static selectionChanged(
        eventOrEditor:
            vscode.TextEditorSelectionChangeEvent
            | vscode.TextEditor
            | undefined,
    ) {
        const panel = MarkdownSnippetsPanel.currentPanel;
        if (!panel
            || !panel._startDelimiter
            || !panel._endDelimiter
            || !eventOrEditor
        ) {
            return;
        }

        let editor: vscode.TextEditor;
        if ('textEditor' in eventOrEditor) {
            editor = eventOrEditor.textEditor;
        } else {
            editor = eventOrEditor;
        }
        panel._lastEditor = editor;
        const documentText = editor.document.getText();
        const selection = editor.selection;
        const activeOffset = editor.document.offsetAt(selection.active);

        // Search backwards for the start delimiter
        const snippetStart = documentText.lastIndexOf(
            panel._startDelimiter,
            activeOffset
        ) + panel._startDelimiter.length;
        // Search forwards for the end delimiter
        const snippetEnd = documentText.indexOf(
            panel._endDelimiter,
            activeOffset
        );

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
                    <div id="settings">
                        <div id="delimiters">
                            <vscode-text-field id="startDelimiter">
                                Start Delimiter
                            </vscode-text-field>
                            <vscode-text-field id="endDelimiter">
                                End Delimiter
                            </vscode-text-field>
                        </div>
                        <div id="checkboxes">
                            <vscode-checkbox id="same">
                                Start and End Delimiters are the same
                            </vscode-checkbox>
                        </div>
                    </div>
                    <vscode-divider></vscode-divider>
                    <div id="renderedSnippet"></div>
                    <script type="module" nonce="${nonce}" src="${webviewUri}">
                    </script>
                </body>
            </html>
        `;
    }

    public static updateConfig() {
        const panel = MarkdownSnippetsPanel.currentPanel;
        if (!panel) {
            return;
        }
        const config = vscode.workspace.getConfiguration(
            'markdownSnippetsRenderer'
        );
        panel._startDelimiter = config.get('startDelimiter')!;
        panel._delimtersSame = config.get('endSameAsStart')!;
        if (panel._delimtersSame) {
            panel._endDelimiter =
                panel._startDelimiter;
        } else {
            panel._endDelimiter = config.get('endDelimiter')!;
        }
        panel._panel.webview.postMessage({
            command: 'updateConfig',
            startDelimiter: panel._startDelimiter,
            endDelimiter: panel._endDelimiter,
            same: panel._delimtersSame,
        });
    }

    private _setWebviewMessageListener(webview: vscode.Webview) {
        webview.onDidReceiveMessage(
            (message: any) => {
                const command = message.command;
                switch (command) {
                    case 'updateDelimiters':
                        this._startDelimiter = message.startDelimiter;
                        this._endDelimiter = message.endDelimiter;
                        this._delimtersSame = message.same;
                        const config = vscode.workspace.getConfiguration(
                            'markdownSnippetsRenderer'
                        );
                        config.update(
                            'startDelimiter',
                            this._startDelimiter,
                            true
                        );
                        config.update(
                            'endDelimiter',
                            this._endDelimiter,
                            true
                        );
                        config.update(
                            'endSameAsStart',
                            this._delimtersSame,
                            true
                        );
                        MarkdownSnippetsPanel.selectionChanged(
                            this._lastEditor
                        );
                        return;
                }
            },
            undefined,
            this._disposables
        );
    }
}
