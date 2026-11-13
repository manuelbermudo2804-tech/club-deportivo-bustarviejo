import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ClipboardList, CheckCircle2, XCircle, Clock, RefreshCw } from "lucide-react";

const statusLabel = {
  solicitada: "Pendiente",
  en_revision: "En revisión",
  aprobada: "Aprobada",
  rechazada: "Rechazada",
  procesada: "Procesada",
};

export default function AccountDeletionRequestsPanel() {
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState({});
  const { data: requests = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ["accountDeletionRequestsAdmin"],
    queryFn: () => base44.entities.AccountDeletionRequest.list("-requested_at", 100),
    staleTime: 0,
  });

  const updateMutation = useMutation({
    mutationFn: async ({ request, status }) => {
      const admin = await base44.auth.me();
      const final = status === "aprobada" || status === "rechazada";
      return base44.entities.AccountDeletionRequest.update(request.id, {
        status,
        notes_admin: notes[request.id] ?? request.notes_admin ?? "",
        ...(final ? { processed_at: new Date().toISOString(), processed_by: admin.email } : {}),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accountDeletionRequestsAdmin"] });
      toast.success("Solicitud actualizada");
    },
    onError: (error) => toast.error("No se pudo actualizar: " + (error?.message || "error desconocido")),
  });

  const pending = requests.filter((r) => r.status === "solicitada" || r.status === "en_revision");
  const history = requests.filter((r) => r.status !== "solicitada" && r.status !== "en_revision");
  const dateLabel = (value) => value ? new Date(value).toLocaleString("es-ES", { dateStyle: "medium", timeStyle: "short" }) : "Sin fecha";

  const renderRequest = (request) => (
    <div key={request.id} className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="font-semibold text-slate-900">{request.user_name || "Usuario sin nombre"}</p>
          <p className="break-all text-sm text-slate-600">{request.user_email}</p>
          <p className="mt-1 text-xs text-slate-500">Solicitada: {dateLabel(request.requested_at)}</p>
        </div>
        <Badge variant={request.status === "solicitada" ? "destructive" : "secondary"}>{statusLabel[request.status] || request.status}</Badge>
      </div>
      <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
        <span className="font-medium">Motivo: </span>{request.reason || "No indicó ningún motivo."}
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">Notas internas (opcional)</label>
        <Textarea rows={2} value={notes[request.id] ?? request.notes_admin ?? ""} onChange={(e) => setNotes((prev) => ({ ...prev, [request.id]: e.target.value }))} placeholder="Anotaciones de la directiva..." />
      </div>
      {request.status === "solicitada" || request.status === "en_revision" ? (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" disabled={updateMutation.isPending} onClick={() => updateMutation.mutate({ request, status: "en_revision" })}><Clock className="mr-1 h-4 w-4" /> En revisión</Button>
          <Button size="sm" className="bg-green-600 hover:bg-green-700" disabled={updateMutation.isPending} onClick={() => { if (window.confirm("¿Marcar esta solicitud como aprobada? Esto registra la aprobación, pero NO elimina automáticamente la cuenta.")) updateMutation.mutate({ request, status: "aprobada" }); }}><CheckCircle2 className="mr-1 h-4 w-4" /> Aprobar</Button>
          <Button size="sm" variant="destructive" disabled={updateMutation.isPending} onClick={() => { if (window.confirm("¿Rechazar esta solicitud de baja?")) updateMutation.mutate({ request, status: "rechazada" }); }}><XCircle className="mr-1 h-4 w-4" /> Rechazar</Button>
        </div>
      ) : (
        <p className="text-xs text-slate-500">{request.processed_at ? `Revisada: ${dateLabel(request.processed_at)}` : "Solicitud cerrada"}{request.processed_by ? ` · ${request.processed_by}` : ""}</p>
      )}
    </div>
  );

  return (
    <Card className="overflow-hidden rounded-2xl border border-orange-200 shadow-sm">
      <CardHeader className="bg-orange-50 px-4 py-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg"><ClipboardList className="h-5 w-5 text-orange-600" /> Solicitudes de baja <Badge>{pending.length} pendientes</Badge></CardTitle>
          <Button size="sm" variant="outline" onClick={() => refetch()} disabled={isFetching}><RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} /> Actualizar</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 p-4 sm:p-5">
        {isLoading ? <p className="text-sm text-slate-500">Cargando solicitudes...</p> : pending.length ? <div className="space-y-3">{pending.map(renderRequest)}</div> : <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600">No hay solicitudes pendientes.</p>}
        {history.length > 0 && <details className="rounded-lg border border-slate-200 p-3"><summary className="cursor-pointer text-sm font-semibold text-slate-700">Historial ({history.length})</summary><div className="mt-3 space-y-3">{history.map(renderRequest)}</div></details>}
        <p className="text-xs text-slate-500">Aprobar o rechazar solo cambia el estado de la solicitud. La eliminación de la cuenta debe realizarse después, como acción administrativa independiente.</p>
      </CardContent>
    </Card>
  );
}
