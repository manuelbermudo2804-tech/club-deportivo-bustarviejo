/**
 * Extrae el nombre del pueblo/municipio de un nombre de campo de la RFFM.
 * Los datos reales vienen en formatos como:
 *   "NAVALAFUENTE" → "Navalafuente"
 *   "GUADALIX DE LA SIERRA" → "Guadalix De La Sierra"
 *   "ALCOBENDAS - CIUDAD DPTVA. VALDELASFUENTES" → "Alcobendas"
 *   "EL VELLON - MUNICIPAL LA NAVA" → "El Vellón"
 *   "PEDREZUELA - PVO. MUNICIPAL" → "Pedrezuela"
 *   "BUITRAGO" → "Buitrago"
 *   "BUSTARVIEJO" → "Bustarviejo"
 */
export function extractTownFromCampo(campo) {
  if (!campo) return null;
  let clean = campo.trim();

  // Si hay " - ", el pueblo es la PRIMERA parte (antes del guión)
  if (clean.includes(' - ')) {
    clean = clean.split(' - ')[0].trim();
  }

  // Limpiar prefijos que a veces quedan
  clean = clean
    .replace(/^CAMPO\s*(MUNICIPAL\s*)?(DE\s*F[UÚ]TBOL\s*)?(DE\s*)?/i, '')
    .replace(/^C\.?D\.?M\.?\s*/i, '')
    .replace(/^POLIDEPORTIVO\s*(MUNICIPAL\s*)?(DE\s*)?/i, '')
    .replace(/^PVO\.?\s*(MUNICIPAL\s*)?(DE\s*)?/i, '')
    .replace(/^MUNICIPAL\s*(DE\s*)?/i, '')
    .trim();

  if (!clean || clean.length < 2) return null;

  // Title case
  return clean
    .toLowerCase()
    .replace(/(^|\s)\S/g, c => c.toUpperCase());
}