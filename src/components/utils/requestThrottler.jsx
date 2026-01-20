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

export const globalThrottler = new RequestThrottler(3, 50);

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
export async function retryWithBackoff(fn, maxRetries = 3) {
  let lastError;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      // Si es rate limit, esperar más
      const isRateLimit = error?.message?.includes('Rate limit');
      const delay = isRateLimit ? Math.pow(2, i) * 1000 : Math.pow(2, i) * 100;
      
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
}