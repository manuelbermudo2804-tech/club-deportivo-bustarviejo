import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Upload, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";

// Función para obtener la temporada actual
const getCurrentSeason = () => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  
  // Si estamos entre enero y agosto, la temporada es año anterior/año actual
  if (currentMonth <= 8) {
    return `${currentYear - 1}/${currentYear}`;
  }
  // Si estamos entre septiembre y diciembre, la temporada es año actual/año siguiente
  return `${currentYear}/${currentYear + 1}`;
};

// Generar opciones de temporadas
const generateSeasonOptions = () => {
  const currentYear = new Date().getFullYear();
  const seasons = [];
  for (let i = -1; i <= 2; i++) {
    const year = currentYear + i;
    seasons.push(`${year}/${year + 1}`);
  }
  return seasons;
};

// Función para crear recordatorios automáticos
const createReminders = async (payment, playerEmail) => {
  if (!playerEmail) return;
  
  const currentYear = new Date().getFullYear();
  const seasonStartYear = parseInt(payment.temporada.split('/')[0]);
  
  // Mapeo de meses a números y fechas de vencimiento
  const monthMap = {
    'Junio': { month: 6, day: 30, year: seasonStartYear },
    'Septiembre': { month: 9, day: 30, year: seasonStartYear },
    'Diciembre': { month: 12, day: 30, year: seasonStartYear }
  };
  
  const paymentMonth = monthMap[payment.mes];
  if (!paymentMonth) return;
  
  const dueDate = new Date(paymentMonth.year, paymentMonth.month - 1, paymentMonth.day);
  
  // Recordatorio 7 días antes
  const reminder7Days = new Date(dueDate);
  reminder7Days.setDate(reminder7Days.getDate() - 7);
  
  // Recordatorio el día de vencimiento
  const reminderDueDay = new Date(dueDate);
  
  // Recordatorio después del vencimiento
  const reminderAfterDue = new Date(dueDate);
  reminderAfterDue.setDate(reminderAfterDue.getDate() + 7);
  
  const reminders = [
    {
      pago_id: payment.id,
      jugador_id: payment.jugador_id,
      jugador_nombre: payment.jugador_nombre,
      email_padre: playerEmail,
      tipo_recordatorio: "7 días antes",
      fecha_envio: reminder7Days.toISOString().split('T')[0],
      mes_pago: payment.mes,
      temporada: payment.temporada,
      cantidad: payment.cantidad,
      enviado: false
    },
    {
      pago_id: payment.id,
      jugador_id: payment.jugador_id,
      jugador_nombre: payment.jugador_nombre,
      email_padre: playerEmail,
      tipo_recordatorio: "Día de vencimiento",
      fecha_envio: reminderDueDay.toISOString().split('T')[0],
      mes_pago: payment.mes,
      temporada: payment.temporada,
      cantidad: payment.cantidad,
      enviado: false
    },
    {
      pago_id: payment.id,
      jugador_id: payment.jugador_id,
      jugador_nombre: payment.jugador_nombre,
      email_padre: playerEmail,
      tipo_recordatorio: "Después del vencimiento",
      fecha_envio: reminderAfterDue.toISOString().split('T')[0],
      mes_pago: payment.mes,
      temporada: payment.temporada,
      cantidad: payment.cantidad,
      enviado: false
    }
  ];
  
  for (const reminder of reminders) {
    try {
      await base44.entities.Reminder.create(reminder);
    } catch (error) {
      console.error("Error creating reminder:", error);
    }
  }
};

export default function PaymentForm({ payment, players, onSubmit, onCancel, isSubmitting }) {
  const currentSeason = getCurrentSeason();
  const [currentPayment, setCurrentPayment] = useState(payment || {
    jugador_id: "",
    jugador_nombre: "",
    tipo_pago: "Único",
    mes: "Junio",
    temporada: currentSeason,
    cantidad: 0,
    estado: "Pendiente",
    metodo_pago: "Bizum",
    justificante_url: "",
    fecha_pago: "",
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

  const handlePlayerChange = (playerId) => {
    const player = players.find(p => p.id === playerId);
    if (player) {
      setSelectedPlayer(player);
      setCurrentPayment({
        ...currentPayment,
        jugador_id: player.id,
        jugador_nombre: player.nombre
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
      toast.success("Archivo subido correctamente");
    } catch (error) {
      console.error("Error uploading file:", error);
      toast.error("Error al subir el archivo");
    } finally {
      setUploadingFile(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!currentPayment.jugador_id) {
      toast.error("Selecciona un jugador");
      return;
    }

    // Si es tipo "Tres meses", crear tres pagos
    if (currentPayment.tipo_pago === "Tres meses") {
      const months = ["Junio", "Septiembre", "Diciembre"];
      const cantidadPorMes = currentPayment.cantidad;
      
      for (const mes of months) {
        const paymentData = {
          ...currentPayment,
          mes: mes,
          cantidad: cantidadPorMes
        };
        
        try {
          const createdPayment = await base44.entities.Payment.create(paymentData);
          
          // Crear recordatorios para este pago
          if (selectedPlayer?.email_padre) {
            await createReminders(createdPayment, selectedPlayer.email_padre);
          }
        } catch (error) {
          console.error(`Error creating payment for ${mes}:`, error);
          toast.error(`Error al crear el pago de ${mes}`);
        }
      }
      
      toast.success("Pagos de los tres meses creados correctamente");
      onCancel();
    } else {
      // Pago único
      try {
        const createdPayment = await base44.entities.Payment.create(currentPayment);
        
        // Crear recordatorios
        if (selectedPlayer?.email_padre) {
          await createReminders(createdPayment, selectedPlayer.email_padre);
        }
        
        onSubmit(currentPayment);
      } catch (error) {
        console.error("Error creating payment:", error);
        toast.error("Error al crear el pago");
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <Card className="border-none shadow-xl bg-white/90 backdrop-blur-sm">
        <CardHeader className="border-b border-slate-100">
          <CardTitle className="text-2xl">
            {payment ? "Editar Pago" : "Registrar Nuevo Pago"}
          </CardTitle>
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
                          {player.nombre} - {player.categoria}
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
                  onValueChange={(value) => setCurrentPayment({...currentPayment, tipo_pago: value})}
                  required
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Único">Pago Único</SelectItem>
                    <SelectItem value="Tres meses">Tres Pagos (Junio, Sept, Dic)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Mes */}
              {currentPayment.tipo_pago !== "Tres meses" && (
                <div className="space-y-2">
                  <Label htmlFor="mes">Mes del Pago *</Label>
                  <Select
                    value={currentPayment.mes}
                    onValueChange={(value) => setCurrentPayment({...currentPayment, mes: value})}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Junio">Junio</SelectItem>
                      <SelectItem value="Septiembre">Septiembre</SelectItem>
                      <SelectItem value="Diciembre">Diciembre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Temporada */}
              <div className="space-y-2">
                <Label htmlFor="temporada">Temporada *</Label>
                <Select
                  value={currentPayment.temporada}
                  onValueChange={(value) => setCurrentPayment({...currentPayment, temporada: value})}
                  required
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {generateSeasonOptions().map(season => (
                      <SelectItem key={season} value={season}>
                        Temporada {season}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Cantidad */}
              <div className="space-y-2">
                <Label htmlFor="cantidad">
                  Cantidad (€) *
                  {currentPayment.tipo_pago === "Tres meses" && (
                    <span className="text-xs text-slate-500 ml-2">
                      (cantidad por cada mes)
                    </span>
                  )}
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  value={currentPayment.cantidad}
                  onChange={(e) => setCurrentPayment({...currentPayment, cantidad: parseFloat(e.target.value) || 0})}
                  required
                  placeholder="Ej: 50.00"
                />
              </div>

              {/* Estado */}
              <div className="space-y-2">
                <Label htmlFor="estado">Estado *</Label>
                <Select
                  value={currentPayment.estado}
                  onValueChange={(value) => setCurrentPayment({...currentPayment, estado: value})}
                  required
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pendiente">Pendiente</SelectItem>
                    <SelectItem value="En revisión">En Revisión</SelectItem>
                    <SelectItem value="Pagado">Pagado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Método de Pago */}
              <div className="space-y-2">
                <Label htmlFor="metodo_pago">Método de Pago</Label>
                <Select
                  value={currentPayment.metodo_pago}
                  onValueChange={(value) => setCurrentPayment({...currentPayment, metodo_pago: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Bizum">Bizum</SelectItem>
                    <SelectItem value="Transferencia">Transferencia</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Fecha de Pago */}
              <div className="space-y-2">
                <Label htmlFor="fecha_pago">Fecha de Pago</Label>
                <Input
                  type="date"
                  value={currentPayment.fecha_pago}
                  onChange={(e) => setCurrentPayment({...currentPayment, fecha_pago: e.target.value})}
                />
              </div>
            </div>

            {/* Justificante */}
            <div className="space-y-2">
              <Label htmlFor="justificante">Justificante de Pago</Label>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById('file-upload').click()}
                  disabled={uploadingFile}
                  className="flex-1"
                >
                  {uploadingFile ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Subiendo...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      {currentPayment.justificante_url ? "Cambiar archivo" : "Subir archivo"}
                    </>
                  )}
                </Button>
                {currentPayment.justificante_url && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCurrentPayment({...currentPayment, justificante_url: ""})}
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
              {currentPayment.justificante_url && (
                <p className="text-sm text-green-600">✓ Archivo subido correctamente</p>
              )}
            </div>

            {/* Notas */}
            <div className="space-y-2">
              <Label htmlFor="notas">Notas Adicionales</Label>
              <Textarea
                value={currentPayment.notas}
                onChange={(e) => setCurrentPayment({...currentPayment, notas: e.target.value})}
                placeholder="Añade cualquier información adicional..."
                rows={3}
              />
            </div>

            {/* Info sobre tipo de pago */}
            {currentPayment.tipo_pago === "Tres meses" && (
              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                <p className="text-sm text-blue-800">
                  ℹ️ Se crearán 3 pagos automáticamente para los meses de <strong>Junio, Septiembre y Diciembre</strong> con la cantidad especificada para cada uno.
                </p>
              </div>
            )}

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
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  payment ? "Actualizar Pago" : "Registrar Pago"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}