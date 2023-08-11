import * as vscode from 'vscode';
import { sendFileSelectMessage, sendCodeSelectMessage } from './util';
import ExtensionContextHolder from '../util/extensionContext';
import { TopicManager } from '../topic/topicManager';
import { TopicTreeDataProvider, TopicTreeItem } from '../panel/topicView';
import { FilePairManager } from '../util/diffFilePairs';
import { ApiKeyManager } from '../util/apiKey';
import { UiUtilWrapper } from '../util/uiUtil';
import { isValidApiKey } from '../handler/historyMessagesBase';

import { logger } from '../util/logger';
import { CommandRun } from '../util/commonUtil';
import { updateIndexingStatus, updateLastModifyTime } from '../util/askCodeUtil';
import { installAskCode as installAskCodeFun } from '../util/python_installer/install_askcode';

let indexProcess: CommandRun | null = null;


function registerOpenChatPanelCommand(context: vscode.ExtensionContext) {
	let disposable = vscode.commands.registerCommand('devchat.openChatPanel', async () => {
		await vscode.commands.executeCommand('devchat-view.focus');
	});
	context.subscriptions.push(disposable);
}

async function ensureChatPanel(context: vscode.ExtensionContext): Promise<boolean> {
	await vscode.commands.executeCommand('devchat-view.focus');
	return true;
}

function registerAddContextCommand(context: vscode.ExtensionContext) {
	const callback = async (uri: { fsPath: any; }) => {
		if (!await ensureChatPanel(context)) {
			return;
		}

		await sendFileSelectMessage(ExtensionContextHolder.provider?.view()!, uri.fsPath);
	};
	context.subscriptions.push(vscode.commands.registerCommand('devchat.addConext', callback));
	context.subscriptions.push(vscode.commands.registerCommand('devchat.addConext_chinese', callback));
}

function registerAskForCodeCommand(context: vscode.ExtensionContext) {
	const callback = async () => {
		const editor = vscode.window.activeTextEditor;
		if (editor) {
			if (!await ensureChatPanel(context)) {
				return;
			}

			const selectedText = editor.document.getText(editor.selection);
			await sendCodeSelectMessage(ExtensionContextHolder.provider?.view()!, editor.document.fileName, selectedText, editor.selection.start.line);
		}
	};
	context.subscriptions.push(vscode.commands.registerCommand('devchat.askForCode', callback));
	context.subscriptions.push(vscode.commands.registerCommand('devchat.askForCode_chinese', callback));
}

function registerAskForFileCommand(context: vscode.ExtensionContext) {
	const callback = async () => {
		const editor = vscode.window.activeTextEditor;
		if (editor) {
			if (!await ensureChatPanel(context)) {
				return;
			}

			await sendFileSelectMessage(ExtensionContextHolder.provider?.view()!, editor.document.fileName);
		}
	};
	context.subscriptions.push(vscode.commands.registerCommand('devchat.askForFile', callback));
	context.subscriptions.push(vscode.commands.registerCommand('devchat.askForFile_chinese', callback));
}

export function registerOpenAiApiKeySettingCommand(context: vscode.ExtensionContext) {
	const secretStorage: vscode.SecretStorage = context.secrets;
	context.subscriptions.push(
		vscode.commands.registerCommand('DevChat.Api_Key_OpenAI', async () => {
			const passwordInput: string = await vscode.window.showInputBox({
				password: true,
				title: "Input OpenAi Api Key",
				placeHolder: "Set OpenAI Api Key.(Leave blank if clearing stored key.)"
			}) ?? '';

			if (passwordInput.trim() !== "" && !isValidApiKey(passwordInput)) {
				UiUtilWrapper.showErrorMessage("Your api key is invalid!");
				return ;
			}
			ApiKeyManager.writeApiKeySecret(passwordInput, "OpenAI");
		})
	);
}

export function registerDevChatApiKeySettingCommand(context: vscode.ExtensionContext) {
	const secretStorage: vscode.SecretStorage = context.secrets;
	context.subscriptions.push(
		vscode.commands.registerCommand('DevChat.Access_Key_DevChat', async () => {
			const passwordInput: string = await vscode.window.showInputBox({
				password: true,
				title: "Input DevChat Access Key",
				placeHolder: "Set DevChat Access Key.(Leave blank if clearing stored key.)"
			}) ?? '';

			if (passwordInput.trim() !== "" && !isValidApiKey(passwordInput)) {
				UiUtilWrapper.showErrorMessage("Your access key is invalid!");
				return ;
			}
			ApiKeyManager.writeApiKeySecret(passwordInput, "DevChat");
		})
	);
}

export function registerStatusBarItemClickCommand(context: vscode.ExtensionContext) {
	context.subscriptions.push(
		vscode.commands.registerCommand('devcaht.onStatusBarClick', async () => {
			await vscode.commands.executeCommand('devchat-view.focus');
		})
	);
}

const topicDeleteCallback = async (item: TopicTreeItem) => {
	const confirm = 'Delete';
	const label = typeof item.label === 'string' ? item.label : item.label!.label;
	const truncatedLabel = label.substring(0, 20) + (label.length > 20 ? '...' : '');
	const result = await vscode.window.showWarningMessage(
		`Are you sure you want to delete the topic "${truncatedLabel}"?`,
		{ modal: true },
		confirm
	);

	if (result === confirm) {
		TopicManager.getInstance().deleteTopic(item.id);
	}
};
;

export function regTopicDeleteCommand(context: vscode.ExtensionContext) {
	context.subscriptions.push(
		vscode.commands.registerCommand('devchat-topicview.deleteTopic', topicDeleteCallback)
	);
}

export function regAddTopicCommand(context: vscode.ExtensionContext) {
	context.subscriptions.push(
		vscode.commands.registerCommand('devchat-topicview.addTopic', () => {
			const topic = TopicManager.getInstance().createTopic();
			TopicManager.getInstance().setCurrentTopic(topic.topicId);
		})
	);
}

export function regDeleteSelectTopicCommand(context: vscode.ExtensionContext) {
	context.subscriptions.push(
		vscode.commands.registerCommand('devchat-topicview.deleteSelectedTopic', () => {
			const selectedItem = TopicTreeDataProvider.getInstance().selectedItem;
			if (selectedItem) {
				topicDeleteCallback(selectedItem);
			} else {
				vscode.window.showErrorMessage('No item selected');
			}
		})
	);
}

export function regSelectTopicCommand(context: vscode.ExtensionContext) {
	context.subscriptions.push(
		vscode.commands.registerCommand('devchat-topicview.selectTopic', (item: TopicTreeItem) => {
			TopicTreeDataProvider.getInstance().setSelectedItem(item);
			TopicManager.getInstance().setCurrentTopic(item.id);
		})
	);
}

export function regReloadTopicCommand(context: vscode.ExtensionContext) {
	context.subscriptions.push(
		vscode.commands.registerCommand('devchat-topicview.reloadTopic', async () => {
			TopicManager.getInstance().loadTopics();
		})
	);
}

export function regPythonPathCommand(context: vscode.ExtensionContext) {
	context.subscriptions.push(
		vscode.commands.registerCommand('devchat.PythonPath', async () => {
			const pythonPath = await vscode.window.showInputBox({
				title: "Set Python Path",
				placeHolder: "Set Python Path"
			}) ?? '';

			if (pythonPath) {
				vscode.workspace.getConfiguration("DevChat").update("PythonPath", pythonPath, vscode.ConfigurationTarget.Global);
			}
		})
	);
}

export function regApplyDiffResultCommand(context: vscode.ExtensionContext) {
	context.subscriptions.push(
		vscode.commands.registerCommand('devchat.applyDiffResult', async () => {
			const activeEditor = vscode.window.activeTextEditor;
			const fileName = activeEditor!.document.fileName;

			const [leftUri, rightUri] = FilePairManager.getInstance().findPair(fileName) || [undefined, undefined];
			if (leftUri && rightUri) {
				// 获取对比的两个文件
				const leftDoc = await vscode.workspace.openTextDocument(leftUri);
				const rightDoc = await vscode.workspace.openTextDocument(rightUri);

				// 将右边文档的内容替换到左边文档
				const leftEditor = await vscode.window.showTextDocument(leftDoc);
				await leftEditor.edit(editBuilder => {
					const fullRange = new vscode.Range(0, 0, leftDoc.lineCount, 0);
					editBuilder.replace(fullRange, rightDoc.getText());
				});

				// 保存左边文档
				await leftDoc.save();
			} else {
				vscode.window.showErrorMessage('No file to apply diff result.');
			}
		})
	);
}

export function TestDevChatCommand(context: vscode.ExtensionContext) {
	context.subscriptions.push(
		vscode.commands.registerCommand('devchat.', async () => {
			TopicManager.getInstance().loadTopics();
		})
	);
}



export function registerAskCodeIndexStartCommand(context: vscode.ExtensionContext) {
    let disposable = vscode.commands.registerCommand('DevChat.AskCodeIndexStart', async () => {
        const config = getConfig();
        const pythonVirtualEnv = config.pythonVirtualEnv;
        const supportedFileTypes = config.supportedFileTypes;

		updateIndexingStatus("started");

        if (!pythonVirtualEnv) {
            await installAskCode(supportedFileTypes);
        } else {
            await indexCode(pythonVirtualEnv, supportedFileTypes);
        }

		updateIndexingStatus("stopped");
    });
    context.subscriptions.push(disposable);
}

function getConfig() {
    return {
        pythonVirtualEnv: vscode.workspace.getConfiguration('DevChat').get('PythonVirtualEnv'),
        supportedFileTypes: vscode.workspace.getConfiguration('DevChat.askcode').get('supportedFileTypes'),
    };
}

async function installAskCode(supportedFileTypes) {
	const pythonEnvPath : string = await installAskCodeFun();
	if (!pythonEnvPath) {
		logger.channel()?.error(`Installation failed!`);
		logger.channel()?.show();
        return;
	}

	UiUtilWrapper.updateConfiguration("DevChat", "PythonVirtualEnv", pythonEnvPath.trim());
    logger.channel()?.info(`Installation finished.`);
    
    // Execute the indexing command after the installation is finished
    await indexCode(pythonEnvPath, supportedFileTypes);
}

async function indexCode(pythonVirtualEnv, supportedFileTypes) {
    let envs = {};

    let openaiApiKey = await ApiKeyManager.getApiKey();
    if (!openaiApiKey) {
        logger.channel()?.error('The OpenAI key is invalid!');
        logger.channel()?.show();
        return;
    }
    envs['OPENAI_API_KEY'] = openaiApiKey;

    const openAiApiBase = ApiKeyManager.getEndPoint(openaiApiKey);
    if (openAiApiBase) {
        envs['OPENAI_API_BASE'] = openAiApiBase;
    }

    const workspaceDir = UiUtilWrapper.workspaceFoldersFirstPath();
    
    const command = pythonVirtualEnv.trim();
    const args = [UiUtilWrapper.extensionPath() + "/tools/askcode_index_query.py", "index", ".", supportedFileTypes];
    const options = { env: envs, cwd: workspaceDir };

    indexProcess = new CommandRun();
    const result = await indexProcess.spawnAsync(command, args, options, (data) => {
        if (data.includes('Skip file:')) {
			return;
		}
		logger.channel()?.info(`${data}`);
    }, (data) => {
		if (data.includes('Skip file:')) {
			return;
		}
        logger.channel()?.info(`${data}`);
    }, undefined, undefined);

    if (result.exitCode !== 0) {
		if (result.exitCode === null) {
			logger.channel()?.info(`Indexing stopped!`);
		} else {
			logger.channel()?.error(`Indexing failed: ${result.stderr}`);
			logger.channel()?.show();
			vscode.window.showErrorMessage(`Indexing failed: ${result.stderr}`);
		}
        return;
    }

	updateLastModifyTime();
    logger.channel()?.info(`index finished.`);
    vscode.window.showInformationMessage('Indexing finished.');
}


export function registerAskCodeIndexStopCommand(context: vscode.ExtensionContext) {
    let disposable = vscode.commands.registerCommand('DevChat.AskCodeIndexStop', async () => {
        if (indexProcess) {
			indexProcess.stop();
			indexProcess = null;
		}
    });
    context.subscriptions.push(disposable);
}

export {
	registerOpenChatPanelCommand,
	registerAddContextCommand,
	registerAskForCodeCommand,
	registerAskForFileCommand,
};
