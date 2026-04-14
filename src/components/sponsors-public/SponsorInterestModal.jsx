import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";

export default function SponsorInterestModal({ open, onOpenChange, posicion, currentCount }) {
  const [form, setForm] = useState({ nombre_comercio: "", nombre_contacto: "", email: "", telefono: "", interesa_carnet_socio: false });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [resultCount, setResultCount] = useState(null);

  const [error, setError] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(false);
    try {
      const res = await base44.functions.invoke("submitSponsorInterest", { ...form, posicion });
      setResultCount(res.data?.count || 1);
      setSuccess(true);
    } catch (err) {
      console.error("Error submitting sponsor interest:", err);
      setError(true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      setSuccess(false);
      setResultCount(null);
      setError(false);
      setForm({ nombre_comercio: "", nombre_contacto: "", email: "", telefono: "", interesa_carnet_socio: false });
    }, 300);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md mx-auto">
        {success ? (
          <div className="text-center py-8 animate-fade-in-scale">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5">
              <CheckCircle2 className="w-12 h-12 text-green-500" />
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-2">¡Solicitud enviada! 🎉</h3>
            <p className="text-slate-600 mb-3">
              Hemos registrado tu interés en <strong>{posicion}</strong>.
            </p>
            {resultCount > 1 && (
              <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 mb-4">
                <p className="text-sm font-bold text-amber-800">
                  ⚠️ Hay {resultCount} interesados en esta posición
                </p>
                <p className="text-xs text-amber-700 mt-1">
                  Si hay más de un interesado, la posición se adjudicará mediante subasta. El club contactará con todos los candidatos.
                </p>
              </div>
            )}
            <p className="text-sm text-slate-500">Nos pondremos en contacto contigo pronto.</p>
            <Button onClick={handleClose} className="mt-4 bg-orange-500 hover:bg-orange-600">Cerrar</Button>
          </div>
        ) : (
          <>
            <div className="mb-4">
              <h3 className="text-lg font-bold text-slate-900">Me interesa: {posicion}</h3>
              <p className="text-sm text-slate-500 mt-1">Déjanos tus datos y nos pondremos en contacto.</p>
              {currentCount > 0 && (
                <div className="mt-3 bg-amber-50 border border-amber-300 rounded-xl p-3 flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-amber-800">
                      Ya hay {currentCount} interesado{currentCount > 1 ? "s" : ""} en esta posición
                    </p>
                    <p className="text-xs text-amber-700 mt-0.5">
                      Si hay más de un candidato, se decidirá mediante subasta.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Nombre de tu comercio / empresa *</Label>
                <Input
                  required
                  value={form.nombre_comercio}
                  onChange={(e) => setForm({ ...form, nombre_comercio: e.target.value })}
                  placeholder="Ej: Bar El Rincón"
                />
              </div>
              <div>
                <Label>Tu nombre y apellidos *</Label>
                <Input
                  required
                  value={form.nombre_contacto}
                  onChange={(e) => setForm({ ...form, nombre_contacto: e.target.value })}
                  placeholder="Ej: Juan García López"
                />
              </div>
              <div>
                <Label>Email *</Label>
                <Input
                  required
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="tu@email.com"
                />
              </div>
              <div>
                <Label>Teléfono *</Label>
                <Input
                  required
                  type="tel"
                  value={form.telefono}
                  onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                  placeholder="600 123 456"
                />
              </div>
              <div className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-xl p-3">
                <Checkbox
                  id="carnet_socio"
                  checked={form.interesa_carnet_socio}
                  onCheckedChange={(checked) => setForm({ ...form, interesa_carnet_socio: !!checked })}
                  className="mt-0.5"
                />
                <label htmlFor="carnet_socio" className="text-sm text-slate-700 leading-snug cursor-pointer">
                  {"Tambi\u00e9n me interesa participar en el "}
                  <strong>Carnet de Socio</strong>
                  {" (ofrecer ventajas a socios del club)"}
                </label>
              </div>
              {error && (
                <div className="bg-red-50 border border-red-300 rounded-xl p-3 text-center">
                  <p className="text-sm font-bold text-red-700">❌ Error al enviar. Inténtalo de nuevo.</p>
                </div>
              )}
              <Button
                type="submit"
                disabled={submitting}
                className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold py-3"
              >
                {submitting ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Enviando...</> : "Enviar solicitud"}
              </Button>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}