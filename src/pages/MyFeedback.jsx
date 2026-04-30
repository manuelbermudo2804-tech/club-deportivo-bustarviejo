import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MessageCircle, Bug, Lightbulb, MessageSquare, Send } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import FeedbackModal from "../components/feedback/FeedbackModal";

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
  nuevo: "🆕 Recibido",
  revisado: "👀 Revisado",
  en_progreso: "⚙️ En progreso",
  resuelto: "✅ Resuelto",
};

export default function MyFeedback() {
  const [user, setUser] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: myFeedbacks = [], refetch } = useQuery({
    queryKey: ["myFeedback", user?.email],
    queryFn: () => base44.entities.Feedback.filter({ email: user.email }, "-created_date"),
    enabled: !!user?.email,
  });

  return (
    <div className="p-4 lg:p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold flex items-center gap-2">
            💬 Mi Feedback
          </h1>
          <p className="text-slate-600 text-sm mt-1">
            Sigue el estado de tus sugerencias, bugs y comentarios enviados
          </p>
        </div>
        <Button
          onClick={() => setShowModal(true)}
          className="bg-gradient-to-r from-orange-600 to-green-600 hover:from-orange-700 hover:to-green-700"
        >
          <Send className="w-4 h-4 mr-2" />
          Nuevo
        </Button>
      </div>

      {myFeedbacks.length === 0 ? (
        <Card className="border-slate-200">
          <CardContent className="pt-8 pb-8 text-center">
            <MessageCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600 mb-4">Aún no has enviado ningún feedback</p>
            <Button
              onClick={() => setShowModal(true)}
              variant="outline"
            >
              Enviar mi primer feedback
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {myFeedbacks.map((f) => (
            <Card key={f.id} className="border-slate-200 hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {tipoIcons[f.tipo]}
                    <CardTitle className="text-base truncate">{f.titulo}</CardTitle>
                  </div>
                  <Badge className={estadoColors[f.estado] || estadoColors.nuevo}>
                    {estadoLabels[f.estado] || estadoLabels.nuevo}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{f.descripcion}</p>
                <div className="flex items-center gap-2 flex-wrap text-xs text-slate-500 pt-2 border-t">
                  <span>{tipoLabels[f.tipo]}</span>
                  <span>•</span>
                  <span>
                    {f.created_date
                      ? format(new Date(f.created_date), "d MMM yyyy", { locale: es })
                      : ""}
                  </span>
                  {f.pagina && (
                    <>
                      <span>•</span>
                      <span>📄 {f.pagina}</span>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {showModal && (
        <FeedbackModal
          open={showModal}
          onOpenChange={(v) => {
            setShowModal(v);
            if (!v) refetch();
          }}
          user={user}
          currentPage="MyFeedback"
        />
      )}
    </div>
  );
}