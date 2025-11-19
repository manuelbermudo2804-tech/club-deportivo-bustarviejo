import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Check } from "lucide-react";

export default function PollMessage({ poll, onVote, userEmail, messageId }) {
  const [selectedOption, setSelectedOption] = useState(null);
  const [hasVoted, setHasVoted] = useState(false);

  useEffect(() => {
    // Check if user has already voted
    const userVote = poll.votes?.find(v => v.user_email === userEmail);
    if (userVote) {
      setSelectedOption(userVote.option_index);
      setHasVoted(true);
    }
  }, [poll.votes, userEmail]);

  const handleVote = (optionIndex) => {
    if (hasVoted) return;
    
    setSelectedOption(optionIndex);
    setHasVoted(true);
    onVote(messageId, optionIndex);
  };

  const totalVotes = poll.votes?.length || 0;

  const getOptionPercentage = (optionIndex) => {
    if (totalVotes === 0) return 0;
    const optionVotes = poll.votes?.filter(v => v.option_index === optionIndex).length || 0;
    return Math.round((optionVotes / totalVotes) * 100);
  };

  const getOptionVotes = (optionIndex) => {
    return poll.votes?.filter(v => v.option_index === optionIndex).length || 0;
  };

  return (
    <div className="space-y-3">
      <div className="font-semibold text-sm">{poll.question}</div>
      
      <div className="space-y-2">
        {poll.options.map((option, index) => {
          const percentage = getOptionPercentage(index);
          const votes = getOptionVotes(index);
          const isSelected = selectedOption === index;

          return (
            <button
              key={index}
              onClick={() => handleVote(index)}
              disabled={hasVoted}
              className={`w-full text-left transition-all ${
                hasVoted
                  ? 'cursor-default'
                  : 'cursor-pointer hover:bg-white/10'
              }`}
            >
              <div className={`relative rounded-lg border-2 p-3 ${
                isSelected
                  ? 'border-green-500 bg-green-500/10'
                  : hasVoted
                  ? 'border-slate-200'
                  : 'border-slate-300'
              }`}>
                {hasVoted && (
                  <div className="absolute inset-0 rounded-lg overflow-hidden">
                    <div
                      className="h-full bg-green-500/20 transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                )}
                
                <div className="relative flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isSelected && (
                      <Check className="w-4 h-4 text-green-600" />
                    )}
                    <span className="text-sm font-medium">{option}</span>
                  </div>
                  {hasVoted && (
                    <span className="text-xs font-semibold">
                      {percentage}% ({votes})
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="text-xs text-slate-500">
        {totalVotes === 0 ? 'Sé el primero en votar' : `${totalVotes} voto${totalVotes !== 1 ? 's' : ''}`}
      </div>
    </div>
  );
}