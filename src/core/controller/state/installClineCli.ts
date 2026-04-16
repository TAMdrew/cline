import { Empty, EmptyRequest } from "@shared/proto/cline/common"
import { ShowMessageType } from "@shared/proto/host/window"
import { ExecuteCommandInTerminalRequest } from "@shared/proto/host/workspace"
import { HostProvider } from "@/hosts/host-provider"
import { Logger } from "@/shared/services/Logger"
import { Controller } from ".."

/**
 * Handles launching the Cline CLI installation command in the host terminal.
 * Uses the shared host-bridge RPC so hosts can implement the lightest possible
 * single-command terminal launch without reintroducing the older terminal
 * orchestration features.
 *
 * @param controller The controller instance
 * @param _request The empty request
 * @returns Empty response
 */
export async function installClineCli(_controller: Controller, _request: EmptyRequest): Promise<Empty> {
	const installCommand = "npm install -g cline"

	try {
		const response = await HostProvider.workspace.executeCommandInTerminal(
			ExecuteCommandInTerminalRequest.create({
				command: installCommand,
			}),
		)

		if (!response.success) {
			throw new Error("Failed to execute command in terminal")
		}
	} catch (error) {
		Logger.error("Error executing CLI installation:", error)
		await HostProvider.window.showMessage({
			type: ShowMessageType.ERROR,
			message: `Failed to start CLI installation: ${error instanceof Error ? error.message : "Unknown error"}`,
			options: { items: [] },
		})
	}

	return Empty.create()
}
