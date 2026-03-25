import React, { useState, useEffect, useMemo } from "react";
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
import { useQuery } from "@tanstack/react-query";

const TALLAS = [
  "Talla 6XS (4-5 años)", "Talla 5XS (5-6 años)", "Talla 4XS (7-8 años)",
  "Talla 3XS (9-10 años)", "Talla 2XS (11-12 años)", "Talla XS (12-14 años)",
  "Talla S", "Talla M", "Talla L", "Talla XL", "Talla XXL", "Talla 3XL"
];

// Precios por defecto (se sobreescriben con SeasonConfig si están configurados)
const DEFAULT_PRECIOS = {
  chaqueta_partidos: 35, 
  pack_entrenamiento: 41,
  camiseta_individual: 10, 
  pantalon_individual: 17, 
  sudadera_individual: 18,
  chubasquero: 20, 
  anorak: 40, 
  mochila: 22
};

const getCurrentSeason = () => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  return currentMonth >= 9 ? `${currentYear}/${currentYear + 1}` : `${currentYear - 1}/${currentYear}`;
};

export default function ClothingOrderForm({ players, onSubmit, onCancel, isSubmitting, userCredit = 0, onCreditUsed }) {
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [useCredit, setUseCredit] = useState(userCredit > 0); // Auto-activar si tiene crédito
  const [creditToUse, setCreditToUse] = useState(0);

  // Obtener SeasonConfig con react-query para que se actualice automáticamente
  const { data: seasonConfig } = useQuery({
    queryKey: ['seasonConfig'],
    queryFn: async () => {
      const configs = await base44.entities.SeasonConfig.list();
      return configs.find(c => c.activa === true);
    },
    refetchInterval: 2000, // Polling cada 2 segundos para ver cambios de precios
  });
  
  // Precios dinámicos desde SeasonConfig o defaults
  const PRECIOS = useMemo(() => {
    if (!seasonConfig?.productos_ropa) return DEFAULT_PRECIOS;
    
    const precios = { ...DEFAULT_PRECIOS };
    seasonConfig.productos_ropa.forEach(producto => {
      if (producto.activo !== false && precios.hasOwnProperty(producto.id)) {
        precios[producto.id] = producto.precio;
      }
    });
    return precios;
  }, [seasonConfig]);
  
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



  const canOrderJacket = selectedPlayer && !selectedPlayer.deporte?.includes("Aficionado") && !selectedPlayer.deporte?.includes("Baloncesto");

  useEffect(() => {
    let total = 0;
    if (orderData.chaqueta_partidos) total += PRECIOS.chaqueta_partidos;
    if (orderData.pack_entrenamiento) total += PRECIOS.pack_entrenamiento;
    if (orderData.camiseta_individual) total += PRECIOS.camiseta_individual;
    if (orderData.pantalon_individual) total += PRECIOS.pantalon_individual;
    if (orderData.sudadera_individual) total += PRECIOS.sudadera_individual;
    if (orderData.chubasquero) total += PRECIOS.chubasquero;
    if (orderData.anorak) total += PRECIOS.anorak;
    if (orderData.mochila) total += PRECIOS.mochila;
    
    // Calcular crédito a usar (máximo el total del pedido o el crédito disponible)
    const maxCredit = useCredit ? Math.min(userCredit, total) : 0;
    setCreditToUse(maxCredit);
    
    setOrderData(prev => ({
      ...prev, 
      precio_total: total,
      precio_con_descuento: total - maxCredit,
      credito_aplicado: maxCredit,
      concepto_pago: `Pedido ropa ${selectedPlayer?.nombre || ''} - Temporada ${getCurrentSeason()}`
    }));
  }, [orderData.chaqueta_partidos, orderData.pack_entrenamiento, orderData.camiseta_individual,
    orderData.pantalon_individual, orderData.sudadera_individual, orderData.chubasquero,
    orderData.anorak, orderData.mochila, selectedPlayer, useCredit, userCredit, PRECIOS]);

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

  const [uploadError, setUploadError] = useState(null);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    if (file.size === 0) {
      toast.error('El archivo está vacío o no se pudo leer. Inténtalo de nuevo.', { duration: 6000 });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      const sizeMB = (file.size / 1024 / 1024).toFixed(0);
      toast.error(`El archivo pesa ${sizeMB}MB (máx 10MB). Baja la resolución o envía la foto por WhatsApp a ti mismo.`, { duration: 10000 });
      return;
    }

    setUploadingFile(true);
    setUploadError(null);
    try {
      const response = await base44.integrations.Core.UploadFile({ file });
      setOrderData({ ...orderData, justificante_url: response.file_url });
      toast.success("Justificante subido correctamente");
    } catch (error) {
      console.error("Error uploading file:", error);
      const msg = 'No se pudo subir el justificante. Prueba con una captura de pantalla (pesan menos) o envíate la foto por WhatsApp y súbela desde ahí.';
      setUploadError(msg);
      toast.error(msg, { duration: 10000 });
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

    // Solo requerir justificante si hay algo que pagar
    const totalAPagar = orderData.precio_total - creditToUse;
    if (totalAPagar > 0 && !orderData.justificante_url) {
      toast.error("Debes subir el justificante de transferencia");
      return;
    }

    // No enviar emails aquí - se envían desde la página después de crear el pedido exitosamente

    // Pasar datos con crédito aplicado
    const finalData = {
      ...orderData,
      credito_aplicado: creditToUse,
      precio_final: orderData.precio_total - creditToUse
    };
    
    // Notificar al padre para actualizar el crédito del usuario
    if (creditToUse > 0 && onCreditUsed) {
      onCreditUsed(creditToUse);
    }
    
    onSubmit(finalData);
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
                      price={PRECIOS.chaqueta_partidos}
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
                      <label htmlFor="pack" className="font-semibold cursor-pointer flex-1">Pack de Entrenamiento - {PRECIOS.pack_entrenamiento}€</label>
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
                    <div className="space-y-3">
                      {/* Crédito disponible del programa de referidos */}
                      {userCredit > 0 && (
                        <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-300 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-2xl">🎁</span>
                              <div>
                                <p className="font-bold text-purple-900">¡Tienes crédito disponible!</p>
                                <p className="text-sm text-purple-700">Del programa "Trae un Socio Amigo"</p>
                              </div>
                            </div>
                            <span className="text-2xl font-bold text-purple-600">{userCredit}€</span>
                          </div>
                          <div className="flex items-center space-x-3 mt-3 pt-3 border-t border-purple-200">
                            <Checkbox 
                              id="useCredit" 
                              checked={useCredit} 
                              onCheckedChange={setUseCredit} 
                            />
                            <label htmlFor="useCredit" className="text-sm font-medium text-purple-800 cursor-pointer">
                              Usar mi crédito en este pedido (-{creditToUse}€)
                            </label>
                          </div>
                        </div>
                      )}
                      
                      <div className="bg-green-50 border-2 border-green-300 rounded-lg p-4">
                        {creditToUse > 0 ? (
                          <div className="space-y-2">
                            <div className="flex justify-between text-slate-700">
                              <span>Subtotal:</span>
                              <span>{orderData.precio_total}€</span>
                            </div>
                            <div className="flex justify-between text-purple-600 font-medium">
                              <span>🎁 Crédito aplicado:</span>
                              <span>-{creditToUse}€</span>
                            </div>
                            <div className="flex justify-between pt-2 border-t border-green-300">
                              <span className="text-xl font-bold text-green-900">Total a pagar:</span>
                              <span className="text-2xl font-bold text-green-900">{orderData.precio_total - creditToUse}€</span>
                            </div>
                            {orderData.precio_total - creditToUse === 0 && (
                              <p className="text-sm text-green-700 mt-2 bg-green-100 p-2 rounded">
                                ✅ ¡Tu crédito cubre el pedido completo! No necesitas subir justificante.
                              </p>
                            )}
                          </div>
                        ) : (
                          <p className="text-2xl font-bold text-green-900">Total: {orderData.precio_total}€</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {orderData.precio_total > 0 && (orderData.precio_total - creditToUse) > 0 && (
                 <>
                   <div className="space-y-4 border-2 border-blue-200 rounded-lg p-6 bg-blue-50">
                     <h3 className="text-lg font-bold text-blue-900">Información de Pago</h3>

                     <Alert className="bg-white border-blue-300">
                       <AlertCircle className="h-4 w-4 text-blue-600" />
                       <AlertDescription className="text-blue-800">
                         <p className="font-semibold mb-1">💳 Métodos de pago disponibles:</p>
                         {seasonConfig?.bizum_activo ? (
                           <p className="text-sm">Puedes pagar por <strong>transferencia bancaria</strong> o por <strong>Bizum</strong>. Sube el justificante correspondiente.</p>
                         ) : (
                           <p className="text-sm">El pago se realiza por <strong>transferencia bancaria</strong>. Sube el justificante de la transferencia.</p>
                         )}
                       </AlertDescription>
                     </Alert>

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

                    <div className="space-y-3 p-4 bg-orange-50 rounded-lg border-2 border-orange-200">
                      <Label htmlFor="justificante" className="text-base font-semibold text-orange-900">
                        📎 Justificante de Pago * (Obligatorio)
                      </Label>
                      <p className="text-sm text-orange-800">
                        Sube una captura o foto del justificante de pago
                      </p>
                      {orderData.metodo_pago === "Bizum" && seasonConfig?.bizum_telefono && (
                        <div className="bg-white rounded-lg p-3 border border-orange-300">
                          <p className="text-sm text-slate-900">
                            📱 <strong>Enviar Bizum al:</strong> {seasonConfig.bizum_telefono}
                          </p>
                          <p className="text-xs text-slate-600 mt-1">
                            Concepto: Equipación {selectedPlayer?.nombre}
                          </p>
                        </div>
                      )}
                      <div className="flex gap-3">
                        <Button type="button" variant="outline" onClick={() => document.getElementById('file-upload').click()} disabled={uploadingFile} className="flex-1 bg-white">
                          {uploadingFile ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Subiendo...</> : <><Upload className="w-4 h-4 mr-2" />{orderData.justificante_url ? "Cambiar justificante" : "Subir justificante"}</>}
                        </Button>
                        {orderData.justificante_url && <Button type="button" variant="outline" onClick={() => setOrderData({...orderData, justificante_url: ""})} className="bg-white"><X className="w-4 h-4" /></Button>}
                      </div>
                      <input id="file-upload" type="file" accept="image/jpeg,image/jpg,image/png,image/heic,image/heif,application/pdf" onChange={handleFileUpload} className="hidden" />
                      {orderData.justificante_url ? (
                        <p className="text-sm text-green-600 font-medium">✓ Justificante subido correctamente</p>
                      ) : uploadError ? (
                        <div className="bg-red-50 border-2 border-red-300 rounded-lg p-3 space-y-1">
                          <p className="text-sm text-red-800 font-medium">❌ {uploadError}</p>
                          <p className="text-xs text-red-700">💡 <strong>Alternativa:</strong> Envíate la foto por WhatsApp y súbela desde la galería (se reduce automáticamente).</p>
                        </div>
                      ) : (
                        <p className="text-sm text-red-600 font-medium">⚠️ Debes subir el justificante para continuar</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label>Notas (opcional)</Label>
                      <Textarea value={orderData.notas} onChange={(e) => setOrderData({...orderData, notas: e.target.value})} placeholder="Información adicional..." rows={3} />
                    </div>
                  </>
                )}

                {/* Pedido cubierto por crédito - solo notas */}
                {orderData.precio_total > 0 && (orderData.precio_total - creditToUse) === 0 && (
                  <div className="space-y-4 border-2 border-green-200 rounded-lg p-6 bg-green-50">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">🎉</span>
                      <div>
                        <h3 className="text-lg font-bold text-green-900">¡Pedido cubierto por tu crédito!</h3>
                        <p className="text-sm text-green-700">No necesitas realizar ningún pago adicional</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Notas (opcional)</Label>
                      <Textarea value={orderData.notas} onChange={(e) => setOrderData({...orderData, notas: e.target.value})} placeholder="Información adicional..." rows={3} />
                    </div>
                  </div>
                )}
              </>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>Cancelar</Button>
              <Button 
                type="submit" 
                className="bg-orange-600 hover:bg-orange-700" 
                disabled={isSubmitting || ((orderData.precio_total - creditToUse) > 0 && !orderData.justificante_url) || orderData.precio_total === 0}
              >
                {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Enviando...</> : "Confirmar Pedido"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}