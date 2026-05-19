// Plantillas pre-diseñadas brutales para el constructor.
// Cada plantilla define hero + bloques + formulario + branding base.

export const TEMPLATES = [
  {
    id: "evento_gratuito",
    nombre: "Evento Gratuito",
    descripcion: "Inscripción a eventos gratuitos (tipo San Isidro). Hero cinematográfico con cuenta atrás.",
    emoji: "🎪",
    tema: "cinematic",
    color: "from-orange-500 to-red-500",
    config: {
      hero: {
        tipo: "imagen",
        imagen_url: "https://images.unsplash.com/photo-1459865264687-595d652de67e?w=1600&q=80",
        titulo: "Nombre del Evento",
        subtitulo: "Una experiencia única organizada por el club",
        badge: "EVENTO GRATUITO",
        cta_texto: "Inscríbete gratis",
        mostrar_cuenta_atras: true,
        color_primario: "#ea580c",
      },
      bloques: [
        {
          id: "b1",
          tipo: "stats",
          datos: {
            items: [
              { numero: "200", etiqueta: "Plazas" },
              { numero: "Gratis", etiqueta: "Inscripción" },
              { numero: "Todas", etiqueta: "Edades" },
            ],
          },
        },
        {
          id: "b2",
          tipo: "texto",
          datos: {
            titulo: "¿De qué va?",
            contenido: "Describe aquí en qué consiste el evento. Cuenta la historia, qué van a vivir los participantes, por qué deberían apuntarse.",
          },
        },
        {
          id: "b3",
          tipo: "lista_iconos",
          datos: {
            titulo: "Qué incluye",
            items: [
              { icono: "🏆", texto: "Premios para los participantes" },
              { icono: "🥪", texto: "Almuerzo incluido" },
              { icono: "🎁", texto: "Bolsa regalo del club" },
              { icono: "📸", texto: "Fotos profesionales gratuitas" },
            ],
          },
        },
      ],
      formulario: {
        titulo: "Apúntate ahora",
        descripcion: "Rellena el formulario y recibirás confirmación por email.",
        cta_envio: "Inscribirme",
        mensaje_exito: "¡Inscripción recibida! Te enviaremos los detalles por email pronto.",
        campos: [
          { id: "nombre", tipo: "texto", etiqueta: "Nombre y apellidos", requerido: true, ancho: "full" },
          { id: "email", tipo: "email", etiqueta: "Email", requerido: true, ancho: "half" },
          { id: "telefono", tipo: "telefono", etiqueta: "Teléfono", requerido: true, ancho: "half" },
          { id: "edad", tipo: "numero", etiqueta: "Edad", requerido: false, ancho: "half" },
          { id: "acepta", tipo: "aceptacion", etiqueta: "Acepto la política de privacidad del club", requerido: true, ancho: "full" },
        ],
      },
    },
  },
  {
    id: "torneo_pago",
    nombre: "Torneo con Pago",
    descripcion: "Inscripción a torneos deportivos con cobro. Hero potente estilo estadio.",
    emoji: "🏆",
    tema: "stadium",
    color: "from-emerald-500 to-cyan-500",
    config: {
      hero: {
        tipo: "imagen",
        imagen_url: "https://images.unsplash.com/photo-1551958219-acbc608c6377?w=1600&q=80",
        titulo: "Torneo del Club",
        subtitulo: "Compite, diviértete y llévate los premios",
        badge: "INSCRIPCIONES ABIERTAS",
        cta_texto: "Apuntar mi equipo",
        mostrar_cuenta_atras: true,
        color_primario: "#10b981",
      },
      bloques: [
        {
          id: "b1",
          tipo: "stats",
          datos: {
            items: [
              { numero: "30€", etiqueta: "Por equipo" },
              { numero: "32", etiqueta: "Plazas" },
              { numero: "500€", etiqueta: "Premio 1º" },
            ],
          },
        },
        {
          id: "b2",
          tipo: "lista_iconos",
          datos: {
            titulo: "Qué incluye la inscripción",
            items: [
              { icono: "👕", texto: "Camiseta oficial del torneo" },
              { icono: "🍻", texto: "Tercer tiempo con catering" },
              { icono: "🏅", texto: "Trofeo para los ganadores" },
              { icono: "📸", texto: "Cobertura fotográfica" },
            ],
          },
        },
        {
          id: "b3",
          tipo: "faq",
          datos: {
            titulo: "Preguntas frecuentes",
            items: [
              { pregunta: "¿Cuándo se juega?", respuesta: "El sábado XX a partir de las 9:00h." },
              { pregunta: "¿Puedo pagar en efectivo?", respuesta: "Sí, contacta con el club tras la inscripción." },
              { pregunta: "¿Qué pasa si llueve?", respuesta: "Se reprograma sin coste adicional." },
            ],
          },
        },
      ],
      formulario: {
        titulo: "Apunta tu equipo",
        descripcion: "Rellena los datos del responsable del equipo.",
        cta_envio: "Inscribir equipo",
        mensaje_exito: "¡Inscripción recibida! Te contactaremos para confirmar el pago.",
        campos: [
          { id: "nombre_equipo", tipo: "texto", etiqueta: "Nombre del equipo", requerido: true, ancho: "full" },
          { id: "responsable", tipo: "texto", etiqueta: "Responsable", requerido: true, ancho: "full" },
          { id: "email", tipo: "email", etiqueta: "Email", requerido: true, ancho: "half" },
          { id: "telefono", tipo: "telefono", etiqueta: "Teléfono", requerido: true, ancho: "half" },
          { id: "num_jugadores", tipo: "numero", etiqueta: "Nº de jugadores", requerido: true, ancho: "half" },
          { id: "comentarios", tipo: "textarea", etiqueta: "Comentarios", requerido: false, ancho: "full" },
          { id: "acepta", tipo: "aceptacion", etiqueta: "Acepto la normativa del torneo", requerido: true, ancho: "full" },
        ],
      },
    },
  },
  {
    id: "captacion_interes",
    nombre: "Captación de Interés",
    descripcion: "Para medir interés antes de lanzar algo (categoría nueva, actividad, patrocinio…). Look editorial.",
    emoji: "🎯",
    tema: "editorial",
    color: "from-violet-500 to-fuchsia-500",
    config: {
      hero: {
        tipo: "gradient",
        color_primario: "#7c3aed",
        color_secundario: "#ec4899",
        titulo: "¿Te interesa?",
        subtitulo: "Estamos valorando lanzar esta iniciativa. Déjanos tus datos sin compromiso.",
        badge: "PRÓXIMAMENTE",
        cta_texto: "Apuntarme a la lista",
      },
      bloques: [
        {
          id: "b1",
          tipo: "texto",
          datos: {
            titulo: "Qué estamos preparando",
            contenido: "Cuenta brevemente qué quieres lanzar y por qué es interesante. Genera curiosidad.",
          },
        },
        {
          id: "b2",
          tipo: "lista_iconos",
          datos: {
            titulo: "¿Por qué dejarnos tu interés?",
            items: [
              { icono: "🎁", texto: "Acceso prioritario cuando lo lancemos" },
              { icono: "💰", texto: "Descuento exclusivo para los primeros" },
              { icono: "📧", texto: "Te avisamos en cuanto esté disponible" },
            ],
          },
        },
      ],
      formulario: {
        titulo: "Apúntate sin compromiso",
        descripcion: "Solo necesitamos saber que te interesa. Te avisaremos cuando esté listo.",
        cta_envio: "Me interesa",
        mensaje_exito: "¡Anotado! Te contactaremos cuando lancemos.",
        campos: [
          { id: "nombre", tipo: "texto", etiqueta: "Nombre", requerido: true, ancho: "full" },
          { id: "email", tipo: "email", etiqueta: "Email", requerido: true, ancho: "full" },
          { id: "telefono", tipo: "telefono", etiqueta: "Teléfono (opcional)", requerido: false, ancho: "full" },
          { id: "comentario", tipo: "textarea", etiqueta: "¿Algo que quieras decirnos?", requerido: false, ancho: "full" },
        ],
      },
    },
  },
  {
    id: "encuesta",
    nombre: "Encuesta",
    descripcion: "Recoge opiniones de socios, padres o jugadores. Limpio y enfocado.",
    emoji: "📋",
    tema: "playful",
    color: "from-blue-500 to-cyan-500",
    config: {
      hero: {
        tipo: "gradient",
        color_primario: "#3b82f6",
        color_secundario: "#06b6d4",
        titulo: "Tu opinión cuenta",
        subtitulo: "Ayúdanos a mejorar dedicando 2 minutos a esta encuesta.",
        badge: "ENCUESTA",
        cta_texto: "Empezar",
      },
      bloques: [],
      formulario: {
        titulo: "Cuéntanos qué piensas",
        descripcion: "Tus respuestas son anónimas si lo prefieres.",
        cta_envio: "Enviar respuestas",
        mensaje_exito: "¡Gracias por participar! 🙏",
        campos: [
          { id: "nombre", tipo: "texto", etiqueta: "Nombre (opcional)", requerido: false, ancho: "full" },
          { id: "valoracion", tipo: "radio", etiqueta: "¿Cómo valoras el club este año?", requerido: true, ancho: "full", opciones: ["Excelente", "Bien", "Regular", "Mejorable"] },
          { id: "que_mejoramos", tipo: "textarea", etiqueta: "¿Qué podríamos mejorar?", requerido: false, ancho: "full" },
          { id: "que_funcionando", tipo: "textarea", etiqueta: "¿Qué te gusta de cómo está funcionando?", requerido: false, ancho: "full" },
          { id: "recomendarias", tipo: "radio", etiqueta: "¿Recomendarías el club a otras familias?", requerido: true, ancho: "full", opciones: ["Sí, sin duda", "Probablemente", "No estoy seguro/a", "No"] },
        ],
      },
    },
  },
];

export const getTemplate = (id) => TEMPLATES.find((t) => t.id === id);