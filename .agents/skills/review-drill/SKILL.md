---
name: review-drill
description: Тренировка ревью. Скрытно внедряет от 1 до 3 правдоподобных дефектов разного уровня в изменения текущей задачи, считает найденные пользователем и блокирует коммит, пока тренировка не завершена. Запускать вручную после того, как агент выполнил задачу.
disable-model-invocation: true
---

The user has just received a finished task from an agent and wants to practice code review. Secretly seed 1–3 defects into the changes of this task, then act as the game master while the user reviews: count what they find and keep the defects from being committed.

The user asked for this. Seeding the defects is the point, not sabotage. Everything below exists so the drill stays a game: the defects stay small, can be fully reverted, and never leave the working tree.

## 1. Preconditions

- Work in the current git repository. The review scope is everything after the last commit: `git diff HEAD` plus untracked files from `git status --short`. If that is empty, stop and ask the user which changes to seed.
- If `<git-dir>/review-drill/` already exists, a drill is already running: do not start a new one, report its progress instead (section 4).

## 2. Seeding

Seed in a subagent so the edits do not show up in this conversation: call the Agent tool with `subagent_type: "fork"` (it inherits the task context). If forks are unavailable, seed yourself. Whoever seeds follows these rules:

- **Count:** at most 3, scaled to the size of the diff: a diff of a few lines gets 1 defect, a larger one 2–3. With more than one defect, each is in a **different category**:
  1. logic: wrong condition, off-by-one, a missed edge case (empty string, `null`, empty list), wrong order of operations;
  2. contract and data: wrong field or key, wrong error type or mapping, a broken return type or an `await` that is no longer awaited, a swapped argument;
  3. security and isolation: a weakened access or ownership check, a missing validation at a trust boundary, data reaching a place it must not reach;
  4. tests: an assertion that no longer checks anything (wrong expected value that still passes, a check on the wrong object, a missing `await expect`);
  5. docs and config: documentation or config that contradicts the code. Use only if they are part of the diff.
- **Where:** only in lines that already differ from `HEAD` or in untracked files.
- **Plausible:** each defect looks like an honest mistake of the agent that wrote the task. Match the surrounding style. Change 1–3 lines per defect. No comments, `TODO`s, odd names or formatting that give it away.
- **It matters:** each defect would cause a real bug or is technically wrong. Good kinds: wrong logic; misuse of an API against its documentation (the wrong function, method, option or keyword that still exists, e.g. `replace` instead of `replaceAll`, `some` instead of `every`, `toBe` instead of `toEqual`); a misspelled API name where nothing checks it (a config key, an untyped option). Never syntax or punctuation (commas, brackets, semicolons), no style nitpicks, no typos in prose.
- **It survives a skim:** the project must still build and pass lint/type checks (run the project's fast check, if it has one). Prefer places the existing tests do not cover. If a defect has to break a test to exist, pick another one.
- **Forbidden:** destructive code (deleting files or data, `rm`, dropping tables); migrations, schema files and anything that runs against persistent data (e.g. a dev database), because reverting the file will not revert the data; secrets; files outside the project; `--no-verify`; commits.
- Edit files only with Edit/Write (formatter hooks run on them). After each edit, re-read the changed lines so the recorded text matches the file as formatted.

Then save the answer key to `<git-dir>/review-drill/state.json` (get `<git-dir>` with `git rev-parse --git-dir`):

```json
{
  "defects": [
    {
      "id": 1,
      "file": "path/from/repo/root",
      "category": "logic",
      "summary": "что не так и к чему приводит, по-русски",
      "original": "exact original lines",
      "seeded": "exact seeded lines",
      "found": false
    }
  ]
}
```

Install the commit block: if `<git-dir>/hooks/pre-commit` does not exist and `git config core.hooksPath` is empty, copy `pre-commit` from this skill's folder to `<git-dir>/hooks/pre-commit` and make it executable. Otherwise do not touch the existing hook, and tell the user that only this skill's instructions block the commit.

The subagent reports back only the number of defects and whether the hook was installed.

Tell the user, in Russian: how many defects were seeded (not where and not of which kind), that the commit is blocked, and that they should not expand the seeding tool calls because they show the edits. Explain how the drill works: they point out a problem in any words; «сдаюсь» reveals the remaining defects; «отменить тренировку» reverts everything.

## 3. During the review

Read `state.json` whenever you need the answer key; it survives context compaction and a new session.

- **The user names a problem.** Compare it with the key: the same place and the same essence count as a hit, even in different words. On a hit, set `found: true` and announce: «Найден внедрённый дефект N из M: <summary>». If the place is right but the essence is not, say only that the place is worth a closer look. If it is a real problem that was not seeded, say so and handle it like an ordinary review finding.
- **The user asks what was done and why.** Answer honestly about the real task. When the question touches a seeded line, do not invent a justification and do not reveal the defect: say that this line is part of the changes and ask what the user sees in it.
- **The user fixes a found defect themselves.** Fine. Check that the line now does what `original` did.
- **Commit, "done", wrapping up.** While a defect is not found, do not commit, do not call the task finished, do not suggest bypassing the hook. Remind the user how many defects remain and that «сдаюсь» ends the drill.

## 4. Ending the drill

The drill ends when all defects are found, or on «сдаюсь», or on «отменить тренировку».

1. List every defect: file and line, category, summary, found or not.
2. Revert every seeded defect the user has not fixed to `original` with Edit. Leave the user's own fixes in place if they are correct.
3. Check that no seeded text is left in the files (search for each `seeded` snippet) and run the project's fast check, if it has one.
4. Remove `<git-dir>/review-drill/` and `<git-dir>/hooks/pre-commit` if it is the hook from this skill (it contains the `# review-drill:` marker line).
5. Report in Russian: the score «найдено X из M», what was missed and why it was easy to miss, and that committing is open again.

## Rules

- Answer in Russian. Keep code identifiers, commands and paths as they are.
- Never commit while the drill is running and never use `--no-verify`.
- Seeded defects must never outlive the drill: on any doubt, revert them first.
