import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Globe } from "lucide-react";

const languages = [
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦' }
];

export default function LanguageSelector({ currentLang, onLanguageChange }) {
  return (
    <div className="flex items-center gap-2">
      <Globe className="w-4 h-4 text-slate-500" />
      <Select value={currentLang} onValueChange={onLanguageChange}>
        <SelectTrigger className="w-[150px] h-9">
          <SelectValue>
            {languages.find(l => l.code === currentLang)?.flag} {languages.find(l => l.code === currentLang)?.name}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {languages.map((lang) => (
            <SelectItem key={lang.code} value={lang.code}>
              <span className="flex items-center gap-2">
                <span>{lang.flag}</span>
                <span>{lang.name}</span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}