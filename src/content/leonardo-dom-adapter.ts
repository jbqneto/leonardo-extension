import { delay } from '../utils/delay';
import type { LeonardoPageState } from './leonardo-page-state';

/**
 * Leonardo DOM Adapter
 *
 * All Leonardo.ai DOM interactions are isolated here.
 * Selectors verified by direct interaction on 2026-06-26.
 *
 * VERIFIED SELECTORS:
 *   Prompt input:          textarea[placeholder="Type a prompt..."]
 *   Negative prompt input: textarea[placeholder="Type a negative prompt"]
 *   Generate button:       button[type="submit"]  (contains text "Generate")
 *   Generation running:    Generate button becomes disabled + loading spinner appears
 *   Generation completed:  Generate button re-enabled + no spinner
 *   Blocking modal:        [role="dialog"][aria-modal="true"]
 *   CAPTCHA:               text "verify you are human" in body
 *   Login challenge:       URL includes /auth/ or login form visible
 */
export class LeonardoDomAdapter {
    getPageState(): LeonardoPageState {
          const generateButton = this.findGenerateButton();

      return {
              url: window.location.href,
              isLeonardoDomain: window.location.hostname.includes('leonardo.ai'),
              hasPromptInput: Boolean(this.findPromptInput()),
              hasGenerateButton: Boolean(generateButton),
              isGenerateButtonEnabled: Boolean(generateButton && !generateButton.disabled),
              hasBlockingModal: this.hasBlockingModal(),
              hasCaptcha: this.hasCaptcha(),
              hasLoginChallenge: this.hasLoginChallenge(),
              hasInsufficientCreditsWarning: this.hasInsufficientCreditsWarning(),
      };
    }

  async submitPrompt(params: {
        prompt: string;
        negativePrompt?: string;
        generationTimeoutMs: number;
  }): Promise<void> {
        this.assertSafeToRun();
        this.fillPrompt(params.prompt);

      if (params.negativePrompt) {
              this.fillNegativePromptIfAvailable(params.negativePrompt);
      }

      this.clickGenerate();
        await this.waitForGenerationStarted(30_000);
        await this.waitForGenerationCompleted(params.generationTimeoutMs);
  }

  private assertSafeToRun(): void {
        const state = this.getPageState();

      if (!state.isLeonardoDomain) {
              throw new Error('Not on Leonardo.ai domain.');
      }

      if (state.hasLoginChallenge) {
              throw new Error('Login challenge detected. Log in manually and try again.');
      }

      if (state.hasCaptcha) {
              throw new Error('CAPTCHA detected. Solve it manually and try again.');
      }

      if (state.hasInsufficientCreditsWarning) {
              throw new Error('Insufficient credits warning detected.');
      }

      if (state.hasBlockingModal) {
              throw new Error('Blocking modal detected. Close or resolve it manually.');
      }

      if (!state.hasPromptInput) {
              throw new Error('Prompt input not found. Update selectors in leonardo-dom-adapter.ts.');
      }

      if (!state.hasGenerateButton) {
              throw new Error('Generate button not found. Update selectors in leonardo-dom-adapter.ts.');
      }

      if (!state.isGenerateButtonEnabled) {
              throw new Error('Generate button is disabled.');
      }
  }

  fillPrompt(prompt: string): void {
        const input = this.findPromptInput();

      if (!input) {
              throw new Error('Prompt input not found.');
      }

      this.setElementValue(input, prompt);
  }

  fillNegativePromptIfAvailable(negativePrompt: string): void {
        const input = this.findNegativePromptInput();

      if (!input) {
              return; // negative prompt is optional
      }

      this.setElementValue(input, negativePrompt);
  }

  private clickGenerate(): void {
        const button = this.findGenerateButton();

      if (!button) {
              throw new Error('Generate button not found.');
      }

      if (button.disabled) {
              throw new Error('Generate button is disabled, cannot click.');
      }

      button.click();
  }

  async waitForGenerationStarted(timeoutMs: number): Promise<void> {
        await this.waitUntil(
                () => this.isGenerationRunning(),
                timeoutMs,
                'Generation did not start within timeout.'
              );
  }

  async waitForGenerationCompleted(timeoutMs: number): Promise<void> {
        // First wait for generation to start (button becomes disabled)
      await this.waitForGenerationStarted(15_000);

      // Then wait for generation to finish (button becomes enabled again)
      await this.waitUntil(
              () => this.isGenerationCompleted(),
              timeoutMs,
              'Generation did not complete within timeout.'
            );
  }

  // ── Selector methods ──────────────────────────────────────────────────────

  findPromptInput(): HTMLTextAreaElement | null {
        // Verified: Leonardo.ai uses a textarea with this exact placeholder
      return document.querySelector<HTMLTextAreaElement>(
              'textarea[placeholder="Type a prompt..."]'
            );
  }

  findNegativePromptInput(): HTMLTextAreaElement | HTMLInputElement | HTMLElement | null {
        // Verified: enabled via URL param negativePromptEnabled=true
      // Shows below the main prompt with this placeholder
      return document.querySelector<HTMLTextAreaElement>(
              'textarea[placeholder="Type a negative prompt"]'
            );
  }

  findGenerateButton(): HTMLButtonElement | null {
        // Verified: Leonardo.ai uses a submit button that contains text "Generate"
      // The button becomes disabled during generation (shows a loading spinner)
      return document.querySelector<HTMLButtonElement>('button[type="submit"]');
  }

  isGenerationRunning(): boolean {
        const generateButton = this.findGenerateButton();
        if (!generateButton) return false;

      // During generation the submit button is disabled and a spinner is visible
      const isButtonDisabled = generateButton.disabled;

      // Also check for loading spinner within or near the button
      const hasSpinner = Boolean(
              generateButton.querySelector('svg[class*="spin"], [class*="loading"], [class*="animate"]') ||
              document.querySelector('[class*="generating"], [class*="in-progress"]')
            );

      return isButtonDisabled || hasSpinner;
  }

  isGenerationCompleted(): boolean {
        const generateButton = this.findGenerateButton();
        if (!generateButton) return false;

      // Generation is complete when the button is enabled again and no spinner
      const isButtonEnabled = !generateButton.disabled;
        const hasNoSpinner = !Boolean(
                generateButton.querySelector('svg[class*="spin"], [class*="loading"], [class*="animate"]')
              );

      return isButtonEnabled && hasNoSpinner;
  }

  hasBlockingModal(): boolean {
        return Boolean(document.querySelector('[role="dialog"][aria-modal="true"]'));
  }

  hasCaptcha(): boolean {
        const text = document.body.innerText.toLowerCase();
        return text.includes('captcha') || text.includes('verify you are human');
  }

  hasLoginChallenge(): boolean {
        const url = window.location.href.toLowerCase();
        return (
                url.includes('/auth/') ||
                url.includes('/login') ||
                url.includes('/sign-in') ||
                Boolean(document.querySelector('input[type="password"]'))
              );
  }

  hasInsufficientCreditsWarning(): boolean {
        const text = document.body.innerText.toLowerCase();
        return (
                text.includes('insufficient credits') ||
                text.includes('out of credits') ||
                text.includes('upgrade your plan')
              );
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private setElementValue(
        element: HTMLTextAreaElement | HTMLInputElement | HTMLElement,
        value: string
      ): void {
        // For textarea and input elements use React-compatible value setter
      if (element instanceof HTMLTextAreaElement || element instanceof HTMLInputElement) {
              const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
                        element instanceof HTMLTextAreaElement
                          ? HTMLTextAreaElement.prototype
                          : HTMLInputElement.prototype,
                        'value'
                      )?.set;

          if (nativeInputValueSetter) {
                    nativeInputValueSetter.call(element, value);
                    element.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: value }));
                    element.dispatchEvent(new Event('change', { bubbles: true }));
                    return;
          }

          element.focus();
              element.value = value;
              element.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: value }));
              element.dispatchEvent(new Event('change', { bubbles: true }));
              return;
      }

      if (element.isContentEditable) {
              element.focus();
              element.textContent = value;
              element.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: value }));
              return;
      }

      throw new Error('Unsupported prompt input element.');
  }

  private async waitUntil(
        predicate: () => boolean,
        timeoutMs: number,
        timeoutMessage: string
      ): Promise<void> {
        const startedAt = Date.now();

      while (Date.now() - startedAt < timeoutMs) {
              if (this.hasCaptcha()) {
                        throw new Error('CAPTCHA detected while waiting.');
              }

          if (this.hasInsufficientCreditsWarning()) {
                    throw new Error('Insufficient credits detected while waiting.');
          }

          if (predicate()) {
                    return;
          }

          await delay(500);
      }

      throw new Error(timeoutMessage);
  }
}
