// Formaciones tácticas predefinidas con posiciones (x, y en porcentaje del campo)
// El campo es 100x70, con la portería propia a la izquierda

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