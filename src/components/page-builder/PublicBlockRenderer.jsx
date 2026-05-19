import React from "react";
import { motion } from "framer-motion";

// Renderiza los distintos tipos de bloques en la página pública con estética brutal.
export default function PublicBlockRenderer({ bloque, branding }) {
  const { tipo, datos = {} } = bloque || {};
  const color = branding?.color_principal || "#ea580c";

  const wrapper = (children) => (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="max-w-5xl mx-auto px-6 py-12 lg:py-16"
    >
      {children}
    </motion.div>
  );

  if (tipo === "texto") {
    return wrapper(
      <div className="text-center max-w-3xl mx-auto">
        {datos.titulo && (
          <h2 className="text-4xl lg:text-5xl font-black tracking-tight mb-6 text-slate-900">
            {datos.titulo}
          </h2>
        )}
        {datos.contenido && (
          <p className="text-lg lg:text-xl text-slate-600 leading-relaxed whitespace-pre-wrap">
            {datos.contenido}
          </p>
        )}
      </div>
    );
  }

  if (tipo === "stats") {
    const items = datos.items || [];
    return wrapper(
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 lg:gap-8">
        {items.map((item, i) => (
          <div
            key={i}
            className="text-center p-6 lg:p-8 rounded-3xl bg-gradient-to-br from-white to-slate-50 border border-slate-200 shadow-sm"
          >
            <div
              className="text-4xl lg:text-6xl font-black tracking-tight mb-2"
              style={{ color }}
            >
              {item.numero}
            </div>
            <div className="text-sm lg:text-base text-slate-500 font-medium uppercase tracking-wider">
              {item.etiqueta}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (tipo === "lista_iconos") {
    const items = datos.items || [];
    return wrapper(
      <div className="max-w-4xl mx-auto">
        {datos.titulo && (
          <h2 className="text-3xl lg:text-4xl font-black text-center mb-10 text-slate-900">
            {datos.titulo}
          </h2>
        )}
        <div className="grid md:grid-cols-2 gap-4">
          {items.map((item, i) => (
            <div
              key={i}
              className="flex items-start gap-4 p-5 rounded-2xl bg-white border border-slate-200 hover:shadow-md transition-shadow"
            >
              <div className="text-3xl flex-shrink-0">{item.icono}</div>
              <div className="text-base lg:text-lg text-slate-700 font-medium pt-1">
                {item.texto}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (tipo === "faq") {
    const items = datos.items || [];
    return wrapper(
      <div className="max-w-3xl mx-auto">
        {datos.titulo && (
          <h2 className="text-3xl lg:text-4xl font-black text-center mb-10 text-slate-900">
            {datos.titulo}
          </h2>
        )}
        <div className="space-y-3">
          {items.map((item, i) => (
            <details
              key={i}
              className="group bg-white border border-slate-200 rounded-2xl overflow-hidden"
            >
              <summary className="cursor-pointer p-5 font-bold text-slate-900 flex items-center justify-between hover:bg-slate-50">
                <span>{item.pregunta}</span>
                <span className="text-slate-400 group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <div className="px-5 pb-5 text-slate-600 leading-relaxed">
                {item.respuesta}
              </div>
            </details>
          ))}
        </div>
      </div>
    );
  }

  if (tipo === "imagen") {
    return wrapper(
      <div className="max-w-5xl mx-auto">
        <img
          src={datos.url}
          alt={datos.alt || ""}
          className="w-full rounded-3xl shadow-2xl"
        />
        {datos.pie && (
          <p className="text-center text-sm text-slate-500 mt-4 italic">{datos.pie}</p>
        )}
      </div>
    );
  }

  if (tipo === "video") {
    return wrapper(
      <div className="max-w-4xl mx-auto aspect-video rounded-3xl overflow-hidden shadow-2xl">
        <iframe
          src={datos.url}
          className="w-full h-full"
          allowFullScreen
          title="Video"
        />
      </div>
    );
  }

  if (tipo === "cta_button") {
    return wrapper(
      <div className="text-center">
        <a
          href={datos.url || "#formulario"}
          className="inline-flex items-center justify-center px-10 py-5 rounded-full text-lg font-bold text-white shadow-2xl hover:scale-105 transition-transform"
          style={{ background: `linear-gradient(135deg, ${color}, ${branding?.color_secundario || color})` }}
        >
          {datos.texto || "Empezar"}
        </a>
      </div>
    );
  }

  if (tipo === "divisor") {
    return (
      <div className="max-w-5xl mx-auto px-6">
        <div className="h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent" />
      </div>
    );
  }

  return null;
}