# Bootstrap prompt for Claude Code

Use the local skill:

```txt
/leonardo-extension-builder
```

The previous Playwright strategy failed because Leonardo.ai detected the automated browser. We are changing the project completely to a Chrome Extension approach.

Build a local Manifest V3 Chrome Extension that works inside the user's normal Chrome session.

## Main goal

Create a Chrome Extension that:

1. Runs only on Leonardo.ai domains.
2. Opens a side panel UI.
3. Lets the user select a local `.txt` prompt file.
4. Reads one prompt per line.
5. Ignores empty lines.
6. Ignores lines starting with `#`.
7. Sends prompts one by one to the Leonardo.ai page through a content script.
8. Waits for generation to complete.
9. Waits `postGenerationDelayMs` after generation completion.
10. Saves progress locally.
11. Supports pause, resume, and stop.
12. Stops safely when Leonardo.ai shows login challenge, CAPTCHA, insufficient credits, disabled button, unexpected modal, or unknown UI state.

## Critical runtime rule

Claude must not manually process prompts one by one.

Claude only builds, fixes, and improves the extension.

The extension runtime must be deterministic and must perform the prompt loop by itself.

## Technology

Use:

- TypeScript
- Vite
- Chrome Extension Manifest V3
- plain HTML/CSS/TypeScript side panel
- `chrome.storage.local`
- `chrome.tabs.sendMessage`
- `chrome.runtime.sendMessage`

Do not use:

- Playwright
- Puppeteer
- React
- Zustand
- backend server

## Implementation order

1. Inspect the project structure.
2. Make sure `npm install` and `npm run build` work.
3. Implement prompt parser.
4. Implement side panel file picker and dry-run preview.
5. Implement run state persistence.
6. Implement content script messaging.
7. Implement Leonardo DOM adapter with placeholder selectors if needed.
8. Implement element detection and diagnostics.
9. Implement prompt submission flow.
10. Implement wait-for-generation-started and wait-for-generation-completed.
11. Implement post-generation delay after completion.
12. Implement pause/resume/stop.
13. Document selectors in `docs/SELECTORS.md`.

## Safety constraints

Do not bypass CAPTCHA, login challenges, payment restrictions, credit limits, disabled buttons, rate limits, anti-bot systems, or platform protections.

If something blocks the UI, stop and show a clear error.

## First test scenario

Use `data/prompts/sample-prompts.txt`.

First test only dry run.

Then test with 1 or 2 prompts.

Do not run 100 prompts until the user confirms selectors are stable.

## Required final response

After implementing, tell me:

- which files were created or changed
- how to install dependencies
- how to build the extension
- how to load it in Chrome
- how to run dry-run
- how to run the first real test
- which selectors still need manual verification
