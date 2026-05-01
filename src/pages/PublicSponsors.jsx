import React, { useState } from "react";
import { motion } from "framer-motion";
import { 
  Heart, Users, Trophy, MapPin, Shield, Star, 
  ChevronDown, Mail, Phone, ArrowRight, CheckCircle2,
  Mountain, Calendar, Target, Handshake
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import HeroSection from "../components/sponsors-public/HeroSection";
import ClubHistorySection from "../components/sponsors-public/ClubHistorySection";
import ImpactSection from "../components/sponsors-public/ImpactSection";
import SponsorPackages from "../components/sponsors-public/SponsorPackages";
import ContactCTA from "../components/sponsors-public/ContactCTA";
import SponsorFooter from "../components/sponsors-public/SponsorFooter";
import usePublicPageTracker from "../components/public/usePublicPageTracker";
import { ArrowLeft } from "lucide-react";

export default function PublicSponsors() {
  usePublicPageTracker("PublicSponsors");
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
      <ClubHistorySection />
      <ImpactSection />
      <SponsorPackages />
      <ContactCTA />
      <SponsorFooter />
    </div>
  );
}