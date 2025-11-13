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
export const getCuotasPorCategoria = (categoria) => {
  // Normalizar la categoría para que coincida con las claves
  return CUOTAS_POR_CATEGORIA[categoria] || {
    inscripcion: 0,
    segunda: 0,
    tercera: 0,
    total: 0
  };
};

// Función para obtener el importe según categoría y mes
export const getImportePorCategoriaYMes = (categoria, mes) => {
  const cuotas = getCuotasPorCategoria(categoria);
  
  switch(mes) {
    case "Junio":
      return cuotas.inscripcion;
    case "Septiembre":
      return cuotas.segunda;
    case "Diciembre":
      return cuotas.tercera;
    default:
      return 0;
  }
};

// Fechas de vencimiento oficiales
export const FECHAS_VENCIMIENTO = {
  "Junio": "30 de junio",
  "Septiembre": "15 de septiembre",
  "Diciembre": "15 de diciembre"
};