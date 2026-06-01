import React from "react";
import { Shield, Mail, Globe } from "lucide-react";

export default function Privacidad() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-10 px-4">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-lg p-6 sm:p-10">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center">
            <Shield className="w-6 h-6 text-orange-600" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Política de Privacidad</h1>
            <p className="text-sm text-slate-500">App Club Deportivo Bustarviejo</p>
          </div>
        </div>
        <p className="text-xs text-slate-500 mb-8">Última actualización: 1 de junio de 2026</p>

        <Section title="1. Responsable del tratamiento">
          <p><strong>Club Deportivo Bustarviejo</strong></p>
          <ul className="mt-2 space-y-1 text-slate-700">
            <li className="flex items-center gap-2"><Globe className="w-4 h-4 text-slate-400" /> www.cdbustarviejo.com</li>
            <li className="flex items-center gap-2"><Mail className="w-4 h-4 text-slate-400" /> info@cdbustarviejo.com</li>
            <li>📍 Bustarviejo, Madrid (España)</li>
          </ul>
        </Section>

        <Section title="2. ¿Qué datos recogemos?">
          <p>Según tu rol en el club, recogemos algunos de estos datos:</p>
          <Subtitle>Datos de identificación</Subtitle>
          <List items={["Nombre y apellidos", "Email y teléfono", "DNI o pasaporte (solo para inscripción federativa)", "Fecha de nacimiento", "Dirección postal"]} />
          <Subtitle>Datos del jugador/a (si eres familia)</Subtitle>
          <List items={["Datos de tu hijo/a (nombre, fecha nacimiento, categoría)", "Foto tipo carnet", "Ficha médica (alergias, contactos de emergencia)", "Documentación legal (DNI, libro de familia)"]} />
          <Subtitle>Datos económicos</Subtitle>
          <List items={["Información de pagos y cuotas", "Justificantes bancarios", "IBAN (solo si eliges domiciliación)"]} />
          <Subtitle>Datos técnicos</Subtitle>
          <List items={["Dirección IP", "Tipo de dispositivo y navegador", "Datos de uso de la app (páginas visitadas)"]} />
        </Section>

        <Section title="3. ¿Para qué usamos tus datos?">
          <List items={[
            "Gestionar la inscripción del jugador en el club y la federación",
            "Cobrar las cuotas y emitir recibos",
            "Organizar entrenamientos, partidos y convocatorias",
            "Comunicarnos contigo (chat, email, notificaciones)",
            "Cumplir con obligaciones legales (Ley del Deporte, LOPIVI, RGPD)",
            "Mejorar la app y prevenir fraudes"
          ]} />
        </Section>

        <Section title="4. Base legal">
          <List items={[
            "Consentimiento (lo que aceptas al registrarte)",
            "Ejecución del contrato (la inscripción al club)",
            "Obligación legal (federación, hacienda, LOPIVI)",
            "Interés legítimo (seguridad de la app)"
          ]} />
        </Section>

        <Section title="5. ¿Con quién compartimos tus datos?">
          <p>Solo compartimos lo imprescindible con:</p>
          <List items={[
            "Federación de Fútbol de Madrid (RFFM) y federaciones correspondientes (para ficha federativa)",
            "Stripe (procesador de pagos seguro, certificado PCI-DSS)",
            "Resend (envío de emails)",
            "Base44 / Supabase (infraestructura técnica de la app)",
            "Google / Apple (notificaciones push)",
            "WhatsApp / Telegram (solo si activas estos canales)"
          ]} />
          <p className="mt-3 font-semibold text-slate-900">Nunca vendemos tus datos a terceros para publicidad.</p>
        </Section>

        <Section title="6. ¿Cuánto tiempo guardamos tus datos?">
          <List items={[
            "Mientras seas miembro activo del club",
            "Hasta 5 años tras la baja (por obligaciones fiscales y federativas)",
            "Documentación legal: el plazo que marque la ley"
          ]} />
        </Section>

        <Section title="7. Menores de edad">
          <p>Los datos de menores de 14 años se tratan <strong>con el consentimiento de padres o tutores legales</strong>. Aplicamos medidas reforzadas LOPIVI (Ley Orgánica de Protección Integral a la Infancia).</p>
          <p className="mt-2">Los menores con acceso a la app tienen un panel <strong>restringido y supervisado</strong> por sus tutores.</p>
        </Section>

        <Section title="8. Tus derechos">
          <p>Tienes derecho a:</p>
          <List items={[
            "Acceder a tus datos",
            "Rectificar datos incorrectos",
            "Suprimir tus datos (\"derecho al olvido\")",
            "Limitar el tratamiento",
            "Portabilidad de tus datos",
            "Oponerte al tratamiento",
            "Retirar el consentimiento en cualquier momento"
          ]} />
          <p className="mt-3"><strong>Cómo ejercerlos:</strong> Escríbenos a <a href="mailto:info@cdbustarviejo.com" className="text-orange-600 underline">info@cdbustarviejo.com</a> indicando qué derecho quieres ejercer. Te responderemos en un máximo de 30 días.</p>
          <p className="mt-2">También puedes reclamar ante la <strong>Agencia Española de Protección de Datos</strong> (<a href="https://www.aepd.es" target="_blank" rel="noopener noreferrer" className="text-orange-600 underline">www.aepd.es</a>).</p>
        </Section>

        <Section title="9. Seguridad">
          <p>Aplicamos medidas técnicas y organizativas:</p>
          <List items={[
            "Cifrado de comunicaciones (HTTPS)",
            "Acceso por código personal único",
            "Permisos por rol (cada usuario ve solo lo suyo)",
            "Copias de seguridad periódicas",
            "Auditorías y registros de acceso"
          ]} />
        </Section>

        <Section title="10. Cookies y almacenamiento local">
          <p>La app guarda algunos datos en tu dispositivo (token de sesión, preferencias, caché) para funcionar correctamente. No usamos cookies de seguimiento publicitario.</p>
        </Section>

        <Section title="11. Cambios en esta política">
          <p>Si cambiamos esta política, te avisaremos por la app o por email <strong>15 días antes</strong> de aplicar los cambios.</p>
        </Section>

        <Section title="12. Contacto">
          <p>¿Dudas? Escríbenos:</p>
          <ul className="mt-2 space-y-1">
            <li className="flex items-center gap-2"><Mail className="w-4 h-4 text-slate-400" /> <a href="mailto:info@cdbustarviejo.com" className="text-orange-600 underline">info@cdbustarviejo.com</a></li>
            <li className="flex items-center gap-2"><Globe className="w-4 h-4 text-slate-400" /> <a href="https://www.cdbustarviejo.com" target="_blank" rel="noopener noreferrer" className="text-orange-600 underline">www.cdbustarviejo.com</a></li>
          </ul>
        </Section>

        <div className="mt-10 pt-6 border-t border-slate-200 text-center text-xs text-slate-400">
          © {new Date().getFullYear()} Club Deportivo Bustarviejo
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section className="mb-8">
      <h2 className="text-lg sm:text-xl font-bold text-slate-900 mb-3">{title}</h2>
      <div className="text-slate-700 text-sm sm:text-base leading-relaxed space-y-2">{children}</div>
    </section>
  );
}

function Subtitle({ children }) {
  return <h3 className="font-semibold text-slate-800 mt-3">{children}</h3>;
}

function List({ items }) {
  return (
    <ul className="list-disc pl-5 space-y-1 mt-1">
      {items.map((t, i) => <li key={i}>{t}</li>)}
    </ul>
  );
}