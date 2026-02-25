/**
 * useFormPersistence — Guarda/restaura el estado del formulario en localStorage.
 * 
 * Problema que resuelve:
 * En iOS PWA, cuando el usuario abre la cámara o galería, el sistema operativo
 * a veces mata el proceso de la PWA por falta de memoria. Al volver, la página
 * se recarga y se pierde todo el formulario.
 * 
 * Solución:
 * - Guardar automáticamente el estado del formulario + paso actual
 * - Al montar el componente, restaurar si hay datos guardados
 * - Limpiar cuando se completa o cancela el formulario
 */

const STORAGE_KEY = 'playerFormWizard_draft';
const MAX_AGE_MS = 60 * 60 * 1000; // 1 hora máximo de antigüedad

export function saveFormDraft(playerData, step) {
  try {
    const draft = {
      playerData,
      step,
      savedAt: Date.now()
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  } catch {
    // localStorage lleno o no disponible — ignorar
  }
}

export function loadFormDraft() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const draft = JSON.parse(raw);
    // Verificar antigüedad
    if (Date.now() - draft.savedAt > MAX_AGE_MS) {
      clearFormDraft();
      return null;
    }
    return draft;
  } catch {
    return null;
  }
}

export function clearFormDraft() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}