import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, X, BarChart3 } from "lucide-react";
import { toast } from "sonner";

export default function QuickPollDialog({ isOpen, onClose, onSend, groupName }) {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);

  const handleAddOption = () => {
    if (options.length < 5) {
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

    const validOptions = options.filter(o => o.trim());
    if (validOptions.length < 2) {
      toast.error("Añade al menos 2 opciones");
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-orange-600" />
            Crear Encuesta Rápida
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">
              Pregunta
            </label>
            <Input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="¿Cuál es tu pregunta?"
              className="w-full"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">
              Opciones de respuesta
            </label>
            <div className="space-y-2">
              {options.map((option, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={option}
                    onChange={(e) => handleOptionChange(index, e.target.value)}
                    placeholder={`Opción ${index + 1}`}
                    className="flex-1"
                  />
                  {options.length > 2 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveOption(index)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            {options.length < 5 && (
              <Button
                type="button"
                variant="ghost"
                onClick={handleAddOption}
                className="mt-2 text-orange-600 hover:text-orange-700 hover:bg-orange-50 w-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                Añadir opción
              </Button>
            )}
          </div>

          {groupName && (
            <p className="text-xs text-slate-500 bg-slate-50 p-2 rounded-lg">
              📊 La encuesta se enviará a: <strong>{groupName}</strong>
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSend} className="bg-orange-600 hover:bg-orange-700">
            <BarChart3 className="w-4 h-4 mr-2" />
            Enviar Encuesta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}