import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Radar } from "lucide-react";
import { toast } from "sonner";
import { buscarEmpresas, guardarProspecto } from "./captacionApi";
import EmpresaResultCard from "./EmpresaResultCard";
import PropuestaDialog from "./PropuestaDialog";
import ProspectosPendientes from "./ProspectosPendientes";

const SECTORES = ["Restauración", "Construcción y reformas", "Inmobiliarias", "Talleres y automoción", "Salud y fisioterapia", "Supermercados y tiendas"];
const norm = (s) => (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");

export default function CaptacionPanel({ sponsors }) {
  const qc = useQueryClient();
  const [zona, setZona] = useState("Bustarviejo");
  const [sector, setSector] = useState("");
  const [resultados, setResultados] = useState([]);
  const [buscando, setBuscando] = useState(false);
  const [guardando, setGuardando] = useState(null);
  const [propuesta, setPropuesta] = useState(null);

  const existente = (e) => sponsors.find(s => norm(s.nombre) === norm(e.nombre));

  const buscar = async (mas = false) => {
    setBuscando(true);
    const previos = mas ? resultados : [];
    const excluir = [...sponsors.map(s => s.nombre), ...previos.map(e => e.nombre)];
    const r = await buscarEmpresas({ zona, sector, cantidad: 20, excluir }).finally(() => setBuscando(false));
    const vistos = new Set(excluir.map(norm));
    const nuevos = r.filter(e => {
      const n = norm(e.nombre);
      if (!n || vistos.has(n) || [...vistos].some(v => v.length > 4 && (v.includes(n) || n.includes(v)))) return false;
      vistos.add(n);
      return true;
    });
    setResultados([...previos, ...nuevos]);
    if (!nuevos.length) toast.info("No se encontraron empresas nuevas");
  };

  const guardar = async (e) => {
    const ya = existente(e);
    if (ya) return ya;
    setGuardando(e.nombre);
    const s = await guardarProspecto(e).finally(() => setGuardando(null));
    await qc.invalidateQueries({ queryKey: ["sponsors"] });
    toast.success(`${e.nombre} guardada como posible patrocinador`);
    return s;
  };

  return (
    <div className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 rounded-2xl p-4 lg:p-6 space-y-4">
      <div>
        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2"><Radar className="w-5 h-5 text-amber-600" />Buscador de patrocinadores</h2>
        <p className="text-sm text-slate-600">La IA busca empresas reales en internet y te prepara la propuesta lista para enviar.</p>
      </div>
      <div className="flex flex-col md:flex-row gap-2">
        <Input value={zona} onChange={e => setZona(e.target.value)} placeholder="Zona" className="md:max-w-xs bg-white" />
        <Input value={sector} onChange={e => setSector(e.target.value)} placeholder="Sector (opcional)" className="md:max-w-xs bg-white" />
        <Button onClick={() => buscar(false)} disabled={buscando || !zona} className="bg-amber-600 hover:bg-amber-700">
          {buscando ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Buscando...</> : <><Radar className="w-4 h-4 mr-2" />Buscar empresas</>}
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {SECTORES.map(s => <Button key={s} size="sm" variant={sector === s ? "default" : "outline"} className={sector === s ? "bg-amber-600 hover:bg-amber-700" : "bg-white"} onClick={() => setSector(sector === s ? "" : s)}>{s}</Button>)}
      </div>
      <ProspectosPendientes sponsors={sponsors} onPropuesta={setPropuesta} />
      {resultados.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          {resultados.map((e, i) => (
            <EmpresaResultCard key={i} empresa={e} yaGuardada={!!existente(e)} guardando={guardando === e.nombre}
              onGuardar={() => guardar(e)} onPropuesta={async () => setPropuesta(await guardar(e))} />
          ))}
        </div>
      )}
      {resultados.length > 0 && (
        <Button variant="outline" className="w-full bg-white" disabled={buscando} onClick={() => buscar(true)}>
          {buscando ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}Buscar más empresas ({resultados.length} encontradas)
        </Button>
      )}
      {propuesta && (
        <PropuestaDialog sponsor={propuesta} onClose={() => setPropuesta(null)}
          onSent={() => { qc.invalidateQueries({ queryKey: ["sponsors"] }); setPropuesta(null); }} />
      )}
    </div>
  );
}