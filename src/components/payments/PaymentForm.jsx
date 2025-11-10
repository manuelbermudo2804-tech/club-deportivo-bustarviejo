import React, { useState } from "react";
import { motion } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Upload, FileText, X } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Función para obtener la temporada actual
const getCurrentSeason = () => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  
  if (currentMonth <= 8) {
    return `${currentYear - 1}-${currentYear}`;
  }
  return `${currentYear}-${currentYear + 1}`;
};

// Generar lista de temporadas
const getSeasonOptions = () => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const seasons = [];
  
  for (let i = -1; i <= 3; i++) {
    const startYear = currentYear + i;
    seasons.push(`${startYear}-${startYear + 1}`);
  }
  
  return seasons;
};

// Función para generar recordatorios automáticos
const generateReminders = async (payment, playerEmail) => {
  const mesMap = {
    "Septiembre": 9,
    "Noviembre": 11,
    "Diciembre": 12
  };
  
  const month = mesMap[payment.mes];
  const year = parseInt(payment.temporada.split('-')[0]); // Primer año de la temporada
  
  // Fecha de vencimiento: día 30 del mes
  const vencimiento = new Date(year, month - 1, 30);
  
  // 7 días antes del vencimiento
  const sieteAntes = new Date(vencimiento);
  sieteAntes.setDate(vencimiento.getDate() - 7);
  
  // Día del vencimiento
  const diaVencimiento = new Date(vencimiento);
  
  // 3 días después del vencimiento
  const tresDespues = new Date(vencimiento);
  tresDespues.setDate(vencimiento.getDate() + 3);
  
  const recordatorios = [
    {
      pago_id: payment.id,
      jugador_id: payment.jugador_id,
      jugador_nombre: payment.jugador_nombre,
      email_padre: playerEmail,
      tipo_recordatorio: "7 días antes",
      fecha_envio: sieteAntes.toISOString().split('T')[0],
      enviado: false,
      mes_pago: payment.mes,
      temporada: payment.temporada,
      cantidad: payment.cantidad
    },
    {
      pago_id: payment.id,
      jugador_id: payment.jugador_id,
      jugador_nombre: payment.jugador_nombre,
      email_padre: playerEmail,
      tipo_recordatorio: "Día de vencimiento",
      fecha_envio: diaVencimiento.toISOString().split('T')[0],
      enviado: false,
      mes_pago: payment.mes,
      temporada: payment.temporada,
      cantidad: payment.cantidad
    },
    {
      pago_id: payment.id,
      jugador_id: payment.jugador_id,
      jugador_nombre: payment.jugador_nombre,
      email_padre: playerEmail,
      tipo_recordatorio: "Después del vencimiento",
      fecha_envio: tresDespues.toISOString().split('T')[0],
      enviado: false,
      mes_pago: payment.mes,
      temporada: payment.temporada,
      cantidad: payment.cantidad
    }
  ];
  
  // Crear los recordatorios en la base de datos
  for (const recordatorio of recordatorios) {
    await base44.entities.Reminder.create(recordatorio);
  }
};

export default function PaymentForm({ payment, players, onSubmit, onCancel, isSubmitting }) {
  const [formData, setFormData] = useState(payment || {
    jugador_id: "",
    jugador_nombre: "",
    tipo_pago: "Único",
    mes: "Septiembre",
    temporada: getCurrentSeason(),
    cantidad: 90,
    estado: "Pendiente",
    metodo_pago: "",
    justificante_url: "",
    fecha_pago: "",
    notas: ""
  });

  const [uploadingFile, setUploadingFile] = useState(false);

  const handleChange = (field, value) => {
    let updates = { [field]: value };
    
    if (field === "jugador_id") {
      const selectedPlayer = players.find(p => p.id === value);
      if (selectedPlayer) {
        updates.jugador_nombre = selectedPlayer.nombre;
      }
    }

    if (field === "tipo_pago") {
      if (value === "Único") {
        updates.cantidad = 90;
      } else if (value === "Tres meses") {
        updates.cantidad = 30;
      }
    }
    
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      handleChange("justificante_url", file_url);
    } catch (error) {
      console.error("Error uploading file:", error);
    }
    setUploadingFile(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Si es pago en tres meses y no es una edición, crear 3 pagos con recordatorios
    if (formData.tipo_pago === "Tres meses" && !payment) {
      const mesesPago = ["Septiembre", "Noviembre", "Diciembre"];
      const selectedPlayer = players.find(p => p.id === formData.jugador_id);
      const playerEmail = selectedPlayer?.email_padre || selectedPlayer?.email;
      
      for (const mes of mesesPago) {
        const pagoData = {
          ...formData,
          mes: mes,
          cantidad: 30
        };
        
        // Crear el pago
        const nuevoPago = await base44.entities.Payment.create(pagoData);
        
        // Generar recordatorios automáticos si hay email
        if (playerEmail && nuevoPago.id) {
          await generateReminders({ ...nuevoPago, id: nuevoPago.id }, playerEmail);
        }
      }
      
      onSubmit(null);
    } else {
      onSubmit(formData);
    }
  };

  const months = ["Septiembre", "Noviembre", "Diciembre"];
  const seasonOptions = getSeasonOptions();

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <Card className="border-none shadow-xl bg-white">
        <CardHeader className="border-b border-slate-100">
          <CardTitle className="text-2xl">
            {payment ? "Editar Pago" : "Registrar Nuevo Pago"}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {formData.tipo_pago === "Tres meses" && !payment && (
              <Alert className="bg-orange-50 border-orange-200">
                <AlertDescription className="text-orange-800">
                  Se crearán automáticamente 3 pagos de 30€ para los meses de Septiembre, Noviembre y Diciembre, con recordatorios automáticos por email.
                </AlertDescription>
              </Alert>
            )}

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="jugador_id">Jugador *</Label>
                <Select
                  value={formData.jugador_id}
                  onValueChange={(value) => handleChange("jugador_id", value)}
                  required
                  disabled={!!payment}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona jugador" />
                  </SelectTrigger>
                  <SelectContent>
                    {players.filter(p => p.activo).map((player) => (
                      <SelectItem key={player.id} value={player.id}>
                        {player.nombre} - {player.categoria}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tipo_pago">Tipo de Pago *</Label>
                <Select
                  value={formData.tipo_pago}
                  onValueChange={(value) => handleChange("tipo_pago", value)}
                  required
                  disabled={!!payment}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Único">Pago Único (90€)</SelectItem>
                    <SelectItem value="Tres meses">Tres Meses (30€ x 3)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(formData.tipo_pago === "Único" || payment) && (
                <div className="space-y-2">
                  <Label htmlFor="mes">Mes *</Label>
                  <Select
                    value={formData.mes}
                    onValueChange={(value) => handleChange("mes", value)}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona mes" />
                    </SelectTrigger>
                    <SelectContent>
                      {months.map((month) => (
                        <SelectItem key={month} value={month}>
                          {month}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="temporada">Temporada *</Label>
                <Select
                  value={formData.temporada}
                  onValueChange={(value) => handleChange("temporada", value)}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona temporada" />
                  </SelectTrigger>
                  <SelectContent>
                    {seasonOptions.map((season) => (
                      <SelectItem key={season} value={season}>
                        {season}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cantidad">Cantidad (€) *</Label>
                <Input
                  id="cantidad"
                  type="number"
                  step="0.01"
                  value={formData.cantidad}
                  onChange={(e) => handleChange("cantidad", parseFloat(e.target.value))}
                  required
                  min="0"
                  disabled={!payment}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="metodo_pago">Método de Pago</Label>
                <Select
                  value={formData.metodo_pago}
                  onValueChange={(value) => handleChange("metodo_pago", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona método" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Bizum">Bizum</SelectItem>
                    <SelectItem value="Transferencia">Transferencia</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fecha_pago">Fecha de Pago</Label>
                <Input
                  id="fecha_pago"
                  type="date"
                  value={formData.fecha_pago}
                  onChange={(e) => handleChange("fecha_pago", e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Justificante de Pago</Label>
              <div className="flex items-center gap-3">
                {formData.justificante_url ? (
                  <div className="flex items-center gap-2 flex-1">
                    <a 
                      href={formData.justificante_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors flex-1"
                    >
                      <FileText className="w-4 h-4 text-slate-600" />
                      <span className="text-sm text-slate-700 truncate">Ver justificante</span>
                    </a>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleChange("justificante_url", "")}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="justificante-upload"
                      disabled={uploadingFile}
                    />
                    <label htmlFor="justificante-upload" className="flex-1">
                      <Button
                        type="button"
                        variant="outline"
                        disabled={uploadingFile}
                        className="w-full"
                        onClick={() => document.getElementById('justificante-upload').click()}
                      >
                        {uploadingFile ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Subiendo...
                          </>
                        ) : (
                          <>
                            <Upload className="w-4 h-4 mr-2" />
                            Subir Justificante
                          </>
                        )}
                      </Button>
                    </label>
                  </>
                )}
              </div>
              <p className="text-xs text-slate-500">
                Sube una imagen o PDF del comprobante de pago (Bizum o transferencia)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notas">Notas</Label>
              <Textarea
                id="notas"
                value={formData.notas}
                onChange={(e) => handleChange("notas", e.target.value)}
                placeholder="Observaciones sobre el pago..."
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
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
                disabled={isSubmitting || uploadingFile}
                className="bg-orange-600 hover:bg-orange-700"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  payment ? "Actualizar" : "Registrar Pago"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}