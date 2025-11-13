import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { X, Upload, FileText, Loader2, AlertCircle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

// Obtener temporada actual
const getCurrentSeason = () => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  
  if (currentMonth >= 9) {
    return `${currentYear}/${currentYear + 1}`;
  }
  return `${currentYear - 1}/${currentYear}`;
};

// Generar opciones de temporadas
const generateSeasonOptions = () => {
  const current = new Date().getFullYear();
  const seasons = [];
  for (let i = -1; i <= 2; i++) {
    const year = current + i;
    seasons.push(`${year}/${year + 1}`);
  }
  return seasons;
};

export default function ParentPaymentForm({ players, onSubmit, onCancel, isSubmitting }) {
  const formRef = useRef(null);
  
  const [paymentData, setPaymentData] = useState({
    jugador_id: "",
    jugador_nombre: "",
    tipo_pago: "Único",
    mes: "Septiembre",
    temporada: getCurrentSeason(),
    cantidad: 0,
    estado: "En revisión",
    metodo_pago: "Bizum",
    fecha_pago: new Date().toISOString().split('T')[0],
    justificante_url: "",
    notas: ""
  });

  const [uploadingFile, setUploadingFile] = useState(false);
  const [fileName, setFileName] = useState("");

  // Scroll al formulario cuando se monta
  useEffect(() => {
    if (formRef.current) {
      formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  // Actualizar cantidad según tipo de pago
  useEffect(() => {
    const fetchSeasonConfig = async () => {
      try {
        const configs = await base44.entities.SeasonConfig.list();
        const activeConfig = configs.find(c => c.activa === true);
        
        if (activeConfig) {
          const amount = paymentData.tipo_pago === "Único" 
            ? activeConfig.cuota_unica 
            : activeConfig.cuota_tres_meses;
          
          setPaymentData(prev => ({ ...prev, cantidad: amount }));
        }
      } catch (error) {
        console.error("Error fetching season config:", error);
      }
    };

    fetchSeasonConfig();
  }, [paymentData.tipo_pago]);

  // Actualizar nombre del jugador cuando se selecciona
  const handlePlayerChange = (jugadorId) => {
    const player = players.find(p => p.id === jugadorId);
    setPaymentData({
      ...paymentData,
      jugador_id: jugadorId,
      jugador_nombre: player ? player.nombre : ""
    });
  };

  // Subir archivo
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    setFileName(file.name);

    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setPaymentData({ ...paymentData, justificante_url: file_url });
      toast.success("Justificante subido correctamente");
    } catch (error) {
      toast.error("Error al subir el archivo");
      console.error("Error uploading file:", error);
    } finally {
      setUploadingFile(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!paymentData.jugador_id) {
      toast.error("Selecciona un jugador");
      return;
    }

    if (!paymentData.justificante_url) {
      toast.error("Debes subir el justificante de pago");
      return;
    }

    onSubmit(paymentData);
  };

  return (
    <motion.div
      ref={formRef}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <Card className="border-none shadow-xl bg-gradient-to-br from-white to-orange-50">
        <CardHeader className="border-b border-orange-100">
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl text-slate-900">Registrar Nuevo Pago</CardTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={onCancel}
              className="hover:bg-orange-100"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Selección de Jugador */}
            <div className="space-y-2">
              <Label htmlFor="jugador">Jugador *</Label>
              <Select
                value={paymentData.jugador_id}
                onValueChange={handlePlayerChange}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un jugador" />
                </SelectTrigger>
                <SelectContent>
                  {players.map((player) => (
                    <SelectItem key={player.id} value={player.id}>
                      {player.nombre} - {player.categoria} ({player.deporte})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tipo de Pago */}
            <div className="space-y-2">
              <Label htmlFor="tipo_pago">Tipo de Pago *</Label>
              <Select
                value={paymentData.tipo_pago}
                onValueChange={(value) => setPaymentData({ ...paymentData, tipo_pago: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Único">Pago Único</SelectItem>
                  <SelectItem value="Tres meses">Tres Meses (Septiembre, Diciembre, Marzo)</SelectItem>
                </SelectContent>
              </Select>
              {paymentData.tipo_pago === "Tres meses" && (
                <p className="text-xs text-slate-600 bg-blue-50 rounded p-2 border border-blue-200">
                  💡 Al elegir "Tres meses", estás registrando el primer pago de tres cuotas. Las siguientes cuotas se crearán automáticamente.
                </p>
              )}
            </div>

            {/* Mes del Pago - SOLO para pago único */}
            {paymentData.tipo_pago === "Único" && (
              <div className="space-y-2">
                <Label htmlFor="mes">Mes del Pago *</Label>
                <Select
                  value={paymentData.mes}
                  onValueChange={(value) => setPaymentData({ ...paymentData, mes: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Septiembre">Septiembre</SelectItem>
                    <SelectItem value="Diciembre">Diciembre</SelectItem>
                    <SelectItem value="Marzo">Marzo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              {/* Temporada */}
              <div className="space-y-2">
                <Label htmlFor="temporada">Temporada *</Label>
                <Select
                  value={paymentData.temporada}
                  onValueChange={(value) => setPaymentData({ ...paymentData, temporada: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {generateSeasonOptions().map((season) => (
                      <SelectItem key={season} value={season}>
                        {season}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Cantidad */}
              <div className="space-y-2">
                <Label htmlFor="cantidad">Cantidad (€) *</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={paymentData.cantidad}
                  onChange={(e) => setPaymentData({ ...paymentData, cantidad: parseFloat(e.target.value) })}
                  required
                  className="font-bold"
                />
              </div>
            </div>

            {/* Método de Pago */}
            <div className="space-y-2">
              <Label htmlFor="metodo_pago">Método de Pago *</Label>
              <Select
                value={paymentData.metodo_pago}
                onValueChange={(value) => setPaymentData({ ...paymentData, metodo_pago: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Bizum">Bizum</SelectItem>
                  <SelectItem value="Transferencia">Transferencia Bancaria</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Fecha de Pago */}
            <div className="space-y-2">
              <Label htmlFor="fecha_pago">Fecha de Pago *</Label>
              <Input
                type="date"
                value={paymentData.fecha_pago}
                onChange={(e) => setPaymentData({ ...paymentData, fecha_pago: e.target.value })}
                required
              />
            </div>

            {/* Subir Justificante */}
            <div className="space-y-2">
              <Label htmlFor="justificante">Justificante de Pago *</Label>
              <div className="border-2 border-dashed border-orange-300 rounded-lg p-6 text-center bg-orange-50/50">
                {paymentData.justificante_url ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-center gap-2 text-green-600">
                      <FileText className="w-8 h-8" />
                      <span className="font-medium">Justificante subido correctamente</span>
                    </div>
                    {fileName && (
                      <p className="text-sm text-slate-600">{fileName}</p>
                    )}
                    <a
                      href={paymentData.justificante_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block text-orange-600 hover:text-orange-700 text-sm underline"
                    >
                      Ver justificante
                    </a>
                    <div>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={handleFileUpload}
                        className="hidden"
                        id="change-file"
                        disabled={uploadingFile}
                      />
                      <label htmlFor="change-file">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={uploadingFile}
                          onClick={() => document.getElementById('change-file').click()}
                        >
                          Cambiar archivo
                        </Button>
                      </label>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Upload className="w-12 h-12 text-orange-500 mx-auto" />
                    <div>
                      <p className="text-slate-700 font-medium mb-1">
                        Sube el justificante de tu pago
                      </p>
                      <p className="text-sm text-slate-500">
                        Captura de Bizum o comprobante de transferencia (JPG, PNG o PDF)
                      </p>
                    </div>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="upload-file"
                      disabled={uploadingFile}
                    />
                    <label htmlFor="upload-file">
                      <Button
                        type="button"
                        variant="outline"
                        disabled={uploadingFile}
                        onClick={() => document.getElementById('upload-file').click()}
                        className="border-orange-300 hover:bg-orange-100"
                      >
                        {uploadingFile ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Subiendo...
                          </>
                        ) : (
                          <>
                            <Upload className="w-4 h-4 mr-2" />
                            Seleccionar archivo
                          </>
                        )}
                      </Button>
                    </label>
                  </div>
                )}
              </div>
            </div>

            {/* Notas */}
            <div className="space-y-2">
              <Label htmlFor="notas">Notas adicionales (opcional)</Label>
              <Textarea
                placeholder="Añade cualquier información adicional sobre el pago..."
                value={paymentData.notas}
                onChange={(e) => setPaymentData({ ...paymentData, notas: e.target.value })}
                rows={3}
              />
            </div>

            {/* Información importante */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-900">
                <p className="font-medium mb-1">📋 Importante:</p>
                <ul className="list-disc list-inside space-y-1 text-blue-800">
                  <li>El estado del pago será <strong>"En revisión"</strong> hasta que el administrador lo verifique</li>
                  <li>Asegúrate de subir un justificante claro y legible</li>
                  <li>Recibirás una notificación cuando el pago sea verificado</li>
                </ul>
              </div>
            </div>

            {/* Botones */}
            <div className="flex justify-end gap-3 pt-4 border-t border-orange-100">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || uploadingFile || !paymentData.justificante_url}
                className="bg-orange-600 hover:bg-orange-700"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Registrando...
                  </>
                ) : (
                  "Registrar Pago"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}