import React, { useState } from "react";
import jsPDF from "jspdf";
import { Button } from "@/components/ui/button";
import { Download, FileText, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

const CLUB_LOGO_URL = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/e3f0a8e26_logo_cd_bustarviejo_mediano.jpg";

// === DEFINICIÓN DEL CUESTIONARIO ===
const BLOQUES = [
  {
    titulo: "BLOQUE 1 — Modelo organizativo y responsabilidades",
    icon: "🏛️",
    preguntas: [
      "¿Quién es el organizador oficial de la liga? (Ayuntamiento, Concejalía de Deportes, empresa externa…)",
      "¿Quién aparecerá como entidad responsable a efectos legales y de comunicación pública?",
      "¿Cuál es el rol exacto del CD Bustarviejo? (Solo gestión digital / Gestión + arbitraje / Organización completa / Otro)",
      "¿Habrá una persona designada del Ayuntamiento como interlocutor único? Nombre y teléfono",
      "¿Quién tendrá la última palabra en decisiones deportivas? (resultados disputados, sanciones, descalificaciones)",
    ],
  },
  {
    titulo: "BLOQUE 2 — Formato de la liga",
    icon: "🎾",
    preguntas: [
      "Nombre oficial de la liga (ej: \"I Liga Municipal de Pádel de Bustarviejo 2026\")",
      "¿Confirmáis las 3 categorías del Excel? Categoría A (Avanzados, Elo 1500), B (Medios, Elo 1000), C (Iniciación, Elo 500)",
      "¿Queréis añadir categoría Femenina independiente? ¿O Mixta? ¿Veteranos (+45)?",
      "¿Quién decide en qué categoría entra cada jugador? (Auto-declaración / Comité / Ranking previo)",
      "¿Cuántos jugadores máximo/mínimo por categoría?",
      "¿Hay límite total de inscritos?",
      "Modalidad: ¿Parejas fijas / Individual con parejas rotatorias (americana) / Mixto?",
      "Sistema de puntuación: ¿Elo (como el Excel) o puntos clásicos (3 victoria / 1 empate)?",
    ],
  },
  {
    titulo: "BLOQUE 3 — Calendario y partidos",
    icon: "📅",
    preguntas: [
      "Fecha de inicio prevista de la liga",
      "Fecha de fin / cierre",
      "¿Hay parón en verano / festivos / Navidad? Fechas concretas",
      "Frecuencia de partidos: ¿1/semana? ¿2? ¿libre?",
      "¿Los partidos se programan o las parejas los conciertan libremente?",
      "¿Cuántas pistas municipales hay disponibles para la liga?",
      "Horarios disponibles para uso de pistas",
      "¿Se reservan las pistas a través de la app o aparte? Si es aparte, ¿qué sistema usáis ahora?",
      "¿Hay árbitros o los jugadores se auto-arbitran?",
    ],
  },
  {
    titulo: "BLOQUE 4 — Inscripciones y cobros",
    icon: "💰",
    preguntas: [
      "Precio de inscripción por jugador (€)",
      "¿Hay descuentos? (Empadronados / Socios CD Bustarviejo / Familiares / Jóvenes / Mayores / Otros)",
      "¿Quién cobra a los jugadores? (Ayto / Club / Pago directo online TPV)",
      "Métodos de pago aceptados (Transferencia / Bizum / Tarjeta online / Presencial)",
      "¿Qué incluye la inscripción? (camiseta, agua, trofeos, seguro, uso de pistas…)",
      "¿Hay seguro deportivo obligatorio? ¿Quién lo gestiona y paga?",
      "¿Política de devoluciones / bajas?",
    ],
  },
  {
    titulo: "BLOQUE 5 — Datos de los jugadores",
    icon: "👥",
    preguntas: [
      "Datos obligatorios a recoger (Nombre, DNI, Fecha nacimiento, Email, Teléfono, Dirección, Foto, Empadronamiento, Talla, etc.)",
      "¿Edad mínima permitida? ¿Y para menores, autorización paterna?",
      "¿Aceptación de RGPD personalizada del Ayuntamiento? ¿Tenéis vuestro texto legal o usamos uno estándar?",
      "¿Quién es el responsable del tratamiento de datos? (Ayto o Club) — CLAVE",
      "¿Necesitáis que los jugadores firmen algún documento físico además?",
    ],
  },
  {
    titulo: "BLOQUE 6 — Acceso y visibilidad pública",
    icon: "🌐",
    preguntas: [
      "¿La web de la liga debe ser pública (cualquiera puede ver ranking, partidos, jugadores)?",
      "URL deseada: ¿cdbustarviejo.com/padel, padelbustarviejo.es, dominio propio del Ayto…?",
      "¿Aparecerá el logo del Ayuntamiento? (Pasar versión oficial en alta calidad)",
      "¿Aparecerá el logo de la Concejalía de Deportes?",
      "¿Aparecerán logos de patrocinadores? ¿Vosotros los gestionáis o nosotros?",
      "Colores corporativos del Ayuntamiento (para personalizar la web)",
      "¿Queréis integración con redes sociales del Ayto? (publicación automática de resultados, etc.)",
    ],
  },
  {
    titulo: "BLOQUE 7 — Funcionalidades deseadas",
    icon: "📱",
    preguntas: [
      "IMPRESCINDIBLES: Inscripción online / Ranking en vivo / Registro de partidos con Elo / Listado de jugadores / Calendario",
      "RECOMENDABLES: Notificaciones push-email / Perfil individual con historial / Estadísticas / Exportación Excel / Galería / Calculadora Elo",
      "OPCIONALES (encarece): App móvil PWA / Reserva de pistas / Chat / Sistema de retos / Streaming / Votación / Premios automáticos / Banner patrocinadores",
      "¿Hay alguna funcionalidad concreta no listada que consideréis imprescindible?",
    ],
  },
  {
    titulo: "BLOQUE 8 — Gestión y administración",
    icon: "👨‍💼",
    preguntas: [
      "¿Cuántas personas del Ayto necesitarán acceso de administrador? Nombre + email de cada una",
      "¿Necesitan permisos diferentes? (algunos solo lectura, otros gestión completa)",
      "¿Quién introducirá los resultados de los partidos? (Jugadores auto-reporte / Admin Ayto / Admin Club / Mixto)",
      "¿Necesitáis informes periódicos (semanales, mensuales)?",
      "¿Necesitáis exportar datos para vuestros propios sistemas/Excel?",
    ],
  },
  {
    titulo: "BLOQUE 9 — Premios y finalización",
    icon: "🏆",
    preguntas: [
      "¿Hay premios al final de la liga? ¿Cuáles? (trofeos, material, dinero, etc.)",
      "¿Premios por categoría o solo absoluto?",
      "¿Ceremonia de entrega? Fecha y lugar",
      "¿Habrá un evento final tipo \"Master Final\" entre los mejores?",
      "¿Se publica un palmarés histórico de ganadores de cada edición?",
    ],
  },
  {
    titulo: "BLOQUE 10 — Comunicación con jugadores",
    icon: "📞",
    preguntas: [
      "¿Cómo queréis comunicaros con los jugadores? (Email / WhatsApp / SMS / Avisos en app)",
      "¿Quién redacta y envía las comunicaciones oficiales?",
      "¿Necesitáis un email de contacto público para incidencias? (ej: padel@aytobustarviejo.es)",
      "¿Habrá un teléfono de soporte para los jugadores?",
    ],
  },
  {
    titulo: "BLOQUE 11 — Aspectos económicos del servicio (Ayto ↔ Club)",
    icon: "💼",
    preguntas: [
      "Modalidad de contratación del servicio: ¿Contrato menor / Convenio de colaboración / Encargo de gestión / Subvención condicionada?",
      "¿Pago único o fraccionado? (al inicio, al final, mensual…)",
      "¿IVA incluido o no? El club es no lucrativo — confirmar tratamiento fiscal",
      "¿Requerís presupuesto formal antes de firmar?",
      "¿Necesitáis facturas o vale con un recibo de servicios?",
      "¿Hay fecha límite para presentar la propuesta económica?",
    ],
  },
  {
    titulo: "BLOQUE 12 — Aspectos legales y técnicos",
    icon: "⚖️",
    preguntas: [
      "¿El Ayuntamiento exige cumplir alguna normativa específica? (ENS, accesibilidad WCAG, etc.)",
      "¿Se requiere que los datos estén alojados en servidores europeos? (RGPD)",
      "¿Quién es propietario de los datos generados durante la liga? (jugadores, resultados…)",
      "Al finalizar la liga, ¿qué pasa con la plataforma? (Se mantiene / Se archiva / Se entrega al Ayto)",
      "¿Existe alguna plataforma o sistema previo del Ayto con el que debamos integrarnos?",
    ],
  },
  {
    titulo: "BLOQUE 13 — Plazos",
    icon: "🚀",
    preguntas: [
      "Fecha objetivo de lanzamiento de la web pública",
      "Fecha objetivo de apertura de inscripciones",
      "¿Hay algún acto de presentación oficial? (rueda de prensa, etc.)",
      "¿Plazo máximo para tener todo listo?",
    ],
  },
  {
    titulo: "BLOQUE 14 — Otros",
    icon: "❓",
    preguntas: [
      "¿Edición piloto o liga consolidada? ¿Es la primera vez o ya se hizo en años anteriores?",
      "Si ya hubo ediciones anteriores, ¿tenéis datos históricos que queráis migrar?",
      "¿Tenéis contacto con otros municipios que ya hayan hecho algo similar y queráis tomar como referencia?",
      "¿Hay algún aspecto que no hayamos cubierto y que consideréis importante?",
      "Observaciones libres / comentarios",
    ],
  },
];

const loadImageAsDataUrl = async (url) => {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch { return null; }
};

const generarPDF = async () => {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = 210;
  const pageH = 297;
  const marginX = 18;
  let y = 0;

  const logoData = await loadImageAsDataUrl(CLUB_LOGO_URL);

  // ===== PORTADA =====
  doc.setFillColor(37, 99, 235); // azul pádel
  doc.rect(0, 0, pageW, 80, "F");

  if (logoData) {
    try { doc.addImage(logoData, "JPEG", pageW / 2 - 15, 15, 30, 30); }
    catch { try { doc.addImage(logoData, "PNG", pageW / 2 - 15, 15, 30, 30); } catch {} }
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  doc.text("CUESTIONARIO PREVIO", pageW / 2, 55, { align: "center" });

  doc.setFontSize(14);
  doc.text("Liga de Pádel Municipal", pageW / 2, 65, { align: "center" });

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Servicio de gestión deportiva propuesto al Ayuntamiento", pageW / 2, 73, { align: "center" });

  // Subtítulo
  y = 95;
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("CD Bustarviejo  →  Ayuntamiento de Bustarviejo", pageW / 2, y, { align: "center" });
  y += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(71, 85, 105);
  const intro =
    "Antes de iniciar el desarrollo de la plataforma digital para la Liga de Pádel del municipio, necesitamos confirmar una serie de aspectos. Esto nos permitirá ajustar la herramienta a vuestras necesidades reales, evitar trabajo innecesario y presentar un presupuesto cerrado y exacto.";
  const introLines = doc.splitTextToSize(intro, pageW - marginX * 2);
  doc.text(introLines, marginX, y);
  y += introLines.length * 4.5 + 6;

  // Caja resumen
  doc.setFillColor(239, 246, 255);
  doc.setDrawColor(37, 99, 235);
  doc.setLineWidth(0.4);
  doc.roundedRect(marginX, y, pageW - marginX * 2, 36, 3, 3, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(37, 99, 235);
  doc.text("📋 INSTRUCCIONES", marginX + 4, y + 7);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  const instr = [
    "1. Este documento contiene 14 bloques temáticos con preguntas concretas.",
    "2. Podéis responder en este mismo PDF (campos editables), en un Word adjunto, o por email.",
    "3. Las preguntas marcadas como CLAVE requieren respuesta obligatoria.",
    "4. Si alguna pregunta no aplica, indicad simplemente \"No aplica\".",
  ];
  let instrY = y + 13;
  instr.forEach(line => { doc.text(line, marginX + 4, instrY); instrY += 4.5; });

  y += 44;

  // Datos de contacto
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(37, 99, 235);
  doc.text("📞 CONTACTO PARA DUDAS", marginX, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  doc.setFontSize(9);
  doc.text("CD Bustarviejo  ·  info@cdbustarviejo.com  ·  CIF G80877673", marginX, y);

  // Fecha
  y = pageH - 25;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  const fecha = new Date().toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });
  doc.text(`Documento generado el ${fecha}`, pageW / 2, y, { align: "center" });

  // Banda inferior
  doc.setFillColor(37, 99, 235);
  doc.rect(0, pageH - 5, pageW, 5, "F");

  // ===== BLOQUES =====
  BLOQUES.forEach((bloque, idx) => {
    doc.addPage();

    // Banda lateral azul
    doc.setFillColor(37, 99, 235);
    doc.rect(0, 0, 4, pageH, "F");

    // Header del bloque
    y = 20;
    doc.setFillColor(239, 246, 255);
    doc.roundedRect(marginX, y, pageW - marginX * 2, 14, 2, 2, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(37, 99, 235);
    doc.text(bloque.titulo, marginX + 4, y + 9);

    y += 22;

    // Preguntas
    bloque.preguntas.forEach((pregunta, pIdx) => {
      // Nuevo página si no cabe
      if (y > pageH - 50) {
        doc.addPage();
        doc.setFillColor(37, 99, 235);
        doc.rect(0, 0, 4, pageH, "F");
        y = 20;
      }

      // Número de pregunta
      doc.setFillColor(37, 99, 235);
      doc.circle(marginX + 3, y + 1, 2.5, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(255, 255, 255);
      doc.text(String(pIdx + 1), marginX + 3, y + 2, { align: "center" });

      // Texto pregunta
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(15, 23, 42);
      const preguntaLines = doc.splitTextToSize(pregunta, pageW - marginX * 2 - 10);
      doc.text(preguntaLines, marginX + 9, y + 2);
      y += preguntaLines.length * 4.5 + 2;

      // Caja para respuesta
      const cajaH = 18;
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.3);
      doc.setFillColor(252, 252, 252);
      doc.roundedRect(marginX + 9, y, pageW - marginX * 2 - 9, cajaH, 1.5, 1.5, "FD");

      doc.setFont("helvetica", "italic");
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text("Respuesta:", marginX + 12, y + 4);

      y += cajaH + 5;
    });

    // Footer de página
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(marginX, pageH - 12, pageW - marginX, pageH - 12);

    doc.setFont("helvetica", "italic");
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(`Cuestionario Liga de Pádel · CD Bustarviejo · Bloque ${idx + 1} de ${BLOQUES.length}`, pageW / 2, pageH - 7, { align: "center" });
  });

  // ===== PÁGINA FINAL — CIERRE =====
  doc.addPage();
  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, pageW, pageH, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(255, 255, 255);
  doc.text("📨 Próximos pasos", pageW / 2, 60, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  const cierre = [
    "Una vez recibidas vuestras respuestas, el CD Bustarviejo",
    "elaborará en un plazo de 5 días hábiles:",
    "",
    "✓ Una propuesta técnica detallada con el alcance funcional",
    "✓ Un cronograma de desarrollo y lanzamiento",
    "✓ Un presupuesto cerrado con el coste del servicio",
    "",
    "",
    "Gracias por confiar en el CD Bustarviejo",
    "para este proyecto deportivo municipal 🎾",
  ];
  let cY = 90;
  cierre.forEach(line => { doc.text(line, pageW / 2, cY, { align: "center" }); cY += 8; });

  if (logoData) {
    try { doc.addImage(logoData, "JPEG", pageW / 2 - 12, pageH - 50, 24, 24); }
    catch { try { doc.addImage(logoData, "PNG", pageW / 2 - 12, pageH - 50, 24, 24); } catch {} }
  }

  doc.setFontSize(9);
  doc.setFont("helvetica", "italic");
  doc.text("CD Bustarviejo · CIF G80877673 · info@cdbustarviejo.com", pageW / 2, pageH - 18, { align: "center" });

  doc.save("Cuestionario_Liga_Padel_Bustarviejo.pdf");
};

export default function CuestionarioPadelPDF() {
  const [generating, setGenerating] = useState(false);

  const handleDownload = async () => {
    setGenerating(true);
    try {
      await generarPDF();
      toast.success("✅ Cuestionario descargado");
    } catch (e) {
      console.error(e);
      toast.error("Error al generar el PDF");
    } finally {
      setGenerating(false);
    }
  };

  const totalPreguntas = BLOQUES.reduce((acc, b) => acc + b.preguntas.length, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 p-4 lg:p-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-blue-600 text-white mb-4 shadow-lg">
            <FileText className="w-10 h-10" />
          </div>
          <h1 className="text-3xl lg:text-4xl font-black text-slate-900 mb-2">Cuestionario Liga de Pádel</h1>
          <p className="text-slate-600">Documento para enviar al Ayuntamiento de Bustarviejo</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-blue-100 p-6 lg:p-8 mb-6">
          <div className="grid grid-cols-3 gap-4 mb-6 pb-6 border-b border-slate-200">
            <div className="text-center">
              <p className="text-3xl font-black text-blue-600">{BLOQUES.length}</p>
              <p className="text-xs text-slate-500 mt-1">Bloques temáticos</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-black text-blue-600">{totalPreguntas}</p>
              <p className="text-xs text-slate-500 mt-1">Preguntas</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-black text-blue-600">PDF</p>
              <p className="text-xs text-slate-500 mt-1">Formato profesional</p>
            </div>
          </div>

          <h2 className="text-lg font-bold text-slate-900 mb-3">📋 Contenido del cuestionario</h2>
          <div className="space-y-2 mb-6">
            {BLOQUES.map((b, i) => (
              <div key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-blue-50 transition-colors">
                <CheckCircle2 className="w-4 h-4 text-blue-600 flex-shrink-0" />
                <span className="text-sm text-slate-700">{b.titulo.replace(/^BLOQUE \d+ — /, "")}</span>
              </div>
            ))}
          </div>

          <Button
            onClick={handleDownload}
            disabled={generating}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white h-14 text-base font-bold shadow-lg"
          >
            <Download className="w-5 h-5 mr-2" />
            {generating ? "Generando PDF..." : "Descargar cuestionario en PDF"}
          </Button>

          <p className="text-xs text-slate-400 text-center mt-4 italic">
            El PDF incluye portada profesional con logo del club, espacios para que el Ayuntamiento responda cada pregunta, y página de cierre con próximos pasos.
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-900">
          <p className="font-bold mb-1">💡 Consejo</p>
          <p>Envíalo por email al interlocutor del Ayuntamiento con un mensaje breve indicando que en cuanto reciban las respuestas les enviarás propuesta técnica y presupuesto formal.</p>
        </div>
      </div>
    </div>
  );
}