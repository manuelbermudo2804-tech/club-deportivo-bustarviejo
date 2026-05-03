import React from "react";

// Colores de marca CD Bustarviejo
const CLUB = {
  orange: "#ea580c",
  orangeLight: "#fb923c",
  green: "#15803d",
  greenLight: "#22c55e",
  dark: "#0f172a",
  darkSoft: "#1e293b",
};

const LOGO_URL = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/e3f0a8e26_logo_cd_bustarviejo_mediano.jpg";

// Wrapper común para todos los pósters (1080x1080 cuadrado tipo Instagram)
const PosterFrame = ({ children, bgImage, overlay = "dark" }) => {
  const overlays = {
    dark: "linear-gradient(135deg, rgba(15,23,42,0.85) 0%, rgba(15,23,42,0.65) 50%, rgba(234,88,12,0.55) 100%)",
    orange: "linear-gradient(135deg, rgba(234,88,12,0.85) 0%, rgba(194,65,12,0.75) 50%, rgba(15,23,42,0.85) 100%)",
    green: "linear-gradient(135deg, rgba(21,128,61,0.85) 0%, rgba(15,23,42,0.7) 50%, rgba(234,88,12,0.6) 100%)",
    light: "linear-gradient(135deg, rgba(255,255,255,0.92) 0%, rgba(255,237,213,0.88) 100%)",
  };
  return (
    <div style={{
      width: 1080, height: 1080, position: "relative", overflow: "hidden",
      fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
      backgroundColor: CLUB.dark,
      backgroundImage: bgImage ? `${overlays[overlay]}, url(${bgImage})` : `linear-gradient(135deg, ${CLUB.dark} 0%, ${CLUB.darkSoft} 50%, ${CLUB.orange} 100%)`,
      backgroundSize: "cover", backgroundPosition: "center",
    }}>
      {children}
      {/* Logo + nombre del club abajo izquierda */}
      <div style={{ position: "absolute", bottom: 40, left: 40, display: "flex", alignItems: "center", gap: 16 }}>
        <img src={LOGO_URL} crossOrigin="anonymous" alt="" style={{ width: 70, height: 70, borderRadius: "50%", border: `3px solid ${CLUB.orangeLight}`, objectFit: "cover" }} />
        <div style={{ color: "#fff" }}>
          <div style={{ fontWeight: 900, fontSize: 24, lineHeight: 1, letterSpacing: -0.5 }}>CD BUSTARVIEJO</div>
          <div style={{ fontSize: 14, opacity: 0.85, marginTop: 2 }}>Sierra Norte de Madrid</div>
        </div>
      </div>
      {/* Esquina decorativa */}
      <div style={{ position: "absolute", top: 0, right: 0, width: 200, height: 200, background: `linear-gradient(135deg, ${CLUB.orange} 0%, transparent 100%)`, clipPath: "polygon(100% 0, 0 0, 100% 100%)" }} />
    </div>
  );
};

// ─── Plantilla 1: HERO (titular grande, ideal para anuncios, motivacionales, hitos) ───
export const HeroPoster = ({ title, subtitle, badge, bgImage }) => (
  <PosterFrame bgImage={bgImage} overlay="dark">
    <div style={{ position: "absolute", top: 80, left: 60, right: 60 }}>
      {badge && (
        <div style={{ display: "inline-block", background: CLUB.orange, color: "#fff", padding: "10px 24px", borderRadius: 999, fontSize: 22, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase", marginBottom: 30 }}>
          {badge}
        </div>
      )}
    </div>
    <div style={{ position: "absolute", top: "32%", left: 60, right: 60, color: "#fff" }}>
      <h1 style={{ fontSize: 110, fontWeight: 900, lineHeight: 0.95, letterSpacing: -3, margin: 0, textShadow: "0 4px 20px rgba(0,0,0,0.5)", textTransform: "uppercase" }}>
        {title}
      </h1>
      {subtitle && (
        <p style={{ fontSize: 38, marginTop: 30, opacity: 0.95, lineHeight: 1.2, fontWeight: 500, maxWidth: 900 }}>
          {subtitle}
        </p>
      )}
    </div>
    <div style={{ position: "absolute", bottom: 40, right: 40, color: CLUB.orangeLight, fontSize: 18, fontWeight: 700, letterSpacing: 2 }}>
      ⚽ DESDE 1965
    </div>
  </PosterFrame>
);

// ─── Plantilla 2: RESULTADO (marcador grande tipo TV) ───
export const ResultPoster = ({ team1, team2, score1, score2, category, jornada, bgImage }) => (
  <PosterFrame bgImage={bgImage} overlay="dark">
    <div style={{ position: "absolute", top: 80, left: 0, right: 0, textAlign: "center", color: "#fff" }}>
      <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: 4, opacity: 0.85, textTransform: "uppercase" }}>
        {category} {jornada ? `· Jornada ${jornada}` : ""}
      </div>
      <div style={{ display: "inline-block", background: CLUB.orange, padding: "8px 28px", borderRadius: 8, marginTop: 20, fontSize: 28, fontWeight: 900, letterSpacing: 2 }}>
        RESULTADO FINAL
      </div>
    </div>
    <div style={{ position: "absolute", top: "32%", left: 0, right: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: 40, color: "#fff" }}>
      <div style={{ flex: 1, textAlign: "center" }}>
        <div style={{ fontSize: 42, fontWeight: 900, lineHeight: 1.1, textTransform: "uppercase", padding: "0 30px", textShadow: "0 4px 12px rgba(0,0,0,0.6)" }}>
          {team1}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 20, background: "rgba(0,0,0,0.55)", padding: "30px 50px", borderRadius: 24, border: `4px solid ${CLUB.orange}` }}>
        <div style={{ fontSize: 180, fontWeight: 900, lineHeight: 1, color: CLUB.orangeLight }}>{score1}</div>
        <div style={{ fontSize: 80, fontWeight: 700, opacity: 0.5 }}>:</div>
        <div style={{ fontSize: 180, fontWeight: 900, lineHeight: 1, color: CLUB.orangeLight }}>{score2}</div>
      </div>
      <div style={{ flex: 1, textAlign: "center" }}>
        <div style={{ fontSize: 42, fontWeight: 900, lineHeight: 1.1, textTransform: "uppercase", padding: "0 30px", textShadow: "0 4px 12px rgba(0,0,0,0.6)" }}>
          {team2}
        </div>
      </div>
    </div>
  </PosterFrame>
);

// ─── Plantilla 3: PRÓXIMO PARTIDO (vs estilo cartelera) ───
export const MatchPoster = ({ team1, team2, date, time, venue, category, bgImage }) => (
  <PosterFrame bgImage={bgImage} overlay="orange">
    <div style={{ position: "absolute", top: 80, left: 0, right: 0, textAlign: "center", color: "#fff" }}>
      <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: 6, opacity: 0.9, textTransform: "uppercase" }}>
        {category || "Próximo partido"}
      </div>
      <div style={{ fontSize: 80, fontWeight: 900, marginTop: 20, letterSpacing: -2, textShadow: "0 4px 20px rgba(0,0,0,0.5)" }}>
        ¡VEN AL CAMPO!
      </div>
    </div>
    <div style={{ position: "absolute", top: "36%", left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center", color: "#fff", gap: 30 }}>
      <div style={{ fontSize: 56, fontWeight: 900, textAlign: "center", padding: "0 60px", textTransform: "uppercase", lineHeight: 1.05 }}>
        {team1}
      </div>
      <div style={{ fontSize: 100, fontWeight: 900, color: CLUB.orangeLight, lineHeight: 1, textShadow: "0 6px 20px rgba(0,0,0,0.6)" }}>VS</div>
      <div style={{ fontSize: 56, fontWeight: 900, textAlign: "center", padding: "0 60px", textTransform: "uppercase", lineHeight: 1.05 }}>
        {team2}
      </div>
    </div>
    <div style={{ position: "absolute", bottom: 160, left: 60, right: 60, background: "rgba(0,0,0,0.6)", borderRadius: 20, padding: "24px 30px", display: "flex", justifyContent: "space-around", color: "#fff", border: `2px solid ${CLUB.orangeLight}` }}>
      {date && <div style={{ textAlign: "center" }}><div style={{ fontSize: 14, opacity: 0.7, letterSpacing: 2 }}>FECHA</div><div style={{ fontSize: 28, fontWeight: 800, marginTop: 4 }}>{date}</div></div>}
      {time && <div style={{ textAlign: "center" }}><div style={{ fontSize: 14, opacity: 0.7, letterSpacing: 2 }}>HORA</div><div style={{ fontSize: 28, fontWeight: 800, marginTop: 4 }}>{time}</div></div>}
      {venue && <div style={{ textAlign: "center" }}><div style={{ fontSize: 14, opacity: 0.7, letterSpacing: 2 }}>CAMPO</div><div style={{ fontSize: 28, fontWeight: 800, marginTop: 4 }}>{venue}</div></div>}
    </div>
  </PosterFrame>
);

// ─── Plantilla 4: ANUNCIO (con cuadro destacado tipo flyer) ───
export const AnnouncementPoster = ({ title, body, cta, badge, bgImage }) => (
  <PosterFrame bgImage={bgImage} overlay="green">
    <div style={{ position: "absolute", top: 80, left: 60, right: 60 }}>
      {badge && (
        <div style={{ display: "inline-block", background: "#fff", color: CLUB.green, padding: "10px 26px", borderRadius: 999, fontSize: 22, fontWeight: 900, letterSpacing: 1, textTransform: "uppercase", marginBottom: 30 }}>
          📢 {badge}
        </div>
      )}
    </div>
    <div style={{ position: "absolute", top: "28%", left: 60, right: 60 }}>
      <div style={{ background: "rgba(255,255,255,0.97)", borderRadius: 32, padding: "60px 50px", borderLeft: `12px solid ${CLUB.orange}`, boxShadow: "0 20px 60px rgba(0,0,0,0.4)" }}>
        <h1 style={{ fontSize: 76, fontWeight: 900, color: CLUB.dark, lineHeight: 1, letterSpacing: -2, margin: 0, textTransform: "uppercase" }}>
          {title}
        </h1>
        {body && (
          <p style={{ fontSize: 28, color: "#334155", marginTop: 24, lineHeight: 1.4, fontWeight: 500 }}>
            {body}
          </p>
        )}
        {cta && (
          <div style={{ marginTop: 32, display: "inline-block", background: CLUB.orange, color: "#fff", padding: "16px 36px", borderRadius: 14, fontSize: 26, fontWeight: 800 }}>
            👉 {cta}
          </div>
        )}
      </div>
    </div>
  </PosterFrame>
);

// ─── Plantilla 5: CITA / MOTIVACIONAL (tipográfica fuerte) ───
export const QuotePoster = ({ quote, author, bgImage }) => (
  <PosterFrame bgImage={bgImage} overlay="dark">
    <div style={{ position: "absolute", top: "20%", left: 80, right: 80, color: "#fff" }}>
      <div style={{ fontSize: 200, fontWeight: 900, color: CLUB.orange, lineHeight: 0.8, opacity: 0.6 }}>"</div>
      <h1 style={{ fontSize: 70, fontWeight: 800, lineHeight: 1.15, letterSpacing: -1, margin: 0, textShadow: "0 4px 20px rgba(0,0,0,0.5)", marginTop: -40 }}>
        {quote}
      </h1>
      {author && (
        <div style={{ marginTop: 40, fontSize: 28, fontWeight: 700, color: CLUB.orangeLight, letterSpacing: 1 }}>
          — {author}
        </div>
      )}
    </div>
  </PosterFrame>
);

// ─── Plantilla 6: EVENTO (fecha gigante tipo calendario) ───
export const EventPoster = ({ title, day, month, time, venue, description, bgImage }) => (
  <PosterFrame bgImage={bgImage} overlay="dark">
    <div style={{ position: "absolute", top: 80, left: 60, right: 60, color: "#fff" }}>
      <div style={{ display: "inline-block", background: CLUB.green, padding: "10px 26px", borderRadius: 999, fontSize: 22, fontWeight: 900, letterSpacing: 2, textTransform: "uppercase" }}>
        🎉 EVENTO
      </div>
    </div>
    <div style={{ position: "absolute", top: "26%", left: 60, display: "flex", alignItems: "flex-start", gap: 40 }}>
      <div style={{ background: CLUB.orange, color: "#fff", padding: "20px 40px", borderRadius: 24, textAlign: "center", boxShadow: "0 12px 40px rgba(234,88,12,0.5)" }}>
        <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: 4, textTransform: "uppercase", opacity: 0.95 }}>{month}</div>
        <div style={{ fontSize: 180, fontWeight: 900, lineHeight: 0.95, marginTop: 4 }}>{day}</div>
        {time && <div style={{ fontSize: 32, fontWeight: 800, marginTop: 8, background: "rgba(0,0,0,0.3)", borderRadius: 12, padding: "6px 16px" }}>{time}</div>}
      </div>
      <div style={{ flex: 1, color: "#fff", paddingTop: 20 }}>
        <h1 style={{ fontSize: 70, fontWeight: 900, lineHeight: 1, letterSpacing: -2, margin: 0, textTransform: "uppercase", textShadow: "0 4px 20px rgba(0,0,0,0.5)" }}>
          {title}
        </h1>
        {description && (
          <p style={{ fontSize: 26, marginTop: 24, opacity: 0.92, lineHeight: 1.4, fontWeight: 500 }}>
            {description}
          </p>
        )}
        {venue && (
          <div style={{ marginTop: 30, fontSize: 26, fontWeight: 700, color: CLUB.orangeLight }}>
            📍 {venue}
          </div>
        )}
      </div>
    </div>
  </PosterFrame>
);

export const POSTER_TEMPLATES = [
  { id: "hero", label: "🔥 Hero", description: "Titular épico — ideal para hitos, anuncios potentes, motivacional", component: HeroPoster, fields: ["title", "subtitle", "badge"] },
  { id: "result", label: "🏆 Resultado", description: "Marcador final — ideal para resultados de partido", component: ResultPoster, fields: ["team1", "team2", "score1", "score2", "category", "jornada"] },
  { id: "match", label: "⚽ Partido", description: "VS — ideal para próximo partido / animar al campo", component: MatchPoster, fields: ["team1", "team2", "date", "time", "venue", "category"] },
  { id: "announcement", label: "📢 Anuncio", description: "Cuadro destacado — ideal para anuncios, tienda, lotería, socios", component: AnnouncementPoster, fields: ["title", "body", "cta", "badge"] },
  { id: "quote", label: "💬 Cita", description: "Frase potente — ideal para motivacional, buenos días", component: QuotePoster, fields: ["quote", "author"] },
  { id: "event", label: "📅 Evento", description: "Fecha gigante — ideal para eventos, San Isidro, fiestas", component: EventPoster, fields: ["title", "day", "month", "time", "venue", "description"] },
];

export const getPosterTemplate = (id) => POSTER_TEMPLATES.find(t => t.id === id) || POSTER_TEMPLATES[0];

// Sugerencia automática según el tipo de contenido
export const suggestTemplate = (contentType) => {
  const map = {
    resultados: "result",
    partidos_finde: "match",
    anima_partido: "match",
    convocatorias: "match",
    anuncio: "announcement",
    hazte_socio: "announcement",
    tienda: "announcement",
    loteria: "announcement",
    patrocinadores: "announcement",
    renovaciones: "announcement",
    voluntarios: "announcement",
    femenino: "announcement",
    mercadillo: "announcement",
    sanisidro: "event",
    evento: "event",
    eventos_semana: "event",
    cumple: "event",
    motivacional: "quote",
    buenos_dias: "quote",
    fichaje: "hero",
    hito: "hero",
    galeria: "hero",
    clasificaciones: "hero",
    goleadores: "hero",
    personalizado: "hero",
  };
  return map[contentType] || "hero";
};