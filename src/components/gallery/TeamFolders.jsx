import React from "react";
import { Folder } from "lucide-react";

export const folderLabel = (cat) => {
  if (cat === "Todas las Categorías") return "🏟️ Todo el club";
  if (cat.includes("Baloncesto")) return "🏀 Baloncesto";
  return `⚽ ${cat.replace(/^Fútbol\s+/, "").replace(/\s*\(Mixto\)$/, "")}`;
};

export default function TeamFolders({ folders, albums, onOpen }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {folders.map((cat) => {
        const catAlbums = albums.filter((a) => a.categoria === cat);
        const cover = catAlbums.find((a) => a.fotos?.length)?.fotos[0]?.url;
        return (
          <button
            key={cat}
            onClick={() => onOpen(cat)}
            className="text-left rounded-2xl overflow-hidden bg-white shadow-md hover:shadow-lg border border-slate-100"
          >
            <div className="aspect-video bg-orange-50 flex items-center justify-center overflow-hidden">
              {cover ? (
                <img src={cover} alt="" className="w-full h-full object-cover" loading="lazy" />
              ) : (
                <Folder className="w-12 h-12 text-orange-300" />
              )}
            </div>
            <div className="p-3">
              <p className="font-bold text-slate-900 text-sm">{folderLabel(cat)}</p>
              <p className="text-xs text-slate-500">{catAlbums.length} álbum{catAlbums.length !== 1 ? "es" : ""}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}