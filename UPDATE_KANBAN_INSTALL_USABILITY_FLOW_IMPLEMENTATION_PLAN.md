## Update the Kanban Install Usability Flow to Use a Normal Pre-Seeded Task

### Standalone implementation plan for preserving the Kanban install experience without restoring the deprecated integrated-terminal launcher

---

## Progress Checklist

- [x] Reconfirm the current Kanban install flow and the removed integrated-terminal behavior
- [x] Replace the Kanban CTA behavior so it starts a normal pre-seeded task on all supported IDE platforms
- [x] Keep the task approval flow fully intact so user auto-approval settings continue to govern whether the install command runs
- [x] Remove or quarantine any stale code paths, comments, or assumptions that still imply the Kanban CTA directly launches an integrated terminal
- [ ] Validate the new UX in both the VS Code extension and the JetBrains/standalone extension path
- [ ] Confirm that the final codebase communicates the new architecture clearly

---

## 1. Purpose of This Document

This document is a **standalone implementation guide** for updating the **Kanban install call-to-action** so it still feels useful to users after the old integrated-terminal install flow was removed.

It is designed to be handed directly to the development team. A developer should be able to read this file in isolation and understand:

- what the Kanban install usability flow did before,
- what changed when the integrated-terminal launcher was removed,
- why the current behavior is no longer aligned with the intended product experience,
- what the new desired behavior is,
- how that behavior should work across both **VS Code** and **JetBrains**,
- which files need to change,
- what architectural constraints matter,
- and how to validate the new flow end to end.

This plan is intentionally detailed. The goal is not just to say “change the button,” but to explain the reasoning behind the change so future developers understand the architecture and do not accidentally reintroduce the wrong behavior later.

In other words: this is both a work plan and an architecture explanation.

---

## 2. Executive Summary

The current branch removed the old **integrated-terminal install launcher** that previously powered the Kanban install CTA in the webview.

That older behavior worked roughly like this:

1. the user saw the **Introducing Cline Kanban** modal,
2. they clicked a CTA such as **Run in terminal**,
3. the webview called `StateServiceClient.installClineCli({})`,
4. the extension backend routed that to `installClineCli`,
5. the host bridge launched `npm install -g cline` in the integrated terminal on the user’s behalf.

That flow no longer exists.

In the current branch:

- `installClineCli` is now only a deprecated compatibility handler that shows an informational message,
- `executeCommandInTerminal` is also deprecated and no longer actually launches a terminal,
- and the current Kanban modal has been simplified to just **copy the install command**.

The desired end state is **not** to restore the old integrated-terminal launcher.

Instead, the product direction is:

> When the user clicks the Kanban install CTA, Cline should start a **normal new task** with a **predefined install prompt**, and then let the normal task and command approval flow proceed exactly as it would for any other task.

That means:

- the user still explicitly initiates the flow by clicking the button,
- the extension creates a task with a prompt such as:
  - `Run \`npm install -g cline\` in the terminal. Do not do anything else.`
- Cline then behaves normally,
- if the user’s auto-approve settings permit the command, it can run automatically,
- if not, the user still manually approves the command in the usual task UI.

This is the key architectural decision:

- **reuse the normal task flow**
- **do not bypass approvals**
- **do not restore deprecated integrated-terminal-specific plumbing**

And importantly, this updated behavior should work the **same way in both the VS Code extension and the JetBrains extension**.

---

## 3. Architectural Vision Overview

### 3.1 What the final product should feel like

After this work is complete, the user experience should feel simple and consistent:

- The Kanban modal still introduces Kanban and still gives users a way to install the CLI.
- Clicking the CTA still feels like “start the installation workflow.”
- The workflow no longer depends on a special-case terminal launcher hidden behind the scenes.
- Instead, the installation runs through a **normal Cline task**, so the user sees the same review/approval semantics they already understand from the rest of the product.

In practice, this means the CTA becomes a **shortcut into a normal task flow**, not a special privileged path.

### 3.2 What the final codebase should communicate

The repository should communicate the following truth clearly:

> The Kanban install CTA no longer launches a terminal directly. It creates a normal task seeded with an installation request, and the existing task/command approval pipeline handles the rest.

This matters because codebases teach future developers how the system works.

If the repo still implies that the Kanban install CTA is a special-case direct terminal launcher, future maintainers will either:

- accidentally resurrect deprecated integrated-terminal plumbing,
- or misunderstand why task approval behavior appears in this flow.

The updated architecture should instead tell a cleaner story:

- **user intent enters through the Kanban modal CTA**,
- **task creation happens through the standard task RPC**,
- **command execution happens through the existing task-owned terminal pipeline**,
- **approval semantics are unchanged and governed by the user’s settings**.

### 3.3 Why this is better than restoring the old integrated-terminal launcher

Restoring the old integrated-terminal launcher would bring back an increasingly special-case behavior:

- it would reintroduce platform-specific direct terminal-launch code,
- it would cut across the normal task approval model,
- and it would diverge from the new architectural direction that already removed integrated-terminal-specific execution paths elsewhere.

Using a normal task instead has several advantages:

- it reuses code that already exists,
- it works cross-platform in a shared way,
- it respects auto-approval settings consistently,
- it avoids creating a second command-execution model just for Kanban installation,
- and it keeps the product behavior understandable.

That last point is especially important for users: the Kanban install CTA should not become a hidden exception to how command execution and approval work in Cline.

---

## 4. Current Architecture and Why It Needs to Change

This section explains the relevant architecture as it exists today.

### 4.1 The Kanban modal still exists in the webview

Relevant files:

- `webview-ui/src/App.tsx`
- `webview-ui/src/components/common/ClineKanbanLaunchModal.tsx`

What happens today:

- `App.tsx` mounts `ClineKanbanLaunchModal` unconditionally.
- It decides whether to show the modal based on dismissal state (`cline-kanban-launch-modal-v1`).
- The modal appears in the normal extension UI flow before the user proceeds further.

Why this matters:

The Kanban modal is still a live UX surface. The question is not whether the modal exists, but **what its CTA should do now**.

### 4.2 The old install RPC still exists, but only as compatibility scaffolding

Relevant file:

- `src/core/controller/state/installClineCli.ts`

Current behavior:

- `installClineCli` no longer starts an install command.
- It now only shows an informational message telling the user to run `npm install -g cline` manually.

Why this matters:

This means any UI still calling `StateServiceClient.installClineCli({})` would appear to offer installation behavior but would no longer actually perform the install workflow.

### 4.3 The host-bridge integrated-terminal execution path is also gone

Relevant file:

- `src/hosts/vscode/hostbridge/workspace/executeCommandInTerminal.ts`

Current behavior:

- this handler is deprecated,
- it logs a warning,
- and it returns `success: false` instead of creating a terminal or executing the command.

Why this matters:

Reverting only the controller handler would not restore behavior. The underlying execution bridge it depended on has also been intentionally disabled.

### 4.4 The current Kanban modal should no longer be treated as a direct launcher

Relevant file:

- `webview-ui/src/components/common/ClineKanbanLaunchModal.tsx`

Current behavior at the start of this plan:

- the modal displays `npm install -g cline`,
- the CTA no longer uses the deprecated install RPC,
- and the branch needs to be updated so the CTA starts a normal pre-seeded task instead.

Why this matters:

The important point is that the modal should not be treated as a direct terminal launcher anymore. The desired behavior is a guided install flow implemented through normal task creation.

### 4.5 Normal task creation is already shared across both VS Code and JetBrains/standalone

Relevant files:

- `webview-ui/src/services/grpc-client.ts`
- `webview-ui/src/components/welcome/SuggestedTasks.tsx`
- `src/core/controller/task/newTask.ts`
- `src/generated/hosts/vscode/protobus-services.ts`
- `src/generated/hosts/standalone/protobus-server-setup.ts`

What happens today:

- the webview can create tasks using `TaskServiceClient.newTask(...)`,
- the same RPC is wired in both VS Code and the standalone/JetBrains host path,
- and normal UI surfaces already use it to start pre-seeded tasks.

Why this matters:

This is the key enabling fact for the fix-forward plan. We do **not** need to invent a new cross-platform task-starting mechanism.

### 4.6 The task system already owns normal command approval behavior

Relevant files:

- `src/core/controller/index.ts`
- `src/core/task/index.ts`

What happens today:

- task creation flows through `Controller.initTask(...)`,
- a new `Task` is created,
- the task uses the normal command execution pipeline,
- command approval is governed by the existing task ask/response system and user settings.

Why this matters:

This is exactly the behavior we want to preserve for the Kanban install flow.

The install CTA should not become a hidden bypass around command approval. It should simply trigger a task that behaves like any other task.

---

## 5. Product Requirements

These are the core requirements for the new usability flow.

### 5.1 User-triggered only

The user must still explicitly click the Kanban CTA.

There should be no background or automatic install action initiated without the user starting it.

### 5.2 Normal task behavior

After the user clicks the CTA:

- the extension should create a normal task,
- seeded with a predefined install prompt,
- and then let the task proceed normally.

### 5.3 No approval bypass

The task must preserve the user’s existing approval model.

That means:

- if auto-approve settings allow the command, the task may proceed automatically,
- if approval is required, the user must still manually approve `npm install -g cline`.

There should be **no** programmatic “yes button click” or hidden approval injection.

### 5.4 Cross-platform parity

The updated behavior should work the same way in:

- the **VS Code extension**
- the **JetBrains extension**

The implementation should therefore rely on shared task creation and task execution flows rather than VS Code-only terminal plumbing.

### 5.5 No restoration of deprecated integrated-terminal launcher paths

This initiative should **not** restore:

- `installClineCli` as a direct launcher,
- `executeCommandInTerminal` as an integrated-terminal bridge,
- or any equivalent special-case runtime path.

The Kanban install flow should be modernized, not reverted.

---

## 6. Target End State

When the work is complete, the architecture should look like this:

- The Kanban modal still appears in the extension UI.
- The CTA still initiates the install workflow.
- Clicking the CTA creates a new task with a predefined install prompt.
- The task behaves exactly like a normal task from then on.
- The install command runs through the existing background terminal task execution flow.
- Approval behavior is unchanged and still controlled by user settings.
- The same CTA behavior works in both VS Code and JetBrains.
- Deprecated integrated-terminal install launchers remain deprecated and unused.

That is the completion condition.

---

## 7. Recommended Implementation Sequence

The safest order is:

1. update the Kanban modal CTA behavior,
2. verify it creates a new task with the expected prompt,
3. verify the task reaches the expected command-approval behavior,
4. clean up comments and stale wording that still imply a direct terminal launcher,
5. validate in both platform paths.

This keeps the change small and avoids unnecessary refactors.

---

## 8. Workstream 1: Change the Kanban CTA to Start a Normal Task

### Goal

Make the Kanban CTA create a normal new task instead of copying the command or calling deprecated install-launch behavior.

### Primary file

- `webview-ui/src/components/common/ClineKanbanLaunchModal.tsx`

### Required changes

- [x] Import `NewTaskRequest` from `@shared/proto/cline/task`
- [x] Import `TaskServiceClient` from `@/services/grpc-client`
- [x] Define a dedicated install prompt constant for the task, for example:
  - `Run \`npm install -g cline\` in the terminal. Do not do anything else.`
- [x] Replace the current copy-to-clipboard CTA behavior with `TaskServiceClient.newTask(...)`
- [x] Close the modal after task creation succeeds
- [x] Add a temporary loading/disabled state while the task creation RPC is in flight

### Important design note

This step should be implemented in a way that works the same for both VS Code and JetBrains.

That means the button handler should no longer branch on platform for the main CTA behavior. The shared behavior should be:

- create a pre-seeded task

If the team later wants a secondary “copy command” affordance, that can be added separately, but it should not be the primary install UX if the goal is to preserve the guided flow.

---

## 9. Workstream 2: Preserve the Normal Approval and Command Flow

### Goal

Ensure the install task is treated like any other task and respects the user’s existing command approval model.

### Relevant files

- `src/core/controller/task/newTask.ts`
- `src/core/controller/index.ts`
- `src/core/task/index.ts`

### Required changes

- [x] No special-case approval code should be added
- [x] No programmatic `handleWebviewAskResponse("yesButtonClicked")` should be used for this flow
- [x] No bypass around the normal task ask/response logic should be added

### Why this matters

This is one of the most important product constraints.

The Kanban install CTA should not silently become a command auto-run exception. It should simply save the user the work of manually typing a prompt.

The task system should continue to decide:

- when the command is proposed,
- whether the user must approve it,
- and how it runs.

That keeps the behavior consistent with the rest of Cline.

---

## 10. Workstream 3: Remove Stale Assumptions About Direct Install Launching

### Goal

Make the codebase reflect the new architecture clearly.

### Relevant files

- `webview-ui/src/components/common/ClineKanbanLaunchModal.tsx`
- `src/core/controller/state/installClineCli.ts`
- `src/hosts/vscode/hostbridge/workspace/executeCommandInTerminal.ts`

### Required changes

- [x] Update any comments in the Kanban modal that imply the CTA directly runs a terminal command
- [x] Confirm no UI still routes the Kanban CTA through `StateServiceClient.installClineCli(...)`
- [x] Leave `installClineCli.ts` and `executeCommandInTerminal.ts` deprecated unless another user-visible path still genuinely needs them

### Why this matters

Even if the runtime behavior works, stale comments and stale UX assumptions can cause future confusion.

The codebase should clearly express that:

- the Kanban CTA starts a task,
- the task owns command execution,
- the deprecated direct launcher is no longer the intended path.

---

## 11. Suggested Prompt Design Guidance

This workstream does not require final product wording decisions now, but developers should understand the role the prompt plays.

### Initial recommended prompt

Start with:

`Run \`npm install -g cline\` in the terminal. Do not do anything else.`

### Why this wording is a good starting point

- it is explicit,
- it names the exact command,
- it constrains the model from broadening scope,
- and it communicates that the workflow is a single-purpose install task.

### What may need tuning later

Depending on real behavior, the team may later refine the prompt to better reduce ambiguity, for example by clarifying:

- that the command should be run as-is,
- that the user should be asked for approval if required,
- or that the task should finish immediately after proposing/running that command.

That prompt iteration is normal and should not block the first implementation.

---

## 12. Validation Strategy

Validation needs to prove both correctness and architectural alignment.

### 12.1 Webview / frontend validation

- [x] Run the relevant webview test suite
- [x] Add or update focused tests for the Kanban modal if appropriate
- [x] Verify the CTA is disabled while the task creation call is in flight

Suggested commands:

```bash
npm run test:webview
```

### 12.2 Manual product validation in VS Code

- [ ] Open the extension and trigger the Kanban modal
- [ ] Click the CTA
- [ ] Confirm a new task is created
- [ ] Confirm the task prompt is the intended install prompt
- [ ] Confirm the task proceeds through the normal command approval path
- [ ] Confirm approval behavior matches the current user auto-approve settings

### 12.3 Manual product validation in JetBrains / standalone path

- [ ] Trigger the same Kanban modal in the JetBrains extension path
- [ ] Click the CTA
- [ ] Confirm the same new-task flow occurs
- [ ] Confirm behavior matches the VS Code UX as closely as intended

### 12.4 Regression validation

- [ ] Confirm the modal dismissal behavior still works (`cline-kanban-launch-modal-v1`)
- [ ] Confirm the update-announcement sequencing in `App.tsx` still behaves correctly after the modal closes
- [ ] Confirm no stale UI still relies on `installClineCli` for the Kanban CTA

---

## 13. Debugging Guide

### Problem: Clicking the CTA does nothing

Likely causes:

- the modal handler is still calling the clipboard path,
- `TaskServiceClient.newTask(...)` is not imported or wired correctly,
- or the request fails before task creation completes.

What to inspect:

- [ ] `ClineKanbanLaunchModal.tsx`
- [ ] console errors in the webview
- [ ] whether the modal closes or remains open

### Problem: A task is created, but it does not propose the install command

Likely cause:

- the prompt is too weak or ambiguous.

What to inspect:

- [ ] the exact prompt string passed into `newTask`
- [ ] the first visible task messages
- [ ] whether the model broadens scope beyond the single install command

### Problem: The command runs automatically when it should not

Likely cause:

- the user’s auto-approve settings allow the command,
- or someone accidentally added a programmatic approval path.

What to inspect:

- [ ] current auto-approval settings
- [ ] whether any code sends `yesButtonClicked` automatically for this flow

### Problem: The user still sees old “direct install” assumptions

Likely cause:

- stale comments,
- stale button text,
- or a hidden path still calling `installClineCli`.

What to inspect:

- [ ] search for `installClineCli`
- [ ] search for `Run in terminal`
- [ ] search for `executeCommandInTerminal`

---

## 14. File Touch List

This is the compact working list for implementation.

### Primary implementation files

- `webview-ui/src/components/common/ClineKanbanLaunchModal.tsx`
- `webview-ui/src/App.tsx`

### Shared task creation plumbing to understand, but probably not modify

- `webview-ui/src/services/grpc-client.ts`
- `src/core/controller/task/newTask.ts`
- `src/core/controller/index.ts`
- `src/core/task/index.ts`

### Deprecated legacy install-launch files to verify but not restore

- `src/core/controller/state/installClineCli.ts`
- `src/hosts/vscode/hostbridge/workspace/executeCommandInTerminal.ts`

### Reference examples for starting tasks from the UI

- `webview-ui/src/components/welcome/SuggestedTasks.tsx`
- `webview-ui/src/components/worktrees/WorktreesView.tsx`

---

## 15. Acceptance Criteria

This work is complete when all of the following are true:

- The Kanban modal CTA starts a normal new task instead of copying the command or calling the deprecated install RPC.
- The new task is seeded with a tightly scoped install prompt.
- The same CTA behavior works in both VS Code and JetBrains.
- The command execution still flows through the normal task system.
- User approval behavior is unchanged and still governed by auto-approve settings.
- No programmatic approval bypass exists for this flow.
- Deprecated direct install-launch paths remain deprecated and unused.
- The resulting UX is validated in both supported IDE paths.

---

## 16. Final Guidance for the Development Team

The most important thing to remember is this:

**The Kanban install CTA is no longer a special terminal launcher. It is a convenient entry point into a normal Cline task.**

That means developers should optimize for:

- reuse,
- consistency,
- and preserving the product’s existing approval model.

Do not solve this by restoring old integrated-terminal code.
Do not solve this by injecting hidden approval.

Solve it by making the Kanban CTA create a normal task with a good prompt and then letting Cline behave the way it already knows how to behave.

If the implementation preserves that truth clearly across the webview, controller, task system, and validation story, then the work is successful.
