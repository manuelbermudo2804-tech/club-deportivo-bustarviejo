import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Save, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function FantasyAdminConfig({ config, onSaved }) {
  const [data, setData] = useState({
    abierto: true,
    fecha_limite: "",
    precio_inscripcion: 10,
    porcentaje_premios: 70,
    porcentaje_club: 30,
    selecciones_disponibles: "",
    goleadores_candidatos: "",
    mostrar_clasificacion_publica: true,
    campeon_oficial: "",
    subcampeon_oficial: "",
    semifinalistas_oficial: "",
    maximo_goleador_oficial: "",
    seleccion_sorpresa_oficial: "",
    resultado_final_local_oficial: "",
    resultado_final_visitante_oficial: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (config) {
      setData({
        abierto: config.abierto ?? true,
        fecha_limite: config.fecha_limite ? config.fecha_limite.slice(0, 16) : "",
        precio_inscripcion: config.precio_inscripcion ?? 10,
        porcentaje_premios: config.porcentaje_premios ?? 70,
        porcentaje_club: config.porcentaje_club ?? 30,
        selecciones_disponibles: (config.selecciones_disponibles || []).join("\n"),
        goleadores_candidatos: (config.goleadores_candidatos || []).join("\n"),
        mostrar_clasificacion_publica: config.mostrar_clasificacion_publica ?? true,
        campeon_oficial: config.campeon_oficial || "",
        subcampeon_oficial: config.subcampeon_oficial || "",
        semifinalistas_oficial: (config.semifinalistas_oficial || []).join("\n"),
        maximo_goleador_oficial: config.maximo_goleador_oficial || "",
        seleccion_sorpresa_oficial: config.seleccion_sorpresa_oficial || "",
        resultado_final_local_oficial: config.resultado_final_local_oficial ?? "",
        resultado_final_visitante_oficial: config.resultado_final_visitante_oficial ?? "",
      });
    }
  }, [config]);

  const update = (k, v) => setData((d) => ({ ...d, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        abierto: !!data.abierto,
        fecha_limite: data.fecha_limite ? new Date(data.fecha_limite).toISOString() : null,
        precio_inscripcion: Number(data.precio_inscripcion) || 10,
        porcentaje_premios: Number(data.porcentaje_premios) || 70,
        porcentaje_club: Number(data.porcentaje_club) || 30,
        selecciones_disponibles: data.selecciones_disponibles.split("\n").map((s) => s.trim()).filter(Boolean),
        goleadores_candidatos: data.goleadores_candidatos.split("\n").map((s) => s.trim()).filter(Boolean),
        mostrar_clasificacion_publica: !!data.mostrar_clasificacion_publica,
        campeon_oficial: data.campeon_oficial,
        subcampeon_oficial: data.subcampeon_oficial,
        semifinalistas_oficial: data.semifinalistas_oficial.split("\n").map((s) => s.trim()).filter(Boolean),
        maximo_goleador_oficial: data.maximo_goleador_oficial,
        seleccion_sorpresa_oficial: data.seleccion_sorpresa_oficial,
        resultado_final_local_oficial: data.resultado_final_local_oficial !== "" ? Number(data.resultado_final_local_oficial) : null,
        resultado_final_visitante_oficial: data.resultado_final_visitante_oficial !== "" ? Number(data.resultado_final_visitante_oficial) : null,
      };
      if (config?.id) {
        await base44.entities.FantasyMundialConfig.update(config.id, payload);
      } else {
        await base44.entities.FantasyMundialConfig.create(payload);
      }
      toast.success("Configuración guardada");
      onSaved?.();
    } catch (e) {
      toast.error(e?.message || "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardContent className="p-5 space-y-5">
        <h3 className="font-black text-slate-900 text-lg">⚙️ Configuración</h3>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
            <Label>Inscripciones abiertas</Label>
            <Switch checked={data.abierto} onCheckedChange={(v) => update("abierto", v)} />
          </div>
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
            <Label>Mostrar clasificación pública</Label>
            <Switch checked={data.mostrar_clasificacion_publica} onCheckedChange={(v) => update("mostrar_clasificacion_publica", v)} />
          </div>
          <div>
            <Label>Fecha límite</Label>
            <Input type="datetime-local" value={data.fecha_limite} onChange={(e) => update("fecha_limite", e.target.value)} />
          </div>
          <div>
            <Label>Precio inscripción (€)</Label>
            <Input type="number" value={data.precio_inscripcion} onChange={(e) => update("precio_inscripcion", e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>% Premios</Label>
              <Input type="number" value={data.porcentaje_premios} onChange={(e) => update("porcentaje_premios", e.target.value)} />
            </div>
            <div>
              <Label>% Club</Label>
              <Input type="number" value={data.porcentaje_club} onChange={(e) => update("porcentaje_club", e.target.value)} />
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label>Selecciones disponibles (una por línea)</Label>
            <Textarea rows={8} value={data.selecciones_disponibles} onChange={(e) => update("selecciones_disponibles", e.target.value)} placeholder="España&#10;Argentina&#10;Brasil&#10;Francia..." />
          </div>
          <div>
            <Label>Candidatos a máximo goleador (uno por línea)</Label>
            <Textarea rows={8} value={data.goleadores_candidatos} onChange={(e) => update("goleadores_candidatos", e.target.value)} placeholder="Lamine Yamal&#10;Mbappé&#10;Vinicius..." />
          </div>
        </div>

        <hr />

        <div>
          <h4 className="font-bold text-slate-900 mb-3">🏆 Resultados oficiales (rellenar al final del Mundial)</h4>
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <Label>Campeón oficial</Label>
              <Input value={data.campeon_oficial} onChange={(e) => update("campeon_oficial", e.target.value)} />
            </div>
            <div>
              <Label>Subcampeón oficial</Label>
              <Input value={data.subcampeon_oficial} onChange={(e) => update("subcampeon_oficial", e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <Label>Las 4 semifinalistas (una por línea)</Label>
              <Textarea rows={4} value={data.semifinalistas_oficial} onChange={(e) => update("semifinalistas_oficial", e.target.value)} />
            </div>
            <div>
              <Label>Máximo goleador oficial</Label>
              <Input value={data.maximo_goleador_oficial} onChange={(e) => update("maximo_goleador_oficial", e.target.value)} />
            </div>
            <div>
              <Label>Selección sorpresa oficial</Label>
              <Input value={data.seleccion_sorpresa_oficial} onChange={(e) => update("seleccion_sorpresa_oficial", e.target.value)} />
            </div>
            <div>
              <Label>Goles campeón en final</Label>
              <Input type="number" value={data.resultado_final_local_oficial} onChange={(e) => update("resultado_final_local_oficial", e.target.value)} />
            </div>
            <div>
              <Label>Goles subcampeón en final</Label>
              <Input type="number" value={data.resultado_final_visitante_oficial} onChange={(e) => update("resultado_final_visitante_oficial", e.target.value)} />
            </div>
          </div>
        </div>

        <Button onClick={save} disabled={saving} className="w-full bg-indigo-600 hover:bg-indigo-700">
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Guardar configuración
        </Button>
      </CardContent>
    </Card>
  );
}