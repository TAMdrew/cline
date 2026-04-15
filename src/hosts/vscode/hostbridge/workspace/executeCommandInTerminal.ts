import { ExecuteCommandInTerminalRequest, ExecuteCommandInTerminalResponse } from "@shared/proto/host/workspace"
import { Logger } from "@/shared/services/Logger"

/**
 * Deprecated compatibility handler for the removed direct integrated-terminal launcher.
 *
 * New product flows such as the Kanban install CTA should create a normal task and let
 * the task-owned command execution pipeline handle terminal usage instead of calling
 * this host bridge directly.
 *
 * The RPC surface remains temporarily to avoid host/proto churn, but it no longer
 * creates a VS Code terminal or executes commands on the user's behalf.
 *
 * @param request The request containing the command to execute
 * @returns Response indicating success
 */
export async function executeCommandInTerminal(
	request: ExecuteCommandInTerminalRequest,
): Promise<ExecuteCommandInTerminalResponse> {
	try {
		Logger.warn(
			`executeCommandInTerminal called after integrated-terminal removal; command was not executed: ${request.command}`,
		)

		return ExecuteCommandInTerminalResponse.create({
			success: false,
		})
	} catch (error) {
		Logger.error("Error handling deprecated executeCommandInTerminal request:", error)
		return ExecuteCommandInTerminalResponse.create({
			success: false,
		})
	}
}
