import React from "react";
import { MessageCircle, Instagram, Send, Clock, Check } from "lucide-react";
import moment from "moment";

const TIPO_LABELS = {
  partidos_finde: "⚽ Partidos del finde",
  resultados: "📊 Resultados",
  anuncio: "📢 Anuncio",
  hazte_socio: "❤️ Hazte socio",
  tienda: "👕 Tienda",
  loteria: "🍀 Lotería",
  evento: "🎉 Evento",
  femenino: "⚽👧 Fútbol Femenino",
  personalizado: "✏️ Personalizado",
};

export default function ContentHistoryList({ posts }) {
  if (!posts || posts.length === 0) {
    return (
      <div className="text-center py-8 text-slate-400">
        <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">Aún no has publicado nada</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {posts.map((post) => (
        <div
          key={post.id}
          className="bg-white rounded-lg border border-slate-200 p-3 flex items-center gap-3"
        >
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate">
              {TIPO_LABELS[post.tipo] || post.tipo} — {post.titulo}
            </p>
            <p className="text-xs text-slate-500">
              {moment(post.created_date).format("DD/MM/YYYY HH:mm")}
            </p>
          </div>
          <div className="flex gap-1.5">
            {post.enviado_whatsapp && (
              <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center" title="Enviado a WhatsApp">
                <MessageCircle className="w-3.5 h-3.5 text-green-600" />
              </div>
            )}
            {post.enviado_instagram && (
              <div className="w-6 h-6 bg-pink-100 rounded-full flex items-center justify-center" title="Publicado en Instagram">
                <Instagram className="w-3.5 h-3.5 text-pink-600" />
              </div>
            )}
            {post.enviado_twitter && (
              <div className="w-6 h-6 bg-sky-100 rounded-full flex items-center justify-center" title="Publicado en X/Twitter">
                <Send className="w-3.5 h-3.5 text-sky-600" />
              </div>
            )}
            {!post.enviado_whatsapp && !post.enviado_instagram && !post.enviado_twitter && (
              <span className="text-xs text-slate-400">Borrador</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}