import React from "react";

export default function MessageReactions({ reactions, userEmail, onToggleReaction }) {
  if (!reactions || reactions.length === 0) return null;

  // Agrupar reacciones por emoji
  const grouped = reactions.reduce((acc, r) => {
    if (!acc[r.emoji]) {
      acc[r.emoji] = { count: 0, users: [], userReacted: false };
    }
    acc[r.emoji].count++;
    acc[r.emoji].users.push(r.user_name || r.user_email);
    if (r.user_email === userEmail) {
      acc[r.emoji].userReacted = true;
    }
    return acc;
  }, {});

  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {Object.entries(grouped).map(([emoji, data]) => (
        <button
          key={emoji}
          onClick={() => onToggleReaction && onToggleReaction(emoji)}
          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs transition-all ${
            data.userReacted 
              ? 'bg-blue-100 border border-blue-300' 
              : 'bg-slate-100 border border-slate-200 hover:bg-slate-200'
          }`}
          title={data.users.join(', ')}
        >
          <span>{emoji}</span>
          <span className={`font-medium ${data.userReacted ? 'text-blue-700' : 'text-slate-600'}`}>
            {data.count}
          </span>
        </button>
      ))}
    </div>
  );
}