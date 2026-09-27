export interface GenerateResponseInput {
  prompt: string;
  history?: any[];
  model?: string;
  config?: any;
  apiKey: string;
}

export interface GenerateResponseOutput {
  content: string;
  tokenUsage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface ProviderHealthResult {
  status: 'HEALTHY' | 'UNAVAILABLE' | 'ERROR';
  latencyMs?: number;
  message?: string;
}

export interface AiProviderAdapter {
  generateResponse(input: GenerateResponseInput): Promise<GenerateResponseOutput>;
  generateStream?(input: GenerateResponseInput): AsyncGenerator<string, void, unknown>;
  healthCheck(apiKey: string): Promise<ProviderHealthResult>;
}
