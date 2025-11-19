export interface SrtBlock {
  id: number;
  startTime: string;
  endTime: string;
  text: string;
  originalText?: string; // To store original for comparison
}

export enum TranslationStatus {
  IDLE = 'IDLE',
  PARSING = 'PARSING',
  TRANSLATING = 'TRANSLATING',
  COMPLETE = 'COMPLETE',
  ERROR = 'ERROR',
}

export interface TranslationState {
  status: TranslationStatus;
  progress: number; // 0 to 100
  currentChunk: number;
  totalChunks: number;
  error?: string;
  blocks: SrtBlock[];
  fileName: string;
}

export interface TranslationResponseItem {
  id: number;
  text: string;
}
