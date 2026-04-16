import { ExecuteCommandInTerminalRequest, ExecuteCommandInTerminalResponse } from "@shared/proto/host/workspace"
import * as vscode from "vscode"
import { Logger } from "@/shared/services/Logger"

/**
 * Executes a single command in a new VS Code integrated terminal.
 * This is intentionally minimal: create terminal, show terminal, send command.
 *
 * @param request The request containing the command to execute
 * @returns Response indicating success
 */
export async function executeCommandInTerminal(
	request: ExecuteCommandInTerminalRequest,
): Promise<ExecuteCommandInTerminalResponse> {
	try {
		const terminalOptions: vscode.TerminalOptions = {
			name: "Cline",
			iconPath: new vscode.ThemeIcon("cline-icon"),
			env: {
				CLINE_ACTIVE: "true",
			},
		}

		const terminal = vscode.window.createTerminal(terminalOptions)
		terminal.show()
		terminal.sendText(request.command, true)

		return ExecuteCommandInTerminalResponse.create({
			success: true,
		})
	} catch (error) {
		Logger.error("Error executing command in terminal:", error)
		return ExecuteCommandInTerminalResponse.create({
			success: false,
		})
	}
}
