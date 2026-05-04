import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Download, Book, ScrollText, Info, FileCheck } from "lucide-react";
import EmptyState from "../components/common/EmptyState";
import { format } from "date-fns";
import { es } from "date-fns/locale";

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
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
          <FileText className="w-8 h-8 text-orange-600" />
          Documentos del Club
        </h1>
        <p className="text-slate-600 mt-1">Estatutos, reglamentos e información del club</p>
      </div>

      <Tabs value={filterType} onValueChange={setFilterType}>
        <TabsList className="bg-white shadow-sm flex-wrap h-auto">
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocuments.map((document) => (
            <Card key={document.id} className="border-2 border-slate-200 hover:border-orange-300 transition-colors hover:shadow-lg">
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