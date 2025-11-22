import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Upload, X, Loader2, Info } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { Alert, AlertDescription } from "@/components/ui/alert";

import PaymentInstructions from "./PaymentInstructions";

const getCurrentSeason = () => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  
  if (currentMonth >= 9) {
    return `${currentYear}/${currentYear + 1}`;
  }
  return `${currentYear - 1}/${currentYear}`;
};

const CUOTAS = {
  "Fútbol Aficionado": { inscripcion: 165, segunda: 100, tercera: 95, total: 360 },
  "Fútbol Juvenil": { inscripcion: 135, segunda: 100, tercera: 95, total: 330 },
  "Fútbol Cadete": { inscripcion: 135, segunda: 100, tercera: 95, total: 330 },
  "Fútbol Infantil (Mixto)": { inscripcion: 115, segunda: 83, tercera: 83, total: 281 },
  "Fútbol Alevín (Mixto)": { inscripcion: 115, segunda: 83, tercera: 83, total: 281 },
  "Fútbol Benjamín (Mixto)": { inscripcion: 100, segunda: 75, tercera: 75, total: 250 },
  "Fútbol Pre-Benjamín (Mixto)": { inscripcion: 100, segunda: 75, tercera: 75, total: 250 },
  "Fútbol Femenino": { inscripcion: 135, segunda: 100, tercera: 95, total: 330 },
  "Baloncesto (Mixto)": { inscripcion: 50, segunda: 50, tercera: 50, total: 150 }
};

const FECHAS_VENCIMIENTO = {
  "Junio": "30 de junio",
  "Septiembre": "15 de septiembre",
  "Diciembre": "15 de diciembre"
};

const getCuotasPorCategoria = (categoria) => {
  return CUOTAS[categoria] || { inscripcion: 0, segunda: 0, tercera: 0, total: 0 };
};

const getImportePorMes = (categoria, mes) => {
  const cuotas = getCuotasPorCategoria(categoria);
  if (mes === "Junio") return cuotas.inscripcion;
  if (mes === "Septiembre") return cuotas.segunda;
  if (mes === "Diciembre") return cuotas.tercera;
  return 0;
};

export default function ParentPaymentForm({ players, payments = [], onSubmit, onCancel, isSubmitting, isAdmin = false, preselectedPlayerId = null }) {
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
  const [existingPayments, setExistingPayments] = useState([]);
  const [pagoUnicoPagado, setPagoUnicoPagado] = useState(false);
  const [tipoPagoFijado, setTipoPagoFijado] = useState(null);
  const [seasonConfig, setSeasonConfig] = useState(null);

  // Fetch season config for Bizum availability
  useEffect(() => {
    const fetchConfig = async () => {
      const configs = await base44.entities.SeasonConfig.list();
      const active = configs.find(c => c.activa === true);
      setSeasonConfig(active);
    };
    fetchConfig();
  }, []);

  useEffect(() => {
    if (players && players.length > 0 && !currentPayment.jugador_id) {
      // Primero prioridad a preselectedPlayerId (desde botón "Registrar Primer Pago")
      if (preselectedPlayerId) {
        const player = players.find(p => p.id === preselectedPlayerId);
        if (player) {
          handlePlayerChange(player.id);
          return;
        }
      }
      
      // Segundo prioridad a URL param
      const urlParams = new URLSearchParams(window.location.search);
      const jugadorId = urlParams.get('jugador_id');
      
      if (jugadorId) {
        const player = players.find(p => p.id === jugadorId);
        if (player) {
          handlePlayerChange(player.id);
        }
      }
    }
  }, [players, payments, preselectedPlayerId]);

  const handlePlayerChange = (playerId) => {
    const player = players.find(p => p.id === playerId);
    if (player) {
      setSelectedPlayer(player);
      
      // Verificar pagos existentes del jugador en esta temporada
      const jugadorPayments = payments.filter(p => 
        p.jugador_id === playerId && 
        p.temporada === currentSeason
      );
      setExistingPayments(jugadorPayments);
      
      // Verificar si ya tiene un pago único pagado
      const pagoUnico = jugadorPayments.find(p => p.tipo_pago === "Único" && p.estado === "Pagado");
      
      // Obtener meses ya pagados en modalidad Tres meses
      const mesesPagados = jugadorPayments
        .filter(p => p.tipo_pago === "Tres meses" && p.estado === "Pagado")
        .map(p => p.mes);
      
      // Verificar si todos los meses están pagados
      const todosMesesPagados = ["Junio", "Septiembre", "Diciembre"].every(m => mesesPagados.includes(m));
      
      // Solo bloquear si tiene TODO completado
      const estaTodoCompletado = !!pagoUnico || todosMesesPagados;
      setPagoUnicoPagado(estaTodoCompletado);
      
      // Si está todo completado, no configurar más el formulario
      if (estaTodoCompletado) {
        return;
      }
      
      // Verificar el tipo de pago ya usado (aunque no esté pagado)
      const primerPago = jugadorPayments.find(p => p.estado === "Pagado" || p.estado === "En revisión");
      if (primerPago) {
        setTipoPagoFijado(primerPago.tipo_pago);
      } else {
        setTipoPagoFijado(null);
      }
      
      const cuotas = getCuotasPorCategoria(player.deporte);
      
      // Seleccionar el primer mes disponible si el actual está pagado
      let mesSeleccionado = currentPayment.mes;
      if (mesesPagados.includes(currentPayment.mes)) {
        const mesesDisponibles = ["Junio", "Septiembre", "Diciembre"].filter(m => !mesesPagados.includes(m));
        mesSeleccionado = mesesDisponibles[0] || "Junio";
      }
      
      // Si hay tipo fijado, usarlo
      const tipoPago = primerPago ? primerPago.tipo_pago : currentPayment.tipo_pago;
      
      const cantidad = tipoPago === "Único" 
        ? cuotas.total 
        : getImportePorMes(player.deporte, mesSeleccionado);
      
      setCurrentPayment(prev => ({
        ...prev,
        jugador_id: player.id,
        jugador_nombre: player.nombre,
        tipo_pago: tipoPago,
        mes: mesSeleccionado,
        cantidad: cantidad
      }));
    }
  };

  const handleTipoPagoChange = (value) => {
    if (selectedPlayer) {
      const cuotas = getCuotasPorCategoria(selectedPlayer.deporte);
      const cantidad = value === "Único" 
        ? cuotas.total 
        : getImportePorMes(selectedPlayer.deporte, currentPayment.mes);
      
      setCurrentPayment(prev => ({
        ...prev,
        tipo_pago: value,
        cantidad: cantidad
      }));
    }
  };

  const handleMesChange = (value) => {
    if (selectedPlayer) {
      const cantidad = currentPayment.tipo_pago === "Único"
        ? getCuotasPorCategoria(selectedPlayer.deporte).total
        : getImportePorMes(selectedPlayer.deporte, value);
      
      setCurrentPayment(prev => ({
        ...prev,
        mes: value,
        cantidad: cantidad
      }));
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tamaño de archivo (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("El archivo es demasiado grande. Máximo 10MB");
      e.target.value = ''; // Reset input
      return;
    }

    setUploadingFile(true);
    try {
      const response = await base44.integrations.Core.UploadFile({ file });
      setCurrentPayment(prev => ({
        ...prev,
        justificante_url: response.file_url
      }));
      toast.success("Justificante subido correctamente");
    } catch (error) {
      console.error("Error uploading file:", error);
      toast.error("Error al subir el justificante. Intenta con un archivo más pequeño.");
    } finally {
      setUploadingFile(false);
      e.target.value = ''; // Reset input
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!currentPayment.jugador_id) {
      toast.error("Selecciona un jugador");
      return;
    }

    if (!currentPayment.justificante_url) {
      toast.error("Debes subir el justificante de pago");
      return;
    }

    if (!currentPayment.cantidad || currentPayment.cantidad <= 0) {
      toast.error("Introduce la cantidad pagada");
      return;
    }

    onSubmit(currentPayment);
  };

  const cuotas = selectedPlayer ? getCuotasPorCategoria(selectedPlayer.deporte) : null;
  
  // Obtener meses ya pagados
  const mesesPagados = existingPayments
    .filter(p => p.tipo_pago === "Tres meses" && p.estado === "Pagado")
    .map(p => p.mes);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <Card className="border-none shadow-xl bg-white/90 backdrop-blur-sm">
        <CardHeader className="border-b border-slate-100">
          <CardTitle className="text-2xl">Registrar Pago</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {pagoUnicoPagado && selectedPlayer && (
            <Alert className="bg-green-50 border-2 border-green-500 mb-6">
              <Info className="h-5 w-5 text-green-600" />
              <AlertDescription className="text-green-900">
                <p className="font-bold text-lg mb-2">✅ Temporada Pagada Completamente</p>
                <p>El jugador <strong>{selectedPlayer.nombre}</strong> ya tiene todos los pagos de la temporada {currentSeason} completados.</p>
                <p className="mt-2 text-sm">No es necesario registrar más pagos para este jugador. Selecciona otro jugador.</p>
              </AlertDescription>
            </Alert>
          )}

          {!pagoUnicoPagado && selectedPlayer && currentPayment.cantidad > 0 && (
            <div className="mb-6">
              <PaymentInstructions
                playerName={selectedPlayer.nombre}
                playerCategory={selectedPlayer.deporte}
                amount={currentPayment.cantidad}
                paymentType={currentPayment.tipo_pago}
              />
            </div>
          )}
          
          {!pagoUnicoPagado && tipoPagoFijado && (
            <Alert className="bg-blue-50 border-blue-300 mb-6">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                <p className="font-semibold">Tipo de pago seleccionado previamente:</p>
                <p className="text-sm mt-1">
                  Este jugador está inscrito con modalidad de <strong>{tipoPagoFijado}</strong>.
                  {tipoPagoFijado === "Tres meses" && mesesPagados.length > 0 && (
                    <span className="block mt-1">Cuotas pagadas: {mesesPagados.join(", ")}</span>
                  )}
                </p>
              </AlertDescription>
            </Alert>
          )}
          <form onSubmit={handleSubmit} className="space-y-6">
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
                                  .filter(p => p.activo !== false)
                                  .map(player => (
                                    <SelectItem key={player.id} value={player.id}>
                                      {player.nombre} - {player.deporte}
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                </Select>
            </div>

            {!pagoUnicoPagado && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="tipo_pago">Tipo de Pago *</Label>
                    <Select
                      value={currentPayment.tipo_pago}
                      onValueChange={handleTipoPagoChange}
                      required
                      disabled={!!tipoPagoFijado}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Único">Pago Único (Total Temporada)</SelectItem>
                        <SelectItem value="Tres meses">Tres Pagos (Jun, Sep, Dic)</SelectItem>
                      </SelectContent>
                    </Select>
                    {tipoPagoFijado && (
                      <p className="text-xs text-slate-600">
                        ℹ️ Tipo de pago fijado según inscripción
                      </p>
                    )}
                  </div>

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
                        {!mesesPagados.includes("Junio") && (
                          <SelectItem value="Junio">Inscripción (Junio)</SelectItem>
                        )}
                        {!mesesPagados.includes("Septiembre") && (
                          <SelectItem value="Septiembre">Segunda Cuota (Septiembre)</SelectItem>
                        )}
                        {!mesesPagados.includes("Diciembre") && (
                          <SelectItem value="Diciembre">Tercera Cuota (Diciembre)</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cantidad">Cantidad Pagada (€) *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={currentPayment.cantidad}
                      onChange={(e) => setCurrentPayment(prev => ({...prev, cantidad: parseFloat(e.target.value) || 0}))}
                      required
                      placeholder="Ej: 50.00"
                      className="font-bold text-lg"
                    />
                    {selectedPlayer && currentPayment.tipo_pago === "Único" && cuotas && (
                      <p className="text-xs text-green-600">
                        ✓ Total temporada: {cuotas.total}€
                      </p>
                    )}
                    {selectedPlayer && currentPayment.tipo_pago === "Tres meses" && (
                      <p className="text-xs text-green-600">
                        ✓ Importe oficial: {getImportePorMes(selectedPlayer.deporte, currentPayment.mes)}€ 
                        (vence el {FECHAS_VENCIMIENTO[currentPayment.mes]})
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="metodo_pago">Método de Pago *</Label>
                    <Select
                      value={currentPayment.metodo_pago}
                      onValueChange={(value) => setCurrentPayment(prev => ({...prev, metodo_pago: value}))}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Transferencia">💳 Transferencia Bancaria</SelectItem>
                        {seasonConfig?.bizum_activo && (
                          <SelectItem value="Bizum">📱 Bizum</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="fecha_pago">Fecha del Pago *</Label>
                    <Input
                      type="date"
                      value={currentPayment.fecha_pago}
                      onChange={(e) => setCurrentPayment(prev => ({...prev, fecha_pago: e.target.value}))}
                      required
                    />
                  </div>
                </div>

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

                <div className="space-y-3 p-4 bg-orange-50 rounded-lg border-2 border-orange-200">
                  <Label htmlFor="justificante" className="text-base font-semibold text-orange-900">
                    📎 Justificante de Pago * (Obligatorio)
                  </Label>
                  <p className="text-sm text-orange-800">
                    Sube una captura o foto del justificante de pago
                  </p>
                  {currentPayment.metodo_pago === "Bizum" && seasonConfig?.bizum_telefono && (
                    <div className="bg-white rounded-lg p-3 border border-orange-300">
                      <p className="text-sm text-slate-900">
                        📱 <strong>Enviar Bizum al:</strong> {seasonConfig.bizum_telefono}
                      </p>
                      <p className="text-xs text-slate-600 mt-1">
                        Concepto: {selectedPlayer?.nombre} - {currentPayment.mes}
                      </p>
                    </div>
                  )}
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
                        onClick={() => setCurrentPayment(prev => ({...prev, justificante_url: ""}))}
                        className="bg-white"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  <input
                    id="file-upload"
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/heic,image/heif,application/pdf"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  {currentPayment.justificante_url ? (
                    <p className="text-sm text-green-600 font-medium">✓ Justificante subido correctamente</p>
                  ) : (
                    <p className="text-sm text-red-600 font-medium">⚠️ Debes subir el justificante para continuar</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notas">Notas Adicionales (opcional)</Label>
                  <Textarea
                    value={currentPayment.notas}
                    onChange={(e) => setCurrentPayment(prev => ({...prev, notas: e.target.value}))}
                    placeholder="Información adicional sobre el pago..."
                    rows={3}
                  />
                </div>

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
                    disabled={isSubmitting || !currentPayment.justificante_url || pagoUnicoPagado}
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
              </>
            )}
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}