import * as vscode from 'vscode';
import ChatContextManager from '../context/contextManager';


export async function regContextList(message: any, panel: vscode.WebviewPanel): Promise<void> {
	const contextList = ChatContextManager.getInstance().getContextList();
    panel.webview.postMessage({ command: 'regContextList', result: contextList });
    return;
}


