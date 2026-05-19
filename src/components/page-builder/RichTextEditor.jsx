import React, { useMemo, useRef, useEffect } from "react";
import ReactQuill, { Quill } from "react-quill";
import "react-quill/dist/quill.snow.css";

// Convierte texto plano en HTML con auto-detección de:
// - Párrafos (líneas en blanco)
// - Listas con guiones (-, *, •) o números (1., 2.)
// - Negritas con **texto** y cursiva con *texto*
// - Saltos de línea simples
function plainTextToHtml(text) {
  const escape = (s) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const inline = (s) => {
    let out = escape(s);
    // **negrita**
    out = out.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    // *cursiva*  (evitando que pille las ** ya procesadas)
    out = out.replace(/(^|[\s(])\*([^*\n]+)\*/g, "$1<em>$2</em>");
    return out;
  };

  // Partir en bloques separados por líneas en blanco
  const blocks = text.replace(/\r\n/g, "\n").split(/\n\s*\n/);
  const html = blocks
    .map((block) => {
      const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
      if (lines.length === 0) return "";

      // Lista con viñetas
      const isBullet = lines.every((l) => /^[-*•]\s+/.test(l));
      if (isBullet) {
        const items = lines.map((l) => `<li>${inline(l.replace(/^[-*•]\s+/, ""))}</li>`).join("");
        return `<ul>${items}</ul>`;
      }

      // Lista numerada
      const isNumbered = lines.every((l) => /^\d+[.)]\s+/.test(l));
      if (isNumbered) {
        const items = lines.map((l) => `<li>${inline(l.replace(/^\d+[.)]\s+/, ""))}</li>`).join("");
        return `<ol>${items}</ol>`;
      }

      // Párrafo con <br> internos
      return `<p>${lines.map(inline).join("<br>")}</p>`;
    })
    .filter(Boolean)
    .join("");

  return html;
}

export default function RichTextEditor({ value, onChange, placeholder }) {
  const quillRef = useRef(null);

  const modules = useMemo(
    () => ({
      toolbar: [
        [{ header: [2, 3, false] }],
        ["bold", "italic", "underline"],
        [{ list: "ordered" }, { list: "bullet" }],
        ["link"],
        ["clean"],
      ],
      clipboard: { matchVisual: false },
    }),
    []
  );

  // Auto-formato al pegar TEXTO PLANO (no HTML formateado)
  useEffect(() => {
    const editor = quillRef.current?.getEditor?.();
    if (!editor) return;

    const root = editor.root;
    const onPaste = (e) => {
      const html = e.clipboardData?.getData("text/html");
      // Si ya trae HTML con formato, Quill lo gestiona solo
      if (html && /<(p|ul|ol|li|strong|em|b|i|h\d)/i.test(html)) return;

      const plain = e.clipboardData?.getData("text/plain") || "";
      // Sólo procesar si parece tener estructura (listas, párrafos múltiples, markdown)
      const hasStructure =
        /\n\s*\n/.test(plain) ||
        /^[-*•]\s+/m.test(plain) ||
        /^\d+[.)]\s+/m.test(plain) ||
        /\*\*.+?\*\*/.test(plain);

      if (!hasStructure) return;

      e.preventDefault();
      e.stopPropagation();
      const converted = plainTextToHtml(plain);
      const range = editor.getSelection(true);
      editor.clipboard.dangerouslyPasteHTML(range ? range.index : editor.getLength(), converted);
    };

    root.addEventListener("paste", onPaste);
    return () => root.removeEventListener("paste", onPaste);
  }, []);

  return (
    <div className="rich-text-editor-wrapper">
      <ReactQuill
        ref={quillRef}
        theme="snow"
        value={value || ""}
        onChange={onChange}
        modules={modules}
        placeholder={placeholder || "Escribe o pega aquí tu texto…"}
      />
      <style>{`
        .rich-text-editor-wrapper .ql-toolbar {
          border-top-left-radius: 0.5rem;
          border-top-right-radius: 0.5rem;
          background: #f8fafc;
          border-color: #e2e8f0;
        }
        .rich-text-editor-wrapper .ql-container {
          border-bottom-left-radius: 0.5rem;
          border-bottom-right-radius: 0.5rem;
          border-color: #e2e8f0;
          min-height: 160px;
          font-size: 15px;
          font-family: inherit;
        }
        .rich-text-editor-wrapper .ql-editor {
          min-height: 160px;
        }
      `}</style>
    </div>
  );
}