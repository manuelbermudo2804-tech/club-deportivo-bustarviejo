import {
  Calendar, Trophy, Megaphone, Heart, Users, PenLine, Ticket, Handshake,
  Shirt, Image as ImageIcon, RefreshCcw, Cake, Star, HandHeart, Award,
  Target, Goal, ListChecks, ShoppingBag, Sparkles, Sunrise, UserPlus,
  PartyPopper, MapPin, Send,
} from "lucide-react";

// ─── 25 tipos de contenido ───
export const CONTENT_TYPES = [
  // Existentes
  { id: "partidos_finde", title: "⚽ Partidos del Finde", emoji: "⚽", icon: Calendar, gradient: "from-orange-500 to-orange-600", group: "competicion" },
  { id: "resultados", title: "📊 Resultados", emoji: "📊", icon: Trophy, gradient: "from-blue-500 to-blue-600", group: "competicion" },
  { id: "clasificaciones", title: "🏆 Clasificaciones", emoji: "🏆", icon: Award, gradient: "from-yellow-500 to-orange-500", group: "competicion" },
  { id: "goleadores", title: "⚡ Goleadores", emoji: "⚡", icon: Goal, gradient: "from-amber-500 to-yellow-600", group: "competicion" },
  { id: "convocatorias", title: "💪 Convocados", emoji: "💪", icon: ListChecks, gradient: "from-orange-600 to-red-600", group: "competicion" },
  { id: "anima_partido", title: "📣 Ven al campo", emoji: "📣", icon: MapPin, gradient: "from-red-500 to-orange-600", group: "competicion" },

  { id: "sanisidro", title: "🎯 San Isidro", emoji: "🎯", icon: Star, gradient: "from-amber-500 to-orange-600", group: "club" },
  { id: "loteria", title: "🎟️ Lotería", emoji: "🎟️", icon: Ticket, gradient: "from-red-500 to-rose-600", group: "club" },
  { id: "patrocinadores", title: "🤝 Patrocinadores", emoji: "🤝", icon: Handshake, gradient: "from-yellow-500 to-amber-600", group: "club" },
  { id: "tienda", title: "👕 Tienda Ropa", emoji: "👕", icon: Shirt, gradient: "from-cyan-500 to-blue-600", group: "club" },
  { id: "evento", title: "🎉 Eventos", emoji: "🎉", icon: Calendar, gradient: "from-green-500 to-green-600", group: "club" },
  { id: "eventos_semana", title: "📅 Esta semana", emoji: "📅", icon: Calendar, gradient: "from-emerald-500 to-teal-600", group: "club" },
  { id: "anuncio", title: "📢 Anuncio", emoji: "📢", icon: Megaphone, gradient: "from-pink-500 to-pink-600", group: "club" },
  { id: "hazte_socio", title: "❤️ Hazte Socio", emoji: "❤️", icon: Heart, gradient: "from-purple-500 to-purple-600", group: "club" },
  { id: "femenino", title: "⚽👧 Femenino", emoji: "⚽", icon: Users, gradient: "from-fuchsia-500 to-fuchsia-600", group: "club" },
  { id: "renovaciones", title: "🔄 Renovaciones", emoji: "🔄", icon: RefreshCcw, gradient: "from-teal-500 to-emerald-600", group: "club" },
  { id: "voluntarios", title: "🙋 Voluntarios", emoji: "🙋", icon: HandHeart, gradient: "from-lime-500 to-green-600", group: "club" },
  { id: "mercadillo", title: "🛒 Mercadillo", emoji: "🛒", icon: ShoppingBag, gradient: "from-indigo-500 to-violet-600", group: "club" },

  // Comunidad / Mañanas
  { id: "galeria", title: "📸 Galería", emoji: "📸", icon: ImageIcon, gradient: "from-violet-500 to-purple-600", group: "comunidad" },
  { id: "cumple", title: "🎂 Cumpleaños", emoji: "🎂", icon: Cake, gradient: "from-pink-400 to-pink-500", group: "comunidad" },
  { id: "buenos_dias", title: "🌅 Buenos días", emoji: "🌅", icon: Sunrise, gradient: "from-amber-400 to-orange-500", group: "comunidad" },
  { id: "fichaje", title: "🆕 Nuevo Fichaje", emoji: "🆕", icon: UserPlus, gradient: "from-sky-500 to-cyan-600", group: "comunidad" },
  { id: "hito", title: "🎊 Hito del Club", emoji: "🎊", icon: PartyPopper, gradient: "from-rose-500 to-pink-600", group: "comunidad" },
  { id: "motivacional", title: "✨ Motivacional", emoji: "✨", icon: Sparkles, gradient: "from-purple-400 to-indigo-500", group: "comunidad" },

  { id: "personalizado", title: "✏️ Libre", emoji: "✏️", icon: PenLine, gradient: "from-slate-500 to-slate-600", group: "otro" },
];

export const GROUPS = [
  { id: "competicion", label: "🏟️ Competición", color: "text-orange-300" },
  { id: "club", label: "🏛️ Club", color: "text-cyan-300" },
  { id: "comunidad", label: "❤️ Comunidad", color: "text-pink-300" },
  { id: "otro", label: "✏️ Otro", color: "text-slate-300" },
];

// ─── 4 tonos disponibles ───
export const TONOS = [
  {
    id: "cercano",
    label: "🤗 Cercano",
    desc: "De pueblo, familiar, como un amigo",
    promptHint: "Tono CERCANO Y FAMILIAR — como un amigo del pueblo contando algo del club. Cálido, con guiños locales.",
  },
  {
    id: "epico",
    label: "🔥 Épico",
    desc: "Adrenalina, victoria, motivación",
    promptHint: "Tono ÉPICO Y POTENTE — adrenalina, gloria, batalla. Frases cortas, contundentes, motivacionales. Tipo trailer de cine deportivo.",
  },
  {
    id: "corto",
    label: "⚡ Corto",
    desc: "Directo, máximo 200 caracteres",
    promptHint: "Tono ULTRA CORTO Y DIRECTO — máximo 200 caracteres. Una sola idea, sin paja, directo al grano.",
  },
  {
    id: "pro",
    label: "🎯 Pro",
    desc: "Formal, periodístico, sobrio",
    promptHint: "Tono PROFESIONAL Y SOBRIO — estilo nota de prensa deportiva. Datos limpios, sin emojis excesivos, lenguaje cuidado.",
  },
];

export const getContentTypeById = (id) => CONTENT_TYPES.find(t => t.id === id);
export const getTonoById = (id) => TONOS.find(t => t.id === id) || TONOS[0];