import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Upload, FileText, Loader2, X, Receipt, TrendingUp, TrendingDown } from "lucide-react";
import { toast } from "sonner";

const CATEGORIAS_INGRESO = [
  "Cuotas Socios",
  "Inscripciones",
  "Subvenciones",
  "Patrocinios",
  "Venta Equipación",
  "Eventos",
  "Lotería",
  "Otros Ingresos"
];

const CATEGORIAS_GASTO = [
  "Material Deportivo",
  "Equipación",
  "Arbitrajes",
  "Desplazamientos",
  "Instalaciones",
  "Mantenimiento",
  "Seguros",
  "Federación",
  "Personal",
  "Suministros",
  "Marketing",
  "Eventos y Celebraciones",
  "Otros Gastos"
];

export default function TransactionForm({ 
  partidas = [], 
  temporada, 
  onSubmit, 
  onCancel,
  isSubmitting 
}) {
  const [tipo, setTipo] = useState("Gasto");
  const [formData, setFormData] = useState({
    concepto: "",
    cantidad: "",
    fecha: new Date().toISOString().split('T')[0],
    categoria: "",
    partida_id: "",
    partida_nombre: "",
    proveedor_cliente: "",
    numero_factura: "",
    metodo_pago: "Transferencia",
    estado: "Pendiente",
    notas: ""
  });
  const [documento, setDocumento] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [documentoUrl, setDocumentoUrl] = useState("");

  const categorias = tipo === "Ingreso" ? CATEGORIAS_INGRESO : CATEGORIAS_GASTO;
  const partidasFiltradas = partidas.filter(p => 
    tipo === "Ingreso" ? p.categoria === "Ingresos" : p.categoria !== "Ingresos"
  );

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error("El archivo es demasiado grande. Máximo 10MB");
      return;
    }

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setDocumentoUrl(file_url);
      setDocumento({
        nombre: file.name,
        url: file_url
      });
      toast.success("Documento subido correctamente");
    } catch (error) {
      toast.error("Error al subir el documento");
    } finally {
      setUploading(false);
    }
  };

  const handlePartidaChange = (partidaId) => {
    const partida = partidas.find(p => p.id === partidaId);
    setFormData({
      ...formData,
      partida_id: partidaId,
      partida_nombre: partida?.nombre || ""
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.concepto || !formData.cantidad || !formData.categoria) {
      toast.error("Completa los campos obligatorios");
      return;
    }

    onSubmit({
      ...formData,
      tipo,
      cantidad: parseFloat(formData.cantidad),
      temporada,
      documento_url: documentoUrl,
      documento_nombre: documento?.nombre
    });
  };

  return (
    <Card className="border-2 border-orange-200">
      <CardHeader className="bg-gradient-to-r from-orange-50 to-orange-100">
        <CardTitle className="flex items-center gap-2">
          <Receipt className="h-5 w-5 text-orange-600" />
          Registrar Movimiento Financiero
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Tipo de transacción */}
          <div className="flex gap-4">
            <Button
              type="button"
              variant={tipo === "Ingreso" ? "default" : "outline"}
              className={tipo === "Ingreso" ? "bg-green-600 hover:bg-green-700 flex-1" : "flex-1"}
              onClick={() => setTipo("Ingreso")}
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              Ingreso
            </Button>
            <Button
              type="button"
              variant={tipo === "Gasto" ? "default" : "outline"}
              className={tipo === "Gasto" ? "bg-red-600 hover:bg-red-700 flex-1" : "flex-1"}
              onClick={() => setTipo("Gasto")}
            >
              <TrendingDown className="h-4 w-4 mr-2" />
              Gasto
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Concepto */}
            <div className="md:col-span-2">
              <Label>Concepto *</Label>
              <Input
                placeholder="Descripción del movimiento..."
                value={formData.concepto}
                onChange={(e) => setFormData({...formData, concepto: e.target.value})}
                required
              />
            </div>

            {/* Cantidad */}
            <div>
              <Label>Importe (€) *</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.cantidad}
                onChange={(e) => setFormData({...formData, cantidad: e.target.value})}
                required
              />
            </div>

            {/* Fecha */}
            <div>
              <Label>Fecha *</Label>
              <Input
                type="date"
                value={formData.fecha}
                onChange={(e) => setFormData({...formData, fecha: e.target.value})}
                required
              />
            </div>

            {/* Categoría */}
            <div>
              <Label>Categoría *</Label>
              <Select
                value={formData.categoria}
                onValueChange={(v) => setFormData({...formData, categoria: v})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona categoría..." />
                </SelectTrigger>
                <SelectContent>
                  {categorias.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Partida presupuestaria */}
            <div>
              <Label>Partida Presupuestaria</Label>
              <Select
                value={formData.partida_id}
                onValueChange={handlePartidaChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Asociar a partida..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>Sin partida asociada</SelectItem>
                  {partidasFiltradas.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Proveedor/Cliente */}
            <div>
              <Label>{tipo === "Ingreso" ? "Cliente/Origen" : "Proveedor"}</Label>
              <Input
                placeholder={tipo === "Ingreso" ? "Ej: Ayuntamiento" : "Ej: Decathlon"}
                value={formData.proveedor_cliente}
                onChange={(e) => setFormData({...formData, proveedor_cliente: e.target.value})}
              />
            </div>

            {/* Número de factura */}
            <div>
              <Label>Nº Factura/Referencia</Label>
              <Input
                placeholder="Ej: FAC-2024-001"
                value={formData.numero_factura}
                onChange={(e) => setFormData({...formData, numero_factura: e.target.value})}
              />
            </div>

            {/* Método de pago */}
            <div>
              <Label>Método de Pago</Label>
              <Select
                value={formData.metodo_pago}
                onValueChange={(v) => setFormData({...formData, metodo_pago: v})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Transferencia">Transferencia</SelectItem>
                  <SelectItem value="Bizum">Bizum</SelectItem>
                  <SelectItem value="Efectivo">Efectivo</SelectItem>
                  <SelectItem value="Tarjeta">Tarjeta</SelectItem>
                  <SelectItem value="Domiciliación">Domiciliación</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Estado */}
            <div>
              <Label>Estado</Label>
              <Select
                value={formData.estado}
                onValueChange={(v) => setFormData({...formData, estado: v})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pendiente">Pendiente</SelectItem>
                  <SelectItem value={tipo === "Ingreso" ? "Cobrado" : "Pagado"}>
                    {tipo === "Ingreso" ? "Cobrado" : "Pagado"}
                  </SelectItem>
                  <SelectItem value="Anulado">Anulado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Documento adjunto */}
          <div>
            <Label>Documento/Factura (opcional)</Label>
            <div className="mt-2">
              {documento ? (
                <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <FileText className="h-5 w-5 text-green-600" />
                  <span className="flex-1 text-sm text-green-800">{documento.nombre}</span>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      setDocumento(null);
                      setDocumentoUrl("");
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-orange-400 hover:bg-orange-50 transition-colors">
                  {uploading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin text-orange-600" />
                      <span className="text-sm text-slate-600">Subiendo...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="h-5 w-5 text-slate-400" />
                      <span className="text-sm text-slate-600">
                        Arrastra o haz clic para subir factura/documento
                      </span>
                    </>
                  )}
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    onChange={handleFileUpload}
                    disabled={uploading}
                  />
                </label>
              )}
            </div>
          </div>

          {/* Notas */}
          <div>
            <Label>Notas adicionales</Label>
            <Textarea
              placeholder="Observaciones..."
              value={formData.notas}
              onChange={(e) => setFormData({...formData, notas: e.target.value})}
              rows={2}
            />
          </div>

          {/* Botones */}
          <div className="flex gap-3 justify-end pt-4 border-t">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting}
              className={tipo === "Ingreso" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  Registrar {tipo}
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}