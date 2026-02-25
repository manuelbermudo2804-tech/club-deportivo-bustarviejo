/**
 * useFormPersistence — Guarda/restaura el estado del formulario en localStorage.
 * 
 * Problema que resuelve:
 * En iOS y Android PWA, cuando el usuario abre la cámara o galería, 
 * el SO puede matar el proceso de la app por falta de memoria.
 * Al volver, la página se recarga y se pierde todo el formulario.
 * 
 * Solución:
 * - Guardar automáticamente el estado del formulario + paso actual
 * - Marcar un flag ANTES de abrir la cámara (para detectar recarga por cámara)
 * - Al montar el componente, restaurar si hay datos guardados
 * - Registrar el evento en UploadDiagnostic si detectamos recarga por cámara
 * - Limpiar cuando se completa o cancela el formulario
 */

const STORAGE_KEY = 'playerFormWizard_draft';
const CAMERA_FLAG_KEY = 'playerFormWizard_cameraOpen';
const MAX_AGE_MS = 2 * 60 * 60 * 1000; // 2 horas máximo

/**
 * Guardar borrador del formulario
 */
export function saveFormDraft(playerData, step) {
  try {
    const draft = {
      playerData,
      step,
      savedAt: Date.now()
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  } catch {
    // localStorage lleno o no disponible
  }
}

/**
 * Cargar borrador del formulario
 */
export function loadFormDraft() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const draft = JSON.parse(raw);
    if (Date.now() - draft.savedAt > MAX_AGE_MS) {
      clearFormDraft();
      return null;
    }
    return draft;
  } catch {
    return null;
  }
}

/**
 * Limpiar borrador
 */
export function clearFormDraft() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(CAMERA_FLAG_KEY);
  } catch {}
}

/**
 * Marcar que estamos a punto de abrir la cámara/galería.
 * Si la app se recarga después, sabremos que fue por esto.
 */
export function markCameraOpening(inputId) {
  try {
    localStorage.setItem(CAMERA_FLAG_KEY, JSON.stringify({
      inputId,
      time: Date.now(),
      userAgent: navigator.userAgent
    }));
  } catch {}
}

/**
 * Comprobar si la página se recargó después de abrir la cámara.
 * Devuelve los datos del flag o null si no hubo recarga por cámara.
 */
export function checkCameraReload() {
  try {
    const raw = localStorage.getItem(CAMERA_FLAG_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    // Solo considerar si fue hace menos de 5 minutos
    if (Date.now() - data.time > 5 * 60 * 1000) {
      localStorage.removeItem(CAMERA_FLAG_KEY);
      return null;
    }
    // Limpiar el flag
    localStorage.removeItem(CAMERA_FLAG_KEY);
    return data;
  } catch {
    return null;
  }
}

/**
 * Limpiar el flag de cámara (cuando la subida funciona correctamente)
 */
export function clearCameraFlag() {
  try {
    localStorage.removeItem(CAMERA_FLAG_KEY);
  } catch {}
}