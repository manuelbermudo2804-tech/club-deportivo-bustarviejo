/**
 * Configuración centralizada de cuotas.
 * Usado por: InscriptionPaymentFlow, ParentPaymentForm, ParentPayments
 * 
 * IMPORTANTE: Si cambias algo aquí, afecta a TODOS los flujos de pago.
 */

// Cuotas fallback (se sobreescriben con CategoryConfig si existe)
export const CUOTAS_FALLBACK = {
  "Fútbol Aficionado": { inscripcion: 165, segunda: 100, tercera: 95, total: 360 },
  "Fútbol Juvenil": { inscripcion: 135, segunda: 100, tercera: 95, total: 330 },
  "Fútbol Cadete": { inscripcion: 135, segunda: 100, tercera: 95, total: 330 },
  "Fútbol Infantil (Mixto)": { inscripcion: 115, segunda: 83, tercera: 83, total: 281 },
  "Fútbol Alevín (Mixto)": { inscripcion: 115, segunda: 83, tercera: 83, total: 281 },
  "Fútbol Benjamín (Mixto)": { inscripcion: 100, segunda: 75, tercera: 75, total: 250 },
  "Fútbol Pre-Benjamín (Mixto)": { inscripcion: 100, segunda: 75, tercera: 75, total: 250 },
  "Fútbol Femenino": { inscripcion: 135, segunda: 100, tercera: 95, total: 330 },
  "Baloncesto (Mixto)": { inscripcion: 50, segunda: 50, tercera: 50, total: 150 }
};

// Mapeo de nombres de deporte a nombres de categoría en CategoryConfig
export const CATEGORY_NAME_MAPPING = {
  "Fútbol Aficionado": "AFICIONADO",
  "Fútbol Juvenil": "JUVENIL",
  "Fútbol Cadete": "CADETE",
  "Fútbol Infantil (Mixto)": "INFANTIL",
  "Fútbol Alevín (Mixto)": "ALEVIN",
  "Fútbol Benjamín (Mixto)": "BENJAMIN",
  "Fútbol Pre-Benjamín (Mixto)": "PRE-BENJAMIN",
  "Fútbol Femenino": "FEMENINO",
  "Baloncesto (Mixto)": "BALONCESTO"
};

export const FECHAS_VENCIMIENTO = {
  "Junio": "30 de junio",
  "Septiembre": "15 de septiembre",
  "Diciembre": "15 de diciembre"
};

/**
 * Obtiene las cuotas de una categoría.
 * Prioriza CategoryConfig (BD), cae a CUOTAS_FALLBACK si no hay config.
 */
export const getCuotasFromConfig = (categoria, categoryConfigs) => {
  if (!categoryConfigs || categoryConfigs.length === 0) {
    return CUOTAS_FALLBACK[categoria] || { inscripcion: 0, segunda: 0, tercera: 0, total: 0 };
  }
  
  const mappedName = CATEGORY_NAME_MAPPING[categoria] || categoria;
  const categoryConfig = categoryConfigs.find(c => 
    (c.nombre === categoria || c.nombre === mappedName) && c.activa
  );
  
  if (categoryConfig) {
    return {
      inscripcion: categoryConfig.cuota_inscripcion,
      segunda: categoryConfig.cuota_segunda,
      tercera: categoryConfig.cuota_tercera,
      total: categoryConfig.cuota_total
    };
  }
  
  return CUOTAS_FALLBACK[categoria] || { inscripcion: 0, segunda: 0, tercera: 0, total: 0 };
};

/**
 * Obtiene el importe de un mes específico para una categoría.
 * Opcionalmente aplica descuento (solo en Junio).
 */
export const getImportePorMesFromConfig = (categoria, mes, categoryConfigs, descuento = 0) => {
  const cuotas = getCuotasFromConfig(categoria, categoryConfigs);
  let importe = 0;
  
  if (mes === "Junio") {
    importe = cuotas.inscripcion;
  } else if (mes === "Septiembre") {
    importe = cuotas.segunda;
  } else if (mes === "Diciembre") {
    importe = cuotas.tercera;
  }
  
  // Aplicar descuento SOLO en Junio
  if (mes === "Junio" && descuento > 0) {
    importe = Math.max(0, importe - descuento);
  }
  
  return importe;
};

/**
 * Obtiene el total de la temporada con descuento aplicado.
 */
export const getTotalConDescuentoFromConfig = (categoria, categoryConfigs, descuento = 0) => {
  const cuotas = getCuotasFromConfig(categoria, categoryConfigs);
  return cuotas.total - descuento;
};