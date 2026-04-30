// Utilidades de validación para inscripciones San Isidro

// Normaliza nombres: minúsculas, sin tildes, sin espacios extra
export const normalizeName = (s) => (s || "")
  .toString()
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .replace(/\s+/g, " ")
  .trim();

// Email
const COMMON_EMAIL_TYPOS = {
  "gmial.com": "gmail.com",
  "gmai.com": "gmail.com",
  "gnail.com": "gmail.com",
  "gmail.es": "gmail.com",
  "gmail.con": "gmail.com",
  "hotmial.com": "hotmail.com",
  "hotmal.com": "hotmail.com",
  "hotmai.com": "hotmail.com",
  "hotmail.con": "hotmail.com",
  "yahooo.com": "yahoo.com",
  "yaho.com": "yahoo.com",
  "outloo.com": "outlook.com",
  "outlok.com": "outlook.com",
};
const DISPOSABLE_DOMAINS = ["tempmail.com", "mailinator.com", "10minutemail.com", "guerrillamail.com", "yopmail.com", "trashmail.com", "throwaway.email", "fakeinbox.com"];

export const validateEmail = (email) => {
  if (!email) return { valid: true }; // opcional
  const v = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) {
    return { valid: false, error: "El email no tiene un formato válido" };
  }
  const domain = v.split("@")[1];
  if (DISPOSABLE_DOMAINS.includes(domain)) {
    return { valid: false, error: "No se admiten emails desechables. Usa un email real." };
  }
  if (COMMON_EMAIL_TYPOS[domain]) {
    const suggested = `${v.split("@")[0]}@${COMMON_EMAIL_TYPOS[domain]}`;
    return { valid: true, suggestion: suggested, warning: `¿Quisiste decir ${suggested}?` };
  }
  return { valid: true };
};

// Teléfono: limpia, valida formato español (móvil 6/7 o fijo 9, 9 dígitos)
export const cleanPhone = (phone) => (phone || "").replace(/[\s\-().+]/g, "").replace(/^34/, "");

const FAKE_PHONE_PATTERNS = [
  /^(\d)\1{8}$/,           // todo el mismo dígito: 666666666
  /^123456789$/,
  /^987654321$/,
  /^000000000$/,
  /^111111111$/,
];

export const validatePhone = (phone) => {
  if (!phone) return { valid: false, error: "El teléfono es obligatorio" };
  const clean = cleanPhone(phone);
  if (clean.length !== 9) {
    return { valid: false, error: "El teléfono debe tener 9 dígitos" };
  }
  if (!/^[679]/.test(clean)) {
    return { valid: false, error: "El teléfono debe empezar por 6, 7 o 9" };
  }
  if (FAKE_PHONE_PATTERNS.some(p => p.test(clean))) {
    return { valid: false, error: "Este número no parece real. Introduce un teléfono válido." };
  }
  return { valid: true, clean };
};

// Detecta duplicados de jugadores en inscripciones existentes (mismo torneo)
// existing: array de inscripciones previas con la misma modalidad
// Devuelve array de nombres duplicados encontrados
export const findDuplicatePlayers = (existing, newPlayers) => {
  const existingNames = new Set();
  existing.forEach(r => {
    if (r.jugador_nombre) existingNames.add(normalizeName(r.jugador_nombre));
    if (r.jugador_1) existingNames.add(normalizeName(r.jugador_1));
    if (r.jugador_2) existingNames.add(normalizeName(r.jugador_2));
    if (r.jugador_3) existingNames.add(normalizeName(r.jugador_3));
  });
  return newPlayers.filter(p => p && existingNames.has(normalizeName(p)));
};

// Detecta nombres de equipo similares (misma modalidad)
export const findSimilarTeamName = (existing, newTeamName) => {
  const norm = normalizeName(newTeamName);
  if (!norm) return null;
  return existing.find(r => normalizeName(r.nombre_equipo) === norm);
};

// Filtro de nombres de coña / falsos
const FAKE_NAME_PATTERNS = [
  /^(.)\1{2,}$/,                         // aaa, bbbb, xxxx
  /^(asdf|qwer|qwerty|zxcv|hjkl|wasd)/i,
  /^(test|prueba|pepito|fulano|mengano|nadie|nombre|apellido|aaaa|xxxx|jaja|jeje|lol|lmao|owo)$/i,
  /^[0-9]+$/,                            // solo números
  /[a-zA-Z]{15,}/,                       // 15+ letras seguidas sin espacio (palabras random largas)
  /<|>|@|#|\$|\{|\}|\[|\]/,              // caracteres raros
];

export const validatePersonName = (name) => {
  if (!name) return { valid: false, error: "El nombre es obligatorio" };
  const trimmed = name.trim();
  if (trimmed.length < 4) return { valid: false, error: "El nombre debe tener al menos 4 caracteres" };
  if (!trimmed.includes(" ")) return { valid: false, error: "Indica nombre y apellido (ej: Pedro García)" };
  for (const pattern of FAKE_NAME_PATTERNS) {
    if (pattern.test(trimmed)) {
      return { valid: false, error: "Por favor, introduce un nombre real" };
    }
  }
  // Debe contener mayoritariamente letras
  const letters = (trimmed.match(/[a-záéíóúñü]/gi) || []).length;
  if (letters < trimmed.length * 0.7) {
    return { valid: false, error: "Por favor, introduce un nombre real" };
  }
  return { valid: true };
};

export const validateTeamName = (name) => {
  if (!name) return { valid: false, error: "El nombre del equipo es obligatorio" };
  const trimmed = name.trim();
  if (trimmed.length < 3) return { valid: false, error: "El nombre del equipo es muy corto" };
  if (/^(.)\1{2,}$/.test(trimmed)) return { valid: false, error: "Pon un nombre real para tu equipo" };
  if (/^(test|prueba|asdf|aaaa|xxxx)$/i.test(trimmed)) return { valid: false, error: "Pon un nombre real para tu equipo" };
  return { valid: true };
};