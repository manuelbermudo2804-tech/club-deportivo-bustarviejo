import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { CreditCard, ShieldCheck, FlaskConical, CheckCircle2, ArrowRight, RotateCcw } from "lucide-react";

/** Vista previa aislada: no invoca Stripe ni crea jugadores/pagos. */
export default function UpfrontPaymentPreview({ categories = [] }) {
  const [previewEnabled, setPreviewEnabled] = useState(true);
  const [testMode, setTestMode] = useState(true);
  const [categoryName, setCategoryName] = useState("");
  const [paymentPlan, setPaymentPlan] = useState("Tres meses");
  const [stage, setStage] = useState("category");
  const selected = categories.find(c => c.nombre === categoryName) || categories.find(c => c.exigir_primer_pago) || categories[0];
  const upfrontRequired = previewEnabled && selected?.exigir_primer_pago === true;
  const amount = selected ? (paymentPlan === "Único" ? Number(selected.cuota_total ?? ((selected.cuota_inscripcion || 0) + (selected.cuota_segunda || 0) + (selected.cuota_tercera || 0))) : Number(selected.cuota_inscripcion || 0)) : 0;
  const reset = () => setStage("category");

  return (
    <Card className="border-2 border-orange-200 shadow-sm">
      <CardHeader className="bg-gradient-to-r from-orange-50 to-slate-50">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-slate-900"><FlaskConical className="h-5 w-5 text-orange-600" />Vista previa · Pago previo de inscripción</CardTitle>
            <p className="mt-1 text-sm text-slate-600">Prueba el recorrido sin crear jugadores, cuotas ni sesiones de pago.</p>
          </div>
          <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Simulación segura</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 p-4 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex items-center justify-between gap-3 rounded-xl border p-3">
            <div><p className="font-semibold text-sm">Exigir pago previo</p><p className="text-xs text-slate-500">Solo para esta vista previa</p></div>
            <Switch checked={previewEnabled} onCheckedChange={(v) => { setPreviewEnabled(v); reset(); }} aria-label="Simular pago previo activado" />
          </div>
          <div className="flex items-center justify-between gap-3 rounded-xl border p-3">
            <div><p className="font-semibold text-sm">Modo de pruebas</p><p className="text-xs text-slate-500">No conecta con Stripe</p></div>
            <Switch checked={testMode} onCheckedChange={setTestMode} aria-label="Modo de pruebas" />
          </div>
        </div>
        {!testMode && <Alert className="border-amber-300 bg-amber-50"><AlertDescription className="text-amber-900">Esta pantalla es una simulación aislada. No inicia pagos reales aunque desactives este interruptor.</AlertDescription></Alert>}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1"><label className="text-sm font-medium" htmlFor="preview-category">Categoría de ejemplo</label><select id="preview-category" className="h-11 w-full rounded-md border bg-white px-3 text-sm" value={categoryName || selected?.nombre || ""} onChange={e => { setCategoryName(e.target.value); reset(); }}><option value="" disabled>Selecciona una categoría</option>{categories.map(c => <option key={c.id || c.nombre} value={c.nombre}>{c.nombre}{c.exigir_primer_pago ? " · pago exigido" : ""}</option>)}</select></div>
          <div className="space-y-1"><label className="text-sm font-medium" htmlFor="preview-plan">Modalidad</label><select id="preview-plan" className="h-11 w-full rounded-md border bg-white px-3 text-sm" value={paymentPlan} onChange={e => { setPaymentPlan(e.target.value); reset(); }}><option value="Único">Pago único · temporada completa</option><option value="Tres meses">Tres plazos · junio primero</option></select></div>
        </div>
        <div className="rounded-2xl border bg-white p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3"><p className="font-bold text-slate-900">Recorrido de la familia</p><Badge variant="outline">Paso {stage === "category" ? 1 : stage === "payment" ? 2 : stage === "confirmed" ? 3 : 4} de {upfrontRequired ? 4 : 2}</Badge></div>
          <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
            <span className="rounded-full bg-slate-100 px-3 py-2 font-medium">1. Categoría</span><ArrowRight className="h-4 w-4 text-slate-400" />
            {upfrontRequired ? <><span className={`rounded-full px-3 py-2 font-medium ${stage !== "category" ? "bg-orange-100 text-orange-900" : "bg-orange-50 text-orange-800"}`}>2. Pago previo</span><ArrowRight className="h-4 w-4 text-slate-400" /><span className={`rounded-full px-3 py-2 font-medium ${stage === "confirmed" || stage === "form" ? "bg-emerald-100 text-emerald-900" : "bg-slate-100"}`}>3. Confirmación</span><ArrowRight className="h-4 w-4 text-slate-400" /><span className={`rounded-full px-3 py-2 font-medium ${stage === "form" ? "bg-blue-100 text-blue-900" : "bg-slate-100"}`}>4. Formulario</span></> : <span className="rounded-full bg-blue-100 px-3 py-2 font-medium text-blue-900">2. Formulario habitual</span>}
          </div>
          {upfrontRequired && stage !== "form" && <div className="mt-4 rounded-xl border border-orange-200 bg-orange-50 p-4"><div className="flex items-start gap-3"><CreditCard className="mt-1 h-5 w-5 shrink-0 text-orange-700"/><div className="flex-1"><p className="font-bold text-orange-950">{stage === "category" ? "Pago necesario para continuar" : stage === "payment" ? "Pago de inscripción" : "Pago confirmado (simulación)"}</p><p className="mt-1 text-sm text-orange-900">{stage === "category" ? `La modalidad seleccionada requiere ${paymentPlan === "Único" ? "el pago completo de la temporada" : "pagar primero la cuota de junio"}.` : stage === "payment" ? "En producción, aquí se abrirá el método de pago configurado. Esta simulación no cobra ni valida pagos reales." : "En la prueba se simula una confirmación; no se guarda en la base de datos."}</p>{stage !== "category" && <p className="mt-3 text-2xl font-bold text-slate-950">{amount.toLocaleString("es-ES", {style:"currency",currency:"EUR"})}</p>}</div></div></div>}
          {!upfrontRequired && <Alert className="mt-4 border-blue-200 bg-blue-50"><AlertDescription className="text-blue-900">El pago previo no se exige en esta categoría. Se mantiene el flujo normal: se abre el formulario habitual y su paso final de cuotas sigue funcionando como hasta ahora.</AlertDescription></Alert>}
          {stage === "form" && upfrontRequired && <Alert className="mt-4 border-emerald-200 bg-emerald-50"><CheckCircle2 className="h-4 w-4 text-emerald-700"/><AlertDescription className="text-emerald-900">Formulario habitual listo para mostrarse. En este flujo no debe repetirse la elección de modalidad ni volver a generar el pago ya realizado.</AlertDescription></Alert>}
          <div className="mt-5 flex flex-wrap gap-2">
            {upfrontRequired ? <>
              {stage === "category" && <Button onClick={() => setStage("payment")} className="bg-orange-600 hover:bg-orange-700">Continuar al pago <ArrowRight className="ml-2 h-4 w-4"/></Button>}
              {stage === "payment" && <><Button variant="outline" onClick={reset}>Cancelar pago</Button><Button onClick={() => setStage("confirmed")} className="bg-orange-600 hover:bg-orange-700">Simular pago confirmado</Button></>}
              {stage === "confirmed" && <Button onClick={() => setStage("form")} className="bg-emerald-600 hover:bg-emerald-700">Continuar al formulario <ArrowRight className="ml-2 h-4 w-4"/></Button>}
              {stage === "form" && <Button variant="outline" onClick={reset}><RotateCcw className="mr-2 h-4 w-4"/>Repetir prueba</Button>}
            </> : <Button onClick={() => setStage(stage === "form" ? "category" : "form")} className="bg-blue-600 hover:bg-blue-700">{stage === "form" ? "Volver a empezar" : "Ver formulario habitual"}</Button>}
          </div>
        </div>
        <p className="text-xs text-slate-500">La simulación solo cambia esta vista. No altera la configuración guardada de categorías y no crea jugadores, pagos, reservas ni cobros.</p>
      </CardContent>
    </Card>
  );
}
