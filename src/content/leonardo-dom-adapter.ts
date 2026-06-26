import { delay } from '../utils/delay';
import type { LeonardoPageState } from './leonardo-page-state';

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
      hasInsufficientCreditsWarning: this.hasInsufficientCreditsWarning()
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

  assertSafeToRun(): void {
    const state = this.getPageState();

    if (!state.isLeonardoDomain) {
      throw new Error('Current page is not Leonardo.ai.');
    }

    if (state.hasCaptcha) {
      throw new Error('CAPTCHA detected. Stop and resolve manually.');
    }

    if (state.hasLoginChallenge) {
      throw new Error('Login challenge detected. Log in manually and try again.');
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
      return;
    }

    this.setElementValue(input, negativePrompt);
  }

  clickGenerate(): void {
    const button = this.findGenerateButton();

    if (!button) {
      throw new Error('Generate button not found.');
    }

    if (button.disabled) {
      throw new Error('Generate button is disabled.');
    }

    button.click();
  }

  async waitForGenerationStarted(timeoutMs: number): Promise<void> {
    await this.waitUntil(() => this.isGenerationRunning(), timeoutMs, 'Generation did not start in time.');
  }

  async waitForGenerationCompleted(timeoutMs: number): Promise<void> {
    await this.waitUntil(
      () => !this.isGenerationRunning() && this.isGenerationCompleted(),
      timeoutMs,
      'Generation did not complete in time.'
    );
  }

  findPromptInput(): HTMLTextAreaElement | HTMLInputElement | HTMLElement | null {
    // TODO: Inspect Leonardo.ai UI and replace with stable selectors.
    // Candidate selectors must be documented in docs/SELECTORS.md.
    return (
      document.querySelector('textarea[placeholder*="prompt" i]') ??
      document.querySelector('textarea') ??
      document.querySelector('[contenteditable="true"]')
    );
  }

  findNegativePromptInput(): HTMLTextAreaElement | HTMLInputElement | HTMLElement | null {
    // TODO: Update after manually inspecting Leonardo.ai.
    return document.querySelector('textarea[placeholder*="negative" i]');
  }

  findGenerateButton(): HTMLButtonElement | null {
    // TODO: Inspect Leonardo.ai UI and replace with stable selectors.
    const buttons = Array.from(document.querySelectorAll('button'));
    return buttons.find((button) => /generate/i.test(button.textContent ?? '')) ?? null;
  }

  isGenerationRunning(): boolean {
    // TODO: Replace with reliable Leonardo.ai running indicator.
    const bodyText = document.body.innerText.toLowerCase();
    return bodyText.includes('generating') || bodyText.includes('in progress') || bodyText.includes('queued');
  }

  isGenerationCompleted(): boolean {
    // TODO: Replace with reliable Leonardo.ai completion indicator.
    // For now, completion is inferred from generate button being enabled and no running indicator.
    const generateButton = this.findGenerateButton();
    return Boolean(generateButton && !generateButton.disabled && !this.isGenerationRunning());
  }

  hasBlockingModal(): boolean {
    // TODO: Make more precise after UI inspection.
    return Boolean(document.querySelector('[role="dialog"][aria-modal="true"]'));
  }

  hasCaptcha(): boolean {
    const text = document.body.innerText.toLowerCase();
    return text.includes('captcha') || text.includes('verify you are human');
  }

  hasLoginChallenge(): boolean {
    const text = document.body.innerText.toLowerCase();
    return text.includes('log in') || text.includes('sign in');
  }

  hasInsufficientCreditsWarning(): boolean {
    const text = document.body.innerText.toLowerCase();
    return text.includes('insufficient credits') || text.includes('not enough credits');
  }

  private setElementValue(element: HTMLTextAreaElement | HTMLInputElement | HTMLElement, value: string): void {
    if (element instanceof HTMLTextAreaElement || element instanceof HTMLInputElement) {
      element.focus();
      element.value = value;
      element.dispatchEvent(new Event('input', { bubbles: true }));
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
