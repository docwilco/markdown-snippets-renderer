// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { MarkdownSnippetsPanel } from './markdownSnippetsPanel';

export async function activate(context: vscode.ExtensionContext) {

	// check active editor when it changes
	context.subscriptions.push(
		vscode.window.onDidChangeActiveTextEditor((editor) => {
			MarkdownSnippetsPanel.activeEditorChanged(editor);
		})
	);
	MarkdownSnippetsPanel.activeEditorChanged(vscode.window.activeTextEditor);
	context.subscriptions.push(
		vscode.window.onDidChangeTextEditorSelection((event) => {
			MarkdownSnippetsPanel.selectionChanged(event);
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand(
			'markdownSnippetsRenderer.openToSide', () => {
				MarkdownSnippetsPanel.render(
					context.extensionUri,
				);
			}
		)
	);

	context.subscriptions.push(
		vscode.workspace.onDidChangeConfiguration(
			(event: vscode.ConfigurationChangeEvent) => {
				if (event.affectsConfiguration('markdownSnippetsRenderer')) {
					MarkdownSnippetsPanel.updateConfig();
				}
				if (event.affectsConfiguration('workbench.colorTheme')) {
					MarkdownSnippetsPanel.updateTheme();
				}
			}
		)
	);

}

// This method is called when your extension is deactivated
export function deactivate() { }
