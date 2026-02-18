import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Mail, Phone, ChevronDown, ChevronUp, Clock } from "lucide-react";

export default function CoachProfilePreview({ coach, defaultOpen = false }) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);

  if (!coach) {
    console.log('⚠️ CoachProfilePreview: No coach data');
    return null;
  }

  console.log('✅ CoachProfilePreview: Mostrando perfil de', coach.full_name);

  return (
    <Card className="border-blue-200 bg-blue-50">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full"
      >
        <CardContent className="p-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {coach.foto_perfil_url ? (
                <img
                  src={coach.foto_perfil_url}
                  alt={coach.full_name}
                  className="w-9 h-9 rounded-full object-cover border-2 border-blue-300"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold text-sm border-2 border-blue-300">
                  {coach.full_name?.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="text-left">
                <p className="font-bold text-slate-900 text-sm">{coach.full_name}</p>
                <p className="text-xs text-blue-700 flex items-center gap-1">
                  🏃 Entrenador
                </p>
              </div>
            </div>
            {isOpen ? <ChevronUp className="w-4 h-4 text-blue-600" /> : <ChevronDown className="w-4 h-4 text-blue-600" />}
          </div>
        </CardContent>
      </button>
      
      {isOpen && (
        <CardContent className="px-4 pb-4 space-y-4 border-t border-blue-200 bg-white">
            {/* Categorías */}
            {coach.categorias_entrena && coach.categorias_entrena.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-600 mb-2">Categorías:</p>
                <div className="flex flex-wrap gap-1">
                  {coach.categorias_entrena.map(cat => (
                    <Badge key={cat} className="bg-blue-100 text-blue-700 text-xs">
                      {cat}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Bio */}
            {coach.bio_entrenador && (
              <div>
                <p className="text-xs font-semibold text-slate-600 mb-1">Sobre el entrenador:</p>
                <p className="text-sm text-slate-700 italic">
                  "{coach.bio_entrenador}"
                </p>
              </div>
            )}

            {/* Contacto */}
            <div>
              <p className="text-xs font-semibold text-slate-600 mb-2">Contacto:</p>
              <div className="space-y-2">
                {coach.mostrar_email_publico ? (
                  <a 
                    href={`mailto:${coach.email}`}
                    className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
                  >
                    <Mail className="w-4 h-4" />
                    {coach.email}
                  </a>
                ) : null}
                
                {coach.mostrar_telefono_publico && coach.telefono_contacto ? (
                  <a 
                    href={`tel:${coach.telefono_contacto}`}
                    className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
                  >
                    <Phone className="w-4 h-4" />
                    {coach.telefono_contacto}
                  </a>
                ) : null}

                {!coach.mostrar_email_publico && !coach.mostrar_telefono_publico && (
                  <p className="text-xs text-slate-400 italic">
                    💬 Contacto disponible por chat de la app
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        )}
    </Card>
  );
}