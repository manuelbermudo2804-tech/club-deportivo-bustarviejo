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
              fontFamily: "'Georgia', 'Times New Roman', serif",
            }}
          >
            {/* Background */}
            <img
              src={BG_URL}
              alt=""
              crossOrigin="anonymous"
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
            />

            {/* LIGHTER warm overlay - más transparente para que se vea la foto */}
            <div style={{
              position: "absolute", inset: 0,
              background: "linear-gradient(180deg, rgba(180,120,60,0.25) 0%, rgba(140,80,30,0.18) 40%, rgba(100,50,15,0.22) 60%, rgba(40,20,5,0.55) 85%, rgba(15,8,0,0.82) 100%)",
            }} />
            {/* Sepia warm tint */}
            <div style={{
              position: "absolute", inset: 0,
              background: "rgba(160, 100, 50, 0.12)",
              mixBlendMode: "color",
            }} />

            {/* ===== DECORATIVE BORDER ===== */}
            <div style={{
              position: "absolute",
              top: 14, left: 14, right: 14, bottom: 14,
              border: "2px solid rgba(200,160,100,0.45)",
              borderRadius: 8,
              zIndex: 5,
            }} />
            <div style={{
              position: "absolute",
              top: 20, left: 20, right: 20, bottom: 20,
              border: "1px solid rgba(200,160,100,0.25)",
              borderRadius: 4,
              zIndex: 5,
            }} />

            {/* Corner ornaments */}
            {[
              { top: 10, left: 10 },
              { top: 10, right: 10 },
              { bottom: 10, left: 10 },
              { bottom: 10, right: 10 },
            ].map((pos, i) => (
              <div key={i} style={{
                position: "absolute",
                ...pos,
                width: 40, height: 40,
                zIndex: 6,
                borderTop: pos.top !== undefined ? "3px solid rgba(200,150,80,0.6)" : "none",
                borderBottom: pos.bottom !== undefined ? "3px solid rgba(200,150,80,0.6)" : "none",
                borderLeft: pos.left !== undefined ? "3px solid rgba(200,150,80,0.6)" : "none",
                borderRight: pos.right !== undefined ? "3px solid rgba(200,150,80,0.6)" : "none",
              }} />
            ))}

            {/* Content */}
            <div style={{
              position: "relative",
              zIndex: 10,
              height: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              padding: "46px 56px 36px",
            }}>

              {/* ========== LOGO ========== */}
              <img
                src={LOGO_URL}
                alt="CD Bustarviejo"
                crossOrigin="anonymous"
                style={{
                  width: 190,
                  height: 190,
                  objectFit: "contain",
                  borderRadius: 14,
                  filter: "drop-shadow(0 8px 32px rgba(0,0,0,0.6))",
                  marginBottom: 24,
                }}
              />

              {/* ========== CLUB NAME ========== */}
              <div style={{
                fontSize: 50,
                fontWeight: 900,
                color: "white",
                textAlign: "center",
                lineHeight: 1.08,
                letterSpacing: 3,
                textShadow: "0 4px 24px rgba(0,0,0,0.7), 0 1px 2px rgba(0,0,0,0.9), 0 0 60px rgba(200,120,40,0.3)",
                fontFamily: "'Georgia', 'Times New Roman', serif",
                marginBottom: 12,
              }}>
                CLUB DEPORTIVO<br />BUSTARVIEJO
              </div>

              {/* ===== Ornamental divider ===== */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                <div style={{ width: 60, height: 1, background: "linear-gradient(90deg, transparent, rgba(200,160,100,0.7))" }} />
                <div style={{ fontSize: 14, color: "rgba(200,160,100,0.8)" }}>✦</div>
                <div style={{ width: 60, height: 1, background: "linear-gradient(90deg, rgba(200,160,100,0.7), transparent)" }} />
              </div>

              {/* Subtitle */}
              <div style={{
                fontSize: 19,
                color: "#e8cdb5",
                textAlign: "center",
                letterSpacing: 5,
                fontWeight: 400,
                fontStyle: "italic",
                textShadow: "0 2px 10px rgba(0,0,0,0.7)",
                marginBottom: 30,
              }}>
                Deporte &nbsp;·&nbsp; Valores &nbsp;·&nbsp; Comunidad
              </div>

              {/* ========== TODO EL CLUB ========== */}
              <div style={{
                fontSize: 38,
                fontWeight: 900,
                color: "white",
                textAlign: "center",
                letterSpacing: 4,
                textShadow: "0 3px 20px rgba(0,0,0,0.7), 0 0 50px rgba(200,120,40,0.25)",
                fontFamily: "'Segoe UI', Arial, Helvetica, sans-serif",
                marginBottom: 22,
              }}>
                TODO EL CLUB, AQUÍ
              </div>

              {/* ========== QR CARD ========== */}
              <div style={{
                background: "linear-gradient(160deg, rgba(255,252,245,0.96), rgba(245,235,220,0.96))",
                borderRadius: 22,
                padding: "22px 26px 18px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                boxShadow: "0 16px 60px rgba(0,0,0,0.5), 0 4px 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.5)",
                border: "2px solid rgba(180,140,80,0.35)",
                position: "relative",
              }}>

                {/* QR */}
                <div style={{ position: "relative", marginBottom: 14 }}>
                  <img
                    src={QR_URL}
                    alt="QR"
                    crossOrigin="anonymous"
                    style={{ width: 250, height: 250, display: "block" }}
                  />
                  {/* Logo overlay on QR center */}
                  <div style={{
                    position: "absolute",
                    top: "50%", left: "50%",
                    transform: "translate(-50%, -50%)",
                    background: "white",
                    borderRadius: 10, padding: 5,
                    boxShadow: "0 2px 10px rgba(0,0,0,0.25)",
                  }}>
                    <img
                      src={LOGO_URL}
                      alt=""
                      crossOrigin="anonymous"
                      style={{ width: 44, height: 44, objectFit: "contain", borderRadius: 6 }}
                    />
                  </div>
                </div>

                {/* Texts under QR */}
                <div style={{
                  textAlign: "center",
                  color: "#3a2010",
                  lineHeight: 1.7,
                  fontFamily: "'Georgia', 'Times New Roman', serif",
                }}>
                  <div style={{ fontSize: 17, fontWeight: 700 }}>Hazte socio</div>
                  <div style={{ fontSize: 17, fontWeight: 700 }}>Formulario jugador@s</div>
                  <div style={{ fontSize: 15, fontWeight: 400, color: "#6a4a2a" }}>
                    Tienda &nbsp;·&nbsp; Información
                  </div>
                </div>

                {/* Italic tagline */}
                <div style={{
                  marginTop: 8,
                  fontSize: 13,
                  fontStyle: "italic",
                  color: "#8a6a4a",
                  letterSpacing: 0.5,
                }}>
                  Un club abierto a toda la comunidad
                </div>
              </div>

              {/* Spacer */}
              <div style={{ flex: 1 }} />

              {/* ===== Ornamental divider bottom ===== */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                <div style={{ width: 80, height: 1, background: "linear-gradient(90deg, transparent, rgba(200,160,100,0.5))" }} />
                <div style={{ fontSize: 10, color: "rgba(200,160,100,0.6)" }}>◆</div>
                <div style={{ width: 80, height: 1, background: "linear-gradient(90deg, rgba(200,160,100,0.5), transparent)" }} />
              </div>

              {/* ========== SLOGAN ========== */}
              <div style={{
                fontSize: 24,
                fontWeight: 900,
                color: "white",
                letterSpacing: 4,
                textShadow: "0 2px 16px rgba(0,0,0,0.8)",
                textAlign: "center",
                fontFamily: "'Segoe UI', Arial, Helvetica, sans-serif",
                marginBottom: 10,
              }}>
                TU CLUB. TU PUEBLO. TU DEPORTE.
              </div>

              <div style={{
                fontSize: 14,
                color: "#c8a882",
                letterSpacing: 3,
                fontWeight: 400,
              }}>
                www.cdbustarviejo.com
              </div>
            </div>

            {/* Top & bottom accent lines */}
            <div style={{
              position: "absolute", top: 0, left: 0, right: 0, height: 4,
              background: "linear-gradient(90deg, transparent 5%, rgba(180,120,50,0.6) 30%, rgba(200,150,70,0.8) 50%, rgba(180,120,50,0.6) 70%, transparent 95%)",
            }} />
            <div style={{
              position: "absolute", bottom: 0, left: 0, right: 0, height: 4,
              background: "linear-gradient(90deg, transparent 5%, rgba(180,120,50,0.6) 30%, rgba(200,150,70,0.8) 50%, rgba(180,120,50,0.6) 70%, transparent 95%)",
            }} />
          </div>
        </div>
      </div>
    </div>
  );
}