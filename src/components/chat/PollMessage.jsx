import React, { useState } from "react";
import { CheckCircle2, Users } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function PollMessage({ encuesta, messageId, userEmail, userName, onVote, isCreator }) {
  const [showVotersDialog, setShowVotersDialog] = useState(false);
  const [selectedOption, setSelectedOption] = useState(null);
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

  const getVotersForOption = (index) => {
    return encuesta.votos?.filter(v => v.opcion_index === index) || [];
  };

  const myVote = encuesta.votos?.find(v => v.usuario_email === userEmail);

  return (
    <div className="mt-2 bg-white rounded-2xl p-4 border-2 border-slate-200 shadow-sm">
      <div className="mb-3">
        <p className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
          📊 Encuesta
          {isClosed && <span className="text-xs text-red-600 bg-red-100 px-2 py-0.5 rounded-full">Cerrada</span>}
        </p>
        <p className="text-base font-semibold text-slate-800 leading-snug">{encuesta.pregunta}</p>
      </div>
      
      <div className="space-y-2.5">
        {encuesta.opciones.map((opcion, index) => {
          const votes = getVotesForOption(index);
          const percentage = getPercentage(index);
          const isMyVote = myVote?.opcion_index === index;
          
          return (
            <button
              key={index}
              onClick={() => !hasVoted && !isClosed && onVote(messageId, index)}
              disabled={hasVoted || isClosed}
              className={`w-full text-left p-4 rounded-xl border-2 transition-all relative overflow-hidden ${
                isMyVote 
                  ? 'bg-green-50 border-green-500 shadow-md' 
                  : hasVoted || isClosed 
                    ? 'bg-slate-50 border-slate-200 cursor-not-allowed' 
                    : 'bg-white border-slate-300 hover:bg-slate-50 hover:border-slate-400 cursor-pointer active:scale-[0.98] hover:shadow-md'
              }`}
            >
              {/* Barra de progreso - solo visible si hay votos */}
              {totalVotes > 0 && (
                <div 
                  className={`absolute left-0 top-0 bottom-0 ${isMyVote ? 'bg-green-200' : 'bg-blue-100'} opacity-50 transition-all duration-700`}
                  style={{ width: `${percentage}%` }}
                />
              )}
              
              <div className="relative z-10 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-1">
                  {isMyVote && <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />}
                  <span className={`text-base font-medium ${isMyVote ? 'text-green-900' : 'text-slate-900'}`}>
                    {opcion}
                  </span>
                </div>
                
                {hasVoted && (
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-bold ${isMyVote ? 'text-green-700' : 'text-slate-600'}`}>
                      {percentage}%
                    </span>
                    <span className={`text-xs bg-white px-2 py-0.5 rounded-full ${isMyVote ? 'text-green-600 border border-green-200' : 'text-slate-500 border'}`}>
                      {votes}
                    </span>
                    {isCreator && votes > 0 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedOption(index);
                          setShowVotersDialog(true);
                        }}
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-full p-1 transition-colors"
                        title="Ver quién votó"
                      >
                        <Users className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-3 pt-3 border-t border-blue-200 flex items-center justify-between">
        <p className="text-xs text-slate-600">
          {totalVotes === 0 ? "👆 Toca una opción para votar" : `${totalVotes} persona${totalVotes !== 1 ? 's' : ''} ${totalVotes !== 1 ? 'han' : 'ha'} votado`}
        </p>
        {hasVoted && !isClosed && (
          <p className="text-xs text-green-600 font-medium flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            ✅ Tu voto registrado
          </p>
        )}
      </div>

      {/* Diálogo para ver votantes */}
      <Dialog open={showVotersDialog} onOpenChange={setShowVotersDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              Votaron: {encuesta.opciones[selectedOption]}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {selectedOption !== null && getVotersForOption(selectedOption).length === 0 ? (
              <p className="text-center text-slate-500 py-4">Nadie ha votado esta opción aún</p>
            ) : (
              getVotersForOption(selectedOption).map((voter, idx) => (
                <div key={idx} className="bg-slate-50 rounded-lg p-3 border flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm font-bold text-blue-700">
                    {voter.usuario_nombre?.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">{voter.usuario_nombre}</p>
                    <p className="text-xs text-slate-500">
                      {new Date(voter.fecha).toLocaleString('es-ES', { 
                        day: 'numeric', 
                        month: 'short', 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}