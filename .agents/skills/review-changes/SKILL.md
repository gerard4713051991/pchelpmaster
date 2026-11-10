---
name: review-changes
description: Ручное ревью всех изменений после последнего коммита (безопасность, качество кода, сохранение паттернов, общие принципы построения приложения). Запускать вручную в новой сессии.
disable-model-invocation: true
model: opus
effort: high
---

Review all the changes made after the last commit for security, code quality, preservation of existing patterns, and general principles of application construction.

## Scope

- Take the diff of everything after the last commit: `git diff HEAD` plus untracked files from `git status --short` (read them in full).
- Read the surrounding code, callers, tests, and configs the changes touch. Do not judge a hunk in isolation.
- Read the project's CLAUDE.md and treat its rules as the baseline for "patterns" and "principles".

## Checklist

1. **Security:** missing validation at trust boundaries, auth and access rules (per-user isolation), injection/XSS, secrets in code or config, unsafe defaults, data loss on errors.
2. **Code quality:** bugs, unhandled edge cases, error handling, dead code created by these changes, needless complexity, missing tests for non-trivial logic.
3. **Pattern preservation:** does the new code match the naming, structure, idioms, and conventions of the surrounding code and the rules in CLAUDE.md? Flag any deviation or reinvented helper that already exists.
4. **General principles:** single responsibility, feature-based boundaries, no premature abstractions, no speculative code, no changes outside the scope of the task.
5. **Frontend / visual design (only if the changes touch the frontend or visuals):** invoke the skills `ui-ux-pro-max` and `frontend-design` (`frontend-design:frontend-design`) via the Skill tool and review the UI changes against them (layout, typography, color, responsiveness, accessibility, interaction). Verify the real rendering in the browser via the Playwright MCP (`mcp__playwright__*`: snapshot, screenshot, console messages, `browser_resize` for responsive sizes). Skip this item when there are no frontend/visual changes.

## Rules

- This is a review only: do NOT edit files, do NOT commit.
- Report only real, verified issues; no style nitpicks and no praise padding.
- Answer in Russian. Keep code identifiers, commands, and paths as is.

## Output

List findings by severity (critical / important / minor). For each: `file:line`, what is wrong, a concrete failure scenario, a suggested fix. If nothing is found, say so in one line and name what you checked.
