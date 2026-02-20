import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { User, Mail, Phone, MapPin, Calendar, Heart, AlertTriangle, Users } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import PlayerEvaluationsSection from "../evaluations/PlayerEvaluationsSection";

export default function PlayerDetailDialog({ player, open, onOpenChange }) {
  const [coach, setCoach] = useState(null);
  const [evaluations, setEvaluations] = useState([]);

  useEffect(() => {
    const fetchCoach = async () => {
      if (!player?.deporte || !open) return;
      try {
        const users = await base44.entities.User.list();
        const coachUser = users.find(u => 
          u.es_entrenador && 
          u.categorias_entrena?.includes(player.deporte)
        );
        setCoach(coachUser || null);
      } catch (error) {
        console.error("Error fetching coach:", error);
      }
    };
    fetchCoach();
  }, [player?.deporte, open]);

  useEffect(() => {
    const fetchEvaluations = async () => {
      if (!player?.id || !open) return;
      try {
        const evals = await base44.entities.PlayerEvaluation.filter(
          { jugador_id: player.id, visible_para_padres: true },
          "-fecha_evaluacion",
          10
        );
        setEvaluations(evals);
      } catch (error) {
        console.error("Error fetching evaluations:", error);
      }
    };
    fetchEvaluations();
  }, [player?.id, open]);
  if (!player) return null;

  const hasMedicalInfo = player.ficha_medica && Object.values(player.ficha_medica).some(val => val);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-3">
            {player.foto_url ? (
              <img
                src={player.foto_url}
                alt={player.nombre}
                className="w-16 h-16 rounded-full object-cover border-4 border-orange-200"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-2xl font-bold">
                {player.nombre?.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <p>{player.nombre}</p>
              <Badge className="bg-blue-600 text-white mt-1">
                {player.deporte}
              </Badge>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Información Personal */}
          <div className="bg-slate-50 rounded-lg p-4 space-y-3">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <User className="w-5 h-5 text-orange-600" />
              Información Personal
            </h3>
            
            {player.fecha_nacimiento && (
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-slate-500" />
                <span className="text-slate-700">
                  {format(new Date(player.fecha_nacimiento), "d 'de' MMMM 'de' yyyy", { locale: es })}
                  {' '}({Math.floor((new Date() - new Date(player.fecha_nacimiento)) / (365.25 * 24 * 60 * 60 * 1000))} años)
                </span>
              </div>
            )}

            {player.direccion && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="w-4 h-4 text-slate-500" />
                <span className="text-slate-700">{player.direccion}</span>
              </div>
            )}

            {player.numero_camiseta && (
              <div className="flex items-center gap-2 text-sm">
                <span className="font-bold text-slate-700">Dorsal:</span>
                <Badge className="bg-slate-900 text-white">{player.numero_camiseta}</Badge>
              </div>
            )}
          </div>

          {/* Contactos */}
          <div className="bg-blue-50 rounded-lg p-4 space-y-3">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              Contactos
            </h3>

            {/* Primer Progenitor */}
            <div className="space-y-2">
              <p className="text-sm font-semibold text-blue-900">Primer Progenitor/Tutor:</p>
              {player.email_padre && (
                <a href={`mailto:${player.email_padre}`} className="flex items-center gap-2 text-sm text-slate-700 hover:text-blue-600">
                  <Mail className="w-4 h-4" />
                  {player.email_padre}
                </a>
              )}
              {player.telefono && (
                <a href={`tel:${player.telefono}`} className="flex items-center gap-2 text-sm text-slate-700 hover:text-blue-600">
                  <Phone className="w-4 h-4" />
                  {player.telefono}
                </a>
              )}
            </div>

            {/* Segundo Progenitor */}
            {(player.email_tutor_2 || player.telefono_tutor_2) && (
              <div className="space-y-2 pt-2 border-t border-blue-200">
                <p className="text-sm font-semibold text-blue-900">Segundo Progenitor/Tutor:</p>
                {player.email_tutor_2 && (
                  <a href={`mailto:${player.email_tutor_2}`} className="flex items-center gap-2 text-sm text-slate-700 hover:text-blue-600">
                    <Mail className="w-4 h-4" />
                    {player.email_tutor_2}
                  </a>
                )}
                {player.telefono_tutor_2 && (
                  <a href={`tel:${player.telefono_tutor_2}`} className="flex items-center gap-2 text-sm text-slate-700 hover:text-blue-600">
                    <Phone className="w-4 h-4" />
                    {player.telefono_tutor_2}
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Ficha Médica */}
          {hasMedicalInfo && (
            <div className="bg-red-50 rounded-lg p-4 space-y-3 border-2 border-red-200">
              <h3 className="font-bold text-red-900 flex items-center gap-2">
                <Heart className="w-5 h-5 text-red-600" />
                Ficha Médica
              </h3>

              <div className="space-y-3">
                {player.ficha_medica.alergias && (
                  <div className="bg-white rounded-lg p-3 border border-red-200">
                    <p className="font-semibold text-red-800 mb-1 flex items-center gap-2">
                      🚨 Alergias
                    </p>
                    <p className="text-slate-700 text-sm">{player.ficha_medica.alergias}</p>
                  </div>
                )}

                {player.ficha_medica.grupo_sanguineo && (
                  <div className="bg-white rounded-lg p-3 border border-red-200">
                    <p className="font-semibold text-red-800 mb-1 flex items-center gap-2">
                      🩸 Grupo Sanguíneo
                    </p>
                    <p className="text-slate-700 text-lg font-bold">{player.ficha_medica.grupo_sanguineo}</p>
                  </div>
                )}

                {player.ficha_medica.medicacion_habitual && (
                  <div className="bg-white rounded-lg p-3 border border-red-200">
                    <p className="font-semibold text-red-800 mb-1 flex items-center gap-2">
                      💊 Medicación Habitual
                    </p>
                    <p className="text-slate-700 text-sm">{player.ficha_medica.medicacion_habitual}</p>
                  </div>
                )}

                {player.ficha_medica.condiciones_medicas && (
                  <div className="bg-white rounded-lg p-3 border border-red-200">
                    <p className="font-semibold text-red-800 mb-1 flex items-center gap-2">
                      ⚕️ Condiciones Médicas
                    </p>
                    <p className="text-slate-700 text-sm">{player.ficha_medica.condiciones_medicas}</p>
                  </div>
                )}

                {player.ficha_medica.lesiones && (
                  <div className="bg-yellow-50 rounded-lg p-3 border-2 border-yellow-300">
                    <p className="font-semibold text-yellow-900 mb-1 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      Lesiones
                    </p>
                    <p className="text-slate-700 text-sm">{player.ficha_medica.lesiones}</p>
                  </div>
                )}

                {(player.ficha_medica.contacto_emergencia_nombre || player.ficha_medica.contacto_emergencia_telefono) && (
                  <div className="bg-white rounded-lg p-3 border border-red-200">
                    <p className="font-semibold text-red-800 mb-1 flex items-center gap-2">
                      📞 Contacto de Emergencia
                    </p>
                    <div className="space-y-1">
                      {player.ficha_medica.contacto_emergencia_nombre && (
                        <p className="text-slate-700 text-sm">
                          <strong>Nombre:</strong> {player.ficha_medica.contacto_emergencia_nombre}
                        </p>
                      )}
                      {player.ficha_medica.contacto_emergencia_telefono && (
                        <a href={`tel:${player.ficha_medica.contacto_emergencia_telefono}`} className="text-slate-700 text-sm hover:text-red-600 flex items-center gap-2">
                          <Phone className="w-4 h-4" />
                          <span><strong>Teléfono:</strong> {player.ficha_medica.contacto_emergencia_telefono}</span>
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {player.ficha_medica.observaciones_medicas && (
                  <div className="bg-white rounded-lg p-3 border border-red-200">
                    <p className="font-semibold text-red-800 mb-1 flex items-center gap-2">
                      📋 Observaciones Médicas
                    </p>
                    <p className="text-slate-700 text-sm">{player.ficha_medica.observaciones_medicas}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Evaluaciones del Entrenador */}
          <PlayerEvaluationsSection evaluations={evaluations} />

          {/* Entrenador */}
          {coach && (
            <div className="bg-green-50 rounded-lg p-4 space-y-3 border border-green-200">
              <h3 className="font-bold text-green-900 flex items-center gap-2">
                🏃 Entrenador
              </h3>
              <div className="flex items-center gap-3">
                {coach.foto_perfil_url ? (
                  <img
                    src={coach.foto_perfil_url}
                    alt={coach.full_name}
                    className="w-14 h-14 rounded-full object-cover border-2 border-green-300"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center text-white text-lg font-bold">
                    {coach.full_name?.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1">
                  <p className="font-semibold text-green-900">{coach.full_name}</p>
                  {coach.bio_entrenador && (
                    <p className="text-xs text-green-700 italic mt-0.5">"{coach.bio_entrenador}"</p>
                  )}
                  <div className="flex flex-wrap gap-1 mt-1">
                    {coach.categorias_entrena?.map(cat => (
                      <Badge key={cat} className="bg-green-100 text-green-700 text-[10px]">
                        {cat}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
              
              {/* Contacto del entrenador - solo si lo permite */}
              {(coach.mostrar_email_publico || coach.mostrar_telefono_publico) && (
                <div className="pt-2 border-t border-green-200 space-y-1">
                  <p className="text-xs font-semibold text-green-800">Contacto:</p>
                  {coach.mostrar_email_publico && coach.email && (
                    <a href={`mailto:${coach.email}`} className="flex items-center gap-2 text-sm text-green-700 hover:text-green-900">
                      <Mail className="w-4 h-4" />
                      {coach.email}
                    </a>
                  )}
                  {coach.mostrar_telefono_publico && coach.telefono_contacto && (
                    <a href={`tel:${coach.telefono_contacto}`} className="flex items-center gap-2 text-sm text-green-700 hover:text-green-900">
                      <Phone className="w-4 h-4" />
                      {coach.telefono_contacto}
                    </a>
                  )}
                </div>
              )}
              
              {!coach.mostrar_email_publico && !coach.mostrar_telefono_publico && (
                <p className="text-xs text-green-600 italic">
                  💬 Contacta a través del chat de la app
                </p>
              )}
            </div>
          )}

          {/* Observaciones */}
          {player.observaciones && (
            <div className="bg-slate-50 rounded-lg p-4">
              <h3 className="font-bold text-slate-900 mb-2">Observaciones</h3>
              <p className="text-slate-700 text-sm">{player.observaciones}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}