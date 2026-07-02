import type { LeonardoPageState } from './leonardo-page-state';

/**
 * Leonardo DOM Adapter
 *
 * All Leonardo.ai DOM interactions are isolated here.
 * Selectors verified by direct interaction on 2026-06-26.
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
    autoDownload?: boolean;
  }): Promise<void> {
    this.assertSafeToRun();
    this.fillPrompt(params.prompt);

    if (params.negativePrompt) {
      this.fillNegativePromptIfAvailable(params.negativePrompt);
    }

    if (params.aspectRatio) {
      await this.setAspectRatio(params.aspectRatio);
    }

    await this.waitForGenerateButtonEnabled(10_000);
    this.clickGenerate();
    await this.waitForGenerationStarted(30_000);
    await this.waitForGenerationCompleted(params.generationTimeoutMs);

    if (params.autoDownload) {
      await this.downloadLatestGeneration();
    }
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
      return;
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

  async setAspectRatio(aspectRatio: string): Promise<void> {
    const ar = aspectRatio.trim();

    const directBtn = document.querySelector<HTMLButtonElement>(
      `button[role="radio"][value="${ar}"]`
    );
    if (directBtn && !directBtn.disabled) {
      directBtn.click();
      await this.delay(600);
      return;
    }

    const dialogLabelMap: Record<string, string> = {
      '4:5': 'Instagram',
      '9:16': 'TikTok',
      '4:3': 'Twitter',
      '16:9': 'Desktop',
      '1:1': 'Square',
    };

    const labelFragment = dialogLabelMap[ar];
    if (!labelFragment) {
      console.warn(`[Leonardo Ext] Aspect ratio "${ar}" not recognized. Keeping current.`);
      return;
    }

    const customBtn = document.querySelector<HTMLButtonElement>('button#CUSTOM');
    if (!customBtn) {
      console.warn('[Leonardo Ext] Custom button not found.');
      return;
    }
    customBtn.click();

    await this.waitUntil(
      () => Boolean(document.querySelector('[role="dialog"][aria-modal="true"]')),
      5_000,
      'Image Dimensions dialog did not open.'
    );

    const dialogBtns = document.querySelectorAll<HTMLButtonElement>('[role="dialog"] button');
    let clicked = false;
    dialogBtns.forEach((btn) => {
      if (!clicked && btn.textContent?.includes(labelFragment)) {
        btn.click();
        clicked = true;
      }
    });

    if (!clicked) {
      const closeBtn = document.querySelector<HTMLButtonElement>(
        '[role="dialog"] button[aria-label="Close"], [role="dialog"] button[data-testid="close"]'
      );
      closeBtn?.click();
      console.warn(`[Leonardo Ext] Button containing "${labelFragment}" not found in dialog.`);
      return;
    }

    await this.waitUntil(
      () => !document.querySelector('[role="dialog"][aria-modal="true"]'),
      5_000,
      'Dialog did not close after selecting aspect ratio.'
    );

    await this.delay(500);
  }

  async waitForGenerationStarted(timeoutMs: number): Promise<void> {
    await this.waitUntil(
      () => this.isGenerationRunning(),
      timeoutMs,
      'Generation did not start within timeout.'
    );
  }

  async waitForGenerationCompleted(timeoutMs: number): Promise<void> {
    await this.delay(1_500);

    await this.waitUntil(
      () => this.isGenerationCompleted(),
      timeoutMs,
      'Generation did not complete within timeout.'
    );
  }

  async downloadLatestGeneration(): Promise<void> {
    const generationItem = await this.waitForLatestGenerationItem(30_000);

    this.scrollIntoViewIfNeeded(generationItem);
    await this.delay(500);

    if (this.clickDownloadActionWithin(generationItem)) {
      await this.delay(1_500);
      return;
    }

    this.hoverElement(generationItem);
    await this.delay(750);

    if (this.clickDownloadActionWithin(generationItem)) {
      await this.delay(1_500);
      return;
    }

    const menuButton = this.findActionTriggerWithin(generationItem);
    if (menuButton) {
      this.scrollIntoViewIfNeeded(menuButton);
      menuButton.click();
      await this.delay(750);

      const downloadAction = this.findVisibleDownloadAction(document);
      if (downloadAction) {
        this.clickElement(downloadAction);
        await this.delay(1_500);
        return;
      }
    }

    throw new Error('Could not find a download action for the latest generation.');
  }

  findPromptInput(): HTMLTextAreaElement | null {
    return (
      document.querySelector<HTMLTextAreaElement>('textarea#prompt-textarea') ??
      document.querySelector<HTMLTextAreaElement>('[data-testid="prompt-container"] textarea') ??
      document.querySelector<HTMLTextAreaElement>('textarea[name="prompt"]') ??
      document.querySelector<HTMLTextAreaElement>('textarea[placeholder="Type a prompt..."]')
    );
  }

  findNegativePromptInput(): HTMLTextAreaElement | HTMLInputElement | HTMLElement | null {
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

    const isButtonDisabled = generateButton.disabled;
    const hasSpinner = Boolean(
      generateButton.querySelector('svg[class*="spin"], [class*="loading"], [class*="animate-spin"]') ||
      document.querySelector('[class*="generating"], [class*="in-progress"]')
    );

    return isButtonDisabled || hasSpinner;
  }

  isGenerationCompleted(): boolean {
    const generateButton = this.findGenerateButton();
    if (!generateButton) return false;

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
    const text = document.body?.textContent?.toLowerCase() ?? '';
    return text.includes('verify you are human') || text.includes('captcha');
  }

  hasLoginChallenge(): boolean {
    return (
      window.location.pathname.includes('/auth/') ||
      window.location.pathname.includes('/login') ||
      window.location.pathname.includes('/sign-in') ||
      Boolean(document.querySelector('input[type="password"]'))
    );
  }

  hasInsufficientCreditsWarning(): boolean {
    const text = document.body?.textContent?.toLowerCase() ?? '';
    return (
      text.includes('insufficient credits') ||
      text.includes('out of credits') ||
      text.includes('upgrade your plan')
    );
  }

  private findLatestGenerationItem(): HTMLElement | null {
    const generationItems = Array.from(
      document.querySelectorAll<HTMLElement>('div[data-testid^="generation-list-item-"]')
    );

    const visibleItems = generationItems.filter((item) => this.isElementVisible(item));
    if (visibleItems.length === 0) {
      return generationItems[0] ?? null;
    }

    const sorted = visibleItems.sort((a, b) => {
      const aTop = a.getBoundingClientRect().top;
      const bTop = b.getBoundingClientRect().top;
      return aTop - bTop;
    });

    return sorted[0] ?? null;
  }

  private async waitForLatestGenerationItem(timeoutMs: number): Promise<HTMLElement> {
    await this.waitUntil(
      () => Boolean(this.findLatestGenerationItem()),
      timeoutMs,
      'Latest generation item not found within timeout.'
    );

    const item = this.findLatestGenerationItem();
    if (!item) {
      throw new Error('Latest generation item not found.');
    }

    return item;
  }

  private clickDownloadActionWithin(container: ParentNode): boolean {
    const downloadAction = this.findVisibleDownloadAction(container);
    if (!downloadAction) {
      return false;
    }

    this.clickElement(downloadAction);
    return true;
  }

  private findVisibleDownloadAction(container: ParentNode): HTMLElement | null {
    const selectors = [
      'button[aria-label*="Download"]',
      'button[title*="Download"]',
      '[role="menuitem"][aria-label*="Download"]',
      '[role="menuitem"][title*="Download"]',
      '[data-testid*="download"]',
      '[aria-label*="Download"]',
      '[title*="Download"]',
      '[role="menuitem"]',
    ];

    const candidates = Array.from(container.querySelectorAll<HTMLElement>(selectors.join(', ')));

    for (const candidate of candidates) {
      if (!this.isElementVisible(candidate)) {
        continue;
      }

      const text = candidate.textContent?.toLowerCase() ?? '';
      const ariaLabel = candidate.getAttribute('aria-label')?.toLowerCase() ?? '';
      const title = candidate.getAttribute('title')?.toLowerCase() ?? '';

      if (text.includes('download') || ariaLabel.includes('download') || title.includes('download')) {
        return candidate;
      }
    }

    return null;
  }

  private findActionTriggerWithin(container: ParentNode): HTMLButtonElement | null {
    const buttons = Array.from(container.querySelectorAll<HTMLButtonElement>('button'));

    for (const button of buttons) {
      if (!this.isElementVisible(button)) {
        continue;
      }

      const label = [button.getAttribute('aria-label'), button.getAttribute('title'), button.textContent]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      if (
        label.includes('more') ||
        label.includes('menu') ||
        label.includes('options') ||
        label.includes('action') ||
        label.includes('ellipsis') ||
        label.includes('download')
      ) {
        return button;
      }
    }

    return null;
  }

  private hoverElement(element: Element): void {
    const target = element as HTMLElement;
    target.dispatchEvent(new MouseEvent('mouseover', { bubbles: true, cancelable: true, view: window }));
    target.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true, cancelable: true, view: window }));
    target.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, cancelable: true, view: window }));
  }

  private scrollIntoViewIfNeeded(element: Element): void {
    if (typeof (element as HTMLElement).scrollIntoView === 'function') {
      (element as HTMLElement).scrollIntoView({
        block: 'center',
        inline: 'center',
        behavior: 'instant',
      });
    }
  }

  private clickElement(element: HTMLElement): void {
    this.scrollIntoViewIfNeeded(element);
    this.hoverElement(element);
    element.click();
  }

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

  private isElementVisible(element: Element): boolean {
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);

    return (
      rect.width > 0 &&
      rect.height > 0 &&
      style.visibility !== 'hidden' &&
      style.display !== 'none'
    );
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
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
