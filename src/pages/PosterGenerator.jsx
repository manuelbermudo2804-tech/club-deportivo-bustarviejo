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
      link.download = "cartel_cd_bustarviejo.png";
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

            {/* Dark overlay */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "linear-gradient(180deg, rgba(0,0,0,0.50) 0%, rgba(0,0,0,0.20) 30%, rgba(0,0,0,0.15) 50%, rgba(0,0,0,0.55) 75%, rgba(0,0,0,0.85) 100%)",
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
                padding: "44px 40px 36px",
              }}
            >
              {/* Logo */}
              <img
                src={LOGO_URL}
                alt="CD Bustarviejo"
                crossOrigin="anonymous"
                style={{
                  width: 170,
                  height: 170,
                  objectFit: "contain",
                  borderRadius: 16,
                  marginBottom: 24,
                  filter: "drop-shadow(0 4px 24px rgba(0,0,0,0.6))",
                }}
              />

              {/* Decorative line */}
              <div style={{ width: 100, height: 3, background: "#ea580c", borderRadius: 2, marginBottom: 28 }} />

              {/* Main headline */}
              <div style={{ textAlign: "center", marginBottom: 16 }}>
                <div
                  style={{
                    fontSize: 58,
                    fontWeight: 900,
                    color: "white",
                    lineHeight: 1.05,
                    textShadow: "0 3px 24px rgba(0,0,0,0.8), 0 1px 4px rgba(0,0,0,0.9)",
                    letterSpacing: -1,
                  }}
                >
                  ¡ÚNETE A<br />NUESTRA<br />FAMILIA!
                </div>
              </div>

              {/* Subtitle */}
              <div
                style={{
                  fontSize: 18,
                  color: "#fcd9b6",
                  textAlign: "center",
                  lineHeight: 1.5,
                  maxWidth: 540,
                  marginBottom: 32,
                  textShadow: "0 2px 10px rgba(0,0,0,0.8)",
                }}
              >
                Más de 35 años formando deportistas<br />y personas en Bustarviejo
              </div>

              {/* CTA banner */}
              <div
                style={{
                  background: "linear-gradient(135deg, #ea580c, #c2410c)",
                  borderRadius: 16,
                  padding: "18px 40px",
                  textAlign: "center",
                  marginBottom: 10,
                  boxShadow: "0 6px 28px rgba(234,88,12,0.5)",
                  width: "80%",
                }}
              >
                <div style={{ fontSize: 24, fontWeight: 900, color: "white", letterSpacing: 1 }}>
                  INSCRIBE A TUS HIJOS
                </div>
                <div style={{ fontSize: 14, color: "#fef3c7", marginTop: 4 }}>
                  o hazte socio del club
                </div>
              </div>

              {/* Spacer */}
              <div style={{ flex: 1 }} />

              {/* Bottom section: QR prominente */}
              <div
                style={{
                  width: "100%",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 20,
                  background: "rgba(0,0,0,0.55)",
                  backdropFilter: "blur(12px)",
                  borderRadius: 20,
                  padding: "28px 32px 24px",
                  border: "1px solid rgba(255,255,255,0.15)",
                }}
              >
                {/* QR heading */}
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: "white", marginBottom: 4 }}>
                    ESCANEA Y ÚNETE
                  </div>
                  <div style={{ fontSize: 14, color: "#cbd5e1" }}>
                    Inscripción de jugadores y socios
                  </div>
                </div>

                {/* QR code - bigger */}
                <div
                  style={{
                    background: "white",
                    borderRadius: 18,
                    padding: 14,
                    boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
                  }}
                >
                  <img
                    src={QR_URL}
                    alt="QR"
                    crossOrigin="anonymous"
                    style={{ width: 170, height: 170, display: "block" }}
                  />
                </div>

                {/* Subtle web reference */}
                <div style={{ fontSize: 13, color: "#94a3b8", letterSpacing: 1 }}>
                  cdbustarviejo.com
                </div>
              </div>

              {/* Bottom text */}
              <div
                style={{
                  marginTop: 18,
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