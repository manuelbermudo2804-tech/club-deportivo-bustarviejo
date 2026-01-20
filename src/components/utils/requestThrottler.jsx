/**
 * Cola de requests con throttling para evitar rate limits
 * Máximo 5 requests concurrentes con delay entre ellos
 */

class RequestThrottler {
  constructor(maxConcurrent = 2, delayMs = 150) {
    this.maxConcurrent = maxConcurrent;
    this.delayMs = delayMs;
    this.queue = [];
    this.active = 0;
  }

  async execute(fn) {
    // Si estamos en el límite, esperar
    while (this.active >= this.maxConcurrent) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    this.active++;
    try {
      const result = await fn();
      await new Promise(resolve => setTimeout(resolve, this.delayMs));
      return result;
    } finally {
      this.active--;
    }
  }
}

export const globalThrottler = new RequestThrottler(2, 120);

/**
 * Debounce para funciones que se llaman múltiples veces rápido
 */
export function debounce(fn, delay) {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Retry con exponential backoff
 */
export async function retryWithBackoff(fn, maxRetries = 5) {
  let lastError;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const status = error?.response?.status || error?.status;
      const retryAfterHeader = error?.response?.headers?.['retry-after'] || error?.response?.headers?.['Retry-After'];
      const retryAfter = retryAfterHeader ? Number(retryAfterHeader) * 1000 : null;
      const isRateLimit = status === 429 || /rate limit|too many requests/i.test(String(error?.message || ''));
      const baseDelay = isRateLimit ? 1000 : 200; // ms
      const delay = retryAfter || Math.min(15000, Math.pow(2, i) * baseDelay) * (1 + Math.random() * 0.25);
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
}