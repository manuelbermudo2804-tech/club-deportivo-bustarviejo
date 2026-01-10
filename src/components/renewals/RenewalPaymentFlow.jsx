import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, CreditCard, Gift, Info, Loader2 } from "lucide-react";
import { toast } from "sonner";

const getCuotasFromConfig = (categoria, categoryConfigs) => {
  if (!categoryConfigs || categoryConfigs.length === 0) return null;
  
  const categoryConfig = categoryConfigs.find(c => c.nombre === categoria && c.activa);
  
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

export default function RenewalPaymentFlow({ 
  player, 
  newCategory, 
  seasonConfig, 
  categoryConfigs,
  onComplete, 
  onCancel,
  allPlayers = []
}) {
  const [tipoPago, setTipoPago] = useState("Único");
  const [isProcessing, setIsProcessing] = useState(false);
  const [descuentoHermano, setDescuentoHermano] = useState(0);

  const categoria = newCategory || player.deporte;
  const cuotas = getCuotasFromConfig(categoria, categoryConfigs);

  // Calcular descuento por hermano
  useEffect(() => {
    const calcularDescuento = () => {
      // Buscar hermanos de la misma familia que estén activos o renovados
      const hermanos = allPlayers.filter(p => 
        p.id !== player.id &&
        p.email_padre === player.email_padre &&
        (p.activo === true || p.estado_renovacion === "renovado")
      );

      if (hermanos.length === 0) {
        setDescuentoHermano(0);
        return;
      }

      // Ordenar por edad (mayor a menor)
      const todosHermanos = [player, ...hermanos].map(p => ({
        id: p.id,
        fecha_nacimiento: p.fecha_nacimiento
      })).filter(p => p.fecha_nacimiento);

      todosHermanos.sort((a, b) => new Date(a.fecha_nacimiento) - new Date(b.fecha_nacimiento));

      // Si este jugador NO es el mayor, tiene descuento
      const esMayor = todosHermanos[0]?.id === player.id;
      setDescuentoHermano(esMayor ? 0 : 25);
    };

    calcularDescuento();
  }, [player, allPlayers]);

  const importeTotal = cuotas ? cuotas.total - descuentoHermano : 0;
  const importeInscripcion = cuotas ? cuotas.inscripcion - descuentoHermano : 0;

  const handleConfirm = async () => {
    setIsProcessing(true);
    try {
      const paymentsToCreate = [];

      if (tipoPago === "Único") {
        paymentsToCreate.push({
          jugador_id: player.id,
          jugador_nombre: player.nombre,
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
            jugador_id: player.id,
            jugador_nombre: player.nombre,
            tipo_pago: "Tres meses",
            mes: "Junio",
            temporada: seasonConfig.temporada,
            cantidad: importeInscripcion,
            estado: "Pendiente",
            metodo_pago: "Transferencia",
            notas: descuentoHermano > 0 ? `Descuento hermano: -${descuentoHermano}€` : ""
          },
          {
            jugador_id: player.id,
            jugador_nombre: player.nombre,
            tipo_pago: "Tres meses",
            mes: "Septiembre",
            temporada: seasonConfig.temporada,
            cantidad: cuotas.segunda,
            estado: "Pendiente",
            metodo_pago: "Transferencia"
          },
          {
            jugador_id: player.id,
            jugador_nombre: player.nombre,
            tipo_pago: "Tres meses",
            mes: "Diciembre",
            temporada: seasonConfig.temporada,
            cantidad: cuotas.tercera,
            estado: "Pendiente",
            metodo_pago: "Transferencia"
          }
        );
      }

      onComplete({
        newCategory: categoria,
        tipoPago,
        payments: paymentsToCreate,
        descuentoHermano
      });
    } catch (error) {
      console.error("Error en renovación:", error);
      toast.error("Error al procesar la renovación");
      setIsProcessing(false);
    }
  };

  if (!cuotas) {
    return (
      <Alert className="bg-red-50 border-red-300">
        <AlertDescription className="text-red-800">
          No se encontró configuración de cuotas para esta categoría. Contacta con el administrador.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="border-2 border-green-500 shadow-xl">
      <CardHeader className="bg-gradient-to-r from-green-600 to-green-700 text-white">
        <CardTitle className="flex items-center gap-2">
          <CheckCircle2 className="w-6 h-6" />
          Confirmar Renovación + Generar Cuotas
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6 space-y-6">
        
        <div className="bg-blue-50 border-2 border-blue-300 rounded-xl p-4">
          <p className="text-sm font-bold text-blue-900 mb-2">📋 Resumen de Renovación</p>
          <div className="space-y-1 text-sm text-blue-800">
            <p><strong>Jugador:</strong> {player.nombre}</p>
            <p><strong>Categoría nueva:</strong> {categoria}</p>
            <p><strong>Temporada:</strong> {seasonConfig.temporada}</p>
          </div>
        </div>

        {descuentoHermano > 0 && (
          <Alert className="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-300">
            <Gift className="h-5 w-5 text-purple-600" />
            <AlertDescription className="text-purple-900">
              <p className="font-bold mb-1">🎉 ¡Descuento Familiar!</p>
              <p className="text-sm">
                {player.nombre} tiene un descuento de <strong>{descuentoHermano}€</strong> por tener hermanos mayores inscritos.
              </p>
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-3">
          <label className="text-sm font-bold text-slate-700">💳 Modalidad de Pago *</label>
          <Select value={tipoPago} onValueChange={setTipoPago}>
            <SelectTrigger className="h-12">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Único">
                <div className="flex flex-col items-start">
                  <span className="font-bold">Pago Único ({importeTotal}€)</span>
                  <span className="text-xs text-slate-500">Todo en junio</span>
                </div>
              </SelectItem>
              <SelectItem value="Tres meses">
                <div className="flex flex-col items-start">
                  <span className="font-bold">Tres Pagos (Jun/Sep/Dic)</span>
                  <span className="text-xs text-slate-500">{importeInscripcion}€ + {cuotas.segunda}€ + {cuotas.tercera}€</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="bg-green-50 border-2 border-green-300 rounded-xl p-4">
          <p className="text-sm font-bold text-green-900 mb-3">💰 Cuotas que se generarán:</p>
          
          {tipoPago === "Único" ? (
            <div className="space-y-2">
              <div className="flex justify-between items-center bg-white rounded-lg p-3 border border-green-200">
                <div>
                  <p className="font-bold text-slate-900">Pago Único (Junio)</p>
                  <p className="text-xs text-slate-600">Vence: 30 de junio</p>
                </div>
                <p className="text-xl font-bold text-green-700">{importeTotal}€</p>
              </div>
              {descuentoHermano > 0 && (
                <p className="text-xs text-purple-700 text-center">
                  (Precio original: {cuotas.total}€ - Descuento: {descuentoHermano}€)
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex justify-between items-center bg-white rounded-lg p-3 border border-green-200">
                <div>
                  <p className="font-bold text-slate-900">1ª Cuota - Inscripción (Junio)</p>
                  <p className="text-xs text-slate-600">Vence: 30 de junio</p>
                </div>
                <p className="text-lg font-bold text-green-700">{importeInscripcion}€</p>
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
              <div className="pt-2 border-t border-green-200">
                <div className="flex justify-between items-center">
                  <p className="font-bold text-slate-600">Total temporada:</p>
                  <p className="text-xl font-bold text-green-700">{importeTotal}€</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <Alert className="bg-orange-50 border-orange-300">
          <Info className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            <p className="font-bold text-sm mb-1">📌 Importante:</p>
            <p className="text-xs">
              Las cuotas se crearán con estado <strong>"Pendiente"</strong>. Podrás registrar los pagos desde la sección "Pagos" cuando realices las transferencias.
            </p>
          </AlertDescription>
        </Alert>

        <div className="flex gap-3 pt-4 border-t">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isProcessing}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isProcessing}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Procesando...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                ✅ Confirmar Renovación
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}