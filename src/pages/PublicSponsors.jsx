import React, { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { base44 } from "@/api/base44Client";

import HeroSection from "../components/sponsors-public/HeroSection";
import ClubHistorySection from "../components/sponsors-public/ClubHistorySection";
import ImpactSection from "../components/sponsors-public/ImpactSection";
import SponsorPackages from "../components/sponsors-public/SponsorPackages";
import ContactCTA from "../components/sponsors-public/ContactCTA";
import SponsorFooter from "../components/sponsors-public/SponsorFooter";
import TournamentSponsorshipBanner from "../components/sponsors-public/TournamentSponsorshipBanner";
import usePublicPageTracker from "../components/public/usePublicPageTracker";

export default function PublicSponsors() {
  usePublicPageTracker("PublicSponsors");
  const [torneosConfig, setTorneosConfig] = useState(null);

  useEffect(() => {
    base44.functions
      .invoke("getSponsorInterestCounts", {})
      .then((res) => {
        if (res?.data?.campana_torneos_activa) {
          setTorneosConfig({
            padelFecha: res.data.torneo_padel_fecha,
            futsalFecha: res.data.torneo_futsal_fecha,
            padelOcupado: res.data.torneo_padel_ocupado,
            futsalOcupado: res.data.torneo_futsal_ocupado,
          });
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <a
        href="https://www.cdbustarviejo.com"
        className="fixed top-4 left-4 z-50 flex items-center gap-2 bg-white/90 backdrop-blur-sm text-slate-800 font-semibold text-sm px-4 py-2.5 rounded-full shadow-lg hover:bg-white hover:scale-105 active:scale-95 transition-all border border-slate-200"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver a la web
      </a>
      <HeroSection />
      {torneosConfig && (
        <TournamentSponsorshipBanner
          padelFecha={torneosConfig.padelFecha}
          futsalFecha={torneosConfig.futsalFecha}
          padelOcupado={torneosConfig.padelOcupado}
          futsalOcupado={torneosConfig.futsalOcupado}
        />
      )}
      <ClubHistorySection />
      <ImpactSection />
      <SponsorPackages />
      <ContactCTA />
      <SponsorFooter />
    </div>
  );
}