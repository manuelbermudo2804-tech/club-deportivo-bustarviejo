import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronDown } from 'lucide-react';

export default function MobileSelectDrawer({ value, onValueChange, options, placeholder, label }) {
  const [open, setOpen] = useState(false);
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;

  const selectedLabel = options?.find(opt => opt.value === value)?.label || placeholder;

  // Desktop: usar Select normal
  if (!isMobile) {
    return (
      <Select value={value} onValueChange={onValueChange}>
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

  // Mobile: usar Drawer
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-between p-2 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 transition-colors no-select"
      >
        <span className="text-sm text-slate-700">{selectedLabel}</span>
        <ChevronDown className="w-4 h-4 text-slate-400" />
      </button>

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{label}</DrawerTitle>
          </DrawerHeader>
          <div className="p-4 space-y-2 pb-8">
            {options?.map(opt => (
              <button
                key={opt.value}
                onClick={() => {
                  onValueChange(opt.value);
                  setOpen(false);
                }}
                className={`w-full p-4 rounded-lg text-left transition-all ${
                  value === opt.value
                    ? 'bg-orange-600 text-white font-semibold'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}