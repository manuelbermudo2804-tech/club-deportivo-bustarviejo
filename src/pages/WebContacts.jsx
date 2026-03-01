import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Users, Filter, Globe, Copy, CheckCircle2, Info } from "lucide-react";
import { toast } from "sonner";
import ContactCard from "../components/contacts/ContactCard";

export default function WebContacts() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterEstado, setFilterEstado] = useState("todos");
  const [showIntegration, setShowIntegration] = useState(false);
  const [copied, setCopied] = useState(false);

  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ["webContacts"],
    queryFn: () => base44.entities.ContactForm.list("-created_date"),
    staleTime: 30000,
  });

  const filtered = contacts.filter((c) => {
    const matchSearch = !search || 
      c.nombre?.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase()) ||
      c.telefono?.includes(search);
    const matchEstado = filterEstado === "todos" || c.estado === filterEstado;
    return matchSearch && matchEstado;
  });

  const nuevos = contacts.filter(c => c.estado === "nuevo").length;
  const contactados = contacts.filter(c => c.estado === "contactado").length;
  const enSeguimiento = contacts.filter(c => c.estado === "en_seguimiento").length;
  const cerrados = contacts.filter(c => c.estado === "cerrado").length;

  const handleRefresh = () => queryClient.invalidateQueries({ queryKey: ["webContacts"] });

  // URL del webhook - se construye a partir del dominio actual
  const webhookUrl = "https://app.base44.com/api/v1/functions/receiveContactForm";
  const webhookSnippet = `// Ejemplo: enviar datos desde tu web al webhook
fetch("TU_URL_DE_FUNCION/receiveContactForm", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    nombre: "Juan García",
    edad: "12",
    telefono: "612345678",
    email: "juan@email.com",
    deporte: "Fútbol",
    futbol_femenino: "No",
    categoria: "Alevín",
    experiencia: "2 años",
    disponibilidad: "Tardes",
    mensaje: "Me gustaría apuntar a mi hijo"
  })
});`;

  const handleCopySnippet = () => {
    navigator.clipboard.writeText(webhookSnippet);
    setCopied(true);
    toast.success("Código copiado");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-orange-700 flex items-center justify-center shadow-lg">
            <Globe className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900">Contactos Web</h1>
            <p className="text-xs text-slate-500">Formularios recibidos desde la web externa</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowIntegration(!showIntegration)} className="text-xs gap-1.5">
          <Info className="w-3.5 h-3.5" />
          Cómo conectar mi web
        </Button>
      </div>

      {/* Panel de integración */}
      {showIntegration && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 space-y-3">
          <h3 className="font-bold text-blue-900 text-sm">🔗 Cómo conectar tu formulario web</h3>
          <p className="text-xs text-blue-800">
            Tu formulario web debe enviar los datos a la URL del webhook cuando alguien lo rellene. 
            Ve al <strong>Dashboard → Código → Funciones → receiveContactForm</strong> para copiar la URL exacta.
          </p>
          <p className="text-xs text-blue-800">
            Los campos que puede enviar son: <code className="bg-blue-100 px-1 rounded">nombre</code>, <code className="bg-blue-100 px-1 rounded">edad</code>, <code className="bg-blue-100 px-1 rounded">telefono</code>, <code className="bg-blue-100 px-1 rounded">email</code>, <code className="bg-blue-100 px-1 rounded">deporte</code>, <code className="bg-blue-100 px-1 rounded">futbol_femenino</code>, <code className="bg-blue-100 px-1 rounded">categoria</code>, <code className="bg-blue-100 px-1 rounded">experiencia</code>, <code className="bg-blue-100 px-1 rounded">disponibilidad</code>, <code className="bg-blue-100 px-1 rounded">mensaje</code>
          </p>
          <div className="relative">
            <pre className="bg-slate-900 text-green-400 rounded-xl p-3 text-[11px] overflow-x-auto whitespace-pre-wrap">{webhookSnippet}</pre>
            <Button size="icon" variant="ghost" className="absolute top-2 right-2 h-7 w-7 bg-slate-700 hover:bg-slate-600" onClick={handleCopySnippet}>
              {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5 text-white" />}
            </Button>
          </div>
          <p className="text-[11px] text-blue-700">Si usas WordPress, Wix o similar, puedes usar un plugin de webhooks o preguntarme y te ayudo a conectarlo.</p>
        </div>
      )}

      {/* Estadísticas rápidas */}
      <div className="grid grid-cols-4 gap-2">
        <button onClick={() => setFilterEstado(filterEstado === "nuevo" ? "todos" : "nuevo")} className={`rounded-xl p-2.5 text-center transition-all ${filterEstado === "nuevo" ? "bg-blue-600 text-white shadow-lg" : "bg-blue-50 text-blue-800 hover:bg-blue-100"}`}>
          <div className="text-lg font-black">{nuevos}</div>
          <div className="text-[10px] font-medium">Nuevos</div>
        </button>
        <button onClick={() => setFilterEstado(filterEstado === "contactado" ? "todos" : "contactado")} className={`rounded-xl p-2.5 text-center transition-all ${filterEstado === "contactado" ? "bg-yellow-600 text-white shadow-lg" : "bg-yellow-50 text-yellow-800 hover:bg-yellow-100"}`}>
          <div className="text-lg font-black">{contactados}</div>
          <div className="text-[10px] font-medium">Contactados</div>
        </button>
        <button onClick={() => setFilterEstado(filterEstado === "en_seguimiento" ? "todos" : "en_seguimiento")} className={`rounded-xl p-2.5 text-center transition-all ${filterEstado === "en_seguimiento" ? "bg-orange-600 text-white shadow-lg" : "bg-orange-50 text-orange-800 hover:bg-orange-100"}`}>
          <div className="text-lg font-black">{enSeguimiento}</div>
          <div className="text-[10px] font-medium">Seguimiento</div>
        </button>
        <button onClick={() => setFilterEstado(filterEstado === "cerrado" ? "todos" : "cerrado")} className={`rounded-xl p-2.5 text-center transition-all ${filterEstado === "cerrado" ? "bg-green-600 text-white shadow-lg" : "bg-green-50 text-green-800 hover:bg-green-100"}`}>
          <div className="text-lg font-black">{cerrados}</div>
          <div className="text-[10px] font-medium">Cerrados</div>
        </button>
      </div>

      {/* Búsqueda */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="Buscar por nombre, email o teléfono..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 rounded-xl"
        />
      </div>

      {/* Lista */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto"></div>
          <p className="text-slate-500 text-sm mt-2">Cargando contactos...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 rounded-2xl">
          <Globe className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-slate-700">No hay contactos</h3>
          <p className="text-xs text-slate-500 mt-1">
            {search || filterEstado !== "todos" ? "No hay resultados con estos filtros" : "Cuando alguien rellene el formulario en tu web, aparecerá aquí"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((contact) => (
            <ContactCard key={contact.id} contact={contact} onUpdate={handleRefresh} />
          ))}
        </div>
      )}
    </div>
  );
}