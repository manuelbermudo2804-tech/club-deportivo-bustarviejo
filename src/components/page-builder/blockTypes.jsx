// Catálogo de bloques disponibles en el constructor.
// Cada bloque incluye su tipo, nombre, emoji y datos por defecto.

export const BLOCK_CATALOG = [
  {
    tipo: "texto",
    nombre: "Texto",
    emoji: "📝",
    descripcion: "Título + párrafo centrado",
    datosDefault: { titulo: "Título de sección", contenido: "Escribe aquí el contenido…" },
  },
  {
    tipo: "stats",
    nombre: "Estadísticas",
    emoji: "📊",
    descripcion: "Números grandes con etiquetas",
    datosDefault: {
      items: [
        { numero: "100", etiqueta: "Plazas" },
        { numero: "30€", etiqueta: "Precio" },
        { numero: "★★★★★", etiqueta: "Valoración" },
      ],
    },
  },
  {
    tipo: "lista_iconos",
    nombre: "Lista con iconos",
    emoji: "✨",
    descripcion: "Beneficios o características",
    datosDefault: {
      titulo: "Qué incluye",
      items: [
        { icono: "🎁", texto: "Primer beneficio" },
        { icono: "⚡", texto: "Segundo beneficio" },
        { icono: "🏆", texto: "Tercer beneficio" },
      ],
    },
  },
  {
    tipo: "faq",
    nombre: "Preguntas frecuentes",
    emoji: "❓",
    descripcion: "Acordeón de preguntas/respuestas",
    datosDefault: {
      titulo: "Preguntas frecuentes",
      items: [
        { pregunta: "¿Cómo funciona?", respuesta: "Explica aquí…" },
        { pregunta: "¿Tiene coste?", respuesta: "Explica aquí…" },
      ],
    },
  },
  {
    tipo: "galeria",
    nombre: "Galería de imágenes",
    emoji: "🖼️",
    descripcion: "Cuadrícula de fotos",
    datosDefault: { titulo: "", items: [] },
  },
  {
    tipo: "imagen",
    nombre: "Imagen única",
    emoji: "📷",
    descripcion: "Imagen grande destacada",
    datosDefault: { url: "", alt: "", pie: "" },
  },
  {
    tipo: "video",
    nombre: "Video (YouTube/Vimeo)",
    emoji: "🎬",
    descripcion: "Embed de video",
    datosDefault: { url: "" },
  },
  {
    tipo: "mapa",
    nombre: "Mapa",
    emoji: "📍",
    descripcion: "Mapa de Google Maps embebido",
    datosDefault: { titulo: "Cómo llegar", direccion: "", embed_url: "" },
  },
  {
    tipo: "testimonios",
    nombre: "Testimonios",
    emoji: "💬",
    descripcion: "Opiniones de personas",
    datosDefault: {
      titulo: "Lo que dicen de nosotros",
      items: [
        { texto: "Una experiencia increíble.", nombre: "Persona", rol: "Socio", avatar: "" },
      ],
    },
  },
  {
    tipo: "tabla_precios",
    nombre: "Tabla de precios",
    emoji: "💰",
    descripcion: "Planes con precios y features",
    datosDefault: {
      titulo: "Tarifas",
      items: [
        { nombre: "Básico", precio: "15€", unidad: "/mes", descripcion: "", features: ["Feature 1", "Feature 2"], destacado: false },
        { nombre: "Pro", precio: "30€", unidad: "/mes", descripcion: "El más popular", features: ["Todo lo anterior", "Feature extra"], destacado: true },
      ],
    },
  },
  {
    tipo: "contacto",
    nombre: "Contacto",
    emoji: "📞",
    descripcion: "Una o varias personas de contacto (teléfono, email, WhatsApp)",
    datosDefault: {
      titulo: "Contáctanos",
      subtitulo: "Estamos aquí para ayudarte",
      personas: [
        { nombre: "", rol: "", telefono: "", email: "", whatsapp: "" },
      ],
      direccion: "",
      horario: "",
    },
  },
  {
    tipo: "cta_button",
    nombre: "Botón CTA",
    emoji: "🔘",
    descripcion: "Botón grande destacado",
    datosDefault: { texto: "Apuntarme ahora", url: "#formulario" },
  },
  {
    tipo: "divisor",
    nombre: "Separador",
    emoji: "➖",
    descripcion: "Línea sutil",
    datosDefault: {},
  },
  {
    tipo: "countdown",
    nombre: "Cuenta atrás",
    emoji: "⏰",
    descripcion: "Temporizador hasta una fecha",
    datosDefault: {
      titulo: "Faltan",
      fecha: "",
      mensaje_fin: "¡Ha llegado el momento!",
    },
  },
  {
    tipo: "sponsors",
    nombre: "Patrocinadores",
    emoji: "🤝",
    descripcion: "Rejilla de logos",
    datosDefault: {
      titulo: "Con el apoyo de",
      items: [],
    },
  },
  {
    tipo: "equipos",
    nombre: "Equipos / Participantes",
    emoji: "🏆",
    descripcion: "Carrusel de equipos",
    datosDefault: {
      titulo: "Equipos participantes",
      items: [],
    },
  },
  {
    tipo: "horarios",
    nombre: "Horarios / Agenda",
    emoji: "📅",
    descripcion: "Tabla de horarios",
    datosDefault: {
      titulo: "Programa",
      items: [
        { hora: "10:00", titulo: "Apertura", descripcion: "Recepción de participantes" },
        { hora: "11:00", titulo: "Inicio", descripcion: "" },
      ],
    },
  },
  {
    tipo: "torneo",
    nombre: "Torneo en vivo",
    emoji: "🏆",
    descripcion: "Clasificación de grupos + cuadros Oro/Plata, en directo",
    datosDefault: {
      slug: "",
      titulo: "",
    },
  },
  {
    tipo: "embed",
    nombre: "Embed HTML / iframe",
    emoji: "🔌",
    descripcion: "Insertar widget externo",
    datosDefault: {
      titulo: "",
      html: "",
      altura: 400,
    },
  },
];

export const getBlockMeta = (tipo) => BLOCK_CATALOG.find((b) => b.tipo === tipo);