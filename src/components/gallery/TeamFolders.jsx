import React from "react";
import { Folder } from "lucide-react";

export const sameCat = (a, b) => (a || "").trim().toLowerCase() === (b || "").trim().toLowerCase();

export const folderLabel = (cat) => {
  if (cat === "Todas las Categorías") return "🏟️ Todo el club";
  if (cat.includes("Baloncesto")) return "🏀 Baloncesto";
  if (/sala/i.test(cat)) return "⚽ Fútbol Sala";
  const name = cat.replace(/^Fútbol\s+/i, "").replace(/\s*\(Mixto\)$/, "");
  return `⚽ ${name.charAt(0).toUpperCase()}${name.slice(1)}`;
};

// Orden por edad, luego femenino, baloncesto y sala
const ORDEN = ["todas las", "pre-benjam", "benjam", "alev", "infantil", "cadete", "juvenil", "aficionado", "femenino", "baloncesto", "sala"];
const rank = (cat) => {
  const c = cat.toLowerCase();
  if (c.includes("femenino") && c.includes("alev")) return 3.5;
  const i = ORDEN.findIndex((k) => c.includes(k));
  return i === -1 ? 99 : i;
};

// Quita duplicados por mayúsculas (fútbol femenino = Fútbol Femenino) y ordena
export const normalizeFolders = (cats) => {
  const map = new Map();
  cats.forEach((c) => {
    const k = c.trim().toLowerCase();
    const prev = map.get(k);
    if (!prev || (prev[0] === prev[0].toLowerCase() && c[0] !== c[0].toLowerCase())) map.set(k, c);
  });
  return [...map.values()].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
};

export default function TeamFolders({ folders, albums, onOpen }) {
  const withCount = folders.map((cat) => ({ cat, n: albums.filter((a) => sameCat(a.categoria, cat)).length }));
  const ordered = [...withCount.filter((f) => f.n > 0), ...withCount.filter((f) => f.n === 0)].map((f) => f.cat);
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {ordered.map((cat) => {
        const catAlbums = albums.filter((a) => sameCat(a.categoria, cat));
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