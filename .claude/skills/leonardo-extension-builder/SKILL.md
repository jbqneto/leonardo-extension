---
description: Build, maintain, and debug the Leonardo.ai Chrome Extension automation using Manifest V3 and TypeScript.
allowed-tools: Read, Write, Edit, MultiEdit, Bash, Glob, Grep, LS
---

# Leonardo Extension Builder Skill

Use this skill when the user wants to build or maintain the Chrome Extension that assists with sequential prompt submission on Leonardo.ai.

## Goal

Create a local Manifest V3 Chrome Extension that runs inside the user's normal Chrome session and processes a local prompt file through the Leonardo.ai UI.

## Hard rules

Do not bypass CAPTCHA, login challenges, payment restrictions, credit restrictions, rate limits, disabled buttons, anti-bot controls, or platform protections.

Do not automate login.

Do not store credentials.

Do not use Playwright or Puppeteer.

Do not make Claude manually loop through prompts. The extension must do the runtime loop by itself.

## Expected stack

- TypeScript
- Vite
- Manifest V3
- Side Panel
- Content Script
- Service Worker
- `chrome.storage.local`
- `chrome.tabs.sendMessage`

No React in V1.

## Required files

Ensure these exist and are coherent:

- `README.md`
- `CLAUDE.md`
- `BOOTSTRAP_PROMPT_FOR_CLAUDE.md`
- `package.json`
- `tsconfig.json`
- `vite.config.ts`
- `public/manifest.json`
- `docs/PROJECT_SPEC.md`
- `docs/PROMPT_FILE_FORMAT.md`
- `docs/SELECTORS.md`
- `docs/MANUAL_TESTING.md`
- `docs/ROADMAP.md`
- `data/prompts/sample-prompts.txt`
- `data/prompts/negative.txt`
- `src/background/service-worker.ts`
- `src/content/leonardo-content-script.ts`
- `src/content/leonardo-dom-adapter.ts`
- `src/content/leonardo-page-state.ts`
- `src/sidepanel/index.html`
- `src/sidepanel/main.ts`
- `src/sidepanel/sidepanel.css`
- `src/core/prompt-runner.ts`
- `src/core/prompt-queue.ts`
- `src/core/run-state.ts`
- `src/core/generation-status.ts`
- `src/prompts/prompt-file-parser.ts`
- `src/messaging/extension-messages.ts`
- `src/messaging/message-client.ts`
- `src/utils/delay.ts`
- `src/utils/logger.ts`

## Implementation behavior

The runtime flow must be:

1. User opens Leonardo.ai manually.
2. User opens the extension side panel.
3. User selects a `.txt` prompt file.
4. Extension parses prompts.
5. User starts the run.
6. Extension sends prompt to content script.
7. Content script fills prompt and clicks Generate.
8. Content script waits for generation to start.
9. Content script waits for generation to complete.
10. Extension waits post-generation delay.
11. Extension saves progress.
12. Extension processes next prompt.

## Prompt file rules

- One prompt per line
- Empty lines are ignored
- Lines starting with `#` are ignored
- Whitespace must be trimmed
- Duplicate detection is optional for V1

## Safety stops

Stop if:

- Leonardo.ai tab is not found
- user is not on Leonardo.ai
- content script is unavailable
- prompt field is not found
- Generate button is not found
- Generate button is disabled
- CAPTCHA is detected
- login page/challenge is detected
- insufficient credits warning is detected
- blocking modal is detected
- generation does not complete before timeout

## First implementation priority

1. Build succeeds.
2. Side panel loads.
3. Prompt parser works.
4. Dry run works.
5. Messaging works.
6. Content script diagnostics work.
7. DOM adapter is isolated.
8. Real prompt submission is implemented with documented selectors.
9. Stop/pause/resume is implemented.

## Final response format

After making changes, report:

- files changed
- commands to run
- how to load the extension
- current limitations
- selectors requiring manual validation
- next test
