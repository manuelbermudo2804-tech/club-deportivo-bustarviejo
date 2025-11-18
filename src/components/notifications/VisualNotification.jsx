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
    setTimeout(() => onDismiss(notification.id), 300);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -100, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -100, scale: 0.8 }}
          transition={{ type: "spring", damping: 15, stiffness: 300 }}
          className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-md"
        >
          <Card className={`${config.bg} ${config.textColor} shadow-2xl border-none overflow-hidden ring-4 ${config.ringColor}`}>
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
                  <h3 className="font-bold text-lg mb-1">{notification.titulo}</h3>
                  <p className="text-sm opacity-95 whitespace-pre-wrap">{notification.mensaje}</p>
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
              transition={{ duration: 10, ease: "linear" }}
              className="h-1 bg-white/30"
              onAnimationComplete={handleDismiss}
            />
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}