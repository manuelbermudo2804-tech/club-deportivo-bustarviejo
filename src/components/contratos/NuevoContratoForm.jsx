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
      // Los menores pueden necesitar firma de su tutor aunque NO sean entrenadores en prácticas.
      const menoresPorId = new Map();
      [...practicas, ...jugadores.filter((p) => p.acceso_menor_email)].forEach((p) => {
        if (!p.acceso_menor_email || p.es_mayor_edad) return;
        menoresPorId.set(p.id, p);
      });
      const menores = [...menoresPorId.values()].map((p) => ({
        key: `menor:${p.id}`, email: p.acceso_menor_email, nombre: p.nombre, menor: true, jugador: p,
      }));
      const familias = jugadores.filter((p) => p.email_padre).sort((a, b) => a.nombre.localeCompare(b.nombre))
        .map((p) => ({ key: p.id, email: p.email_padre, nombre: p.nombre_tutor_legal || p.email_padre, jugador: p }));
      const registrados = new Set(users.map((u) => (u.email || "").toLowerCase()));
      const añadirTutores = (registro) => {
        const p = registro.jugador;
        registro.tutores = [
          p.email_padre && { email: p.email_padre, nombre: p.nombre_tutor_legal || p.email_padre },
          p.email_tutor_2 && { email: p.email_tutor_2, nombre: p.nombre_tutor_2 || p.email_tutor_2 },
        ].filter(Boolean)
          .filter((t, i, arr) => arr.findIndex((x) => x.email.toLowerCase() === t.email.toLowerCase()) === i)
          .map((t) => ({ ...t, enApp: registrados.has(t.email.toLowerCase()) }));
      };
      familias.forEach(añadirTutores);
      menores.forEach(añadirTutores);
      return { staff: [...staff, ...menores], familias };
    },
  });
  const lista = (familia ? data?.familias : data?.staff) || [];
  const elegido = lista.find((s) => s.key === destino);
  const [quienes, setQuienes] = useState([]);
  const elegir = (key) => {
    setDestino(key);
    const f = lista.find((s) => s.key === key);
    setQuienes(f?.tutores ? f.tutores.filter((t) => t.enApp).map((t) => t.email).slice(0, 1) : []);
  };
  const toggleQuien = (email) => setQuienes((q) => q.includes(email) ? q.filter((e) => e !== email) : [...q, email]);
  const requiereTutor = !!(elegido?.menor && elegido?.tutores);
  const seleccionaTutores = (familia || requiereTutor) && elegido;
  const sinFirmante = seleccionaTutores && quienes.length === 0;

  const cambiarTipo = (id) => {
    const p = PLANTILLAS.find((x) => x.id === id);
    if (p.grupo !== plantilla.grupo) setDestino("");
    setTipo(id); setTitulo(p.titulo); setTexto(p.texto);
  };

  const crear = async () => {
    setSaving(true);
    const firmaPorTutor = familia || requiereTutor;
    const firmantes = firmaPorTutor ? elegido.tutores.filter((t) => t.enApp && quienes.includes(t.email)) : [elegido];
    for (const f of firmantes) {
    const nombreParaDocumento = requiereTutor ? elegido.jugador.nombre : f.nombre;
    const final = rellenar(texto, nombreParaDocumento, elegido.jugador?.nombre);
    await base44.entities.ContratoVoluntariado.create({
      entrenador_email: f.email,
      entrenador_nombre: firmaPorTutor ? `${elegido.jugador.nombre} (tutor legal · ${f.nombre})` : elegido.nombre,
      es_menor: !!elegido.menor, tipo, grupo: plantilla.grupo,
      jugador_id: elegido.jugador?.id, jugador_nombre: elegido.jugador?.nombre,
      titulo, texto: final, texto_hash: await sha256(final), estado: "pendiente",
      ...(conSello && hayFirmaClub ? {
        club_sello_uri: firmaClub.sello_uri, club_firma_uri: firmaClub.firma_uri,
        club_firmante: [firmaClub.firmante_nombre, firmaClub.firmante_cargo].filter(Boolean).join(" · "),
      } : {}),
    });
    }
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
      <Select value={destino} onValueChange={elegir}>
        <SelectTrigger><SelectValue placeholder={familia ? "Elige el jugador (firma su familia)" : "Elige quién firma"} /></SelectTrigger>
        <SelectContent>
          {lista.map((s) => (
            <SelectItem key={s.key} value={s.key}>
              {familia ? `${s.jugador.nombre} · ${s.email}` : `${s.nombre}${s.menor ? " · menor (firma su tutor legal)" : ""}`}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {seleccionaTutores && (
        <div className="border rounded-lg p-3 space-y-2 bg-slate-50">
          <p className="text-sm font-semibold">{requiereTutor && !familia ? "¿Qué tutor legal firma por el menor?" : "¿Quién tiene que firmar?"}</p>
          {elegido.tutores.map((t) => (
            <label key={t.email} className={`flex items-center gap-2 text-sm ${t.enApp ? "" : "opacity-50"}`}>
              <Checkbox disabled={!t.enApp} checked={quienes.includes(t.email)} onCheckedChange={() => toggleQuien(t.email)} />
              {t.nombre} · {t.email} {!t.enApp && <span className="text-red-600 text-xs">(no tiene la app, no le llegaría)</span>}
            </label>
          ))}
          {sinFirmante && <p className="text-xs text-red-600">Marca al menos un progenitor con la app.</p>}
        </div>
      )}
      <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Título" />
      <Textarea rows={10} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Texto del documento" />
      <label className={`flex items-center gap-2 text-sm ${hayFirmaClub ? "" : "opacity-50"}`}>
        <Checkbox disabled={!hayFirmaClub} checked={conSello} onCheckedChange={(v) => setConSello(!!v)} />
        Incluir sello y firma del club{!hayFirmaClub && " (súbelos arriba primero)"}
      </label>
      <Button disabled={!elegido || sinFirmante || !texto.trim() || saving} onClick={crear} className="w-full bg-orange-600 hover:bg-orange-700">
        {saving ? "Enviando..." : "Enviar para firmar"}
      </Button>
    </div>
  );
}