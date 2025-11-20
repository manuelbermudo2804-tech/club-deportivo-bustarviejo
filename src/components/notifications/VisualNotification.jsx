import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Bell, AlertCircle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function VisualNotification({ notification, onDismiss }) {
  const [isVisible, setIsVisible] = useState(true);

  const typeConfig = {
    urgente: {
      bg: "bg-gradient-to-r from-red-500 to-pink-500",
      icon: AlertCircle,
      ringColor: "ring-red-500",
      textColor: "text-white"
    },
    importante: {
      bg: "bg-gradient-to-r from-orange-500 to-yellow-500",
      icon: Bell,
      ringColor: "ring-orange-500",
      textColor: "text-white"
    },
    info: {
      bg: "bg-gradient-to-r from-blue-500 to-cyan-500",
      icon: Info,
      ringColor: "ring-blue-500",
      textColor: "text-white"
    }
  };

  const config = typeConfig[notification.tipo] || typeConfig.info;
  const Icon = config.icon;

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(() => {
      onDismiss(notification.id);
    }, 400);
  };

  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -100 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -100 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-x-0 top-24 lg:top-4 z-50 flex justify-center px-4"
      style={{ pointerEvents: 'none' }}
    >
      <Card className={`${config.bg} ${config.textColor} shadow-2xl border-none overflow-hidden ring-4 ${config.ringColor} w-full max-w-lg`} style={{ pointerEvents: 'auto' }}>
            <div className="p-4">
              <div className="flex items-start gap-3">
                <motion.div
                  animate={{ 
                    scale: [1, 1.2, 1],
                    rotate: [0, 10, -10, 0]
                  }}
                  transition={{ 
                    repeat: Infinity, 
                    duration: 2,
                    ease: "easeInOut"
                  }}
                  className="flex-shrink-0"
                >
                  {notification.icono ? (
                    <span className="text-4xl">{notification.icono}</span>
                  ) : (
                    <Icon className="w-8 h-8" />
                  )}
                </motion.div>
                
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-xl mb-2 leading-tight">{notification.titulo}</h3>
                  <p className="text-base font-medium mb-3 leading-relaxed">{notification.mensaje}</p>
                  {notification.metadata?.cuotas_pendientes && notification.metadata.cuotas_pendientes.length > 0 && (
                    <div className="mt-3 space-y-2 bg-white/30 rounded-lg p-4 border-2 border-white/50">
                      <p className="font-bold text-base">💰 Cuotas pendientes:</p>
                      {notification.metadata.cuotas_pendientes.map((cuota, idx) => (
                        <div key={idx} className="flex justify-between items-center bg-white/40 rounded px-3 py-2">
                          <span className="font-bold text-base">{cuota.mes}</span>
                          <span className="font-bold text-xl">{cuota.cantidad}€</span>
                        </div>
                      ))}
                      {notification.metadata.total_pendiente && (
                        <div className="flex justify-between items-center bg-white/60 rounded px-3 py-2.5 border-2 border-white/70 mt-3">
                          <span className="font-bold text-base">TOTAL</span>
                          <span className="font-bold text-2xl">{notification.metadata.total_pendiente}€</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleDismiss}
                  className="flex-shrink-0 hover:bg-white/20 text-white"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>
            
            <motion.div
              initial={{ width: "100%" }}
              animate={{ width: "0%" }}
              transition={{ duration: 30, ease: "linear" }}
              className="h-1 bg-white/30"
              onAnimationComplete={handleDismiss}
            />
      </Card>
    </motion.div>
  );
}