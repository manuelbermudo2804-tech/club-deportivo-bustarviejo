import React, { useState, useEffect, createContext, useContext } from "react";
import { base44 } from "@/api/base44Client";
import TutorialOverlay from "./TutorialOverlay";

// Tutorial definitions for each page
export const TUTORIALS = {
  // Parent Dashboard tutorial
  parent_dashboard: {
    id: "parent_dashboard",
    steps: [
      {
        icon: "🏠",
        iconBg: "bg-gradient-to-br from-orange-100 to-orange-200",
        title: "¡Bienvenido a tu Panel!",
        description: "Este es tu centro de control. Aquí verás todo lo importante sobre tus hijos en el club de un vistazo rápido.",
        tip: "Las alertas importantes aparecerán destacadas en rojo o amarillo"
      },
      {
        icon: "🔔",
        iconBg: "bg-gradient-to-br from-red-100 to-red-200",
        title: "Alertas y Acciones Urgentes",
        description: "Cuando haya algo pendiente (convocatorias, pagos, firmas...) verás alertas aquí arriba. ¡No te pierdas nada importante!",
        tip: "Pulsa en cada alerta para ir directamente a resolverla"
      },
      {
        icon: "📱",
        iconBg: "bg-gradient-to-br from-blue-100 to-blue-200",
        title: "Menú de Navegación",
        description: "Usa el menú (☰) para acceder a todas las secciones: pagos, convocatorias, chat con entrenadores, calendario y mucho más.",
        tip: "En móvil, el menú está arriba a la derecha"
      },
      {
        icon: "💬",
        iconBg: "bg-gradient-to-br from-green-100 to-green-200",
        title: "Comunicación Directa",
        description: "Puedes chatear directamente con los entrenadores de tus hijos. ¡Es la forma más rápida de comunicarte!",
        tip: "Los mensajes urgentes del club aparecerán destacados"
      },
      {
        icon: "🎉",
        iconBg: "bg-gradient-to-br from-purple-100 to-purple-200",
        title: "¡Ya estás listo!",
        description: "Explora la app y descubre todas las funcionalidades. Si tienes dudas, contacta con el club.",
        tip: "Puedes volver a ver este tutorial desde el menú de configuración"
      }
    ]
  },

  // Payments tutorial
  parent_payments: {
    id: "parent_payments",
    steps: [
      {
        icon: "💳",
        iconBg: "bg-gradient-to-br from-green-100 to-green-200",
        title: "Gestión de Pagos",
        description: "Aquí puedes ver todos los pagos de tus hijos, su estado y subir justificantes de transferencia o Bizum.",
        tip: "Los pagos pendientes aparecen en rojo, los pagados en verde"
      },
      {
        icon: "📄",
        iconBg: "bg-gradient-to-br from-blue-100 to-blue-200",
        title: "Subir Justificantes",
        description: "Cuando hagas una transferencia o Bizum, pulsa 'Subir justificante' y adjunta la captura de pantalla.",
        tip: "Acepta imágenes (JPG, PNG) y PDFs. ¡Así de fácil!"
      },
      {
        icon: "🏦",
        iconBg: "bg-gradient-to-br from-orange-100 to-orange-200",
        title: "Datos Bancarios",
        description: "Encontrarás el IBAN y el número de Bizum del club en la sección de pago. Usa el concepto indicado.",
        tip: "El concepto debe incluir el nombre del jugador para identificar el pago"
      },
      {
        icon: "✅",
        iconBg: "bg-gradient-to-br from-emerald-100 to-emerald-200",
        title: "Estado del Pago",
        description: "Tras subir el justificante, el estado cambiará a 'En revisión'. Cuando el club lo valide, aparecerá como 'Pagado'.",
        tip: "Recibirás una notificación cuando se confirme tu pago"
      }
    ]
  },

  // Callups tutorial
  parent_callups: {
    id: "parent_callups",
    steps: [
      {
        icon: "🏆",
        iconBg: "bg-gradient-to-br from-yellow-100 to-yellow-200",
        title: "Convocatorias de Partidos",
        description: "Cuando tu hijo sea convocado para un partido, recibirás una notificación y aparecerá aquí.",
        tip: "¡Es muy importante confirmar la asistencia lo antes posible!"
      },
      {
        icon: "✋",
        iconBg: "bg-gradient-to-br from-green-100 to-green-200",
        title: "Confirmar Asistencia",
        description: "Pulsa en la convocatoria y selecciona si tu hijo ASISTIRÁ, NO ASISTIRÁ o tiene DUDAS.",
        tip: "Puedes cambiar tu respuesta hasta 24h antes del partido"
      },
      {
        icon: "📍",
        iconBg: "bg-gradient-to-br from-blue-100 to-blue-200",
        title: "Detalles del Partido",
        description: "En cada convocatoria verás: rival, hora, lugar (con enlace a Maps), hora de concentración y equipación necesaria.",
        tip: "Pulsa en la ubicación para abrir Google Maps directamente"
      },
      {
        icon: "💬",
        iconBg: "bg-gradient-to-br from-purple-100 to-purple-200",
        title: "Añadir Comentarios",
        description: "Si tu hijo no puede asistir o tiene alguna circunstancia especial, puedes añadir un comentario al confirmar.",
        tip: "El entrenador verá tu comentario junto a la confirmación"
      }
    ]
  },

  // Players tutorial
  parent_players: {
    id: "parent_players",
    steps: [
      {
        icon: "👥",
        iconBg: "bg-gradient-to-br from-orange-100 to-orange-200",
        title: "Gestión de Jugadores",
        description: "Aquí puedes ver y gestionar la información de todos tus hijos inscritos en el club.",
        tip: "Pulsa en 'Registrar Jugador' para inscribir a un nuevo hijo"
      },
      {
        icon: "📝",
        iconBg: "bg-gradient-to-br from-blue-100 to-blue-200",
        title: "Editar Información",
        description: "Puedes actualizar teléfonos, emails y datos de contacto. Los datos deportivos solo puede modificarlos el club.",
        tip: "Pulsa en 'Editar' en la tarjeta del jugador"
      },
      {
        icon: "🎖️",
        iconBg: "bg-gradient-to-br from-yellow-100 to-yellow-200",
        title: "Logros y Progreso",
        description: "Debajo de cada jugador verás sus logros: asistencia, evaluaciones y reconocimientos del entrenador.",
        tip: "¡Motiva a tus hijos a conseguir todas las insignias!"
      },
      {
        icon: "👨‍👩‍👧‍👦",
        iconBg: "bg-gradient-to-br from-green-100 to-green-200",
        title: "Descuento por Hermanos",
        description: "Si tienes varios hijos en el club, los hermanos menores tienen 25€ de descuento automático.",
        tip: "Inscribe primero al hermano mayor para aplicar el descuento correctamente"
      }
    ]
  },

  // Chat tutorial
  parent_chat: {
    id: "parent_chat",
    steps: [
      {
        icon: "💬",
        iconBg: "bg-gradient-to-br from-blue-100 to-blue-200",
        title: "Chat del Equipo",
        description: "Este es el canal de comunicación con los entrenadores y el club. Aquí recibirás anuncios importantes.",
        tip: "Los mensajes nuevos aparecen marcados con un punto azul"
      },
      {
        icon: "📢",
        iconBg: "bg-gradient-to-br from-orange-100 to-orange-200",
        title: "Anuncios del Club",
        description: "Los entrenadores y el club publican aquí información importante: cambios de horario, recordatorios, eventos...",
        tip: "Los mensajes urgentes aparecen destacados en rojo"
      },
      {
        icon: "🔒",
        iconBg: "bg-gradient-to-br from-green-100 to-green-200",
        title: "Chat Privado",
        description: "También puedes iniciar conversaciones privadas con el entrenador para temas más personales.",
        tip: "Pulsa en el nombre del entrenador para abrir un chat privado"
      },
      {
        icon: "📎",
        iconBg: "bg-gradient-to-br from-purple-100 to-purple-200",
        title: "Enviar Archivos",
        description: "Puedes adjuntar imágenes y documentos a tus mensajes usando el botón de clip.",
        tip: "Útil para enviar justificantes médicos o documentos"
      }
    ]
  },

  // Federation signatures tutorial
  federation_signatures: {
    id: "federation_signatures",
    steps: [
      {
        icon: "🖊️",
        iconBg: "bg-gradient-to-br from-indigo-100 to-indigo-200",
        title: "Firmas de Federación",
        description: "Aquí encontrarás los enlaces para firmar digitalmente los documentos de federación de tus hijos.",
        tip: "Es obligatorio completar las firmas para poder jugar partidos oficiales"
      },
      {
        icon: "👆",
        iconBg: "bg-gradient-to-br from-blue-100 to-blue-200",
        title: "Proceso de Firma",
        description: "1. Pulsa 'Abrir enlace para firmar'\n2. Completa la firma digital en la web de la federación\n3. Vuelve aquí y marca como completada",
        tip: "Guarda el documento firmado por si lo necesitas más adelante"
      },
      {
        icon: "👨‍👩‍👧",
        iconBg: "bg-gradient-to-br from-green-100 to-green-200",
        title: "Firma del Tutor",
        description: "Si el jugador es menor de 18 años, también necesitará la firma del padre/madre/tutor legal.",
        tip: "Ambas firmas (jugador + tutor) deben completarse"
      },
      {
        icon: "✅",
        iconBg: "bg-gradient-to-br from-emerald-100 to-emerald-200",
        title: "Verificación",
        description: "Una vez completes las firmas, márcalas como completadas. El club las verificará.",
        tip: "Recibirás confirmación cuando todo esté correcto"
      }
    ]
  },

  // Admin home tutorial
  admin_home: {
    id: "admin_home",
    steps: [
      {
        icon: "🏠",
        iconBg: "bg-gradient-to-br from-orange-100 to-orange-200",
        title: "Panel de Administración",
        description: "Este es tu centro de control. Aquí tienes un resumen de todo lo importante del club.",
        tip: "Los números en rojo indican elementos que requieren atención"
      },
      {
        icon: "📊",
        iconBg: "bg-gradient-to-br from-blue-100 to-blue-200",
        title: "Estadísticas Rápidas",
        description: "Verás de un vistazo: jugadores activos, pagos pendientes, mensajes sin leer y convocatorias.",
        tip: "Pulsa en cada tarjeta para ir directamente a esa sección"
      },
      {
        icon: "🔔",
        iconBg: "bg-gradient-to-br from-red-100 to-red-200",
        title: "Alertas del Sistema",
        description: "Las alertas importantes aparecen destacadas: pagos atrasados, firmas pendientes, renovaciones...",
        tip: "Revisa las alertas diariamente para mantener todo al día"
      },
      {
        icon: "⚡",
        iconBg: "bg-gradient-to-br from-yellow-100 to-yellow-200",
        title: "Acciones Rápidas",
        description: "El menú lateral te da acceso a todas las funciones: jugadores, pagos, chat, calendario...",
        tip: "Usa la búsqueda global para encontrar cualquier cosa rápidamente"
      }
    ]
  },

  // Coach tutorial
  coach_home: {
    id: "coach_home",
    steps: [
      {
        icon: "🏃",
        iconBg: "bg-gradient-to-br from-green-100 to-green-200",
        title: "Panel de Entrenador",
        description: "Bienvenido a tu panel. Aquí gestionarás tus equipos, convocatorias y comunicación con las familias.",
        tip: "Las acciones más urgentes aparecen destacadas"
      },
      {
        icon: "📋",
        iconBg: "bg-gradient-to-br from-blue-100 to-blue-200",
        title: "Convocatorias",
        description: "Crea convocatorias para partidos, selecciona jugadores y recibe confirmaciones de las familias.",
        tip: "Las familias recibirán notificación automática al publicar"
      },
      {
        icon: "💬",
        iconBg: "bg-gradient-to-br from-purple-100 to-purple-200",
        title: "Chat con Familias",
        description: "Comunícate directamente con los padres de tus jugadores. Envía anuncios o responde consultas.",
        tip: "Los chats privados son solo visibles para ti y la familia"
      },
      {
        icon: "📊",
        iconBg: "bg-gradient-to-br from-orange-100 to-orange-200",
        title: "Evaluaciones",
        description: "Registra asistencia a entrenamientos y evalúa el progreso de cada jugador.",
        tip: "Las evaluaciones pueden compartirse con las familias"
      }
    ]
  }
};

const TutorialContext = createContext(null);

export function useTutorial() {
  return useContext(TutorialContext);
}

export function TutorialProvider({ children }) {
  const [activeTutorial, setActiveTutorial] = useState(null);
  const [user, setUser] = useState(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (error) {
        console.error("Error fetching user for tutorials:", error);
      }
      setIsReady(true);
    };
    fetchUser();
  }, []);

  const startTutorial = (tutorialId) => {
    if (!user || !TUTORIALS[tutorialId]) return;
    
    // Check if already completed
    const completed = user.tutorials_completados || {};
    if (completed[tutorialId]) return;
    
    setActiveTutorial(TUTORIALS[tutorialId]);
  };

  const checkAndStartTutorial = (tutorialId) => {
    if (!user || !TUTORIALS[tutorialId]) return false;
    
    const completed = user.tutorials_completados || {};
    if (completed[tutorialId]) return false;
    
    setActiveTutorial(TUTORIALS[tutorialId]);
    return true;
  };

  const closeTutorial = () => {
    setActiveTutorial(null);
  };

  const resetTutorial = async (tutorialId) => {
    if (!user) return;
    
    try {
      const completed = user.tutorials_completados || {};
      delete completed[tutorialId];
      await base44.auth.updateMe({ tutorials_completados: completed });
      setUser({ ...user, tutorials_completados: completed });
    } catch (error) {
      console.error("Error resetting tutorial:", error);
    }
  };

  const resetAllTutorials = async () => {
    if (!user) return;
    
    try {
      await base44.auth.updateMe({ tutorials_completados: {} });
      setUser({ ...user, tutorials_completados: {} });
    } catch (error) {
      console.error("Error resetting tutorials:", error);
    }
  };

  return (
    <TutorialContext.Provider value={{ 
      startTutorial, 
      checkAndStartTutorial,
      closeTutorial,
      resetTutorial,
      resetAllTutorials,
      isReady,
      user
    }}>
      {children}
      
      {activeTutorial && (
        <TutorialOverlay
          tutorialId={activeTutorial.id}
          steps={activeTutorial.steps}
          onComplete={closeTutorial}
          onSkip={closeTutorial}
        />
      )}
    </TutorialContext.Provider>
  );
}