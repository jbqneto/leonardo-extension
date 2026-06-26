# Manual Testing

## Build

```bash
npm install
npm run build
```

## Load extension

1. Open `chrome://extensions/`.
2. Enable Developer Mode.
3. Click Load unpacked.
4. Select `dist/`.

## Test 1: Side panel opens

1. Click the extension icon.
2. Side panel should open.
3. UI should show file picker, dry run, start, pause, resume, stop.

## Test 2: Prompt parsing

1. Select `data/prompts/sample-prompts.txt`.
2. Click Dry run.
3. The UI should show valid prompt count and preview.

## Test 3: Leonardo tab detection

1. Open Leonardo.ai manually.
2. Log in normally.
3. Click Diagnostics in the extension.
4. The content script should report page state.

## Test 4: Single prompt real run

1. Create a file with only 1 prompt.
2. Select it.
3. Start run.
4. Confirm the prompt is filled.
5. Confirm Generate is clicked only when safe.
6. Confirm the extension waits for completion.
7. Confirm post-generation delay happens after completion.

## Stop immediately if

- CAPTCHA appears
- credits warning appears
- UI looks wrong
- prompt is inserted into wrong field
- Generate click triggers unexpected flow
