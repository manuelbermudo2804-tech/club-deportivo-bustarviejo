import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CreditCard, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

/**
 * Gate previo de inscripción. Se mantiene separado de PlayerFormWizard para no
 * modificar el formulario original. Las sesiones de Stripe se verifican siempre
 * en servidor antes de abrir el formulario.
 */
export default function PreRegistrationGate({ categoryConfigs = [], seasonConfig, userEmail, onContinue, onCancel }) {
  const [category, setCategory] = useState("");
  const [modality, setModality] = useState("Único");
  const [busy, setBusy] = useState(false);
  const [returning, setReturning] = useState(false);
  const configs = useMemo(() => {
    const season = seasonConfig?.temporada;
    const current = categoryConfigs.filter(c => c.activa !== false && (!season || !c.temporada || c.temporada === season));
    return [...new Map(current.map(c => [c.nombre, c])).values()];
  }, [categoryConfigs, seasonConfig?.temporada]);
  const selected = configs.find(c => c.nombre === category);
  const requiresPayment = selected?.exigir_primer_pago === true;
  const amount = selected ? Number(modality === "Único" ? selected.cuota_total : selected.cuota_inscripcion) : 0;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id");
    if (!sessionId || returning) return;
    let pending;
    try { pending = JSON.parse(window.sessionStorage.getItem("cdb_pre_registration_gate") || "null"); } catch {}
    if (!pending || pending.userEmail !== (userEmail || "")) return;
    setReturning(true);
    setBusy(true);
    (async () => {
      try {
        const { data } = await base44.functions.invoke("verifyPreRegistrationPayment", { sessionId });
        if (!data?.paid) throw new Error(data?.error || "Stripe todavía no confirma el pago.");
        if (data.categoria !== pending.category || data.modalidad !== pending.modality ||
            (seasonConfig?.temporada && data.temporada !== seasonConfig.temporada)) {
          throw new Error("El pago no coincide con la categoría, temporada o modalidad seleccionada.");
        }
        window.sessionStorage.setItem("cdb_pre_registration_verified", JSON.stringify({
          sessionId, category: data.categoria, modality: data.modalidad,
          season: data.temporada, amount: data.amount, userEmail: userEmail || ""
        }));
        window.sessionStorage.removeItem("cdb_pre_registration_gate");
        params.delete("session_id");
        window.history.replaceState({}, "", window.location.pathname + (params.toString() ? "?" + params.toString() : "") + window.location.hash);
        toast.success("Pago confirmado. Ahora puedes completar la inscripción.");
        onContinue({ category: data.categoria, modality: data.modalidad, sessionId });
      } catch (error) {
        toast.error(error?.message || "No se pudo verificar el pago.");
        params.delete("session_id");
        window.history.replaceState({}, "", window.location.pathname + (params.toString() ? "?" + params.toString() : "") + window.location.hash);
      } finally {
        setBusy(false);
        setReturning(false);
      }
    })();
  }, [userEmail, seasonConfig?.temporada]);

  const proceed = async () => {
    if (!selected) { toast.error("Selecciona una categoría."); return; }
    if (!requiresPayment) { onContinue({ category, requiresPayment: false }); return; }
    if (!["Único", "Tres meses"].includes(modality)) { toast.error("Selecciona una modalidad válida."); return; }
    if (!Number.isFinite(amount) || amount <= 0) { toast.error("La categoría no tiene un importe válido configurado."); return; }
    setBusy(true);
    try {
      const season = seasonConfig?.temporada || selected.temporada;
      if (!season) throw new Error("No se ha podido determinar la temporada activa.");
      window.sessionStorage.setItem("cdb_pre_registration_gate", JSON.stringify({
        category, modality, userEmail: userEmail || ""
      }));
      const returnUrl = window.location.origin + window.location.pathname + window.location.search;
      const { data } = await base44.functions.invoke("preRegistrationCheckout", {
        categoria: category, modalidad: modality, temporada: season,
        successUrl: returnUrl, cancelUrl: returnUrl
      });
      if (!data?.success || !data?.url) throw new Error(data?.error || "No se pudo iniciar el pago.");
      window.location.assign(data.url);
    } catch (error) {
      window.sessionStorage.removeItem("cdb_pre_registration_gate");
      toast.error(error?.message || "No se pudo iniciar el pago con tarjeta.");
      setBusy(false);
    }
  };

  if (busy) return <Card className="mx-auto max-w-xl"><CardContent className="flex items-center gap-3 p-8"><Loader2 className="h-5 w-5 animate-spin" /><span>{returning ? "Verificando el pago con Stripe…" : "Preparando el pago seguro…"}</span></CardContent></Card>;

  return <Card className="mx-auto max-w-xl border-2 border-orange-200 shadow-xl">
    <CardHeader className="bg-gradient-to-r from-slate-900 to-orange-900 text-white rounded-t-lg">
      <CardTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5" /> Antes de la inscripción</CardTitle>
      <p className="text-sm text-orange-100">Selecciona categoría y modalidad. Si la categoría exige pago previo, completarás el pago con tarjeta antes de abrir el formulario.</p>
    </CardHeader>
    <CardContent className="space-y-5 p-5">
      <div className="space-y-2">
        <label className="text-sm font-semibold">Categoría</label>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger><SelectValue placeholder="Elige la categoría" /></SelectTrigger>
          <SelectContent>{configs.map(c => <SelectItem key={c.id || c.nombre} value={c.nombre}>{c.nombre}{c.exigir_primer_pago === true ? " · Pago previo" : ""}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      {#if selected}
        {requiresPayment ? <div className="space-y-3">
          <div className="space-y-2">
            <label className="text-sm font-semibold">Modalidad de pago</label>
            <Select value={modality} onValueChange={setModality}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Único">Pago único · temporada completa ({Number(selected.cuota_total || 0)} €)</SelectItem>
                <SelectItem value="Tres meses">Tres pagos · abonar ahora inscripción ({Number(selected.cuota_inscripcion || 0)} €)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Alert><ShieldCheck className="h-4 w-4" /><AlertDescription>Pago con tarjeta mediante Stripe. El formulario se abrirá después de confirmar el cobro.</AlertDescription></Alert>
          <div className="rounded-xl bg-orange-50 p-4 text-center"><p className="text-sm text-slate-600">Importe a pagar ahora</p><p className="text-3xl font-bold text-orange-800">{Number.isFinite(amount) ? amount.toFixed(2) : "—"} €</p></div>
        </div> : <Alert><AlertDescription>Esta categoría no exige pago previo. Continuarás con el proceso de inscripción habitual.</AlertDescription></Alert>}
      {/if}
      <div className="flex gap-3">
        <Button variant="outline" className="flex-1" onClick={onCancel} disabled={busy}>Cancelar</Button>
        <Button className="flex-1 bg-orange-600 hover:bg-orange-700" onClick={proceed} disabled={!selected || busy}>{requiresPayment ? "Pagar y continuar" : "Continuar al formulario"}</Button>
      </div>
    </CardContent>
  </Card>;
}
