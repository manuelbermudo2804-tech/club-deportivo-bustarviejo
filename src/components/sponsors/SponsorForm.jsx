import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X, Upload, FileText, Trash2, Plus } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

const NIVELES = ["Principal", "Oro", "Plata", "Bronce", "Colaborador"];
const ESTADOS = ["Activo", "Pendiente", "Finalizado", "Cancelado"];
const FRECUENCIAS = ["Único", "Mensual", "Trimestral", "Anual"];
const TIPOS_DOCUMENTO = ["Contrato", "Factura", "Recibo", "Otro"];

const CATEGORIAS = [
  "Fútbol Pre-Benjamín (Mixto)",
  "Fútbol Benjamín (Mixto)",
  "Fútbol Alevín (Mixto)",
  "Fútbol Infantil (Mixto)",
  "Fútbol Cadete",
  "Fútbol Juvenil",
  "Fútbol Aficionado",
  "Fútbol Femenino",
  "Baloncesto (Mixto)"
];

export default function SponsorForm({ sponsor, players, onSubmit, onCancel, isSubmitting }) {
  const [formData, setFormData] = useState({
    nombre: "",
    logo_url: "",
    contacto_nombre: "",
    contacto_email: "",
    contacto_telefono: "",
    direccion: "",
    nivel_patrocinio: "Colaborador",
    fecha_inicio: new Date().toISOString().split('T')[0],
    fecha_fin: "",
    monto: "",
    frecuencia_pago: "Anual",
    estado: "Pendiente",
    documentos: [],
    equipos_patrocinados: [],
    jugadores_patrocinados: [],
    beneficios_acordados: "",
    notas: ""
  });

  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [newDocType, setNewDocType] = useState("Contrato");

  useEffect(() => {
    if (sponsor) {
      setFormData({
        ...sponsor,
        monto: sponsor.monto || "",
        documentos: sponsor.documentos || [],
        equipos_patrocinados: sponsor.equipos_patrocinados || [],
        jugadores_patrocinados: sponsor.jugadores_patrocinados || []
      });
    }
  }, [sponsor]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingLogo(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      handleChange("logo_url", file_url);
      toast.success("Logo subido correctamente");
    } catch (error) {
      toast.error("Error al subir el logo");
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleDocUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingDoc(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const newDoc = {
        nombre: file.name,
        url: file_url,
        tipo: newDocType,
        fecha_subida: new Date().toISOString()
      };
      handleChange("documentos", [...formData.documentos, newDoc]);
      toast.success("Documento subido correctamente");
    } catch (error) {
      toast.error("Error al subir el documento");
    } finally {
      setUploadingDoc(false);
    }
  };

  const removeDocument = (index) => {
    const updated = formData.documentos.filter((_, i) => i !== index);
    handleChange("documentos", updated);
  };

  const toggleEquipo = (equipo) => {
    const current = formData.equipos_patrocinados;
    if (current.includes(equipo)) {
      handleChange("equipos_patrocinados", current.filter(e => e !== equipo));
    } else {
      handleChange("equipos_patrocinados", [...current, equipo]);
    }
  };

  const addJugador = (jugador) => {
    if (formData.jugadores_patrocinados.some(j => j.jugador_id === jugador.id)) return;
    handleChange("jugadores_patrocinados", [
      ...formData.jugadores_patrocinados,
      { jugador_id: jugador.id, jugador_nombre: jugador.nombre }
    ]);
  };

  const removeJugador = (jugadorId) => {
    handleChange("jugadores_patrocinados", 
      formData.jugadores_patrocinados.filter(j => j.jugador_id !== jugadorId)
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.nombre || !formData.monto) {
      toast.error("Nombre y monto son obligatorios");
      return;
    }
    onSubmit({
      ...formData,
      monto: parseFloat(formData.monto) || 0
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <Card className="border-none shadow-xl mb-6">
        <CardHeader className="bg-gradient-to-r from-amber-600 to-amber-700 text-white rounded-t-xl">
          <CardTitle className="flex items-center gap-2">
            💰 {sponsor ? "Editar Patrocinador" : "Nuevo Patrocinador"}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Datos básicos */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label>Nombre del Patrocinador *</Label>
                <Input
                  value={formData.nombre}
                  onChange={(e) => handleChange("nombre", e.target.value)}
                  placeholder="Nombre de la empresa o patrocinador"
                  required
                />
              </div>

              <div>
                <Label>Logo</Label>
                <div className="flex items-center gap-3">
                  {formData.logo_url && (
                    <img src={formData.logo_url} alt="Logo" className="w-16 h-16 object-contain rounded border" />
                  )}
                  <label className="cursor-pointer">
                    <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                    <Button type="button" variant="outline" disabled={uploadingLogo} asChild>
                      <span>
                        <Upload className="w-4 h-4 mr-2" />
                        {uploadingLogo ? "Subiendo..." : "Subir Logo"}
                      </span>
                    </Button>
                  </label>
                </div>
              </div>

              <div>
                <Label>Nivel de Patrocinio *</Label>
                <Select value={formData.nivel_patrocinio} onValueChange={(v) => handleChange("nivel_patrocinio", v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {NIVELES.map(nivel => (
                      <SelectItem key={nivel} value={nivel}>{nivel}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Contacto */}
            <div className="border-t pt-4">
              <h3 className="font-semibold text-slate-700 mb-3">📇 Datos de Contacto</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Persona de Contacto</Label>
                  <Input
                    value={formData.contacto_nombre}
                    onChange={(e) => handleChange("contacto_nombre", e.target.value)}
                    placeholder="Nombre completo"
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={formData.contacto_email}
                    onChange={(e) => handleChange("contacto_email", e.target.value)}
                    placeholder="email@ejemplo.com"
                  />
                </div>
                <div>
                  <Label>Teléfono</Label>
                  <Input
                    value={formData.contacto_telefono}
                    onChange={(e) => handleChange("contacto_telefono", e.target.value)}
                    placeholder="600 000 000"
                  />
                </div>
                <div className="md:col-span-3">
                  <Label>Dirección</Label>
                  <Input
                    value={formData.direccion}
                    onChange={(e) => handleChange("direccion", e.target.value)}
                    placeholder="Dirección completa"
                  />
                </div>
              </div>
            </div>

            {/* Datos económicos */}
            <div className="border-t pt-4">
              <h3 className="font-semibold text-slate-700 mb-3">💶 Datos del Patrocinio</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label>Monto (€) *</Label>
                  <Input
                    type="number"
                    value={formData.monto}
                    onChange={(e) => handleChange("monto", e.target.value)}
                    placeholder="0"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
                <div>
                  <Label>Frecuencia de Pago</Label>
                  <Select value={formData.frecuencia_pago} onValueChange={(v) => handleChange("frecuencia_pago", v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FRECUENCIAS.map(f => (
                        <SelectItem key={f} value={f}>{f}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Fecha Inicio *</Label>
                  <Input
                    type="date"
                    value={formData.fecha_inicio}
                    onChange={(e) => handleChange("fecha_inicio", e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label>Fecha Fin</Label>
                  <Input
                    type="date"
                    value={formData.fecha_fin}
                    onChange={(e) => handleChange("fecha_fin", e.target.value)}
                  />
                </div>
                <div>
                  <Label>Estado</Label>
                  <Select value={formData.estado} onValueChange={(v) => handleChange("estado", v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ESTADOS.map(e => (
                        <SelectItem key={e} value={e}>{e}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Documentos */}
            <div className="border-t pt-4">
              <h3 className="font-semibold text-slate-700 mb-3">📄 Documentos</h3>
              <div className="flex flex-wrap gap-2 mb-3">
                {formData.documentos.map((doc, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-slate-100 rounded-lg px-3 py-2">
                    <FileText className="w-4 h-4 text-slate-600" />
                    <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
                      {doc.nombre}
                    </a>
                    <Badge variant="outline" className="text-xs">{doc.tipo}</Badge>
                    <button type="button" onClick={() => removeDocument(idx)} className="text-red-500 hover:text-red-700">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <Select value={newDocType} onValueChange={setNewDocType}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS_DOCUMENTO.map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <label className="cursor-pointer">
                  <input type="file" onChange={handleDocUpload} className="hidden" />
                  <Button type="button" variant="outline" disabled={uploadingDoc} asChild>
                    <span>
                      <Plus className="w-4 h-4 mr-2" />
                      {uploadingDoc ? "Subiendo..." : "Añadir Documento"}
                    </span>
                  </Button>
                </label>
              </div>
            </div>

            {/* Equipos patrocinados */}
            <div className="border-t pt-4">
              <h3 className="font-semibold text-slate-700 mb-3">⚽ Equipos Patrocinados</h3>
              <div className="flex flex-wrap gap-2">
                {CATEGORIAS.map(cat => (
                  <Badge
                    key={cat}
                    variant={formData.equipos_patrocinados.includes(cat) ? "default" : "outline"}
                    className={`cursor-pointer transition-all ${
                      formData.equipos_patrocinados.includes(cat) 
                        ? "bg-orange-600 hover:bg-orange-700" 
                        : "hover:bg-slate-100"
                    }`}
                    onClick={() => toggleEquipo(cat)}
                  >
                    {cat}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Jugadores patrocinados */}
            <div className="border-t pt-4">
              <h3 className="font-semibold text-slate-700 mb-3">👤 Jugadores Patrocinados</h3>
              <div className="flex flex-wrap gap-2 mb-3">
                {formData.jugadores_patrocinados.map(j => (
                  <Badge key={j.jugador_id} className="bg-blue-600 gap-1">
                    {j.jugador_nombre}
                    <button type="button" onClick={() => removeJugador(j.jugador_id)}>
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <Select onValueChange={(v) => {
                const jugador = players?.find(p => p.id === v);
                if (jugador) addJugador(jugador);
              }}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Añadir jugador..." />
                </SelectTrigger>
                <SelectContent>
                  {players?.filter(p => p.activo).map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Beneficios y notas */}
            <div className="border-t pt-4 space-y-4">
              <div>
                <Label>Beneficios Acordados</Label>
                <Textarea
                  value={formData.beneficios_acordados}
                  onChange={(e) => handleChange("beneficios_acordados", e.target.value)}
                  placeholder="Publicidad en camisetas, menciones en redes sociales, banner en campo..."
                  rows={2}
                />
              </div>
              <div>
                <Label>Notas Adicionales</Label>
                <Textarea
                  value={formData.notas}
                  onChange={(e) => handleChange("notas", e.target.value)}
                  placeholder="Notas internas sobre el patrocinio..."
                  rows={2}
                />
              </div>
            </div>

            {/* Botones */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-amber-600 hover:bg-amber-700" disabled={isSubmitting}>
                {isSubmitting ? "Guardando..." : sponsor ? "Actualizar" : "Crear Patrocinador"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}