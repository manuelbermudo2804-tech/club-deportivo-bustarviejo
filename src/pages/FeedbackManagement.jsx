import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { 
  MessageCircle, 
  Bug, 
  Lightbulb, 
  MessageSquare,
  CheckCircle2,
  Clock,
  AlertCircle,
  Trash2,
  Edit2,
  Filter
} from "lucide-react";
import { toast } from "sonner";

export default function FeedbackManagement() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [notasAdmin, setNotasAdmin] = useState("");
  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        setIsAdmin(currentUser.role === "admin");
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    };
    fetchUser();
  }, []);

  const { data: feedbacks = [] } = useQuery({
    queryKey: ["allFeedbacks"],
    queryFn: async () => {
      try {
        return await base44.entities.Feedback.list("-created_date");
      } catch (error) {
        console.error("Error loading feedbacks:", error);
        return [];
      }
    },
    enabled: isAdmin,
  });

  const updateFeedbackMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      return await base44.entities.Feedback.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allFeedbacks"] });
      setSelectedFeedback(null);
      toast.success("✅ Feedback actualizado");
    },
  });

  const deleteFeedbackMutation = useMutation({
    mutationFn: async (id) => {
      return await base44.entities.Feedback.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allFeedbacks"] });
      toast.success("✅ Feedback eliminado");
    },
  });

  if (!isAdmin) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-3" />
            <p className="text-red-800 font-semibold">Solo administradores pueden acceder aquí</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const tipoIcons = {
    bug: <Bug className="w-4 h-4" />,
    sugerencia: <Lightbulb className="w-4 h-4" />,
    comentario: <MessageSquare className="w-4 h-4" />,
  };

  const tipoLabels = {
    bug: "🐛 Bug",
    sugerencia: "💡 Sugerencia",
    comentario: "💭 Comentario",
  };

  const estadoColors = {
    nuevo: "bg-blue-100 text-blue-800",
    revisado: "bg-yellow-100 text-yellow-800",
    en_progreso: "bg-purple-100 text-purple-800",
    resuelto: "bg-green-100 text-green-800",
  };

  const estadoLabels = {
    nuevo: "🆕 Nuevo",
    revisado: "👀 Revisado",
    en_progreso: "⚙️ En progreso",
    resuelto: "✅ Resuelto",
  };

  const filtered = feedbacks.filter((f) => {
    if (filtroTipo !== "todos" && f.tipo !== filtroTipo) return false;
    if (filtroEstado !== "todos" && f.estado !== filtroEstado) return false;
    return true;
  });

  const stats = {
    total: feedbacks.length,
    nuevo: feedbacks.filter((f) => f.estado === "nuevo").length,
    resuelto: feedbacks.filter((f) => f.estado === "resuelto").length,
    bugs: feedbacks.filter((f) => f.tipo === "bug").length,
  };

  return (
    <div className="p-4 lg:p-6 max-w-6xl mx-auto space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          💬 Gestión de Feedback
        </h1>
        <p className="text-slate-600">Revisa sugerencias, bugs y comentarios de usuarios</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="pt-4 text-center">
            <p className="text-3xl font-bold text-blue-700">{stats.total}</p>
            <p className="text-xs text-blue-600 mt-1">Total</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
          <CardContent className="pt-4 text-center">
            <p className="text-3xl font-bold text-yellow-700">{stats.nuevo}</p>
            <p className="text-xs text-yellow-600 mt-1">Nuevos</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="pt-4 text-center">
            <p className="text-3xl font-bold text-green-700">{stats.resuelto}</p>
            <p className="text-xs text-green-600 mt-1">Resueltos</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <CardContent className="pt-4 text-center">
            <p className="text-3xl font-bold text-red-700">{stats.bugs}</p>
            <p className="text-xs text-red-600 mt-1">Bugs</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-2">Tipo</label>
              <div className="flex flex-wrap gap-2">
                {["todos", "bug", "sugerencia", "comentario"].map((tipo) => (
                  <Button
                    key={tipo}
                    variant={filtroTipo === tipo ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFiltroTipo(tipo)}
                    className={filtroTipo === tipo ? "bg-orange-600" : ""}
                  >
                    {tipo === "todos" ? "Todos" : tipoLabels[tipo]}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-2">Estado</label>
              <div className="flex flex-wrap gap-2">
                {["todos", "nuevo", "revisado", "en_progreso", "resuelto"].map((estado) => (
                  <Button
                    key={estado}
                    variant={filtroEstado === estado ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFiltroEstado(estado)}
                    className={filtroEstado === estado ? "bg-green-600" : ""}
                  >
                    {estado === "todos" ? "Todos" : estado.replace("_", " ")}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Feedbacks */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <Card className="border-slate-200">
            <CardContent className="pt-6 text-center">
              <MessageCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600">No hay feedback que coincida con los filtros</p>
            </CardContent>
          </Card>
        ) : (
          filtered.map((feedback) => (
            <Card key={feedback.id} className="hover:shadow-lg transition-shadow border-slate-200">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {tipoIcons[feedback.tipo]}
                      <h3 className="font-bold text-slate-900">{feedback.titulo}</h3>
                    </div>
                    <p className="text-sm text-slate-700 mb-3">{feedback.descripcion}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={estadoColors[feedback.estado]}>
                        {estadoLabels[feedback.estado]}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {feedback.nombre || feedback.email}
                      </Badge>
                      {feedback.pagina && (
                        <Badge variant="outline" className="text-xs">
                          📄 {feedback.pagina}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedFeedback(feedback);
                      setNotasAdmin(feedback.notas_admin || "");
                    }}
                    className="flex-shrink-0"
                  >
                    <Edit2 className="w-4 h-4 mr-1" />
                    Ver
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Modal de edición */}
      <Dialog open={!!selectedFeedback} onOpenChange={() => setSelectedFeedback(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Gestionar Feedback</DialogTitle>
          </DialogHeader>

          {selectedFeedback && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-semibold text-slate-700 mb-1">Título</p>
                <p className="text-slate-900">{selectedFeedback.titulo}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-700 mb-1">Descripción</p>
                <p className="text-slate-700 text-sm">{selectedFeedback.descripcion}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-700 mb-2">Estado</p>
                <div className="grid grid-cols-2 gap-2">
                  {["nuevo", "revisado", "en_progreso", "resuelto"].map((estado) => (
                    <Button
                      key={estado}
                      variant={selectedFeedback.estado === estado ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        updateFeedbackMutation.mutate({
                          id: selectedFeedback.id,
                          data: { estado },
                        });
                      }}
                    >
                      {estado.replace("_", " ")}
                    </Button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-700 mb-2">Notas Internas</p>
                <Textarea
                  value={notasAdmin}
                  onChange={(e) => setNotasAdmin(e.target.value)}
                  placeholder="Notas solo para admins..."
                  className="min-h-20"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    if (confirm("¿Eliminar este feedback?")) {
                      deleteFeedbackMutation.mutate(selectedFeedback.id);
                    }
                  }}
                  className="flex-1"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Eliminar
                </Button>
                <Button
                  onClick={() => {
                    updateFeedbackMutation.mutate({
                      id: selectedFeedback.id,
                      data: { notas_admin: notasAdmin },
                    });
                  }}
                  className="flex-1 bg-orange-600 hover:bg-orange-700"
                >
                  Guardar notas
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}