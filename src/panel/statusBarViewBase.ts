import * as fs from 'fs';
import * as path from 'path';
import { logger } from "../util/logger";

import { UiUtilWrapper } from "../util/uiUtil";
import { TopicManager } from "../topic/topicManager";
import { checkDevChatDependency } from "../contributes/commandsBase";
import { ApiKeyManager } from '../util/apiKey';
import { CommandRun } from '../util/commonUtil';
import { installDevchat } from '../util/python_installer/install_devchat';



function getExtensionVersion(): string {
	const packageJsonPath = path.join(UiUtilWrapper.extensionPath(), 'package.json');
	const packageJsonContent = fs.readFileSync(packageJsonPath, 'utf8');
	const packageJson = JSON.parse(packageJsonContent);

	return packageJson.version;
}

let devchatStatus = '';
let apiKeyStatus = '';

let preDevchatStatus = '';
let preApiKeyStatus = '';

let hasLoadTopics: boolean = false;

export async function dependencyCheck(): Promise<[string, string]> {
	// there are some different status of devchat:
	// 0. not checked
	// 1. has statisfied the dependency
	// 2. is installing
	// 3. install failed
	// 4. install success

	// key status:
	// 0. not checked
	// 1. invalid or not set
	// 2. valid key

	// define subfunction to check devchat dependency
	const getDevChatStatus = async (): Promise<string> => {
		if (devchatStatus === '') {
			const bOk = checkDevChatDependency(false);
			if (bOk) {
				devchatStatus = 'has statisfied the dependency';
				return devchatStatus;
			} 

			devchatStatus = 'installing devchat';
			const devchatCommandEnv = await installDevchat();
			if (devchatCommandEnv) {
				logger.channel()?.info(`devchatCommandEnv: ${devchatCommandEnv}`);
				await UiUtilWrapper.updateConfiguration('DevChat', 'DevChatPath', devchatCommandEnv);

				devchatStatus = 'DevChat has been installed';
				return devchatStatus;
			} else {
				logger.channel()?.info(`devchatCommandEnv: undefined`);

				devchatStatus = 'An error occurred during the installation of DevChat';
				return devchatStatus;
			}
		} else if (devchatStatus === 'has statisfied the dependency') {
			return devchatStatus;
		} else if (devchatStatus === 'installing devchat') {
			return devchatStatus;
		} else if (devchatStatus === 'DevChat has been installed') {
			return devchatStatus;
		} else if (devchatStatus === 'An error occurred during the installation of DevChat') {
			const bOk = checkDevChatDependency(false);
			if (bOk) {
				devchatStatus = 'has statisfied the dependency';
				return devchatStatus;
			}
			return devchatStatus;
		}
		return "";
	};

	// define subfunction to check api key
	const getApiKeyStatus = async (): Promise<string> => {
		if (apiKeyStatus === '' || apiKeyStatus === 'Please set the API key') {
			const accessKey = await ApiKeyManager.getApiKey();
			if (accessKey) {
				apiKeyStatus = 'has valid access key';
				return apiKeyStatus;
			} else {
				apiKeyStatus = 'Please set the API key';
				return apiKeyStatus;
			}
		} else {
			return apiKeyStatus;
		}
	};

	const devchatPackageStatus = await getDevChatStatus();
	const apiAccessKeyStatus = await getApiKeyStatus();

	if (devchatPackageStatus === 'has statisfied the dependency' || devchatPackageStatus === 'DevChat has been installed') {
		if (apiAccessKeyStatus === 'has valid access key') {
			if (!hasLoadTopics) {
				TopicManager.getInstance().loadTopics();
			}
			hasLoadTopics = true;
		}
	}

	if (devchatPackageStatus !== preDevchatStatus) {
		logger.channel()?.info(`devchat status: ${devchatPackageStatus}`);
		preDevchatStatus = devchatPackageStatus;
	}
	if (apiAccessKeyStatus !== preApiKeyStatus) {
		logger.channel()?.info(`api key status: ${apiAccessKeyStatus}`);
		preApiKeyStatus = apiAccessKeyStatus;
	}

	return [devchatPackageStatus, apiAccessKeyStatus];
}