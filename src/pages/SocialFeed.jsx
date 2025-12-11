import React from "react";
import SocialMediaFeed from "../components/social/SocialMediaFeed";
import SocialLinks from "../components/SocialLinks";

export default function SocialFeed() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Redes Sociales</h1>
          <p className="text-slate-600 mt-1">Mantente conectado con todas nuestras novedades</p>
        </div>

        <SocialLinks />

        <SocialMediaFeed />
      </div>
    </div>
  );
}