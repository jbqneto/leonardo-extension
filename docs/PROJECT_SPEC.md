# Project Spec

## Problem

Browser automation with Playwright was detected by Leonardo.ai and the user could not proceed. The new approach is a local Chrome Extension that operates within the user's normal Chrome session.

## Objective

Build a Chrome Extension that assists the user in submitting many image prompts to Leonardo.ai with minimal manual repetition.

## Non-goals

The extension must not:

- bypass CAPTCHA
- automate login
- bypass credit limits
- bypass paid limits
- hide automation from platform protections
- scrape private platform data
- download or upscale images in V1

## User workflow

1. User generates prompts externally.
2. User saves prompts in a `.txt` file.
3. User opens Leonardo.ai and logs in manually.
4. User opens the extension side panel.
5. User selects the prompt file.
6. User reviews dry-run preview.
7. User starts execution.
8. Extension processes prompts sequentially.

## Core runtime sequence

```txt
load prompts
validate current Leonardo.ai tab
for each pending prompt:
  fill prompt
  click generate
  wait generation started
  wait generation completed
  wait post-generation delay
  save progress
```

## V1 requirements

- Manifest V3
- Side panel
- Prompt file upload
- Dry run
- Queue preview
- Start / pause / resume / stop
- Progress persistence
- Content script diagnostics
- Isolated Leonardo DOM adapter
- Safe stop behavior

## V2 candidates

- download generated images
- upscale flow
- batch reports
- prompt quality scoring
- multiple collections
- export results as JSON/CSV
- thumbnail preview of generated assets
