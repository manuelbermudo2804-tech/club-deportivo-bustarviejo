import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Rocket, Layout, FormInput, CreditCard, Tag, Users, BarChart3, Share2, Settings, Sparkles, HelpCircle, CheckCircle2, AlertCircle, Lightbulb } from "lucide-react";

// Guía completa del Constructor de Páginas — explica QUÉ hace cada función y CÓMO usarla.
export default function PageBuilderGuia() {
  const navigate = useNavigate();
  const [openSection, setOpenSection] = useState("inicio");

  const sections = [
    { id: "inicio", icon: <Rocket className="w-5 h-5" />, title: "¿Qué es el Constructor?", color: "from-orange-500 to-red-500" },
    { id: "primeros-pasos", icon: <Sparkles className="w-5 h-5" />, title: "Primeros pasos (5 min)", color: "from-blue-500 to-cyan-500" },
    { id: "hero", icon: <Layout className="w-5 h-5" />, title: "Hero (la portada)", color: "from-purple-500 to-pink-500" },
    { id: "bloques", icon: <Layout className="w-5 h-5" />, title: "Bloques de contenido", color: "from-emerald-500 to-teal-500" },
    { id: "formulario", icon: <FormInput className="w-5 h-5" />, title: "Formulario de inscripción", color: "from-amber-500 to-orange-500" },
    { id: "pago", icon: <CreditCard className="w-5 h-5" />, title: "Cobros con Stripe", color: "from-green-500 to-emerald-500" },
    { id: "cupones", icon: <Tag className="w-5 h-5" />, title: "Cupones y descuentos", color: "from-pink-500 to-rose-500" },
    { id: "avanzado", icon: <Settings className="w-5 h-5" />, title: "Opciones avanzadas", color: "from-indigo-500 to-blue-500" },
    { id: "publicar", icon: <Share2 className="w-5 h-5" />, title: "Publicar y compartir", color: "from-violet-500 to-purple-500" },
    { id: "inscritos", icon: <Users className="w-5 h-5" />, title: "Gestionar inscritos", color: "from-cyan-500 to-blue-500" },
    { id: "analytics", icon: <BarChart3 className="w-5 h-5" />, title: "Analytics y métricas", color: "from-rose-500 to-pink-500" },
    { id: "tips", icon: <Lightbulb className="w-5 h-5" />, title: "Trucos pro", color: "from-yellow-500 to-amber-500" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-5xl mx-auto p-4 lg:p-6">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate("/PageBuilder")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">
              📚 Guía del Constructor
            </h1>
            <p className="text-slate-500 text-sm">Todo lo que necesitas saber para crear páginas que conviertan</p>
          </div>
        </div>

        {/* Índice */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 mb-6">
          {sections.map((s) => (
            <button
              key={s.id}
              onClick={() => {
                setOpenSection(s.id);
                document.getElementById(s.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              className={`p-3 rounded-xl text-left transition-all bg-gradient-to-br ${s.color} text-white hover:scale-105 shadow-sm hover:shadow-md`}
            >
              <div className="flex items-center gap-2 text-xs font-bold">
                {s.icon}
                <span className="line-clamp-2">{s.title}</span>
              </div>
            </button>
          ))}
        </div>

        {/* Secciones */}
        <div className="space-y-4">
          <Seccion id="inicio" titulo="🚀 ¿Qué es el Constructor de Páginas?">
            <p>
              Es una herramienta para crear <strong>páginas web públicas con formulario de inscripción</strong> en
              minutos, sin saber programar. Cada página tiene una URL única (ej: <code className="bg-slate-100 px-1.5 py-0.5 rounded">cdbustarviejo.com/l/torneo-padel</code>) que puedes
              compartir por WhatsApp, redes, email, etc.
            </p>
            <Pro>
              <strong>¿Para qué la usarás?</strong> Torneos, campus de verano, eventos, captación de patrocinadores,
              encuestas, listas de espera, ventas puntuales, reservas, voluntariado…
            </Pro>
            <p>Todo queda <strong>guardado y gestionado dentro de tu panel</strong>: ves quién se ha apuntado, exportas la lista, cobras online y haces seguimiento.</p>
          </Seccion>

          <Seccion id="primeros-pasos" titulo="✨ Primeros pasos (en 5 minutos)">
            <Paso n="1" titulo="Pulsa 'Nueva página'">Te abre el editor con una plantilla por defecto.</Paso>
            <Paso n="2" titulo="Ponle nombre y URL (slug)">
              El <strong>nombre</strong> es solo para ti (panel interno). El <strong>slug</strong> es la parte de la URL pública.
              Ejemplo: si pones slug <code>torneo2026</code>, la URL será <code>/l/torneo2026</code>.
            </Paso>
            <Paso n="3" titulo="Edita las pestañas">
              Hero (portada) → Bloques (contenido) → Formulario (qué preguntar) → Pago (si cobras) → Branding (colores).
            </Paso>
            <Paso n="4" titulo="Guarda como Borrador">
              Mientras esté en borrador, <strong>solo tú lo ves</strong>. Pulsa el botón "Vista previa" para revisarlo.
            </Paso>
            <Paso n="5" titulo="Publicar">
              Cuando esté listo, cambia el estado a <Badge color="green">🟢 Publicada</Badge> y comparte la URL.
            </Paso>
          </Seccion>

          <Seccion id="hero" titulo="🎨 Hero — La portada (lo primero que ven)">
            <p>El Hero es la sección de arriba: la primera impresión. Aquí decides:</p>
            <Campo nombre="Título" desc="El gancho principal. Ej: '⚽ Campus de verano CD Bustarviejo'." />
            <Campo nombre="Subtítulo" desc="Una frase que explique de qué va. Ej: '5 días de fútbol, diversión y aprendizaje'." />
            <Campo nombre="Badge" desc="Etiqueta pequeña arriba. Ej: 'PLAZAS LIMITADAS' o 'NOVEDAD 2026'." />
            <Campo nombre="Fecha del evento" desc="Si pones fecha, aparece automáticamente una CUENTA ATRÁS." />
            <Campo nombre="Imagen de fondo" desc="Una foto chula del club. Si no, se usa un degradado de colores." />
            <Campo nombre="Botón CTA" desc="El texto del botón principal. Ej: 'Apúntate ya' o 'Reservar plaza'." />
            <Tip>Mejor que el título tenga <strong>menos de 8 palabras</strong>. Lo importante es engancharles en 3 segundos.</Tip>
          </Seccion>

          <Seccion id="bloques" titulo="🧱 Bloques de contenido">
            <p>Debajo del Hero puedes añadir <strong>tantos bloques como quieras</strong>, en el orden que prefieras. Tipos disponibles:</p>
            <Bloque emoji="📝" nombre="Texto enriquecido">Párrafos con formato (negritas, listas, enlaces). Para descripciones largas.</Bloque>
            <Bloque emoji="📊" nombre="Estadísticas">3-4 números grandes con etiqueta. Ej: "150 jugadores · 12 equipos · 25 años".</Bloque>
            <Bloque emoji="❓" nombre="FAQ">Preguntas frecuentes plegables. Reduce dudas y mensajes de WhatsApp.</Bloque>
            <Bloque emoji="💰" nombre="Tabla de precios">Compara opciones (Bronce/Plata/Oro). Útil para patrocinios o tipos de inscripción.</Bloque>
            <Bloque emoji="📞" nombre="Contacto">Tu teléfono, email, dirección. Para que pregunten antes de apuntarse.</Bloque>
            <Bloque emoji="🖼️" nombre="Galería">Cuadrícula de fotos. Ej: fotos del año pasado del torneo.</Bloque>
            <Bloque emoji="🎥" nombre="Vídeo">Embed de YouTube/Vimeo. Sube la conversión un 30-50%.</Bloque>
            <Bloque emoji="⏰" nombre="Cuenta atrás">Días/horas hasta una fecha. Genera urgencia.</Bloque>
            <Bloque emoji="🤝" nombre="Patrocinadores">Logos de empresas colaboradoras.</Bloque>
            <Bloque emoji="👥" nombre="Equipos/Participantes">Tarjetas con foto y nombre.</Bloque>
            <Bloque emoji="📅" nombre="Horarios">Lista de actividades con hora.</Bloque>
            <Bloque emoji="🔌" nombre="Embed HTML">Para insertar widgets externos (Eventbrite, mapas, etc).</Bloque>
            <Tip>Menos es más. <strong>3-5 bloques bien hechos</strong> convierten más que 15 amontonados.</Tip>
          </Seccion>

          <Seccion id="formulario" titulo="📋 Formulario de inscripción">
            <p>Aquí decides <strong>qué datos pedir</strong> a quien se apunte. Tipos de campo:</p>
            <Campo nombre="Texto corto" desc="Para nombre, apellidos, ciudad…" />
            <Campo nombre="Email" desc="Validación automática. Lo usarás para enviarles la confirmación." />
            <Campo nombre="Teléfono" desc="Validación de formato español." />
            <Campo nombre="Texto largo" desc="Para 'cuéntame algo más' o 'observaciones'." />
            <Campo nombre="Número" desc="Edad, cantidad de personas…" />
            <Campo nombre="Selector" desc="Lista desplegable con opciones que tú defines." />
            <Campo nombre="Checkbox" desc="Para aceptar política de privacidad u opciones múltiples." />
            <Campo nombre="Fecha" desc="Selector de calendario." />
            <Campo nombre="DNI" desc="Validación REAL del DNI español (letra correcta)." />
            <Campo nombre="IBAN" desc="Validación REAL de cuenta bancaria." />
            <Campo nombre="Archivo" desc="Para subir PDF, foto, justificante… Configurable max tamaño y tipo." />
            <Pro>
              <strong>Campos condicionales:</strong> puedes hacer que un campo aparezca SOLO si otro tiene cierto valor.
              Ej: "¿Talla de camiseta?" aparece solo si marca "Quiero la equipación".
            </Pro>
            <Tip>Cuantos <strong>menos campos</strong>, más conversión. Pide solo lo imprescindible y deja lo demás para después.</Tip>
          </Seccion>

          <Seccion id="pago" titulo="💳 Cobros con Stripe">
            <p>Si el evento es de pago, activa Stripe en la pestaña <strong>"Pago"</strong>.</p>
            <Paso n="1" titulo="Activa el toggle 'Pago activo'" />
            <Paso n="2" titulo="Define opciones">Por ejemplo: "Individual 25€", "Pareja 45€", "Equipo 80€". Cada una con su precio.</Paso>
            <Paso n="3" titulo="Personaliza el botón">El texto que verá ("Pagar y reservar", "Confirmar inscripción"…).</Paso>
            <Paso n="4" titulo="Mensaje post-pago">Lo que verán al completar el pago.</Paso>
            <Pro>
              <strong>Garantía total:</strong> el sistema usa <strong>webhooks de Stripe</strong>. Si el usuario paga pero
              cierra el navegador antes de volver, el pago se confirma igual. No pierdes ninguna inscripción.
            </Pro>
            <Warning>
              Asegúrate de tener configurada tu cuenta de Stripe (ya está). Las comisiones son las estándar de Stripe
              (~1.4% + 0.25€ por transacción para tarjetas europeas).
            </Warning>
          </Seccion>

          <Seccion id="cupones" titulo="🏷️ Cupones de descuento">
            <p>En la pestaña <strong>"Avanzado"</strong> puedes crear códigos promocionales:</p>
            <Campo nombre="Código" desc="Lo que escribirá el usuario. Ej: 'EARLY20', 'SOCIO10'." />
            <Campo nombre="Tipo" desc="Porcentaje (-20%) o importe fijo (-5€)." />
            <Campo nombre="Max usos" desc="Cuántas veces puede usarse en total (opcional)." />
            <Campo nombre="Fecha expiración" desc="Hasta cuándo es válido (opcional)." />
            <Campo nombre="Activo" desc="Toggle para desactivarlo temporalmente sin borrarlo." />
            <Tip>
              <strong>Estrategias que funcionan:</strong><br />
              • <code>EARLY20</code> -20% para los primeros 10 inscritos → genera urgencia<br />
              • <code>SOCIO10</code> -10€ para socios del club → fideliza<br />
              • <code>FAMILIA</code> -15% al inscribir 2+ hermanos
            </Tip>
          </Seccion>

          <Seccion id="avanzado" titulo="⚙️ Opciones avanzadas">
            <Campo nombre="Lista de espera" desc="Si se llenan las plazas, los siguientes se apuntan a una lista de espera (en vez de no poder inscribirse)." />
            <Campo nombre="Honeypot anti-bot" desc="Campo invisible que solo rellenan los bots. Activado por defecto." />
            <Campo nombre="Rate limit" desc="Minutos mínimos entre inscripciones desde la misma IP. Evita spam." />
            <Campo nombre="Google Sheets ID" desc="Si pegas el ID de un Sheet, cada inscripción se añade automáticamente como nueva fila. Para que el tesorero o gestor lo vea en tiempo real." />
            <Campo nombre="Webhook URL" desc="Para integraciones avanzadas con Zapier, Make, etc. Cada inscripción dispara una llamada HTTP a tu URL." />
            <Campo nombre="Notificar push" desc="Recibe una notificación push en tu móvil cada vez que alguien se inscribe." />
            <Campo nombre="Notificar email" desc="Aviso por email a todos los admins cuando llega una inscripción." />
            <Campo nombre="Límite de plazas" desc="Cuando se alcanza el número, se cierra la inscripción automáticamente (o pasan a lista de espera)." />
            <Pro>
              <strong>Mostrar en menú lateral:</strong> activa esta opción para que la página de gestión aparezca en el menú
              de la app, accesible desde el móvil. Útil cuando es un torneo o evento con muchos inscritos.
            </Pro>
          </Seccion>

          <Seccion id="publicar" titulo="🚀 Publicar y compartir">
            <p>Cuando la página está lista:</p>
            <Paso n="1" titulo="Cambia el estado a Publicada">En el desplegable arriba del editor.</Paso>
            <Paso n="2" titulo="Guarda los cambios" />
            <Paso n="3" titulo="Vuelve al listado y pulsa Compartir">
              Te da: la URL, un código QR descargable y botones para compartir por WhatsApp/Facebook/Twitter.
            </Paso>
            <Pro>
              El <strong>QR es perfecto para carteles físicos</strong>: imprime el QR en el polideportivo, en el bar del campo,
              en los vestuarios. La gente escanea con el móvil y se apunta al momento.
            </Pro>
            <Tip>
              <strong>Estados que puedes usar:</strong><br />
              • <Badge color="amber">🟡 Borrador</Badge> Solo tú la ves<br />
              • <Badge color="green">🟢 Publicada</Badge> Visible y aceptando inscripciones<br />
              • <Badge color="slate">🔒 Cerrada</Badge> Visible pero NO acepta más (muestra "Cerrado")<br />
              • <Badge color="slate">⚫ Archivada</Badge> Oculta totalmente
            </Tip>
          </Seccion>

          <Seccion id="inscritos" titulo="👥 Gestionar inscritos">
            <p>Pulsa el botón <strong>"Inscritos"</strong> de cada página para acceder al panel de gestión:</p>
            <ul className="list-disc list-inside space-y-1 text-slate-700">
              <li>Ver todas las inscripciones con sus datos completos</li>
              <li>Filtrar por estado (Nuevo, Contactado, Confirmado…)</li>
              <li>Ver el origen del tráfico (UTM, referrer)</li>
              <li>Descargar archivos que hayan subido</li>
              <li>Ver el cupón usado y descuento aplicado</li>
              <li>Cambiar el estado (gestionar tu flujo de trabajo)</li>
              <li>Añadir notas internas</li>
              <li>Exportar todo a CSV / Excel</li>
            </ul>
            <Tip>
              <strong>Flujo recomendado:</strong> Nuevo → Contactado (les escribes) → Confirmado (todo OK) o Cancelado.
              Así sabes en qué fase está cada persona.
            </Tip>
          </Seccion>

          <Seccion id="analytics" titulo="📈 Analytics — Métricas de tu página">
            <p>Pulsa el icono <BarChart3 className="inline w-4 h-4" /> en cada página para ver:</p>
            <Campo nombre="Visitas" desc="Cuánta gente ha visto la página." />
            <Campo nombre="Inscritos" desc="Cuántos se han apuntado." />
            <Campo nombre="Tasa de conversión" desc="% de visitantes que se inscriben. Una buena tasa es 5-15%." />
            <Campo nombre="Recaudado" desc="Total cobrado si hay pagos activos." />
            <Campo nombre="Embudo" desc="Visualiza dónde se pierde gente: Visitas → Inscripciones → Pagadas." />
            <Campo nombre="Gráfico diario" desc="Evolución de inscripciones en los últimos 30 días." />
            <Campo nombre="Fuentes de tráfico" desc="De dónde vienen (WhatsApp, Facebook, Instagram, directo…)." />
            <Pro>
              <strong>UTM tracking automático:</strong> añade <code>?utm_source=whatsapp&amp;utm_campaign=torneo</code> a la URL
              cuando la compartas, y verás de qué canal vienen tus inscritos. Ej: <code>tu-url/l/torneo?utm_source=instagram</code>
            </Pro>
          </Seccion>

          <Seccion id="tips" titulo="💡 Trucos pro para más conversión">
            <Tip><strong>1. Imagen del Hero potente:</strong> una foto real del club/jugadores convierte más que un stock.</Tip>
            <Tip><strong>2. Cuenta atrás visible:</strong> si pones fecha de evento, aparece automáticamente. Genera urgencia.</Tip>
            <Tip><strong>3. Plazas limitadas reales:</strong> activa el límite de plazas. La barra de progreso aumenta la urgencia.</Tip>
            <Tip><strong>4. Pocos campos:</strong> 3-5 campos máximo. Pide solo lo imprescindible.</Tip>
            <Tip><strong>5. CTA claro:</strong> "Apúntate ya" o "Reservar plaza" funcionan mejor que "Enviar" o "Continuar".</Tip>
            <Tip><strong>6. FAQ:</strong> añade un bloque de preguntas frecuentes. Reduce mensajes y aumenta conversión.</Tip>
            <Tip><strong>7. Testimonios:</strong> en bloque de texto, añade frases de padres/jugadores del año pasado.</Tip>
            <Tip><strong>8. Cupón early-bird:</strong> "-20% los primeros 10" funciona mejor que "-20% siempre".</Tip>
            <Tip><strong>9. QR en cartel físico:</strong> imprime el QR y ponlo en el campo, vestuarios, bar. Multiplica inscripciones.</Tip>
            <Tip><strong>10. UTM por canal:</strong> usa URLs diferentes para WhatsApp/Instagram/Cartel y mide qué funciona.</Tip>
          </Seccion>

          <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-3xl p-6 lg:p-8 text-white text-center mt-8">
            <Rocket className="w-12 h-12 mx-auto mb-3 text-orange-400" />
            <h2 className="text-2xl font-black mb-2">¿Listo para crear tu primera página?</h2>
            <p className="text-slate-300 mb-4">Tardarás menos de 5 minutos en tener algo publicable.</p>
            <Button onClick={() => navigate("/PageBuilderEditor")} className="bg-orange-500 hover:bg-orange-600 gap-2" size="lg">
              <Rocket className="w-4 h-4" /> Crear nueva página
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Subcomponentes auxiliares ───

function Seccion({ id, titulo, children }) {
  return (
    <section id={id} className="bg-white rounded-2xl border border-slate-200 p-5 lg:p-6 scroll-mt-4">
      <h2 className="text-xl lg:text-2xl font-black text-slate-900 mb-4">{titulo}</h2>
      <div className="space-y-3 text-slate-700 leading-relaxed">{children}</div>
    </section>
  );
}

function Paso({ n, titulo, children }) {
  return (
    <div className="flex gap-3 items-start">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-900 text-white font-black flex items-center justify-center text-sm">
        {n}
      </div>
      <div>
        <div className="font-bold text-slate-900">{titulo}</div>
        {children && <div className="text-sm text-slate-600 mt-0.5">{children}</div>}
      </div>
    </div>
  );
}

function Campo({ nombre, desc }) {
  return (
    <div className="flex gap-2 items-start p-2 rounded-lg hover:bg-slate-50">
      <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
      <div>
        <span className="font-bold text-slate-900">{nombre}.</span>{" "}
        <span className="text-sm text-slate-600">{desc}</span>
      </div>
    </div>
  );
}

function Bloque({ emoji, nombre, children }) {
  return (
    <div className="flex gap-2 items-start p-2 rounded-lg hover:bg-slate-50">
      <span className="text-xl flex-shrink-0">{emoji}</span>
      <div>
        <span className="font-bold text-slate-900">{nombre}.</span>{" "}
        <span className="text-sm text-slate-600">{children}</span>
      </div>
    </div>
  );
}

function Tip({ children }) {
  return (
    <div className="flex gap-2 items-start bg-amber-50 border border-amber-200 rounded-xl p-3">
      <Lightbulb className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
      <div className="text-sm text-amber-900">{children}</div>
    </div>
  );
}

function Pro({ children }) {
  return (
    <div className="flex gap-2 items-start bg-blue-50 border border-blue-200 rounded-xl p-3">
      <Sparkles className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
      <div className="text-sm text-blue-900">{children}</div>
    </div>
  );
}

function Warning({ children }) {
  return (
    <div className="flex gap-2 items-start bg-orange-50 border border-orange-200 rounded-xl p-3">
      <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
      <div className="text-sm text-orange-900">{children}</div>
    </div>
  );
}

function Badge({ children, color }) {
  const colors = {
    green: "bg-green-100 text-green-700",
    amber: "bg-amber-100 text-amber-700",
    slate: "bg-slate-100 text-slate-700",
  };
  return <span className={`px-2 py-0.5 rounded text-xs font-bold ${colors[color] || colors.slate}`}>{children}</span>;
}