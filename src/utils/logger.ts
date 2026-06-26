export const logger = {
  info(message: string, data?: unknown): void {
    console.info(`[Leonardo Prompt Runner] ${message}`, data ?? '');
  },

  warn(message: string, data?: unknown): void {
    console.warn(`[Leonardo Prompt Runner] ${message}`, data ?? '');
  },

  error(message: string, data?: unknown): void {
    console.error(`[Leonardo Prompt Runner] ${message}`, data ?? '');
  }
};
