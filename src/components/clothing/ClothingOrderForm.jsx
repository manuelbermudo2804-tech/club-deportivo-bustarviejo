
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

// Precios
const PRECIOS = {
  chaqueta: 35,
  pack: 41,
  camiseta_individual: 10,
  pantalon_individual: 17,
  sudadera_individual: 18,
  chubasquero: 20,
  anorak: 40,
  mochila: 22
};

// Función para obtener la temporada actual
const getCurrentSeason = () => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  
  if (currentMonth >= 9) {
    return `${currentYear}/${currentYear + 1}`;
  }
  return `${currentYear - 1}/${currentYear}`;
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
    pack_camiseta_talla: "",
    pack_pantalon_talla: "",
    pack_sudadera_talla: "",
    camiseta_individual: false,
    camiseta_individual_talla: "",
    pantalon_individual: false,
    pantalon_individual_talla: "",
    sudadera_individual: false,
    sudadera_individual_talla: "",
    chubasquero: false,
    chubasquero_talla: "",
    anorak: false,
    anorak_talla: "",
    mochila: false,
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
    if (orderData.chaqueta_partidos) total += PRECIOS.chaqueta;
    if (orderData.pack_entrenamiento) total += PRECIOS.pack;
    if (orderData.camiseta_individual) total += PRECIOS.camiseta_individual;
    if (orderData.pantalon_individual) total += PRECIOS.pantalon_individual;
    if (orderData.sudadera_individual) total += PRECIOS.sudadera_individual;
    if (orderData.chubasquero) total += PRECIOS.chubasquero;
    if (orderData.anorak) total += PRECIOS.anorak;
    if (orderData.mochila) total += PRECIOS.mochila;
    
    setOrderData(prev => ({
      ...prev,
      precio_total: total,
      concepto_pago: `Pedido ropa ${selectedPlayer?.nombre || ''} - Temporada ${getCurrentSeason()}`
    }));
  }, [
    orderData.chaqueta_partidos, 
    orderData.pack_entrenamiento,
    orderData.camiseta_individual,
    orderData.pantalon_individual,
    orderData.sudadera_individual,
    orderData.chubasquero,
    orderData.anorak,
    orderData.mochila,
    selectedPlayer
  ]);

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
        // Reset all product-related fields when player changes to ensure clean state
        chaqueta_partidos: false,
        chaqueta_talla: "",
        pack_entrenamiento: false,
        pack_camiseta_talla: "",
        pack_pantalon_talla: "",
        pack_sudadera_talla: "",
        camiseta_individual: false,
        camiseta_individual_talla: "",
        pantalon_individual: false,
        pantalon_individual_talla: "",
        sudadera_individual: false,
        sudadera_individual_talla: "",
        chubasquero: false,
        chubasquero_talla: "",
        anorak: false,
        anorak_talla: "",
        mochila: false,
        precio_total: 0, // Reset total, useEffect will re-calculate
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

    const hasAnyProduct = orderData.chaqueta_partidos || orderData.pack_entrenamiento || 
      orderData.camiseta_individual || orderData.pantalon_individual || 
      orderData.sudadera_individual || orderData.chubasquero || 
      orderData.anorak || orderData.mochila;

    if (!hasAnyProduct) {
      toast.error("Debes seleccionar al menos un producto");
      return;
    }

    if (orderData.chaqueta_partidos && !orderData.chaqueta_talla) {
      toast.error("Selecciona la talla de la chaqueta");
      return;
    }

    if (orderData.pack_entrenamiento) {
      if (!orderData.pack_camiseta_talla) {
        toast.error("Selecciona la talla de la camiseta del pack");
        return;
      }
      if (!orderData.pack_pantalon_talla) {
        toast.error("Selecciona la talla del pantalón del pack");
        return;
      }
      if (!orderData.pack_sudadera_talla) {
        toast.error("Selecciona la talla de la sudadera del pack");
        return;
      }
    }

    if (orderData.camiseta_individual && !orderData.camiseta_individual_talla) {
      toast.error("Selecciona la talla de la camiseta individual");
      return;
    }

    if (orderData.pantalon_individual && !orderData.pantalon_individual_talla) {
      toast.error("Selecciona la talla del pantalón individual");
      return;
    }

    if (orderData.sudadera_individual && !orderData.sudadera_individual_talla) {
      toast.error("Selecciona la talla de la sudadera individual");
      return;
    }

    if (orderData.chubasquero && !orderData.chubasquero_talla) {
      toast.error("Selecciona la talla del chubasquero");
      return;
    }

    if (orderData.anorak && !orderData.anorak_talla) {
      toast.error("Selecciona la talla del anorak");
      return;
    }

    if (!orderData.justificante_url) {
      toast.error("Debes subir el justificante de transferencia");
      return;
    }

    // Enviar email de notificación al club
    try {
      let productsHTML = '';
      if (orderData.chaqueta_partidos) {
        productsHTML += `<p>✅ <strong>Chaqueta de Partidos:</strong> ${orderData.chaqueta_talla} - ${PRECIOS.chaqueta}€</p>`;
      }
      if (orderData.pack_entrenamiento) {
        productsHTML += `
          <p>✅ <strong>Pack de Entrenamiento - ${PRECIOS.pack}€</strong></p>
          <ul>
            <li>Camiseta: ${orderData.pack_camiseta_talla}</li>
            <li>Pantalón: ${orderData.pack_pantalon_talla}</li>
            <li>Sudadera: ${orderData.pack_sudadera_talla}</li>
          </ul>
        `;
      }
      if (orderData.camiseta_individual) {
        productsHTML += `<p>✅ <strong>Camiseta Individual (FUERA DEL PACK):</strong> ${orderData.camiseta_individual_talla} - ${PRECIOS.camiseta_individual}€</p>`;
      }
      if (orderData.pantalon_individual) {
        productsHTML += `<p>✅ <strong>Pantalón Individual (FUERA DEL PACK):</strong> ${orderData.pantalon_individual_talla} - ${PRECIOS.pantalon_individual}€</p>`;
      }
      if (orderData.sudadera_individual) {
        productsHTML += `<p>✅ <strong>Sudadera Individual (FUERA DEL PACK):</strong> ${orderData.sudadera_individual_talla} - ${PRECIOS.sudadera_individual}€</p>`;
      }
      if (orderData.chubasquero) {
        productsHTML += `<p>✅ <strong>Chubasquero (escudo bordado):</strong> ${orderData.chubasquero_talla} - ${PRECIOS.chubasquero}€</p>`;
      }
      if (orderData.anorak) {
        productsHTML += `<p>✅ <strong>Anorak:</strong> ${orderData.anorak_talla} - ${PRECIOS.anorak}€</p>`;
      }
      if (orderData.mochila) {
        productsHTML += `<p>✅ <strong>Mochila con botero (escudo vinilo):</strong> ${PRECIOS.mochila}€</p>`;
      }

      await base44.integrations.Core.SendEmail({
        to: "CDBUSTARVIEJO@GMAIL.COM",
        subject: `Nuevo Pedido de Equipación - ${orderData.jugador_nombre}`,
        body: `
          <h2>Nuevo Pedido de Equipación Recibido</h2>
          <p><strong>Jugador:</strong> ${orderData.jugador_nombre}</p>
          <p><strong>Categoría:</strong> ${orderData.jugador_categoria}</p>
          <p><strong>Email Padre/Tutor:</strong> ${orderData.email_padre}</p>
          <p><strong>Teléfono:</strong> ${orderData.telefono}</p>
          <hr>
          <h3>Productos Solicitados:</h3>
          ${productsHTML}
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

  const ProductCheckbox = ({ id, checked, onChange, label, price, description, talla, onTallaChange, required }) => (
    <div className="space-y-3 bg-white rounded-lg p-4 border-2 border-slate-200">
      <div className="flex items-center space-x-3">
        <Checkbox
          id={id}
          checked={checked}
          onCheckedChange={onChange}
        />
        <label htmlFor={id} className="font-semibold cursor-pointer flex-1">
          {label} - {price}€
        </label>
      </div>
      {description && (
        <p className="text-sm text-slate-600 ml-7">{description}</p>
      )}
      {checked && talla !== undefined && (
        <div className="ml-7 space-y-2">
          <Label htmlFor={`${id}_talla`}>Talla *</Label>
          <Select value={talla} onValueChange={onTallaChange} required={required}>
            <SelectTrigger id={`${id}_talla`}>
              <SelectValue placeholder="Selecciona una talla..." />
            </SelectTrigger>
            <SelectContent>
              {TALLAS.map(t => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );

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

          {/* GUÍA DE TALLAS */}
          <Card className="mb-6 border-2 border-green-500 bg-gradient-to-br from-green-50 to-green-100">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-green-900 flex items-center gap-2">
                <Ruler className="w-5 h-5" />
                📏 Guía de Tallas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="bg-white rounded-lg p-4 border-2 border-green-300">
                <h4 className="font-bold text-green-900 mb-3">Tallas Infantiles (con edad aproximada):</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                  <div className="bg-green-50 p-2 rounded">
                    <strong>6XS:</strong> 4-5 años
                  </div>
                  <div className="bg-green-50 p-2 rounded">
                    <strong>5XS:</strong> 5-6 años
                  </div>
                  <div className="bg-green-50 p-2 rounded">
                    <strong>4XS:</strong> 7-8 años
                  </div>
                  <div className="bg-green-50 p-2 rounded">
                    <strong>3XS:</strong> 9-10 años
                  </div>
                  <div className="bg-green-50 p-2 rounded">
                    <strong>2XS:</strong> 11-12 años
                  </div>
                  <div className="bg-green-50 p-2 rounded">
                    <strong>XS:</strong> 12-14 años
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg p-4 border-2 border-green-300">
                <h4 className="font-bold text-green-900 mb-3">Tallas Adulto:</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                  <div className="bg-green-50 p-2 rounded">
                    <strong>S:</strong> Pequeña
                  </div>
                  <div className="bg-green-50 p-2 rounded">
                    <strong>M:</strong> Mediana
                  </div>
                  <div className="bg-green-50 p-2 rounded">
                    <strong>L:</strong> Grande
                  </div>
                  <div className="bg-green-50 p-2 rounded">
                    <strong>XL:</strong> Extra Grande
                  </div>
                  <div className="bg-green-50 p-2 rounded">
                    <strong>XXL:</strong> 2X Grande
                  </div>
                  <div className="bg-green-50 p-2 rounded">
                    <strong>3XL:</strong> 3X Grande
                  </div>
                </div>
              </div>

              <Alert className="bg-orange-50 border-orange-300">
                <Info className="h-4 w-4 text-orange-600" />
                <AlertDescription className="text-orange-800 text-sm">
                  <strong>💡 Consejo:</strong> Las edades son aproximadas. Si tienes dudas sobre la talla, 
                  consulta con el club antes de hacer el pedido en <strong>CDBUSTARVIEJO@GMAIL.COM</strong>
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

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
                    <ProductCheckbox
                      id="chaqueta"
                      checked={orderData.chaqueta_partidos}
                      onChange={(checked) => 
                        setOrderData({...orderData, chaqueta_partidos: checked, chaqueta_talla: ""})
                      }
                      label="Chaqueta de Partidos"
                      price={PRECIOS.chaqueta}
                      description="Chaqueta oficial para los partidos"
                      talla={orderData.chaqueta_talla}
                      onTallaChange={(value) => setOrderData({...orderData, chaqueta_talla: value})}
                      required={orderData.chaqueta_partidos}
                    />
                  ) : (
                    <Alert className="bg-orange-100 border-orange-300">
                      <AlertCircle className="h-4 w-4 text-orange-600" />
                      <AlertDescription className="text-orange-800 text-sm">
                        <strong>⚠️ Chaqueta no disponible</strong> para equipos Aficionado y Baloncesto.
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Pack de Entrenamiento */}
                  <div className="space-y-3 bg-white rounded-lg p-4 border-2 border-green-300">
                    <div className="flex items-center space-x-3">
                      <Checkbox
                        id="pack"
                        checked={orderData.pack_entrenamiento}
                        onCheckedChange={(checked) => 
                          setOrderData({
                            ...orderData, 
                            pack_entrenamiento: checked, 
                            pack_camiseta_talla: "",
                            pack_pantalon_talla: "",
                            pack_sudadera_talla: ""
                          })
                        }
                      />
                      <label htmlFor="pack" className="font-semibold cursor-pointer flex-1">
                        Pack de Entrenamiento - {PRECIOS.pack}€
                      </label>
                    </div>
                    <Alert className="ml-7 bg-blue-50 border-blue-200">
                      <Info className="h-4 w-4 text-blue-600" />
                      <AlertDescription className="text-blue-800 text-sm">
                        <strong>El pack incluye:</strong> Camiseta + Pantalón + Sudadera<br/>
                        <span className="text-xs">Puedes elegir tallas diferentes para cada prenda</span>
                      </AlertDescription>
                    </Alert>
                    {orderData.pack_entrenamiento && (
                      <div className="ml-7 space-y-4">
                        {['camiseta', 'pantalon', 'sudadera'].map(item => (
                          <div key={item} className="space-y-2 bg-slate-50 p-3 rounded-lg">
                            <Label className="flex items-center gap-2">
                              {item === 'camiseta' ? '👕' : item === 'pantalon' ? '👖' : '🧥'} Talla de la {item.charAt(0).toUpperCase() + item.slice(1)} *
                            </Label>
                            <Select
                              value={orderData[`pack_${item}_talla`]}
                              onValueChange={(value) => setOrderData({...orderData, [`pack_${item}_talla`]: value})}
                              required={orderData.pack_entrenamiento}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder={`Selecciona talla para ${item}...`} />
                              </SelectTrigger>
                              <SelectContent>
                                {TALLAS.map(talla => (
                                  <SelectItem key={talla} value={talla}>{talla}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="border-t-2 border-orange-300 pt-4">
                    <h4 className="font-bold text-orange-900 mb-3">🛍️ Prendas Individuales (FUERA DEL PACK)</h4>
                    <div className="space-y-3">
                      <ProductCheckbox
                        id="camiseta_ind"
                        checked={orderData.camiseta_individual}
                        onChange={(checked) => setOrderData({...orderData, camiseta_individual: checked, camiseta_individual_talla: ""})}
                        label="Camiseta Individual"
                        price={PRECIOS.camiseta_individual}
                        talla={orderData.camiseta_individual_talla}
                        onTallaChange={(value) => setOrderData({...orderData, camiseta_individual_talla: value})}
                        required={orderData.camiseta_individual}
                      />
                      <ProductCheckbox
                        id="pantalon_ind"
                        checked={orderData.pantalon_individual}
                        onChange={(checked) => setOrderData({...orderData, pantalon_individual: checked, pantalon_individual_talla: ""})}
                        label="Pantalón Individual"
                        price={PRECIOS.pantalon_individual}
                        talla={orderData.pantalon_individual_talla}
                        onTallaChange={(value) => setOrderData({...orderData, pantalon_individual_talla: value})}
                        required={orderData.pantalon_individual}
                      />
                      <ProductCheckbox
                        id="sudadera_ind"
                        checked={orderData.sudadera_individual}
                        onChange={(checked) => setOrderData({...orderData, sudadera_individual: checked, sudadera_individual_talla: ""})}
                        label="Sudadera Individual"
                        price={PRECIOS.sudadera_individual}
                        talla={orderData.sudadera_individual_talla}
                        onTallaChange={(value) => setOrderData({...orderData, sudadera_individual_talla: value})}
                        required={orderData.sudadera_individual}
                      />
                    </div>
                  </div>

                  <div className="border-t-2 border-orange-300 pt-4">
                    <h4 className="font-bold text-orange-900 mb-3">🧥 Otras Prendas y Complementos</h4>
                    <div className="space-y-3">
                      <ProductCheckbox
                        id="chubasquero"
                        checked={orderData.chubasquero}
                        onChange={(checked) => setOrderData({...orderData, chubasquero: checked, chubasquero_talla: ""})}
                        label="Chubasquero (escudo bordado)"
                        price={PRECIOS.chubasquero}
                        talla={orderData.chubasquero_talla}
                        onTallaChange={(value) => setOrderData({...orderData, chubasquero_talla: value})}
                        required={orderData.chubasquero}
                      />
                      <ProductCheckbox
                        id="anorak"
                        checked={orderData.anorak}
                        onChange={(checked) => setOrderData({...orderData, anorak: checked, anorak_talla: ""})}
                        label="Anorak"
                        price={PRECIOS.anorak}
                        talla={orderData.anorak_talla}
                        onTallaChange={(value) => setOrderData({...orderData, anorak_talla: value})}
                        required={orderData.anorak}
                      />
                      <div className="space-y-3 bg-white rounded-lg p-4 border-2 border-slate-200">
                        <div className="flex items-center space-x-3">
                          <Checkbox
                            id="mochila"
                            checked={orderData.mochila}
                            onCheckedChange={(checked) => setOrderData({...orderData, mochila: checked})}
                          />
                          <label htmlFor="mochila" className="font-semibold cursor-pointer flex-1">
                            Mochila con botero (escudo vinilo) - {PRECIOS.mochila}€
                          </label>
                        </div>
                      </div>
                    </div>
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
                      
                      <Alert className="bg-white border-blue-300">
                        <AlertCircle className="h-4 w-4 text-blue-600" />
                        <AlertDescription className="text-blue-800 text-sm">
                          <strong>💳 Método de pago:</strong> Transferencia Bancaria<br/>
                          <strong>📧 Los pedidos se envían a:</strong> CDBUSTARVIEJO@GMAIL.COM
                        </AlertDescription>
                      </Alert>

                      {/* Concepto */}
                      <div className="space-y-2">
                        <Label htmlFor="concepto">Concepto de la Transferencia *</Label>
                        <Input
                          id="concepto"
                          value={orderData.concepto_pago}
                          onChange={(e) => setOrderData({...orderData, concepto_pago: e.target.value})}
                          required
                          className="font-mono text-sm bg-white"
                        />
                        <p className="text-xs text-blue-600">
                          ⚠️ Usa este concepto exacto en tu transferencia
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
                          className="bg-white"
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
