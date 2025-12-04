import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { CreditCard, Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// ⚠️ IMPORTANTE: Cambiar a true cuando Redsys esté configurado y listo para usar
const REDSYS_ENABLED = false;

export default function RedsysPaymentButton({
  amount,
  description,
  paymentType, // 'cuota', 'ropa', 'loteria', 'socio', 'extra'
  entityId,
  onSuccess,
  onError,
  disabled = false,
  className = "",
  variant = "default",
  size = "default",
  children
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const formRef = useRef(null);

  // Si Redsys no está habilitado, no renderizar nada
  if (!REDSYS_ENABLED) {
    return null;
  }

  const handlePayment = async () => {
    setLoading(true);
    setError(null);

    try {
      const returnUrl = window.location.href.split('?')[0];

      const response = await base44.functions.invoke('redsysPayment', {
        amount,
        description,
        paymentType,
        entityId,
        returnUrl
      });

      if (response.data.error) {
        throw new Error(response.data.error);
      }

      const { redsysUrl, params } = response.data;

      // Crear formulario oculto y enviarlo a Redsys
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = redsysUrl;
      form.style.display = 'none';

      Object.entries(params).forEach(([key, value]) => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = key;
        input.value = value;
        form.appendChild(input);
      });

      document.body.appendChild(form);
      form.submit();

    } catch (err) {
      console.error('Error iniciando pago Redsys:', err);
      setError(err.message || 'Error al procesar el pago');
      setLoading(false);
      if (onError) onError(err);
    }
  };

  const handleClick = () => {
    setShowConfirmDialog(true);
  };

  const handleConfirm = () => {
    setShowConfirmDialog(false);
    handlePayment();
  };

  return (
    <>
      <Button
        onClick={handleClick}
        disabled={disabled || loading}
        className={`bg-blue-600 hover:bg-blue-700 ${className}`}
        variant={variant}
        size={size}
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Conectando con Redsys...
          </>
        ) : (
          <>
            <CreditCard className="w-4 h-4 mr-2" />
            {children || `Pagar ${amount?.toFixed(2)}€ con tarjeta`}
          </>
        )}
      </Button>

      {error && (
        <Alert variant="destructive" className="mt-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-blue-600" />
              Confirmar Pago con Tarjeta
            </DialogTitle>
            <DialogDescription>
              Vas a realizar un pago seguro a través de Redsys
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="bg-slate-50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-600">Concepto:</span>
                <span className="font-medium text-slate-900">{description}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Importe:</span>
                <span className="font-bold text-2xl text-green-600">{amount?.toFixed(2)}€</span>
              </div>
            </div>

            <Alert className="bg-blue-50 border-blue-200">
              <CreditCard className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800 ml-2">
                Serás redirigido a la pasarela segura de Redsys para completar el pago con tu tarjeta.
              </AlertDescription>
            </Alert>

            <div className="flex items-center justify-center gap-4 pt-2">
              <img 
                src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Visa_Inc._logo.svg/200px-Visa_Inc._logo.svg.png" 
                alt="Visa" 
                className="h-6 object-contain"
              />
              <img 
                src="https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Mastercard-logo.svg/200px-Mastercard-logo.svg.png" 
                alt="Mastercard" 
                className="h-8 object-contain"
              />
              <img 
                src="https://upload.wikimedia.org/wikipedia/commons/thumb/f/fa/American_Express_logo_%282018%29.svg/200px-American_Express_logo_%282018%29.svg.png" 
                alt="American Express" 
                className="h-6 object-contain"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirm}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <CreditCard className="w-4 h-4 mr-2" />
              Continuar al pago
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Componente para verificar el estado del pago después de volver de Redsys
export function RedsysPaymentStatus({ onStatusChecked }) {
  const [checking, setChecking] = useState(false);

  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const status = urlParams.get('status');
    const orderId = urlParams.get('orderId');

    if (status && orderId) {
      checkPaymentStatus(orderId, status);
      // Limpiar la URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const checkPaymentStatus = async (orderId, urlStatus) => {
    setChecking(true);
    try {
      const response = await base44.functions.invoke('redsysPayment', {
        method: 'GET',
        orderId
      });

      if (onStatusChecked) {
        onStatusChecked({
          orderId,
          urlStatus,
          ...response.data
        });
      }
    } catch (err) {
      console.error('Error verificando estado de pago:', err);
      if (onStatusChecked) {
        onStatusChecked({
          orderId,
          urlStatus,
          error: err.message
        });
      }
    } finally {
      setChecking(false);
    }
  };

  if (checking) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="w-6 h-6 text-blue-600 animate-spin mr-2" />
        <span>Verificando estado del pago...</span>
      </div>
    );
  }

  return null;
}