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
const norm = (s) => (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
const esMismoNegocio = (a, b) => {
  const x = norm(a);
  const y = norm(b);
  return !!x && !!y && (x === y || (Math.min(x.length, y.length) >= 8 && (x.includes(y) || y.includes(x))));
};

export default function CaptacionPanel({ sponsors }) {
  const qc = useQueryClient();
  const [zona, setZona] = useState("Bustarviejo");
  const [sector, setSector] = useState("");
  const [resultados, setResultados] = useState([]);
  const [buscando, setBuscando] = useState(false);
  const [guardando, setGuardando] = useState(null);
  const [propuesta, setPropuesta] = useState(null);

  const existente = (e) => sponsors.find(s => esMismoNegocio(s.nombre, e.nombre));

  const buscar = async (mas = false) => {
    if (buscando || !zona.trim()) return;
    setBuscando(true);
    const previos = mas ? resultados : [];
    const excluir = [...sponsors.map(s => s.nombre), ...previos.map(e => e.nombre)];
    try {
      const r = await buscarEmpresas({ zona: zona.trim(), sector: sector.trim(), cantidad: 20, excluir });
      const vistos = [...excluir];
      const nuevos = [];
      for (const empresa of r) {
        if (!empresa?.nombre?.trim() || vistos.some(nombre => esMismoNegocio(nombre, empresa.nombre))) continue;
        vistos.push(empresa.nombre);
        nuevos.push(empresa);
      }
      setResultados([...previos, ...nuevos]);
      if (!nuevos.length) toast.info("No se encontraron empresas nuevas sin duplicados");
    } catch (error) {
      console.error("Error buscando posibles patrocinadores:", error);
      toast.error("No se ha podido completar la búsqueda. Comprueba la conexión e inténtalo de nuevo.");
    } finally {
      setBuscando(false);
    }
  };

  const guardar = async (e) => {
    const sponsorsActuales = qc.getQueryData(["sponsors"]) || sponsors;
    const ya = sponsorsActuales.find(s => esMismoNegocio(s.nombre, e.nombre));
    if (ya) {
      toast.info(`${ya.nombre} ya existe en el CRM; no se ha creado un duplicado`);
      return ya;
    }
    setGuardando(e.nombre);
    try {
      // Comprobar de nuevo el caché del CRM antes de crear el registro.
      const sponsorsActualizados = qc.getQueryData(["sponsors"]) || sponsors;
      const duplicado = sponsorsActualizados.find(s => esMismoNegocio(s.nombre, e.nombre));
      if (duplicado) {
        toast.info(`${duplicado.nombre} ya existe en el CRM; no se ha creado un duplicado`);
        return duplicado;
      }
      const s = await guardarProspecto(e);
      await qc.invalidateQueries({ queryKey: ["sponsors"] });
      toast.success(`${e.nombre} guardada como posible patrocinador`);
      return s;
    } catch (error) {
      console.error("Error guardando posible patrocinador:", error);
      toast.error(`No se ha podido guardar ${e.nombre}. No se ha registrado como patrocinador.`);
      return null;
    } finally {
      setGuardando(null);
    }
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
          {resultados.map((e) => (
            <EmpresaResultCard key={norm(e.nombre)} empresa={e} yaGuardada={!!existente(e)} guardando={guardando === e.nombre}
              onGuardar={() => guardar(e)} onPropuesta={async () => { const guardado = await guardar(e); if (guardado) setPropuesta(guardado); }} />
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