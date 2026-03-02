// ============================================================================
// AI Provider Adapters
// ============================================================================
// Abstraction layer for different AI providers (OpenAI, Anthropic, etc.)
// Each adapter normalizes the provider-specific API into a common interface.
// ============================================================================

import { AIProvider, TokenUsage } from '../models/types';

export interface ChatRequest {
  model: string;
  systemPrompt: string;
  userMessage: string;
  temperature: number;
  maxTokens: number;
  stream?: boolean;
  onStream?: (chunk: string) => void;
}

export interface ChatResponse {
  content: string;
  usage: TokenUsage;
  finishReason: string;
}

export interface AIProviderAdapter {
  chat(request: ChatRequest): Promise<ChatResponse>;
}

// ---- Cost estimation per 1K tokens (approximate) ----
const COST_TABLE: Record<string, { prompt: number; completion: number }> = {
  'gpt-4o': { prompt: 0.005, completion: 0.015 },
  'gpt-4o-mini': { prompt: 0.00015, completion: 0.0006 },
  'gpt-4-turbo': { prompt: 0.01, completion: 0.03 },
  'claude-sonnet-4-20250514': { prompt: 0.003, completion: 0.015 },
  'claude-opus-4-20250514': { prompt: 0.015, completion: 0.075 },
  'claude-haiku-4-5-20251001': { prompt: 0.001, completion: 0.005 },
};

function estimateCost(model: string, promptTokens: number, completionTokens: number): number {
  const costs = COST_TABLE[model] ?? { prompt: 0.002, completion: 0.006 };
  return (promptTokens / 1000) * costs.prompt + (completionTokens / 1000) * costs.completion;
}

// ============================================================================
// OpenAI Adapter
// ============================================================================

class OpenAIAdapter implements AIProviderAdapter {
  constructor(private apiKey: string) {}

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: request.model,
        messages: [
          { role: 'system', content: request.systemPrompt },
          { role: 'user', content: request.userMessage },
        ],
        temperature: request.temperature,
        max_tokens: request.maxTokens,
        stream: request.stream ?? false,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`OpenAI API error (${response.status}): ${errorBody}`);
    }

    if (request.stream && request.onStream) {
      return this.handleStream(response, request);
    }

    const data = await response.json();
    const choice = data.choices[0];
    const usage = data.usage;

    return {
      content: choice.message.content,
      usage: {
        promptTokens: usage.prompt_tokens,
        completionTokens: usage.completion_tokens,
        totalTokens: usage.total_tokens,
        estimatedCost: estimateCost(request.model, usage.prompt_tokens, usage.completion_tokens),
      },
      finishReason: choice.finish_reason,
    };
  }

  private async handleStream(response: Response, request: ChatRequest): Promise<ChatResponse> {
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let fullContent = '';
    let finishReason = 'stop';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n').filter((l) => l.startsWith('data: '));

      for (const line of lines) {
        const json = line.replace('data: ', '');
        if (json === '[DONE]') break;

        try {
          const parsed = JSON.parse(json);
          const delta = parsed.choices?.[0]?.delta?.content;
          if (delta) {
            fullContent += delta;
            request.onStream?.(delta);
          }
          if (parsed.choices?.[0]?.finish_reason) {
            finishReason = parsed.choices[0].finish_reason;
          }
        } catch {
          // Skip malformed chunks
        }
      }
    }

    // Approximate token counts for streaming
    const approxPrompt = Math.ceil(request.systemPrompt.length + request.userMessage.length) / 4;
    const approxCompletion = Math.ceil(fullContent.length / 4);

    return {
      content: fullContent,
      usage: {
        promptTokens: approxPrompt,
        completionTokens: approxCompletion,
        totalTokens: approxPrompt + approxCompletion,
        estimatedCost: estimateCost(request.model, approxPrompt, approxCompletion),
      },
      finishReason,
    };
  }
}

// ============================================================================
// Anthropic Adapter
// ============================================================================

class AnthropicAdapter implements AIProviderAdapter {
  constructor(private apiKey: string) {}

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: request.model,
        system: request.systemPrompt,
        messages: [{ role: 'user', content: request.userMessage }],
        temperature: request.temperature,
        max_tokens: request.maxTokens,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Anthropic API error (${response.status}): ${errorBody}`);
    }

    const data = await response.json();

    return {
      content: data.content[0].text,
      usage: {
        promptTokens: data.usage.input_tokens,
        completionTokens: data.usage.output_tokens,
        totalTokens: data.usage.input_tokens + data.usage.output_tokens,
        estimatedCost: estimateCost(
          request.model,
          data.usage.input_tokens,
          data.usage.output_tokens
        ),
      },
      finishReason: data.stop_reason,
    };
  }
}

// ============================================================================
// Mock Adapter (for testing / demo without API keys)
// ============================================================================

class MockAdapter implements AIProviderAdapter {
  async chat(request: ChatRequest): Promise<ChatResponse> {
    // Simulate processing time
    await new Promise((resolve) => setTimeout(resolve, 500 + Math.random() * 1000));

    const mockResponse = `[Mock ${request.model} response]\n\nProcessed input: "${request.userMessage.slice(0, 100)}..."\n\nSystem context: ${request.systemPrompt.slice(0, 50)}...`;

    if (request.stream && request.onStream) {
      const words = mockResponse.split(' ');
      for (const word of words) {
        await new Promise((resolve) => setTimeout(resolve, 50));
        request.onStream(word + ' ');
      }
    }

    return {
      content: mockResponse,
      usage: {
        promptTokens: 150,
        completionTokens: 80,
        totalTokens: 230,
        estimatedCost: 0.001,
      },
      finishReason: 'stop',
    };
  }
}

// ============================================================================
// Factory
// ============================================================================

export function createProviderAdapter(provider: AIProvider, apiKey: string): AIProviderAdapter {
  switch (provider) {
    case 'openai':
      return new OpenAIAdapter(apiKey);
    case 'anthropic':
      return new AnthropicAdapter(apiKey);
    case 'local':
    case 'custom':
      return new MockAdapter();
    default:
      return new MockAdapter();
  }
}
