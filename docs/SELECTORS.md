# Leonardo.ai Selectors

Verified by direct browser interaction on 2026-06-26.
All selectors are isolated in `src/content/leonardo-dom-adapter.ts`.

## Required elements

| Element | Status | Selector | Notes |
|---|---|---|---|
| Prompt input | VERIFIED | `textarea[placeholder="Type a prompt..."]` | Main prompt textarea. Always present on /generate page. |
| Negative prompt input | VERIFIED | `textarea[placeholder="Type a negative prompt"]` | Optional. Only appears when `negativePromptEnabled=true` in URL or toggled via UI. |
| Generate button | VERIFIED | `button[type="submit"]` | Contains text "Generate". Becomes disabled during generation. |
| Generation running indicator | VERIFIED | Generate button `disabled` attribute is set | Button is disabled + loading spinner appears inside/near button area. |
| Generation completed indicator | VERIFIED | Generate button `disabled` removed | Button re-enabled and loading spinner disappears. Image appears below. |
| Login challenge | INFERRED | URL contains `/auth/`, `/login`, `/sign-in` OR `input[type="password"]` visible | Extension must stop if detected. |
| CAPTCHA | INFERRED | Body text contains 'captcha' or 'verify you are human' | Extension must stop if detected. |
| Insufficient credits warning | INFERRED | Body text contains 'insufficient credits', 'out of credits', or 'upgrade your plan' | Extension must stop if detected. |
| Blocking modal | INFERRED | `[role="dialog"][aria-modal="true"]` | Extension must stop if detected. |

## Selector principles

Prefer stable user-facing selectors:

1. accessible role/name
2. 2. visible label text
   3. 3. stable `data-*` attributes, if available
      4. 4. DOM proximity to known labels
         5. 5. CSS selector only as last resort
           
            6. ## Notes from manual testing
           
            7. ### Prompt Input
           
            8. Leonardo.ai uses a standard `<textarea>` with the placeholder `"Type a prompt..."`. React-compatible value setting is required: use the native setter via `Object.getOwnPropertyDescriptor` and dispatch an `InputEvent` with `bubbles: true`.
           
            9. ### Negative Prompt Input
           
            10. The negative prompt area only appears when enabled. To enable via URL, add `negativePromptEnabled=true` to the URL query string. The textarea has the placeholder `"Type a negative prompt"`.
           
            11. ### Generate Button
           
            12. The Generate button is a `<button type="submit">` element. During generation it becomes disabled and a loading spinner appears. When generation is complete the button becomes enabled again.
           
            13. ### Generation Timing
           
            14. From manual testing:
            15. - Generation typically starts within 2-5 seconds of clicking Generate
                - - Generation typically completes within 15-60 seconds depending on complexity
                  - - Recommended post-generation wait: 60-90 seconds between prompts to avoid rate limiting
                   
                    - ### Aspect Ratio Settings
                   
                    - Leonardo.ai uses URL parameters for settings. For consistent generation:
                    - - `aspectRatio=2:3` for portrait 2:3 ratio (832x1248px)
                      - - `negativePromptEnabled=true` to show negative prompt field
                        - - `mode=quality` for higher quality output
                          - - `quantity=1` for single image generation
                           
                            - Full URL template:
                            - ```
                              https://app.leonardo.ai/generate?model=auto-preset&aspectRatio=2:3&mode=quality&quantity=1&negativePromptEnabled=true
                              ```

                              ## Safety rule

                              If a selector is uncertain, the extension must stop instead of clicking random UI elements.
