import React from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, BarChart3 } from "lucide-react";

export default function PollMessage({ poll, onVote, userEmail, messageId }) {
  if (!poll) return null;

  const totalVotes = poll.votes?.length || 0;
  const userVote = poll.votes?.find(v => v.user_email === userEmail);
  const hasVoted = !!userVote;

  const getVoteCount = (optionIndex) => {
    return poll.votes?.filter(v => v.option_index === optionIndex).length || 0;
  };

  const getPercentage = (optionIndex) => {
    if (totalVotes === 0) return 0;
    return Math.round((getVoteCount(optionIndex) / totalVotes) * 100);
  };

  return (
    <div className="bg-white/90 rounded-lg p-3 mt-2 border border-slate-200">
      <div className="flex items-center gap-2 mb-3">
        <BarChart3 className="w-4 h-4 text-orange-600" />
        <span className="font-semibold text-sm text-slate-900">{poll.question}</span>
      </div>

      <div className="space-y-2">
        {poll.options.map((option, index) => {
          const voteCount = getVoteCount(index);
          const percentage = getPercentage(index);
          const isSelected = userVote?.option_index === index;

          return (
            <div key={index}>
              {hasVoted ? (
                // Vista de resultados
                <div className="relative">
                  <div className={`p-2 rounded-lg border ${
                    isSelected 
                      ? 'border-orange-500 bg-orange-50' 
                      : 'border-slate-200 bg-slate-50'
                  }`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-sm ${isSelected ? 'font-semibold text-orange-700' : 'text-slate-700'}`}>
                        {isSelected && <CheckCircle2 className="w-4 h-4 inline mr-1 text-orange-600" />}
                        {option}
                      </span>
                      <span className="text-xs font-medium text-slate-600">
                        {percentage}% ({voteCount})
                      </span>
                    </div>
                    <Progress 
                      value={percentage} 
                      className={`h-1.5 ${isSelected ? '[&>div]:bg-orange-500' : '[&>div]:bg-slate-400'}`}
                    />
                  </div>
                </div>
              ) : (
                // Vista para votar
                <Button
                  variant="outline"
                  onClick={() => onVote(messageId, index)}
                  className="w-full justify-start text-left h-auto py-2 hover:bg-orange-50 hover:border-orange-300 hover:text-orange-700"
                >
                  <span className="w-5 h-5 rounded-full border-2 border-slate-300 mr-2 flex-shrink-0" />
                  <span className="text-sm">{option}</span>
                </Button>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-3 pt-2 border-t border-slate-200 flex items-center justify-between">
        <span className="text-xs text-slate-500">
          {totalVotes} {totalVotes === 1 ? 'voto' : 'votos'}
        </span>
        {hasVoted && (
          <span className="text-xs text-green-600 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            Has votado
          </span>
        )}
      </div>
    </div>
  );
}