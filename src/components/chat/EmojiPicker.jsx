import React, { useState, useRef } from "react";
import { Smile, X, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const EMOJI_CATEGORIES = {
  "Sonrisas": ["😀", "😃", "😄", "😁", "😆", "😅", "🤣", "😂", "🙂", "🙃", "😉", "😊", "😇", "🥰", "😍", "🤩", "😘", "😗", "😚", "😙", "🥲", "😋", "😛", "😜", "🤪", "😌", "😔", "😑", "😐", "😶", "🥱", "😏", "😒", "🙄", "😬", "🤥", "😌", "😔", "😪", "🤤", "😴", "😷", "🤒", "🤕", "🤢", "🤮", "🤮", "🤧", "🤬", "😈", "👿"],
  "Gestos": ["👋", "🤚", "🖐️", "✋", "🖖", "👌", "🤌", "🤏", "✌️", "🤞", "🫰", "🤟", "🤘", "🤙", "👍", "👎", "✊", "👊", "🤛", "🤜", "👏", "🙌", "👐", "🤲", "🤝", "🤜", "🤛", "🙏", "💅", "🦾", "🦿", "👂", "👃", "🧠", "🦷", "🦴", "👀", "👁️", "👅", "👄"],
  "Corazones": ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔", "💕", "💞", "💓", "💗", "💖", "💘", "💝", "💟", "💌", "💋", "💯", "💢", "💥", "💫", "💦", "💨"],
  "Celebración": ["🎉", "🎊", "🎈", "🎁", "🎀", "🎂", "🍾", "🥂", "🍻", "🍷", "🍸", "🍹", "🥃", "🍶", "🍺", "🍻", "🥂", "🍾", "🎆", "🎇", "✨", "🌟", "⭐"],
  "Comida": ["🍎", "🍊", "🍋", "🍌", "🍉", "🍇", "🍓", "🍈", "🍒", "🍑", "🥭", "🍍", "🥥", "🥑", "🍆", "🍅", "🌽", "🌶️", "🥒", "🥬", "🥦", "🧄", "🧅", "🍄", "🥜", "🌰", "🍞", "🥐", "🥖", "🥨", "🥯", "🥞", "🧇", "🥚", "🍳", "🧈", "🥓", "🥞", "🥓", "🍗", "🍖", "🌭", "🍔", "🍟", "🍕", "🥪", "🥙", "🧆", "🌮", "🌯", "🥗", "🥘", "🥫", "🍝", "🍜", "🍲", "🍛", "🍣", "🍱", "🥟", "🦪", "🍤", "🍙", "🍚", "🍘", "🍥", "🥠", "🥮", "🍢", "🍡", "🍧", "🍨", "🍦", "🍰", "🎂", "🧁", "🍮", "🍭", "🍬", "🍫", "🍿", "🍩", "🍪", "🌰", "🍯", "🍼"],
  "Animales": ["🐶", "🐱", "🐭", "🐹", "🐰", "🦊", "🐻", "🐼", "🐨", "🐯", "🦁", "🐮", "🐷", "🐽", "🐸", "🐵", "🐒", "🐶", "🐔", "🐧", "🐦", "🐤", "🐣", "🐥", "🦆", "🦅", "🦉", "🦇", "🐺", "🐗", "🐴", "🦄", "🐝", "🐛", "🦋", "🐌", "🐞", "🐜", "🪰", "🦟", "🦗", "🕷️", "🦂", "🐢", "🐍", "🦎", "🦖", "🦕", "🐙", "🦑", "🦐", "🦞", "🦀", "🐡", "🐠", "🐟", "🐬", "🐳", "🐋", "🦈", "🐊", "🐅", "🐆", "🦓", "🦍", "🦧", "🐘", "🦛", "🦏", "🐪", "🐫", "🦒", "🦘", "🐃", "🐂", "🐄", "🐎", "🐖", "🐏", "🐑", "🦉", "🦇"],
  "Símbolos": ["❤️", "💔", "💕", "💞", "💓", "💗", "💖", "💘", "💝", "💟", "☮️", "✝️", "☪️", "🕉️", "☸️", "✡️", "🔯", "🕎", "☬", "🔯", "⭐", "🌟", "✨", "⚡", "☄️", "💥", "🔥", "🌪️", "🌈", "☀️", "🌤️", "⛅", "🌥️", "☁️", "🌦️", "🌧️", "⛈️", "🌩️", "⚡", "💧", "💦", "🌨️", "❄️", "☃️", "⛄", "🌬️", "💨", "💨", "🌪️", "🌀", "🌠", "🌌", "⭐"],
  "Deportes": ["⚽", "🏀", "🏈", "⚾", "🥎", "🎾", "🏐", "🏉", "🥏", "🎳", "🏓", "🏸", "🏒", "🏑", "🥊", "🥋", "⛳", "⛸️", "🎣", "🎽", "🎿", "⛷️", "🏂", "🪂", "🏋️", "🤼", "🤸", "⛹️", "🤺", "🤾", "🏌️", "🏇", "🧘", "🚴", "🚵", "🏇", "🏄", "🚣", "🏊", "⛵", "🚤", "🛶"],
  "Viajes": ["🚗", "🚕", "🚙", "🚌", "🚎", "🏎️", "🚓", "🚑", "🚒", "🚐", "🛻", "🚚", "🚛", "🚜", "🏍️", "🏎️", "🛵", "🦯", "🦽", "🦼", "🛺", "🚲", "🛴", "🛹", "🛼", "🚏", "⛽", "🚨", "🚔", "🚍", "🚘", "🚖", "🚡", "🚠", "🎢", "🚄", "🚅", "🚈", "🚝", "🚞", "🚋", "🚃", "🚌", "🚎", "🚐", "🚑", "🛤️", "🛣️", "🗾", "🎑"],
  "Objetos": ["🎮", "🎯", "🎲", "♠️", "♥️", "♦️", "♣️", "🎭", "🎨", "🎪", "🎬", "🎤", "🎧", "🎼", "🎹", "🥁", "🎷", "🎺", "🎸", "🎻", "🎲", "♟️", "🎯", "🎳", "🎮", "🎰", "🎲", "📚", "📖", "📝", "✏️", "✒️", "🖋️", "🖊️", "🖌️", "🖍️", "📁", "📂", "📅", "📆", "📇", "📈", "📉", "📊", "📋", "📌", "📍", "📎", "🖇️", "📐", "📏", "📧", "📨", "📩", "📤", "📥", "📦", "🏷️", "🗂️", "🗃️", "🗳️", "🗄️"],
  "Reciente": [] // Se llena automáticamente
};

export default function EmojiPicker({ onEmojiSelect, onClose, messageText = "", autoOpen = true, showInlineButton = false }) {
  const [showPicker, setShowPicker] = useState(autoOpen);
  const [searchTerm, setSearchTerm] = useState("");
  const [recent, setRecent] = useState([]);
  const pickerRef = useRef(null);

  // Cargar recientes del localStorage
  React.useEffect(() => {
    const stored = localStorage.getItem('recentEmojis');
    if (stored) {
      setRecent(JSON.parse(stored));
    }
  }, []);

  // Cerrar al hacer click fuera
  React.useEffect(() => {
    const handleClickOutside = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        setShowPicker(false);
        try { onClose && onClose(); } catch {}
      }
    };
    if (showPicker) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showPicker]);

  const handleEmojiSelect = (emoji) => {
    onEmojiSelect(emoji);
    
    // Guardar en recientes
    const updated = [emoji, ...recent.filter(e => e !== emoji)].slice(0, 16);
    setRecent(updated);
    localStorage.setItem('recentEmojis', JSON.stringify(updated));
    
    setShowPicker(false);
    try { onClose && onClose(); } catch {}
  };

  // Filtrar emojis por búsqueda
  const filteredCategories = React.useMemo(() => {
    if (!searchTerm.trim()) {
      return EMOJI_CATEGORIES;
    }

    const filtered = {};
    Object.entries(EMOJI_CATEGORIES).forEach(([category, emojis]) => {
      filtered[category] = emojis;
    });
    return filtered;
  }, [searchTerm]);

  return (
    <div ref={pickerRef} className="relative">
      {showInlineButton && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setShowPicker(!showPicker)}
          className="h-10 w-10 text-xl hover:bg-slate-100"
          title="Agregar emoji"
        >
          😊
        </Button>
      )}>

      {showPicker && (
        <div className="absolute bottom-12 left-0 z-[300] bg-white border border-slate-200 rounded-2xl shadow-2xl p-3 w-80 max-h-[450px] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-sm">Emojis</h3>
            <button
              onClick={() => { setShowPicker(false); try { onClose && onClose(); } catch {} }}
              className="text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Búsqueda */}
          <div className="relative mb-3">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Buscar emoji..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 h-8 text-sm"
              autoFocus
            />
          </div>

          {/* Emojis */}
          <div className="flex-1 overflow-y-auto space-y-3">
            {/* Recientes */}
            {recent.length > 0 && !searchTerm && (
              <div>
                <p className="text-xs font-semibold text-slate-600 mb-2">Recientes</p>
                <div className="flex flex-wrap gap-1">
                  {recent.map((emoji, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleEmojiSelect(emoji)}
                      className="text-3xl hover:bg-slate-100 rounded-lg p-2 transition-all active:scale-95"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Categorías */}
            {Object.entries(filteredCategories).map(([category, emojis]) => (
              emojis.length > 0 && (
                <div key={category}>
                  <p className="text-xs font-semibold text-slate-600 mb-2">{category}</p>
                  <div className="flex flex-wrap gap-1">
                    {emojis.map((emoji, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleEmojiSelect(emoji)}
                        className="text-3xl hover:bg-slate-100 rounded-lg p-2 transition-all active:scale-95"
                        title={emoji}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              )
            ))}
          </div>

          {/* Footer */}
          <div className="text-xs text-slate-400 text-center mt-3 pt-2 border-t">
            Click en cualquier emoji para insertar
          </div>
        </div>
      )}
    </div>
  );
}