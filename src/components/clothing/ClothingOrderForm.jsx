import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Upload, X, Loader2, AlertCircle, ShoppingBag, Info, Ruler } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { Alert, AlertDescription } from "@/components/ui/alert";

const TALLAS = [
  "Talla 6XS (4-5 años)", "Talla 5XS (5-6 años)", "Talla 4XS (7-8 años)",
  "Talla 3XS (9-10 años)", "Talla 2XS (11-12 años)", "Talla XS (12-14 años)",
  "Talla S", "Talla M", "Talla L", "Talla XL", "Talla XXL", "Talla 3XL"
];

const PRECIOS = {
  chaqueta: 35, pack: 41,
  camiseta_individual: 10, pantalon_individual: 17, sudadera_individual: 18,
  chubasquero: 20, anorak: 40, mochila: 22
};

const getCurrentSeason = () => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  return currentMonth >= 9 ? `${currentYear}/${currentYear + 1}` : `${currentYear - 1}/${currentYear}`;
};

export default function ClothingOrderForm({ players, onSubmit, onCancel, isSubmitting }) {
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [seasonConfig, setSeasonConfig] = useState(null);
  
  const [orderData, setOrderData] = useState({
    jugador_id: "", jugador_nombre: "", jugador_categoria: "", email_padre: "", telefono: "",
    chaqueta_partidos: false, chaqueta_talla: "",
    pack_entrenamiento: false, pack_camiseta_talla: "", pack_pantalon_talla: "", pack_sudadera_talla: "",
    camiseta_individual: false, camiseta_individual_talla: "",
    pantalon_individual: false, pantalon_individual_talla: "",
    sudadera_individual: false, sudadera_individual_talla: "",
    chubasquero: false, chubasquero_talla: "",
    anorak: false, anorak_talla: "",
    mochila: false,
    precio_total: 0, metodo_pago: "Transferencia", justificante_url: "", concepto_pago: "",
    fecha_pago: new Date().toISOString().split('T')[0],
    estado: "Pendiente", temporada: getCurrentSeason(), notas: ""
  });

  // Fetch season config for Bizum availability
  useEffect(() => {
    const fetchConfig = async () => {
      const configs = await base44.entities.SeasonConfig.list();
      const active = configs.find(c => c.activa === true);
      setSeasonConfig(active);
    };
    fetchConfig();
  }, []);

  const canOrderJacket = selectedPlayer && !selectedPlayer.deporte?.includes("Aficionado") && !selectedPlayer.deporte?.includes("Baloncesto");

  useEffect(() => {
    let total = 0;
    if (orderData.chaqueta_partidos) total += PRECIOS.chaqueta;
    if (orderData.pack_entrenamiento) total += PRECIOS.pack;
    if (orderData.camiseta_individual) total += PRECIOS.camiseta_individual;
    if (orderData.pantalon_individual) total += PRECIOS.pantalon_individual;
    if (orderData.sudadera_individual) total += PRECIOS.sudadera_individual;
    if (orderData.chubasquero) total += PRECIOS.chubasquero;
    if (orderData.anorak) total += PRECIOS.anorak;
    if (orderData.mochila) total += PRECIOS.mochila;
    
    setOrderData(prev => ({
      ...prev, precio_total: total,
      concepto_pago: `Pedido ropa ${selectedPlayer?.nombre || ''} - Temporada ${getCurrentSeason()}`
    }));
  }, [orderData.chaqueta_partidos, orderData.pack_entrenamiento, orderData.camiseta_individual,
      orderData.pantalon_individual, orderData.sudadera_individual, orderData.chubasquero,
      orderData.anorak, orderData.mochila, selectedPlayer]);

  const handlePlayerChange = (playerId) => {
    const player = players.find(p => p.id === playerId);
    if (player) {
      setSelectedPlayer(player);
      setOrderData({
        ...orderData, jugador_id: player.id, jugador_nombre: player.nombre,
        jugador_categoria: player.deporte, email_padre: player.email_padre,
        telefono: player.telefono, chaqueta_partidos: false, chaqueta_talla: "",
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
      setOrderData({ ...orderData, justificante_url: response.file_url });
      toast.success("Justificante subido correctamente");
    } catch (error) {
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

    const hasAnyProduct = orderData.chaqueta_partidos || orderData.pack_entrenamiento || 
      orderData.camiseta_individual || orderData.pantalon_individual || orderData.sudadera_individual || 
      orderData.chubasquero || orderData.anorak || orderData.mochila;

    if (!hasAnyProduct) {
      toast.error("Debes seleccionar al menos un producto");
      return;
    }

    // Validaciones de tallas
    if (orderData.chaqueta_partidos && !orderData.chaqueta_talla) return toast.error("Selecciona la talla de la chaqueta");
    if (orderData.pack_entrenamiento && (!orderData.pack_camiseta_talla || !orderData.pack_pantalon_talla || !orderData.pack_sudadera_talla)) {
      return toast.error("Selecciona todas las tallas del pack");
    }
    if (orderData.camiseta_individual && !orderData.camiseta_individual_talla) return toast.error("Selecciona la talla de la camiseta");
    if (orderData.pantalon_individual && !orderData.pantalon_individual_talla) return toast.error("Selecciona la talla del pantalón");
    if (orderData.sudadera_individual && !orderData.sudadera_individual_talla) return toast.error("Selecciona la talla de la sudadera");
    if (orderData.chubasquero && !orderData.chubasquero_talla) return toast.error("Selecciona la talla del chubasquero");
    if (orderData.anorak && !orderData.anorak_talla) return toast.error("Selecciona la talla del anorak");

    if (!orderData.justificante_url) {
      toast.error("Debes subir el justificante de transferencia");
      return;
    }

    try {
      let productsHTML = '';
      if (orderData.chaqueta_partidos) productsHTML += `<p>✅ <strong>Chaqueta de Partidos:</strong> ${orderData.chaqueta_talla} - ${PRECIOS.chaqueta}€</p>`;
      if (orderData.pack_entrenamiento) productsHTML += `<p>✅ <strong>Pack de Entrenamiento - ${PRECIOS.pack}€</strong></p><ul><li>Camiseta: ${orderData.pack_camiseta_talla}</li><li>Pantalón: ${orderData.pack_pantalon_talla}</li><li>Sudadera: ${orderData.pack_sudadera_talla}</li></ul>`;
      if (orderData.camiseta_individual) productsHTML += `<p>✅ <strong>Camiseta Individual (FUERA DEL PACK):</strong> ${orderData.camiseta_individual_talla} - ${PRECIOS.camiseta_individual}€</p>`;
      if (orderData.pantalon_individual) productsHTML += `<p>✅ <strong>Pantalón Individual (FUERA DEL PACK):</strong> ${orderData.pantalon_individual_talla} - ${PRECIOS.pantalon_individual}€</p>`;
      if (orderData.sudadera_individual) productsHTML += `<p>✅ <strong>Sudadera Individual (FUERA DEL PACK):</strong> ${orderData.sudadera_individual_talla} - ${PRECIOS.sudadera_individual}€</p>`;
      if (orderData.chubasquero) productsHTML += `<p>✅ <strong>Chubasquero (escudo bordado):</strong> ${orderData.chubasquero_talla} - ${PRECIOS.chubasquero}€</p>`;
      if (orderData.anorak) productsHTML += `<p>✅ <strong>Anorak:</strong> ${orderData.anorak_talla} - ${PRECIOS.anorak}€</p>`;
      if (orderData.mochila) productsHTML += `<p>✅ <strong>Mochila con botero (escudo vinilo):</strong> ${PRECIOS.mochila}€</p>`;

      // Send to club
      await base44.integrations.Core.SendEmail({
        from_name: "CD Bustarviejo - Sistema de Pedidos",
        to: "cdbustarviejo@gmail.com",
        subject: `Nuevo Pedido de Equipación - ${orderData.jugador_nombre}`,
        body: `<h2>Nuevo Pedido de Equipación</h2><p><strong>Jugador:</strong> ${orderData.jugador_nombre}</p><p><strong>Categoría:</strong> ${orderData.jugador_categoria}</p><p><strong>Email:</strong> ${orderData.email_padre}</p><p><strong>Teléfono:</strong> ${orderData.telefono}</p><hr><h3>Productos:</h3>${productsHTML}<hr><p><strong>Total:</strong> ${orderData.precio_total}€</p><p><strong>Concepto:</strong> ${orderData.concepto_pago}</p><p><strong>Fecha Pago:</strong> ${orderData.fecha_pago}</p><p><strong>Justificante:</strong> <a href="${orderData.justificante_url}">Ver</a></p>${orderData.notas ? `<p><strong>Notas:</strong> ${orderData.notas}</p>` : ''}<hr><p><strong>Temporada:</strong> ${orderData.temporada}</p>`
      });
      
      // Get player to send confirmation to both parents
      const player = players.find(p => p.id === orderData.jugador_id);
      
      // Send confirmation to parents
      const confirmBody = `
Estimados padres/tutores,

Confirmamos que hemos recibido su pedido de equipación para ${orderData.jugador_nombre}.

════════════════════════════════════════
🛍️ DETALLES DEL PEDIDO
════════════════════════════════════════
Jugador: ${orderData.jugador_nombre}
Categoría: ${orderData.jugador_categoria}
Total: ${orderData.precio_total}€
Estado: En revisión

Los pedidos se entregarán en las instalaciones del club durante la primera semana de Septiembre.

Atentamente,

CD Bustarviejo

════════════════════════════════════════
Datos de contacto:
════════════════════════════════════════
Email: cdbustarviejo@gmail.com
      `;
      
      if (player?.email_padre) {
        await base44.integrations.Core.SendEmail({
          from_name: "CD Bustarviejo",
          to: player.email_padre,
          subject: "Pedido de Equipación Recibido - CD Bustarviejo",
          body: confirmBody
        });
      }
      
      if (player?.email_tutor_2) {
        await base44.integrations.Core.SendEmail({
          from_name: "CD Bustarviejo",
          to: player.email_tutor_2,
          subject: "Pedido de Equipación Recibido - CD Bustarviejo",
          body: confirmBody
        });
      }
    } catch (error) {
      console.error("Error sending email:", error);
    }

    onSubmit(orderData);
  };

  const ProductCheckbox = ({ id, checked, onChange, label, price, talla, onTallaChange }) => (
    <div className="space-y-3 bg-white rounded-lg p-4 border-2 border-slate-200">
      <div className="flex items-center space-x-3">
        <Checkbox id={id} checked={checked} onCheckedChange={onChange} />
        <label htmlFor={id} className="font-semibold cursor-pointer flex-1">{label} - {price}€</label>
      </div>
      {checked && talla !== undefined && (
        <div className="ml-7 space-y-2">
          <Label>Talla *</Label>
          <Select value={talla} onValueChange={onTallaChange} required={checked}>
            <SelectTrigger><SelectValue placeholder="Selecciona una talla..." /></SelectTrigger>
            <SelectContent>
              {TALLAS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
      <Card className="border-none shadow-xl bg-white/90 backdrop-blur-sm">
        <CardHeader className="border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ShoppingBag className="w-6 h-6 text-orange-600" />
              <CardTitle className="text-2xl">Pedido de Equipación</CardTitle>
            </div>
            <Button variant="ghost" size="icon" onClick={onCancel}><X className="w-5 h-5" /></Button>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <Alert className="mb-6 bg-blue-50 border-blue-200">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              <strong>Importante:</strong> Realiza la transferencia y sube el justificante. Email: <strong>CDBUSTARVIEJO@GMAIL.COM</strong>
            </AlertDescription>
          </Alert>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label>Selecciona el Jugador *</Label>
              <Select value={orderData.jugador_id} onValueChange={handlePlayerChange} required>
                <SelectTrigger><SelectValue placeholder="Selecciona un jugador..." /></SelectTrigger>
                <SelectContent>
                  {players.filter(p => p.activo).map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.nombre} - {p.deporte}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedPlayer && (
              <>
                <div className="bg-slate-50 rounded-lg p-4 space-y-2 text-sm text-slate-600">
                  <p><strong>Categoría:</strong> {selectedPlayer.deporte}</p>
                  <p><strong>Email:</strong> {selectedPlayer.email_padre}</p>
                  <p><strong>Teléfono:</strong> {selectedPlayer.telefono}</p>
                </div>

                <div className="space-y-4 border-2 border-orange-200 rounded-lg p-6 bg-orange-50">
                  <h3 className="text-lg font-bold text-orange-900">Productos Disponibles</h3>

                  {canOrderJacket ? (
                    <ProductCheckbox
                      id="chaqueta"
                      checked={orderData.chaqueta_partidos}
                      onChange={(c) => setOrderData({...orderData, chaqueta_partidos: c, chaqueta_talla: ""})}
                      label="Chaqueta de Partidos"
                      price={PRECIOS.chaqueta}
                      talla={orderData.chaqueta_talla}
                      onTallaChange={(v) => setOrderData({...orderData, chaqueta_talla: v})}
                    />
                  ) : (
                    <Alert className="bg-orange-100 border-orange-300">
                      <AlertDescription className="text-orange-800 text-sm">
                        <strong>⚠️ Chaqueta no disponible</strong> para Aficionado y Baloncesto
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-3 bg-white rounded-lg p-4 border-2 border-green-300">
                    <div className="flex items-center space-x-3">
                      <Checkbox
                        id="pack"
                        checked={orderData.pack_entrenamiento}
                        onCheckedChange={(c) => setOrderData({...orderData, pack_entrenamiento: c, pack_camiseta_talla: "", pack_pantalon_talla: "", pack_sudadera_talla: ""})}
                      />
                      <label htmlFor="pack" className="font-semibold cursor-pointer flex-1">Pack de Entrenamiento - {PRECIOS.pack}€</label>
                    </div>
                    <Alert className="ml-7 bg-blue-50 border-blue-200">
                      <Info className="h-4 w-4 text-blue-600" />
                      <AlertDescription className="text-blue-800 text-sm">
                        <strong>El pack incluye:</strong> Camiseta + Pantalón + Sudadera<br/>
                        <span className="text-xs">Tallas independientes</span>
                      </AlertDescription>
                    </Alert>
                    {orderData.pack_entrenamiento && (
                      <div className="ml-7 space-y-4">
                        {['camiseta', 'pantalon', 'sudadera'].map(item => (
                          <div key={item} className="space-y-2 bg-slate-50 p-3 rounded-lg">
                            <Label>{item === 'camiseta' ? '👕' : item === 'pantalon' ? '👖' : '🧥'} Talla {item.charAt(0).toUpperCase() + item.slice(1)} *</Label>
                            <Select
                              value={orderData[`pack_${item}_talla`]}
                              onValueChange={(v) => setOrderData({...orderData, [`pack_${item}_talla`]: v})}
                              required
                            >
                              <SelectTrigger><SelectValue placeholder={`Talla ${item}...`} /></SelectTrigger>
                              <SelectContent>{TALLAS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                            </Select>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="border-t-2 border-orange-300 pt-4">
                    <h4 className="font-bold text-orange-900 mb-3">🛍️ Prendas Individuales (FUERA DEL PACK)</h4>
                    <div className="space-y-3">
                      <ProductCheckbox id="camiseta_ind" checked={orderData.camiseta_individual} onChange={(c) => setOrderData({...orderData, camiseta_individual: c, camiseta_individual_talla: ""})} label="Camiseta" price={PRECIOS.camiseta_individual} talla={orderData.camiseta_individual_talla} onTallaChange={(v) => setOrderData({...orderData, camiseta_individual_talla: v})} />
                      <ProductCheckbox id="pantalon_ind" checked={orderData.pantalon_individual} onChange={(c) => setOrderData({...orderData, pantalon_individual: c, pantalon_individual_talla: ""})} label="Pantalón" price={PRECIOS.pantalon_individual} talla={orderData.pantalon_individual_talla} onTallaChange={(v) => setOrderData({...orderData, pantalon_individual_talla: v})} />
                      <ProductCheckbox id="sudadera_ind" checked={orderData.sudadera_individual} onChange={(c) => setOrderData({...orderData, sudadera_individual: c, sudadera_individual_talla: ""})} label="Sudadera" price={PRECIOS.sudadera_individual} talla={orderData.sudadera_individual_talla} onTallaChange={(v) => setOrderData({...orderData, sudadera_individual_talla: v})} />
                    </div>
                  </div>

                  <div className="border-t-2 border-orange-300 pt-4">
                    <h4 className="font-bold text-orange-900 mb-3">🧥 Otras Prendas</h4>
                    <div className="space-y-3">
                      <ProductCheckbox id="chubasquero" checked={orderData.chubasquero} onChange={(c) => setOrderData({...orderData, chubasquero: c, chubasquero_talla: ""})} label="Chubasquero (escudo bordado)" price={PRECIOS.chubasquero} talla={orderData.chubasquero_talla} onTallaChange={(v) => setOrderData({...orderData, chubasquero_talla: v})} />
                      <ProductCheckbox id="anorak" checked={orderData.anorak} onChange={(c) => setOrderData({...orderData, anorak: c, anorak_talla: ""})} label="Anorak" price={PRECIOS.anorak} talla={orderData.anorak_talla} onTallaChange={(v) => setOrderData({...orderData, anorak_talla: v})} />
                      <div className="space-y-3 bg-white rounded-lg p-4 border-2 border-slate-200">
                        <div className="flex items-center space-x-3">
                          <Checkbox id="mochila" checked={orderData.mochila} onCheckedChange={(c) => setOrderData({...orderData, mochila: c})} />
                          <label htmlFor="mochila" className="font-semibold cursor-pointer flex-1">Mochila con botero (escudo vinilo) - {PRECIOS.mochila}€</label>
                        </div>
                      </div>
                    </div>
                  </div>

                  {orderData.precio_total > 0 && (
                    <div className="bg-green-50 border-2 border-green-300 rounded-lg p-4">
                      <p className="text-2xl font-bold text-green-900">Total: {orderData.precio_total}€</p>
                    </div>
                  )}
                </div>

                {orderData.precio_total > 0 && (
                  <>
                    <div className="space-y-4 border-2 border-blue-200 rounded-lg p-6 bg-blue-50">
                      <h3 className="text-lg font-bold text-blue-900">Información de Pago</h3>
                      <div className="space-y-2">
                        <Label>Método de Pago *</Label>
                        <Select
                          value={orderData.metodo_pago}
                          onValueChange={(value) => setOrderData({...orderData, metodo_pago: value})}
                          required
                        >
                          <SelectTrigger className="bg-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Transferencia">💳 Transferencia Bancaria</SelectItem>
                            {seasonConfig?.bizum_activo && (
                              <SelectItem value="Bizum">📱 Bizum</SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                        {orderData.metodo_pago === "Bizum" && seasonConfig?.bizum_telefono && (
                          <div className="bg-white rounded-lg p-3 border border-blue-300">
                            <p className="text-sm text-slate-900">
                              📱 <strong>Enviar Bizum al:</strong> {seasonConfig.bizum_telefono}
                            </p>
                            <p className="text-xs text-slate-600 mt-1">
                              Concepto: Pedido ropa {selectedPlayer?.nombre}
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>Concepto de Pago *</Label>
                        <Input value={orderData.concepto_pago} onChange={(e) => setOrderData({...orderData, concepto_pago: e.target.value})} required className="font-mono text-sm bg-white" />
                      </div>
                      <div className="space-y-2">
                        <Label>Fecha del Pago *</Label>
                        <Input type="date" value={orderData.fecha_pago} onChange={(e) => setOrderData({...orderData, fecha_pago: e.target.value})} required className="bg-white" />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-base font-semibold">Justificante de Pago *</Label>
                      <div className="flex gap-3">
                        <Button type="button" variant="outline" onClick={() => document.getElementById('file-upload').click()} disabled={uploadingFile} className="flex-1">
                          {uploadingFile ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Subiendo...</> : <><Upload className="w-4 h-4 mr-2" />{orderData.justificante_url ? "Cambiar" : "Subir"}</>}
                        </Button>
                        {orderData.justificante_url && <Button type="button" variant="outline" onClick={() => setOrderData({...orderData, justificante_url: ""})}><X className="w-4 h-4" /></Button>}
                      </div>
                      <input id="file-upload" type="file" accept="image/*,.pdf" onChange={handleFileUpload} className="hidden" />
                      {orderData.justificante_url ? <p className="text-sm text-green-600 font-medium">✓ Subido</p> : <p className="text-sm text-red-600 font-medium">⚠️ Obligatorio</p>}
                    </div>

                    <div className="space-y-2">
                      <Label>Notas (opcional)</Label>
                      <Textarea value={orderData.notas} onChange={(e) => setOrderData({...orderData, notas: e.target.value})} placeholder="Información adicional..." rows={3} />
                    </div>
                  </>
                )}
              </>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>Cancelar</Button>
              <Button type="submit" className="bg-orange-600 hover:bg-orange-700" disabled={isSubmitting || !orderData.justificante_url || orderData.precio_total === 0}>
                {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Enviando...</> : "Confirmar Pedido"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}