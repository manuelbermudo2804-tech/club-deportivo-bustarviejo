import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Mail, CheckCircle2, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";

// Modal público: el usuario introduce su email y recibe por correo los links
// mágicos de TODAS sus porras. No se muestra nada en pantalla por seguridad.
export default function PorraRecuperarAccesosModal({ open, onOpenChange }) {
  const [email, setEmail] = useState("");
  const [enviado, setEnviado] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleEnviar = async (e) => {
    e?.preventDefault();
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Introduce un email válido");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await base44.functions.invoke('porraEnviarMisAccesos', { email: email.trim() });
      setEnviado(true);
    } catch (err) {
      setError("No se pudo enviar el email. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = (val) => {
    if (!val) {
      setTimeout(() => {
        setEmail("");
        setEnviado(false);
        setError(null);
      }, 200);
    }
    onOpenChange(val);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-orange-600" />
            Recuperar mis porras
          </DialogTitle>
          <DialogDescription>
            Te enviaremos por email los enlaces de todas tus porras.
          </DialogDescription>
        </DialogHeader>

        {enviado ? (
          <div className="text-center py-6">
            <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-3">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </div>
            <h3 className="font-black text-lg text-slate-900 mb-2">¡Email enviado!</h3>
            <p className="text-sm text-slate-600 mb-4">
              Si <strong>{email}</strong> tiene porras registradas, recibirás un email en unos segundos con todos tus accesos.
            </p>
            <p className="text-xs text-slate-500 mb-4">
              💡 Revisa también la carpeta de spam por si acaso.
            </p>
            <Button onClick={() => handleClose(false)} className="w-full bg-orange-600 hover:bg-orange-700">
              Cerrar
            </Button>
          </div>
        ) : (
          <form onSubmit={handleEnviar} className="space-y-3">
            <div>
              <label className="text-sm font-bold text-slate-700 block mb-1">Tu email</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                disabled={loading}
                autoFocus
              />
              {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
              🔒 Solo el dueño real del buzón podrá abrir los enlaces. No se mostrará nada en pantalla.
            </div>
            <Button type="submit" disabled={loading} className="w-full bg-orange-600 hover:bg-orange-700 font-bold">
              {loading ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Enviando...</>) : 'Enviarme mis accesos'}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}