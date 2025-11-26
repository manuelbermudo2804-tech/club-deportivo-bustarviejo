import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, MessageCircle, Bell, CreditCard, Megaphone, Calendar, FileText, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

const typeConfig = {
  message: {
    icon: MessageCircle,
    bg: "bg-gradient-to-r from-blue-500 to-blue-600",
    title: "Nuevo Mensaje",
    page: "ParentChat"
  },
  callup: {
    icon: Bell,
    bg: "bg-gradient-to-r from-yellow-500 to-orange-500",
    title: "Nueva Convocatoria",
    page: "ParentCallups"
  },
  payment: {
    icon: CreditCard,
    bg: "bg-gradient-to-r from-red-500 to-red-600",
    title: "Pago Pendiente",
    page: "ParentPayments"
  },
  announcement: {
    icon: Megaphone,
    bg: "bg-gradient-to-r from-purple-500 to-purple-600",
    title: "Nuevo Anuncio",
    page: "Announcements"
  },
  event: {
    icon: Calendar,
    bg: "bg-gradient-to-r from-indigo-500 to-indigo-600",
    title: "Nuevo Evento",
    page: "Calendar"
  },
  document: {
    icon: FileText,
    bg: "bg-gradient-to-r from-slate-500 to-slate-600",
    title: "Documento Pendiente",
    page: "ParentDocuments"
  },
  survey: {
    icon: Users,
    bg: "bg-gradient-to-r from-cyan-500 to-cyan-600",
    title: "Nueva Encuesta",
    page: "Surveys"
  }
};

export default function ToastNotification({ toast, onDismiss, isAdmin, isCoach }) {
  const navigate = useNavigate();
  const [progress, setProgress] = useState(100);
  const config = typeConfig[toast.type] || typeConfig.message;
  const Icon = config.icon;

  useEffect(() => {
    const duration = toast.duration || 8000;
    const interval = 50;
    const decrement = (100 / duration) * interval;

    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev <= 0) {
          clearInterval(timer);
          onDismiss(toast.id);
          return 0;
        }
        return prev - decrement;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [toast.id, toast.duration, onDismiss]);

  const handleClick = () => {
    // Determinar la página correcta según el rol
    let targetPage = config.page;
    if (isAdmin || isCoach) {
      if (toast.type === "message") targetPage = isAdmin ? "AdminChat" : "CoachChat";
      if (toast.type === "callup") targetPage = "CoachCallups";
      if (toast.type === "payment") targetPage = "Payments";
    }
    
    navigate(createPageUrl(targetPage));
    onDismiss(toast.id);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 400, scale: 0.8 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 400, scale: 0.8 }}
      transition={{ type: "spring", stiffness: 200, damping: 20 }}
      className={`${config.bg} rounded-xl shadow-2xl overflow-hidden cursor-pointer hover:scale-105 transition-transform`}
      onClick={handleClick}
    >
      <div className="p-4 text-white">
        <div className="flex items-start gap-3">
          <div className="bg-white/20 rounded-lg p-2 flex-shrink-0">
            <Icon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm">{toast.title || config.title}</p>
            <p className="text-xs text-white/90 mt-0.5 line-clamp-2">{toast.message}</p>
            {toast.extra && (
              <p className="text-xs text-white/70 mt-1">{toast.extra}</p>
            )}
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDismiss(toast.id);
            }}
            className="flex-shrink-0 p-1 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
      {/* Progress bar */}
      <div className="h-1 bg-white/20">
        <motion.div
          className="h-full bg-white/60"
          initial={{ width: "100%" }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.05, ease: "linear" }}
        />
      </div>
    </motion.div>
  );
}