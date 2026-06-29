import type { LeonardoPageState } from './leonardo-page-state';

/**
 * Leonardo DOM Adapter
 *
 * All Leonardo.ai DOM interactions are isolated here.
 * Selectors verified by direct interaction on 2026-06-26.
 *
 * VERIFIED SELECTORS:
 *   Prompt input:         textarea[placeholder="Type a prompt..."]
 *   Negative prompt:      textarea[placeholder="Type a negative prompt"]
 *   Generate button:      button[type="submit"] (contains text "Generate")
 *   Generation running:   Generate button becomes disabled + loading spinner appears
 *   Generation completed: Generate button re-enabled + no spinner
 *   Blocking modal:       [role="dialog"][aria-modal="true"]
 *   CAPTCHA:              text "verify you are human" in body
 *   Login challenge:      URL includes /auth/ or login form visible
 *
 *   Aspect ratio sidebar buttons: button[role="radio"][value="2:3|1:1|16:9"]
 *   Custom button (opens dialog): button#CUSTOM
 *   Dialog preset buttons:        button containing "Instagram", "Twitter", "TikTok", etc.
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
    aspectRatio?: string;
  }): Promise<void> {
    this.assertSafeToRun();
    this.fillPrompt(params.prompt);

    if (params.negativePrompt) {
      this.fillNegativePromptIfAvailable(params.negativePrompt);
    }

    // Set aspect ratio BEFORE clicking Generate
    if (params.aspectRatio) {
      await this.setAspectRatio(params.aspectRatio);
    }

    await this.waitForGenerateButtonEnabled(10_000);
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

    if (!state.hasPromptInput) {
      throw new Error('Prompt input not found. Update selectors in leonardo-dom-adapter.');
    }

    if (!state.hasGenerateButton) {
      throw new Error('Generate button not found. Update selectors in leonardo-dom-adapter.');
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

  // --- Aspect Ratio -----------------------------------------------------------

  /**
   * Sets aspect ratio by clicking the appropriate button in Leonardo's UI.
   *
   * Direct sidebar buttons (no dialog): "2:3", "1:1", "16:9"
   * Via Custom dialog:                  "4:5" (Instagram), "9:16" (TikTok), "4:3" (Twitter/X)
   */
  async setAspectRatio(aspectRatio: string): Promise<void> {
    const ar = aspectRatio.trim();

    // Try direct sidebar radio buttons first
    const directBtn = document.querySelector<HTMLButtonElement>(
      `button[role="radio"][value="${ar}"]`
    );
    if (directBtn && !directBtn.disabled) {
      directBtn.click();
      await this.delay(600);
      return;
    }

    // Map aspect ratio to partial dialog button label
    const dialogLabelMap: Record<string, string> = {
      '4:5':  'Instagram',
      '9:16': 'TikTok',
      '4:3':  'Twitter',
      '16:9': 'Desktop',
      '1:1':  'Square',
    };

    const labelFragment = dialogLabelMap[ar];
    if (!labelFragment) {
      console.warn(`[Leonardo Ext] Aspect ratio "${ar}" not recognized. Keeping current.`);
      return;
    }

    // Open the Custom dialog
    const customBtn = document.querySelector<HTMLButtonElement>('button#CUSTOM');
    if (!customBtn) {
      console.warn('[Leonardo Ext] Custom button not found.');
      return;
    }
    customBtn.click();

    // Wait for dialog to open
    await this.waitUntil(
      () => Boolean(document.querySelector('[role="dialog"][aria-modal="true"]')),
      5_000,
      'Image Dimensions dialog did not open.'
    );

    // Find and click the matching button inside dialog
    const dialogBtns = document.querySelectorAll<HTMLButtonElement>('[role="dialog"] button');
    let clicked = false;
    dialogBtns.forEach(btn => {
      if (!clicked && btn.textContent?.includes(labelFragment)) {
        btn.click();
        clicked = true;
      }
    });

    if (!clicked) {
      // Close dialog and warn
      const closeBtn = document.querySelector<HTMLButtonElement>(
        '[role="dialog"] button[aria-label="Close"], [role="dialog"] button[data-testid="close"]'
      );
      closeBtn?.click();
      console.warn(`[Leonardo Ext] Button containing "${labelFragment}" not found in dialog.`);
      return;
    }

    // Wait for dialog to close
    await this.waitUntil(
      () => !document.querySelector('[role="dialog"][aria-modal="true"]'),
      5_000,
      'Dialog did not close after selecting aspect ratio.'
    );

    await this.delay(500);
  }

  // --- Generation state -------------------------------------------------------

  async waitForGenerationStarted(timeoutMs: number): Promise<void> {
    await this.waitUntil(
      () => this.isGenerationRunning(),
      timeoutMs,
      'Generation did not start within timeout.'
    );
  }

  /**
   * Waits for the current generation to complete.
   * Adds a short initial delay to allow spinner to appear before polling.
   * Caller must have already called waitForGenerationStarted before this.
   */
  async waitForGenerationCompleted(timeoutMs: number): Promise<void> {
    // Brief pause to ensure spinner is visible before we start polling
    await this.delay(1_500);

    await this.waitUntil(
      () => this.isGenerationCompleted(),
      timeoutMs,
      'Generation did not complete within timeout.'
    );
  }

  // --- Selector methods -------------------------------------------------------

  findPromptInput(): HTMLTextAreaElement | null {
    return (
      document.querySelector<HTMLTextAreaElement>('textarea#prompt-textarea') ??
      document.querySelector<HTMLTextAreaElement>('[data-testid="prompt-container"] textarea') ??
      document.querySelector<HTMLTextAreaElement>('textarea[name="prompt"]') ??
      document.querySelector<HTMLTextAreaElement>('textarea[placeholder="Type a prompt..."]')
    );
  }

  findNegativePromptInput(): HTMLTextAreaElement | HTMLInputElement | HTMLElement | null {
    // Verified: enabled via URL param negativePromptEnabled=true
    return document.querySelector<HTMLTextAreaElement>(
      'textarea[placeholder="Type a negative prompt"]'
    );
  }

  findGenerateButton(): HTMLButtonElement | null {
    return (
      document.querySelector<HTMLButtonElement>('button[data-tour-id="gen-tour-generate-btn"]') ??
      document.querySelector<HTMLButtonElement>('button[aria-label="Generate"]') ??
      this.findButtonByText('Generate') ??
      document.querySelector<HTMLButtonElement>('button[type="submit"]')
    );
  }

  isGenerationRunning(): boolean {
    const generateButton = this.findGenerateButton();
    if (!generateButton) return false;

    // During generation the submit button is disabled and a spinner is visible
    const isButtonDisabled = generateButton.disabled;

    // Also check for loading spinner within or near the button
    const hasSpinner = Boolean(
      generateButton.querySelector('svg[class*="spin"], [class*="loading"], [class*="animate-spin"]') ||
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
      generateButton.querySelector('svg[class*="spin"], [class*="loading"], [class*="animate-spin"]') ||
      document.querySelector('[class*="generating"], [class*="in-progress"]')
    );

    return isButtonEnabled && hasNoSpinner;
  }

  async waitForGenerateButtonEnabled(timeoutMs: number): Promise<void> {
    await this.waitUntil(
      () => {
        const btn = this.findGenerateButton();
        return Boolean(btn && !btn.disabled);
      },
      timeoutMs,
      'Generate button did not become enabled within timeout.'
    );
  }

  hasBlockingModal(): boolean {
    return Boolean(document.querySelector('[role="dialog"][aria-modal="true"]'));
  }

  hasCaptcha(): boolean {
    return document.body?.textContent?.toLowerCase().includes('verify you are human') ?? false;
  }

  hasLoginChallenge(): boolean {
    return (
      window.location.pathname.includes('/auth/') ||
      Boolean(document.querySelector('input[type="password"]'))
    );
  }

  hasInsufficientCreditsWarning(): boolean {
    return (
      document.body?.textContent?.toLowerCase().includes('insufficient credits') ?? false
    );
  }

  // --- Utilities -------------------------------------------------------------

  private findButtonByText(text: string): HTMLButtonElement | null {
    const buttons = document.querySelectorAll<HTMLButtonElement>('button');
    for (const btn of buttons) {
      if (btn.textContent?.trim() === text) return btn;
    }
    return null;
  }

  private setElementValue(
    input: HTMLTextAreaElement | HTMLInputElement | HTMLElement,
    value: string
  ): void {
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype,
      'value'
    )?.set;

    if (nativeInputValueSetter) {
      nativeInputValueSetter.call(input, value);
    } else {
      (input as HTMLInputElement).value = value;
    }

    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }

  private async waitUntil(
    condition: () => boolean,
    timeoutMs: number,
    errorMessage: string
  ): Promise<void> {
    const pollInterval = 500;
    const startTime = Date.now();

    while (!condition()) {
      if (Date.now() - startTime > timeoutMs) {
        throw new Error(errorMessage);
      }
      await this.delay(pollInterval);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
