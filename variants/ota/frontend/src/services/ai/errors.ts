export class AiGenerationError extends Error {
  attempts: number;
  rawResponse: string;
  constructor(message: string, attempts: number, rawResponse: string) {
    super(message);
    this.name = 'AiGenerationError';
    this.attempts = attempts;
    this.rawResponse = rawResponse;
  }
}

export class ApiAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ApiAuthError';
  }
}

export class RateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RateLimitError';
  }
}

export class ApiServerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ApiServerError';
  }
}

export class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NetworkError';
  }
}
