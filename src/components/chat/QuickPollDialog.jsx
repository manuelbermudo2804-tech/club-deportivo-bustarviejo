import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, Plus, Send } from "lucide-react";
import { toast } from "sonner";

export default function QuickPollDialog({ isOpen, onClose, onSend, groupName }) {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);

  const handleAddOption = () => {
    if (options.length < 10) {
      setOptions([...options, ""]);
    }
  };

  const handleRemoveOption = (index) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const handleOptionChange = (index, value) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleSend = () => {
    if (!question.trim()) {
      toast.error("Escribe una pregunta");
      return;
    }

    const validOptions = options.filter(opt => opt.trim());
    if (validOptions.length < 2) {
      toast.error("Debes tener al menos 2 opciones");
      return;
    }

    onSend({
      question: question.trim(),
      options: validOptions
    });

    // Reset
    setQuestion("");
    setOptions(["", ""]);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            📊 Crear Encuesta Rápida
          </DialogTitle>
          <p className="text-xs text-slate-600">Para: {groupName}</p>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Pregunta *</Label>
            <Input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="¿Cuál es tu opinión sobre...?"
              maxLength={200}
            />
            <p className="text-xs text-slate-500">{question.length}/200</p>
          </div>

          <div className="space-y-2">
            <Label>Opciones de respuesta</Label>
            <div className="space-y-2">
              {options.map((option, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    value={option}
                    onChange={(e) => handleOptionChange(index, e.target.value)}
                    placeholder={`Opción ${index + 1}`}
                    maxLength={100}
                  />
                  {options.length > 2 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveOption(index)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            {options.length < 10 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddOption}
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                Añadir opción ({options.length}/10)
              </Button>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={handleSend} className="bg-orange-600 hover:bg-orange-700">
              <Send className="w-4 h-4 mr-2" />
              Enviar Encuesta
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}