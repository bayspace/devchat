import { logger } from "../util/logger";
import { CommandRun } from "../util/commonUtil";
import { UiUtilWrapper  } from "../util/uiUtil";

interface DtmResponse {
	status: number;
	message: string;
	log: string;
}

class DtmWrapper {
	private workspaceDir: string;
	private commandRun: CommandRun;

	constructor() {
		this.workspaceDir = UiUtilWrapper.workspaceFoldersFirstPath() || '.';
		this.commandRun = new CommandRun();
	}

	async commit(commitMsg: string): Promise<DtmResponse> {
		try {
			logger.channel()?.info(`Running command: git commit -m ${commitMsg}`);
			const result = await this.commandRun.spawnAsync("git", ['commit', '-m', commitMsg], { cwd: this.workspaceDir }, undefined, undefined, undefined, undefined);
			return { status: result.exitCode || 0, message: result.stdout, log: result.stderr };
		} catch (error) {
			logger.channel()?.error(`Error: ${error}`);
			logger.channel()?.show();
			return error as DtmResponse;
		}
	}

	async commitall(commitMsg: string): Promise<DtmResponse> {
		try {
			logger.channel()?.info(`Running command: git commit -am ${commitMsg}`);
			const result = await this.commandRun.spawnAsync("git", ['commit', '-am', commitMsg], { cwd: this.workspaceDir }, undefined, undefined, undefined, undefined);
			return { status: result.exitCode || 0, message: result.stdout, log: result.stderr };
		} catch (error) {
			logger.channel()?.error(`Error: ${error}`);
			logger.channel()?.show();
			return error as DtmResponse;
		}
	}
}

export default DtmWrapper;
