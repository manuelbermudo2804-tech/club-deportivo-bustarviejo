import React from "react";
import { format, isToday, isYesterday } from "date-fns";
import { es } from "date-fns/locale";

export default function DateSeparator({ date }) {
  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    
    if (isToday(d)) {
      return "Hoy";
    }
    if (isYesterday(d)) {
      return "Ayer";
    }
    return format(d, "EEEE d 'de' MMMM", { locale: es });
  };

  return (
    <div className="flex items-center justify-center my-4">
      <div className="bg-slate-200/80 text-slate-600 text-xs font-medium px-3 py-1 rounded-full shadow-sm">
        {formatDate(date)}
      </div>
    </div>
  );
}

// Helper function to group messages by date
export function groupMessagesByDate(messages) {
  if (!messages || messages.length === 0) return [];
  
  const groups = [];
  let currentDate = null;
  
  // Sort messages from oldest to newest
  const sortedMessages = [...messages].sort(
    (a, b) => new Date(a.created_date) - new Date(b.created_date)
  );
  
  sortedMessages.forEach(msg => {
    const msgDate = new Date(msg.created_date).toDateString();
    
    if (msgDate !== currentDate) {
      currentDate = msgDate;
      groups.push({ type: 'date', date: msg.created_date });
    }
    groups.push({ type: 'message', data: msg });
  });
  
  return groups;
}