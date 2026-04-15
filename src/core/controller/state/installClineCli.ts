import { Empty, EmptyRequest } from "@shared/proto/cline/common"
import { ShowMessageType } from "@shared/proto/host/window"
import { HostProvider } from "@/hosts/host-provider"
import { Logger } from "@/shared/services/Logger"
import { Controller } from ".."

/**
 * Deprecated compatibility handler for the removed direct CLI install launcher.
 *
 * The Kanban install CTA now starts a normal pre-seeded task instead of calling this
 * endpoint. We intentionally keep the RPC surface temporarily to avoid unnecessary
 * proto churn for older clients and generated interfaces.
 *
 * @param controller The controller instance
 * @param _request The empty request
 * @returns Empty response
 */
export async function installClineCli(_controller: Controller, _request: EmptyRequest): Promise<Empty> {
	const installCommand = "npm install -g cline"

	try {
		Logger.warn("installClineCli called after integrated-terminal install flow removal")
		await HostProvider.window.showMessage({
			type: ShowMessageType.INFORMATION,
			message: `Automatic CLI installation from the VS Code extension has been removed. Run \`${installCommand}\` manually in your terminal if you want to install Cline CLI.`,
			options: { items: [] },
		})
	} catch (error) {
		Logger.error("Error showing deprecated CLI installation notice:", error)
		await HostProvider.window.showMessage({
			type: ShowMessageType.ERROR,
			message: `Failed to show CLI installation guidance: ${error instanceof Error ? error.message : "Unknown error"}`,
			options: { items: [] },
		})
	}

	return Empty.create()
}
