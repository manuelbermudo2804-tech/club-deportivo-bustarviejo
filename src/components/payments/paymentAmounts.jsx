// Cuotas oficiales por categoría según la tabla del club
export const CUOTAS_POR_CATEGORIA = {
  // Fútbol Aficionado
  "Fútbol Aficionado": {
    inscripcion: 165,
    segunda: 100,
    tercera: 95,
    total: 360
  },
  
  // Fútbol Juvenil
  "Fútbol Juvenil": {
    inscripcion: 135,
    segunda: 100,
    tercera: 95,
    total: 330
  },
  
  // Fútbol Cadete
  "Fútbol Cadete": {
    inscripcion: 135,
    segunda: 100,
    tercera: 95,
    total: 330
  },
  
  // Fútbol Infantil (Mixto)
  "Fútbol Infantil (Mixto)": {
    inscripcion: 115,
    segunda: 83,
    tercera: 83,
    total: 281
  },
  
  // Fútbol Alevín (Mixto)
  "Fútbol Alevín (Mixto)": {
    inscripcion: 115,
    segunda: 83,
    tercera: 83,
    total: 281
  },
  
  // Fútbol Benjamín (Mixto)
  "Fútbol Benjamín (Mixto)": {
    inscripcion: 100,
    segunda: 75,
    tercera: 75,
    total: 250
  },
  
  // Fútbol Pre-Benjamín (Mixto)
  "Fútbol Pre-Benjamín (Mixto)": {
    inscripcion: 100,
    segunda: 75,
    tercera: 75,
    total: 250
  },
  
  // Fútbol Femenino
  "Fútbol Femenino": {
    inscripcion: 135,
    segunda: 100,
    tercera: 95,
    total: 330
  },
  
  // Baloncesto (Mixto)
  "Baloncesto (Mixto)": {
    inscripcion: 50,
    segunda: 50,
    tercera: 50,
    total: 150
  }
};

// Función para obtener las cuotas según la categoría
// NOTA: Esta función ahora intenta obtener cuotas desde CategoryConfig
// Si no existe en la BD, usa el fallback hardcoded
export const getCuotasPorCategoria = async (categoria) => {
  try {
    const { base44 } = await import('@/api/base44Client');
    const categories = await base44.entities.CategoryConfig.list();
    const categoryConfig = categories.find(c => c.nombre === categoria && c.activa);
    
    if (categoryConfig) {
      return {
        inscripcion: categoryConfig.cuota_inscripcion,
        segunda: categoryConfig.cuota_segunda,
        tercera: categoryConfig.cuota_tercera,
        total: categoryConfig.cuota_total
      };
    }
  } catch (error) {
    console.log("Error fetching from CategoryConfig, using fallback:", error);
  }
  
  // Fallback a hardcoded
  const cuotas = CUOTAS_POR_CATEGORIA[categoria] || {
    inscripcion: 0,
    segunda: 0,
    tercera: 0,
    total: 0
  };
  return cuotas;
};

// Versión sincrónica para compatibilidad
export const getCuotasPorCategoriaSync = (categoria) => {
  const cuotas = CUOTAS_POR_CATEGORIA[categoria] || {
    inscripcion: 0,
    segunda: 0,
    tercera: 0,
    total: 0
  };
  return cuotas;
};

// Función para obtener el importe según categoría y mes
// NOTA: Usa primero CategoryConfig, luego fallback hardcoded
export const getImportePorCategoriaYMes = async (categoria, mes) => {
  try {
    const { base44 } = await import('@/api/base44Client');
    const categories = await base44.entities.CategoryConfig.list();
    const categoryConfig = categories.find(c => c.nombre === categoria && c.activa);
    
    if (categoryConfig) {
      switch(mes) {
        case "Junio":
          return categoryConfig.cuota_inscripcion;
        case "Septiembre":
          return categoryConfig.cuota_segunda;
        case "Diciembre":
          return categoryConfig.cuota_tercera;
        default:
          return 0;
      }
    }
  } catch (error) {
    console.log("Error fetching from CategoryConfig, using fallback:", error);
  }
  
  // Fallback a hardcoded
  const cuotas = CUOTAS_POR_CATEGORIA[categoria] || {
    inscripcion: 0,
    segunda: 0,
    tercera: 0,
    total: 0
  };
  
  let importe = 0;
  switch(mes) {
    case "Junio":
      importe = cuotas.inscripcion;
      break;
    case "Septiembre":
      importe = cuotas.segunda;
      break;
    case "Diciembre":
      importe = cuotas.tercera;
      break;
    default:
      importe = 0;
  }
  
  return importe;
};

// Versión sincrónica para compatibilidad
export const getImportePorCategoriaYMesSync = (categoria, mes) => {
  const cuotas = CUOTAS_POR_CATEGORIA[categoria] || {
    inscripcion: 0,
    segunda: 0,
    tercera: 0,
    total: 0
  };
  
  let importe = 0;
  switch(mes) {
    case "Junio":
      importe = cuotas.inscripcion;
      break;
    case "Septiembre":
      importe = cuotas.segunda;
      break;
    case "Diciembre":
      importe = cuotas.tercera;
      break;
    default:
      importe = 0;
  }
  
  return importe;
};

// Fechas de vencimiento oficiales
export const FECHAS_VENCIMIENTO = {
  "Junio": "30 de junio",
  "Septiembre": "15 de septiembre",
  "Diciembre": "15 de diciembre"
};