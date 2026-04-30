// Genera y persiste una "huella" del dispositivo del usuario
// Sin permisos especiales, sin info personal — solo identifica el navegador/dispositivo
// para detectar spam y bromistas que se inscriben muchas veces.

const STORAGE_KEY = "sanisidro_device_id";

const hashString = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const chr = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
};

const getCanvasFingerprint = () => {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 200;
    canvas.height = 50;
    const ctx = canvas.getContext("2d");
    ctx.textBaseline = "top";
    ctx.font = "14px Arial";
    ctx.fillStyle = "#f60";
    ctx.fillRect(0, 0, 100, 30);
    ctx.fillStyle = "#069";
    ctx.fillText("CD Bustarviejo 🏆", 2, 15);
    return hashString(canvas.toDataURL());
  } catch {
    return "no-canvas";
  }
};

export const getDeviceFingerprint = () => {
  try {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) return cached;
  } catch {}

  const parts = [
    navigator.userAgent || "",
    navigator.language || "",
    Intl.DateTimeFormat().resolvedOptions().timeZone || "",
    `${screen.width}x${screen.height}`,
    `${screen.colorDepth}`,
    navigator.hardwareConcurrency || "",
    navigator.platform || "",
    getCanvasFingerprint(),
  ].join("|");

  const fp = hashString(parts) + "-" + Date.now().toString(36).slice(-4);

  try {
    localStorage.setItem(STORAGE_KEY, fp);
  } catch {}

  return fp;
};

export const getUserAgentSummary = () => {
  const ua = navigator.userAgent || "";
  // Resumen legible para el admin
  let device = "Desconocido";
  if (/iPhone/.test(ua)) device = "iPhone";
  else if (/iPad/.test(ua)) device = "iPad";
  else if (/Android/.test(ua)) device = "Android";
  else if (/Windows/.test(ua)) device = "Windows";
  else if (/Mac/.test(ua)) device = "Mac";
  else if (/Linux/.test(ua)) device = "Linux";

  let browser = "Desconocido";
  if (/Chrome/.test(ua) && !/Edg/.test(ua)) browser = "Chrome";
  else if (/Safari/.test(ua) && !/Chrome/.test(ua)) browser = "Safari";
  else if (/Firefox/.test(ua)) browser = "Firefox";
  else if (/Edg/.test(ua)) browser = "Edge";

  return `${device} · ${browser}`;
};