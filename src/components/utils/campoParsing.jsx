/**
 * Extrae el nombre del pueblo/municipio de un nombre de campo de la RFFM.
 * Ej: "CAMPO MUNICIPAL DE MORALZARZAL" → "Moralzarzal"
 *     "C.D.M. EL SOTO - MOSTOLES" → "Móstoles"
 *     "POLIDEPORTIVO MUNICIPAL DE TRES CANTOS" → "Tres Cantos"
 */
export function extractTownFromCampo(campo) {
  if (!campo) return null;
  let clean = campo
    .replace(/\(H\.?A\.?\)/gi, '')
    .replace(/\s*-\s*Hierba.*/gi, '')
    .replace(/\s*-\s*Tierra.*/gi, '')
    .replace(/\s*-\s*C[eé]sped.*/gi, '')
    .replace(/"[^"]*"/g, '')
    .trim();

  // If there's a " - ", split and take the last part (usually the town)
  if (clean.includes(' - ')) {
    const parts = clean.split(' - ');
    clean = parts[parts.length - 1].trim();
  }

  // Remove common prefixes to get the town name
  clean = clean
    .replace(/^CAMPO\s*(MUNICIPAL\s*)?(DE\s*F[UÚ]TBOL\s*)?(DE\s*)?/i, '')
    .replace(/^C\.?D\.?M\.?\s*/i, '')
    .replace(/^POLIDEPORTIVO\s*(MUNICIPAL\s*)?(DE\s*)?/i, '')
    .replace(/^INSTALACIONES\s*(DEPORTIVAS\s*)?(MUNICIPALES\s*)?(DE\s*)?/i, '')
    .replace(/^COMPLEJO\s*(DEPORTIVO\s*)?(MUNICIPAL\s*)?(DE\s*)?/i, '')
    .replace(/^ESTADIO\s*(MUNICIPAL\s*)?(DE\s*)?/i, '')
    .replace(/^PISTA\s*(MUNICIPAL\s*)?(DE\s*)?/i, '')
    .trim();

  if (!clean || clean.length < 2) return null;

  // Title case
  return clean
    .toLowerCase()
    .replace(/(^|\s)\S/g, c => c.toUpperCase());
}