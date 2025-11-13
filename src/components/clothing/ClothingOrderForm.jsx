import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Upload, X, Loader2, AlertCircle, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Tallas disponibles
const TALLAS = [
  "Talla 6XS (4-5 años)",
  "Talla 5XS (5-6 años)",
  "Talla 4XS (7-8 años)",
  "Talla 3XS (9-10 años)",
  "Talla 2XS (11-12 años)",
  "Talla XS (12-14 años)",
  "Talla S",
  "Talla M",
  "Talla L",
  "Talla XL",
  "Talla XXL",
  "Talla 3XL"
];

// Precios (ajustar según necesidad)
const PRECIO_CHAQUETA = 35;
const PRECIO_PACK_ENTRENAMIENTO = 45;

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

export default function ClothingOrderForm({ players, onSubmit, onCancel, isSubmitting }) {
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  
  const [orderData, setOrderData] = useState({
    jugador_id: "",
    jugador_nombre: "",
    jugador_categoria: "",
    email_padre: "",
    telefono: "",
    chaqueta_partidos: false,
    chaqueta_talla: "",
    pack_entrenamiento: false,
    pack_talla: "",
    precio_total: 0,
    metodo_pago: "Transferencia",
    justificante_url: "",
    concepto_pago: "",
    fecha_pago: new Date().toISOString().split('T')[0],
    estado: "Pendiente",
    temporada: getCurrentSeason(),
    notas: ""
  });

  // Verificar si el jugador puede pedir chaqueta (no Aficionado ni Baloncesto)
  const canOrderJacket = selectedPlayer && 
    !selectedPlayer.deporte?.includes("Aficionado") && 
    !selectedPlayer.deporte?.includes("Baloncesto");

  // Calcular precio total
  useEffect(() => {
    let total = 0;
    if (orderData.chaqueta_partidos) total += PRECIO_CHAQUETA;
    if (orderData.pack_entrenamiento) total += PRECIO_PACK_ENTRENAMIENTO;
    
    setOrderData(prev => ({
      ...prev,
      precio_total: total,
      concepto_pago: `Pedido ropa ${selectedPlayer?.nombre || ''} - Temporada ${getCurrentSeason()}`
    }));
  }, [orderData.chaqueta_partidos, orderData.pack_entrenamiento, selectedPlayer]);

  const handlePlayerChange = (playerId) => {
    const player = players.find(p => p.id === playerId);
    if (player) {
      setSelectedPlayer(player);
      setOrderData({
        ...orderData,
        jugador_id: player.id,
        jugador_nombre: player.nombre,
        jugador_categoria: player.deporte,
        email_padre: player.email_padre,
        telefono: player.telefono,
        // Si no puede pedir chaqueta, desmarcarla
        chaqueta_partidos: false,
        chaqueta_talla: "",
        concepto_pago: `Pedido ropa ${player.nombre} - Temporada ${getCurrentSeason()}`
      });
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    try {
      const response = await base44.integrations.Core.UploadFile({ file });
      setOrderData({
        ...orderData,
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!orderData.jugador_id) {
      toast.error("Selecciona un jugador");
      return;
    }

    if (!orderData.chaqueta_partidos && !orderData.pack_entrenamiento) {
      toast.error("Debes seleccionar al menos un producto");
      return;
    }

    if (orderData.chaqueta_partidos && !orderData.chaqueta_talla) {
      toast.error("Selecciona la talla de la chaqueta");
      return;
    }

    if (orderData.pack_entrenamiento && !orderData.pack_talla) {
      toast.error("Selecciona la talla del pack de entrenamiento");
      return;
    }

    if (!orderData.justificante_url) {
      toast.error("Debes subir el justificante de transferencia");
      return;
    }

    // Enviar email de notificación al club
    try {
      await base44.integrations.Core.SendEmail({
        to: "CDBUSTARVIEJO@GMAIL.COM",
        subject: `Nuevo Pedido de Ropa - ${orderData.jugador_nombre}`,
        body: `
          <h2>Nuevo Pedido de Ropa Recibido</h2>
          <p><strong>Jugador:</strong> ${orderData.jugador_nombre}</p>
          <p><strong>Categoría:</strong> ${orderData.jugador_categoria}</p>
          <p><strong>Email Padre/Tutor:</strong> ${orderData.email_padre}</p>
          <p><strong>Teléfono:</strong> ${orderData.telefono}</p>
          <hr>
          <h3>Productos Solicitados:</h3>
          ${orderData.chaqueta_partidos ? `<p>✅ <strong>Chaqueta de Partidos:</strong> ${orderData.chaqueta_talla}</p>` : ''}
          ${orderData.pack_entrenamiento ? `<p>✅ <strong>Pack de Entrenamiento:</strong> ${orderData.pack_talla}</p>` : ''}
          <hr>
          <p><strong>Precio Total:</strong> ${orderData.precio_total}€</p>
          <p><strong>Concepto Pago:</strong> ${orderData.concepto_pago}</p>
          <p><strong>Fecha de Pago:</strong> ${orderData.fecha_pago}</p>
          <p><strong>Justificante:</strong> <a href="${orderData.justificante_url}">Ver justificante</a></p>
          ${orderData.notas ? `<p><strong>Notas:</strong> ${orderData.notas}</p>` : ''}
          <hr>
          <p><strong>Temporada:</strong> ${orderData.temporada}</p>
          <p style="font-size: 12px; color: #666;">Pedido registrado el ${new Date().toLocaleString('es-ES')}</p>
        `
      });
    } catch (error) {
      console.error("Error sending email:", error);
    }

    onSubmit(orderData);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <Card className="border-none shadow-xl bg-white/90 backdrop-blur-sm">
        <CardHeader className="border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ShoppingBag className="w-6 h-6 text-orange-600" />
              <CardTitle className="text-2xl">Pedido de Equipación</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onCancel}
              className="hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <Alert className="mb-6 bg-blue-50 border-blue-200">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              <strong>Importante:</strong> Realiza la transferencia bancaria con el concepto indicado y sube el justificante. 
              El pedido se procesará una vez verificado el pago. Email del club: <strong>CDBUSTARVIEJO@GMAIL.COM</strong>
            </AlertDescription>
          </Alert>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Selector de Jugador */}
            <div className="space-y-2">
              <Label htmlFor="jugador">Selecciona el Jugador *</Label>
              <Select
                value={orderData.jugador_id}
                onValueChange={handlePlayerChange}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un jugador..." />
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

            {selectedPlayer && (
              <>
                {/* Info del jugador */}
                <div className="bg-slate-50 rounded-lg p-4 space-y-2">
                  <p className="text-sm text-slate-600">
                    <strong>Categoría:</strong> {selectedPlayer.deporte}
                  </p>
                  <p className="text-sm text-slate-600">
                    <strong>Email:</strong> {selectedPlayer.email_padre}
                  </p>
                  <p className="text-sm text-slate-600">
                    <strong>Teléfono:</strong> {selectedPlayer.telefono}
                  </p>
                </div>

                {/* Productos */}
                <div className="space-y-4 border-2 border-orange-200 rounded-lg p-6 bg-orange-50">
                  <h3 className="text-lg font-bold text-orange-900 flex items-center gap-2">
                    <ShoppingBag className="w-5 h-5" />
                    Productos Disponibles
                  </h3>

                  {/* Chaqueta de Partidos */}
                  {canOrderJacket ? (
                    <div className="space-y-3 bg-white rounded-lg p-4">
                      <div className="flex items-center space-x-3">
                        <Checkbox
                          id="chaqueta"
                          checked={orderData.chaqueta_partidos}
                          onCheckedChange={(checked) => 
                            setOrderData({...orderData, chaqueta_partidos: checked, chaqueta_talla: ""})
                          }
                        />
                        <label htmlFor="chaqueta" className="font-semibold cursor-pointer flex-1">
                          Chaqueta de Partidos - {PRECIO_CHAQUETA}€
                        </label>
                      </div>
                      {orderData.chaqueta_partidos && (
                        <div className="ml-7 space-y-2">
                          <Label htmlFor="chaqueta_talla">Talla de la Chaqueta *</Label>
                          <Select
                            value={orderData.chaqueta_talla}
                            onValueChange={(value) => setOrderData({...orderData, chaqueta_talla: value})}
                            required={orderData.chaqueta_partidos}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecciona una talla..." />
                            </SelectTrigger>
                            <SelectContent>
                              {TALLAS.map(talla => (
                                <SelectItem key={talla} value={talla}>
                                  {talla}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  ) : (
                    <Alert className="bg-orange-100 border-orange-300">
                      <AlertCircle className="h-4 w-4 text-orange-600" />
                      <AlertDescription className="text-orange-800 text-sm">
                        <strong>⚠️ Chaqueta no disponible</strong> para equipos Aficionado y Baloncesto.
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Pack de Entrenamiento */}
                  <div className="space-y-3 bg-white rounded-lg p-4">
                    <div className="flex items-center space-x-3">
                      <Checkbox
                        id="pack"
                        checked={orderData.pack_entrenamiento}
                        onCheckedChange={(checked) => 
                          setOrderData({...orderData, pack_entrenamiento: checked, pack_talla: ""})
                        }
                      />
                      <label htmlFor="pack" className="font-semibold cursor-pointer flex-1">
                        Pack de Entrenamiento - {PRECIO_PACK_ENTRENAMIENTO}€
                      </label>
                    </div>
                    {orderData.pack_entrenamiento && (
                      <div className="ml-7 space-y-2">
                        <Label htmlFor="pack_talla">Talla del Pack *</Label>
                        <Select
                          value={orderData.pack_talla}
                          onValueChange={(value) => setOrderData({...orderData, pack_talla: value})}
                          required={orderData.pack_entrenamiento}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona una talla..." />
                          </SelectTrigger>
                          <SelectContent>
                            {TALLAS.map(talla => (
                              <SelectItem key={talla} value={talla}>
                                {talla}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  {/* Total */}
                  {orderData.precio_total > 0 && (
                    <div className="bg-green-50 border-2 border-green-300 rounded-lg p-4">
                      <p className="text-2xl font-bold text-green-900">
                        Total: {orderData.precio_total}€
                      </p>
                    </div>
                  )}
                </div>

                {/* Datos de Pago */}
                {orderData.precio_total > 0 && (
                  <>
                    <div className="space-y-4 border-2 border-blue-200 rounded-lg p-6 bg-blue-50">
                      <h3 className="text-lg font-bold text-blue-900">Información de Pago</h3>
                      
                      {/* Concepto */}
                      <div className="space-y-2">
                        <Label htmlFor="concepto">Concepto de la Transferencia *</Label>
                        <Input
                          id="concepto"
                          value={orderData.concepto_pago}
                          onChange={(e) => setOrderData({...orderData, concepto_pago: e.target.value})}
                          required
                          className="font-mono text-sm"
                        />
                        <p className="text-xs text-blue-600">
                          Usa este concepto exacto en tu transferencia
                        </p>
                      </div>

                      {/* Fecha de Pago */}
                      <div className="space-y-2">
                        <Label htmlFor="fecha_pago">Fecha del Pago *</Label>
                        <Input
                          id="fecha_pago"
                          type="date"
                          value={orderData.fecha_pago}
                          onChange={(e) => setOrderData({...orderData, fecha_pago: e.target.value})}
                          required
                        />
                      </div>
                    </div>

                    {/* Justificante */}
                    <div className="space-y-2">
                      <Label htmlFor="justificante" className="text-base font-semibold">
                        Justificante de Transferencia * (Obligatorio)
                      </Label>
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
                              {orderData.justificante_url ? "Cambiar justificante" : "Subir justificante"}
                            </>
                          )}
                        </Button>
                        {orderData.justificante_url && (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setOrderData({...orderData, justificante_url: ""})}
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
                      {orderData.justificante_url ? (
                        <p className="text-sm text-green-600 font-medium">✓ Justificante subido correctamente</p>
                      ) : (
                        <p className="text-sm text-red-600 font-medium">⚠️ Debes subir el justificante para continuar</p>
                      )}
                    </div>

                    {/* Notas */}
                    <div className="space-y-2">
                      <Label htmlFor="notas">Notas Adicionales (opcional)</Label>
                      <Textarea
                        id="notas"
                        value={orderData.notas}
                        onChange={(e) => setOrderData({...orderData, notas: e.target.value})}
                        placeholder="Información adicional sobre el pedido..."
                        rows={3}
                      />
                    </div>
                  </>
                )}
              </>
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
                disabled={isSubmitting || !orderData.justificante_url || orderData.precio_total === 0}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Enviando Pedido...
                  </>
                ) : (
                  "Confirmar Pedido"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}