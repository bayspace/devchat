import * as vscode from 'vscode';
import * as path from 'path';
import WebviewManager from './webviewManager';

import '../handler/handlerRegister';
import handleMessage from '../handler/messageHandler';
import { createChatDirectoryAndCopyInstructionsSync } from '../init/chatConfig';
import { ExtensionContextHolder } from '../util/extensionContext';
import { TopicManager } from '../topic/topicManager';
import { UiUtilWrapper } from '../util/uiUtil';
import { ChatContextManager } from '../context/contextManager';


export class DevChatViewProvider implements vscode.WebviewViewProvider {
	private _view?: vscode.WebviewView;
	private _webviewManager: WebviewManager | undefined;

	constructor(private readonly _context: vscode.ExtensionContext) {
		// Subscribe to the onDidChangeWorkspaceFolders event
		vscode.workspace.onDidChangeWorkspaceFolders(this.onDidChangeWorkspaceFolders, this, _context.subscriptions);
	}

	public view() {
		return this._view;
	}

	reloadCustomDefines() {
		const workspaceDir = UiUtilWrapper.workspaceFoldersFirstPath();
		if (workspaceDir) {
			const workflowsDir = path.join(workspaceDir!, '.chat', 'workflows');
			ChatContextManager.getInstance().loadCustomContexts(workflowsDir);
		}
	}

	resolveWebviewView(webviewView: vscode.WebviewView, context: vscode.WebviewViewResolveContext, _token: vscode.CancellationToken): void {
		// 创建 .chat 目录并复制 workflows
		createChatDirectoryAndCopyInstructionsSync(ExtensionContextHolder.context?.extensionUri!);

		this.reloadCustomDefines();

		this._view = webviewView;

		this._webviewManager = new WebviewManager(webviewView.webview, this._context.extensionUri);

		this.registerEventListeners();
	}

	public reloadWebview(): void {
		if (this._webviewManager) {
			this.reloadCustomDefines();
			this._webviewManager.reloadWebviewContent();
		}
	}
	
	private registerEventListeners() {

		// this._view?.onDidDispose(() => this.dispose(), null, this._disposables);

		this._view?.webview.onDidReceiveMessage(
			async (message) => {
				handleMessage(message, this._view!);
			},
			null,
			this._context.subscriptions
		);
	}

	private onDidChangeWorkspaceFolders(event: vscode.WorkspaceFoldersChangeEvent): void {
		// Check if any folder was added or removed
		if (event.added.length > 0 || event.removed.length > 0) {
			// Update the webviewView content
			vscode.window.showInformationMessage(`onDidChangeWorkspaceFolders`);
			//   this.updateWebviewContent();
		}
	}
}