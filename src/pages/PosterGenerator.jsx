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

      <div className="flex justify-center overflow-x-auto pb-4">
        <div className="flex-shrink-0">
          {/* ====== POSTER A4: 794×1123 ====== */}
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
            {/* Background */}
            <img
              src={BG_URL}
              alt=""
              crossOrigin="anonymous"
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
            />

            {/* Sepia/warm overlay to match the reference */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "linear-gradient(180deg, rgba(60,30,10,0.55) 0%, rgba(40,20,5,0.40) 35%, rgba(30,15,5,0.35) 55%, rgba(20,10,0,0.65) 80%, rgba(10,5,0,0.88) 100%)",
                mixBlendMode: "multiply",
              }}
            />
            {/* Warm tint */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "rgba(120, 60, 20, 0.18)",
                mixBlendMode: "overlay",
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
                padding: "40px 50px 30px",
              }}
            >
              {/* ========== TOP: Logo grande ========== */}
              <img
                src={LOGO_URL}
                alt="CD Bustarviejo"
                crossOrigin="anonymous"
                style={{
                  width: 200,
                  height: 200,
                  objectFit: "contain",
                  borderRadius: 16,
                  filter: "drop-shadow(0 6px 30px rgba(0,0,0,0.7))",
                  marginBottom: 28,
                }}
              />

              {/* ========== Club name ========== */}
              <div
                style={{
                  fontSize: 46,
                  fontWeight: 900,
                  color: "white",
                  textAlign: "center",
                  lineHeight: 1.1,
                  letterSpacing: 2,
                  textShadow: "0 3px 20px rgba(0,0,0,0.8), 0 1px 3px rgba(0,0,0,0.9)",
                  marginBottom: 10,
                }}
              >
                CLUB DEPORTIVO<br />BUSTARVIEJO
              </div>

              {/* Subtitle */}
              <div
                style={{
                  fontSize: 18,
                  color: "#e8cdb5",
                  textAlign: "center",
                  letterSpacing: 3,
                  fontWeight: 500,
                  textShadow: "0 2px 8px rgba(0,0,0,0.7)",
                  marginBottom: 32,
                }}
              >
                Deporte &nbsp;·&nbsp; Valores &nbsp;·&nbsp; Comunidad
              </div>

              {/* ========== TODO EL CLUB, AQUÍ ========== */}
              <div
                style={{
                  fontSize: 34,
                  fontWeight: 900,
                  color: "white",
                  textAlign: "center",
                  letterSpacing: 2,
                  textShadow: "0 3px 16px rgba(0,0,0,0.8), 0 1px 3px rgba(0,0,0,0.9)",
                  marginBottom: 24,
                }}
              >
                TODO EL CLUB, AQUÍ
              </div>

              {/* ========== QR CARD ========== */}
              <div
                style={{
                  background: "linear-gradient(145deg, rgba(255,255,255,0.95), rgba(245,240,230,0.95))",
                  borderRadius: 24,
                  padding: "24px 28px 22px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  boxShadow: "0 12px 50px rgba(0,0,0,0.5), 0 4px 16px rgba(0,0,0,0.3)",
                  border: "3px solid rgba(180,120,60,0.3)",
                  marginBottom: 6,
                }}
              >
                {/* QR with club logo overlay */}
                <div style={{ position: "relative", marginBottom: 16 }}>
                  <img
                    src={QR_URL}
                    alt="QR"
                    crossOrigin="anonymous"
                    style={{
                      width: 260,
                      height: 260,
                      display: "block",
                    }}
                  />
                  {/* Small logo in center of QR */}
                  <div
                    style={{
                      position: "absolute",
                      top: "50%",
                      left: "50%",
                      transform: "translate(-50%, -50%)",
                      background: "white",
                      borderRadius: 10,
                      padding: 4,
                      boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
                    }}
                  >
                    <img
                      src={LOGO_URL}
                      alt=""
                      crossOrigin="anonymous"
                      style={{ width: 48, height: 48, objectFit: "contain", borderRadius: 6 }}
                    />
                  </div>
                </div>

                {/* Texts under QR */}
                <div
                  style={{
                    textAlign: "center",
                    color: "#3a2010",
                    lineHeight: 1.6,
                  }}
                >
                  <div style={{ fontSize: 17, fontWeight: 700 }}>Hazte socio</div>
                  <div style={{ fontSize: 17, fontWeight: 700 }}>Formulario jugador@s</div>
                  <div style={{ fontSize: 15, fontWeight: 500, color: "#5a3a20" }}>
                    Tienda &nbsp;·&nbsp; Información
                  </div>
                </div>

                {/* Tagline */}
                <div
                  style={{
                    marginTop: 10,
                    fontSize: 13,
                    fontStyle: "italic",
                    color: "#7a5a3a",
                    letterSpacing: 0.5,
                  }}
                >
                  Un club abierto a toda la comunidad
                </div>
              </div>

              {/* Spacer */}
              <div style={{ flex: 1 }} />

              {/* ========== Bottom slogan ========== */}
              <div
                style={{
                  textAlign: "center",
                  marginBottom: 6,
                }}
              >
                <div
                  style={{
                    fontSize: 22,
                    fontWeight: 900,
                    color: "white",
                    letterSpacing: 3,
                    textShadow: "0 2px 12px rgba(0,0,0,0.8)",
                    marginBottom: 8,
                  }}
                >
                  TU CLUB. TU PUEBLO. TU DEPORTE.
                </div>
                <div
                  style={{
                    fontSize: 14,
                    color: "#c8a882",
                    letterSpacing: 2,
                    fontWeight: 500,
                  }}
                >
                  www.cdbustarviejo.com
                </div>
              </div>
            </div>

            {/* Bottom accent bar */}
            <div
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                height: 5,
                background: "linear-gradient(90deg, #8b4513 0%, #d2691e 50%, #8b4513 100%)",
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}