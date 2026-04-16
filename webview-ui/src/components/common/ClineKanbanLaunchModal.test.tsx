import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { StateServiceClient } from "@/services/grpc-client"
import { ClineKanbanLaunchModal } from "./ClineKanbanLaunchModal"

vi.mock("@vscode/webview-ui-toolkit/react", () => ({
	VSCodeButton: ({ children, ...props }: any) => <button {...props}>{children}</button>,
	VSCodeCheckbox: ({ children, checked, onChange, ...props }: any) => (
		<label>
			<input checked={checked} onChange={onChange} type="checkbox" {...props} />
			{children}
		</label>
	),
}))

vi.mock("@/assets/cline_kanban_demo.mp4", () => ({ default: "/mock-kanban-demo.mp4" }))
vi.mock("@/assets/cline_kanban_demo.webm", () => ({ default: "/mock-kanban-demo.webm" }))

vi.mock("@/services/grpc-client", () => ({
	StateServiceClient: {
		installClineCli: vi.fn(),
	},
}))

describe("ClineKanbanLaunchModal", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it("launches the install command and closes the modal when the CTA is clicked", async () => {
		const onClose = vi.fn()
		vi.mocked(StateServiceClient.installClineCli).mockResolvedValue({} as any)

		render(<ClineKanbanLaunchModal onClose={onClose} open={true} />)

		fireEvent.click(screen.getByRole("button", { name: "Run in terminal" }))

		expect(StateServiceClient.installClineCli).toHaveBeenCalledTimes(1)

		await waitFor(() => {
			expect(onClose).toHaveBeenCalledWith(false)
		})
	})

	it("disables the CTA while the install command is being launched", async () => {
		const onClose = vi.fn()
		let resolveInstall: (() => void) | undefined
		vi.mocked(StateServiceClient.installClineCli).mockImplementation(
			() =>
				new Promise((resolve) => {
					resolveInstall = () => resolve({} as any)
				}),
		)

		render(<ClineKanbanLaunchModal onClose={onClose} open={true} />)

		const button = screen.getByRole("button", { name: "Run in terminal" })
		fireEvent.click(button)

		expect(screen.getByRole("button", { name: "Starting install..." }).hasAttribute("disabled")).toBe(true)

		resolveInstall?.()

		await waitFor(() => {
			expect(onClose).toHaveBeenCalledWith(false)
		})
	})
})
