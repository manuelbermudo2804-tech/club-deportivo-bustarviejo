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

export default function PublicSponsors() {
  return (
    <div className="min-h-screen bg-white">
      <HeroSection />
      <ClubHistorySection />
      <ImpactSection />
      <SponsorPackages />
      <ContactCTA />
      <SponsorFooter />
    </div>
  );
}