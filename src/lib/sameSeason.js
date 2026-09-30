// Compara temporadas ignorando si se escribieron con "/" o con "-" (2026/2027 = 2026-2027)
export const seasonKey = (t) => String(t || "").trim().replace(/\//g, "-");
export const sameSeason = (a, b) => seasonKey(a) === seasonKey(b);