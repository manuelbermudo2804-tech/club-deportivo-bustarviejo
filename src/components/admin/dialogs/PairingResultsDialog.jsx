import React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Heart } from "lucide-react";

export default function PairingResultsDialog({ open, onOpenChange, pairingResults, onAccept }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Heart className="w-6 h-6 text-pink-600" />
            Parejas de Progenitores Detectadas
          </DialogTitle>
        </DialogHeader>

        {pairingResults && (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-300 rounded-lg p-3">
              <p className="text-sm font-bold text-green-900">
                ✅ Se detectaron <strong>{pairingResults.pairsDetected}</strong> parejas y se guardaron{" "}
                <strong>{pairingResults.pairsSaved || 0}</strong> en los jugadores
              </p>
            </div>

            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {pairingResults.pairs &&
                pairingResults.pairs.map((pair, idx) => (
                  <div key={idx} className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 flex-1">
                        <Heart className="w-5 h-5 text-pink-500" />
                        <div className="flex-1">
                          <p className="text-sm font-bold text-slate-900">{pair.name1}</p>
                          <p className="text-xs text-slate-500">{pair.email1}</p>
                        </div>
                      </div>
                      <div className="text-slate-400 font-bold px-2">↔️</div>
                      <div className="flex-1 text-right">
                        <p className="text-sm font-bold text-slate-900">{pair.name2}</p>
                        <p className="text-xs text-slate-500">{pair.email2}</p>
                      </div>
                    </div>
                    <div className="bg-blue-50 rounded px-3 py-1 text-xs text-blue-800">
                      👥 Comparten {pair.sharedPlayerCount} jugador
                      {pair.sharedPlayerCount !== 1 ? "es" : ""}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button onClick={onAccept} className="bg-blue-600 hover:bg-blue-700">
            ✅ Entendido
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}