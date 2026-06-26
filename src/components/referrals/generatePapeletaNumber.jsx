import { base44 } from "@/api/base44Client";

/**
 * Genera un número de papeleta aleatorio y único (4 dígitos) para la temporada dada.
 * Comprueba contra los ReferralHistory existentes para no repetir.
 * Devuelve un string tipo "0427". Si no puede garantizar unicidad tras varios
 * intentos, añade un dígito extra como último recurso.
 */
export async function generatePapeletaNumber(temporada) {
  let usados = new Set();
  try {
    const existentes = await base44.entities.ReferralHistory.filter({ temporada });
    usados = new Set(existentes.map((r) => r.numero_papeleta).filter(Boolean));
  } catch {
    // Si falla la lectura, seguimos con un número aleatorio sin comprobar
  }

  for (let i = 0; i < 50; i++) {
    const n = String(Math.floor(Math.random() * 10000)).padStart(4, "0");
    if (!usados.has(n)) return n;
  }
  // Fallback extremadamente improbable: 5 dígitos
  return String(Math.floor(Math.random() * 100000)).padStart(5, "0");
}