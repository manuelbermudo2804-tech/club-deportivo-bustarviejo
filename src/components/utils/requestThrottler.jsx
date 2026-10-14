/**
 * Cola de requests con throttling para evitar rate limits
 * Máximo 5 requests concurrentes con delay entre ellos
 */

class RequestThrottler {
  constructor(maxConcurrent = 1, delayMs = 200) {
    this.maxConcurrent = maxConcurrent;
    this.delayMs = delayMs;
    this.active = 0;
    this._queue = [];
  }

  execute(fn) {
    return new Promise((resolve, reject) => {
      this._queue.push({ fn, resolve, reject });
      this._drain();
    });
  }

  async _drain() {
    if (this.active >= this.maxConcurrent || this._queue.length === 0) return;
    this.active++;
    const { fn, resolve, reject } = this._queue.shift();
    try {
      // Si otra petición recibió un rate limit, esperar a que pase la pausa global
      const wait = RequestThrottler.cooldownUntil - Date.now();
      if (wait > 0) await new Promise(r => setTimeout(r, wait));
      const result = await retryWithBackoff(fn, 5);
      resolve(result);
    } catch (e) {
      reject(e);
    } finally {
      // Small delay between requests to avoid bursts
      await new Promise(r => setTimeout(r, this.delayMs));
      this.active--;
      this._drain();
    }
  }
}

RequestThrottler.cooldownUntil = 0;

export const globalThrottler = new RequestThrottler(2, 150);

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
      const status = error?.response?.status || error?.status;
      const retryAfterHeader = error?.response?.headers?.['retry-after'] || error?.response?.headers?.['Retry-After'];
      const retryAfter = retryAfterHeader ? Number(retryAfterHeader) * 1000 : null;
      const isRateLimit = status === 429 || /rate limit|too many requests/i.test(String(error?.message || ''));
      const baseDelay = isRateLimit ? 1000 : 200; // ms
      const delay = retryAfter || Math.min(15000, Math.pow(2, i) * baseDelay) * (1 + Math.random() * 0.25);
      if (isRateLimit) RequestThrottler.cooldownUntil = Math.max(RequestThrottler.cooldownUntil, Date.now() + delay);
      if (!isRateLimit && status && status < 500) break; // errores normales no se reintentan
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
}