import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, FileText, CheckCircle, Clock, Search, Filter } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { toast } from "sonner";

import DocumentForm from "../components/documents/DocumentForm";
import DocumentCard from "../components/documents/DocumentCard";

export default function DocumentManagement() {
  const [showForm, setShowForm] = useState(false);
  const [editingDocument, setEditingDocument] = useState(null);
  const [filterType, setFilterType] = useState("all");
  const [search, setSearch] = useState("");
  
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

  const isDocumentFullySigned = (doc) => {
    if (!doc.requiere_firma) return false;
    const totalRequired = doc.firmas?.length || 0;
    if (totalRequired === 0) return false;
    const signed = doc.firmas?.filter(f => f.firmado || f.confirmado_firma_externa).length || 0;
    return signed === totalRequired;
  };

  const filteredDocuments = documents
    .filter(d => {
      // Filtro por búsqueda
      if (search) {
        const searchLower = search.toLowerCase();
        const matchesTitle = d.titulo?.toLowerCase().includes(searchLower);
        const matchesDescription = d.descripcion?.toLowerCase().includes(searchLower);
        const matchesType = d.tipo?.toLowerCase().includes(searchLower);
        if (!matchesTitle && !matchesDescription && !matchesType) return false;
      }

      // Filtro por tipo
      if (filterType === "all") {
        // En "Todos", ocultar documentos completamente firmados
        return !isDocumentFullySigned(d);
      }
      if (filterType === "signed") {
        // Nueva pestaña: solo documentos completamente firmados
        return isDocumentFullySigned(d);
      }
      if (filterType === "requires_signature") return d.requiere_firma && !isDocumentFullySigned(d);
      if (filterType === "general") return !d.requiere_firma;
      return d.tipo === filterType;
    });

  const pendingSignatures = documents.filter(d => 
    d.requiere_firma && 
    d.publicado &&
    d.firmas?.some(f => !f.firmado && !f.confirmado_firma_externa)
  ).length;

  return (
    <div className="mx-auto w-full min-w-0 max-w-[1600px] space-y-5 overflow-x-hidden px-3 pb-24 pt-4 sm:px-5 lg:space-y-6 lg:px-8 lg:pt-7">
      <section className="relative isolate overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-orange-950 p-5 text-white shadow-lg sm:p-7">
        <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-orange-500/20 blur-3xl" />
        <div className="relative flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-3 sm:gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-400/15 ring-1 ring-orange-200/20 sm:h-14 sm:w-14">
              <FileText className="h-6 w-6 text-orange-300 sm:h-7 sm:w-7" />
            </div>
            <div className="min-w-0">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-orange-300">Gestión documental · Club Deportivo Bustarviejo</p>
              <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Gestión Documental</h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base">Administra los documentos del club, las publicaciones y las firmas pendientes.</p>
            </div>
          </div>
          <Button onClick={() => { setEditingDocument(null); setShowForm(!showForm); }} className="w-full shrink-0 bg-orange-500 text-white hover:bg-orange-600 sm:w-auto">
            <Plus className="mr-2 h-5 w-5" /> Nuevo documento
          </Button>
        </div>
      </section>

      <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <div className="min-w-0 rounded-2xl border border-slate-200 border-l-4 border-l-orange-500 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 mb-1">Total Documentos</p>
              <p className="text-3xl font-bold text-slate-900">{documents.length}</p>
            </div>
            <FileText className="w-12 h-12 text-orange-500" />
          </div>
        </div>

        <div className="min-w-0 rounded-2xl border border-slate-200 border-l-4 border-l-red-500 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 mb-1">Pendientes de Firma</p>
              <p className="text-3xl font-bold text-red-600">{pendingSignatures}</p>
            </div>
            <Clock className="w-12 h-12 text-red-500" />
          </div>
        </div>

        <div className="min-w-0 rounded-2xl border border-slate-200 border-l-4 border-l-green-500 bg-white p-4 shadow-sm sm:p-5">
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

      <div className="flex min-w-0 flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:flex-row sm:flex-wrap sm:items-center sm:p-4">
        <div className="relative min-w-0 flex-1 sm:min-w-[250px]">
          <Search className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
          <Input
            placeholder="Buscar por título, descripción o tipo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-11"
          />
        </div>

        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="h-11 w-full sm:w-[220px]">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">📋 Activos</SelectItem>
            <SelectItem value="signed">✅ Firmados</SelectItem>
            <SelectItem value="requires_signature">📝 Requieren Firma</SelectItem>
            <SelectItem value="general">ℹ️ Informativos</SelectItem>
            <SelectItem value="Estatutos">📜 Estatutos</SelectItem>
            <SelectItem value="Reglamentación">📖 Reglamentación</SelectItem>
            <SelectItem value="Normativa Federación">🏛️ Federación</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-orange-600 border-r-transparent"></div>
        </div>
      ) : filteredDocuments.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-10 text-center shadow-sm">
          <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">No hay documentos</p>
        </div>
      ) : (
        <div className="grid min-w-0 grid-cols-1 gap-3 xl:grid-cols-2">
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