# CLAUDE.md

You are working on a local Chrome Extension project for assisting image prompt submission on Leonardo.ai.

## Main objective

Build a Manifest V3 Chrome Extension that reads prompts from a local `.txt` file and sequentially submits them to Leonardo.ai through a content script running inside the user's normal Chrome session.

Claude must only build, fix, and improve the extension. Claude must not manually execute the prompt loop.

## Technology choices

- Language: TypeScript
- Build tool: Vite
- Extension format: Chrome Extension Manifest V3
- UI: plain HTML + CSS + TypeScript
- No React for V1
- No Zustand
- No backend
- No Playwright
- Storage: `chrome.storage.local`
- Runtime messaging: `chrome.runtime.sendMessage`, `chrome.tabs.sendMessage`

## Coding rules

- All code, filenames, variables, classes, methods, comments, and commit messages must be in English.
- Keep modules small and focused.
- Keep domain automation isolated in `src/content/leonardo-dom-adapter.ts`.
- Do not hardcode credentials.
- Do not store prompts in external services.
- Do not bypass CAPTCHA, login challenges, payment restrictions, anti-bot controls, disabled buttons, or platform limits.
- Stop safely when the page is uncertain.
- Prefer explicit types for public APIs.
- Avoid brittle selectors when user-facing selectors are available.
- Document all known selectors in `docs/SELECTORS.md`.

## Runtime rules

The extension must only run when the user is already logged in manually and Leonardo.ai is open in a normal Chrome tab.

The content script may interact with the page DOM, but must stop if:

- login is required
- CAPTCHA is visible
- generation button is disabled
- insufficient credits are detected
- unexpected modal blocks the UI
- selectors are missing
- the page state cannot be safely classified

## V1 scope

Implement:

- Manifest V3 extension setup
- Side panel UI
- Local prompt file loading
- Prompt parser: one prompt per line
- Ignore empty lines
- Ignore lines starting with `#`
- Queue preview
- Dry run
- Start / pause / resume / stop
- Post-generation delay after generation completion
- Progress persistence in `chrome.storage.local`
- Content script messaging
- Leonardo DOM adapter with documented selectors
- Safe stop behavior

Do not implement yet:

- image download
- automatic upscale
- multi-site support
- cloud sync
- payments
- account automation
- CAPTCHA handling
- login automation

## Recommended architecture

```txt
src/background/service-worker.ts
src/content/leonardo-content-script.ts
src/content/leonardo-dom-adapter.ts
src/content/leonardo-page-state.ts
src/sidepanel/main.ts
src/core/prompt-runner.ts
src/core/prompt-queue.ts
src/core/run-state.ts
src/prompts/prompt-file-parser.ts
src/messaging/extension-messages.ts
src/utils/delay.ts
src/utils/logger.ts
```

## Definition of done for the first implementation

The first implementation is done when:

1. `npm install` succeeds.
2. `npm run build` succeeds.
3. Chrome can load the generated `dist/` folder as an unpacked extension.
4. The side panel opens.
5. The user can select a `.txt` prompt file.
6. Dry run shows the number of valid prompts and first prompt previews.
7. The extension can send a test message to the Leonardo.ai content script.
8. The content script can report whether it detects the required page elements.
9. Real execution is guarded behind explicit user start.
10. Missing selectors produce a clear error and update `docs/SELECTORS.md`.

## Implementation priority

1. Buildable extension skeleton.
2. Prompt parser.
3. Side panel UI.
4. Storage and run state.
5. Messaging.
6. DOM adapter detection methods.
7. Submit prompt flow.
8. Generation completion wait.
9. Pause/resume.
10. Better selector documentation.
