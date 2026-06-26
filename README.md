# Leonardo Extension Automation Starter

Local Chrome Extension starter for assisting prompt submission on Leonardo.ai.

The goal is to replace Playwright with a Chrome Extension running inside the user's normal Chrome session. The extension reads a plain text prompt file, sends each prompt to the Leonardo.ai page through a content script, waits until generation is completed, applies a post-generation pause, and proceeds to the next prompt.

## Important

This project must not bypass authentication, CAPTCHA, payment restrictions, rate limits, anti-bot controls, or Leonardo.ai platform protections.

The extension must stop and require manual intervention if Leonardo.ai displays:

- login challenge
- CAPTCHA
- insufficient credits
- disabled generation button
- suspicious activity warning
- unexpected modal
- UI state that cannot be safely understood

The extension should behave as a local productivity assistant controlled by the user.

## Architecture

```txt
Chrome normal session
↓
Chrome Extension Manifest V3
↓
Side Panel UI
↓
Prompt file loaded locally
↓
Content Script on Leonardo.ai
↓
DOM adapter fills prompt and clicks Generate
↓
Runner waits generation completion
↓
Post-generation delay
↓
Next prompt
```

## Project structure

```txt
leonardo-extension-automation-starter/
├── README.md
├── CLAUDE.md
├── BOOTSTRAP_PROMPT_FOR_CLAUDE.md
├── package.json
├── tsconfig.json
├── vite.config.ts
├── .gitignore
├── .env.example
├── public/
│   └── manifest.json
├── .claude/
│   └── skills/
│       └── leonardo-extension-builder/
│           └── SKILL.md
├── data/
│   └── prompts/
│       ├── sample-prompts.txt
│       └── negative.txt
├── docs/
│   ├── PROJECT_SPEC.md
│   ├── PROMPT_FILE_FORMAT.md
│   ├── SELECTORS.md
│   ├── MANUAL_TESTING.md
│   └── ROADMAP.md
└── src/
    ├── background/
    ├── content/
    ├── core/
    ├── messaging/
    ├── prompts/
    ├── sidepanel/
    └── utils/
```

## Install

```bash
npm install
```

## Build

```bash
npm run build
```

The extension output will be generated in:

```txt
dist/
```

## Load in Chrome

1. Open Chrome.
2. Go to `chrome://extensions/`.
3. Enable **Developer mode**.
4. Click **Load unpacked**.
5. Select the generated `dist/` folder.
6. Open Leonardo.ai manually and log in normally.
7. Open the extension side panel.

## Development mode

```bash
npm run dev
```

For extension testing, build mode is usually more predictable:

```bash
npm run build
```

Then reload the extension in `chrome://extensions/`.

## Prompt file format

Use one prompt per line:

```txt
# Lines starting with # are ignored
# Empty lines are ignored

ornate antique gold picture frame, horizontal landscape orientation, isolated frame, clean product cutout
ornate antique silver picture frame, horizontal landscape orientation, isolated frame, clean product cutout
ornate antique black and gold picture frame, horizontal landscape orientation, isolated frame, clean product cutout
```

## Expected V1 workflow

1. Generate prompts in ChatGPT.
2. Save them in a `.txt` file.
3. Open Leonardo.ai manually in Chrome.
4. Open the extension side panel.
5. Choose the prompt file.
6. Set post-generation delay.
7. Run **Dry run** first.
8. Start with 2 or 3 prompts.
9. Only scale after selectors are stable.

## Runtime behavior

The extension should process each prompt like this:

```txt
read next prompt
↓
fill prompt field
↓
click Generate
↓
wait generation started
↓
wait generation completed
↓
wait postGenerationDelayMs
↓
save progress
↓
next prompt
```

## What Claude should do

Use:

```txt
BOOTSTRAP_PROMPT_FOR_CLAUDE.md
```

Claude should implement and adjust the extension. Claude must not be part of the runtime prompt loop.

## First safe test

Use `data/prompts/sample-prompts.txt`, but reduce it to 2 prompts if needed.

Run manually. Do not run a 100-prompt batch until the selector adapter is stable.
