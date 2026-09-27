import {
  AiProviderAdapter,
  GenerateResponseInput,
  GenerateResponseOutput,
  ProviderHealthResult,
} from '../interfaces/ai-provider.interface.js';

export class OpenAiAdapter implements AiProviderAdapter {
  async generateResponse(
    input: GenerateResponseInput,
  ): Promise<GenerateResponseOutput> {
    const model = input.model || 'gpt-3.5-turbo';

    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          content: `Simulated response from OpenAI (${model}) for prompt: "${input.prompt}"`,
          tokenUsage: {
            promptTokens: 10,
            completionTokens: 20,
            totalTokens: 30,
          },
        });
      }, 500);
    });
  }

  async *generateStream(
    input: GenerateResponseInput,
  ): AsyncGenerator<string, void, unknown> {
    const text = `Simulated streaming response from OpenAI for prompt: "${input.prompt}"`;
    const words = text.split(' ');
    for (const word of words) {
      await new Promise((resolve) => setTimeout(resolve, 100)); // simulate delay
      yield word + ' ';
    }
  }

  async healthCheck(apiKey: string): Promise<ProviderHealthResult> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          status: 'HEALTHY',
          latencyMs: 120,
        });
      }, 120);
    });
  }
}
