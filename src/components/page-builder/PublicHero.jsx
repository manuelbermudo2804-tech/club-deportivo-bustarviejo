import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";

// Hero brutal estilo cinematográfico para la página pública.
export default function PublicHero({ hero, branding, onCtaClick }) {
  const [countdown, setCountdown] = useState(null);

  useEffect(() => {
    if (!hero?.mostrar_cuenta_atras || !hero?.fecha_evento) return;
    const update = () => {
      const diff = new Date(hero.fecha_evento).getTime() - Date.now();
      if (diff <= 0) return setCountdown(null);
      const dias = Math.floor(diff / (1000 * 60 * 60 * 24));
      const horas = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const mins = Math.floor((diff / (1000 * 60)) % 60);
      setCountdown({ dias, horas, mins });
    };
    update();
    const t = setInterval(update, 60000);
    return () => clearInterval(t);
  }, [hero?.fecha_evento, hero?.mostrar_cuenta_atras]);

  const colorPrimario = hero?.color_primario || branding?.color_principal || "#ea580c";
  const colorSecundario = branding?.color_secundario || "#15803d";

  // Etiqueta legible con las fechas del evento
  const fechaLegible = (() => {
    const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    if (hero?.tipo_fecha === "rango" && hero?.fecha_inicio && hero?.fecha_fin) {
      const a = new Date(`${hero.fecha_inicio}T00:00:00`);
      const b = new Date(`${hero.fecha_fin}T00:00:00`);
      if (isNaN(a) || isNaN(b)) return null;
      const mismoMes = a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
      // Lista de días consecutivos si es el mismo mes (ej: 3, 4 y 5 de Julio de 2026)
      if (mismoMes) {
        const dias = [];
        for (let d = new Date(a); d <= b; d.setDate(d.getDate() + 1)) dias.push(d.getDate());
        const listaDias = dias.length > 1 ? `${dias.slice(0, -1).join(", ")} y ${dias[dias.length - 1]}` : `${dias[0]}`;
        return `${listaDias} de ${MESES[a.getMonth()]} de ${a.getFullYear()}`;
      }
      return `${a.getDate()} ${MESES[a.getMonth()]} – ${b.getDate()} ${MESES[b.getMonth()]} de ${b.getFullYear()}`;
    }
    if ((!hero?.tipo_fecha || hero?.tipo_fecha === "un_dia") && hero?.fecha_evento) {
      const d = new Date(hero.fecha_evento);
      if (isNaN(d)) return null;
      return `${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
    }
    return null;
  })();

  const esImagen = hero?.tipo === "imagen" && hero?.imagen_url;
  const fondo = (() => {
    if (esImagen) return {};
    if (hero?.tipo === "gradient") {
      return {
        background: `linear-gradient(135deg, ${colorPrimario} 0%, ${colorSecundario} 100%)`,
      };
    }
    if (hero?.tipo === "color") {
      return { background: colorPrimario };
    }
    return { background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)" };
  })();

  // Posición del objeto en móvil: por defecto "center", configurable desde el editor
  const posicionMovil = hero?.posicion_imagen_movil || "center";
  // Modo "imagen entera" en móvil: usa object-contain (sin recorte) sobre fondo de color
  const imagenEnteraMovil = !!hero?.imagen_entera_movil;
  const colorFondoEntera = hero?.color_fondo_entera || colorPrimario;

  return (
    <section
      className={`relative ${imagenEnteraMovil && esImagen ? 'min-h-0 sm:min-h-[85vh]' : 'min-h-[70vh] sm:min-h-[85vh]'} flex items-center justify-center overflow-hidden bg-slate-900`}
      style={imagenEnteraMovil && esImagen ? { ...fondo, background: colorFondoEntera } : fondo}
    >
      {/* Imagen de fondo con <img> para mejor control en móvil */}
      {esImagen && !imagenEnteraMovil && (
        <>
          <img
            src={hero.imagen_url}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            style={{ objectPosition: posicionMovil }}
          />
          <div
            className="absolute inset-0"
            style={{
              background: "linear-gradient(180deg, rgba(15,23,42,0.5) 0%, rgba(15,23,42,0.85) 100%)",
            }}
          />
        </>
      )}

      {/* Modo imagen entera en móvil: imagen completa arriba (sin recorte), contenido debajo. En desktop vuelve a comportarse como fondo. */}
      {esImagen && imagenEnteraMovil && (
        <>
          {/* Móvil: imagen entera como bloque superior */}
          <img
            src={hero.imagen_url}
            alt=""
            className="sm:hidden block w-full h-auto relative z-0"
            style={{ background: colorFondoEntera }}
          />
          {/* Desktop: misma imagen como fondo cover */}
          <img
            src={hero.imagen_url}
            alt=""
            className="hidden sm:block absolute inset-0 w-full h-full object-cover"
            style={{ objectPosition: posicionMovil }}
          />
          <div
            className="hidden sm:block absolute inset-0"
            style={{
              background: "linear-gradient(180deg, rgba(15,23,42,0.5) 0%, rgba(15,23,42,0.85) 100%)",
            }}
          />
        </>
      )}

      {/* Grano decorativo */}
      <div
        className="absolute inset-0 opacity-20 pointer-events-none mix-blend-overlay"
        style={{
          backgroundImage:
            'url("data:image/svg+xml,%3Csvg viewBox=%270 0 200 200%27 xmlns=%27http://www.w3.org/2000/svg%27%3E%3Cfilter id=%27n%27%3E%3CfeTurbulence type=%27fractalNoise%27 baseFrequency=%270.9%27/%3E%3C/filter%3E%3Crect width=%27100%25%27 height=%27100%25%27 filter=%27url(%23n)%27 opacity=%270.4%27/%3E%3C/svg%3E")',
        }}
      />

      <div className={`relative z-10 text-center max-w-4xl mx-auto px-6 ${imagenEnteraMovil && esImagen ? 'py-10 sm:py-20' : 'py-20'}`}>
        {hero?.badge && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-block mb-6 px-4 py-2 rounded-full text-xs font-bold tracking-widest uppercase text-white"
            style={{ background: `${colorPrimario}cc`, backdropFilter: "blur(10px)" }}
          >
            {hero.badge}
          </motion.div>
        )}

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.7 }}
          className="text-5xl sm:text-6xl lg:text-8xl font-black tracking-tight text-white leading-[0.95] mb-6"
          style={{ fontFamily: branding?.fuente_titulares || "Bricolage Grotesque, Inter, sans-serif" }}
        >
          {hero?.titulo || "Tu evento"}
        </motion.h1>

        {hero?.subtitulo && (
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.7 }}
            className="text-lg sm:text-xl lg:text-2xl text-white/85 max-w-2xl mx-auto leading-relaxed mb-6"
          >
            {hero.subtitulo}
          </motion.p>
        )}

        {fechaLegible && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="inline-flex items-center gap-2 mb-10 px-5 py-2.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white font-semibold"
          >
            📅 {fechaLegible}
          </motion.div>
        )}

        {countdown && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
            className="grid grid-cols-3 gap-3 max-w-md mx-auto mb-10"
          >
            {[
              { v: countdown.dias, l: "Días" },
              { v: countdown.horas, l: "Horas" },
              { v: countdown.mins, l: "Min" },
            ].map((c, i) => (
              <div
                key={i}
                className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20"
              >
                <div className="text-4xl lg:text-5xl font-black text-white">{c.v}</div>
                <div className="text-xs text-white/70 uppercase tracking-wider">{c.l}</div>
              </div>
            ))}
          </motion.div>
        )}

        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          onClick={onCtaClick}
          className="inline-flex items-center justify-center px-10 py-5 rounded-full text-lg font-bold text-white shadow-2xl hover:scale-105 transition-transform"
          style={{
            background: `linear-gradient(135deg, ${colorPrimario}, ${colorSecundario})`,
            boxShadow: `0 20px 60px -10px ${colorPrimario}80`,
          }}
        >
          {hero?.cta_texto || "Inscríbete ahora"}
          <span className="ml-2">→</span>
        </motion.button>
      </div>
    </section>
  );
}