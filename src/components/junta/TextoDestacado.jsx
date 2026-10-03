import React from "react";

// Convierte **texto** en negrita destacada
export default function TextoDestacado({ texto }) {
  return (texto || "").split(/(\*\*[^*]+\*\*)/g).map((p, i) =>
    p.startsWith("**") && p.endsWith("**")
      ? <b key={i} className="text-orange-700">{p.slice(2, -2)}</b>
      : <React.Fragment key={i}>{p}</React.Fragment>
  );
}