import { Send, MessageCircle, Instagram, Bell } from "lucide-react";

// Canales de difusión disponibles en el Centro de Difusión Social
export const CANALES = [
  {
    id: "telegram",
    label: "Telegram",
    desc: "Se publica solo en el canal del club",
    icon: Send,
    color: "text-sky-400",
    automatico: true,
  },
  {
    id: "app",
    label: "App del club",
    desc: "Crea un anuncio y avisa por notificación",
    icon: Bell,
    color: "text-orange-400",
    automatico: true,
  },
  {
    id: "whatsapp",
    label: "WhatsApp",
    desc: "Copia el texto y abre WhatsApp para pegarlo",
    icon: MessageCircle,
    color: "text-green-400",
    automatico: false,
  },
  {
    id: "instagram",
    label: "Instagram / Facebook",
    desc: "Copia el texto para pegarlo en la publicación",
    icon: Instagram,
    color: "text-pink-400",
    automatico: false,
  },
];

export const getCanalById = (id) => CANALES.find((c) => c.id === id);