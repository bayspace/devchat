import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as ncp from 'ncp';

import { logger } from '../util/logger';

export function createChatDirectoryAndCopyInstructionsSync(extensionUri: vscode.Uri) {
  
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
      return;
    }
  
    const workspaceRoot = workspaceFolders[0].uri.fsPath;
    const chatDirPath = path.join(workspaceRoot, '.chat');
    const instructionsSrcPath = path.join(extensionUri.fsPath, 'instructions');
  
    try {
      // 检查 .chat 目录是否存在，如果不存在，则创建它
      if (!fs.existsSync(chatDirPath)) {
        fs.mkdirSync(chatDirPath);
      } else {
        return;
      }
  
      // 将 instructions 目录复制到 .chat 目录中
      ncp.ncp(instructionsSrcPath, path.join(chatDirPath, 'instructions'), (err) => {
        if (err) {
			logger.channel()?.error('Error copying instructions:', err);
			logger.channel()?.show();
        }
      });
    } catch (error) {
		logger.channel()?.error('Error creating .chat directory and copying instructions:', error);
		logger.channel()?.show();
    }
}