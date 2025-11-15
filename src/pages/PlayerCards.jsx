import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreditCard, Download } from "lucide-react";
import QRCode from "react-qr-code";

export default function PlayerCards() {
  const [user, setUser] = useState(null);
  const [myPlayers, setMyPlayers] = useState([]);

  useEffect(() => {
    const fetchUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      const allPlayers = await base44.entities.Player.list();
      const userPlayers = allPlayers.filter(p => 
        p.email_padre === currentUser.email || 
        p.email_tutor_2 === currentUser.email
      );
      setMyPlayers(userPlayers);
    };
    fetchUser();
  }, []);

  const downloadCard = (player) => {
    const card = document.getElementById(`card-${player.id}`);
    if (!card) return;

    import('html2canvas').then(({ default: html2canvas }) => {
      html2canvas(card, {
        backgroundColor: '#ffffff',
        scale: 2
      }).then(canvas => {
        const link = document.createElement('a');
        link.download = `carnet_${player.nombre.replace(/\s+/g, '_')}.png`;
        link.href = canvas.toDataURL();
        link.click();
      });
    });
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
          <CreditCard className="w-8 h-8 text-orange-600" />
          Carnets Digitales
        </h1>
        <p className="text-slate-600 mt-1">Carnets oficiales de tus jugadores</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {myPlayers.map(player => (
          <div key={player.id} className="space-y-3">
            <Card 
              id={`card-${player.id}`}
              className="border-4 border-orange-600 shadow-2xl overflow-hidden"
              style={{ aspectRatio: '1.586', maxWidth: '500px' }}
            >
              <div className="h-full bg-gradient-to-br from-slate-900 via-black to-orange-900 p-6 flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <img 
                    src="https://www.cdbustarviejo.com/uploads/2/4/0/4/2404974/logo-cd-bustarviejo-cuadrado-xpeq_orig.png"
                    alt="Logo"
                    className="w-16 h-16 object-contain"
                  />
                  <div className="text-right">
                    <h2 className="text-white font-bold text-sm">CD BUSTARVIEJO</h2>
                    <p className="text-orange-400 text-xs">TEMPORADA 2024/2025</p>
                  </div>
                </div>

                {/* Contenido Principal */}
                <div className="flex-1 flex gap-4">
                  {/* Foto */}
                  <div className="flex-shrink-0">
                    {player.foto_url ? (
                      <img 
                        src={player.foto_url} 
                        alt={player.nombre}
                        className="w-32 h-32 rounded-lg object-cover border-4 border-orange-500"
                      />
                    ) : (
                      <div className="w-32 h-32 bg-slate-700 rounded-lg flex items-center justify-center border-4 border-orange-500">
                        <span className="text-4xl">👤</span>
                      </div>
                    )}
                  </div>

                  {/* Datos */}
                  <div className="flex-1 space-y-2 text-white">
                    <div>
                      <p className="text-xs text-orange-400 uppercase">Jugador</p>
                      <p className="font-bold text-lg leading-tight">{player.nombre}</p>
                    </div>
                    <div>
                      <p className="text-xs text-orange-400 uppercase">Categoría</p>
                      <p className="font-semibold text-sm">{player.deporte}</p>
                    </div>
                    <div>
                      <p className="text-xs text-orange-400 uppercase">ID</p>
                      <p className="font-mono text-xs">{player.id.substring(0, 12)}</p>
                    </div>
                  </div>
                </div>

                {/* Footer con QR */}
                <div className="flex items-end justify-between mt-4 pt-4 border-t border-orange-500/30">
                  <div className="text-white text-xs">
                    <p className="text-orange-400 uppercase mb-1">Fecha de nacimiento</p>
                    <p>{new Date(player.fecha_nacimiento).toLocaleDateString('es-ES')}</p>
                  </div>
                  <div className="bg-white p-2 rounded">
                    <QRCode 
                      value={`https://cdbustarviejo.com/player/${player.id}`}
                      size={60}
                    />
                  </div>
                </div>
              </div>
            </Card>

            <Button
              onClick={() => downloadCard(player)}
              className="w-full bg-orange-600 hover:bg-orange-700"
            >
              <Download className="w-4 h-4 mr-2" />
              Descargar Carnet de {player.nombre.split(' ')[0]}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}