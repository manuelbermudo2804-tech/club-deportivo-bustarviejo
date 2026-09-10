import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Mail, Loader2, Send } from "lucide-react";
import { toast } from "sonner";

/** Envío del recordatorio "con qué correo estás dado de alta" a todas las familias. */
export default function RecordarCorreoAccesoCard() {
  const [enviando, setEnviando] = useState(false);
  const [emailPrueba, setEmailPrueba] = useState("");
  const [resultado, setResultado] = useState(null);

  const enviar = async (soloPrueba) => {
    if (!soloPrueba && !window.confirm("Se enviará un correo a TODOS los usuarios de la app recordándoles con qué correo entran. ¿Continuar?")) return;
    setEnviando(true);
    setResultado(null);
    try {
      const { data } = await base44.functions.invoke("recordarCorreoAcceso",
        soloPrueba ? { test_email: emailPrueba.trim() } : {});
      if (data?.error) throw new Error(data.error);
      setResultado(data);
      toast.success(`Enviados ${data.enviados} de ${data.total}`);
    } catch (e) {
      toast.error("Error al enviar: " + e.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Card className="border-2 border-orange-300">
      <CardHeader className="bg-gradient-to-r from-orange-50 to-amber-50">
        <CardTitle className="text-orange-900 flex items-center gap-2">
          <Mail className="w-5 h-5" /> Recordar a las familias su correo de acceso
        </CardTitle>
        <p className="text-sm text-orange-800">
          Envía a cada persona un correo indicándole con qué dirección está dada de alta y pidiéndole que no cree cuentas nuevas.
        </p>
      </CardHeader>
      <CardContent className="pt-6 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={emailPrueba}
            onChange={(e) => setEmailPrueba(e.target.value)}
            placeholder="correo@para.probar"
            className="max-w-xs"
          />
          <Button variant="outline" disabled={enviando || !emailPrueba.trim()} onClick={() => enviar(true)}>
            Enviar prueba
          </Button>
        </div>

        <Button
          onClick={() => enviar(false)}
          disabled={enviando}
          className="bg-orange-600 hover:bg-orange-700"
        >
          {enviando ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Enviando...</> : <><Send className="w-4 h-4 mr-2" /> Enviar a todas las familias</>}
        </Button>

        {resultado && (
          <Alert className="bg-green-50 border-green-200">
            <AlertDescription className="text-green-800 text-sm">
              Enviados <strong>{resultado.enviados}</strong> de {resultado.total}.
              {resultado.errores?.length > 0 && <> No se pudo enviar a {resultado.errores.length} direcciones.</>}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}