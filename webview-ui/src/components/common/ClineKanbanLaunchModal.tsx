import { EmptyRequest } from "@shared/proto/cline/common"
import { VSCodeButton, VSCodeCheckbox } from "@vscode/webview-ui-toolkit/react"
import React, { useEffect, useState } from "react"
import kanbanDemoVideoMp4 from "@/assets/cline_kanban_demo.mp4"
import kanbanDemoVideoWebm from "@/assets/cline_kanban_demo.webm"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { StateServiceClient } from "@/services/grpc-client"

const INSTALL_COMMAND = "npm install -g cline"
const resolveAssetSrc = (src: string) => (src.startsWith("/src/") ? new URL(src, import.meta.url).toString() : src)
const kanbanDemoMp4Src = resolveAssetSrc(kanbanDemoVideoMp4)
const kanbanDemoWebmSrc = resolveAssetSrc(kanbanDemoVideoWebm)

export const CLINE_KANBAN_MODAL_DISMISS_ID = "cline-kanban-launch-modal-v1"

interface ClineKanbanLaunchModalProps {
	open: boolean
	onClose: (doNotShowAgain: boolean) => void
}

export const ClineKanbanLaunchModal: React.FC<ClineKanbanLaunchModalProps> = ({ open, onClose }) => {
	const [doNotShowAgain, setDoNotShowAgain] = useState(false)
	const [isLaunchingInstall, setIsLaunchingInstall] = useState(false)

	useEffect(() => {
		if (open) {
			setIsLaunchingInstall(false)
		}
	}, [open])

	const handleAction = async () => {
		try {
			setIsLaunchingInstall(true)
			await StateServiceClient.installClineCli(EmptyRequest.create({}))
			onClose(doNotShowAgain)
		} catch (error) {
			console.error("Failed to launch CLI install command:", error)
			setIsLaunchingInstall(false)
		}
	}

	return (
		<Dialog onOpenChange={(isOpen) => !isOpen && onClose(doNotShowAgain)} open={open}>
			<DialogContent className="pt-4 px-5 pb-4 gap-0 max-w-2xl">
				<div className="space-y-3">
					<div className="pr-6 min-h-6 flex items-center">
						<DialogTitle className="m-0" style={{ color: "var(--vscode-editor-foreground)" }}>
							Introducing Cline Kanban
						</DialogTitle>
					</div>

					<video
						autoPlay
						className="w-full rounded-md border border-[var(--vscode-editorGroup-border)]"
						loop
						muted
						playsInline>
						<source src={kanbanDemoMp4Src} type="video/mp4" />
						<source src={kanbanDemoWebmSrc} type="video/webm" />
					</video>

					<DialogDescription className="text-sm" style={{ color: "var(--vscode-descriptionForeground)" }}>
						A replacement for your IDE better suited for running many agents in parallel and reviewing diffs. Enable
						auto-commit and link cards together to create dependency chains that complete large amounts of work
						autonomously.
					</DialogDescription>

					<div className="p-1">
						<code className="block rounded-sm px-2 py-1 bg-[var(--vscode-textCodeBlock-background)] text-sm">
							{INSTALL_COMMAND}
						</code>
						<div className="mt-3">
							<VSCodeButton disabled={isLaunchingInstall} onClick={handleAction}>
								{isLaunchingInstall ? "Starting install..." : "Run in terminal"}
							</VSCodeButton>
						</div>
					</div>

					<div className="pt-2">
						<VSCodeCheckbox
							checked={doNotShowAgain}
							onChange={(e: any) => {
								setDoNotShowAgain(e.target.checked === true)
							}}>
							Do not show again
						</VSCodeCheckbox>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	)
}

export default ClineKanbanLaunchModal
