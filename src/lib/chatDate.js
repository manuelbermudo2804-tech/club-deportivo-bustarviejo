// Las fechas de la base de datos llegan en UTC pero sin la marca "Z"
// (ej: "2026-08-25T12:01:13.072000"). Si se pasan directas a new Date(),
// el navegador las interpreta como hora local y los mensajes aparecen
// 2 horas antes en España. Esta función las normaliza a UTC real.
export const parseChatDate = (value) => {
  if (!value) return new Date(NaN);
  if (value instanceof Date) return value;
  const str = String(value);
  const isNaive = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?$/.test(str);
  return new Date(isNaive ? `${str}Z` : str);
};