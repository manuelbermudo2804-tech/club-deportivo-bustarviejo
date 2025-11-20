import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Users, Calendar, CreditCard, MessageCircle, ShoppingBag, 
  CheckCircle2, TrendingUp, Award, Settings, ChevronRight,
  Home, Bell, Image, Star, ClipboardCheck
} from "lucide-react";

const presentations = {
  padre: {
    title: "Bienvenido a tu Panel Familiar",
    subtitle: "Todo lo que necesitas para seguir a tus hijos en el club",
    color: "from-blue-600 to-blue-700",
    slides: [
      {
        icon: Calendar,
        title: "📅 Calendario Completo",
        description: "Ve todos los partidos, entrenamientos y eventos. Exporta a tu móvil para recibir recordatorios automáticos.",
        features: ["Partidos y horarios", "Exportar a Google/Apple Calendar", "Notificaciones automáticas"]
      },
      {
        icon: Bell,
        title: "🏆 Convocatorias",
        description: "Recibe las convocatorias de partidos y confirma la asistencia de tus hijos con un solo click.",
        features: ["Notificación instantánea", "Confirmación fácil", "Ver lista completa"]
      },
      {
        icon: CreditCard,
        title: "💰 Pagos Simplificados",
        description: "Sube justificantes de pago, consulta el estado y recibe recordatorios automáticos de las cuotas.",
        features: ["Subir justificantes", "Ver historial", "Recordatorios automáticos"]
      },
      {
        icon: MessageCircle,
        title: "💬 Chat Directo",
        description: "Comunícate con los entrenadores y recibe anuncios importantes del club al instante.",
        features: ["Mensajes con entrenadores", "Anuncios del club", "Notificaciones push"]
      },
      {
        icon: ShoppingBag,
        title: "🛍️ Pedidos de Ropa",
        description: "Pide la equipación oficial del club para tus hijos de forma fácil y rápida.",
        features: ["Packs completos", "Tallas personalizadas", "Entrega en el club"]
      }
    ]
  },
  entrenador: {
    title: "Panel de Entrenador",
    subtitle: "Gestiona tu equipo de forma profesional",
    color: "from-green-600 to-green-700",
    slides: [
      {
        icon: Users,
        title: "👥 Tu Plantilla",
        description: "Accede a la información completa de tus jugadores: datos, contactos y estadísticas.",
        features: ["Lista completa de jugadores", "Datos de contacto", "Historial deportivo"]
      },
      {
        icon: CheckCircle2,
        title: "📋 Asistencia Digital",
        description: "Pasa lista en cada entrenamiento de forma rápida y mantén un registro automático.",
        features: ["Lista rápida", "Registro automático", "Estadísticas de asistencia"]
      },
      {
        icon: Star,
        title: "⭐ Evaluaciones",
        description: "Evalúa el progreso de cada jugador en aspectos técnicos, tácticos y actitudinales.",
        features: ["Evaluación completa", "Seguimiento individual", "Reportes para familias"]
      },
      {
        icon: Bell,
        title: "🎓 Convocatorias",
        description: "Crea convocatorias para partidos y recibe confirmaciones automáticas de las familias.",
        features: ["Crear listas", "Confirmación automática", "Notificaciones a familias"]
      },
      {
        icon: MessageCircle,
        title: "💬 Comunicación",
        description: "Canal directo con las familias de tu equipo para mantener una comunicación fluida.",
        features: ["Chat de equipo", "Mensajes individuales", "Anuncios importantes"]
      }
    ]
  },
  coordinador: {
    title: "Panel de Coordinación",
    subtitle: "Supervisión y control deportivo del club",
    color: "from-cyan-600 to-cyan-700",
    slides: [
      {
        icon: TrendingUp,
        title: "📊 Vista Global",
        description: "Supervisa todas las categorías del club desde un único panel centralizado.",
        features: ["Todos los equipos", "Estadísticas globales", "Control centralizado"]
      },
      {
        icon: ClipboardCheck,
        title: "📋 Reportes Completos",
        description: "Accede a reportes detallados de asistencia y evaluaciones de todos los entrenadores.",
        features: ["Asistencia por categoría", "Evaluaciones consolidadas", "Tendencias y gráficas"]
      },
      {
        icon: Users,
        title: "👥 Gestión de Entrenadores",
        description: "Coordina el trabajo de todos los entrenadores y asegura la calidad del entrenamiento.",
        features: ["Supervisión de plantillas", "Apoyo técnico", "Coordinación general"]
      },
      {
        icon: Calendar,
        title: "📅 Calendario Maestro",
        description: "Vista completa de todos los eventos, partidos y entrenamientos del club.",
        features: ["Todos los horarios", "Evitar solapamientos", "Planificación estratégica"]
      },
      {
        icon: MessageCircle,
        title: "💬 Canal de Coordinación",
        description: "Comunícate con todos los entrenadores para alinear estrategias y resolver dudas.",
        features: ["Chat con entrenadores", "Reuniones virtuales", "Anuncios técnicos"]
      }
    ]
  },
  admin: {
    title: "Panel de Administración",
    subtitle: "Control total del club",
    color: "from-orange-600 to-orange-700",
    slides: [
      {
        icon: Users,
        title: "👥 Gestión de Jugadores",
        description: "Control completo de altas, bajas, renovaciones y datos de todos los jugadores del club.",
        features: ["Inscripciones", "Renovaciones", "Base de datos completa"]
      },
      {
        icon: CreditCard,
        title: "💰 Control Financiero",
        description: "Gestiona pagos, recordatorios automáticos y lleva un control exhaustivo de las finanzas.",
        features: ["Pagos y cuotas", "Recordatorios escalonados", "Reconciliación bancaria"]
      },
      {
        icon: Calendar,
        title: "📅 Calendario y Eventos",
        description: "Crea y gestiona todos los eventos del club: partidos, entrenamientos y actividades.",
        features: ["Eventos ilimitados", "Notificaciones masivas", "Vista de todas las categorías"]
      },
      {
        icon: Bell,
        title: "📢 Comunicación Masiva",
        description: "Envía anuncios importantes a todas las familias o grupos específicos del club.",
        features: ["Anuncios dirigidos", "Email automático", "Chat de grupos"]
      },
      {
        icon: Settings,
        title: "⚙️ Configuración Global",
        description: "Gestiona temporadas, cuotas, categorías y todos los aspectos administrativos del club.",
        features: ["Reinicio de temporada", "Cuotas personalizadas", "Gestión de usuarios"]
      }
    ]
  }
};

export default function RolePresentation({ userRole, onComplete }) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const presentation = presentations[userRole] || presentations.padre;
  const totalSlides = presentation.slides.length;

  useEffect(() => {
    const hasSeenPresentation = localStorage.getItem(`presentation_seen_${userRole}`);
    if (hasSeenPresentation) {
      onComplete();
    }
  }, [userRole, onComplete]);

  const handleNext = () => {
    if (currentSlide < totalSlides - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      localStorage.setItem(`presentation_seen_${userRole}`, 'true');
      onComplete();
    }
  };

  const handleSkip = () => {
    localStorage.setItem(`presentation_seen_${userRole}`, 'true');
    onComplete();
  };

  const currentSlideData = presentation.slides[currentSlide];
  const Icon = currentSlideData.icon;

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className={`text-4xl font-bold bg-gradient-to-r ${presentation.color} bg-clip-text text-transparent mb-2`}>
            {presentation.title}
          </h1>
          <p className="text-slate-400 text-lg">{presentation.subtitle}</p>
        </motion.div>

        {/* Slide Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="border-none shadow-2xl bg-white/95 backdrop-blur">
              <CardContent className="p-8">
                <div className="flex flex-col items-center text-center space-y-6">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: "spring" }}
                    className={`w-24 h-24 rounded-full bg-gradient-to-r ${presentation.color} flex items-center justify-center shadow-lg`}
                  >
                    <Icon className="w-12 h-12 text-white" />
                  </motion.div>

                  <motion.h2
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="text-3xl font-bold text-slate-900"
                  >
                    {currentSlideData.title}
                  </motion.h2>

                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="text-lg text-slate-600 max-w-2xl"
                  >
                    {currentSlideData.description}
                  </motion.p>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="w-full max-w-md space-y-3 mt-6"
                  >
                    {currentSlideData.features.map((feature, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.6 + index * 0.1 }}
                        className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg"
                      >
                        <CheckCircle2 className={`w-5 h-5 bg-gradient-to-r ${presentation.color} text-white rounded-full flex-shrink-0`} />
                        <span className="text-slate-700">{feature}</span>
                      </motion.div>
                    ))}
                  </motion.div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>

        {/* Progress & Navigation */}
        <div className="mt-8 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={handleSkip}
            className="text-slate-400 hover:text-white"
          >
            Saltar presentación
          </Button>

          <div className="flex gap-2">
            {Array.from({ length: totalSlides }).map((_, index) => (
              <div
                key={index}
                className={`h-2 rounded-full transition-all ${
                  index === currentSlide
                    ? `w-8 bg-gradient-to-r ${presentation.color}`
                    : 'w-2 bg-slate-600'
                }`}
              />
            ))}
          </div>

          <Button
            onClick={handleNext}
            className={`bg-gradient-to-r ${presentation.color} hover:opacity-90 text-white font-semibold`}
          >
            {currentSlide < totalSlides - 1 ? (
              <>
                Siguiente
                <ChevronRight className="w-5 h-5 ml-1" />
              </>
            ) : (
              <>
                ¡Empezar!
                <CheckCircle2 className="w-5 h-5 ml-1" />
              </>
            )}
          </Button>
        </div>

        {/* Slide Counter */}
        <div className="text-center mt-4 text-slate-400 text-sm">
          {currentSlide + 1} de {totalSlides}
        </div>
      </div>
    </div>
  );
}