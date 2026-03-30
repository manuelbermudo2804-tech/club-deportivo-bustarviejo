import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Share2, Trophy, Megaphone, Heart, ShoppingBag, Clover, Calendar, Users, PenLine, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import ContentGenerator from "../components/social/ContentGenerator";
import ContentHistoryList from "../components/social/ContentHistoryList";
import moment from "moment";

const CONTENT_TYPES = [
  {
    id: "partidos_finde",
    title: "⚽ Partidos del Fin de Semana",
    description: "Genera un resumen con todos los partidos del próximo finde",
    icon: Calendar,
    gradient: "from-orange-500 to-orange-600",
  },
  {
    id: "resultados",
    title: "📊 Resultados de la Jornada",
    description: "Resumen de todos los resultados de la última jornada",
    icon: Trophy,
    gradient: "from-blue-500 to-blue-600",
  },
  {
    id: "anuncio",
    title: "📢 Anuncio del Club",
    description: "Convierte un anuncio de la app en post para redes",
    icon: Megaphone,
    gradient: "from-pink-500 to-pink-600",
  },
  {
    id: "hazte_socio",
    title: "❤️ Hazte Socio",
    description: "Promoción del carnet de socio del club",
    icon: Heart,
    gradient: "from-purple-500 to-purple-600",
  },
  {
    id: "femenino",
    title: "⚽👧 Fútbol Femenino",
    description: "Captación de jugadoras para el equipo femenino",
    icon: Users,
    gradient: "from-fuchsia-500 to-fuchsia-600",
  },
  {
    id: "evento",
    title: "🎉 Evento del Club",
    description: "Promocionar un evento (fiesta, torneo, asamblea...)",
    icon: Calendar,
    gradient: "from-green-500 to-green-600",
  },
  {
    id: "personalizado",
    title: "✏️ Texto Libre",
    description: "Escribe tú el tema y la IA genera el contenido",
    icon: PenLine,
    gradient: "from-slate-500 to-slate-600",
  },
];

export default function SocialHub() {
  const queryClient = useQueryClient();
  const [selectedType, setSelectedType] = useState(null);
  const [loadingData, setLoadingData] = useState(false);
  const [datosIA, setDatosIA] = useState("");
  const [customTopic, setCustomTopic] = useState("");

  // Historial
  const { data: history = [] } = useQuery({
    queryKey: ["socialPosts"],
    queryFn: () => base44.entities.SocialPost.list("-created_date", 30),
    staleTime: 60000,
  });

  // Datos para generadores automáticos
  const fetchDataForType = async (type) => {
    setLoadingData(true);
    setSelectedType(type);
    setDatosIA("");

    try {
      if (type === "partidos_finde") {
        const today = new Date();
        const dayOfWeek = today.getDay();
        const daysUntilSat = (6 - dayOfWeek + 7) % 7 || 7;
        const saturday = new Date(today);
        saturday.setDate(today.getDate() + (daysUntilSat === 0 ? 0 : daysUntilSat));
        const sunday = new Date(saturday);
        sunday.setDate(saturday.getDate() + 1);

        const satStr = saturday.toISOString().split("T")[0];
        const sunStr = sunday.toISOString().split("T")[0];

        // Intentar con ProximoPartido y Convocatoria
        const [partidos, convocatorias] = await Promise.all([
          base44.entities.ProximoPartido.filter({ jugado: false }, "fecha_iso", 50).catch(() => []),
          base44.entities.Convocatoria.filter({ publicada: true, cerrada: false }, "-fecha_partido", 30).catch(() => []),
        ]);

        const partidosFinde = partidos.filter((p) => p.fecha_iso >= satStr && p.fecha_iso <= sunStr);
        const convosFinde = convocatorias.filter((c) => c.fecha_partido >= satStr && c.fecha_partido <= sunStr);

        let datos = "PARTIDOS DEL FIN DE SEMANA:\n\n";
        if (partidosFinde.length > 0) {
          partidosFinde.forEach((p) => {
            datos += `- ${p.categoria}: ${p.local} vs ${p.visitante} | ${p.fecha} ${p.hora || ""} | ${p.campo || ""}\n`;
          });
        }
        if (convosFinde.length > 0) {
          datos += "\nCONVOCATORIAS PUBLICADAS:\n";
          convosFinde.forEach((c) => {
            datos += `- ${c.categoria}: ${c.titulo} | ${c.fecha_partido} ${c.hora_partido} | ${c.ubicacion} | ${c.local_visitante || ""}\n`;
          });
        }
        if (partidosFinde.length === 0 && convosFinde.length === 0) {
          datos += "No hay partidos registrados para este fin de semana.\nPuedes escribir los datos manualmente aquí.";
        }
        setDatosIA(datos);

      } else if (type === "resultados") {
        const resultados = await base44.entities.Resultado.filter({ estado: "finalizado" }, "-fecha_actualizacion", 30).catch(() => []);
        // Also check ProximoPartido with jugado=true
        const jugados = await base44.entities.ProximoPartido.filter({ jugado: true }, "-fecha_iso", 30).catch(() => []);

        let datos = "RESULTADOS RECIENTES:\n\n";
        if (resultados.length > 0) {
          const byJornada = {};
          resultados.forEach((r) => {
            const key = r.jornada || "?";
            if (!byJornada[key]) byJornada[key] = [];
            byJornada[key].push(r);
          });
          Object.entries(byJornada).slice(0, 3).forEach(([jornada, res]) => {
            datos += `JORNADA ${jornada}:\n`;
            res.forEach((r) => {
              datos += `  ${r.categoria}: ${r.local} ${r.goles_local ?? "?"} - ${r.goles_visitante ?? "?"} ${r.visitante}\n`;
            });
            datos += "\n";
          });
        }
        if (jugados.length > 0) {
          datos += "PARTIDOS JUGADOS (DB Próximos Partidos):\n";
          jugados.slice(0, 15).forEach((p) => {
            datos += `  ${p.categoria}: ${p.local} ${p.goles_local ?? "?"} - ${p.goles_visitante ?? "?"} ${p.visitante} (${p.fecha || ""})\n`;
          });
        }
        if (resultados.length === 0 && jugados.length === 0) {
          datos += "No hay resultados recientes. Escribe los datos manualmente.";
        }
        setDatosIA(datos);

      } else if (type === "anuncio") {
        const anuncios = await base44.entities.Announcement.filter({ publicado: true }, "-created_date", 10).catch(() => []);
        let datos = "ANUNCIOS RECIENTES DEL CLUB:\n\n";
        if (anuncios.length > 0) {
          anuncios.slice(0, 5).forEach((a, i) => {
            datos += `${i + 1}. ${a.titulo} (${a.prioridad})\n   ${a.contenido?.substring(0, 200) || ""}\n\n`;
          });
          datos += "Elige uno o combina varios para el post.";
        } else {
          datos += "No hay anuncios recientes. Escribe el contenido del anuncio aquí.";
        }
        setDatosIA(datos);

      } else if (type === "hazte_socio") {
        const season = await base44.entities.SeasonConfig.filter({ activa: true }).catch(() => []);
        const precio = season[0]?.precio_socio || 25;
        setDatosIA(`PROGRAMA DE SOCIOS CD BUSTARVIEJO:
- Precio: ${precio}€/temporada
- Carnet digital de socio con QR
- Descuentos en comercios locales colaboradores
- Apoyas directamente al deporte base del pueblo
- Enlace: ${window.location.origin}/ClubMembership`);

      } else if (type === "femenino") {
        setDatosIA(`CAPTACIÓN FÚTBOL FEMENINO CD BUSTARVIEJO:
- Buscamos jugadoras de TODAS las edades
- No hace falta experiencia previa
- Entrenadores titulados
- Ambiente familiar y seguro
- Enlace de inscripción: ${window.location.origin}/JoinFemenino`);

      } else if (type === "evento") {
        const eventos = await base44.entities.Event.filter({ publicado: true }, "-fecha", 10).catch(() => []);
        const futuros = eventos.filter((e) => e.fecha >= new Date().toISOString().split("T")[0]);
        let datos = "PRÓXIMOS EVENTOS DEL CLUB:\n\n";
        if (futuros.length > 0) {
          futuros.slice(0, 5).forEach((e) => {
            datos += `- ${e.titulo} | ${moment(e.fecha).format("DD/MM/YYYY")} ${e.hora || ""} | ${e.ubicacion || ""}\n  ${e.descripcion?.substring(0, 150) || ""}\n\n`;
          });
        } else {
          datos += "No hay eventos próximos. Escribe los datos del evento aquí.";
        }
        setDatosIA(datos);

      } else if (type === "personalizado") {
        setDatosIA("");
      }
    } catch (e) {
      console.error("Error fetching data:", e);
      setDatosIA("Error al cargar datos. Puedes escribir los datos manualmente.");
    }
    setLoadingData(false);
  };

  const typeConfig = CONTENT_TYPES.find((t) => t.id === selectedType);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-black">
      <div className="px-4 lg:px-8 py-6 space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
            <Share2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Centro de Difusión Social</h1>
            <p className="text-slate-400 text-sm">Genera contenido para tu Canal de WhatsApp y redes sociales</p>
          </div>
        </div>

        {/* Selector de tipo de contenido */}
        {!selectedType && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              {CONTENT_TYPES.map((type) => (
                <button
                  key={type.id}
                  onClick={() => fetchDataForType(type.id)}
                  className="bg-white rounded-xl p-4 text-left hover:shadow-lg transition-all hover:scale-[1.02] active:scale-95 border border-slate-200"
                >
                  <div className={`w-10 h-10 bg-gradient-to-br ${type.gradient} rounded-xl flex items-center justify-center mb-2 shadow`}>
                    <type.icon className="w-5 h-5 text-white" />
                  </div>
                  <p className="font-bold text-sm text-slate-800">{type.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{type.description}</p>
                </button>
              ))}
            </div>

            {/* Historial */}
            <Card className="bg-white/95">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">📋 Historial de publicaciones</CardTitle>
              </CardHeader>
              <CardContent>
                <ContentHistoryList posts={history} />
              </CardContent>
            </Card>
          </>
        )}

        {/* Generador seleccionado */}
        {selectedType && (
          <div className="space-y-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setSelectedType(null); setDatosIA(""); }}
              className="text-white border-slate-600 hover:bg-slate-700"
            >
              ← Volver
            </Button>

            {loadingData ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
                <span className="text-white ml-3">Cargando datos del club...</span>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Datos de origen (editables) */}
                <Card className="bg-white/95">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">📝 Datos de origen {selectedType !== "personalizado" && "(puedes editar)"}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <textarea
                      value={datosIA}
                      onChange={(e) => setDatosIA(e.target.value)}
                      placeholder={selectedType === "personalizado" ? "Escribe aquí el tema sobre el que quieres generar contenido..." : "Datos cargados automáticamente..."}
                      className="w-full min-h-[120px] p-3 border rounded-lg text-sm resize-y"
                    />
                  </CardContent>
                </Card>

                {/* Generador */}
                <ContentGenerator
                  tipo={selectedType}
                  titulo={typeConfig?.title || "Contenido"}
                  datosParaIA={datosIA}
                  onSaved={() => queryClient.invalidateQueries({ queryKey: ["socialPosts"] })}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}