import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, AlertTriangle, Zap } from "lucide-react";

// Motor de matching automático
const matchMovementToPayment = (movement, payments) => {
  const movementDate = new Date(movement.fecha);
  const movementAmount = movement.importe;
  
  const matches = payments.map(payment => {
    const paymentDate = new Date(payment.fecha_pago || payment.created_date);
    const daysDiff = Math.abs((movementDate - paymentDate) / (1000 * 60 * 60 * 24));
    const amountMatch = Math.abs(payment.cantidad - movementAmount) < 0.01;
    
    let confidence = 0;
    
    // Coincidencia exacta de importe (+50 puntos)
    if (amountMatch) confidence += 50;
    
    // Fecha cercana (±3 días) (+30 puntos)
    if (daysDiff <= 3) confidence += 30;
    
    // Nombre del jugador en el concepto (+20 puntos)
    const conceptoLower = movement.concepto.toLowerCase();
    const nombreLower = payment.jugador_nombre.toLowerCase();
    if (conceptoLower.includes(nombreLower) || nombreLower.includes(conceptoLower.split(' ')[0])) {
      confidence += 20;
    }
    
    return { payment, confidence, daysDiff };
  }).filter(m => m.confidence >= 50).sort((a, b) => b.confidence - a.confidence);
  
  return matches[0] || null;
};

export default function AutoMatchEngine({ movements, payments, onMatch, onSkip }) {
  const results = useMemo(() => {
    return movements.map(movement => {
      const match = matchMovementToPayment(movement, payments);
      return { movement, match };
    });
  }, [movements, payments]);

  const automatic = results.filter(r => r.match && r.match.confidence >= 85);
  const suggested = results.filter(r => r.match && r.match.confidence < 85 && r.match.confidence >= 50);
  const unmatched = results.filter(r => !r.match);

  return (
    <div className="space-y-4">
      {/* Resumen */}
      <Card className="bg-gradient-to-r from-slate-900 to-slate-800 text-white">
        <CardContent className="pt-6">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Zap className="w-5 h-5 text-green-400" />
                <p className="text-2xl font-bold">{automatic.length}</p>
              </div>
              <p className="text-sm text-slate-300">Automáticos (≥85%)</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <AlertTriangle className="w-5 h-5 text-yellow-400" />
                <p className="text-2xl font-bold">{suggested.length}</p>
              </div>
              <p className="text-sm text-slate-300">Sugerencias (50-85%)</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <X className="w-5 h-5 text-red-400" />
                <p className="text-2xl font-bold">{unmatched.length}</p>
              </div>
              <p className="text-sm text-slate-300">Sin coincidencias</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Matches automáticos */}
      {automatic.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <Zap className="w-5 h-5" />
              Coincidencias Automáticas (Alta Confianza)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {automatic.map((result, idx) => (
              <div key={idx} className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">{result.movement.concepto}</p>
                    <p className="text-sm text-slate-600">{result.movement.fecha} - {result.movement.importe}€</p>
                  </div>
                  <Badge className="bg-green-600">
                    {result.match.confidence}% confianza
                  </Badge>
                </div>
                <div className="bg-white rounded p-2 mt-2">
                  <p className="text-sm font-medium text-slate-900">{result.match.payment.jugador_nombre}</p>
                  <p className="text-xs text-slate-600">
                    Pago esperado: {result.match.payment.cantidad}€ - {result.match.daysDiff} días de diferencia
                  </p>
                </div>
                <div className="flex gap-2 mt-2">
                  <Button 
                    size="sm" 
                    onClick={() => onMatch(result.movement, result.match.payment)}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Check className="w-4 h-4 mr-1" />
                    Confirmar
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => onSkip(result.movement)}>
                    Revisar después
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Sugerencias */}
      {suggested.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-600">
              <AlertTriangle className="w-5 h-5" />
              Sugerencias (Revisar Manualmente)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {suggested.map((result, idx) => (
              <div key={idx} className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">{result.movement.concepto}</p>
                    <p className="text-sm text-slate-600">{result.movement.fecha} - {result.movement.importe}€</p>
                  </div>
                  <Badge className="bg-yellow-600">
                    {result.match.confidence}% confianza
                  </Badge>
                </div>
                <div className="bg-white rounded p-2 mt-2">
                  <p className="text-sm font-medium text-slate-900">{result.match.payment.jugador_nombre}</p>
                  <p className="text-xs text-slate-600">
                    Pago esperado: {result.match.payment.cantidad}€ - {result.match.daysDiff} días de diferencia
                  </p>
                </div>
                <div className="flex gap-2 mt-2">
                  <Button 
                    size="sm" 
                    onClick={() => onMatch(result.movement, result.match.payment)}
                    className="bg-yellow-600 hover:bg-yellow-700"
                  >
                    <Check className="w-4 h-4 mr-1" />
                    Confirmar
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => onSkip(result.movement)}>
                    Omitir
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Sin coincidencias */}
      {unmatched.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <X className="w-5 h-5" />
              Sin Coincidencias
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {unmatched.map((result, idx) => (
              <div key={idx} className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="font-medium text-slate-900">{result.movement.concepto}</p>
                <p className="text-sm text-slate-600">{result.movement.fecha} - {result.movement.importe}€</p>
                <Button size="sm" variant="outline" onClick={() => onSkip(result.movement)} className="mt-2">
                  Marcar como revisado
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}