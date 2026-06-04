// Helpers para leer/escribir imágenes compartidas vía Web Share Target.
// El Service Worker guarda los archivos en IndexedDB cuando llega un POST de share.
// La página ShareReceiver los lee de aquí y los procesa.

const SHARE_DB = "shareTargetDB";
const SHARE_STORE = "sharedFiles";

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(SHARE_DB, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(SHARE_STORE)) {
        db.createObjectStore(SHARE_STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function readSharedFiles() {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(SHARE_STORE, "readonly");
      const store = tx.objectStore(SHARE_STORE);
      const req = store.get("current");
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function clearSharedFiles() {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(SHARE_STORE, "readwrite");
      tx.objectStore(SHARE_STORE).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    // ignore
  }
}