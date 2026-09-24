// Plantillas temáticas por época del año (Navidad, Halloween, Carnaval, fin de temporada, verano).
const baseCampos = [
  { id: "nombre_nino", tipo: "texto", etiqueta: "Nombre del niño/a", requerido: true, ancho: "half" },
  { id: "edad", tipo: "numero", etiqueta: "Edad", requerido: true, ancho: "half" },
  { id: "tutor", tipo: "texto", etiqueta: "Nombre del padre/madre/tutor", requerido: true, ancho: "full" },
  { id: "email", tipo: "email", etiqueta: "Email", requerido: true, ancho: "half" },
  { id: "telefono", tipo: "telefono", etiqueta: "Teléfono", requerido: true, ancho: "half" },
  { id: "acepta", tipo: "aceptacion", etiqueta: "Acepto la política de privacidad del club", requerido: true, ancho: "full" },
];

export const SEASONAL_TEMPLATES = [
  {
    id: "navidad",
    nombre: "Navidad y Reyes",
    descripcion: "Torneo navideño, visita de Papá Noel o de los Reyes Magos, chocolatada...",
    emoji: "🎄",
    tema: "cinematic",
    color: "from-red-600 to-green-700",
    config: {
      hero: {
        tipo: "gradient",
        color_primario: "#dc2626",
        color_secundario: "#15803d",
        titulo: "🎄 Navidad en el Club",
        subtitulo: "Torneo navideño, chocolatada y visita muy especial para los más peques",
        badge: "ESPECIAL NAVIDAD",
        cta_texto: "Apuntar a mi hijo/a",
        mostrar_cuenta_atras: true,
      },
      bloques: [
        { id: "b1", tipo: "stats", datos: { items: [{ numero: "🎅", etiqueta: "Visita sorpresa" }, { numero: "☕", etiqueta: "Chocolatada" }, { numero: "🎁", etiqueta: "Regalo para todos" }] } },
        { id: "b2", tipo: "texto", datos: { titulo: "¿Qué vamos a hacer?", contenido: "Una mañana de fútbol navideño con partidillos por categorías, chocolate con churros y una visita que les va a encantar. ¡Ven con gorro de Papá Noel!" } },
        { id: "b3", tipo: "lista_iconos", datos: { titulo: "Qué incluye", items: [
          { icono: "⚽", texto: "Partidillos navideños por edades" },
          { icono: "🎅", texto: "Foto con Papá Noel / Reyes Magos" },
          { icono: "☕", texto: "Chocolate con churros" },
          { icono: "🎁", texto: "Detalle del club para cada niño/a" },
        ] } },
      ],
      formulario: { titulo: "Apúntate a la Navidad del club", descripcion: "Rellena los datos de cada niño/a.", cta_envio: "Apuntar", mensaje_exito: "¡Apuntado! 🎄 Te enviaremos los detalles por email.", campos: baseCampos },
    },
  },
  {
    id: "halloween",
    nombre: "Halloween",
    descripcion: "Entrenamiento terrorífico con disfraces, concurso y truco o trato.",
    emoji: "🎃",
    tema: "cinematic",
    color: "from-orange-500 to-purple-800",
    config: {
      hero: {
        tipo: "gradient",
        color_primario: "#ea580c",
        color_secundario: "#581c87",
        titulo: "🎃 Entreno de Halloween",
        subtitulo: "Ven disfrazado y juega el partido más terrorífico del año",
        badge: "HALLOWEEN",
        cta_texto: "Me apunto",
        mostrar_cuenta_atras: true,
      },
      bloques: [
        { id: "b1", tipo: "texto", datos: { titulo: "¡Trae tu disfraz!", contenido: "Entrenamiento especial con juegos, circuito del terror y concurso de disfraces. Al final, truco o trato para todos." } },
        { id: "b2", tipo: "lista_iconos", datos: { titulo: "Qué habrá", items: [
          { icono: "👻", texto: "Circuito del terror con balón" },
          { icono: "🧛", texto: "Concurso de disfraces con premios" },
          { icono: "🍬", texto: "Truco o trato para todos" },
          { icono: "📸", texto: "Photocall terrorífico" },
        ] } },
      ],
      formulario: { titulo: "Apúntate si te atreves 👻", descripcion: "Datos del niño/a.", cta_envio: "Apuntar", mensaje_exito: "¡Apuntado! 🎃 Nos vemos disfrazados.", campos: baseCampos },
    },
  },
  {
    id: "carnaval",
    nombre: "Carnaval",
    descripcion: "Partido de disfraces, desfile y fiesta de colores.",
    emoji: "🎭",
    tema: "playful",
    color: "from-pink-500 to-yellow-400",
    config: {
      hero: {
        tipo: "gradient",
        color_primario: "#db2777",
        color_secundario: "#facc15",
        titulo: "🎭 Carnaval en el Club",
        subtitulo: "Disfraces, música y el partido más loco de la temporada",
        badge: "CARNAVAL",
        cta_texto: "Apuntar a mi hijo/a",
        mostrar_cuenta_atras: true,
      },
      bloques: [
        { id: "b1", tipo: "lista_iconos", datos: { titulo: "Plan de la fiesta", items: [
          { icono: "🎭", texto: "Desfile de disfraces por equipos" },
          { icono: "⚽", texto: "Partido disfrazados (¡padres contra hijos!)" },
          { icono: "🎶", texto: "Música y confeti" },
          { icono: "🏆", texto: "Premio al disfraz más original" },
        ] } },
      ],
      formulario: { titulo: "Apúntate al Carnaval", descripcion: "Datos del niño/a.", cta_envio: "Apuntar", mensaje_exito: "¡Apuntado! 🎭 ¡A preparar el disfraz!", campos: baseCampos },
    },
  },
  {
    id: "fin_temporada",
    nombre: "Fiesta Fin de Temporada",
    descripcion: "Entrega de medallas, partido padres vs hijos y comida de convivencia.",
    emoji: "🏅",
    tema: "stadium",
    color: "from-amber-400 to-orange-600",
    config: {
      hero: {
        tipo: "gradient",
        color_primario: "#f59e0b",
        color_secundario: "#ea580c",
        titulo: "🏅 Fiesta Fin de Temporada",
        subtitulo: "Celebramos juntos todo lo que hemos vivido este año",
        badge: "FIN DE TEMPORADA",
        cta_texto: "Confirmar asistencia",
        mostrar_cuenta_atras: true,
      },
      bloques: [
        { id: "b1", tipo: "horarios", datos: { titulo: "Programa", items: [
          { hora: "10:00", titulo: "Partidos padres vs hijos", descripcion: "" },
          { hora: "12:30", titulo: "Entrega de medallas y trofeos", descripcion: "" },
          { hora: "14:00", titulo: "Comida de convivencia", descripcion: "" },
        ] } },
      ],
      formulario: { titulo: "Confirma tu asistencia", descripcion: "Indica cuántos venís.", cta_envio: "Confirmar", mensaje_exito: "¡Genial! 🏅 Os esperamos.", campos: [
        { id: "familia", tipo: "texto", etiqueta: "Nombre de la familia", requerido: true, ancho: "full" },
        { id: "email", tipo: "email", etiqueta: "Email", requerido: true, ancho: "half" },
        { id: "personas", tipo: "numero", etiqueta: "Nº de personas", requerido: true, ancho: "half" },
        { id: "acepta", tipo: "aceptacion", etiqueta: "Acepto la política de privacidad del club", requerido: true, ancho: "full" },
      ] },
    },
  },
  {
    id: "campus_verano",
    nombre: "Campus de Verano",
    descripcion: "Semanas de campus con fútbol, piscina y actividades.",
    emoji: "☀️",
    tema: "playful",
    color: "from-sky-400 to-yellow-400",
    config: {
      hero: {
        tipo: "gradient",
        color_primario: "#0ea5e9",
        color_secundario: "#facc15",
        titulo: "☀️ Campus de Verano",
        subtitulo: "Fútbol, juegos, agua y muchos amigos este verano",
        badge: "PLAZAS LIMITADAS",
        cta_texto: "Reservar plaza",
        mostrar_cuenta_atras: true,
      },
      bloques: [
        { id: "b1", tipo: "stats", datos: { items: [{ numero: "4-14", etiqueta: "Años" }, { numero: "9-14h", etiqueta: "Horario" }, { numero: "Semanas", etiqueta: "Sueltas" }] } },
        { id: "b2", tipo: "lista_iconos", datos: { titulo: "Qué incluye", items: [
          { icono: "⚽", texto: "Entrenamientos técnicos por edades" },
          { icono: "💦", texto: "Juegos de agua" },
          { icono: "🥪", texto: "Almuerzo a media mañana" },
          { icono: "👕", texto: "Camiseta del campus" },
        ] } },
      ],
      formulario: { titulo: "Reserva tu plaza", descripcion: "Datos del niño/a y semanas que le interesan.", cta_envio: "Reservar", mensaje_exito: "¡Plaza solicitada! ☀️ Te confirmaremos por email.", campos: [
        ...baseCampos.slice(0, 5),
        { id: "semanas", tipo: "textarea", etiqueta: "¿Qué semanas te interesan?", requerido: false, ancho: "full" },
        baseCampos[5],
      ] },
    },
  },
];