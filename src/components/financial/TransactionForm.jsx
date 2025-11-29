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
import { Upload, FileText, Loader2, X, Receipt, TrendingUp, TrendingDown, Sparkles, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
  const [extracting, setExtracting] = useState(false);
  const [extractedData, setExtractedData] = useState(null);

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
    setExtractedData(null);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setDocumentoUrl(file_url);
      setDocumento({
        nombre: file.name,
        url: file_url
      });
      toast.success("Documento subido correctamente");

      // Extraer datos con IA si es PDF o imagen
      const isExtractable = /\.(pdf|jpg|jpeg|png)$/i.test(file.name);
      if (isExtractable) {
        await extractDataFromInvoice(file_url);
      }
    } catch (error) {
      toast.error("Error al subir el documento");
    } finally {
      setUploading(false);
    }
  };

  const extractDataFromInvoice = async (fileUrl) => {
    setExtracting(true);
    try {
      const allCategorias = [...CATEGORIAS_INGRESO, ...CATEGORIAS_GASTO];
      const partidasNombres = partidas.map(p => p.nombre).join(", ");

      // Detectar temporada actual
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;
      const currentSeason = month >= 9 ? `${year}/${year + 1}` : `${year - 1}/${year}`;

      const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url: fileUrl,
        json_schema: {
          type: "object",
          properties: {
            proveedor_cliente: {
              type: "string",
              description: "Nombre del proveedor o cliente que emite la factura"
            },
            fecha: {
              type: "string",
              description: "Fecha de la factura en formato YYYY-MM-DD"
            },
            cantidad: {
              type: "number",
              description: "Importe total de la factura en euros (sin el símbolo €)"
            },
            numero_factura: {
              type: "string",
              description: "Número de factura o referencia del documento"
            },
            concepto: {
              type: "string",
              description: "Descripción breve del concepto o servicio facturado"
            },
            categoria_sugerida: {
              type: "string",
              description: `Categoría más apropiada de esta lista: ${allCategorias.join(", ")}`
            },
            partida_sugerida: {
              type: "string",
              description: partidasNombres ? `Partida presupuestaria más apropiada de esta lista: ${partidasNombres}` : "No hay partidas definidas"
            },
            es_ingreso: {
              type: "boolean",
              description: "true si es un ingreso/cobro, false si es un gasto/pago"
            },
            tipo_documento: {
              type: "string",
              description: "Tipo de documento detectado. Opciones: Factura, Recibo, Justificante de pago, Presupuesto, Albarán, Contrato, Nómina, Extracto bancario, Otro"
            },
            subtipo_documento: {
              type: "string",
              description: "Subtipo según el contenido: Cuota deportiva, Equipación/Ropa, Lotería, Material deportivo, Arbitraje, Desplazamiento, Instalaciones, Subvención, Patrocinio, Seguro, Federación, Otro"
            },
            temporada_detectada: {
              type: "string",
              description: `Temporada a la que corresponde el documento (formato: YYYY/YYYY, ej: 2024/2025). Si no se detecta, usar: ${currentSeason}`
            },
            palabras_clave: {
              type: "array",
              items: { type: "string" },
              description: "Lista de palabras clave relevantes del documento para facilitar búsquedas futuras (máximo 5)"
            }
          }
        }
      });

      if (result.status === "success" && result.output) {
        setExtractedData(result.output);
        toast.success("✨ Datos extraídos con IA", { description: "Revisa y confirma la información" });
      } else {
        toast.info("No se pudieron extraer datos automáticamente");
      }
    } catch (error) {
      console.error("Error extrayendo datos:", error);
      toast.info("No se pudieron extraer datos automáticamente");
    } finally {
      setExtracting(false);
    }
  };

  const applyExtractedData = () => {
    if (!extractedData) return;

    // Determinar tipo
    const nuevoTipo = extractedData.es_ingreso ? "Ingreso" : "Gasto";
    setTipo(nuevoTipo);

    // Buscar partida por nombre
    let partidaId = "";
    let partidaNombre = "";
    if (extractedData.partida_sugerida) {
      const partidaEncontrada = partidas.find(p => 
        p.nombre.toLowerCase().includes(extractedData.partida_sugerida.toLowerCase()) ||
        extractedData.partida_sugerida.toLowerCase().includes(p.nombre.toLowerCase())
      );
      if (partidaEncontrada) {
        partidaId = partidaEncontrada.id;
        partidaNombre = partidaEncontrada.nombre;
      }
    }

    // Validar categoría
    const categoriasValidas = nuevoTipo === "Ingreso" ? CATEGORIAS_INGRESO : CATEGORIAS_GASTO;
    const categoriaValida = categoriasValidas.find(c => 
      c.toLowerCase() === extractedData.categoria_sugerida?.toLowerCase()
    ) || "";

    setFormData(prev => ({
      ...prev,
      concepto: extractedData.concepto || prev.concepto,
      cantidad: extractedData.cantidad?.toString() || prev.cantidad,
      fecha: extractedData.fecha || prev.fecha,
      categoria: categoriaValida,
      partida_id: partidaId,
      partida_nombre: partidaNombre,
      proveedor_cliente: extractedData.proveedor_cliente || prev.proveedor_cliente,
      numero_factura: extractedData.numero_factura || prev.numero_factura
    }));

    setExtractedData(null);
    toast.success("Datos aplicados al formulario");
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
      documento_nombre: documento?.nombre,
      tipo_documento: extractedData?.tipo_documento || null,
      subtipo_documento: extractedData?.subtipo_documento || null,
      palabras_clave: extractedData?.palabras_clave || []
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

          {/* Documento adjunto con IA */}
          <div>
            <Label className="flex items-center gap-2">
              Documento/Factura (opcional)
              <span className="text-xs text-purple-600 font-normal flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                Extracción automática con IA
              </span>
            </Label>
            <div className="mt-2 space-y-3">
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
                      setExtractedData(null);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-purple-400 hover:bg-purple-50 transition-colors">
                  {uploading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin text-orange-600" />
                      <span className="text-sm text-slate-600">Subiendo...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="h-5 w-5 text-slate-400" />
                      <span className="text-sm text-slate-600">
                        Sube una factura (PDF/imagen) y la IA extraerá los datos
                      </span>
                    </>
                  )}
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleFileUpload}
                    disabled={uploading}
                  />
                </label>
              )}

              {/* Extrayendo datos con IA */}
              {extracting && (
                <Alert className="border-purple-200 bg-purple-50">
                  <Sparkles className="h-4 w-4 text-purple-600 animate-pulse" />
                  <AlertDescription className="text-purple-800">
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Analizando factura con IA...
                    </span>
                  </AlertDescription>
                </Alert>
              )}

              {/* Datos extraídos por IA */}
              {extractedData && !extracting && (
                <Alert className="border-purple-300 bg-gradient-to-r from-purple-50 to-indigo-50">
                  <Sparkles className="h-4 w-4 text-purple-600" />
                  <AlertDescription>
                    <div className="space-y-3">
                      <p className="font-semibold text-purple-900 flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ✨ Datos extraídos automáticamente
                      </p>
                      <div className="grid grid-cols-2 gap-2 text-sm text-purple-800">
                        {extractedData.proveedor_cliente && (
                          <div><span className="font-medium">Proveedor:</span> {extractedData.proveedor_cliente}</div>
                        )}
                        {extractedData.numero_factura && (
                          <div><span className="font-medium">Nº Factura:</span> {extractedData.numero_factura}</div>
                        )}
                        {extractedData.fecha && (
                          <div><span className="font-medium">Fecha:</span> {extractedData.fecha}</div>
                        )}
                        {extractedData.cantidad && (
                          <div><span className="font-medium">Importe:</span> {extractedData.cantidad}€</div>
                        )}
                        {extractedData.concepto && (
                          <div className="col-span-2"><span className="font-medium">Concepto:</span> {extractedData.concepto}</div>
                        )}
                        {extractedData.categoria_sugerida && (
                          <div><span className="font-medium">Categoría:</span> {extractedData.categoria_sugerida}</div>
                        )}
                        {extractedData.es_ingreso !== undefined && (
                          <div><span className="font-medium">Tipo:</span> {extractedData.es_ingreso ? "Ingreso" : "Gasto"}</div>
                        )}
                        {extractedData.tipo_documento && (
                          <div><span className="font-medium">Tipo Doc:</span> {extractedData.tipo_documento}</div>
                        )}
                        {extractedData.subtipo_documento && (
                          <div><span className="font-medium">Subtipo:</span> {extractedData.subtipo_documento}</div>
                        )}
                        {extractedData.temporada_detectada && (
                          <div><span className="font-medium">Temporada:</span> {extractedData.temporada_detectada}</div>
                        )}
                        </div>
                      <div className="flex gap-2 pt-2">
                        <Button
                          type="button"
                          size="sm"
                          onClick={applyExtractedData}
                          className="bg-purple-600 hover:bg-purple-700"
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Aplicar datos
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setExtractedData(null)}
                        >
                          Ignorar
                        </Button>
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
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