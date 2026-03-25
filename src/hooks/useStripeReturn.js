import { useState, useEffect } from "react";

// Detecta retorno de Stripe (?payment=ok) y limpia la URL
export default function useStripeReturn(setExtraChargeVisible) {
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false);

  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      const payment = url.searchParams.get('payment');
      if (payment === 'ok') {
        setShowPaymentSuccess(true);
        // Suprimir banner del cobro extra
        try {
          const extraId = url.searchParams.get('extra_charge_id');
          if (extraId) {
            const arr = (() => { try { return JSON.parse(localStorage.getItem('extraChargeSuppress') || '[]'); } catch { return []; } })();
            if (!arr.includes(extraId)) {
              arr.push(extraId);
              localStorage.setItem('extraChargeSuppress', JSON.stringify(arr));
            }
          }
        } catch {}
        if (setExtraChargeVisible) setExtraChargeVisible(null);
        setTimeout(() => setShowPaymentSuccess(false), 3000);
        url.searchParams.delete('payment');
        url.searchParams.delete('type');
        url.searchParams.delete('extra_charge_id');
        url.searchParams.delete('session_id');
        const cleaned = url.pathname + (url.searchParams.toString() ? '?' + url.searchParams.toString() : '');
        window.history.replaceState({}, '', cleaned);
      }
    } catch {}
  }, []);

  return showPaymentSuccess;
}