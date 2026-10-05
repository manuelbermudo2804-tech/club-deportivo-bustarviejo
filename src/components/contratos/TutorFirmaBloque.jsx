import React from "react";
import { Input } from "@/components/ui/input";
import SignaturePad from "./SignaturePad";

// Datos y firma del padre/madre/tutor legal (solo para menores)
export default function TutorFirmaBloque({ tutor, setTutor, onFirma }) {
  const set = (k) => (e) => setTutor({ ...tutor, [k]: e.target.value });
  return (
    <div className="border-2 border-orange-200 bg-orange-50 rounded-lg p-3 space-y-2">
      <p className="font-semibold text-sm">👨‍👩‍👦 Firma del padre, madre o tutor legal</p>
      <Input placeholder="Nombre y apellidos del tutor" value={tutor.nombre} onChange={set("nombre")} />
      <Input placeholder="DNI / NIE del tutor" value={tutor.dni} onChange={set("dni")} />
      <Input placeholder="Relación (padre, madre, tutor...)" value={tutor.relacion} onChange={set("relacion")} />
      <SignaturePad onChange={onFirma} />
    </div>
  );
}