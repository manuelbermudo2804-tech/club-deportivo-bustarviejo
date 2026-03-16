import React, { useRef, useState } from "react";
import html2canvas from "html2canvas";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";

const BG_URL = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6992c6be619d2da592897991/b76322ed2_fondo.jpg";
const LOGO_URL = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6992c6be619d2da592897991/528c07844_logo_cd_bustarviejo_grande.jpg";
const QR_URL = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6992c6be619d2da592897991/7ec5ded71_image.png";

export default function PosterGenerator() {
  const posterRef = useRef(null);
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    if (!posterRef.current) return;
    setDownloading(true);
    try {
      const canvas = await html2canvas(posterRef.current, {
        scale: 3,
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
        width: 794,
        height: 1123,
      });
      const link = document.createElement("a");
      link.download = "cartel_cd_bustarviejo_2026.png";
      link.href = canvas.toDataURL("image/png", 1.0);
      link.click();
    } catch (e) {
      console.error("Error generando imagen:", e);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="p-4 lg:p-8 space-y-6">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">🖨️ Cartel de Captación</h1>
          <p className="text-sm text-slate-600 mt-1">Descarga el cartel en alta calidad para imprimir</p>
        </div>
        <Button
          onClick={handleDownload}
          disabled={downloading}
          className="bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white font-bold px-6 py-3 text-base"
          size="lg"
        >
          {downloading ? (
            <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Generando...</>
          ) : (
            <><Download className="w-5 h-5 mr-2" /> Descargar Cartel HD</>
          )}
        </Button>
      </div>

      {/* Preview wrapper - scrollable on mobile */}
      <div className="flex justify-center overflow-x-auto pb-4">
        <div className="flex-shrink-0">
          {/* ====== THE POSTER (A4 ratio: 794×1123px at 1x) ====== */}
          <div
            ref={posterRef}
            style={{
              width: 794,
              height: 1123,
              position: "relative",
              overflow: "hidden",
              fontFamily: "'Segoe UI', Arial, Helvetica, sans-serif",
            }}
          >
            {/* Background image */}
            <img
              src={BG_URL}
              alt=""
              crossOrigin="anonymous"
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />

            {/* Dark overlay for readability */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.30) 35%, rgba(0,0,0,0.25) 55%, rgba(0,0,0,0.70) 85%, rgba(0,0,0,0.85) 100%)",
              }}
            />

            {/* Top orange accent bar */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: 6,
                background: "linear-gradient(90deg, #ea580c 0%, #f97316 50%, #ea580c 100%)",
              }}
            />

            {/* Content */}
            <div
              style={{
                position: "relative",
                zIndex: 10,
                height: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                padding: "36px 40px 32px",
              }}
            >
              {/* Logo */}
              <img
                src={LOGO_URL}
                alt="CD Bustarviejo"
                crossOrigin="anonymous"
                style={{
                  width: 160,
                  height: 160,
                  objectFit: "contain",
                  borderRadius: 16,
                  marginBottom: 16,
                  filter: "drop-shadow(0 4px 20px rgba(0,0,0,0.5))",
                }}
              />

              {/* Decorative line */}
              <div style={{ width: 120, height: 3, background: "#ea580c", borderRadius: 2, marginBottom: 20 }} />

              {/* Main headline */}
              <div style={{ textAlign: "center", marginBottom: 8 }}>
                <div
                  style={{
                    fontSize: 17,
                    fontWeight: 700,
                    color: "#f97316",
                    letterSpacing: 6,
                    textTransform: "uppercase",
                    marginBottom: 6,
                    textShadow: "0 2px 8px rgba(0,0,0,0.7)",
                  }}
                >
                  Temporada 2025/2026
                </div>
                <div
                  style={{
                    fontSize: 52,
                    fontWeight: 900,
                    color: "white",
                    lineHeight: 1.05,
                    textShadow: "0 3px 20px rgba(0,0,0,0.8), 0 1px 4px rgba(0,0,0,0.9)",
                    letterSpacing: -1,
                  }}
                >
                  ¡ÚNETE A<br/>NUESTRA<br/>FAMILIA!
                </div>
              </div>

              {/* Subtitle */}
              <div
                style={{
                  fontSize: 16,
                  color: "#fcd9b6",
                  textAlign: "center",
                  lineHeight: 1.5,
                  maxWidth: 520,
                  marginBottom: 20,
                  textShadow: "0 2px 8px rgba(0,0,0,0.8)",
                }}
              >
                Más de 35 años formando deportistas y personas en Bustarviejo
              </div>

              {/* Feature cards */}
              <div
                style={{
                  display: "flex",
                  gap: 12,
                  marginBottom: 22,
                  width: "100%",
                  justifyContent: "center",
                }}
              >
                {[
                  { emoji: "⚽", title: "Fútbol", sub: "Todas las categorías" },
                  { emoji: "🏀", title: "Baloncesto", sub: "Formación mixta" },
                  { emoji: "👧", title: "Femenino", sub: "¡Nueva sección!" },
                ].map((item, i) => (
                  <div
                    key={i}
                    style={{
                      background: "rgba(255,255,255,0.12)",
                      backdropFilter: "blur(10px)",
                      border: "1px solid rgba(255,255,255,0.2)",
                      borderRadius: 14,
                      padding: "14px 18px",
                      textAlign: "center",
                      flex: "0 0 200px",
                    }}
                  >
                    <div style={{ fontSize: 30, marginBottom: 4 }}>{item.emoji}</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: "white" }}>{item.title}</div>
                    <div style={{ fontSize: 12, color: "#fcd9b6" }}>{item.sub}</div>
                  </div>
                ))}
              </div>

              {/* Ages banner */}
              <div
                style={{
                  background: "linear-gradient(135deg, #ea580c, #c2410c)",
                  borderRadius: 14,
                  padding: "14px 32px",
                  textAlign: "center",
                  marginBottom: 18,
                  boxShadow: "0 4px 20px rgba(234,88,12,0.5)",
                  width: "85%",
                }}
              >
                <div style={{ fontSize: 20, fontWeight: 900, color: "white", letterSpacing: 1 }}>
                  DESDE LOS 4 AÑOS HASTA ADULTOS
                </div>
                <div style={{ fontSize: 13, color: "#fef3c7", marginTop: 2 }}>
                  Pre-Benjamín · Benjamín · Alevín · Infantil · Cadete · Juvenil · Aficionado
                </div>
              </div>

              {/* Highlights */}
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 8,
                  justifyContent: "center",
                  marginBottom: 20,
                  maxWidth: 620,
                }}
              >
                {["Entrenadores titulados", "Valores y compañerismo", "Instalaciones municipales", "Precios accesibles", "App del club", "Seguro deportivo"].map((txt, i) => (
                  <div
                    key={i}
                    style={{
                      background: "rgba(255,255,255,0.15)",
                      border: "1px solid rgba(255,255,255,0.25)",
                      borderRadius: 20,
                      padding: "6px 16px",
                      fontSize: 12,
                      fontWeight: 600,
                      color: "white",
                    }}
                  >
                    ✓ {txt}
                  </div>
                ))}
              </div>

              {/* Spacer */}
              <div style={{ flex: 1 }} />

              {/* Bottom section: QR + contact */}
              <div
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 20,
                  background: "rgba(0,0,0,0.50)",
                  backdropFilter: "blur(10px)",
                  borderRadius: 18,
                  padding: "20px 28px",
                  border: "1px solid rgba(255,255,255,0.15)",
                }}
              >
                {/* Left: Contact */}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: "white", marginBottom: 8 }}>
                    ¡INSCRÍBETE YA!
                  </div>
                  <div style={{ fontSize: 13, color: "#e2e8f0", lineHeight: 1.7 }}>
                    📧 cdbustarviejo@gmail.com<br/>
                    📍 Bustarviejo, Madrid<br/>
                    🌐 Escanea el QR →
                  </div>
                </div>

                {/* Right: QR */}
                <div
                  style={{
                    background: "white",
                    borderRadius: 14,
                    padding: 10,
                    flexShrink: 0,
                    boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
                  }}
                >
                  <img
                    src={QR_URL}
                    alt="QR"
                    crossOrigin="anonymous"
                    style={{ width: 110, height: 110, display: "block" }}
                  />
                </div>
              </div>

              {/* Bottom orange bar */}
              <div
                style={{
                  marginTop: 16,
                  width: "100%",
                  textAlign: "center",
                  fontSize: 11,
                  color: "#f97316",
                  fontWeight: 700,
                  letterSpacing: 3,
                  textTransform: "uppercase",
                }}
              >
                Club Deportivo Bustarviejo · Desde 1989
              </div>
            </div>

            {/* Bottom orange accent bar */}
            <div
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                height: 6,
                background: "linear-gradient(90deg, #ea580c 0%, #f97316 50%, #ea580c 100%)",
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}