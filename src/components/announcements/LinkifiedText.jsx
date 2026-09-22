import React from "react";

// Convierte los enlaces escritos dentro del texto en enlaces clicables
const URL_REGEX = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;

export default function LinkifiedText({ text = "", className = "" }) {
  const parts = String(text).split(URL_REGEX);

  return (
    <span className={className}>
      {parts.map((part, i) => {
        if (!part) return null;
        const isUrl = /^(https?:\/\/|www\.)/i.test(part);
        if (!isUrl) return <React.Fragment key={i}>{part}</React.Fragment>;
        // Quitar signos finales de puntuación para no romper el enlace
        const clean = part.replace(/[.,;:)\]]+$/, "");
        const trailing = part.slice(clean.length);
        const href = clean.startsWith("http") ? clean : `https://${clean}`;
        return (
          <React.Fragment key={i}>
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline break-all hover:text-blue-800"
              onClick={(e) => e.stopPropagation()}
            >
              {clean}
            </a>
            {trailing}
          </React.Fragment>
        );
      })}
    </span>
  );
}