import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Copy, CheckCircle2, QrCode, CreditCard, Info } from "lucide-react";
import { toast } from "sonner";

const CLUB_IBAN = "ES8200494447382010004048";
const CLUB_BANK = "Banco Santander";

export default function PaymentInstructions({ playerName, playerCategory, amount, paymentType, paymentMonth }) {
  const [copied, setCopied] = useState(false);
  
  const generateReference = () => {
    if (!playerName) return "";
    
    // Nombre completo en mayúsculas
    const cleanName = playerName.trim().replace(/\s+/g, ' ').toUpperCase();
    
    // Categoría abreviada pero clara (ej: "PRE", "BEN", "ALE", "INF", "CAD", "JUV", "AFI", "FEM", "BAS")
    const catMap = {
      'Pre-Benjamín': 'PRE', 'Benjamín': 'BEN', 'Alevín': 'ALE',
      'Infantil': 'INF', 'Cadete': 'CAD', 'Juvenil': 'JUV',
      'Aficionado': 'AFI', 'Femenino': 'FEM', 'Baloncesto': 'BAS'
    };
    const catCode = Object.entries(catMap).find(([k]) => (playerCategory || '').includes(k))?.[1] || 'CLUB';
    
    // Mes/tipo de pago
    const monthCode = paymentMonth || (paymentType === 'Único' ? 'UNICO' : '');
    
    // Formato: CAD GARCIA LOPEZ MARTINEZ JUN
    const parts = [catCode, cleanName, monthCode].filter(Boolean);
    return parts.join(' ');
  };

  const reference = generateReference();

  const copyToClipboard = async (text, label) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success(`${label} copiado al portapapeles`);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Error al copiar. Por favor, copia manualmente.");
    }
  };

  const copyAllData = async () => {
    const fullText = `DATOS PARA TRANSFERENCIA
━━━━━━━━━━━━━━━━━━━━━━
IBAN: ${CLUB_IBAN}
Banco: ${CLUB_BANK}
Beneficiario: CD Bustarviejo
Concepto: ${reference}
Importe: ${amount}€
━━━━━━━━━━━━━━━━━━━━━━

⚠️ IMPORTANTE: Indica el concepto exacto para identificar el pago`;

    await copyToClipboard(fullText, "Datos completos");
  };

  const generateQRUrl = () => {
    const data = `IBAN: ${CLUB_IBAN}
Concepto: ${reference}
Importe: ${amount}€`;
    
    return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(data)}`;
  };

  return (
    <Card className="border-2 border-orange-300 bg-gradient-to-br from-orange-50 to-white shadow-xl">
      <CardHeader className="bg-gradient-to-r from-orange-600 to-orange-700 text-white">
        <CardTitle className="flex items-center gap-2 text-xl">
          <CreditCard className="w-6 h-6" />
          Instrucciones de Pago
        </CardTitle>
      </CardHeader>
      
      <CardContent className="pt-6 space-y-6">
        {/* Datos Bancarios */}
        <div className="space-y-4">
          <h3 className="font-bold text-lg flex items-center gap-2 text-slate-900">
            💳 Datos para Transferencia Bancaria
          </h3>
          
          <div className="bg-white rounded-xl p-4 border-2 border-slate-200 space-y-3">
            {/* IBAN */}
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <div className="flex-1">
                <p className="text-xs text-slate-600 font-medium mb-1">IBAN</p>
                <p className="font-mono font-bold text-sm md:text-base text-slate-900 tracking-wider">{CLUB_IBAN}</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => copyToClipboard(CLUB_IBAN, "IBAN")}
                className="ml-2"
              >
                {copied ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>

            {/* Banco */}
            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="text-xs text-slate-600 font-medium mb-1">Banco</p>
              <p className="font-semibold text-slate-900">{CLUB_BANK}</p>
            </div>

            {/* Beneficiario */}
            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="text-xs text-slate-600 font-medium mb-1">Beneficiario</p>
              <p className="font-semibold text-slate-900">CD Bustarviejo</p>
            </div>

            {/* Concepto - IMPORTANTE */}
            {reference && (
              <div className="p-3 bg-orange-100 rounded-lg border-2 border-orange-400">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-orange-900 font-bold">⚠️ CONCEPTO (Obligatorio)</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(reference, "Concepto")}
                    className="bg-white"
                  >
                    {copied ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
                <p className="font-mono font-bold text-lg text-orange-900">{reference}</p>
                <p className="text-xs text-orange-800 mt-2">
                  Este concepto identifica tu pago. Cópialo exactamente en la transferencia.
                </p>
              </div>
            )}

            {/* Importe */}
            {amount > 0 && (
              <div className="p-3 bg-green-50 rounded-lg border-2 border-green-300">
                <p className="text-xs text-green-900 font-medium mb-1">Importe a Pagar</p>
                <p className="font-bold text-3xl text-green-700">{amount.toFixed(2)}€</p>
              </div>
            )}
          </div>

          {/* Botón copiar todo */}
          <Button
            onClick={copyAllData}
            className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold py-6"
          >
            <Copy className="w-5 h-5 mr-2" />
            Copiar Todos los Datos
          </Button>
        </div>

        {/* Código QR */}
        {reference && amount > 0 && (
          <div className="space-y-3">
            <h3 className="font-bold text-lg flex items-center gap-2 text-slate-900">
              <QrCode className="w-6 h-6 text-orange-600" />
              Código QR (Datos de Pago)
            </h3>
            <div className="bg-white p-6 rounded-xl border-2 border-slate-200 flex flex-col items-center">
              <img 
                src={generateQRUrl()} 
                alt="QR Code" 
                className="w-48 h-48 border-4 border-slate-100 rounded-lg shadow-lg"
              />
              <p className="text-xs text-slate-600 mt-3 text-center">
                Escanea este código para ver los datos de pago
              </p>
            </div>
          </div>
        )}

        {/* Instrucciones adicionales */}
        <Alert className="bg-slate-50 border-slate-300">
          <Info className="h-4 w-4 text-slate-600" />
          <AlertDescription className="text-slate-800 text-sm">
            <strong>📋 Pasos a seguir:</strong>
            <ol className="list-decimal list-inside mt-2 space-y-1">
              <li>Copia los datos de la transferencia (usa el botón)</li>
              <li>Realiza el pago desde tu banco (app o web)</li>
              <li>Indica el <strong>concepto exacto</strong> en la transferencia</li>
              <li>Haz una captura del justificante</li>
              <li>Súbelo en el formulario de abajo</li>
            </ol>
          </AlertDescription>
        </Alert>

        <Alert className="bg-blue-50 border-blue-300">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-900 text-sm">
            <strong>💡 Consejo:</strong> Guarda el número de cuenta en tus contactos bancarios para pagos futuros.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}