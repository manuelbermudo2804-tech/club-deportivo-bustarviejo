import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Download, Book, ScrollText, Info, FileCheck } from "lucide-react";
import EmptyState from "../components/common/EmptyState";
import LopiviWidget from "../components/lopivi/LopiviWidget";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import MisFirmadosLista from "@/components/contratos/MisFirmadosLista";

const MisFirmadosBloque = () => (
  <div className="space-y-2">
    <h2 className="text-lg font-bold text-slate-900">✍️ Documentos que has firmado</h2>
    <MisFirmadosLista />
  </div>
);

export default function ParentDocuments() {
  const [user, setUser] = useState(null);
  const [myPlayers, setMyPlayers] = useState([]);
  const [filterType, setFilterType] = useState("all");

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);

        const allPlayers = await base44.entities.Player.list();
        const userPlayers = allPlayers.filter(p => 
          p.email_padre === currentUser.email || 
          p.email_tutor_2 === currentUser.email
        );
        setMyPlayers(userPlayers);
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    };
    fetchUser();
  }, []);

  const { data: documents, isLoading } = useQuery({
    queryKey: ['documents'],
    queryFn: () => base44.entities.Document.list('-created_date'),
    initialData: [],
  });

  // Filtrar solo documentos publicados y que NO requieran firma (documentos informativos)
  const isDocumentRelevant = (document) => {
    if (!document.publicado) return false;
    if (document.requiere_firma) return false; // Excluir documentos que requieren firma
    
    if (document.tipo_destinatario === "individual") {
      return myPlayers.some(p => document.jugadores_destino?.includes(p.id));
    }
    
    if (document.categoria_destino === "Todos") return true;
    return myPlayers.some(p => p.deporte === document.categoria_destino);
  };

  const relevantDocuments = documents.filter(isDocumentRelevant);

  const filteredDocuments = filterType === "all" 
    ? relevantDocuments
    : relevantDocuments.filter(d => d.tipo === filterType);

  const getTypeIcon = (tipo) => {
    switch (tipo) {
      case "Estatutos": return <Book className="w-5 h-5" />;
      case "Reglamentación": return <ScrollText className="w-5 h-5" />;
      case "Normativa Federación": return <FileCheck className="w-5 h-5" />;
      case "Información General": return <Info className="w-5 h-5" />;
      default: return <FileText className="w-5 h-5" />;
    }
  };

  const getTypeColor = (tipo) => {
    switch (tipo) {
      case "Estatutos": return "bg-blue-100 text-blue-700";
      case "Reglamentación": return "bg-purple-100 text-purple-700";
      case "Normativa Federación": return "bg-green-100 text-green-700";
      case "Información General": return "bg-orange-100 text-orange-700";
      default: return "bg-slate-100 text-slate-700";
    }
  };

  return (
    <div className="mx-auto box-border w-full min-w-0 max-w-[1600px] space-y-5 overflow-x-hidden px-3 pb-24 pt-4 sm:space-y-6 sm:px-5 lg:px-8 lg:pt-7 [&_*]:min-w-0">
      <header className="relative isolate flex min-w-0 items-start gap-3 overflow-hidden rounded-3xl border border-orange-500/20 bg-gradient-to-br from-slate-950 via-slate-900 to-orange-950 p-5 text-white shadow-lg sm:gap-4 sm:p-7">
        <div className="pointer-events-none absolute -right-10 -top-16 h-48 w-48 rounded-full bg-orange-500/10 blur-3xl" />
        <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/10 sm:h-14 sm:w-14"><FileText className="h-6 w-6 text-orange-400 sm:h-7 sm:w-7" /></div>
        <div className="relative min-w-0">
          <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.2em] text-orange-300">Familias · Documentación</p>
          <h1 className="break-words text-2xl font-bold tracking-tight text-white sm:text-3xl">Documentos y LOPIVI</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-300 sm:text-base">Protección del menor, estatutos, reglamentos e información del club.</p>
        </div>
      </header>

      <LopiviWidget />

      <MisFirmadosBloque />

      <Tabs value={filterType} onValueChange={setFilterType}>
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 rounded-2xl bg-white p-2 shadow-sm">
          <TabsTrigger value="all">
            Todos
          </TabsTrigger>
          <TabsTrigger value="Estatutos">
            <Book className="w-4 h-4 mr-1" /> Estatutos
          </TabsTrigger>
          <TabsTrigger value="Reglamentación">
            <ScrollText className="w-4 h-4 mr-1" /> Reglamentación
          </TabsTrigger>
          <TabsTrigger value="Normativa Federación">
            <FileCheck className="w-4 h-4 mr-1" /> Federación
          </TabsTrigger>
          <TabsTrigger value="Información General">
            <Info className="w-4 h-4 mr-1" /> Información
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-orange-600 border-r-transparent"></div>
        </div>
      ) : filteredDocuments.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Aún no hay documentos"
          message={filterType === "all" 
            ? "El club irá publicando aquí estatutos, normativas e información útil. Vuelve pronto 📄"
            : `No hay documentos de tipo "${filterType}" por ahora. Prueba con otra categoría.`}
        />
      ) : (
        <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredDocuments.map((document) => (
            <Card key={document.id} className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 transition-colors hover:border-orange-300 hover:shadow-lg">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <Badge className={getTypeColor(document.tipo)}>
                    {getTypeIcon(document.tipo)}
                    <span className="ml-1">{document.tipo}</span>
                  </Badge>
                </div>
                <CardTitle className="text-lg mt-2">{document.titulo}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {document.descripcion && (
                  <p className="text-sm text-slate-600">{document.descripcion}</p>
                )}
                
                <div className="text-xs text-slate-500">
                  Publicado el {format(new Date(document.created_date), "d 'de' MMMM 'de' yyyy", { locale: es })}
                </div>

                {document.archivo_url && (
                  <a
                    href={document.archivo_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <Button className="w-full bg-orange-600 hover:bg-orange-700">
                      <Download className="w-4 h-4 mr-2" />
                      Descargar Documento
                    </Button>
                  </a>
                )}

                {document.enlace_firma_externa && !document.archivo_url && (
                  <a
                    href={document.enlace_firma_externa}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <Button variant="outline" className="w-full">
                      <FileText className="w-4 h-4 mr-2" />
                      Ver Documento
                    </Button>
                  </a>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}