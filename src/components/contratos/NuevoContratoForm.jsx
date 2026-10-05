import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { sha256 } from "./contratoPdf";
import { toast } from "sonner";

export default function NuevoContratoForm({ onCreated }) {
  const [email, setEmail] = useState("");
  const [titulo, setTitulo] = useState("Acuerdo de incorporación como voluntario");
  const [texto, setTexto] = useState("");
  const [saving, setSaving] = useState(false);

  // Entrenadores/coordinadores adultos + menores en prácticas (con su acceso de menor)
  const { data: personas = [] } = useQuery({
    queryKey: ["firmantesContrato"],
    queryFn: async () => {
      const [users, players] = await Promise.all([
        base44.entities.User.list(),
        base44.entities.Player.filter({ "entrenador_practicas.activo": true }),
      ]);
      const staff = users.filter((u) => u.es_entrenador || u.es_coordinador)
        .map((u) => ({ email: u.email, nombre: u.full_name || u.email, menor: false }));
      const menores = players.filter((p) => p.acceso_menor_email)
        .map((p) => ({ email: p.acceso_menor_email, nombre: p.nombre, menor: true }));
      return [...staff, ...menores];
    },
  });

  const crear = async () => {
    setSaving(true);
    const p = personas.find((s) => s.email === email);
    await base44.entities.ContratoVoluntariado.create({
      entrenador_email: email, entrenador_nombre: p?.nombre || email, es_menor: !!p?.menor,
      titulo, texto, texto_hash: await sha256(texto), estado: "pendiente",
    });
    toast.success("Acuerdo enviado. Le aparecerá al abrir la app.");
    setEmail(""); setTexto(""); setSaving(false);
    onCreated();
  };

  return (
    <div className="bg-white rounded-xl border p-4 space-y-3">
      <h2 className="font-bold">Nuevo acuerdo</h2>
      <Select value={email} onValueChange={setEmail}>
        <SelectTrigger><SelectValue placeholder="Elige quién firma" /></SelectTrigger>
        <SelectContent>
          {personas.map((s) => (
            <SelectItem key={s.email} value={s.email}>{s.nombre}{s.menor ? " · en prácticas (menor)" : ""}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Título" />
      <Textarea rows={10} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Pega aquí el texto del acuerdo" />
      <Button disabled={!email || !texto.trim() || saving} onClick={crear} className="w-full bg-orange-600 hover:bg-orange-700">
        {saving ? "Enviando..." : "Enviar para firmar"}
      </Button>
    </div>
  );
}