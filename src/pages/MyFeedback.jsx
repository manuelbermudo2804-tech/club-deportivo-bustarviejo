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
    <div className="mx-auto box-border w-full min-w-0 max-w-[1600px] space-y-5 overflow-x-hidden px-3 pb-24 pt-4 sm:space-y-6 sm:px-5 lg:px-8 lg:pt-7 [&_*]:min-w-0">
      <header className="relative isolate flex min-w-0 flex-col gap-4 overflow-hidden rounded-3xl border border-orange-500/20 bg-gradient-to-br from-slate-950 via-slate-900 to-orange-950 p-5 text-white shadow-lg sm:flex-row sm:items-center sm:justify-between sm:gap-5 sm:p-7">
        <div className="pointer-events-none absolute -right-10 -top-16 h-48 w-48 rounded-full bg-orange-500/10 blur-3xl" />
        <div className="relative flex min-w-0 items-start gap-3 sm:gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/10 sm:h-14 sm:w-14">
            <MessageCircle className="h-6 w-6 text-orange-400 sm:h-7 sm:w-7" />
          </div>
          <div className="min-w-0">
            <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.2em] text-orange-300">Familias · Participación</p>
            <h1 className="break-words text-2xl font-bold tracking-tight text-white sm:text-3xl">Mi Feedback</h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-300 sm:text-base">Sigue el estado de tus sugerencias, incidencias y comentarios enviados al club.</p>
          </div>
        </div>
        <Button onClick={() => setShowModal(true)} className="relative w-full shrink-0 bg-orange-500 text-slate-950 hover:bg-orange-400 sm:w-auto">
          <Send className="mr-2 h-4 w-4" /> Nuevo feedback
        </Button>
      </header>

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
            <Card key={f.id} className="min-w-0 overflow-hidden rounded-2xl border-slate-200 shadow-sm transition-shadow hover:shadow-md">
              <CardHeader className="pb-3">
                <div className="flex min-w-0 flex-col items-start justify-between gap-2 sm:flex-row sm:gap-3">
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