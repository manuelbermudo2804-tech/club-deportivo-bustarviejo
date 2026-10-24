/**
 * PAGO POR ADELANTADO — reglas compartidas (páginas y formulario).
 *
 * Una categoría tiene tres estados (CategoryConfig):
 *   - No:     pago_adelantado = false.
 *   - Prueba: pago_adelantado = true y pago_adelantado_prueba = true  → SOLO lo ven las cuentas de prueba.
 *   - Activo: pago_adelantado = true y pago_adelantado_prueba = false → lo ven todas las familias.
 *
 * Las cuentas de prueba son los correos de SeasonConfig.pago_adelantado_emails_prueba
 * (se editan en Categorías y cuotas). La misma regla se aplica en el servidor (prepagoInscripcion).
 */

export const normEmail = (e) => String(e || "").trim().toLowerCase();

// Acepta array de correos o una cadena separada por comas/espacios
export const listaEmailsPrueba = (emails) => {
  const lista = Array.isArray(emails) ? emails : String(emails || "").split(/[,;\s]+/);
  return lista.map(normEmail).filter(Boolean);
};

export const esCuentaPrueba = (email, emails) => {
  const e = normEmail(email);
  return !!e && listaEmailsPrueba(emails).includes(e);
};

// ¿Esta categoría exige el pago por adelantado PARA ESTA CUENTA?
export const categoriaExigePago = (cfg, email, emails) =>
  !!cfg && cfg.pago_adelantado === true && (cfg.pago_adelantado_prueba !== true || esCuentaPrueba(email, emails));

// ¿Hay alguna categoría activa con pago adelantado visible para esta cuenta? (decide qué formulario abrir)
export const hayCategoriaConPago = (categoryConfigs = [], email, emails) =>
  categoryConfigs.some((c) => c.activa !== false && categoriaExigePago(c, email, emails));
