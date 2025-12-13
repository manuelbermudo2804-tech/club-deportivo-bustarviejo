import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, CreditCard, Gift, Info, Loader2 } from "lucide-react";

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
  categoryConfigs,
  descuentoHermano = 0,
  onContinue
}) {
  const [tipoPago, setTipoPago] = useState("Único");

  const cuotas = getCuotasFromConfig(playerData.deporte, categoryConfigs);

  const importeTotal = cuotas ? cuotas.total - descuentoHermano : 0;
  const importeInscripcion = cuotas ? cuotas.inscripcion - descuentoHermano : 0;

  const handleContinue = () => {
    const paymentsToCreate = [];

    if (tipoPago === "Único") {
      paymentsToCreate.push({
        tipo_pago: "Único",
        mes: "Junio",
        temporada: seasonConfig.temporada,
        cantidad: importeTotal,
        estado: "Pendiente",
        metodo_pago: "Transferencia",
        notas: descuentoHermano > 0 ? `Descuento hermano: -${descuentoHermano}€` : ""
      });
    } else {
      paymentsToCreate.push(
        {
          tipo_pago: "Tres meses",
          mes: "Junio",
          temporada: seasonConfig.temporada,
          cantidad: importeInscripcion,
          estado: "Pendiente",
          metodo_pago: "Transferencia",
          notas: descuentoHermano > 0 ? `Descuento hermano: -${descuentoHermano}€` : ""
        },
        {
          tipo_pago: "Tres meses",
          mes: "Septiembre",
          temporada: seasonConfig.temporada,
          cantidad: cuotas.segunda,
          estado: "Pendiente",
          metodo_pago: "Transferencia"
        },
        {
          tipo_pago: "Tres meses",
          mes: "Diciembre",
          temporada: seasonConfig.temporada,
          cantidad: cuotas.tercera,
          estado: "Pendiente",
          metodo_pago: "Transferencia"
        }
      );
    }

    onContinue({ tipoPago, payments: paymentsToCreate });
  };

  if (!cuotas) {
    return (
      <Alert className="bg-red-50 border-red-300">
        <AlertDescription className="text-red-800">
          No se encontró configuración de cuotas. Contacta con el administrador.
        </AlertDescription>
      </Alert>
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
            <p><strong>Temporada:</strong> {seasonConfig.temporada}</p>
          </div>
        </div>

        {descuentoHermano > 0 && (
          <Alert className="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-300">
            <Gift className="h-5 w-5 text-purple-600" />
            <AlertDescription className="text-purple-900">
              <p className="font-bold mb-1">🎉 ¡Descuento Familiar!</p>
              <p className="text-sm">
                {playerData.nombre} tiene un descuento de <strong>{descuentoHermano}€</strong> por tener hermanos mayores inscritos.
              </p>
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-3">
          <label className="text-sm font-bold text-slate-700">💳 ¿Cómo prefieres pagar? *</label>
          <Select value={tipoPago} onValueChange={setTipoPago}>
            <SelectTrigger className="h-14 text-base">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Único">
                <div className="flex flex-col items-start py-1">
                  <span className="font-bold text-base">💰 Pago Único ({importeTotal}€)</span>
                  <span className="text-xs text-slate-500">Todo en junio - Más económico</span>
                </div>
              </SelectItem>
              <SelectItem value="Tres meses">
                <div className="flex flex-col items-start py-1">
                  <span className="font-bold text-base">📅 Tres Pagos (Jun/Sep/Dic)</span>
                  <span className="text-xs text-slate-500">{importeInscripcion}€ + {cuotas.segunda}€ + {cuotas.tercera}€ = {importeTotal}€</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="bg-orange-50 border-2 border-orange-300 rounded-xl p-4">
          <p className="text-sm font-bold text-orange-900 mb-3">💰 Cuotas que se generarán:</p>
          
          {tipoPago === "Único" ? (
            <div className="space-y-2">
              <div className="flex justify-between items-center bg-white rounded-lg p-3 border border-orange-200">
                <div>
                  <p className="font-bold text-slate-900">Pago Único (Junio)</p>
                  <p className="text-xs text-slate-600">Vence: 30 de junio</p>
                </div>
                <p className="text-2xl font-bold text-orange-700">{importeTotal}€</p>
              </div>
              {descuentoHermano > 0 && (
                <p className="text-xs text-purple-700 text-center">
                  (Precio original: {cuotas.total}€ - Descuento: {descuentoHermano}€)
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex justify-between items-center bg-white rounded-lg p-3 border border-orange-200">
                <div>
                  <p className="font-bold text-slate-900">1ª Cuota - Inscripción (Junio)</p>
                  <p className="text-xs text-slate-600">Vence: 30 de junio</p>
                </div>
                <p className="text-lg font-bold text-orange-700">{importeInscripcion}€</p>
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
                <p className="text-xs text-purple-700 text-center">
                  (Descuento de {descuentoHermano}€ aplicado en la 1ª cuota)
                </p>
              )}
              <div className="pt-2 border-t border-orange-200">
                <div className="flex justify-between items-center">
                  <p className="font-bold text-slate-600">Total temporada:</p>
                  <p className="text-2xl font-bold text-orange-700">{importeTotal}€</p>
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
          className="w-full bg-green-600 hover:bg-green-700 text-white font-bold h-14 text-lg"
        >
          <CheckCircle2 className="w-5 h-5 mr-2" />
          Continuar y Generar Cuotas
        </Button>
      </CardContent>
    </Card>
  );
}