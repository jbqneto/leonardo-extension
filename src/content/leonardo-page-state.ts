export interface LeonardoPageState {
  url: string;
  isLeonardoDomain: boolean;
  hasPromptInput: boolean;
  hasGenerateButton: boolean;
  isGenerateButtonEnabled: boolean;
  hasBlockingModal: boolean;
  hasCaptcha: boolean;
  hasLoginChallenge: boolean;
  hasInsufficientCreditsWarning: boolean;
}
