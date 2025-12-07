import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Lock } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function PollMessage({ encuesta, messageId, userEmail, userName, onVote }) {
  if (!encuesta) return null;

  const hasVoted = encuesta.votos?.some(v => v.usuario_email === userEmail);
  const totalVotes = encuesta.votos?.length || 0;
  const isClosed = encuesta.cerrada;

  const getVotesForOption = (index) => {
    return encuesta.votos?.filter(v => v.opcion_index === index).length || 0;
  };

  const getPercentage = (index) => {
    if (totalVotes === 0) return 0;
    return Math.round((getVotesForOption(index) / totalVotes) * 100);
  };

  const myVote = encuesta.votos?.find(v => v.usuario_email === userEmail);

  return (
    <div className="mt-3 bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
      <div className="flex items-center gap-2 mb-2">
        <BarChart3 className="w-4 h-4" />
        <p className="font-semibold text-sm">{encuesta.pregunta}</p>
        {isClosed && <Lock className="w-3 h-3 text-yellow-500" />}
      </div>
      
      <div className="space-y-2">
        {encuesta.opciones.map((opcion, index) => {
          const votes = getVotesForOption(index);
          const percentage = getPercentage(index);
          const isMyVote = myVote?.opcion_index === index;
          
          return (
            <div key={index} className="relative">
              <Button
                onClick={() => !hasVoted && !isClosed && onVote(messageId, index)}
                disabled={hasVoted || isClosed}
                variant="outline"
                className={`w-full justify-start text-left relative overflow-hidden ${
                  isMyVote ? 'border-green-500 bg-green-50' : ''
                }`}
              >
                <div 
                  className="absolute left-0 top-0 bottom-0 bg-blue-100/50 transition-all"
                  style={{ width: `${percentage}%` }}
                />
                <span className="relative z-10 flex items-center justify-between w-full">
                  <span className="flex-1">{opcion}</span>
                  {hasVoted && (
                    <span className="text-xs ml-2">
                      {votes} ({percentage}%)
                      {isMyVote && ' ✓'}
                    </span>
                  )}
                </span>
              </Button>
            </div>
          );
        })}
      </div>
      
      <div className="flex items-center justify-between mt-2 text-xs opacity-70">
        <span>{totalVotes} {totalVotes === 1 ? 'voto' : 'votos'}</span>
        {isClosed && <Badge variant="outline" className="text-xs">Cerrada</Badge>}
      </div>
    </div>
  );
}