import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreditCard, Gift, Info, Loader2, CheckCircle2 } from "lucide-react";

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

const getCuotasFromConfig = (categoria, categoryConfigs) => {
  if (!categoryConfigs || categoryConfigs.length === 0) return null;
  
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
  return null;
};

export default function InscriptionPaymentFlow({ 
  playerData,
  seasonConfig, 
  categoryConfigs: categoryConfigsProp,
  descuentoHermano = 0,
  onContinue,
  userEmail
}) {
  const [tipoPago, setTipoPago] = useState("Único");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadedConfigs, setLoadedConfigs] = useState(null);
  
  // Si no llegan categoryConfigs o están vacías, cargar directamente
  useEffect(() => {
    if (categoryConfigsProp && categoryConfigsProp.length > 0) return;
    (async () => {
      try {
        const { base44 } = await import('@/api/base44Client');
        const configs = await base44.entities.CategoryConfig.filter({ activa: true });
        console.log('📊 [InscriptionPaymentFlow] CategoryConfigs cargadas directamente:', configs.length);
        setLoadedConfigs(configs);
      } catch (e) {
        console.error('Error cargando CategoryConfigs:', e);
      }
    })();
  }, [categoryConfigsProp]);

  const categoryConfigs = (categoryConfigsProp && categoryConfigsProp.length > 0) ? categoryConfigsProp : (loadedConfigs || []);
  
  // Plan Mensual: si modo test activado, solo mostrar a emails de la lista
  // Corte: solo disponible hasta el 15 de agosto (después no tiene sentido prorratear)
  const planMensualGlobal = seasonConfig?.permitir_plan_mensual === true;
  const planMensualModoTest = seasonConfig?.plan_mensual_modo_test === true;
  const planMensualTestEmails = (seasonConfig?.plan_mensual_emails_test || []).map(e => e.toLowerCase().trim());
  const hoy = new Date();
  const fechaCorte = new Date(hoy.getFullYear(), 7, 15); // 15 de agosto
  const dentroDelPlazo = hoy <= fechaCorte;
  const planMensualEnabled = planMensualGlobal && dentroDelPlazo && (!planMensualModoTest || planMensualTestEmails.includes((userEmail || '').toLowerCase().trim()));
  const pctInicial = seasonConfig?.plan_mensual_porcentaje_inicial || 60;
  const mesFin = seasonConfig?.plan_mensual_mes_fin || "Mayo";

  const deriveFromSeason = (cfg) => {
    if (!cfg) return null;
    const hasUnique = typeof cfg.cuota_unica === 'number' && cfg.cuota_unica > 0;
    const hasTres = typeof cfg.cuota_tres_meses === 'number' && cfg.cuota_tres_meses > 0;
    if (hasUnique || hasTres) {
      const third = hasUnique ? Math.round((cfg.cuota_unica || 0) / 3) : (cfg.cuota_tres_meses || 0);
      return {
        inscripcion: third,
        segunda: third,
        tercera: third,
        total: hasUnique ? cfg.cuota_unica : (cfg.cuota_tres_meses || 0) * 3
      };
    }
    return null;
  };
  const cuotas = getCuotasFromConfig(playerData.deporte, categoryConfigs) || deriveFromSeason(seasonConfig);

  const importeTotal = cuotas ? cuotas.total - descuentoHermano : 0;
  const importeInscripcion = cuotas ? cuotas.inscripcion - descuentoHermano : 0;

  const handleContinue = () => {
    // Prevenir doble-click
    if (isSubmitting) {
      console.log('⚠️ [InscriptionPaymentFlow] Ya está procesando - ignorando');
      return;
    }
    
    setIsSubmitting(true);
    
    const paymentsToCreate = [];
    const currentYear = new Date().getFullYear();
    const defaultSeason = `${currentYear}/${currentYear + 1}`;
    const seasonToUse = seasonConfig?.temporada || defaultSeason;

    if (tipoPago === "Único") {
      paymentsToCreate.push({
        tipo_pago: "Único",
        mes: "Junio",
        temporada: seasonToUse,
        cantidad: importeTotal,
        estado: "Pendiente",
        metodo_pago: "Transferencia",
        notas: descuentoHermano > 0 ? `Descuento hermano: -${descuentoHermano}€` : ""
      });
    } else if (tipoPago === "Tres meses") {
      paymentsToCreate.push(
        {
          tipo_pago: "Tres meses",
          mes: "Junio",
          temporada: seasonToUse,
          cantidad: importeInscripcion,
          estado: "Pendiente",
          metodo_pago: "Transferencia",
          notas: descuentoHermano > 0 ? `Descuento hermano: -${descuentoHermano}€` : ""
        },
        {
          tipo_pago: "Tres meses",
          mes: "Septiembre",
          temporada: seasonToUse,
          cantidad: cuotas.segunda,
          estado: "Pendiente",
          metodo_pago: "Transferencia"
        },
        {
          tipo_pago: "Tres meses",
          mes: "Diciembre",
          temporada: seasonToUse,
          cantidad: cuotas.tercera,
          estado: "Pendiente",
          metodo_pago: "Transferencia"
        }
      );
    } else if (tipoPago === "Plan Mensual") {
      const pagoInicial = Math.round(importeTotal * pctInicial / 100);
      const restante = importeTotal - pagoInicial;
      const MES_NUM = { "Septiembre": 9, "Octubre": 10, "Noviembre": 11, "Diciembre": 12, "Enero": 1, "Febrero": 2, "Marzo": 3, "Abril": 4, "Mayo": 5, "Junio": 6 };
      const mesFinNum = MES_NUM[mesFin] || 5;
      let numMeses = mesFinNum >= 9 ? mesFinNum - 9 + 1 : (12 - 9 + 1) + mesFinNum;
      if (numMeses < 1) numMeses = 1;
      const mensualidad = Math.round((restante / numMeses) * 100) / 100;

      paymentsToCreate.push({
        tipo_pago: "Plan Mensual",
        mes: "Junio",
        temporada: seasonToUse,
        cantidad: pagoInicial,
        estado: "Pendiente",
        metodo_pago: "Transferencia",
        notas: `Plan Mensual: ${pagoInicial}€ inicial + ${numMeses}x ${mensualidad}€/mes (Sept-${mesFin})${descuentoHermano > 0 ? ` | Descuento hermano: -${descuentoHermano}€` : ''}`
      });
    }

    try {
      onContinue({ tipoPago, payments: paymentsToCreate });
    } catch (err) {
      console.error('[InscriptionPaymentFlow] Error en onContinue:', err);
      setIsSubmitting(false);
    }
  };

  if (!cuotas) {
    return (
      <Card className="border-2 border-red-400 shadow-lg">
        <CardContent className="pt-6 space-y-4">
          <Alert className="bg-red-50 border-red-300">
            <AlertDescription className="text-red-800">
              <p className="font-bold mb-2">⚠️ No se encontró configuración de cuotas</p>
              <p className="text-sm mb-3">Puede ser un error temporal de conexión. Pulsa reintentar o contacta con el club.</p>
            </AlertDescription>
          </Alert>
          <Button
            onClick={() => setLoadedConfigs(null)}
            variant="outline"
            className="w-full border-red-300 text-red-700 hover:bg-red-50"
          >
            🔄 Reintentar
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-blue-500 shadow-xl">
      <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="w-6 h-6" />
          Seleccionar Modalidad de Pago
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6 space-y-6">
        
        <div className="bg-green-50 border-2 border-green-300 rounded-xl p-4">
          <p className="text-sm font-bold text-green-900 mb-2">✅ Jugador registrado correctamente</p>
          <div className="space-y-1 text-sm text-green-800">
            <p><strong>Nombre:</strong> {playerData.nombre}</p>
            <p><strong>Categoría:</strong> {playerData.deporte}</p>
            <p><strong>Temporada:</strong> {seasonConfig?.temporada || `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`}</p>
          </div>
        </div>

        {descuentoHermano > 0 && (
          <Alert className="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-300 animate-pulse">
            <Gift className="h-5 w-5 text-purple-600" />
            <AlertDescription className="text-purple-900">
              <p className="font-bold text-lg mb-2">🎉 ¡Descuento Familiar Aplicado!</p>
              <p className="text-sm mb-2">
                <strong>{playerData.nombre}</strong> tiene un descuento de <strong className="text-purple-700 text-xl">{descuentoHermano}€</strong> por tener hermanos mayores inscritos en el club.
              </p>
              <div className="bg-white rounded-lg p-3 mt-3 border-2 border-purple-200">
                <p className="text-xs text-purple-800">
                  📌 <strong>Los importes que ves abajo YA incluyen este descuento</strong> aplicado en la cuota de inscripción (Junio).
                </p>
              </div>
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-3">
          <label className="text-sm font-bold text-slate-700">💳 ¿Cómo prefieres pagar? *</label>
          <Select value={tipoPago} onValueChange={setTipoPago}>
            <SelectTrigger className="h-14 text-base border-2 border-slate-300 hover:border-blue-500">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="z-[9999]">
              <SelectItem value="Único" className="cursor-pointer py-3">
                <div className="flex flex-col items-start">
                  <span className="font-bold text-base">
                    💰 Pago Único ({importeTotal}€)
                    {descuentoHermano > 0 && <span className="ml-2 text-purple-600">💜 -{descuentoHermano}€</span>}
                  </span>
                  <span className="text-xs text-slate-500">
                    Todo en junio - Más económico
                    {descuentoHermano > 0 && <span className="ml-1 text-purple-600">(Precio original: {cuotas.total}€)</span>}
                  </span>
                </div>
              </SelectItem>
              <SelectItem value="Tres meses" className="cursor-pointer py-3">
                <div className="flex flex-col items-start">
                  <span className="font-bold text-base">
                    📅 Tres Pagos (Jun/Sep/Dic)
                    {descuentoHermano > 0 && <span className="ml-2 text-purple-600">💜 -{descuentoHermano}€</span>}
                  </span>
                  <span className="text-xs text-slate-500">
                    {importeInscripcion}€ + {cuotas.segunda}€ + {cuotas.tercera}€ = {importeTotal}€
                    {descuentoHermano > 0 && <span className="ml-1 text-purple-600">(Total original: {cuotas.total}€)</span>}
                  </span>
                </div>
              </SelectItem>
              {planMensualEnabled && (() => {
                const pi = Math.round(importeTotal * pctInicial / 100);
                const rest = importeTotal - pi;
                const MN = { "Septiembre": 9, "Octubre": 10, "Noviembre": 11, "Diciembre": 12, "Enero": 1, "Febrero": 2, "Marzo": 3, "Abril": 4, "Mayo": 5, "Junio": 6 };
                const mfn = MN[mesFin] || 5;
                let nm = mfn >= 9 ? mfn - 9 + 1 : (12 - 9 + 1) + mfn;
                if (nm < 1) nm = 1;
                const mens = Math.round((rest / nm) * 100) / 100;
                return (
                  <SelectItem value="Plan Mensual" className="cursor-pointer py-3">
                    <div className="flex flex-col items-start">
                      <span className="font-bold text-base">
                        🔄 Plan Mensual (Tarjeta)
                      </span>
                      <span className="text-xs text-slate-500">
                        {pi}€ inicial + {nm}x {mens}€/mes = {importeTotal}€
                      </span>
                    </div>
                  </SelectItem>
                );
              })()}
            </SelectContent>
          </Select>
        </div>

        <div className="bg-orange-50 border-2 border-orange-300 rounded-xl p-4">
          <p className="text-sm font-bold text-orange-900 mb-3">💰 Cuotas que se generarán:</p>
          
          {tipoPago === "Plan Mensual" ? (() => {
            const pi = Math.round(importeTotal * pctInicial / 100);
            const rest = importeTotal - pi;
            const MN = { "Septiembre": 9, "Octubre": 10, "Noviembre": 11, "Diciembre": 12, "Enero": 1, "Febrero": 2, "Marzo": 3, "Abril": 4, "Mayo": 5, "Junio": 6 };
            const mfn = MN[mesFin] || 5;
            let nm = mfn >= 9 ? mfn - 9 + 1 : (12 - 9 + 1) + mfn;
            if (nm < 1) nm = 1;
            const mens = Math.round((rest / nm) * 100) / 100;
            return (
              <div className="space-y-2">
                <div className="flex justify-between items-center bg-white rounded-lg p-3 border border-emerald-200">
                  <div>
                    <p className="font-bold text-slate-900">Pago Inicial (Junio)</p>
                    <p className="text-xs text-slate-600">{pctInicial}% de la cuota total</p>
                  </div>
                  <p className="text-2xl font-bold text-emerald-700">{pi}€</p>
                </div>
                <div className="flex justify-between items-center bg-white rounded-lg p-3 border border-blue-200">
                  <div>
                    <p className="font-bold text-slate-900">Mensualidades automáticas</p>
                    <p className="text-xs text-slate-600">{nm} cobros (Sept → {mesFin}) por tarjeta</p>
                  </div>
                  <p className="text-lg font-bold text-blue-700">{nm} x {mens}€</p>
                </div>
                <div className="bg-emerald-100 border-2 border-emerald-300 rounded-lg p-2">
                  <p className="text-xs text-emerald-900 text-center font-bold">
                    🔄 Stripe cobrará automáticamente {mens}€/mes hasta {mesFin}. La suscripción se cancela sola.
                  </p>
                </div>
                {descuentoHermano > 0 && (
                  <div className="bg-purple-100 border-2 border-purple-300 rounded-lg p-2">
                    <p className="text-xs text-purple-900 text-center font-bold">
                      💜 Descuento hermano aplicado: -{descuentoHermano}€
                    </p>
                  </div>
                )}
                <div className="pt-2 border-t border-orange-200">
                  <div className="flex justify-between items-center">
                    <p className="font-bold text-slate-600">Total temporada:</p>
                    <p className="text-2xl font-bold text-orange-700">{importeTotal}€</p>
                  </div>
                </div>
              </div>
            );
          })() : tipoPago === "Único" ? (
            <div className="space-y-2">
              <div className="flex justify-between items-center bg-white rounded-lg p-3 border border-orange-200">
                <div>
                  <p className="font-bold text-slate-900">Pago Único (Junio)</p>
                  <p className="text-xs text-slate-600">Vence: 30 de junio</p>
                </div>
                <div className="text-right">
                  {descuentoHermano > 0 && (
                    <p className="text-sm text-slate-500 line-through">{cuotas.total}€</p>
                  )}
                  <p className="text-2xl font-bold text-orange-700">{importeTotal}€</p>
                </div>
              </div>
              {descuentoHermano > 0 && (
                <div className="bg-purple-100 border-2 border-purple-300 rounded-lg p-2">
                  <p className="text-xs text-purple-900 text-center font-bold">
                    💜 Descuento hermano aplicado: -{descuentoHermano}€
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex justify-between items-center bg-white rounded-lg p-3 border border-orange-200">
                <div>
                  <p className="font-bold text-slate-900">1ª Cuota - Inscripción (Junio)</p>
                  <p className="text-xs text-slate-600">Vence: 30 de junio</p>
                </div>
                <div className="text-right">
                  {descuentoHermano > 0 && (
                    <p className="text-sm text-slate-500 line-through">{cuotas.inscripcion}€</p>
                  )}
                  <p className="text-lg font-bold text-orange-700">{importeInscripcion}€</p>
                </div>
              </div>
              <div className="flex justify-between items-center bg-white rounded-lg p-3 border border-slate-200">
                <div>
                  <p className="font-bold text-slate-900">2ª Cuota (Septiembre)</p>
                  <p className="text-xs text-slate-600">Vence: 15 de septiembre</p>
                </div>
                <p className="text-lg font-bold text-slate-700">{cuotas.segunda}€</p>
              </div>
              <div className="flex justify-between items-center bg-white rounded-lg p-3 border border-slate-200">
                <div>
                  <p className="font-bold text-slate-900">3ª Cuota (Diciembre)</p>
                  <p className="text-xs text-slate-600">Vence: 15 de diciembre</p>
                </div>
                <p className="text-lg font-bold text-slate-700">{cuotas.tercera}€</p>
              </div>
              {descuentoHermano > 0 && (
                <div className="bg-purple-100 border-2 border-purple-300 rounded-lg p-2">
                  <p className="text-xs text-purple-900 text-center font-bold">
                    💜 Descuento de {descuentoHermano}€ aplicado en la 1ª cuota
                  </p>
                </div>
              )}
              <div className="pt-2 border-t border-orange-200">
                <div className="flex justify-between items-center">
                  <p className="font-bold text-slate-600">Total temporada:</p>
                  <div className="text-right">
                    {descuentoHermano > 0 && (
                      <p className="text-sm text-slate-500 line-through">{cuotas.total}€</p>
                    )}
                    <p className="text-2xl font-bold text-orange-700">{importeTotal}€</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <Alert className="bg-blue-50 border-blue-300">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <p className="font-bold text-sm mb-1">📌 ¿Qué pasa ahora?</p>
            <p className="text-xs leading-relaxed">
              Las cuotas se crearán con estado <strong>"Pendiente"</strong>. 
              Después podrás ir a la sección <strong>"Pagos"</strong> para registrar cada transferencia cuando la realices.
            </p>
          </AlertDescription>
        </Alert>

        <Button
          onClick={handleContinue}
          disabled={isSubmitting}
          className="w-full bg-green-600 hover:bg-green-700 text-white font-bold h-14 text-lg"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Procesando...
            </>
          ) : (
            <>
              <CheckCircle2 className="w-5 h-5 mr-2" />
              Continuar y Generar Cuotas
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}