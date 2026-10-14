import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';

const { appId, serverUrl, token, functionsVersion } = appParams;

//Create a client with authentication required
const rawClient = createClient({
  appId,
  serverUrl,
  token,
  functionsVersion,
  requiresAuth: false
});

// Caché corta de lecturas: varias pantallas piden lo mismo a la vez al cargar
// (usuario, jugadores, temporada...). Se agrupan en una sola petición y se
// reutiliza el resultado unos segundos. Cualquier escritura limpia la caché.
const TTL_MS = 8000;
const cache = new Map();
const READS = new Set(['list', 'filter', 'get']);
const WRITES = new Set(['create', 'bulkCreate', 'update', 'bulkUpdate', 'updateMany', 'delete', 'deleteMany', 'upsert']);

const cached = (key, fn) => {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.t < TTL_MS) return hit.p;
  const p = fn();
  cache.set(key, { t: Date.now(), p });
  p.catch(() => cache.delete(key));
  return p;
};
const clearPrefix = (prefix) => { for (const k of cache.keys()) if (k.startsWith(prefix)) cache.delete(k); };

const wrapEntity = (name, entity) => new Proxy(entity, {
  get(target, prop) {
    const val = target[prop];
    if (typeof val !== 'function') return val;
    if (READS.has(prop)) {
      return (...args) => cached(`e:${name}:${prop}:${JSON.stringify(args)}`, () => val.apply(target, args));
    }
    if (WRITES.has(prop)) {
      return async (...args) => {
        try { return await val.apply(target, args); } finally { clearPrefix(`e:${name}:`); }
      };
    }
    return val.bind(target);
  }
});

const entityCache = new Map();
const entitiesProxy = new Proxy(rawClient.entities, {
  get(target, name) {
    const ent = target[name];
    if (!ent || typeof name !== 'string') return ent;
    if (!entityCache.has(name)) entityCache.set(name, wrapEntity(name, ent));
    return entityCache.get(name);
  }
});

const authProxy = new Proxy(rawClient.auth, {
  get(target, prop) {
    const val = target[prop];
    if (typeof val !== 'function') return val;
    if (prop === 'me') return () => cached('auth:me', () => val.apply(target));
    if (prop === 'updateMe') {
      return async (...args) => {
        try { return await val.apply(target, args); } finally { cache.delete('auth:me'); }
      };
    }
    return val.bind(target);
  }
});

export const base44 = new Proxy(rawClient, {
  get(target, prop) {
    if (prop === 'entities') return entitiesProxy;
    if (prop === 'auth') return authProxy;
    return target[prop];
  }
});