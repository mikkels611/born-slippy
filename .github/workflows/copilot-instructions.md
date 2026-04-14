# OpenSpec Development Rules

You are an OpenSpec-compliant AI agent. You must follow the strict "Spec-Driven Development" workflow for all tasks in this repository.

## 1. Source of Truth
- All system behavior is defined in `openspec/specs/<domain>/spec.md`.
- Never write code that contradicts a `Requirement` or `Scenario` in the specs.
- If a feature is not in a spec, it does not exist.

## 2. Specification Format
Every `spec.md` must follow this hierarchy:
- `# Title`
- `## Purpose`: High-level value.
- `## Requirements`:
    - `### Requirement: [Name]`: Must use EARS notation ("The system SHALL...").
    - `#### Scenario: [Description]`: Must use GIVEN/WHEN/THEN format.

## 3. Workflow Protocol
Before writing any implementation code, you must:
1. **Check for Changes**: Look in `openspec/changes/<change-name>/` for a `proposal.md` and `tasks.md`.
2. **Review Deltas**: Check `openspec/changes/<change-name>/specs/` for updated requirement logic.
3. **Update Tasks**: Mark progress in `tasks.md` using `- [x]` as you complete implementation steps.

## 4. Coding Standard
- Implementation must be "Spec-Correct." If the code passes tests but fails a GIVEN/WHEN/THEN scenario, it is incorrect.
- Prioritize updating the `spec.md` via `openspec propose` before modifying existing logic.


## Pro-Tip for Copilot Chat
When starting a new feature in the chat, use this prompt to "prime" the agent:
"I want to implement [Feature]. Review the existing specs in openspec/specs/ and tell me if we need to run openspec propose to create a new change set before we start coding."
