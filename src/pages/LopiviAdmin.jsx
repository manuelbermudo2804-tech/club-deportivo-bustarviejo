import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, Save, AlertTriangle, Mail, Phone, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const ESTADO_COLORS = {
  nueva: "bg-red-100 text-red-700",
  en_revision: "bg-amber-100 text-amber-700",
  en_proceso: "bg-blue-100 text-blue-700",
  resuelta: "bg-emerald-100 text-emerald-700",
  archivada: "bg-slate-100 text-slate-700",
};

export default function LopiviAdmin() {
  const [config, setConfig] = useState(null);
  const [configId, setConfigId] = useState(null);
  const [incidencias, setIncidencias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState(null);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [configs, items] = await Promise.all([
        base44.entities.LopiviConfig.list(),
        base44.entities.LopiviIncidencia.list("-created_date"),
      ]);
      if (configs.length > 0) {
        setConfig(configs[0]);
        setConfigId(configs[0].id);
      } else {
        setConfig({
          dpi_nombre: "",
          dpi_telefono: "",
          dpi_email: "",
          dpi_cargo: "Delegado/a de Protección de la Infancia y Adolescencia",
          protocolo_url: "",
          mensaje_familias: "",
          activo: true,
        });
      }
      setIncidencias(items);
    } catch (e) {
      console.error(e);
      toast.error("Error cargando datos");
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!config.dpi_nombre || !config.dpi_email) {
      toast.error("Nombre y email del DPI son obligatorios");
      return;
    }
    setSaving(true);
    try {
      if (configId) {
        await base44.entities.LopiviConfig.update(configId, config);
      } else {
        const created = await base44.entities.LopiviConfig.create(config);
        setConfigId(created.id);
      }
      toast.success("Configuración guardada");
    } catch (e) {
      toast.error("Error guardando: " + e.message);
    }
    setSaving(false);
  };

  const handleUpdateIncidencia = async (id, data) => {
    try {
      await base44.entities.LopiviIncidencia.update(id, data);
      toast.success("Actualizada");
      loadAll();
      setSelected(null);
    } catch (e) {
      toast.error("Error: " + e.message);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  const nuevas = incidencias.filter(i => i.estado === "nueva").length;

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
          <Shield className="w-8 h-8 text-emerald-600" />
          LOPIVI - Protección del Menor
        </h1>
        <p className="text-slate-600 mt-1">Configuración del Delegado de Protección y gestión de incidencias</p>
      </div>

      <Tabs defaultValue="config">
        <TabsList>
          <TabsTrigger value="config">Configuración DPI</TabsTrigger>
          <TabsTrigger value="incidencias" className="relative">
            Incidencias
            {nuevas > 0 && (
              <Badge className="ml-2 bg-red-500 text-white">{nuevas} nuevas</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="config" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Datos del Delegado/a de Protección</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Nombre completo *</Label>
                  <Input
                    value={config.dpi_nombre || ""}
                    onChange={(e) => setConfig({ ...config, dpi_nombre: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Cargo</Label>
                  <Input
                    value={config.dpi_cargo || ""}
                    onChange={(e) => setConfig({ ...config, dpi_cargo: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Teléfono</Label>
                  <Input
                    value={config.dpi_telefono || ""}
                    onChange={(e) => setConfig({ ...config, dpi_telefono: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Email (recibe denuncias) *</Label>
                  <Input
                    type="email"
                    value={config.dpi_email || ""}
                    onChange={(e) => setConfig({ ...config, dpi_email: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label>URL del PDF del Protocolo LOPIVI</Label>
                <Input
                  value={config.protocolo_url || ""}
                  onChange={(e) => setConfig({ ...config, protocolo_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>

              <div>
                <Label>Foto del DPI (URL, opcional)</Label>
                <Input
                  value={config.dpi_foto_url || ""}
                  onChange={(e) => setConfig({ ...config, dpi_foto_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>

              <div>
                <Label>Mensaje para familias (opcional)</Label>
                <Textarea
                  value={config.mensaje_familias || ""}
                  onChange={(e) => setConfig({ ...config, mensaje_familias: e.target.value })}
                  placeholder="Ej: En CD Bustarviejo la seguridad de los menores es nuestra prioridad..."
                  rows={3}
                />
              </div>

              <Button onClick={handleSave} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Guardar configuración
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="incidencias" className="space-y-3 mt-4">
          {incidencias.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-slate-500">
                <Shield className="w-12 h-12 mx-auto mb-3 text-emerald-300" />
                <p>No hay incidencias registradas. Buena señal.</p>
              </CardContent>
            </Card>
          ) : (
            incidencias.map((inc) => (
              <Card
                key={inc.id}
                className={`cursor-pointer hover:shadow-md transition ${inc.estado === "nueva" ? "border-l-4 border-l-red-500" : ""}`}
                onClick={() => setSelected(inc)}
              >
                <CardContent className="p-4 flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs text-slate-500">{inc.codigo_referencia}</span>
                      <Badge className={ESTADO_COLORS[inc.estado] || "bg-slate-100"}>{inc.estado}</Badge>
                      {inc.es_anonimo && <Badge variant="outline">🔒 Anónima</Badge>}
                    </div>
                    <p className="font-semibold text-slate-900 truncate">{inc.tipo_incidencia}</p>
                    <p className="text-sm text-slate-600 truncate">{inc.descripcion}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {format(new Date(inc.created_date), "d MMM yyyy HH:mm", { locale: es })}
                    </p>
                  </div>
                  <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      {selected && (
        <IncidenciaDetail
          incidencia={selected}
          onClose={() => setSelected(null)}
          onUpdate={handleUpdateIncidencia}
        />
      )}
    </div>
  );
}

function IncidenciaDetail({ incidencia, onClose, onUpdate }) {
  const [notas, setNotas] = useState(incidencia.notas_dpi || "");
  const [estado, setEstado] = useState(incidencia.estado);

  const save = () => {
    onUpdate(incidencia.id, {
      notas_dpi: notas,
      estado,
      fecha_resolucion: ["resuelta", "archivada"].includes(estado) ? new Date().toISOString() : incidencia.fecha_resolucion,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-mono text-sm text-slate-500">{incidencia.codigo_referencia}</p>
              <h2 className="text-xl font-bold">{incidencia.tipo_incidencia}</h2>
            </div>
            <Button variant="ghost" onClick={onClose}>✕</Button>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-slate-500">Fecha:</span> {format(new Date(incidencia.created_date), "d MMM yyyy HH:mm", { locale: es })}</div>
            <div><span className="text-slate-500">Modo:</span> {incidencia.es_anonimo ? "Anónima 🔒" : "Identificada"}</div>
            {incidencia.menor_afectado && <div><span className="text-slate-500">Menor:</span> {incidencia.menor_afectado}</div>}
            {incidencia.categoria_equipo && <div><span className="text-slate-500">Categoría:</span> {incidencia.categoria_equipo}</div>}
            {incidencia.fecha_hechos && <div><span className="text-slate-500">Cuándo:</span> {incidencia.fecha_hechos}</div>}
            {incidencia.lugar_hechos && <div><span className="text-slate-500">Dónde:</span> {incidencia.lugar_hechos}</div>}
          </div>

          <div>
            <Label>Descripción</Label>
            <div className="bg-slate-50 rounded-lg p-3 text-sm whitespace-pre-wrap">{incidencia.descripcion}</div>
          </div>

          {!incidencia.es_anonimo && (
            <div className="bg-blue-50 rounded-lg p-3 space-y-1 text-sm">
              <p className="font-semibold text-blue-900">Reportante</p>
              {incidencia.reportante_nombre && <p>{incidencia.reportante_nombre} ({incidencia.relacion_reportante})</p>}
              {incidencia.reportante_email && <p className="flex items-center gap-1"><Mail className="w-3 h-3" />{incidencia.reportante_email}</p>}
              {incidencia.reportante_telefono && <p className="flex items-center gap-1"><Phone className="w-3 h-3" />{incidencia.reportante_telefono}</p>}
            </div>
          )}

          <div>
            <Label>Estado</Label>
            <Select value={estado} onValueChange={setEstado}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="nueva">Nueva</SelectItem>
                <SelectItem value="en_revision">En revisión</SelectItem>
                <SelectItem value="en_proceso">En proceso</SelectItem>
                <SelectItem value="resuelta">Resuelta</SelectItem>
                <SelectItem value="archivada">Archivada</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Notas privadas del DPI</Label>
            <Textarea value={notas} onChange={(e) => setNotas(e.target.value)} rows={4} />
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="flex-1">Cerrar</Button>
            <Button onClick={save} className="flex-1 bg-emerald-600 hover:bg-emerald-700">Guardar</Button>
          </div>
        </div>
      </div>
    </div>
  );
}