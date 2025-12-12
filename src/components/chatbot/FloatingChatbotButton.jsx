import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { MessageCircle, X } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import AppChatbot from "./AppChatbot";
import { motion, AnimatePresence } from "framer-motion";

export default function FloatingChatbotButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Botón flotante - solo visible en móvil/tablet */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="fixed bottom-24 right-4 z-40 lg:hidden"
      >
        <Button
          onClick={() => setOpen(true)}
          className="w-14 h-14 rounded-full shadow-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 flex items-center justify-center"
        >
          <MessageCircle className="w-6 h-6 text-white" />
        </Button>
      </motion.div>

      {/* Dialog con el chatbot */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl h-[85vh] p-0">
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-purple-600 to-indigo-600">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <MessageCircle className="w-5 h-5" />
                Asistente Virtual
              </h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setOpen(false)}
                className="text-white hover:bg-white/20"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
            <div className="flex-1 overflow-hidden">
              <AppChatbot />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}