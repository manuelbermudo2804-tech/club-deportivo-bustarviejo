import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, ExternalLink, Download, CheckCircle, Clock, AlertCircle, Users } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export default function ParentDocuments() {
  const [user, setUser] = useState(null);
  const [myPlayers, setMyPlayers] = useState([]);
  const [filterType, setFilterType] = useState("all");
  const [showSignDialog, setShowSignDialog] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [signComment, setSignComment] = useState("");
  const [visitedLinks, setVisitedLinks] = useState({});

  const queryClient = useQueryClient();

  // Cargar enlaces visitados desde localStorage al montar
  useEffect(() => {
    const stored = localStorage.getItem('visitedExternalLinks');
    if (stored) {
      try {
        setVisitedLinks(JSON.parse(stored));
      } catch (e) {
        console.error('Error loading visited links:', e);
      }
    }
  }, []);

  // Marcar enlace como visitado
  const markLinkAsVisited = (documentId, playerId) => {
    const key = `${documentId}_${playerId}`;
    const updated = { ...visitedLinks, [key]: true };
    setVisitedLinks(updated);
    localStorage.setItem('visitedExternalLinks', JSON.stringify(updated));
    console.log(`✅ Enlace marcado como visitado: ${key}`);
  };

  // Verificar si el enlace fue visitado
  const hasVisitedLink = (documentId, playerId) => {
    const key = `${documentId}_${playerId}`;
    return visitedLinks[key] === true;
  };

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

  const { data: documents, isLoading, refetch } = useQuery({
    queryKey: ['documents'],
    queryFn: () => base44.entities.Document.list('-created_date'),
    initialData: [],
  });

  const updateDocumentMutation = useMutation({
    mutationFn: async ({ id, documentData, playerId }) => {
      console.log("📤 Enviando actualización:", { id, firmas: documentData.firmas });
      const result = await base44.entities.Document.update(id, documentData);
      console.log("📥 Servidor respondió:", result);
      return { result, playerId };
    },
    onSuccess: async ({ result, playerId }, variables) => {
      console.log("✅ Guardado en servidor");
      
      if (playerId) {
        const key = `${variables.id}_${playerId}`;
        const updated = { ...visitedLinks };
        delete updated[key];
        setVisitedLinks(updated);
        localStorage.setItem('visitedExternalLinks', JSON.stringify(updated));
      }
      
      toast.success("✅ Firma confirmada");
      
      setShowSignDialog(false);
      setSelectedDocument(null);
      setSelectedPlayer(null);
      setSignComment("");
      
      await queryClient.invalidateQueries({ queryKey: ['documents'] });
      await refetch();
    },
    onError: (error) => {
      console.error("❌ Error:", error);
      toast.error("Error al confirmar. Intenta de nuevo.");
    },
  });

  const handleSignDocument = (document, player) => {
    setSelectedDocument(document);
    setSelectedPlayer(player);
    setSignComment("");
    setShowSignDialog(true);
  };

  const handleConfirmSign = () => {
    if (!selectedDocument || !selectedPlayer) return;

    const updatedFirmas = (selectedDocument.firmas || []).map(f => {
      if (f.jugador_id === selectedPlayer.id) {
        return {
          ...f,
          firmado: true,
          fecha_firma: new Date().toISOString(),
          comentario: signComment
        };
      }
      return f;
    });

    // Si no existe firma para este jugador, añadirla
    if (!updatedFirmas.some(f => f.jugador_id === selectedPlayer.id)) {
      updatedFirmas.push({
        jugador_id: selectedPlayer.id,
        jugador_nombre: selectedPlayer.nombre,
        email_padre: user.email,
        firmado: true,
        fecha_firma: new Date().toISOString(),
        comentario: signComment
      });
    }

    updateDocumentMutation.mutate({
      id: selectedDocument.id,
      documentData: {
        ...selectedDocument,
        firmas: updatedFirmas
      },
      playerId: selectedPlayer.id
    });
  };

  const handleConfirmExternalSign = (document, player) => {
    console.log("🔥 CONFIRMAR FIRMA EXTERNA");
    console.log("📄 Documento ID:", document.id);
    console.log("👤 Jugador ID:", player.id, "Nombre:", player.nombre);
    console.log("📧 Email padre:", user?.email);
    console.log("📋 Firmas actuales:", JSON.stringify(document.firmas, null, 2));
    
    if (!user) {
      toast.error("Error: usuario no identificado");
      return;
    }

    if (!hasVisitedLink(document.id, player.id)) {
      toast.error("⚠️ Primero debes visitar el enlace de firma externa");
      return;
    }

    toast.info("⏳ Registrando confirmación...");
    
    // Crear array de firmas actualizado
    const updatedFirmas = (document.firmas || []).map(f => 
      f.jugador_id === player.id 
        ? { ...f, confirmado_firma_externa: true, fecha_confirmacion_externa: new Date().toISOString() }
        : f
    );
    
    // Si no existía firma para este jugador, agregarla
    if (!updatedFirmas.some(f => f.jugador_id === player.id)) {
      updatedFirmas.push({
        jugador_id: player.id,
        jugador_nombre: player.nombre,
        email_padre: user.email,
        firmado: false,
        confirmado_firma_externa: true,
        fecha_confirmacion_externa: new Date().toISOString()
      });
    }

    console.log("✅ Firmas después de actualizar:", JSON.stringify(updatedFirmas, null, 2));

    // Enviar documento COMPLETO para asegurar persistencia
    updateDocumentMutation.mutate({
      id: document.id,
      documentData: {
        titulo: document.titulo,
        descripcion: document.descripcion,
        tipo: document.tipo,
        tipo_destinatario: document.tipo_destinatario,
        categoria_destino: document.categoria_destino,
        jugadores_destino: document.jugadores_destino,
        archivo_url: document.archivo_url,
        enlace_firma_externa: document.enlace_firma_externa,
        codigo_qr_url: document.codigo_qr_url,
        requiere_firma: document.requiere_firma,
        fecha_limite_firma: document.fecha_limite_firma,
        publicado: document.publicado,
        firmas: updatedFirmas,
        enviar_notificacion: document.enviar_notificacion,
        notificacion_enviada: document.notificacion_enviada
      },
      playerId: player.id
    });
  };

  const handleOpenExternalLink = (url, documentId, playerId) => {
    console.log("🔗 Abriendo enlace externo:", url);
    window.open(url, '_blank');
    
    // Marcar como visitado inmediatamente al hacer clic
    setTimeout(() => {
      markLinkAsVisited(documentId, playerId);
      toast.success("✅ Enlace visitado - ya puedes confirmar la firma");
    }, 1000);
  };

  const getPlayerSignatureStatus = (document, playerId) => {
    if (!document.requiere_firma) return null;
    const firma = document.firmas?.find(f => f.jugador_id === playerId);
    return firma;
  };

  const isDocumentRelevant = (document) => {
    if (!document.publicado) return false;
    
    if (document.tipo_destinatario === "individual") {
      return myPlayers.some(p => document.jugadores_destino?.includes(p.id));
    }
    
    if (document.categoria_destino === "Todos") return true;
    return myPlayers.some(p => p.deporte === document.categoria_destino);
  };

  const relevantDocuments = documents.filter(isDocumentRelevant);

  const filteredDocuments = filterType === "all" 
    ? relevantDocuments 
    : filterType === "pending"
    ? relevantDocuments.filter(d => {
        if (!d.requiere_firma) return false;

        return myPlayers.some(player => {
          const isRelevantForPlayer = d.tipo_destinatario === "individual" 
            ? d.jugadores_destino?.includes(player.id)
            : (d.categoria_destino === "Todos" || player.deporte === d.categoria_destino);

          if (!isRelevantForPlayer) return false;

          const firma = getPlayerSignatureStatus(d, player.id);
          // Pendiente si no existe firma O si existe pero no está firmado ni confirmado
          return !firma || (!firma.firmado && !firma.confirmado_firma_externa);
        });
      })
    : relevantDocuments.filter(d => d.tipo === filterType);

  const pendingCount = relevantDocuments.filter(d => {
    if (!d.requiere_firma) return false;

    return myPlayers.some(player => {
      const isRelevantForPlayer = d.tipo_destinatario === "individual" 
        ? d.jugadores_destino?.includes(player.id)
        : (d.categoria_destino === "Todos" || player.deporte === d.categoria_destino);

      if (!isRelevantForPlayer) return false;

      const firma = getPlayerSignatureStatus(d, player.id);
      return !firma || (!firma.firmado && !firma.confirmado_firma_externa);
    });
  }).length;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
          <FileText className="w-8 h-8 text-orange-600" />
          Documentos del Club
        </h1>
        <p className="text-slate-600 mt-1">Consulta y firma los documentos necesarios</p>
      </div>

      {pendingCount > 0 && (
        <div className="bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-300 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <AlertCircle className="w-8 h-8 text-red-600 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h3 className="text-xl font-bold text-red-900 mb-2">
                ⚠️ Documentos Pendientes de Firma
              </h3>
              <p className="text-red-800 mb-4">
                Tienes <strong>{pendingCount}</strong> documento{pendingCount !== 1 ? 's' : ''} que requiere{pendingCount !== 1 ? 'n' : ''} tu firma.
              </p>
              <Button
                onClick={() => setFilterType("pending")}
                className="bg-red-600 hover:bg-red-700"
              >
                Ver Documentos Pendientes
              </Button>
            </div>
          </div>
        </div>
      )}

      <Tabs value={filterType} onValueChange={setFilterType}>
        <TabsList className="bg-white shadow-sm flex-wrap h-auto">
          <TabsTrigger value="all">
            Todos
          </TabsTrigger>
          <TabsTrigger value="pending" className="data-[state=active]:bg-red-100 data-[state=active]:text-red-700">
            Pendientes {pendingCount > 0 && `(${pendingCount})`}
          </TabsTrigger>
          <TabsTrigger value="Estatutos">Estatutos</TabsTrigger>
          <TabsTrigger value="Reglamentación">Reglamentación</TabsTrigger>
          <TabsTrigger value="Normativa Federación">Federación</TabsTrigger>
          <TabsTrigger value="Información General">Información</TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-orange-600 border-r-transparent"></div>
        </div>
      ) : filteredDocuments.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl shadow-lg">
          <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">No hay documentos disponibles</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredDocuments.map((document) => {
            const hasPendingSignatures = document.requiere_firma && 
              myPlayers.some(p => !getPlayerSignatureStatus(document, p.id)?.firmado);

            return (
              <Card key={document.id} className={`border-2 ${
                hasPendingSignatures ? 'border-red-300 bg-red-50/30' : 'border-slate-200'
              }`}>
                <CardHeader className="bg-gradient-to-r from-orange-600 to-orange-700 text-white">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <Badge className="bg-white/20 text-white">
                          {document.tipo}
                        </Badge>
                        {document.requiere_firma && (
                          <Badge className="bg-red-500 text-white">
                            📝 Requiere Firma
                          </Badge>
                        )}
                        {hasPendingSignatures && (
                          <Badge className="bg-yellow-500 text-white animate-pulse">
                            ⚠️ Pendiente
                          </Badge>
                        )}
                      </div>
                      <CardTitle className="text-xl">{document.titulo}</CardTitle>
                      {document.descripcion && (
                        <p className="text-orange-100 text-sm mt-2">{document.descripcion}</p>
                      )}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-6 space-y-4">
                  {document.codigo_qr_url && (
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-6 text-center">
                      <p className="text-sm font-semibold text-blue-900 mb-2">
                        📱 Escanea el código QR para firmar
                      </p>
                      <p className="text-xs text-blue-700 mb-4">
                        ℹ️ Después de firmar en la plataforma externa, vuelve aquí y pulsa "✅ Confirmar Firma"
                      </p>
                      <div className="flex justify-center mb-4">
                        <img 
                          src={document.codigo_qr_url} 
                          alt="Código QR para firma" 
                          className="w-48 h-48 border-4 border-white rounded-xl shadow-lg"
                        />
                      </div>
                      {document.enlace_firma_externa && myPlayers.map(player => {
                        const isRelevantForPlayer = document.tipo_destinatario === "individual" 
                          ? document.jugadores_destino?.includes(player.id)
                          : (document.categoria_destino === "Todos" || player.deporte === document.categoria_destino);

                        if (!isRelevantForPlayer) return null;

                        const firma = getPlayerSignatureStatus(document, player.id);
                        if (firma?.firmado || firma?.confirmado_firma_externa) return null;

                        return (
                          <div key={player.id} className="mb-2">
                            <Button 
                              onClick={() => handleOpenExternalLink(document.enlace_firma_externa, document.id, player.id)}
                              className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"
                            >
                              <ExternalLink className="w-4 h-4 mr-2" />
                              Ir a firmar para {player.nombre}
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="flex gap-4 flex-wrap">
                    {document.archivo_url && (
                      <a
                        href={document.archivo_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1"
                      >
                        <Button variant="outline" className="w-full">
                          <Download className="w-4 h-4 mr-2" />
                          Descargar PDF
                        </Button>
                      </a>
                    )}
                    
                    {document.enlace_firma_externa && !document.codigo_qr_url && (
                      <div className="flex-1 space-y-2">
                        {myPlayers.map(player => {
                          const isRelevantForPlayer = document.tipo_destinatario === "individual" 
                            ? document.jugadores_destino?.includes(player.id)
                            : (document.categoria_destino === "Todos" || player.deporte === document.categoria_destino);

                          if (!isRelevantForPlayer) return null;

                          const firma = getPlayerSignatureStatus(document, player.id);
                          if (firma?.firmado || firma?.confirmado_firma_externa) return null;

                          return (
                            <Button 
                              key={player.id}
                              onClick={() => handleOpenExternalLink(document.enlace_firma_externa, document.id, player.id)}
                              className="w-full bg-blue-600 hover:bg-blue-700"
                            >
                              <ExternalLink className="w-4 h-4 mr-2" />
                              Ir a firmar para {player.nombre}
                            </Button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {document.fecha_limite_firma && (
                    <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded">
                      <p className="text-sm text-yellow-800">
                        <Clock className="w-4 h-4 inline mr-2" />
                        <strong>Fecha límite:</strong> {format(new Date(document.fecha_limite_firma), "d 'de' MMMM 'de' yyyy", { locale: es })}
                      </p>
                    </div>
                  )}

                  {document.requiere_firma && (
                    <div className="border-t pt-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Users className="w-5 h-5 text-orange-600" />
                        <span className="font-semibold text-slate-900">Estado de Firma por Jugador:</span>
                      </div>

                      {document.enlace_firma_externa && (
                        <div className="bg-blue-50 border-l-4 border-blue-500 p-3 mb-3 rounded">
                          <p className="text-xs text-blue-800">
                            💡 <strong>Importante:</strong> Este documento se firma en una plataforma externa. 
                            Después de completar la firma online, vuelve aquí y pulsa el botón "✅ Confirmar Firma" 
                            del jugador correspondiente para registrar que has firmado.
                          </p>
                        </div>
                      )}
                      
                      <div className="space-y-2">
                        {myPlayers.map((player) => {
                          // Verificar si este documento es relevante para este jugador específico
                          const isRelevantForPlayer = document.tipo_destinatario === "individual" 
                            ? document.jugadores_destino?.includes(player.id)
                            : (document.categoria_destino === "Todos" || player.deporte === document.categoria_destino);
                          
                          if (!isRelevantForPlayer) return null;
                          
                          const firma = getPlayerSignatureStatus(document, player.id);
                          const isSigned = firma?.firmado;
                          const confirmedExternal = firma?.confirmado_firma_externa;

                          return (
                            <div key={player.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 bg-slate-50 rounded-lg">
                              <div className="flex-1 w-full">
                                <p className="font-medium text-slate-900">{player.nombre}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  {isSigned ? (
                                    <>
                                      <CheckCircle className="w-4 h-4 text-green-600" />
                                      <span className="text-sm text-green-600">
                                        Firmado el {format(new Date(firma.fecha_firma), "d/MM/yyyy HH:mm", { locale: es })}
                                      </span>
                                    </>
                                  ) : confirmedExternal ? (
                                   <>
                                     <CheckCircle className="w-4 h-4 text-blue-600" />
                                     <span className="text-sm text-blue-600 font-semibold">
                                       ✅ Confirmado firma externa el {format(new Date(firma.fecha_confirmacion_externa), "d/MM/yyyy HH:mm", { locale: es })}
                                     </span>
                                   </>
                                  ) : (
                                    <>
                                      <Clock className="w-4 h-4 text-orange-600" />
                                      <span className="text-sm text-orange-600">Pendiente de firma</span>
                                    </>
                                  )}
                                </div>
                                {firma?.comentario && (
                                  <p className="text-xs text-slate-600 mt-1 italic">
                                    "{firma.comentario}"
                                  </p>
                                )}
                              </div>
                              <div className="flex gap-2 w-full sm:w-auto">
                                {!isSigned && !document.enlace_firma_externa && (
                                  <Button
                                    onClick={() => handleSignDocument(document, player)}
                                    className="bg-orange-600 hover:bg-orange-700 w-full sm:w-auto min-h-[44px] px-6"
                                  >
                                    Firmar
                                  </Button>
                                )}
                                {!isSigned && document.enlace_firma_externa && !confirmedExternal && (
                                  <Button
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleConfirmExternalSign(document, player);
                                    }}
                                    disabled={updateDocumentMutation.isPending || !hasVisitedLink(document.id, player.id)}
                                    className={`w-full sm:w-auto min-h-[44px] px-6 text-base font-semibold transition-all ${
                                      hasVisitedLink(document.id, player.id)
                                        ? 'bg-green-600 hover:bg-green-700 animate-pulse'
                                        : 'bg-gray-400 cursor-not-allowed opacity-60'
                                    } disabled:opacity-50`}
                                    title={hasVisitedLink(document.id, player.id) 
                                      ? "Pulsa para confirmar que has firmado" 
                                      : "Primero debes visitar el enlace de firma"}
                                  >
                                    {updateDocumentMutation.isPending 
                                      ? "⏳ Confirmando..." 
                                      : hasVisitedLink(document.id, player.id)
                                      ? "✅ Confirmar Firma"
                                      : "⚠️ Visita enlace primero"}
                                  </Button>
                                )}
                                {!isSigned && document.enlace_firma_externa && confirmedExternal && (
                                  <div className="bg-green-100 border-2 border-green-500 rounded-lg px-4 py-2 w-full sm:w-auto">
                                    <p className="text-green-700 font-bold text-sm text-center">
                                      ✅ Firma Confirmada
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={showSignDialog} onOpenChange={setShowSignDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Firma de Documento</DialogTitle>
            <DialogDescription>
              {selectedDocument?.titulo} - {selectedPlayer?.nombre}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <p className="text-sm text-slate-700">
              Al confirmar, estás aceptando que has leído y entendido el documento.
            </p>

            <div className="space-y-2">
              <Label htmlFor="sign-comment">Comentario (opcional)</Label>
              <Textarea
                id="sign-comment"
                placeholder="Ej: Leído y conforme"
                value={signComment}
                onChange={(e) => setSignComment(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowSignDialog(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmSign}
              disabled={updateDocumentMutation.isPending}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {updateDocumentMutation.isPending ? "Firmando..." : "Confirmar Firma"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}