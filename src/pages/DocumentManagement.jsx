import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Plus, FileText, CheckCircle, Clock } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

import DocumentForm from "../components/documents/DocumentForm";
import DocumentCard from "../components/documents/DocumentCard";

export default function DocumentManagement() {
  const [showForm, setShowForm] = useState(false);
  const [editingDocument, setEditingDocument] = useState(null);
  const [filterType, setFilterType] = useState("all");
  
  const queryClient = useQueryClient();

  const { data: documents, isLoading } = useQuery({
    queryKey: ['documents'],
    queryFn: () => base44.entities.Document.list('-created_date'),
    initialData: [],
    staleTime: 0,
    refetchInterval: 5000,
  });

  const { data: players } = useQuery({
    queryKey: ['players'],
    queryFn: () => base44.entities.Player.list(),
    initialData: [],
  });

  const createDocumentMutation = useMutation({
    mutationFn: async (documentData) => {
      const doc = await base44.entities.Document.create(documentData);
      
      if (documentData.enviar_notificacion && !documentData.notificacion_enviada) {
        await sendDocumentNotifications(doc, documentData);
      }
      
      return doc;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      setShowForm(false);
      setEditingDocument(null);
      toast.success("Documento publicado");
    },
    onError: (error) => {
      console.error("Error creating document:", error);
      toast.error("Error al publicar el documento");
    }
  });

  const updateDocumentMutation = useMutation({
    mutationFn: ({ id, documentData }) => base44.entities.Document.update(id, documentData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      setShowForm(false);
      setEditingDocument(null);
      toast.success("Documento actualizado");
    },
  });

  const deleteDocumentMutation = useMutation({
    mutationFn: (id) => base44.entities.Document.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast.success("Documento eliminado");
    },
  });

  const sendDocumentNotifications = async (document, data) => {
    try {
      let recipients = [];
      
      if (data.tipo_destinatario === "individual") {
        players.filter(p => data.jugadores_destino.includes(p.id)).forEach(p => {
          if (p.email_padre) recipients.push(p.email_padre);
          if (p.email_tutor_2) recipients.push(p.email_tutor_2);
        });
      } else if (data.categoria_destino === "Todos") {
        players.forEach(p => {
          if (p.email_padre) recipients.push(p.email_padre);
          if (p.email_tutor_2) recipients.push(p.email_tutor_2);
        });
      } else {
        players.filter(p => p.deporte === data.categoria_destino).forEach(p => {
          if (p.email_padre) recipients.push(p.email_padre);
          if (p.email_tutor_2) recipients.push(p.email_tutor_2);
        });
      }

      recipients = [...new Set(recipients)].filter(Boolean);

      if (recipients.length === 0) return;

      const subject = `${document.requiere_firma ? '📝 FIRMA REQUERIDA' : '📄 Nuevo Documento'} - ${document.titulo}`;
      
      const body = `
Estimadas familias,

${document.requiere_firma ? '⚠️ Se requiere su firma para el siguiente documento:' : 'Se ha publicado un nuevo documento:'}

${document.titulo}
${document.descripcion || ''}

${document.requiere_firma ? `
════════════════════════════════════════
ACCIÓN REQUERIDA:
════════════════════════════════════════
${document.enlace_firma_externa ? 
  `Por favor, acceda al siguiente enlace para firmar digitalmente:\n${document.enlace_firma_externa}` : 
  'Por favor, acceda a la aplicación para confirmar la lectura del documento.'}

${document.fecha_limite_firma ? `⏰ Fecha límite: ${new Date(document.fecha_limite_firma).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}` : ''}
` : ''}

Para más información y acceder al documento, visite la sección "Documentos" en la aplicación del club.

Atentamente,

CD Bustarviejo
Administración

════════════════════════════════════════
Contacto:
════════════════════════════════════════
Email: cdbustarviejo@gmail.com
      `;

      for (const email of recipients) {
        try {
          await base44.integrations.Core.SendEmail({
            from_name: "CD Bustarviejo",
            to: email,
            subject: subject,
            body: body
          });
        } catch (error) {
          console.error(`Error sending email to ${email}:`, error);
        }
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      await base44.entities.Document.update(document.id, {
        ...document,
        notificacion_enviada: true
      });

      toast.success(`Notificaciones enviadas a ${recipients.length} familias`);
    } catch (error) {
      console.error("Error sending notifications:", error);
      toast.error("Error al enviar notificaciones");
    }
  };

  const handleSubmit = (documentData) => {
    if (editingDocument) {
      updateDocumentMutation.mutate({ id: editingDocument.id, documentData });
    } else {
      createDocumentMutation.mutate(documentData);
    }
  };

  const handleEdit = (document) => {
    setEditingDocument(document);
    setShowForm(true);
  };

  const handleDelete = (document) => {
    if (window.confirm(`¿Eliminar el documento "${document.titulo}"?`)) {
      deleteDocumentMutation.mutate(document.id);
    }
  };

  const filteredDocuments = filterType === "all" 
    ? documents 
    : documents.filter(d => {
        if (filterType === "requires_signature") return d.requiere_firma;
        if (filterType === "general") return !d.requiere_firma;
        return d.tipo === filterType;
      });

  const pendingSignatures = documents.filter(d => 
    d.requiere_firma && 
    d.publicado &&
    d.firmas?.some(f => !f.firmado && !f.confirmado_firma_externa)
  ).length;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-8 h-8 text-orange-600" />
            Gestión Documental
          </h1>
          <p className="text-slate-600 mt-1">Administra los documentos del club</p>
        </div>
        <Button
          onClick={() => {
            setEditingDocument(null);
            setShowForm(!showForm);
          }}
          className="bg-orange-600 hover:bg-orange-700"
        >
          <Plus className="w-5 h-5 mr-2" />
          Nuevo Documento
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-orange-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 mb-1">Total Documentos</p>
              <p className="text-3xl font-bold text-slate-900">{documents.length}</p>
            </div>
            <FileText className="w-12 h-12 text-orange-500" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-red-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 mb-1">Pendientes de Firma</p>
              <p className="text-3xl font-bold text-red-600">{pendingSignatures}</p>
            </div>
            <Clock className="w-12 h-12 text-red-500" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 mb-1">Requieren Firma</p>
              <p className="text-3xl font-bold text-green-600">
                {documents.filter(d => d.requiere_firma).length}
              </p>
            </div>
            <CheckCircle className="w-12 h-12 text-green-500" />
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showForm && (
          <DocumentForm
            document={editingDocument}
            players={players}
            onSubmit={handleSubmit}
            onCancel={() => {
              setShowForm(false);
              setEditingDocument(null);
            }}
            isSubmitting={createDocumentMutation.isPending || updateDocumentMutation.isPending}
          />
        )}
      </AnimatePresence>

      <Tabs value={filterType} onValueChange={setFilterType}>
        <TabsList className="bg-white shadow-sm">
          <TabsTrigger value="all">Todos</TabsTrigger>
          <TabsTrigger value="requires_signature">Requieren Firma</TabsTrigger>
          <TabsTrigger value="general">Informativos</TabsTrigger>
          <TabsTrigger value="Estatutos">Estatutos</TabsTrigger>
          <TabsTrigger value="Reglamentación">Reglamentación</TabsTrigger>
          <TabsTrigger value="Normativa Federación">Federación</TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-orange-600 border-r-transparent"></div>
        </div>
      ) : filteredDocuments.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl shadow-lg">
          <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">No hay documentos</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          <AnimatePresence>
            {filteredDocuments.map((document) => (
              <DocumentCard
                key={document.id}
                document={document}
                players={players}
                onEdit={handleEdit}
                onDelete={handleDelete}
                isAdmin={true}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}