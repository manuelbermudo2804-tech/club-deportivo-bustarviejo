import { ArrowLeft } from "lucide-react";

export default function BackToAppButton() {
  const handleBack = () => {
    // Try to go back in history, otherwise go to app root
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = "/";
    }
  };

  return (
    <button
      onClick={handleBack}
      className="fixed top-4 left-4 z-50 flex items-center gap-2 bg-white/90 backdrop-blur-sm text-slate-800 font-semibold text-sm px-4 py-2.5 rounded-full shadow-lg hover:bg-white hover:scale-105 active:scale-95 transition-all border border-slate-200"
    >
      <ArrowLeft className="w-4 h-4" />
      Volver a la app
    </button>
  );
}