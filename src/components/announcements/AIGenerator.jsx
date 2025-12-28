import React, { useMemo, useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Wand2, Send, Loader2 } from "lucide-react";
import { format } from "date-fns";

function getMonthRange(year, monthIndex) {
  const start = new Date(year, monthIndex, 1);
  const end = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

const BUILTIN_TEMPLATES = [
  {
    nombre: "Resumen general",
    estilo: "resumen_general",
    tono: "cercano",
    titulo_base: "Boletín mensual — {{mes}} {{anio}}",
    cuerpo_base:
      "Hola familia del club,\n\nAsí ha sido {{mes}} {{anio}}:\n\nTareas completadas:\n{{tareas}}\n\nEventos destacados:\n{{eventos}}\n\nAnuncios importantes:\n{{anuncios}}\n\nGalería:\n{{galeria}}\n\n¡Seguimos!",
  },
  {
    nombre: "Logros y cifras",
    estilo: "logros_y_cifras",
    tono: "cercano",
    titulo_base: "Logros y números — {{mes}} {{anio}}",
    cuerpo_base:
      "¡Qué mes!\n\nHitos del club en {{mes}} {{anio}}:\n\n• Tareas cerradas: {{tareas}}\n• Eventos realizados: {{eventos}}\n• Anuncios clave: {{anuncios}}\n• Álbumes publicados: {{galeria}}\n\nGracias por el apoyo.",
  },
  {
    nombre: "Carta del presidente",
    estilo: "carta_del_presidente",
    tono: "cercano",
    titulo_base: "Carta del Presidente — {{mes}} {{anio}}",
    cuerpo_base:
      "Queridas familias,\n\nEn {{mes}} {{anio}} hemos avanzado en: {{tareas}}.\nHemos vivido: {{eventos}}.\nY compartido: {{galeria}}.\n\nGracias por vuestra confianza.\n— Presidencia",
  },
];

export default function AIGenerator() {
  const qc = useQueryClient();
  const [user, setUser] = useState(null);
  useEffect(() => { base44.auth.me().then(setUser).catch(() => setUser(null)); }, []);

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth()); // 0-11 mes natural actual
  const range = useMemo(() => getMonthRange(year, month), [year, month]);

  const { data: templates = [] } = useQuery({
    queryKey: ["announcementTemplates"],
    queryFn: () => base44.entities.AnnouncementTemplate.list(),
    initialData: [],
  });
  const allTemplates = templates.length ? templates : BUILTIN_TEMPLATES;
  const [tplIndex, setTplIndex] = useState(0);

  const [generating, setGenerating] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [cuerpo, setCuerpo] = useState("");
  const [destacado, setDestacado] = useState(false);
          const [publicarAnuncios, setPublicarAnuncios] = useState(true);
          const [publicarChat, setPublicarChat] = useState(true);

  const createAnnouncement = useMutation({
    mutationFn: (data) => base44.entities.Announcement.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["announcements"] });
    },
  });

  const sendSystemMessage = useMutation({
            mutationFn: (data) => base44.entities.PrivateMessage.create(data),
          });

  const monthName = format(range.start, "LLLL");
  const yearNum = range.start.getFullYear();

  const loadDataForMonth = async () => {
    const [tasks, events, anns, galleries] = await Promise.all([
      base44.entities.BoardTask.list(),
      base44.entities.Event.list(),
      base44.entities.Announcement.list(),
      base44.entities.PhotoGallery.list(),
    ]);

    const inRange = (dateStr) => {
      if (!dateStr) return false;
      const d = new Date(dateStr);
      return d >= range.start && d <= range.end;
    };

    const tareasCerradas = tasks.filter((t) => t.estado === "hecho" && (inRange(t.updated_date) || inRange(t.fecha_limite)));
    const eventosHechos = events.filter((e) => inRange(e.fecha));
    const anunciosDest = anns.filter((a) => a.destacado && (inRange(a.fecha_publicacion) || inRange(a.updated_date)));
    const albumes = galleries.filter((g) => inRange(g.fecha_evento));

    return { tareasCerradas, eventosHechos, anunciosDest, albumes };
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const data = await loadDataForMonth();
      const selected = allTemplates[tplIndex];

      const resumen = {
        mes: monthName,
        anio: yearNum,
        tareas: data.tareasCerradas.map((t) => `• ${t.titulo || t.descripcion?.slice(0,60) || "Tarea"}`).join("\n") || "• (sin novedades)",
        eventos: data.eventosHechos.map((e) => `• ${e.titulo} (${e.fecha}${e.ubicacion ? `, ${e.ubicacion}`: ""})`).join("\n") || "• (sin eventos)",
        anuncios: data.anunciosDest.map((a) => `• ${a.titulo}`).join("\n") || "• (sin anuncios)",
        galeria: data.albumes.map((g) => `• ${g.titulo} (${g.fecha_evento})`).join("\n") || "• (sin álbumes)",
      };

      const prompt = `Redacta un boletín mensual para el club con tono ${selected.tono || "cercano"} y estilo ${selected.estilo}. 
Usa mes natural ${resumen.mes} ${resumen.anio}. 
Parte de esta base (puedes reescribir para coherencia y fluidez):\n\nTÍTULO BASE:\n${selected.titulo_base || "Boletín mensual — {{mes}} {{anio}}"}\n\nCUERPO BASE:\n${selected.cuerpo_base}\n\nREEMPLAZA PLACEHOLDERS:\n- {{mes}} => ${resumen.mes}\n- {{anio}} => ${resumen.anio}\n- {{tareas}} =>\n${resumen.tareas}\n- {{eventos}} =>\n${resumen.eventos}\n- {{anuncios}} =>\n${resumen.anuncios}\n- {{galeria}} =>\n${resumen.galeria}\n\nDevuelve JSON con claves exactas: titulo, cuerpo.`;

      const resp = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            titulo: { type: "string" },
            cuerpo: { type: "string" },
          },
          required: ["titulo", "cuerpo"],
        },
      });

      const out = resp;
      setTitulo(out.titulo || `Boletín — ${resumen.mes} ${resumen.anio}`);
      setCuerpo(out.cuerpo || "");
      setPublicarAnuncios(true);
      setPublicarChat(true);
    } finally {
      setGenerating(false);
    }
  };

  const handleCreate = async () => {
    if (publicarAnuncios) {
      await createAnnouncement.mutateAsync({
        titulo: titulo || `Boletín — ${monthName} ${yearNum}`,
        contenido: cuerpo,
        prioridad: "Normal",
        destinatarios_tipo: "Todos",
        publicado: true,
        destacado: !!destacado,
        fecha_publicacion: new Date().toISOString(),
      });
    }

    if (publicarChat && user) {
      const conversations = await base44.entities.PrivateConversation.list('-ultimo_mensaje_fecha', 5000);
      const targets = conversations.filter(c => c.participante_staff_email === 'sistema@cdbustarviejo.com' || c.participante_staff_rol === 'admin');
      const text = `${titulo || `Boletín — ${monthName} ${yearNum}`}\n\n${cuerpo}`;
      await Promise.all(targets.map((c) => sendSystemMessage.mutateAsync({
        conversacion_id: c.id,
        remitente_tipo: 'staff',
        remitente_email: user.email,
        remitente_nombre: user.full_name || 'Admin',
        mensaje: text,
      })));
    }
    alert(`Boletín ${publicarAnuncios ? 'publicado en Anuncios' : ''}${publicarAnuncios && publicarChat ? ' y ' : ''}${publicarChat ? 'en Mensajes del Club' : ''}.`);
    setTitulo("");
    setCuerpo("");
    setDestacado(false);
  };

  if (!user || user.role !== "admin") return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Generar boletín con IA</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-3 max-lg:grid-cols-2 max-sm:grid-cols-1">
          <div>
            <Label>Mes</Label>
            <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
              <SelectTrigger><SelectValue placeholder="Mes" /></SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }).map((_, i) => (
                  <SelectItem key={i} value={String(i)}>{format(new Date(2000, i, 1), "LLLL")}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Año</Label>
            <Input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} />
          </div>
          <div>
            <Label>Plantilla</Label>
            <Select value={String(tplIndex)} onValueChange={(v) => setTplIndex(Number(v))}>
              <SelectTrigger><SelectValue placeholder="Plantilla" /></SelectTrigger>
              <SelectContent>
                {allTemplates.map((t, i) => (
                  <SelectItem key={i} value={String(i)}>{t.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Switch checked={destacado} onCheckedChange={setDestacado} />
            <Label>Destacado (pin)</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={publicarAnuncios} onCheckedChange={setPublicarAnuncios} />
            <Label>Publicar en Anuncios</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={publicarChat} onCheckedChange={setPublicarChat} />
            <Label>Publicar en Mensajes del Club</Label>
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={handleGenerate} disabled={generating} className="gap-2">
            {generating ? <Loader2 className="h-4 w-4 animate-spin"/> : <Wand2 className="h-4 w-4"/>}
            Generar con IA
          </Button>
        </div>

        <div className="grid gap-3">
          <div>
            <Label>Título</Label>
            <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} />
          </div>
          <div>
            <Label>Cuerpo</Label>
            <Textarea rows={12} value={cuerpo} onChange={(e) => setCuerpo(e.target.value)} />
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleCreate} className="gap-2" disabled={!cuerpo}>
            <Send className="h-4 w-4"/> Crear y publicar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}