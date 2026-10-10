import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { sha256 } from "./contratoPdf";
import { PLANTILLAS } from "./plantillasDocumentos";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { useFirmaClub } from "./FirmaClubConfig";

const rellenar = (t, nombre, jugador) => t.replaceAll("{nombre}", nombre || "").replaceAll("{jugador}", jugador || "");

export default function NuevoContratoForm({ onCreated }) {
  const [tipo, setTipo] = useState("voluntariado");
  const [destino, setDestino] = useState("");
  const [titulo, setTitulo] = useState(PLANTILLAS[0].titulo);
  const [texto, setTexto] = useState("");
  const [saving, setSaving] = useState(false);
  const [conSello, setConSello] = useState(false);
  const { data: firmaClub } = useFirmaClub();
  const hayFirmaClub = !!(firmaClub?.sello_uri || firmaClub?.firma_uri);
  const plantilla = PLANTILLAS.find((p) => p.id === tipo);
  const familia = plantilla.grupo === "familia";

  const { data } = useQuery({
    queryKey: ["firmantesContrato"],
    queryFn: async () => {
      const [users, practicas, jugadores] = await Promise.all([
        base44.entities.User.list(),
        base44.entities.Player.filter({ "entrenador_practicas.activo": true }),
        base44.entities.Player.filter({ activo: true }),
      ]);
      const staff = users.filter((u) => u.es_entrenador || u.es_coordinador)
        .map((u) => ({ key: u.email, email: u.email, nombre: u.full_name || u.email, menor: false }));
      const menores = practicas.filter((p) => p.acceso_menor_email)
        .map((p) => ({ key: p.acceso_menor_email, email: p.acceso_menor_email, nombre: p.nombre, menor: true }));
      const familias = jugadores.filter((p) => p.email_padre).sort((a, b) => a.nombre.localeCompare(b.nombre))
        .map((p) => ({ key: p.id, email: p.email_padre, nombre: p.nombre_tutor_legal || p.email_padre, jugador: p }));
      return { staff: [...staff, ...menores], familias };
    },
  });
  const lista = (familia ? data?.familias : data?.staff) || [];
  const elegido = lista.find((s) => s.key === destino);

  const cambiarTipo = (id) => {
    const p = PLANTILLAS.find((x) => x.id === id);
    if (p.grupo !== plantilla.grupo) setDestino("");
    setTipo(id); setTitulo(p.titulo); setTexto(p.texto);
  };

  const crear = async () => {
    setSaving(true);
    const final = rellenar(texto, elegido.nombre, elegido.jugador?.nombre);
    await base44.entities.ContratoVoluntariado.create({
      entrenador_email: elegido.email, entrenador_nombre: familia ? `${elegido.jugador.nombre} (familia)` : elegido.nombre,
      es_menor: !!elegido.menor, tipo, grupo: plantilla.grupo,
      jugador_id: elegido.jugador?.id, jugador_nombre: elegido.jugador?.nombre,
      titulo, texto: final, texto_hash: await sha256(final), estado: "pendiente",
      ...(conSello && hayFirmaClub ? {
        club_sello_uri: firmaClub.sello_uri, club_firma_uri: firmaClub.firma_uri,
        club_firmante: [firmaClub.firmante_nombre, firmaClub.firmante_cargo].filter(Boolean).join(" · "),
      } : {}),
    });
    toast.success("Documento enviado. Le aparecerá al abrir la app.");
    setDestino(""); setTexto(plantilla.texto); setSaving(false);
    onCreated();
  };

  return (
    <div className="bg-white rounded-xl border p-4 space-y-3">
      <h2 className="font-bold">Nuevo documento</h2>
      <Select value={tipo} onValueChange={cambiarTipo}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          {PLANTILLAS.map((p) => <SelectItem key={p.id} value={p.id}>{p.grupo === "staff" ? "👔 Staff · " : "👪 Familia · "}{p.titulo}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={destino} onValueChange={setDestino}>
        <SelectTrigger><SelectValue placeholder={familia ? "Elige el jugador (firma su familia)" : "Elige quién firma"} /></SelectTrigger>
        <SelectContent>
          {lista.map((s) => (
            <SelectItem key={s.key} value={s.key}>
              {familia ? `${s.jugador.nombre} · ${s.email}` : `${s.nombre}${s.menor ? " · en prácticas (menor)" : ""}`}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Título" />
      <Textarea rows={10} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Texto del documento" />
      <label className={`flex items-center gap-2 text-sm ${hayFirmaClub ? "" : "opacity-50"}`}>
        <Checkbox disabled={!hayFirmaClub} checked={conSello} onCheckedChange={(v) => setConSello(!!v)} />
        Incluir sello y firma del club{!hayFirmaClub && " (súbelos arriba primero)"}
      </label>
      <Button disabled={!elegido || !texto.trim() || saving} onClick={crear} className="w-full bg-orange-600 hover:bg-orange-700">
        {saving ? "Enviando..." : "Enviar para firmar"}
      </Button>
    </div>
  );
}