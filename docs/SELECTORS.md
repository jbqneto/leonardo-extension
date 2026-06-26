# Leonardo.ai Selectors

This file must be updated while testing manually in Chrome.

The extension must keep all Leonardo.ai DOM logic isolated in:

```txt
src/content/leonardo-dom-adapter.ts
```

## Required elements

| Element | Status | Notes |
|---|---:|---|
| Prompt input | TODO | Prefer `textarea` or editable textbox with accessible label. |
| Negative prompt input | TODO | Optional for V1. |
| Generate button | TODO | Must detect disabled state. |
| Generation running indicator | TODO | Needed to wait generation started. |
| Generation completed indicator | TODO | Needed to wait generation completed. |
| Login challenge | TODO | Must stop. |
| CAPTCHA | TODO | Must stop. |
| Insufficient credits warning | TODO | Must stop. |
| Blocking modal | TODO | Must stop. |

## Selector principles

Prefer stable user-facing selectors:

1. accessible role/name
2. visible label text
3. stable `data-*` attributes, if available
4. DOM proximity to known labels
5. CSS selector only as last resort

## Safety rule

If a selector is uncertain, the extension must stop instead of clicking random UI elements.
