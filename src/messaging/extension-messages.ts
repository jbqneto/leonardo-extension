export type ExtensionMessage =
  | PingMessage
  | DiagnosePageMessage
  | SubmitPromptMessage
  | PauseRunMessage
  | StopRunMessage;

export interface PingMessage {
  type: 'PING';
}

export interface DiagnosePageMessage {
  type: 'DIAGNOSE_PAGE';
}

export interface SubmitPromptMessage {
  type: 'SUBMIT_PROMPT';
  payload: {
    prompt: string;
    negativePrompt?: string;
    generationTimeoutMs: number;
  };
}

export interface PauseRunMessage {
  type: 'PAUSE_RUN';
}

export interface StopRunMessage {
  type: 'STOP_RUN';
}

export type ExtensionResponse =
  | SuccessResponse
  | ErrorResponse
  | PageDiagnosticsResponse;

export interface SuccessResponse {
  ok: true;
  message?: string;
}

export interface ErrorResponse {
  ok: false;
  error: string;
  details?: unknown;
}

export interface PageDiagnosticsResponse {
  ok: true;
  pageState: {
    url: string;
    isLeonardoDomain: boolean;
    hasPromptInput: boolean;
    hasGenerateButton: boolean;
    isGenerateButtonEnabled: boolean;
    hasBlockingModal: boolean;
    hasCaptcha: boolean;
    hasLoginChallenge: boolean;
    hasInsufficientCreditsWarning: boolean;
  };
}
