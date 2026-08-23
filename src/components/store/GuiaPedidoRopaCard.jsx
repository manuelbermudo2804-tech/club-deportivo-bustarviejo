import React from "react";
import { Button } from "@/components/ui/button";
import { FileText, Download } from "lucide-react";

const GUIA_URL = "https://media.base44.com/files/public/6992c6be619d2da592897991/7841f9511_GUIAPASOAPASOPEDIDODEROPA.pdf";

export default function GuiaPedidoRopaCard() {
  return (
    <div className="bg-blue-50 border-2 border-blue-300 rounded-xl p-4">
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0">
          <FileText className="w-6 h-6 text-white" />
        </div>
        <div className="min-w-0">
          <p className="font-bold text-blue-900 text-sm">📄 Guía paso a paso para pedir la ropa</p>
          <p className="text-blue-800 text-xs mt-1 leading-relaxed">
            10 pasos con capturas de pantalla: cómo entrar en la tienda del proveedor, registrarte,
            elegir el pack, poner talla, nombre y dorsal, y completar el pago.
          </p>
        </div>
      </div>
      <a href={GUIA_URL} download target="_blank" rel="noopener noreferrer" className="block mt-3">
        <Button size="lg" className="w-full bg-blue-600 hover:bg-blue-700 gap-2">
          <Download className="w-5 h-5" />
          Descargar la guía (PDF)
        </Button>
      </a>
    </div>
  );
}