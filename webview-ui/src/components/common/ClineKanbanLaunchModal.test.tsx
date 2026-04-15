import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { TaskServiceClient } from "@/services/grpc-client"
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
	TaskServiceClient: {
		newTask: vi.fn(),
	},
}))

describe("ClineKanbanLaunchModal", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it("starts a new install task and closes the modal when the CTA is clicked", async () => {
		const onClose = vi.fn()
		vi.mocked(TaskServiceClient.newTask).mockResolvedValue({ value: "task-id" } as any)

		render(<ClineKanbanLaunchModal onClose={onClose} open={true} />)

		fireEvent.click(screen.getByRole("button", { name: "Run in terminal" }))

		expect(TaskServiceClient.newTask).toHaveBeenCalledTimes(1)
		expect(TaskServiceClient.newTask).toHaveBeenCalledWith(
			expect.objectContaining({
				text: "Run `npm install -g cline` in the terminal. Do not do anything else.",
				images: [],
			}),
		)

		await waitFor(() => {
			expect(onClose).toHaveBeenCalledWith(false)
		})
	})

	it("disables the CTA while the install task is being created", async () => {
		const onClose = vi.fn()
		let resolveTask: (() => void) | undefined
		vi.mocked(TaskServiceClient.newTask).mockImplementation(
			() =>
				new Promise((resolve) => {
					resolveTask = () => resolve({ value: "task-id" } as any)
				}),
		)

		render(<ClineKanbanLaunchModal onClose={onClose} open={true} />)

		const button = screen.getByRole("button", { name: "Run in terminal" })
		fireEvent.click(button)

		expect(screen.getByRole("button", { name: "Starting install task..." }).hasAttribute("disabled")).toBe(true)

		resolveTask?.()

		await waitFor(() => {
			expect(onClose).toHaveBeenCalledWith(false)
		})
	})
})
