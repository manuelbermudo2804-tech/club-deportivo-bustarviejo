import React, { useState } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronDown, Check } from 'lucide-react';

const isMobile = () => typeof window !== 'undefined' && window.innerWidth < 1024;

export default function MobileSelectDrawer({ value, onValueChange, options, placeholder, label, disabled }) {
  const [open, setOpen] = useState(false);

  const selectedLabel = options?.find(opt => opt.value === value)?.label || placeholder;

  // Desktop: standard Select
  if (!isMobile()) {
    return (
      <Select value={value} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options?.map(opt => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  // Mobile: Drawer bottom sheet
  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-between px-3 py-2.5 border border-slate-200 rounded-lg bg-white text-left no-select active:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
      >
        <span className={`text-sm truncate ${value ? 'text-slate-900' : 'text-slate-400'}`}>
          {selectedLabel}
        </span>
        <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0 ml-2" />
      </button>

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent>
          <DrawerHeader className="border-b border-slate-100">
            <DrawerTitle className="text-lg">{label || placeholder || 'Seleccionar'}</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pt-2 pb-6 max-h-[60vh] overflow-y-auto safe-area-bottom">
            {options?.map(opt => {
              const isSelected = value === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onValueChange(opt.value);
                    setOpen(false);
                  }}
                  className={`w-full flex items-center justify-between p-4 rounded-xl text-left transition-colors no-select mb-1 min-h-[52px] ${
                    isSelected
                      ? 'bg-orange-600 text-white font-semibold'
                      : 'bg-slate-50 text-slate-800 active:bg-slate-200'
                  }`}
                >
                  <span className="text-sm">{opt.label}</span>
                  {isSelected && <Check className="w-5 h-5 flex-shrink-0" />}
                </button>
              );
            })}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}