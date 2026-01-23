import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Cake } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export default function BirthdayWidget() {
  const [cumpleañeros, setCumpleañeros] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBirthdays = async () => {
      try {
        setLoading(true);
        const today = new Date();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const todayMDKey = `${month}-${day}`;

        // Buscar en BirthdayLog registros de hoy
        const logs = await base44.entities.BirthdayLog.filter({
          email_enviado: true
        });

        const hoyEnviados = logs.filter(log => {
          if (!log.fecha_envio_email) return false;
          const logDate = log.fecha_envio_email.split('T')[0];
          const todayStr = today.toISOString().split('T')[0];
          return logDate === todayStr;
        });

        // Limitarse a 3 (widget)
        setCumpleañeros(hoyEnviados.slice(0, 3));
      } catch (error) {
        console.error('Error cargando cumpleañeros:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBirthdays();
  }, []);

  if (loading) {
    return (
      <Card className="bg-gradient-to-br from-orange-50 to-yellow-50 border-2 border-orange-300">
        <CardContent className="p-4 text-center text-orange-600">
          <Cake className="w-6 h-6 mx-auto animate-bounce" />
          <p className="text-sm font-semibold mt-2">Cargando...</p>
        </CardContent>
      </Card>
    );
  }

  if (cumpleañeros.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6"
    >
      <Card className="bg-gradient-to-br from-orange-50 to-yellow-50 border-2 border-orange-400 shadow-lg">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Cake className="w-6 h-6 text-orange-600 animate-bounce" />
            <h3 className="font-bold text-orange-700">🎂 Cumpleañeros de hoy</h3>
          </div>

          <div className="space-y-2">
            {cumpleañeros.map((c, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="flex items-center gap-2 bg-white/60 p-2 rounded-lg"
              >
                <span className="text-lg">🎉</span>
                <div className="flex-1">
                  <p className="font-semibold text-orange-900 text-sm">
                    {c.destinatario_nombre}
                  </p>
                  <p className="text-xs text-orange-600">
                    ¡{c.edad} años! {c.destinatario_tipo === 'jugador_menor' ? '👦' : c.destinatario_tipo === 'jugador_adulto' ? '⚽' : c.destinatario_tipo === 'padre' ? '👨‍👩‍👧' : c.destinatario_tipo === 'socio' ? '🎫' : c.destinatario_tipo === 'entrenador' ? '🏃' : '🎓'}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>

          <p className="text-xs text-orange-600 text-center mt-3 italic">
            ¡Que disfruten de su día especial! 🎈
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}