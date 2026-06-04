import React from "react";
import { Phone, Mail, MapPin, Clock } from "lucide-react";

// Icono oficial de WhatsApp (verde) en SVG
function WhatsAppIcon({ className = "w-6 h-6" }) {
  return (
    <svg viewBox="0 0 32 32" className={className} fill="currentColor" aria-hidden="true">
      <path d="M19.11 17.205c-.372 0-1.088 1.39-1.518 1.39a.63.63 0 0 1-.315-.1c-.802-.402-1.504-.817-2.163-1.447-.545-.516-1.146-1.29-1.46-1.963a.426.426 0 0 1-.073-.215c0-.33.99-.945.99-1.49 0-.143-.73-2.09-.832-2.335-.143-.372-.214-.487-.6-.487-.187 0-.36-.043-.53-.043-.302 0-.53.115-.746.315-.688.645-1.032 1.318-1.06 2.264v.114c-.015.99.472 1.977 1.017 2.78 1.23 1.82 2.506 3.41 4.554 4.34.616.287 2.035.888 2.722.888.817 0 2.15-.515 2.518-1.318.143-.33.115-.689.115-.99.014-.058-.064-.072-.143-.114-.99-.487-1.954-.945-2.973-1.395a.658.658 0 0 0-.314-.114l-.286-.072z"/>
      <path d="M19.083 27.082c-1.768 0-3.5-.487-5.041-1.403L8.59 27.77l1.74-6.43c-1.06-1.49-1.62-3.295-1.62-5.18 0-5.04 4.097-9.138 9.138-9.138 2.45 0 4.755.96 6.487 2.69 1.733 1.732 2.692 4.04 2.692 6.49 0 5.04-4.04 9.138-9.138 9.138zm-4.752-3.04l.33.214c1.32.802 2.835 1.232 4.422 1.232 4.19 0 7.6-3.41 7.6-7.598 0-2.034-.8-3.95-2.235-5.39-1.435-1.435-3.355-2.236-5.39-2.236-4.19 0-7.598 3.41-7.598 7.6 0 1.448.4 2.836 1.16 4.04l.215.343-1.03 3.766 3.866-.974z"/>
    </svg>
  );
}

export default function ContactoBlock({ datos = {}, color, branding, wrapper }) {
  const colorSec = branding?.color_secundario || color;

  // Migración inline: si el bloque viejo tenía telefono/email/whatsapp sueltos, convertirlos en 1 persona.
  let personas = Array.isArray(datos.personas) ? datos.personas.filter(p => p && (p.telefono || p.email || p.whatsapp || p.nombre)) : [];
  if (personas.length === 0 && (datos.telefono || datos.email || datos.whatsapp)) {
    personas = [{
      nombre: "",
      rol: "",
      telefono: datos.telefono || "",
      email: datos.email || "",
      whatsapp: datos.whatsapp || "",
    }];
  }

  // Extras comunes (dirección y horario) se muestran como tarjetas adicionales
  const extras = [
    datos.direccion && {
      icon: <MapPin className="w-6 h-6" />,
      label: "Dirección",
      valor: datos.direccion,
      href: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(datos.direccion)}`,
      isLink: true,
    },
    datos.horario && {
      icon: <Clock className="w-6 h-6" />,
      label: "Horario",
      valor: datos.horario,
      href: null,
    },
  ].filter(Boolean);

  // Grid responsive: 1 col en móvil, 2 en sm+, hasta 3 en lg+ si hay 3 o más personas
  const totalCards = personas.length + extras.length;
  const gridCols = totalCards >= 3
    ? "sm:grid-cols-2 lg:grid-cols-3"
    : totalCards === 2
      ? "sm:grid-cols-2"
      : "sm:grid-cols-1";

  return wrapper(
    <div className="max-w-5xl mx-auto">
      {datos.titulo && (
        <h2 className="text-3xl lg:text-5xl font-black text-center mb-3 text-slate-900 tracking-tight">
          {datos.titulo}
        </h2>
      )}
      {datos.subtitulo && (
        <p className="text-center text-lg text-slate-600 mb-10">{datos.subtitulo}</p>
      )}

      <div className={`grid ${gridCols} gap-4`}>
        {personas.map((p, i) => (
          <PersonaCard key={`p-${i}`} persona={p} color={color} colorSec={colorSec} />
        ))}
        {extras.map((e, i) => (
          <ExtraCard key={`e-${i}`} extra={e} color={color} colorSec={colorSec} />
        ))}
      </div>
    </div>
  );
}

function PersonaCard({ persona, color, colorSec }) {
  const waPhone = (persona.whatsapp || "").replace(/[^\d]/g, "");
  const telClean = (persona.telefono || "").replace(/\s/g, "");

  return (
    <div className="flex flex-col p-5 lg:p-6 rounded-2xl bg-white border border-slate-200 hover:border-slate-300 hover:shadow-lg transition-all h-full">
      {/* Cabecera con nombre y rol */}
      <div className="mb-4">
        {persona.nombre && (
          <div className="text-lg lg:text-xl font-black text-slate-900 break-words">
            {persona.nombre}
          </div>
        )}
        {persona.rol && (
          <div className="text-xs font-bold uppercase tracking-wider mt-1" style={{ color }}>
            {persona.rol}
          </div>
        )}
      </div>

      {/* Botones de contacto */}
      <div className="flex flex-col gap-2 mt-auto">
        {persona.telefono && (
          <a
            href={`tel:${telClean}`}
            className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors group"
          >
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 text-white"
              style={{ background: `linear-gradient(135deg, ${color}, ${colorSec})` }}
            >
              <Phone className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 leading-tight">Llamar</div>
              <div className="text-sm font-semibold text-slate-900 truncate">{persona.telefono}</div>
            </div>
          </a>
        )}
        {persona.whatsapp && waPhone && (
          <a
            href={`https://wa.me/${waPhone}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-[#25D366]/10 hover:bg-[#25D366]/20 border border-[#25D366]/30 transition-colors"
          >
            <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 bg-[#25D366] text-white">
              <WhatsAppIcon className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#128C7E] leading-tight">WhatsApp</div>
              <div className="text-sm font-semibold text-slate-900 truncate">{persona.whatsapp}</div>
            </div>
          </a>
        )}
        {persona.email && (
          <a
            href={`mailto:${persona.email}`}
            className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors"
          >
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 text-white"
              style={{ background: `linear-gradient(135deg, ${color}, ${colorSec})` }}
            >
              <Mail className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 leading-tight">Email</div>
              <div className="text-sm font-semibold text-slate-900 truncate">{persona.email}</div>
            </div>
          </a>
        )}
      </div>
    </div>
  );
}

function ExtraCard({ extra, color, colorSec }) {
  const inner = (
    <div className="flex items-start gap-4 p-5 lg:p-6 rounded-2xl bg-white border border-slate-200 hover:border-slate-300 hover:shadow-lg transition-all h-full">
      <div
        className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 text-white"
        style={{ background: `linear-gradient(135deg, ${color}, ${colorSec})` }}
      >
        {extra.icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
          {extra.label}
        </div>
        <div className="text-base lg:text-lg font-semibold text-slate-900 break-words">
          {extra.valor}
        </div>
      </div>
    </div>
  );
  return extra.href ? (
    <a href={extra.href} target={extra.href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer" className="block">
      {inner}
    </a>
  ) : (
    <div>{inner}</div>
  );
}