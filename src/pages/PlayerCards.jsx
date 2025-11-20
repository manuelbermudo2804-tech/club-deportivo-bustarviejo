import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreditCard, Download } from "lucide-react";

const getCurrentSeason = () => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  
  if (currentMonth >= 9) {
    return `${currentYear}/${currentYear + 1}`;
  }
  return `${currentYear - 1}/${currentYear}`;
};

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

  const downloadCard = async (player) => {
    const card = document.getElementById(`card-${player.id}`);
    if (!card) return;

    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(card, {
        backgroundColor: '#ffffff',
        scale: 2
      });
      
      const link = document.createElement('a');
      link.download = `carnet_${player.nombre.replace(/\s+/g, '_')}.png`;
      link.href = canvas.toDataURL();
      link.click();
    } catch (error) {
      console.error('Error downloading card:', error);
    }
  };

  const season = getCurrentSeason();

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
              className="border-4 border-orange-600 shadow-2xl overflow-hidden mx-auto"
              style={{ width: '350px', height: '220px' }}
            >
              <div className="h-full bg-gradient-to-br from-slate-900 via-black to-orange-900 p-4 flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <img 
                    src="https://www.cdbustarviejo.com/uploads/2/4/0/4/2404974/logo-cd-bustarviejo-cuadrado-xpeq_orig.png"
                    alt="Logo"
                    className="w-12 h-12 object-contain"
                  />
                  <div className="text-right">
                    <h2 className="text-white font-bold text-xs">CD BUSTARVIEJO</h2>
                    <p className="text-orange-400 text-[10px]">TEMPORADA {season}</p>
                  </div>
                </div>

                {/* Contenido Principal */}
                <div className="flex-1 flex gap-3">
                  {/* Foto */}
                  <div className="flex-shrink-0">
                    {player.foto_url ? (
                      <img 
                        src={player.foto_url} 
                        alt={player.nombre}
                        className="w-24 h-24 rounded-lg object-cover border-3 border-orange-500"
                      />
                    ) : (
                      <div className="w-24 h-24 bg-slate-700 rounded-lg flex items-center justify-center border-3 border-orange-500">
                        <span className="text-3xl">👤</span>
                      </div>
                    )}
                  </div>

                  {/* Datos */}
                  <div className="flex-1 space-y-1 text-white">
                    <div>
                      <p className="text-[10px] text-orange-400 uppercase">Jugador</p>
                      <p className="font-bold text-sm leading-tight">{player.nombre}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-orange-400 uppercase">Categoría</p>
                      <p className="font-semibold text-[11px]">{player.deporte}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-orange-400 uppercase">ID</p>
                      <p className="font-mono text-[9px]">{player.id.substring(0, 12)}</p>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-end justify-between mt-2 pt-2 border-t border-orange-500/30">
                  <div className="text-white text-[10px]">
                    <p className="text-orange-400 uppercase mb-0.5">Fecha de nacimiento</p>
                    <p className="text-[11px]">{new Date(player.fecha_nacimiento).toLocaleDateString('es-ES')}</p>
                  </div>
                  <div className="bg-white p-1 rounded">
                    <div className="w-10 h-10 bg-slate-800 rounded flex items-center justify-center">
                      <span className="text-orange-500 text-[10px] font-bold">CD</span>
                    </div>
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