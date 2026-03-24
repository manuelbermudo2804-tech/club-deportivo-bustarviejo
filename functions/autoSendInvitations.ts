import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * DEPRECATED: Este sistema ha sido reemplazado por el sistema de códigos de acceso (AccessCode).
 * Las invitaciones ahora se gestionan a través de generateAccessCode + expireAccessCodes.
 * Esta función se mantiene como stub para no romper automatizaciones existentes.
 */
Deno.serve(async (req) => {
  return Response.json({
    success: true,
    message: "Sistema migrado a códigos de acceso. Las invitaciones se gestionan desde AdminAccessCodes.",
    processed: 0,
    deprecated: true
  });
});