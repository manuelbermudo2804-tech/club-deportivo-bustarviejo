// Simple offline queue with retry + backoff for chat sends (browser-only)
// Usage: sendWithQueue(queueKey, sendFn, payload, { onSuccess, maxRetries, backoffBaseMs })

const QUEUE_PREFIX = 'mq:';
const timers = new Map();

function getQueue(key) {
  try {
    const raw = localStorage.getItem(QUEUE_PREFIX + key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setQueue(key, items) {
  try {
    localStorage.setItem(QUEUE_PREFIX + key, JSON.stringify(items));
  } catch {}
}

async function processItem(key, item, sendFn, callbacks) {
  try {
    const res = await sendFn(item.payload);
    // Remove on success
    const items = getQueue(key).filter((q) => q.id !== item.id);
    setQueue(key, items);
    callbacks?.onSuccess?.(res, item.payload);
  } catch (err) {
    // Increment retries and keep
    const items = getQueue(key).map((q) =>
      q.id === item.id ? { ...q, retries: (q.retries || 0) + 1, lastError: String(err?.message || err) } : q
    );
    setQueue(key, items);
  }
}

function scheduleProcessor(key, sendFn, { maxRetries = 5, backoffBaseMs = 1000, onSuccess } = {}) {
  if (timers.has(key)) return;

  const tick = async () => {
    const items = getQueue(key);
    for (const item of items) {
      const retries = item.retries || 0;
      if (retries > maxRetries) {
        // Drop silently after max retries
        setQueue(key, items.filter((q) => q.id !== item.id));
        continue;
      }
      // Exponential backoff window
      const delayMs = Math.min(30000, backoffBaseMs * Math.pow(2, retries));
      const now = Date.now();
      const nextAt = (item.nextAt || 0);
      if (now >= nextAt) {
        // Plan next attempt time before sending to avoid rapid loops
        item.nextAt = now + delayMs;
        setQueue(key, items);
        if (navigator.onLine) await processItem(key, item, sendFn, { onSuccess });
      }
    }
  };

  const interval = setInterval(tick, 2000);
  timers.set(key, interval);

  const onlineHandler = () => tick();
  window.addEventListener('online', onlineHandler);
}

export async function sendWithQueue(key, sendFn, payload, options = {}) {
  // Try immediate send if online
  if (typeof navigator !== 'undefined' && navigator.onLine) {
    try {
      const res = await sendFn(payload);
      options?.onSuccess?.(res, payload);
      return res;
    } catch (_) {
      // fallthrough to queue
    }
  }

  // Enqueue
  const tempId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const newItem = { id: tempId, payload, retries: 0, nextAt: 0 };
  const items = getQueue(key);
  items.push(newItem);
  setQueue(key, items);

  // Start processor
  scheduleProcessor(key, sendFn, options);
  return { queued: true, id: tempId };
}