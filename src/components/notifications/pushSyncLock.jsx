/**
 * Lock global para evitar que AutoPushSubscriber y PushPermissionBanner
 * escriban en PushSubscription al mismo tiempo y creen duplicados.
 * 
 * Solo permite una operación de sincronización a la vez.
 */
let _locked = false;
let _queue = [];

export async function withPushSyncLock(fn) {
  if (_locked) {
    // Esperar a que se libere el lock (máx 10s)
    await new Promise((resolve) => {
      _queue.push(resolve);
      setTimeout(resolve, 10000);
    });
  }

  _locked = true;
  try {
    return await fn();
  } finally {
    _locked = false;
    // Liberar al siguiente en cola
    if (_queue.length > 0) {
      const next = _queue.shift();
      next();
    }
  }
}