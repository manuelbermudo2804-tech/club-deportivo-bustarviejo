import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Upload, X, Loader2, AlertCircle, Info } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { getCuotasPorCategoria, getImportePorCategoriaYMes, FECHAS_VENCIMIENTO } from "@/components/payments/paymentAmounts";

import PaymentInstructions from "./PaymentInstructions";

// Función para obtener la temporada actual
const getCurrentSeason = () => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  
  if (currentMonth <= 8) {
    return `${currentYear - 1}/${currentYear}`;
  }
  return `${currentYear}/${currentYear + 1}`;
};

export default function ParentPaymentForm({ players, onSubmit, onCancel, isSubmitting }) {
  const currentSeason = getCurrentSeason();
  const [currentPayment, setCurrentPayment] = useState({
    jugador_id: "",
    jugador_nombre: "",
    tipo_pago: "Único",
    mes: "Junio",
    temporada: currentSeason,
    cantidad: 0,
    estado: "En revisión",
    metodo_pago: "Transferencia",
    justificante_url: "",
    fecha_pago: new Date().toISOString().split('T')[0],
    notas: ""
  });

  const [uploadingFile, setUploadingFile] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState(null);

  useEffect(() => {
    if (currentPayment.jugador_id) {
      const player = players.find(p => p.id === currentPayment.jugador_id);
      setSelectedPlayer(player);
    }
  }, [currentPayment.jugador_id, players]);

  // Calcular cantidad cuando cambie jugador, tipo de pago o mes
  useEffect(() => {
    if (!selectedPlayer) return;
    
    const cuotas = getCuotasPorCategoria(selectedPlayer.deporte);
    
    let nuevaCantidad = 0;
    if (currentPayment.tipo_pago === "Único") {
      nuevaCantidad = cuotas.total;
    } else {
      nuevaCantidad = getImportePorCategoriaYMes(selectedPlayer.deporte, currentPayment.mes);
    }
    
    setCurrentPayment(prev => ({ ...prev, cantidad: nuevaCantidad }));
  }, [selectedPlayer, currentPayment.tipo_pago, currentPayment.mes]);

  const handlePlayerChange = (playerId) => {
    const player = players.find(p => p.id === playerId);
    if (player) {
      const cuotas = getCuotasPorCategoria(player.deporte);
      const cantidad = currentPayment.tipo_pago === "Único" 
        ? cuotas.total 
        : getImportePorCategoriaYMes(player.deporte, currentPayment.mes);
      
      setCurrentPayment({
        ...currentPayment,
        jugador_id: player.id,
        jugador_nombre: player.nombre,
        cantidad: cantidad
      });
    }
  };

  const handleTipoPagoChange = (value) => {
    if (selectedPlayer) {
      const cuotas = getCuotasPorCategoria(selectedPlayer.deporte);
      const cantidad = value === "Único" 
        ? cuotas.total 
        : getImportePorCategoriaYMes(selectedPlayer.deporte, currentPayment.mes);
      
      setCurrentPayment({
        ...currentPayment,
        tipo_pago: value,
        cantidad: cantidad
      });
    } else {
      setCurrentPayment({
        ...currentPayment,
        tipo_pago: value
      });
    }
  };

  const handleMesChange = (value) => {
    if (selectedPlayer && currentPayment.tipo_pago !== "Único") {
      const cantidad = getImportePorCategoriaYMes(selectedPlayer.deporte, value);
      setCurrentPayment({
        ...currentPayment,
        mes: value,
        cantidad: cantidad
      });
    } else {
      setCurrentPayment({
        ...currentPayment,
        mes: value
      });
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    try {
      const response = await base44.integrations.Core.UploadFile({ file });
      setCurrentPayment({
        ...currentPayment,
        justificante_url: response.file_url
      });
      toast.success("Justificante subido correctamente");
    } catch (error) {
      console.error("Error uploading file:", error);
      toast.error("Error al subir el justificante");
    } finally {
      setUploadingFile(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!currentPayment.jugador_id) {
      toast.error("Selecciona un jugador");
      return;
    }

    if (!currentPayment.justificante_url) {
      toast.error("Debes subir el justificante de pago (transferencia bancaria)");
      return;
    }

    if (!currentPayment.cantidad || currentPayment.cantidad <= 0) {
      toast.error("Introduce la cantidad pagada");
      return;
    }

    onSubmit(currentPayment);
  };

  const cuotas = selectedPlayer ? getCuotasPorCategoria(selectedPlayer.deporte) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* Instrucciones de Pago - Solo mostrar si hay jugador y cantidad seleccionados */}
      {selectedPlayer && currentPayment.cantidad > 0 && (
        <PaymentInstructions
          playerName={selectedPlayer.nombre}
          playerCategory={selectedPlayer.deporte}
          amount={currentPayment.cantidad}
          paymentType={currentPayment.tipo_pago}
        />
      )}

      {/* Formulario */}
      <Card className="border-none shadow-xl bg-white/90 backdrop-blur-sm">
        <CardHeader className="border-b border-slate-100">
          <CardTitle className="text-2xl">Registrar Pago</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Selector de Jugador */}
              <div className="space-y-2">
                <Label htmlFor="jugador">Jugador *</Label>
                <Select
                  value={currentPayment.jugador_id}
                  onValueChange={handlePlayerChange}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un jugador" />
                  </SelectTrigger>
                  <SelectContent>
                    {players
                      .filter(p => p.activo)
                      .map(player => (
                        <SelectItem key={player.id} value={player.id}>
                          {player.nombre} - {player.deporte}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Tipo de Pago */}
              <div className="space-y-2">
                <Label htmlFor="tipo_pago">Tipo de Pago *</Label>
                <Select
                  value={currentPayment.tipo_pago}
                  onValueChange={handleTipoPagoChange}
                  required
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Único">Pago Único (Total Temporada)</SelectItem>
                    <SelectItem value="Tres meses">Tres Pagos (Jun, Sep, Dic)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Mes */}
              <div className="space-y-2">
                <Label htmlFor="mes">
                  {currentPayment.tipo_pago === "Único" 
                    ? "Tipo de Cuota *" 
                    : "¿Qué cuota estás pagando? *"}
                </Label>
                <Select
                  value={currentPayment.mes}
                  onValueChange={handleMesChange}
                  required
                  disabled={currentPayment.tipo_pago === "Único"}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Junio">Inscripción (Junio)</SelectItem>
                    <SelectItem value="Septiembre">Segunda Cuota (Septiembre)</SelectItem>
                    <SelectItem value="Diciembre">Tercera Cuota (Diciembre)</SelectItem>
                  </SelectContent>
                </Select>
                {currentPayment.tipo_pago === "Único" && (
                  <p className="text-xs text-slate-500">
                    Este campo no aplica para pago único (se paga todo de una vez)
                  </p>
                )}
              </div>

              {/* Cantidad */}
              <div className="space-y-2">
                <Label htmlFor="cantidad">Cantidad Pagada (€) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={currentPayment.cantidad}
                  onChange={(e) => setCurrentPayment({...currentPayment, cantidad: parseFloat(e.target.value) || 0})}
                  required
                  placeholder="Ej: 50.00"
                  className="font-bold text-lg"
                />
                {selectedPlayer && currentPayment.tipo_pago === "Único" && (
                  <p className="text-xs text-green-600">
                    ✓ Total temporada: {cuotas?.total}€
                  </p>
                )}
                {selectedPlayer && currentPayment.tipo_pago === "Tres meses" && (
                  <p className="text-xs text-green-600">
                    ✓ Importe oficial: {getImportePorCategoriaYMes(selectedPlayer.deporte, currentPayment.mes)}€ 
                    (vence el {FECHAS_VENCIMIENTO[currentPayment.mes]})
                  </p>
                )}
              </div>

              {/* Fecha de Pago */}
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="fecha_pago">Fecha del Pago *</Label>
                <Input
                  type="date"
                  value={currentPayment.fecha_pago}
                  onChange={(e) => setCurrentPayment({...currentPayment, fecha_pago: e.target.value})}
                  required
                  className="max-w-xs"
                />
              </div>
            </div>

            {/* Info de cuotas */}
            {cuotas && (
              <Alert className="bg-green-50 border-green-300">
                <Info className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  <strong>📊 Cuotas para {selectedPlayer?.deporte}:</strong>
                  <div className="mt-2 space-y-1 text-sm">
                    <p>• <strong>Inscripción (hasta 30 junio):</strong> {cuotas.inscripcion}€</p>
                    <p>• <strong>Segunda Cuota (hasta 15 sept):</strong> {cuotas.segunda}€</p>
                    <p>• <strong>Tercera Cuota (hasta 15 dic):</strong> {cuotas.tercera}€</p>
                    <p className="pt-2 border-t border-green-300 mt-2">
                      <strong>Total Temporada (pago único):</strong> {cuotas.total}€
                    </p>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Justificante */}
            <div className="space-y-3 p-4 bg-orange-50 rounded-lg border-2 border-orange-200">
              <Label htmlFor="justificante" className="text-base font-semibold text-orange-900">
                📎 Justificante de Transferencia * (Obligatorio)
              </Label>
              <p className="text-sm text-orange-800">
                Sube una captura o foto del justificante de tu transferencia bancaria
              </p>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById('file-upload').click()}
                  disabled={uploadingFile}
                  className="flex-1 bg-white"
                >
                  {uploadingFile ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Subiendo...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      {currentPayment.justificante_url ? "Cambiar justificante" : "Subir justificante"}
                    </>
                  )}
                </Button>
                {currentPayment.justificante_url && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCurrentPayment({...currentPayment, justificante_url: ""})}
                    className="bg-white"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
              <input
                id="file-upload"
                type="file"
                accept="image/*,.pdf"
                onChange={handleFileUpload}
                className="hidden"
              />
              {currentPayment.justificante_url ? (
                <p className="text-sm text-green-600 font-medium">✓ Justificante subido correctamente</p>
              ) : (
                <p className="text-sm text-red-600 font-medium">⚠️ Debes subir el justificante para continuar</p>
              )}
            </div>

            {/* Notas */}
            <div className="space-y-2">
              <Label htmlFor="notas">Notas Adicionales (opcional)</Label>
              <Textarea
                value={currentPayment.notas}
                onChange={(e) => setCurrentPayment({...currentPayment, notas: e.target.value})}
                placeholder="Información adicional sobre el pago..."
                rows={3}
              />
            </div>

            {/* Botones */}
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
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
                className="bg-orange-600 hover:bg-orange-700"
                disabled={isSubmitting || !currentPayment.justificante_url}
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