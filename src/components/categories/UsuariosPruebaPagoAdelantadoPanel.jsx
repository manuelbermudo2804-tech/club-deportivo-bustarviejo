import React, { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FlaskConical, Save, Info } from "lucide-react";
import { toast } from "sonner";

/** Gestión de los correos autorizados para el modo de prueba de pago anticipado. */
export default function UsuariosPruebaPagoAdelantadoPanel({ season, categories = [] }) {
  const qc = useQueryClient();
  const [emailsText, setEmailsText] = useState("");
  const [dirty, setDirty] = useState(false);
  const modoPruebaActivo = categories.some(c => c.pago_adelantado === true && c.pago_adelantado_prueba === true);

  useEffect(() => {
    setEmailsText((Array.isArray(season?.pago_adelantado_emails_prueba) ? season.pago_adelantado_emails_prueba : []).join("\n"));
    setDirty(false);
  }, [season?.id, season?.pago_adelantado_emails_prueba]);

  const guardar = useMutation({
    mutationFn: async () => {
      if (!season?.id) throw new Error("No se ha encontrado la temporada activa");
      const emails = [...new Set(emailsText.split(/[\\n,;\\s]+/).map(e => e.trim().toLowerCase()).filter(Boolean))];
      const invalidos = emails.filter(e => !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(e));
      if (invalidos.length) throw new Error(`Correo no válido: ${invalidos[0]}`);
      await base44.entities.SeasonConfig.update(season.id, { pago_adelantado_emails_prueba: emails });
      return emails;
    },
    onSuccess: async (emails) => {
      await qc.invalidateQueries({ queryKey: ["seasons"] });
      await qc.invalidateQueries();
      setEmailsText(emails.join("\n"));
      setDirty(false);
      toast.success(`Usuarios de prueba guardados (${emails.length})`);
    },
    onError: (e) => toast.error(e?.message || "No se pudieron guardar los usuarios de prueba"),
  });

  if (!modoPruebaActivo) return null;

  return (
    <Card className="border-2 border-amber-300 bg-amber-50/60 shadow-sm rounded-2xl">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-amber-950 text-base sm:text-lg">
          <FlaskConical className="h-5 w-5" /> Usuarios autorizados para probar el pago anticipado
        </CardTitle>
        <p className="text-sm text-amber-900">Temporada {season?.temporada || "activa"}. Este campo aparece mientras haya alguna categoría en modo 🧪 Prueba.</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <Label htmlFor="prepago-test-emails">Correo electrónico de cada usuario (uno por línea, también admite comas)</Label>
          <textarea
            id="prepago-test-emails"
            value={emailsText}
            onChange={(e) => { setEmailsText(e.target.value); setDirty(true); }}
            placeholder="tuusuario@correo.com"
            rows={3}
            className="mt-2 flex w-full rounded-md border border-amber-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
            autoComplete="off"
            inputMode="email"
          />
          <p className="mt-1 text-xs text-slate-600">Solo estas cuentas podrán ver el flujo de prueba y saltarse Stripe mediante la opción de prueba. El resto de familias seguirá viendo el formulario habitual.</p>
        </div>
        <Alert className="border-amber-200 bg-white">
          <Info className="h-4 w-4 text-amber-700" />
          <AlertDescription className="text-sm text-slate-700">Activa 🧪 Prueba en la categoría que quieras ensayar y guarda aquí el correo de la cuenta con la que iniciarás sesión.</AlertDescription>
        </Alert>
        <div className="flex justify-end">
          <Button onClick={() => guardar.mutate()} disabled={!dirty || guardar.isPending} className="bg-amber-600 hover:bg-amber-700 text-white">
            <Save className="mr-2 h-4 w-4" /> {guardar.isPending ? "Guardando…" : "Guardar usuarios de prueba"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
