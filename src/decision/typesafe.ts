export type TypeSafeQuestion = Readonly<Record<string, unknown>>;

export interface TypeSafeAnswer {
  readonly type: string;
  readonly choice?: string;
  readonly score?: number;
  readonly noul?: number;
  readonly confidence?: number;
  readonly probabilities?: Readonly<Record<string, number>>;
}

export interface TypeSafeResponse {
  readonly model?: string;
  readonly answers: Readonly<Record<string, TypeSafeAnswer>>;
  readonly usage?: Readonly<Record<string, number>>;
}

export interface TypeSafeResponseLike {
  readonly ok: boolean;
  json(): Promise<unknown>;
  text(): Promise<string>;
  readonly status?: number;
}

export type TypeSafeFetch = (url: string, init: { readonly method: string; readonly headers: Readonly<Record<string, string>>; readonly body: string }) => Promise<TypeSafeResponseLike>;

export interface TypeSafeClientOptions {
  readonly apiKey: string;
  readonly model?: string;
  readonly baseUrl?: string;
  readonly fetchImpl?: TypeSafeFetch;
}

function defaultFetch(): TypeSafeFetch {
  const candidate = (globalThis as unknown as { fetch?: TypeSafeFetch }).fetch;
  if (!candidate) throw new Error('TypeSafe HTTP client requires global fetch');
  return candidate;
}

export class TypeSafeClient {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly baseUrl: string;
  private readonly fetchImpl: TypeSafeFetch;

  constructor(options: TypeSafeClientOptions) {
    if (!options.apiKey.trim()) throw new Error('TypeSafe API key is required');
    this.apiKey = options.apiKey;
    this.model = options.model ?? 'jev-1.13.0';
    this.baseUrl = options.baseUrl ?? 'https://api.typesafe.ai/v1/systemone';
    this.fetchImpl = options.fetchImpl ?? defaultFetch();
  }

  async systemOne(state: unknown, questions: Readonly<Record<string, TypeSafeQuestion>>): Promise<TypeSafeResponse> {
    const response = await this.fetchImpl(this.baseUrl, {
      method: 'POST',
      headers: { authorization: `Bearer ${this.apiKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({ state, model: this.model, questions }),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(`TypeSafe API request failed (${response.status ?? 'unknown'}): ${JSON.stringify(payload)}`);
    if (!payload || typeof payload !== 'object' || !('answers' in payload) || typeof (payload as { answers?: unknown }).answers !== 'object') throw new Error('TypeSafe response has no answers object');
    return payload as TypeSafeResponse;
  }
}

export function scoreQuestion(instructions: string, levels: readonly string[]): TypeSafeQuestion {
  return { type: 'score', instructions, criteria: levels };
}

export function choiceQuestion(instructions: string, criteria: Readonly<Record<string, string>>): TypeSafeQuestion {
  return { type: 'choice', instructions, criteria };
}

export function noulQuestion(instructions: string): TypeSafeQuestion {
  return { type: 'noul', instructions };
}
