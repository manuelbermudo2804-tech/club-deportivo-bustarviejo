// Formaciones tácticas predefinidas con posiciones (x, y en porcentaje del campo)
// El campo es 100x70, con la portería propia a la izquierda

// Formaciones Fútbol 11
export const FORMACIONES = {
  "4-4-2": {
    nombre: "4-4-2 Clásico",
    descripcion: "Formación equilibrada con dos delanteros",
    posiciones: [
      { numero: 1, x: 5, y: 35, posicion: "POR" },      // Portero
      { numero: 2, x: 20, y: 10, posicion: "LD" },      // Lateral derecho
      { numero: 3, x: 20, y: 25, posicion: "DFC" },     // Central derecho
      { numero: 4, x: 20, y: 45, posicion: "DFC" },     // Central izquierdo
      { numero: 5, x: 20, y: 60, posicion: "LI" },      // Lateral izquierdo
      { numero: 6, x: 40, y: 10, posicion: "MD" },      // Medio derecho
      { numero: 7, x: 40, y: 28, posicion: "MC" },      // Medio centro derecho
      { numero: 8, x: 40, y: 42, posicion: "MC" },      // Medio centro izquierdo
      { numero: 9, x: 40, y: 60, posicion: "MI" },      // Medio izquierdo
      { numero: 10, x: 65, y: 28, posicion: "DC" },     // Delantero centro
      { numero: 11, x: 65, y: 42, posicion: "DC" },     // Delantero centro
    ]
  },
  "4-3-3": {
    nombre: "4-3-3 Ofensivo",
    descripcion: "Formación ofensiva con tres delanteros",
    posiciones: [
      { numero: 1, x: 5, y: 35, posicion: "POR" },
      { numero: 2, x: 20, y: 10, posicion: "LD" },
      { numero: 3, x: 20, y: 25, posicion: "DFC" },
      { numero: 4, x: 20, y: 45, posicion: "DFC" },
      { numero: 5, x: 20, y: 60, posicion: "LI" },
      { numero: 6, x: 40, y: 20, posicion: "MC" },
      { numero: 7, x: 40, y: 35, posicion: "MC" },
      { numero: 8, x: 40, y: 50, posicion: "MC" },
      { numero: 9, x: 65, y: 10, posicion: "ED" },
      { numero: 10, x: 70, y: 35, posicion: "DC" },
      { numero: 11, x: 65, y: 60, posicion: "EI" },
    ]
  },
  "4-2-3-1": {
    nombre: "4-2-3-1",
    descripcion: "Formación moderna con mediapunta",
    posiciones: [
      { numero: 1, x: 5, y: 35, posicion: "POR" },
      { numero: 2, x: 20, y: 10, posicion: "LD" },
      { numero: 3, x: 20, y: 25, posicion: "DFC" },
      { numero: 4, x: 20, y: 45, posicion: "DFC" },
      { numero: 5, x: 20, y: 60, posicion: "LI" },
      { numero: 6, x: 35, y: 28, posicion: "MCD" },
      { numero: 7, x: 35, y: 42, posicion: "MCD" },
      { numero: 8, x: 55, y: 10, posicion: "MD" },
      { numero: 9, x: 55, y: 35, posicion: "MP" },
      { numero: 10, x: 55, y: 60, posicion: "MI" },
      { numero: 11, x: 75, y: 35, posicion: "DC" },
    ]
  },
  "3-5-2": {
    nombre: "3-5-2",
    descripcion: "Formación con tres centrales y carrileros",
    posiciones: [
      { numero: 1, x: 5, y: 35, posicion: "POR" },
      { numero: 2, x: 20, y: 18, posicion: "DFC" },
      { numero: 3, x: 20, y: 35, posicion: "DFC" },
      { numero: 4, x: 20, y: 52, posicion: "DFC" },
      { numero: 5, x: 40, y: 5, posicion: "CAD" },
      { numero: 6, x: 38, y: 25, posicion: "MC" },
      { numero: 7, x: 38, y: 35, posicion: "MC" },
      { numero: 8, x: 38, y: 45, posicion: "MC" },
      { numero: 9, x: 40, y: 65, posicion: "CAI" },
      { numero: 10, x: 65, y: 28, posicion: "DC" },
      { numero: 11, x: 65, y: 42, posicion: "DC" },
    ]
  },
  "5-3-2": {
    nombre: "5-3-2 Defensivo",
    descripcion: "Formación defensiva con cinco defensas",
    posiciones: [
      { numero: 1, x: 5, y: 35, posicion: "POR" },
      { numero: 2, x: 18, y: 8, posicion: "CAD" },
      { numero: 3, x: 15, y: 22, posicion: "DFC" },
      { numero: 4, x: 15, y: 35, posicion: "DFC" },
      { numero: 5, x: 15, y: 48, posicion: "DFC" },
      { numero: 6, x: 18, y: 62, posicion: "CAI" },
      { numero: 7, x: 40, y: 20, posicion: "MC" },
      { numero: 8, x: 40, y: 35, posicion: "MC" },
      { numero: 9, x: 40, y: 50, posicion: "MC" },
      { numero: 10, x: 65, y: 28, posicion: "DC" },
      { numero: 11, x: 65, y: 42, posicion: "DC" },
    ]
  },
  "4-1-4-1": {
    nombre: "4-1-4-1",
    descripcion: "Formación con pivote defensivo",
    posiciones: [
      { numero: 1, x: 5, y: 35, posicion: "POR" },
      { numero: 2, x: 20, y: 10, posicion: "LD" },
      { numero: 3, x: 20, y: 25, posicion: "DFC" },
      { numero: 4, x: 20, y: 45, posicion: "DFC" },
      { numero: 5, x: 20, y: 60, posicion: "LI" },
      { numero: 6, x: 32, y: 35, posicion: "MCD" },
      { numero: 7, x: 50, y: 8, posicion: "MD" },
      { numero: 8, x: 50, y: 25, posicion: "MC" },
      { numero: 9, x: 50, y: 45, posicion: "MC" },
      { numero: 10, x: 50, y: 62, posicion: "MI" },
      { numero: 11, x: 75, y: 35, posicion: "DC" },
    ]
  },
  "4-5-1": {
    nombre: "4-5-1 Compacto",
    descripcion: "Formación muy defensiva con un solo punta",
    posiciones: [
      { numero: 1, x: 5, y: 35, posicion: "POR" },
      { numero: 2, x: 20, y: 10, posicion: "LD" },
      { numero: 3, x: 20, y: 25, posicion: "DFC" },
      { numero: 4, x: 20, y: 45, posicion: "DFC" },
      { numero: 5, x: 20, y: 60, posicion: "LI" },
      { numero: 6, x: 40, y: 8, posicion: "MD" },
      { numero: 7, x: 38, y: 22, posicion: "MC" },
      { numero: 8, x: 38, y: 35, posicion: "MC" },
      { numero: 9, x: 38, y: 48, posicion: "MC" },
      { numero: 10, x: 40, y: 62, posicion: "MI" },
      { numero: 11, x: 70, y: 35, posicion: "DC" },
    ]
  },
  "3-4-3": {
    nombre: "3-4-3 Ultra Ofensivo",
    descripcion: "Formación muy ofensiva con tres delanteros",
    posiciones: [
      { numero: 1, x: 5, y: 35, posicion: "POR" },
      { numero: 2, x: 18, y: 18, posicion: "DFC" },
      { numero: 3, x: 18, y: 35, posicion: "DFC" },
      { numero: 4, x: 18, y: 52, posicion: "DFC" },
      { numero: 5, x: 40, y: 8, posicion: "CAD" },
      { numero: 6, x: 38, y: 28, posicion: "MC" },
      { numero: 7, x: 38, y: 42, posicion: "MC" },
      { numero: 8, x: 40, y: 62, posicion: "CAI" },
      { numero: 9, x: 65, y: 12, posicion: "ED" },
      { numero: 10, x: 70, y: 35, posicion: "DC" },
      { numero: 11, x: 65, y: 58, posicion: "EI" },
    ]
  },
};

// Formaciones Fútbol 7
export const FORMACIONES_FUTBOL7 = {
  "1-3-2": {
    nombre: "1-3-2",
    descripcion: "Formación equilibrada con 3 defensas y 2 delanteros",
    posiciones: [
      { numero: 1, x: 8, y: 35, posicion: "POR" },
      { numero: 2, x: 25, y: 15, posicion: "DFD" },
      { numero: 3, x: 25, y: 35, posicion: "DFC" },
      { numero: 4, x: 25, y: 55, posicion: "DFI" },
      { numero: 5, x: 55, y: 25, posicion: "MCD" },
      { numero: 6, x: 55, y: 45, posicion: "MCI" },
      { numero: 7, x: 75, y: 35, posicion: "DC" }
    ]
  },
  "2-3-1": {
    nombre: "2-3-1",
    descripcion: "Formación ofensiva con 3 mediocampistas",
    posiciones: [
      { numero: 1, x: 8, y: 35, posicion: "POR" },
      { numero: 2, x: 25, y: 25, posicion: "DFD" },
      { numero: 3, x: 25, y: 45, posicion: "DFI" },
      { numero: 4, x: 45, y: 15, posicion: "MCD" },
      { numero: 5, x: 45, y: 35, posicion: "MC" },
      { numero: 6, x: 45, y: 55, posicion: "MCI" },
      { numero: 7, x: 70, y: 35, posicion: "DC" }
    ]
  },
  "3-1-2": {
    nombre: "3-1-2",
    descripcion: "Formación defensiva con pivote",
    posiciones: [
      { numero: 1, x: 8, y: 35, posicion: "POR" },
      { numero: 2, x: 22, y: 15, posicion: "DFD" },
      { numero: 3, x: 22, y: 35, posicion: "DFC" },
      { numero: 4, x: 22, y: 55, posicion: "DFI" },
      { numero: 5, x: 45, y: 35, posicion: "PIV" },
      { numero: 6, x: 65, y: 25, posicion: "DCD" },
      { numero: 7, x: 65, y: 45, posicion: "DCI" }
    ]
  },
  "2-2-2": {
    nombre: "2-2-2",
    descripcion: "Formación simétrica y equilibrada",
    posiciones: [
      { numero: 1, x: 8, y: 35, posicion: "POR" },
      { numero: 2, x: 28, y: 25, posicion: "DFD" },
      { numero: 3, x: 28, y: 45, posicion: "DFI" },
      { numero: 4, x: 50, y: 25, posicion: "MCD" },
      { numero: 5, x: 50, y: 45, posicion: "MCI" },
      { numero: 6, x: 72, y: 25, posicion: "DCD" },
      { numero: 7, x: 72, y: 45, posicion: "DCI" }
    ]
  },
  "1-2-3": {
    nombre: "1-2-3",
    descripcion: "Formación muy ofensiva con 3 delanteros",
    posiciones: [
      { numero: 1, x: 8, y: 35, posicion: "POR" },
      { numero: 2, x: 25, y: 35, posicion: "LIB" },
      { numero: 3, x: 42, y: 22, posicion: "MCD" },
      { numero: 4, x: 42, y: 48, posicion: "MCI" },
      { numero: 5, x: 68, y: 15, posicion: "EXD" },
      { numero: 6, x: 68, y: 35, posicion: "DC" },
      { numero: 7, x: 68, y: 55, posicion: "EXI" }
    ]
  },
  "3-2-1": {
    nombre: "3-2-1",
    descripcion: "Formación muy defensiva con línea de 3",
    posiciones: [
      { numero: 1, x: 8, y: 35, posicion: "POR" },
      { numero: 2, x: 22, y: 15, posicion: "DFD" },
      { numero: 3, x: 22, y: 35, posicion: "DFC" },
      { numero: 4, x: 22, y: 55, posicion: "DFI" },
      { numero: 5, x: 48, y: 25, posicion: "MCD" },
      { numero: 6, x: 48, y: 45, posicion: "MCI" },
      { numero: 7, x: 72, y: 35, posicion: "DC" }
    ]
  }
};

export const COLORES_LINEA = [
  { nombre: "Blanco", valor: "#FFFFFF" },
  { nombre: "Amarillo", valor: "#FFEB3B" },
  { nombre: "Rojo", valor: "#F44336" },
  { nombre: "Azul", valor: "#2196F3" },
  { nombre: "Naranja", valor: "#FF9800" },
  { nombre: "Negro", valor: "#000000" },
];

export const TIPOS_LINEA = [
  { nombre: "Sólida", valor: "solida", icono: "—" },
  { nombre: "Flecha", valor: "flecha", icono: "→" },
  { nombre: "Punteada", valor: "punteada", icono: "···" },
];

// Formaciones de Baloncesto (5 jugadores)
export const FORMACIONES_BALONCESTO = {
  "1-2-2": {
    nombre: "1-2-2 Básico",
    descripcion: "Formación clásica con base arriba",
    posiciones: [
      { numero: 1, x: 50, y: 12, posicion: "Base" },
      { numero: 2, x: 30, y: 25, posicion: "Escolta" },
      { numero: 3, x: 70, y: 25, posicion: "Alero" },
      { numero: 4, x: 30, y: 42, posicion: "Ala-Pívot" },
      { numero: 5, x: 70, y: 42, posicion: "Pívot" },
    ]
  },
  "2-1-2": {
    nombre: "2-1-2",
    descripcion: "Dos arriba, pívot en el poste alto",
    posiciones: [
      { numero: 1, x: 35, y: 12, posicion: "Base" },
      { numero: 2, x: 65, y: 12, posicion: "Escolta" },
      { numero: 3, x: 50, y: 28, posicion: "Alero" },
      { numero: 4, x: 30, y: 45, posicion: "Ala-Pívot" },
      { numero: 5, x: 70, y: 45, posicion: "Pívot" },
    ]
  },
  "1-3-1": {
    nombre: "1-3-1",
    descripcion: "Formación con tres en línea",
    posiciones: [
      { numero: 1, x: 50, y: 10, posicion: "Base" },
      { numero: 2, x: 25, y: 28, posicion: "Escolta" },
      { numero: 3, x: 50, y: 28, posicion: "Alero" },
      { numero: 4, x: 75, y: 28, posicion: "Ala-Pívot" },
      { numero: 5, x: 50, y: 48, posicion: "Pívot" },
    ]
  },
  "2-3": {
    nombre: "2-3 Zona",
    descripcion: "Defensa zonal 2-3",
    posiciones: [
      { numero: 1, x: 35, y: 15, posicion: "Base" },
      { numero: 2, x: 65, y: 15, posicion: "Escolta" },
      { numero: 3, x: 25, y: 38, posicion: "Alero" },
      { numero: 4, x: 50, y: 45, posicion: "Ala-Pívot" },
      { numero: 5, x: 75, y: 38, posicion: "Pívot" },
    ]
  },
  "3-2": {
    nombre: "3-2 Zona",
    descripcion: "Defensa zonal 3-2",
    posiciones: [
      { numero: 1, x: 50, y: 12, posicion: "Base" },
      { numero: 2, x: 25, y: 22, posicion: "Escolta" },
      { numero: 3, x: 75, y: 22, posicion: "Alero" },
      { numero: 4, x: 35, y: 42, posicion: "Ala-Pívot" },
      { numero: 5, x: 65, y: 42, posicion: "Pívot" },
    ]
  },
  "1-4": {
    nombre: "1-4 Alto",
    descripcion: "Cuatro jugadores en línea alta",
    posiciones: [
      { numero: 1, x: 50, y: 10, posicion: "Base" },
      { numero: 2, x: 20, y: 28, posicion: "Escolta" },
      { numero: 3, x: 40, y: 28, posicion: "Alero" },
      { numero: 4, x: 60, y: 28, posicion: "Ala-Pívot" },
      { numero: 5, x: 80, y: 28, posicion: "Pívot" },
    ]
  },
  "horns": {
    nombre: "Horns (Cuernos)",
    descripcion: "Ataque con dos postes altos",
    posiciones: [
      { numero: 1, x: 50, y: 8, posicion: "Base" },
      { numero: 2, x: 20, y: 45, posicion: "Escolta" },
      { numero: 3, x: 80, y: 45, posicion: "Alero" },
      { numero: 4, x: 35, y: 22, posicion: "Ala-Pívot" },
      { numero: 5, x: 65, y: 22, posicion: "Pívot" },
    ]
  },
  "flex": {
    nombre: "Flex Offense",
    descripcion: "Sistema ofensivo Flex",
    posiciones: [
      { numero: 1, x: 50, y: 10, posicion: "Base" },
      { numero: 2, x: 20, y: 20, posicion: "Escolta" },
      { numero: 3, x: 80, y: 20, posicion: "Alero" },
      { numero: 4, x: 25, y: 45, posicion: "Ala-Pívot" },
      { numero: 5, x: 75, y: 45, posicion: "Pívot" },
    ]
  },
};