import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Users, Calendar } from "lucide-react";
import { motion } from "framer-motion";

export default function NewSeasonWelcome({ seasonName }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-[60vh] flex items-center justify-center p-6"
    >
      <Card className="border-none shadow-2xl bg-gradient-to-br from-green-500 via-green-600 to-green-700 text-white max-w-2xl w-full overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl opacity-10"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-slate-900 rounded-full blur-3xl opacity-20"></div>
        
        <CardContent className="relative z-10 p-8 lg:p-12 text-center space-y-6">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1, rotate: 360 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-8xl mb-4"
          >
            🎉
          </motion.div>
          
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <h1 className="text-4xl lg:text-5xl font-bold mb-3">
              ¡Nueva Temporada {seasonName}!
            </h1>
            <p className="text-xl lg:text-2xl text-green-100 mb-6">
              CD Bustarviejo
            </p>
          </motion.div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="bg-white/20 backdrop-blur-sm rounded-2xl p-6 space-y-4"
          >
            <div className="flex items-center gap-3 justify-center mb-4">
              <Sparkles className="w-8 h-8 text-yellow-300" />
              <p className="text-xl font-bold">¡Comienza una nueva aventura!</p>
              <Sparkles className="w-8 h-8 text-yellow-300" />
            </div>
            
            <p className="text-lg text-white leading-relaxed">
              La temporada anterior ha finalizado.
              <br />
              Es momento de <strong>renovar o inscribir</strong> a tus jugadores para continuar.
            </p>
          </motion.div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="space-y-3"
          >
            <Link to={createPageUrl("ParentPlayers")}>
              <Button
                size="lg"
                className="w-full bg-white text-green-700 hover:bg-green-50 font-bold py-6 text-xl shadow-2xl"
              >
                <Users className="w-6 h-6 mr-3" />
                Registrar / Renovar Jugadores
              </Button>
            </Link>
            
            <div className="grid grid-cols-2 gap-3">
              <Link to={createPageUrl("Calendar")} className="w-full">
                <Button
                  variant="outline"
                  className="w-full bg-white/10 border-white/30 text-white hover:bg-white/20"
                >
                  <Calendar className="w-5 h-5 mr-2" />
                  Calendario
                </Button>
              </Link>
              <Link to={createPageUrl("Announcements")} className="w-full">
                <Button
                  variant="outline"
                  className="w-full bg-white/10 border-white/30 text-white hover:bg-white/20"
                >
                  📢 Anuncios
                </Button>
              </Link>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="text-sm text-green-100 pt-4 border-t border-white/30"
          >
            Una vez registres a tus jugadores, tendrás acceso completo a todas las funciones
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  );
}