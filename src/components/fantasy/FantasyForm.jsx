import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trophy, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";

export default function FantasyForm({ config, onSuccess }) {
  const [data, setData] = useState({
    nickname: "", nombre: "", email: "", telefono: "",
    campeon: "", subcampeon: "", semifinalista_3: "", semifinalista_4: "",
    maximo_goleador: "", seleccion_sorpresa: "",
    resultado_final_local: "", resultado_final_visitante: "",
    acepta_bases: false,
  });
  const [loading, setLoading] = useState(false);

  const selecciones = config?.selecciones_disponibles || [];
  const goleadores = config?.goleadores_candidatos || [];

  const update = (k, v) => setData((d) => ({ ...d, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!data.acepta_bases) return toast.error("Debes aceptar las bases");
    if (!data.nickname.trim()) return toast.error("El nickname es obligatorio");
    if (!data.campeon || !data.subcampeon) return toast.error("Selecciona campeón y subcampeón");
    if (data.campeon === data.subcampeon) return toast.error("Campeón y subcampeón deben ser distintos");
    const semis = [data.campeon, data.subcampeon, data.semifinalista_3, data.semifinalista_4].filter(Boolean);
    if (new Set(semis).size !== semis.length) return toast.error("Las 4 semifinalistas deben ser distintas");
    if (!data.maximo_goleador || !data.seleccion_sorpresa) return toast.error("Completa goleador y sorpresa");

    setLoading(true);
    try {
      const payload = {
        nickname: data.nickname.trim(),
        nombre: data.nombre.trim(),
        email: data.email.trim().toLowerCase(),
        telefono: data.telefono.trim(),
        campeon: data.campeon,
        subcampeon: data.subcampeon,
        semifinalistas: [data.campeon, data.subcampeon, data.semifinalista_3, data.semifinalista_4].filter(Boolean),
        maximo_goleador: data.maximo_goleador,
        seleccion_sorpresa: data.seleccion_sorpresa,
        resultado_final_local: data.resultado_final_local !== "" ? Number(data.resultado_final_local) : null,
        resultado_final_visitante: data.resultado_final_visitante !== "" ? Number(data.resultado_final_visitante) : null,
        acepta_bases: true,
        user_agent: navigator.userAgent,
      };
      const res = await base44.functions.invoke("fantasyMundialRegister", payload);
      if (res?.data?.success) {
        toast.success("¡Inscripción registrada! 🎉");
        onSuccess?.(res.data.entry);
      } else {
        toast.error(res?.data?.error || "Error al registrar");
      }
    } catch (err) {
      toast.error(err?.message || "Error inesperado");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-2 border-indigo-200">
      <CardContent className="p-5 lg:p-6">
        <div className="flex items-center gap-2 mb-5">
          <Trophy className="w-5 h-5 text-indigo-600" />
          <h3 className="font-black text-slate-900 text-lg">Tus predicciones</h3>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Datos personales */}
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <Label>Nickname *</Label>
              <Input value={data.nickname} onChange={(e) => update("nickname", e.target.value)} placeholder="LoloFC" maxLength={30} />
              <p className="text-xs text-slate-500 mt-1">Será visible en la clasificación y se usa en el Bizum</p>
            </div>
            <div>
              <Label>Nombre completo *</Label>
              <Input value={data.nombre} onChange={(e) => update("nombre", e.target.value)} required />
            </div>
            <div>
              <Label>Email *</Label>
              <Input type="email" value={data.email} onChange={(e) => update("email", e.target.value)} required />
            </div>
            <div>
              <Label>Teléfono *</Label>
              <Input type="tel" value={data.telefono} onChange={(e) => update("telefono", e.target.value)} required />
            </div>
          </div>

          <hr />

          {/* Predicciones */}
          <div className="grid md:grid-cols-2 gap-3">
            <SelectField label="🏆 Campeón *" value={data.campeon} onChange={(v) => update("campeon", v)} options={selecciones} />
            <SelectField label="🥈 Subcampeón *" value={data.subcampeon} onChange={(v) => update("subcampeon", v)} options={selecciones} />
            <SelectField label="⚽ Otro semifinalista" value={data.semifinalista_3} onChange={(v) => update("semifinalista_3", v)} options={selecciones} />
            <SelectField label="⚽ Otro semifinalista" value={data.semifinalista_4} onChange={(v) => update("semifinalista_4", v)} options={selecciones} />
            <SelectField label="👟 Máximo goleador *" value={data.maximo_goleador} onChange={(v) => update("maximo_goleador", v)} options={goleadores} />
            <SelectField label="✨ Selección sorpresa *" value={data.seleccion_sorpresa} onChange={(v) => update("seleccion_sorpresa", v)} options={selecciones} />
          </div>

          <div className="bg-slate-50 rounded-xl p-4">
            <Label className="block mb-2">🎯 Resultado exacto de la final (opcional, +30 pts)</Label>
            <div className="flex items-center gap-3">
              <Input type="number" min="0" max="20" placeholder="0" value={data.resultado_final_local} onChange={(e) => update("resultado_final_local", e.target.value)} className="w-20 text-center text-lg font-bold" />
              <span className="font-bold text-slate-500">-</span>
              <Input type="number" min="0" max="20" placeholder="0" value={data.resultado_final_visitante} onChange={(e) => update("resultado_final_visitante", e.target.value)} className="w-20 text-center text-lg font-bold" />
              <span className="text-xs text-slate-500">(Campeón - Subcampeón)</span>
            </div>
          </div>

          <label className="flex items-start gap-3 cursor-pointer">
            <Checkbox checked={data.acepta_bases} onCheckedChange={(v) => update("acepta_bases", !!v)} className="mt-0.5" />
            <span className="text-sm text-slate-700">Acepto las bases del Fantasy Mundial CDB y entiendo que debo abonar 10€ por Bizum con el concepto <strong>"Fantasy {data.nickname || "Nickname"}"</strong> para validar mi inscripción.</span>
          </label>

          <Button type="submit" disabled={loading} className="w-full h-12 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-base font-bold">
            {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Enviando...</> : "🚀 Enviar predicciones"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <div>
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger><SelectValue placeholder="Selecciona..." /></SelectTrigger>
        <SelectContent>
          {(options || []).map((opt) => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}