import React from "react";
import ReactMarkdown from "react-markdown";

// Renderiza los textos de la campaña respetando el formato pegado
// (títulos, negritas, listas) con tipografía legible sobre fondo oscuro/claro.
export default function TextoLoteria({ texto, oscuro = true }) {
  if (!texto) return null;

  const base = oscuro ? "text-amber-50" : "text-slate-700";
  const titulo = oscuro ? "text-amber-300" : "text-slate-900";
  const fuerte = oscuro ? "text-white" : "text-slate-900";

  return (
    <div className={`${base} text-[17px] leading-relaxed space-y-3`}>
      <ReactMarkdown
        components={{
          h1: ({ children }) => (
            <h2 className={`${titulo} text-2xl font-black leading-tight text-center`}>{children}</h2>
          ),
          h2: ({ children }) => (
            <h3 className={`${titulo} text-xl font-bold leading-snug`}>{children}</h3>
          ),
          h3: ({ children }) => (
            <h4 className={`${titulo} text-lg font-bold`}>{children}</h4>
          ),
          p: ({ children }) => <p className="leading-relaxed">{children}</p>,
          strong: ({ children }) => <strong className={`${fuerte} font-bold`}>{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
          ul: ({ children }) => <ul className="space-y-2 pl-1">{children}</ul>,
          ol: ({ children }) => <ol className="space-y-2 pl-5 list-decimal">{children}</ol>,
          li: ({ children }) => (
            <li className="flex gap-2">
              <span className={oscuro ? "text-amber-400" : "text-red-600"}>•</span>
              <span className="flex-1">{children}</span>
            </li>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className={oscuro ? "text-amber-300 underline" : "text-blue-600 underline"}
            >
              {children}
            </a>
          ),
          hr: () => <hr className={oscuro ? "border-amber-400/30" : "border-slate-200"} />,
        }}
      >
        {texto}
      </ReactMarkdown>
    </div>
  );
}