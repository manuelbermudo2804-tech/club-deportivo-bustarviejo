// Helper compartido para el código de referido del programa "trae un amigo".
// El código es un hash corto del email del socio que invita. Debe coincidir
// EXACTAMENTE con la lógica usada en ReferralProgramCard para generar enlaces.

export function generateReferralCode(email) {
  if (!email) return "";
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    const char = email.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36).toUpperCase().slice(0, 8);
}