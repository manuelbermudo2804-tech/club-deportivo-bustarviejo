import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Share2, AlertCircle, ImageIcon } from "lucide-react";
import { readSharedFiles, clearSharedFiles } from "../components/share/sharedFilesStore";
import ChatTargetSelector from "../components/share/ChatTargetSelector";

/**
 * Página que se abre cuando el usuario comparte imágenes a la PWA desde Android.
 *
 * Flujo:
 *  1. El Service Worker interceptó el POST y guardó los archivos en IndexedDB.
 *  2. Aquí los leemos, los subimos a storage (UploadFile) y construimos los targets según rol.
 *  3. El usuario elige un chat → el sender correspondiente CREA el mensaje directamente
 *     con las imágenes como adjuntos, luego navega al chat para que vea lo enviado.
 */
export default function ShareReceiver() {
  const navigate = useNavigate();
  const [stage, setStage] = useState("loading"); // loading | uploading | ready | error | empty
  const [user, setUser] = useState(null);
  const [previews, setPreviews] = useState([]);
  const [uploadedUrls, setUploadedUrls] = useState([]);
  const [targets, setTargets] = useState([]);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    let cancelled = false;
    const localPreviews = [];

    const run = async () => {
      try {
        const me = await base44.auth.me();
        if (cancelled) return;
        setUser(me);

        const shared = await readSharedFiles();
        const files = (shared && shared.files) || [];

        if (!files.length) {
          setStage("empty");
          return;
        }

        files.forEach(f => {
          localPreviews.push({
            name: f.name || "imagen",
            blobUrl: URL.createObjectURL(f),
            size: f.size,
          });
        });
        setPreviews(localPreviews);

        setStage("uploading");
        const urls = [];
        for (const file of files) {
          try {
            const { file_url } = await base44.integrations.Core.UploadFile({ file });
            if (file_url) {
              urls.push({
                url: file_url,
                nombre: file.name || "imagen.jpg",
                tipo: file.type || "image/jpeg",
                tamano: file.size,
              });
            }
          } catch (e) {
            console.error("Error subiendo archivo compartido:", e);
          }
        }

        if (!urls.length) {
          setErrorMsg("No se pudo subir ninguna imagen. Inténtalo de nuevo.");
          setStage("error");
          return;
        }
        setUploadedUrls(urls);

        const buildTargets = await getTargetsForUser(me);
        setTargets(buildTargets);

        await clearSharedFiles();
        setStage("ready");
      } catch (e) {
        console.error("ShareReceiver error:", e);
        setErrorMsg(e.message || "Error procesando la imagen compartida.");
        setStage("error");
      }
    };

    run();

    return () => {
      cancelled = true;
      localPreviews.forEach(p => { try { URL.revokeObjectURL(p.blobUrl); } catch {} });
    };
  }, []);

  // -------------- UI --------------
  if (stage === "loading" || stage === "uploading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="text-center max-w-sm">
          <Loader2 className="w-12 h-12 text-orange-600 mx-auto animate-spin mb-4" />
          <h1 className="text-lg font-bold text-slate-900 mb-2">
            {stage === "loading" ? "Preparando imagen..." : "Subiendo imagen..."}
          </h1>
          <p className="text-sm text-slate-600">
            {stage === "uploading"
              ? `${previews.length} imagen${previews.length !== 1 ? "es" : ""} en proceso`
              : "Un momento por favor"}
          </p>
        </div>
      </div>
    );
  }

  if (stage === "empty") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center space-y-4">
            <ImageIcon className="w-12 h-12 text-slate-400 mx-auto" />
            <h1 className="text-lg font-bold text-slate-900">No hay nada que compartir</h1>
            <p className="text-sm text-slate-600">
              Esta pantalla aparece cuando compartes una imagen a la app desde otra aplicación.
            </p>
            <Button onClick={() => navigate(createPageUrl("Home"))} className="w-full">
              Volver al inicio
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (stage === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <Card className="max-w-md w-full border-red-200">
          <CardContent className="p-6 text-center space-y-4">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
            <h1 className="text-lg font-bold text-slate-900">No se pudo procesar</h1>
            <p className="text-sm text-slate-600">{errorMsg}</p>
            <Button onClick={() => navigate(createPageUrl("Home"))} className="w-full">
              Volver al inicio
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ready
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 pb-24">
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="flex items-center gap-3 mt-2">
          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-orange-600 to-orange-700 flex items-center justify-center">
            <Share2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Compartir con...</h1>
            <p className="text-xs text-slate-600">
              Elige a qué chat enviar {previews.length === 1 ? "esta imagen" : `estas ${previews.length} imágenes`}
            </p>
          </div>
        </div>

        {/* Previews */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {previews.map((p, idx) => (
            <div key={idx} className="relative flex-shrink-0">
              <img
                src={p.blobUrl}
                alt={p.name}
                className="w-20 h-20 rounded-lg object-cover border-2 border-white shadow"
              />
            </div>
          ))}
        </div>

        {targets.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-sm text-slate-600">
              No tienes chats disponibles para recibir esta imagen.
            </CardContent>
          </Card>
        ) : (
          <ChatTargetSelector user={user} uploadedUrls={uploadedUrls} targets={targets} />
        )}

        <Button
          variant="outline"
          onClick={() => navigate(createPageUrl("Home"))}
          className="w-full mt-4"
        >
          Cancelar
        </Button>
      </div>
    </div>
  );
}

// ====================================================================
// Helper: construir lista de targets según el rol del usuario
// ====================================================================
async function getTargetsForUser(user) {
  if (!user) return [];

  const isAdmin = user.role === "admin";
  const isCoach = !!user.es_entrenador;
  const isCoordinator = !!user.es_coordinador;

  const targets = [];

  // ---------- PADRE / FAMILIA ----------
  if (!isAdmin && !isCoach && !isCoordinator) {
    try {
      const players = await base44.entities.Player.filter({
        $or: [
          { email_padre: user.email },
          { email_tutor_2: user.email },
          { email_jugador: user.email }
        ],
        activo: true
      });
      const categories = [...new Set(players.map(p => p.categoria_principal || p.deporte).filter(Boolean))];

      categories.forEach(cat => {
        const playersInCat = players.filter(p => (p.categoria_principal || p.deporte) === cat);
        const names = playersInCat.map(p => p.nombre?.split(" ")[0]).filter(Boolean).join(", ");
        const groupId = normalizeGroupId(cat);
        targets.push({
          id: `coach-${cat}`,
          type: "coach",
          title: `⚽ Entrenador · ${cat}`,
          subtitle: names ? `Chat de ${names}` : "Chat de equipo",
          color: "#3b82f6",
          url: createPageUrl("ParentCoachChat") + `?category=${encodeURIComponent(cat)}`,
          sender: async (urls, currentUser) => {
            await base44.entities.ChatMessage.create({
              remitente_email: currentUser.email,
              remitente_nombre: currentUser.full_name,
              mensaje: "",
              tipo: "padre_a_grupo",
              deporte: cat,
              categoria: cat,
              grupo_id: groupId,
              archivos_adjuntos: urls,
              prioridad: "Normal",
            });
          },
        });
      });
    } catch (e) {
      console.error("Error cargando jugadores:", e);
    }

    // Coordinador
    targets.push({
      id: "coordinator",
      type: "coordinator",
      title: "🏟️ Coordinador",
      subtitle: "Chat 1 a 1 con el coordinador",
      color: "#06b6d4",
      url: createPageUrl("ParentCoordinatorChat"),
      sender: async (urls, currentUser) => {
        // Buscar o crear conversación
        const convs = await base44.entities.CoordinatorConversation.filter({ padre_email: currentUser.email });
        let conv;
        if (convs.length > 0) {
          conv = convs[0];
        } else {
          conv = await base44.entities.CoordinatorConversation.create({
            padre_email: currentUser.email,
            padre_nombre: currentUser.full_name,
            no_leidos_coordinador: 0,
            no_leidos_padre: 0,
            archivada: false,
          });
        }
        await base44.entities.CoordinatorMessage.create({
          conversacion_id: conv.id,
          autor: "padre",
          autor_email: currentUser.email,
          autor_nombre: currentUser.full_name,
          mensaje: "",
          adjuntos: urls,
          leido_padre: true,
          leido_coordinador: false,
        });
        await base44.entities.CoordinatorConversation.update(conv.id, {
          ultimo_mensaje: "📷 Imagen",
          ultimo_mensaje_fecha: new Date().toISOString(),
          ultimo_mensaje_autor: "padre",
          no_leidos_coordinador: (conv.no_leidos_coordinador || 0) + 1,
          archivada: false,
        });
      },
    });
  }

  // ---------- COORDINADOR ----------
  if (isCoordinator) {
    try {
      const convs = await base44.entities.CoordinatorConversation.list("-ultimo_mensaje_fecha", 50);
      convs.forEach(c => {
        targets.push({
          id: `coord-${c.id}`,
          type: "coordinator",
          title: c.padre_nombre || c.padre_email || "Padre/Madre",
          subtitle: c.padre_email || "",
          color: "#06b6d4",
          url: createPageUrl("CoordinatorChat") + `?convId=${c.id}`,
          sender: async (urls, currentUser) => {
            await base44.entities.CoordinatorMessage.create({
              conversacion_id: c.id,
              autor: "coordinador",
              autor_email: currentUser.email,
              autor_nombre: currentUser.full_name,
              mensaje: "",
              adjuntos: urls,
              leido_coordinador: true,
              leido_padre: false,
            });
            await base44.entities.CoordinatorConversation.update(c.id, {
              ultimo_mensaje: "📷 Imagen",
              ultimo_mensaje_fecha: new Date().toISOString(),
              ultimo_mensaje_autor: "coordinador",
              no_leidos_padre: (c.no_leidos_padre || 0) + 1,
              archivada: false,
            });
          },
        });
      });
    } catch (e) {
      console.error("Error cargando conversaciones coordinador:", e);
    }
  }

  // ---------- ENTRENADOR ----------
  if (isCoach) {
    const cats = Array.isArray(user.categorias_asignadas) ? user.categorias_asignadas : [];
    cats.forEach(cat => {
      const groupId = normalizeGroupId(cat);
      targets.push({
        id: `team-${cat}`,
        type: "coach",
        title: `⚽ ${cat}`,
        subtitle: "Chat de equipo",
        color: "#3b82f6",
        url: createPageUrl("CoachParentChat") + `?category=${encodeURIComponent(cat)}`,
        sender: async (urls, currentUser) => {
          await base44.entities.ChatMessage.create({
            remitente_email: currentUser.email,
            remitente_nombre: currentUser.full_name,
            mensaje: "",
            tipo: "entrenador_a_grupo",
            deporte: cat,
            categoria: cat,
            grupo_id: groupId,
            archivos_adjuntos: urls,
            prioridad: "Normal",
          });
        },
      });
    });
  }

  return targets;
}

function normalizeGroupId(cat) {
  return (cat || "")
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\(.*?\)/g, "")
    .trim()
    .replace(/\s+/g, "_");
}