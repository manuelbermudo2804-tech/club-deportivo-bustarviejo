import React from "react";

const CLUB_LOGO = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/e3f0a8e26_logo_cd_bustarviejo_mediano.jpg";

export default function SponsorFooter() {
  return (
    <footer className="bg-slate-950 py-10">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex flex-col items-center gap-4">
          <img src={CLUB_LOGO} alt="CD Bustarviejo" className="w-12 h-12 rounded-xl opacity-60 object-cover" />
          <p className="text-slate-500 text-sm text-center">
            CD Bustarviejo · Sierra Norte de Madrid
          </p>
          <a
            href="https://t.me/cdbustarviejo"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-[#229ED9] hover:bg-[#1b87b8] text-white text-sm font-bold px-5 py-2.5 rounded-xl shadow-lg transition-all hover:scale-105"
          >
            ✈️ Únete a nuestro Canal de Telegram
          </a>
          <div className="flex gap-4 text-slate-600 text-xs">
            <a href="https://www.cdbustarviejo.com" target="_blank" rel="noopener noreferrer" className="hover:text-orange-400 transition-colors">
              Web
            </a>
            <span>·</span>
            <a href="https://www.instagram.com/cdbustarviejo" target="_blank" rel="noopener noreferrer" className="hover:text-orange-400 transition-colors">
              Instagram
            </a>
            <span>·</span>
            <a href="https://www.facebook.com/cdbustarviejo" target="_blank" rel="noopener noreferrer" className="hover:text-orange-400 transition-colors">
              Facebook
            </a>
            <span>·</span>
            <a href="https://t.me/cdbustarviejo" target="_blank" rel="noopener noreferrer" className="hover:text-orange-400 transition-colors">
              Telegram
            </a>
          </div>
          <p className="text-slate-700 text-xs mt-2">
            © {new Date().getFullYear()} CD Bustarviejo. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}