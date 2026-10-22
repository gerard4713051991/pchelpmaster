#!/usr/bin/env bash
# Usage: lint-format-file.sh <file>
# Run by the Claude Code PostToolUse hook after every Edit/Write (see .claude/settings.json).
# ESLint --fix runs on .ts/.html only, then Prettier on anything it supports.
# Exit 2 + stderr when ESLint still has errors after the autofix, so Claude sees and fixes them.
f=$1
cd "$(dirname "$0")/../.." || exit 0

rc=0
case "$f" in
*.ts | *.html)
    out=$(node_modules/.bin/eslint --fix --no-warn-ignored "$f" 2>&1) || rc=2
    ;;
esac

node_modules/.bin/prettier --write --ignore-unknown "$f" >/dev/null 2>&1

if [ "$rc" -ne 0 ]; then
    echo "$out" >&2
    exit 2
fi
