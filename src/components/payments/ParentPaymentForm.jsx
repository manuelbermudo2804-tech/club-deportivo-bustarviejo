import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ValidatedInput from "@/components/ui/ValidatedInput";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Upload, X, Loader2, Info, Gift } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { Alert, AlertDescription } from "@/components/ui/alert";

import PaymentInstructions from "./PaymentInstructions";
import { uploadPrivateFile } from "../utils/privateUpload";

const getCurrentSeason = () => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  
  if (currentMonth >= 9) {
    return `${currentYear}/${currentYear + 1}`;
  }
  return `${currentYear - 1}/${currentYear}`;
};

// Cuotas fallback (se sobreescriben con CategoryConfig si existe)
const CUOTAS_FALLBACK = {
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

// Mapeo de nombres de deporte a nombres de categoría en CategoryConfig
const CATEGORY_NAME_MAPPING = {
  "Fútbol Aficionado": "AFICIONADO",
  "Fútbol Juvenil": "JUVENIL",
  "Fútbol Cadete": "CADETE",
  "Fútbol Infantil (Mixto)": "INFANTIL",
  "Fútbol Alevín (Mixto)": "ALEVIN",
  "Fútbol Benjamín (Mixto)": "BENJAMIN",
  "Fútbol Pre-Benjamín (Mixto)": "PRE-BENJAMIN",
  "Fútbol Femenino": "FEMENINO",
  "Baloncesto (Mixto)": "BALONCESTO"
};

const FECHAS_VENCIMIENTO = {
  "Junio": "30 de junio",
  "Septiembre": "15 de septiembre",
  "Diciembre": "15 de diciembre"
};

// Función que obtiene cuotas de CategoryConfig si existe
const getCuotasFromConfig = (categoria, categoryConfigs) => {
  if (!categoryConfigs || categoryConfigs.length === 0) {
    return CUOTAS_FALLBACK[categoria] || { inscripcion: 0, segunda: 0, tercera: 0, total: 0 };
  }
  
  const mappedName = CATEGORY_NAME_MAPPING[categoria] || categoria;
  const categoryConfig = categoryConfigs.find(c => 
    (c.nombre === categoria || c.nombre === mappedName) && c.activa
  );
  
  if (categoryConfig) {
    return {
      inscripcion: categoryConfig.cuota_inscripcion,
      segunda: categoryConfig.cuota_segunda,
      tercera: categoryConfig.cuota_tercera,
      total: categoryConfig.cuota_total
    };
  }
  
  return CUOTAS_FALLBACK[categoria] || { inscripcion: 0, segunda: 0, tercera: 0, total: 0 };
};

const getImportePorMesFromConfig = (categoria, mes, categoryConfigs, descuento = 0) => {
  const cuotas = getCuotasFromConfig(categoria, categoryConfigs);
  let importe = 0;
  
  if (mes === "Junio") {
    importe = cuotas.inscripcion;
  } else if (mes === "Septiembre") {
    importe = cuotas.segunda;
  } else if (mes === "Diciembre") {
    importe = cuotas.tercera;
  }
  
  // Aplicar descuento SOLO en Junio
  if (mes === "Junio" && descuento > 0) {
    importe = Math.max(0, importe - descuento);
  }
  
  console.log('💰 [getImportePorMesFromConfig]', { categoria, mes, cuotas, descuento, importe });
  
  return importe;
};

const getTotalConDescuentoFromConfig = (categoria, categoryConfigs, descuento = 0) => {
  const cuotas = getCuotasFromConfig(categoria, categoryConfigs);
  return cuotas.total - descuento;
};

export default function ParentPaymentForm({ players, payments = [], customPlans = [], onSubmit, onCancel, isSubmitting, isAdmin = false, preselectedPlayerId = null, preselectedMonth = null }) {
  const [currentPayment, setCurrentPayment] = useState({
    jugador_id: "",
    jugador_nombre: "",
    tipo_pago: "Único",
    mes: "Junio",
    temporada: "2025/2026", // Se actualiza dinámicamente
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
  const [categoryConfigs, setCategoryConfigs] = useState([]);

  // Fetch season config y CategoryConfig
  useEffect(() => {
    const fetchConfig = async () => {
      const configs = await base44.entities.SeasonConfig.list();
      const active = configs.find(c => c.activa === true);
      setSeasonConfig(active);
      if (active?.temporada) {
        setCurrentPayment(prev => ({ ...prev, temporada: active.temporada }));
      }
      
      // Cargar CategoryConfig para precios actualizados
      const catConfigs = await base44.entities.CategoryConfig.list();
      setCategoryConfigs(catConfigs);
    };
    fetchConfig();
  }, []);

  useEffect(() => {
    // EJECUTAR SIEMPRE si hay preselectedPlayerId, incluso si ya hay jugador_id
    if (players && players.length > 0) {
      if (preselectedPlayerId) {
        const player = players.find(p => p.id === preselectedPlayerId);
        if (player) {
          handlePlayerChange(player.id, preselectedMonth);
          return;
        }
      }
      
      // Si no hay preselected y tampoco hay jugador seleccionado, intentar URL param
      if (!currentPayment.jugador_id) {
        const urlParams = new URLSearchParams(window.location.search);
        const jugadorId = urlParams.get('jugador_id');
        
        if (jugadorId) {
          const player = players.find(p => p.id === jugadorId);
          if (player) {
            handlePlayerChange(player.id);
          }
        }
      }
    }
  }, [players, payments, preselectedPlayerId, preselectedMonth, categoryConfigs]);

  // CRÍTICO: Re-evaluar tipo de pago cuando cambian los payments (para detectar cuotas recién generadas)
  useEffect(() => {
    if (currentPayment.jugador_id && payments.length > 0) {
      const temporadaActiva = seasonConfig?.temporada || currentPayment.temporada;
      const jugadorPayments = payments.filter(p => 
        p.jugador_id === currentPayment.jugador_id && 
        p.temporada === temporadaActiva
      );
      
      if (jugadorPayments.length > 0) {
        const primerPago = jugadorPayments[0];
        if (primerPago.tipo_pago && primerPago.tipo_pago !== tipoPagoFijado) {
          setTipoPagoFijado(primerPago.tipo_pago);
          // Actualizar también el tipo de pago actual si es diferente
          if (currentPayment.tipo_pago !== primerPago.tipo_pago) {
            setCurrentPayment(prev => ({
              ...prev,
              tipo_pago: primerPago.tipo_pago
            }));
          }
        }
      }
    }
  }, [payments, currentPayment.jugador_id, seasonConfig?.temporada]);

  const handlePlayerChange = (playerId, forcedMonth = null) => {
    const player = players.find(p => p.id === playerId);
    if (player) {
      setSelectedPlayer(player);
      
      // Verificar si tiene plan personalizado ACTIVO
      const playerCustomPlan = customPlans.find(p => 
        p.jugador_id === playerId && p.estado === "Activo"
      );
      
      // Verificar pagos existentes del jugador en la temporada ACTIVA (incluyendo TODOS los estados)
      const temporadaActiva = seasonConfig?.temporada || currentPayment.temporada;
      const jugadorPayments = payments.filter(p => 
        p.jugador_id === playerId && 
        p.temporada === temporadaActiva
      );
      setExistingPayments(jugadorPayments);
      
      // SI TIENE PLAN PERSONALIZADO, ignorar lógica estándar
      if (playerCustomPlan && playerCustomPlan.cuotas) {
        // Consultar pagos REALES de BD para ver qué cuotas están pendientes
        const planPayments = jugadorPayments.filter(p => p.tipo_pago === "Plan Especial");
        
        // Encontrar cuotas que NO tienen pago o tienen pago pendiente
        const cuotasPendientes = playerCustomPlan.cuotas.filter(cuota => {
          const pagoCuota = planPayments.find(p => p.mes === `Cuota ${cuota.numero}`);
          return !pagoCuota || pagoCuota.estado === "Pendiente";
        });
        
        if (cuotasPendientes.length === 0) {
          setPagoUnicoPagado(true);
          return;
        }
        
        // Seleccionar la primera cuota pendiente
        const proximaCuota = cuotasPendientes[0];
        
        setTipoPagoFijado("Plan Especial");
        setPagoUnicoPagado(false);
        
        setCurrentPayment({
          ...currentPayment,
          jugador_id: player.id,
          jugador_nombre: player.nombre,
          tipo_pago: "Plan Especial",
          mes: `Cuota ${proximaCuota.numero}`,
          plan_especial_id: playerCustomPlan.id,
          cantidad: proximaCuota.cantidad
        });
        return;
      }
      
      // LÓGICA ESTÁNDAR (sin plan personalizado)
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
      
      // DETECTAR tipo de pago desde las cuotas existentes (Pendiente, En revisión, o Pagado)
      const tipoPagoExistente = jugadorPayments.length > 0 ? jugadorPayments[0].tipo_pago : null;
      setTipoPagoFijado(tipoPagoExistente);
      
      const cuotas = getCuotasFromConfig(player.deporte, categoryConfigs);
      const descuento = player.tiene_descuento_hermano ? (player.descuento_aplicado || 0) : 0;
      
      // USAR el tipo de pago existente si lo hay, sino mantener el actual
      const tipoPago = tipoPagoExistente || "Único";
      
      // IMPORTANTE: Si es pago único, SIEMPRE usar Junio como mes de referencia
      let mesSeleccionado;
      if (tipoPago === "Único") {
        mesSeleccionado = "Junio";
      } else if (forcedMonth) {
        // Si viene un mes forzado desde el botón "Pagar", usarlo
        mesSeleccionado = forcedMonth;
      } else if (mesesPagados.length > 0) {
        // Si hay meses ya pagados, seleccionar el primer mes disponible
        const mesesDisponibles = ["Junio", "Septiembre", "Diciembre"].filter(m => !mesesPagados.includes(m));
        mesSeleccionado = mesesDisponibles[0] || "Junio";
      } else {
        // Por defecto, Junio
        mesSeleccionado = "Junio";
      }
      
      // CALCULAR la cantidad correctamente según el tipo de pago
      let cantidad;
      if (tipoPago === "Único") {
        cantidad = getTotalConDescuentoFromConfig(player.deporte, categoryConfigs, descuento);
      } else {
        // Para "Tres meses", usar el importe del mes específico CON descuento
        cantidad = getImportePorMesFromConfig(player.deporte, mesSeleccionado, categoryConfigs, descuento);
      }
      
      console.log('🔍 [ParentPaymentForm] Calculando cantidad:', {
        jugador: player.nombre,
        tipoPago,
        mes: mesSeleccionado,
        descuento,
        cantidad
      });
      
      setCurrentPayment({
        ...currentPayment,
        jugador_id: player.id,
        jugador_nombre: player.nombre,
        tipo_pago: tipoPago,
        mes: mesSeleccionado,
        cantidad: cantidad
      });
    }
  };

  const handleTipoPagoChange = (value) => {
    if (selectedPlayer) {
      const descuento = selectedPlayer.tiene_descuento_hermano ? (selectedPlayer.descuento_aplicado || 0) : 0;
      const cantidad = value === "Único" 
        ? getTotalConDescuentoFromConfig(selectedPlayer.deporte, categoryConfigs, descuento)
        : getImportePorMesFromConfig(selectedPlayer.deporte, currentPayment.mes, categoryConfigs, descuento);
      
      setCurrentPayment(prev => ({
        ...prev,
        tipo_pago: value,
        mes: value === "Único" ? "Junio" : prev.mes, // Forzar Junio para pago único
        cantidad: cantidad
      }));
    }
  };

  const handleMesChange = (value) => {
    if (selectedPlayer) {
      // Verificar si tiene plan personalizado
      const playerCustomPlan = customPlans.find(p => 
        p.jugador_id === selectedPlayer.id && p.estado === "Activo"
      );
      
      let cantidad;
      
      if (playerCustomPlan && playerCustomPlan.cuotas) {
        // Usar cantidad del plan
        const cuota = playerCustomPlan.cuotas.find(c => 
          (c.mes === value) || (`Cuota ${c.numero}` === value)
        );
        cantidad = cuota?.cantidad || 0;
      } else {
        // Lógica estándar
        const descuento = selectedPlayer.tiene_descuento_hermano ? (selectedPlayer.descuento_aplicado || 0) : 0;
        cantidad = currentPayment.tipo_pago === "Único"
          ? getTotalConDescuentoFromConfig(selectedPlayer.deporte, categoryConfigs, descuento)
          : getImportePorMesFromConfig(selectedPlayer.deporte, value, categoryConfigs, descuento);
      }
      
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
    e.target.value = '';

    // Validar tamaño (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      const sizeMB = (file.size / 1024 / 1024).toFixed(0);
      toast.error(`El archivo pesa ${sizeMB}MB y el máximo es 5MB. Reduce la resolución o envía la foto por WhatsApp a ti mismo.`, { duration: 10000 });
      return;
    }

    setUploadingFile(true);
    try {
      const file_uri = await uploadPrivateFile(file);
      setCurrentPayment(prev => ({
        ...prev,
        justificante_url: file_uri
      }));
      toast.success("🔒 Justificante subido de forma segura");
    } catch (error) {
      console.error("Error uploading file:", error);
      toast.error("Error al subir el justificante. Intenta con un archivo más pequeño.");
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
      toast.error("Debes subir el justificante de pago");
      return;
    }

    if (!currentPayment.cantidad || currentPayment.cantidad <= 0) {
      toast.error("Introduce la cantidad pagada");
      return;
    }

    // VALIDACIÓN: si existe un pago pendiente SIN justificante, actualizarlo
    const pagoExistente = payments.find(p => 
      p.jugador_id === currentPayment.jugador_id &&
      p.mes === currentPayment.mes &&
      p.temporada === currentPayment.temporada &&
      p.is_deleted !== true
    );

    if (pagoExistente) {
      // Verificar si tiene justificante REAL (no vacío)
      const tieneJustificanteReal = pagoExistente.justificante_url && pagoExistente.justificante_url.trim() !== "";
      
      // Si NO tiene justificante real Y está pendiente, actualizarlo
      if (!tieneJustificanteReal && pagoExistente.estado === "Pendiente") {
        console.log('🔄 [ParentPaymentForm] Actualizando pago pendiente sin justificante:', pagoExistente.id);
        onSubmit({...currentPayment, id: pagoExistente.id, isUpdate: true});
        return;
      }
      
      // Si ya tiene justificante real O está pagado/en revisión, es duplicado
      console.log('🔴 [ParentPaymentForm] Pago duplicado:', pagoExistente, 'Estado:', pagoExistente.estado, 'Justificante:', tieneJustificanteReal);
      toast.error(`❌ Ya existe un pago de ${currentPayment.mes} para este jugador (Estado: ${pagoExistente.estado})`, {
        duration: 4000
      });
      return;
    }

    console.log('✅ [ParentPaymentForm] Validación pasada, creando pago nuevo:', currentPayment);
    onSubmit(currentPayment);
  };

  const cuotas = selectedPlayer ? getCuotasFromConfig(selectedPlayer.deporte, categoryConfigs) : null;
  
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
                                  .filter(p => {
                                    // Solo jugadores activos
                                    if (p.activo === false) return false;
                                    
                                    // Verificar si ya completó todos los pagos de la temporada
                                    const temporadaActiva = seasonConfig?.temporada || currentPayment.temporada;
                                    const jugadorPayments = payments.filter(pago => 
                                      pago.jugador_id === p.id && 
                                      pago.temporada === temporadaActiva
                                    );
                                    
                                    // Si tiene pago único pagado, ya está completo
                                    const tienePagoUnicoPagado = jugadorPayments.some(pago => 
                                      pago.tipo_pago === "Único" && pago.estado === "Pagado"
                                    );
                                    if (tienePagoUnicoPagado) return false;
                                    
                                    // Si tiene los 3 meses pagados, ya está completo
                                    const mesesPagados = jugadorPayments
                                      .filter(pago => pago.tipo_pago === "Tres meses" && pago.estado === "Pagado")
                                      .map(pago => pago.mes);
                                    const todosMesesPagados = ["Junio", "Septiembre", "Diciembre"].every(m => mesesPagados.includes(m));
                                    if (todosMesesPagados) return false;
                                    
                                    // Mostrar el jugador si aún le faltan pagos
                                    return true;
                                  })
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
                  {selectedPlayer && (() => {
                    const playerCustomPlan = customPlans.find(p => 
                      p.jugador_id === selectedPlayer.id && p.estado === "Activo"
                    );

                    if (playerCustomPlan && playerCustomPlan.cuotas) {
                      // Si tiene plan especial, consultar pagos reales de BD
                      const temporadaActiva = seasonConfig?.temporada || currentPayment.temporada;
                      const planPayments = payments.filter(p => 
                        p.jugador_id === selectedPlayer.id && 
                        p.tipo_pago === "Plan Especial" &&
                        p.temporada === temporadaActiva
                      );
                      
                      // Encontrar cuotas que NO tienen pago o están pendientes
                      const cuotasPendientes = playerCustomPlan.cuotas.filter(cuota => {
                        const pagoCuota = planPayments.find(p => p.mes === `Cuota ${cuota.numero}`);
                        return !pagoCuota || pagoCuota.estado === "Pendiente";
                      });
                      
                      return (
                        <div className="space-y-2 md:col-span-2">
                          <Label>💰 Plan de Pago Personalizado</Label>
                          <div className="bg-purple-50 border-2 border-purple-300 rounded-lg p-4">
                            <p className="text-sm font-bold text-purple-900 mb-2">
                              Este jugador tiene un plan de {playerCustomPlan.cuotas.length} cuotas • {cuotasPendientes.length} pendientes
                            </p>
                            <Select
                              value={currentPayment.mes}
                              onValueChange={handleMesChange}
                              required
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {cuotasPendientes.map(cuota => (
                                  <SelectItem key={cuota.numero} value={`Cuota ${cuota.numero}`}>
                                    Cuota {cuota.numero} - {cuota.cantidad.toFixed(2)}€
                                    {cuota.fecha_vencimiento && ` (vence ${new Date(cuota.fecha_vencimiento).toLocaleDateString('es-ES')})`}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {playerCustomPlan.mensaje_para_familia && (
                              <p className="text-xs text-purple-700 mt-2">
                                💬 {playerCustomPlan.mensaje_para_familia}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    }

                    // Lógica estándar para jugadores sin plan especial
                    return (
                      <>
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
                      </>
                    );
                  })()}

                  <div className="space-y-2">
                    <Label htmlFor="cantidad">Cantidad Pagada (€) *</Label>
                    <ValidatedInput
                      validationType="dinero"
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
                        ✓ Importe oficial: {getImportePorMesFromConfig(selectedPlayer.deporte, currentPayment.mes, categoryConfigs)}€ 
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

                {/* Alerta de descuento por hermano */}
                {selectedPlayer?.tiene_descuento_hermano && selectedPlayer?.descuento_aplicado > 0 && (
                  <Alert className="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-300">
                    <Gift className="h-5 w-5 text-purple-600" />
                    <AlertDescription className="text-purple-900">
                      <p className="font-bold text-lg mb-1">🎉 ¡Descuento Familiar Aplicado!</p>
                      <p className="text-sm">
                        <strong>{selectedPlayer.nombre}</strong> tiene un descuento de <strong className="text-purple-700">{selectedPlayer.descuento_aplicado}€</strong> por tener hermanos mayores inscritos en el club.
                      </p>
                      <p className="text-xs mt-2 text-purple-700">
                        Este descuento se aplica en la cuota de inscripción (Junio). El importe mostrado ya incluye el descuento.
                      </p>
                    </AlertDescription>
                  </Alert>
                )}

                {cuotas && (
                  <Alert className="bg-green-50 border-green-300">
                    <Info className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800">
                      <strong>📊 Cuotas para {selectedPlayer?.deporte}:</strong>
                      <div className="mt-2 space-y-1 text-sm">
                        <p>
                          • <strong>Inscripción (hasta 30 junio):</strong> {cuotas.inscripcion}€
                          {selectedPlayer?.tiene_descuento_hermano && selectedPlayer?.descuento_aplicado > 0 && (
                            <span className="ml-2 text-purple-700 font-bold">
                              → {cuotas.inscripcion - selectedPlayer.descuento_aplicado}€ (con descuento hermano)
                            </span>
                          )}
                        </p>
                        <p>• <strong>Segunda Cuota (hasta 15 sept):</strong> {cuotas.segunda}€</p>
                        <p>• <strong>Tercera Cuota (hasta 15 dic):</strong> {cuotas.tercera}€</p>
                        <p className="pt-2 border-t border-green-300 mt-2">
                          <strong>Total Temporada (pago único):</strong> {cuotas.total}€
                          {selectedPlayer?.tiene_descuento_hermano && selectedPlayer?.descuento_aplicado > 0 && (
                            <span className="ml-2 text-purple-700 font-bold">
                              → {cuotas.total - selectedPlayer.descuento_aplicado}€ (con descuento)
                            </span>
                          )}
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