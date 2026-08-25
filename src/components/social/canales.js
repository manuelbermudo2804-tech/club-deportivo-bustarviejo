import { Send, MessageCircle, Instagram, Bell, Facebook } from "lucide-react";

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
    label: "Instagram",
    desc: "Publica la foto en el feed (necesita imagen)",
    icon: Instagram,
    color: "text-pink-400",
    automatico: true,
    requiereConexion: true,
    requiereImagen: true,
  },
  {
    id: "facebook",
    label: "Facebook",
    desc: "Publica en la página del club",
    icon: Facebook,
    color: "text-blue-400",
    automatico: true,
    requiereConexion: true,
  },
];

export const getCanalById = (id) => CANALES.find((c) => c.id === id);