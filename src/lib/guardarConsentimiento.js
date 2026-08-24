import { base44 } from "@/api/base44Client";
import { CONSENT_VERSION } from "@/components/consent/consentTexts";

/**
 * Guarda el consentimiento comercial de una persona.
 * Llamar desde cualquier formulario nuevo tras enviarlo.
 *
 * @param {Object} datos
 * @param {string} datos.origen - Formulario de origen (ej: 'loteria', 'torneo-padel')
 * @param {string} [datos.nombre]
 * @param {string} [datos.email]
 * @param {string} [datos.telefono]
 * @param {boolean} [datos.acepta_promociones]
 * @param {boolean} [datos.acepta_patrocinadores]
 */
export async function guardarConsentimiento({
  origen,
  nombre,
  email,
  telefono,
  acepta_promociones = false,
  acepta_patrocinadores = false,
}) {
  // Si no acepta nada, no hay nada que registrar
  if (!acepta_promociones && !acepta_patrocinadores) return null;

  return base44.entities.ConsentimientoComercial.create({
    origen,
    nombre,
    email,
    telefono,
    acepta_promociones,
    acepta_patrocinadores,
    texto_version: CONSENT_VERSION,
    fecha: new Date().toISOString(),
  });
}