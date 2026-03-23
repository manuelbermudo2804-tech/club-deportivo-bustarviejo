import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, Maximize, Minimize } from "lucide-react";

const CLUB_LOGO = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/e3f0a8e26_logo_cd_bustarviejo_mediano.jpg";

const slides = [
  {
    id: "welcome",
    bg: "from-orange-600 via-orange-700 to-green-700",
    content: (
      <div className="flex flex-col items-center justify-center h-full text-white text-center px-8">
        <img src={CLUB_LOGO} alt="CD Bustarviejo" className="w-32 h-32 rounded-full border-4 border-white/40 shadow-2xl mb-8" />
        <h1 className="text-5xl md:text-7xl font-black mb-4 drop-shadow-lg">CD Bustarviejo</h1>
        <p className="text-2xl md:text-3xl font-light opacity-90 mb-2">App del Club — Temporada 2025/2026</p>
        <p className="text-lg md:text-xl opacity-70 mt-6">Reunión de Familias</p>
        <div className="mt-12 animate-bounce opacity-60 text-sm">Pulsa → para avanzar</div>
      </div>
    ),
  },
  {
    id: "free",
    bg: "from-green-600 to-emerald-800",
    content: (
      <div className="flex flex-col items-center justify-center h-full text-white text-center px-8 max-w-4xl mx-auto">
        <div className="text-7xl mb-6">🆓</div>
        <h2 className="text-4xl md:text-6xl font-black mb-4">La app es 100% GRATUITA</h2>
        <p className="text-xl md:text-2xl opacity-90 mb-8">No cuesta nada. Ni ahora ni nunca.</p>
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 max-w-2xl w-full border border-white/10 mb-8">
          <p className="text-lg leading-relaxed">El club ha invertido en esta herramienta para <strong>facilitar la gestión a todas las familias</strong>. Solo necesitas tu móvil y tu email.</p>
        </div>
        <div className="bg-red-500/20 border border-red-400/30 rounded-xl p-5 max-w-2xl w-full">
          <p className="text-sm font-bold">⚠️ Es FUNDAMENTAL que todas las familias la usen. Sin ella, no podemos gestionar el club correctamente.</p>
        </div>
      </div>
    ),
  },
  {
    id: "why",
    bg: "from-slate-900 to-slate-800",
    content: (
      <div className="flex flex-col items-center justify-center h-full text-white text-center px-8 max-w-4xl mx-auto">
        <div className="text-6xl mb-6">🔄</div>
        <h2 className="text-4xl md:text-5xl font-black mb-4">Sustituye a TODO esto</h2>
        <p className="text-xl opacity-80 mb-8">Una sola app en vez de muchas herramientas distintas</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl">
          {[
            { icon: "💬", old: "Grupos de WhatsApp", now: "Chat integrado por categoría" },
            { icon: "📧", old: "Emails y circulares", now: "Anuncios y notificaciones al instante" },
            { icon: "📊", old: "Hojas de Excel", now: "Pagos, asistencia y datos automáticos" },
            { icon: "📝", old: "Google Forms / papeles", now: "Inscripciones y formularios digitales" },
            { icon: "📅", old: "Calendarios dispersos", now: "Calendario unificado del club" },
            { icon: "📞", old: "Llamadas y mensajes sueltos", now: "Chat directo con entrenador/coordinador" },
          ].map((item, i) => (
            <div key={i} className="bg-white/10 backdrop-blur-sm rounded-xl p-5 text-left border border-white/10">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">{item.icon}</span>
                <span className="text-red-400 line-through text-sm">{item.old}</span>
              </div>
              <p className="text-green-400 font-bold text-sm">✅ {item.now}</p>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    id: "screenshots",
    bg: "from-gray-900 to-gray-800",
    content: (
      <div className="flex flex-col items-center justify-center h-full text-white text-center px-8 max-w-5xl mx-auto">
        <div className="text-6xl mb-4">📸</div>
        <h2 className="text-3xl md:text-5xl font-black mb-6">Así se ve la app por dentro</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
          {[
            { label: "Panel principal", url: "https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=300&h=500&fit=crop" },
            { label: "Convocatorias", url: "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=300&h=500&fit=crop" },
            { label: "Chat de equipo", url: "https://images.unsplash.com/photo-1577563908411-5077b6dc7624?w=300&h=500&fit=crop" },
            { label: "Calendario", url: "https://images.unsplash.com/photo-1506784983877-45594efa4cbe?w=300&h=500&fit=crop" },
          ].map((item, i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <div className="bg-white/10 rounded-2xl border-2 border-white/20 overflow-hidden shadow-2xl" style={{aspectRatio:'9/16', width:'100%', maxWidth:200}}>
                <img src={item.url} alt={item.label} className="w-full h-full object-cover" />
              </div>
              <span className="text-xs font-bold opacity-70">{item.label}</span>
            </div>
          ))}
        </div>
        <p className="text-xs opacity-50 mt-4">Imágenes de referencia — la app real se verá en la demo en vivo</p>
      </div>
    ),
  },
  {
    id: "install",
    bg: "from-blue-600 to-blue-800",
    content: (
      <div className="flex flex-col items-center justify-center h-full text-white text-center px-8 max-w-4xl mx-auto">
        <div className="text-6xl mb-6">📱</div>
        <h2 className="text-4xl md:text-5xl font-black mb-4">Instalar la App</h2>
        <p className="text-xl opacity-80 mb-8">NO es una app de tienda — se instala desde el navegador</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-3xl">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/10">
            <div className="text-4xl mb-4">🍎</div>
            <h3 className="font-bold text-xl mb-4">iPhone / iPad</h3>
            <ol className="text-left space-y-3 text-sm">
              <li className="flex gap-2"><span className="font-bold text-blue-300">1.</span> Abrir Safari (obligatorio Safari)</li>
              <li className="flex gap-2"><span className="font-bold text-blue-300">2.</span> Ir al enlace de la app</li>
              <li className="flex gap-2"><span className="font-bold text-blue-300">3.</span> Pulsar el icono de compartir ⬆️</li>
              <li className="flex gap-2"><span className="font-bold text-blue-300">4.</span> "Añadir a pantalla de inicio"</li>
              <li className="flex gap-2"><span className="font-bold text-blue-300">5.</span> Confirmar → ¡Listo!</li>
            </ol>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/10">
            <div className="text-4xl mb-4">🤖</div>
            <h3 className="font-bold text-xl mb-4">Android</h3>
            <ol className="text-left space-y-3 text-sm">
              <li className="flex gap-2"><span className="font-bold text-green-300">1.</span> Abrir Chrome</li>
              <li className="flex gap-2"><span className="font-bold text-green-300">2.</span> Ir al enlace de la app</li>
              <li className="flex gap-2"><span className="font-bold text-green-300">3.</span> Pulsar los 3 puntos ⋮</li>
              <li className="flex gap-2"><span className="font-bold text-green-300">4.</span> "Instalar aplicación"</li>
              <li className="flex gap-2"><span className="font-bold text-green-300">5.</span> Confirmar → ¡Listo!</li>
            </ol>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "register",
    bg: "from-emerald-600 to-emerald-800",
    content: (
      <div className="flex flex-col items-center justify-center h-full text-white text-center px-8 max-w-4xl mx-auto">
        <div className="text-6xl mb-6">👨‍👩‍👧</div>
        <h2 className="text-4xl md:text-5xl font-black mb-4">Registro y Alta de Hijos</h2>
        <p className="text-xl opacity-80 mb-8">Proceso sencillo paso a paso</p>
        <div className="flex flex-col gap-4 w-full max-w-2xl">
          {[
            { step: "1", title: "Entrar con tu email", desc: "Se te envía un código — sin contraseña" },
            { step: "2", title: "Seleccionar tipo de usuario", desc: "Familia, Jugador +18, etc." },
            { step: "3", title: "Verificar código de acceso", desc: "Te lo dará el club para confirmar identidad" },
            { step: "4", title: "Registrar a tus hijos", desc: "Datos personales, foto tipo carnet, documentos" },
            { step: "5", title: "Elegir categoría y pagar", desc: "Cuota única o fraccionada en 3 meses" },
          ].map((item, i) => (
            <div key={i} className="bg-white/10 backdrop-blur-sm rounded-xl p-5 flex items-center gap-5 text-left border border-white/10">
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-2xl font-black flex-shrink-0">{item.step}</div>
              <div>
                <h3 className="font-bold text-lg">{item.title}</h3>
                <p className="text-sm opacity-80">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    id: "callups",
    bg: "from-amber-600 to-red-700",
    content: (
      <div className="flex flex-col items-center justify-center h-full text-white text-center px-8 max-w-4xl mx-auto">
        <div className="text-6xl mb-6">🏆</div>
        <h2 className="text-4xl md:text-5xl font-black mb-4">Convocatorias</h2>
        <p className="text-xl opacity-80 mb-8">El entrenador convoca → tú confirmas</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-3xl">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
            <div className="text-4xl mb-3">📩</div>
            <h3 className="font-bold mb-2">Te llega aviso</h3>
            <p className="text-sm opacity-80">Notificación cuando tu hijo es convocado a un partido</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
            <div className="text-4xl mb-3">✅</div>
            <h3 className="font-bold mb-2">Confirmas asistencia</h3>
            <p className="text-sm opacity-80">"Asistirá", "No asistirá" o "Duda" — con un solo toque</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
            <div className="text-4xl mb-3">🚗</div>
            <h3 className="font-bold mb-2">Transporte compartido</h3>
            <p className="text-sm opacity-80">Ofrece o pide plazas de coche para partidos fuera</p>
          </div>
        </div>
        <div className="mt-8 bg-white/10 backdrop-blur-sm rounded-xl p-5 max-w-2xl border border-white/10">
          <p className="text-sm">💡 <strong>Importante:</strong> Confirma siempre lo antes posible para que el entrenador pueda planificar el equipo.</p>
        </div>
      </div>
    ),
  },
  {
    id: "payments",
    bg: "from-purple-700 to-indigo-800",
    content: (
      <div className="flex flex-col items-center justify-center h-full text-white text-center px-8 max-w-4xl mx-auto">
        <div className="text-6xl mb-6">💳</div>
        <h2 className="text-4xl md:text-5xl font-black mb-4">Pagos y Cuotas</h2>
        <p className="text-xl opacity-80 mb-8">Transparente y sencillo</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10 text-left">
            <h3 className="font-bold text-lg mb-3">💰 Formas de pago</h3>
            <ul className="space-y-2 text-sm">
              <li>✅ <strong>Pago único</strong> — toda la cuota de una vez</li>
              <li>✅ <strong>3 plazos</strong> — Junio, Septiembre, Diciembre</li>
            </ul>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10 text-left">
            <h3 className="font-bold text-lg mb-3">📄 Proceso</h3>
            <ul className="space-y-2 text-sm">
              <li>1️⃣ Selecciona el pago pendiente</li>
              <li>2️⃣ Paga por transferencia o tarjeta</li>
              <li>3️⃣ Sube el justificante (si es transferencia)</li>
              <li>4️⃣ El club lo valida automáticamente</li>
            </ul>
          </div>
        </div>
        <div className="mt-6 bg-yellow-500/20 backdrop-blur-sm rounded-xl p-4 max-w-2xl border border-yellow-400/30">
          <p className="text-sm">⚠️ Los jugadores con pagos pendientes pueden quedar excluidos de convocatorias.</p>
        </div>
      </div>
    ),
  },
  {
    id: "chat",
    bg: "from-cyan-600 to-teal-700",
    content: (
      <div className="flex flex-col items-center justify-center h-full text-white text-center px-8 max-w-4xl mx-auto">
        <div className="text-6xl mb-6">💬</div>
        <h2 className="text-4xl md:text-5xl font-black mb-4">Comunicación</h2>
        <p className="text-xl opacity-80 mb-8">3 canales para estar siempre conectados</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-3xl">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
            <div className="text-4xl mb-3">⚽</div>
            <h3 className="font-bold mb-2">Chat de Equipo</h3>
            <p className="text-sm opacity-80">Grupal con el entrenador y familias de la categoría</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
            <div className="text-4xl mb-3">🎓</div>
            <h3 className="font-bold mb-2">Chat Coordinador</h3>
            <p className="text-sm opacity-80">Privado 1-a-1 con el coordinador para temas personales</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
            <div className="text-4xl mb-3">🔔</div>
            <h3 className="font-bold mb-2">Mensajes del Club</h3>
            <p className="text-sm opacity-80">Avisos oficiales, anuncios importantes y recordatorios</p>
          </div>
        </div>
        <div className="mt-8 bg-white/10 backdrop-blur-sm rounded-xl p-5 max-w-2xl border border-white/10">
          <p className="text-sm">📢 Los <strong>anuncios</strong> aparecen destacados en la pantalla principal. Los urgentes también llegan por email.</p>
        </div>
      </div>
    ),
  },
  {
    id: "calendar",
    bg: "from-rose-600 to-pink-800",
    content: (
      <div className="flex flex-col items-center justify-center h-full text-white text-center px-8 max-w-4xl mx-auto">
        <div className="text-6xl mb-6">📅</div>
        <h2 className="text-4xl md:text-5xl font-black mb-4">Calendario y Eventos</h2>
        <p className="text-xl opacity-80 mb-8">Todo lo que pasa en el club, en un vistazo</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl">
          {[
            { icon: "⏰", title: "Horarios de entrenamiento", desc: "Días, horas y lugar de cada categoría" },
            { icon: "⚽", title: "Partidos", desc: "Próximos encuentros con hora y ubicación" },
            { icon: "🎉", title: "Eventos del club", desc: "Fiestas, torneos, asambleas... con RSVP" },
            { icon: "🤝", title: "Voluntariado", desc: "Oportunidades para colaborar con el club" },
          ].map((item, i) => (
            <div key={i} className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-left border border-white/10">
              <div className="text-3xl mb-3">{item.icon}</div>
              <h3 className="font-bold text-lg mb-1">{item.title}</h3>
              <p className="text-sm opacity-80">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    id: "socio",
    bg: "from-yellow-600 to-orange-700",
    content: (
      <div className="flex flex-col items-center justify-center h-full text-white text-center px-8 max-w-4xl mx-auto">
        <div className="text-6xl mb-6">🎫</div>
        <h2 className="text-4xl md:text-5xl font-black mb-4">Hazte Socio</h2>
        <p className="text-xl opacity-80 mb-8">Apoya al club y obtén ventajas</p>
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 max-w-2xl w-full border border-white/10">
          <div className="text-5xl font-black mb-2">25€<span className="text-lg font-normal opacity-70">/año</span></div>
          <p className="text-lg opacity-80 mb-6">Cuota anual de socio</p>
          <div className="text-left space-y-3">
            {[
              "🎫 Carnet digital de socio con QR",
              "🏪 Descuentos en comercios locales",
              "🗳️ Voz y voto en asambleas",
              "🎁 Sorteos exclusivos para socios",
              "💚 Apoyas el deporte de tu pueblo",
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="mt-6 text-sm opacity-60">Puedes hacerte socio desde la propia app → sección "Hacerse Socio"</p>
      </div>
    ),
  },
  {
    id: "extras",
    bg: "from-slate-700 to-slate-900",
    content: (
      <div className="flex flex-col items-center justify-center h-full text-white text-center px-8 max-w-4xl mx-auto">
        <div className="text-6xl mb-6">✨</div>
        <h2 className="text-4xl md:text-5xl font-black mb-4">Más funciones</h2>
        <p className="text-xl opacity-80 mb-8">La app tiene mucho más</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 w-full max-w-3xl">
          {[
            { icon: "🖼️", title: "Galería de fotos" },
            { icon: "📋", title: "Encuestas" },
            { icon: "📄", title: "Documentos" },
            { icon: "🏆", title: "Competición y ligas" },
            { icon: "🛍️", title: "Mercadillo" },
            { icon: "🎁", title: "Trae un amigo" },
            { icon: "🍀", title: "Lotería Navidad" },
            { icon: "🤖", title: "Asistente virtual" },
            { icon: "🖊️", title: "Firmas federación" },
          ].map((item, i) => (
            <div key={i} className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
              <div className="text-2xl mb-2">{item.icon}</div>
              <p className="text-xs font-bold">{item.title}</p>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    id: "faq",
    bg: "from-indigo-700 to-violet-800",
    content: (
      <div className="flex flex-col items-center justify-center h-full text-white text-center px-8 max-w-4xl mx-auto">
        <div className="text-6xl mb-6">❓</div>
        <h2 className="text-4xl md:text-5xl font-black mb-8">Preguntas Frecuentes</h2>
        <div className="flex flex-col gap-4 w-full max-w-2xl text-left">
          {[
            { q: "¿Necesito instalarla?", a: "Es recomendable para recibir notificaciones, pero también funciona desde el navegador." },
            { q: "¿Ambos padres pueden acceder?", a: "Sí. Se puede invitar al segundo progenitor desde la app." },
            { q: "¿Puedo ver datos de varios hijos?", a: "Sí, todos tus hijos aparecen en tu cuenta aunque estén en categorías distintas." },
            { q: "¿Qué pasa si pierdo acceso?", a: "Entra con tu email — el sistema te envía un código nuevo cada vez." },
            { q: "¿Quién ve mis datos?", a: "Solo los administradores y entrenadores del club. Cumplimos con la LOPD." },
          ].map((item, i) => (
            <div key={i} className="bg-white/10 backdrop-blur-sm rounded-xl p-5 border border-white/10">
              <h3 className="font-bold text-sm mb-1">{item.q}</h3>
              <p className="text-xs opacity-80">{item.a}</p>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    id: "end",
    bg: "from-orange-600 via-orange-700 to-green-700",
    content: (
      <div className="flex flex-col items-center justify-center h-full text-white text-center px-8">
        <img src={CLUB_LOGO} alt="CD Bustarviejo" className="w-28 h-28 rounded-full border-4 border-white/40 shadow-2xl mb-8" />
        <h2 className="text-4xl md:text-6xl font-black mb-4">¡Gracias!</h2>
        <p className="text-xl md:text-2xl opacity-90 mb-2">¿Alguna pregunta?</p>
        <p className="text-lg opacity-70 mt-6">Estamos aquí para ayudaros 💪</p>
        <div className="mt-12 bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/10 max-w-md">
          <p className="text-sm opacity-80 mb-2">Si necesitáis ayuda con la app:</p>
          <p className="font-bold">🤖 Usad el Asistente Virtual dentro de la app</p>
          <p className="text-sm opacity-60 mt-2">o escribid al coordinador por el chat</p>
        </div>
      </div>
    ),
  },
];

export default function FamilyPresentation() {
  const [current, setCurrent] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const total = slides.length;

  const goNext = useCallback(() => setCurrent((c) => Math.min(c + 1, total - 1)), [total]);
  const goPrev = useCallback(() => setCurrent((c) => Math.max(c - 1, 0)), []);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); goNext(); }
      if (e.key === "ArrowLeft") { e.preventDefault(); goPrev(); }
      if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
        else document.exitFullscreen?.();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [goNext, goPrev]);

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
    else document.exitFullscreen?.();
  };

  const slide = slides[current];

  return (
    <div className={`fixed inset-0 z-[99999] bg-gradient-to-br ${slide.bg} transition-all duration-500 overflow-hidden select-none`}>
      {/* Content */}
      <div className="h-full w-full">{slide.content}</div>

      {/* Navigation arrows */}
      {current > 0 && (
        <button
          onClick={goPrev}
          className="absolute left-4 top-1/2 -translate-y-1/2 w-14 h-14 rounded-full bg-black/30 hover:bg-black/50 text-white flex items-center justify-center transition-all"
        >
          <ChevronLeft className="w-8 h-8" />
        </button>
      )}
      {current < total - 1 && (
        <button
          onClick={goNext}
          className="absolute right-4 top-1/2 -translate-y-1/2 w-14 h-14 rounded-full bg-black/30 hover:bg-black/50 text-white flex items-center justify-center transition-all"
        >
          <ChevronRight className="w-8 h-8" />
        </button>
      )}

      {/* Bottom bar */}
      <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-6 py-4 bg-black/20">
        {/* Progress dots */}
        <div className="flex gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`w-2.5 h-2.5 rounded-full transition-all ${i === current ? "bg-white scale-125" : "bg-white/40 hover:bg-white/60"}`}
            />
          ))}
        </div>

        {/* Slide counter + fullscreen */}
        <div className="flex items-center gap-4 text-white/70 text-sm">
          <span>{current + 1} / {total}</span>
          <button onClick={toggleFullscreen} className="hover:text-white transition-colors" title="Pantalla completa (F)">
            {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Touch zones for mobile swipe */}
      <div className="absolute inset-0 flex pointer-events-none">
        <div className="w-1/4 h-full pointer-events-auto" onClick={goPrev} />
        <div className="w-1/2 h-full" />
        <div className="w-1/4 h-full pointer-events-auto" onClick={goNext} />
      </div>
    </div>
  );
}