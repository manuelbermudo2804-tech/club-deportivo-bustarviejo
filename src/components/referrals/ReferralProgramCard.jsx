import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Gift, Star, Trophy, Hotel, Shirt, Ticket, Sparkles, Heart, Users, Crown, Zap, PartyPopper, Share2, MessageCircle, Copy } from "lucide-react";
import { toast } from "sonner";

const REWARD_TIERS = [
  { count: 1, color: "from-blue-500 to-blue-600", bgColor: "bg-blue-50", borderColor: "border-blue-300", title: "1 Socio", emoji: "🎁" },
  { count: 3, color: "from-green-500 to-green-600", bgColor: "bg-green-50", borderColor: "border-green-300", title: "3 Socios", emoji: "⭐" },
  { count: 5, color: "from-orange-500 to-orange-600", bgColor: "bg-orange-50", borderColor: "border-orange-300", title: "5 Socios", emoji: "🏆" },
  { count: 10, color: "from-purple-500 to-purple-600", bgColor: "bg-purple-50", borderColor: "border-purple-300", title: "10 Socios", emoji: "👑" },
  { count: 15, color: "from-pink-500 to-pink-600", bgColor: "bg-pink-50", borderColor: "border-pink-300", title: "15 Socios", emoji: "🏨" }
];

export default function ReferralProgramCard({ seasonConfig, userReferrals = 0, userCredit = 0, userRaffleEntries = 0, userFemeninoReferrals = 0, userEmail = "", userName = "", hasPlayersInClub = false }) {
  if (!seasonConfig?.programa_referidos_activo) return null;
  if (hasPlayersInClub !== true) return null;

  // Generar código de referido del usuario
  const generateReferralCode = (email) => {
    let hash = 0;
    for (let i = 0; i < email.length; i++) {
      const char = email.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36).toUpperCase().slice(0, 8);
  };

  const userRefCode = userEmail ? generateReferralCode(userEmail) : "";
  const femeninoLink = userRefCode ? `${window.location.origin}/JoinFemenino?ref=${userRefCode}` : "";
  
  // Mensaje de WhatsApp para compartir
  const whatsappMessage = encodeURIComponent(`⚽👧 ¡BUSCAMOS JUGADORAS PARA EL EQUIPO DE FÚTBOL FEMENINO!

🌟 CD Bustarviejo abre sus puertas a nuevas jugadoras.

✅ Todas las edades bienvenidas
✅ No hace falta experiencia
✅ Ambiente familiar y seguro
✅ Entrenadores titulados
✅ ¡Nos lo pasamos genial!

🎁 Si te apuntas, ¡ambos ganamos premios!

👉 ¡Apúntate aquí!: ${femeninoLink}

¡Te esperamos en el campo! 💪`);

  const whatsappUrl = `https://wa.me/?text=${whatsappMessage}`;

  const copyFemeninoLink = () => {
    navigator.clipboard.writeText(femeninoLink);
    toast.success("¡Enlace copiado! Compártelo con quien quieras");
  };

  const shareWhatsApp = () => {
    window.open(whatsappUrl, '_blank');
  };

  const hasReachedLimit = userReferrals >= 15;

  const getRewardForTier = (count) => {
    switch (count) {
      case 1: return { credit: seasonConfig.referidos_premio_1 || 5, raffles: 0, special: null };
      case 3: return { credit: seasonConfig.referidos_premio_3 || 15, raffles: seasonConfig.referidos_sorteo_3 || 1, special: null };
      case 5: return { credit: seasonConfig.referidos_premio_5 || 25, raffles: seasonConfig.referidos_sorteo_5 || 3, special: null };
      case 10: return { credit: seasonConfig.referidos_premio_10 || 50, raffles: seasonConfig.referidos_sorteo_10 || 5, special: "Reconocimiento en la web" };
      case 15: return { credit: seasonConfig.referidos_premio_15 || 50, raffles: seasonConfig.referidos_sorteo_15 || 10, special: seasonConfig.referidos_premio_hotel ? "🏨 ¡NOCHE DE HOTEL PARA DOS!" : null };
      default: return { credit: 0, raffles: 0, special: null };
    }
  };

  const getNextTier = () => {
    if (userReferrals >= 15) return null;
    if (userReferrals >= 10) return 15;
    if (userReferrals >= 5) return 10;
    if (userReferrals >= 3) return 5;
    if (userReferrals >= 1) return 3;
    return 1;
  };

  const nextTier = getNextTier();
  const referralsToNext = nextTier ? nextTier - userReferrals : 0;

  return (
    <Card className="border-none shadow-xl bg-gradient-to-br from-purple-600 via-pink-500 to-orange-500 text-white overflow-hidden relative">
      <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -mr-20 -mt-20 animate-pulse"></div>
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full -ml-16 -mb-16"></div>
      <div className="absolute top-1/2 right-10 text-6xl opacity-20 animate-bounce">🎉</div>

      <CardHeader className="relative pb-2">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <PartyPopper className="w-8 h-8 text-white" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold flex items-center gap-2">
              ¡TRAE UN SOCIO AMIGO! 
              <Sparkles className="w-6 h-6 text-yellow-300 animate-pulse" />
            </CardTitle>
            <p className="text-white/90 text-sm">Invita amigos y familiares, ¡y gana premios!</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="relative space-y-4">
        <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 text-center">
          <p className="text-lg font-semibold mb-1">🔥 ¡Cuantos más amigos traigas, más premios ganas! 🔥</p>
          <p className="text-sm text-white/90">Invita a familiares, amigos, vecinos... ¡Cada nuevo socio cuenta!</p>
        </div>

        {/* BONUS FÚTBOL FEMENINO + BOTÓN COMPARTIR */}
        {seasonConfig.bonus_femenino_activo && (
          <div className="bg-gradient-to-r from-pink-500 via-fuchsia-500 to-purple-500 rounded-2xl p-4 text-center border-4 border-pink-300 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full bg-white/10"></div>
            <div className="relative">
              <div className="text-4xl mb-2">⚽👧</div>
              <h4 className="text-xl font-bold text-white mb-1">🌟 ¡BONUS FÚTBOL FEMENINO! 🌟</h4>
              <p className="text-white/95 font-medium text-sm mb-2">
                ¡Trae jugadoras al equipo femenino y gana el <strong>DOBLE</strong> de premios!
              </p>
              <div className="flex justify-center gap-3 mt-2">
                <div className="bg-white/30 backdrop-blur-sm rounded-xl px-3 py-2">
                  <p className="text-white font-bold text-lg">+{seasonConfig.bonus_femenino_credito || 10}€</p>
                  <p className="text-white/80 text-xs">extra en ropa</p>
                </div>
                <div className="bg-white/30 backdrop-blur-sm rounded-xl px-3 py-2">
                  <p className="text-white font-bold text-lg">+{seasonConfig.bonus_femenino_sorteos || 2}</p>
                  <p className="text-white/80 text-xs">sorteos extra</p>
                </div>
              </div>

              {/* Botones para compartir */}
              {femeninoLink && (
                <div className="mt-4 space-y-2">
                  <p className="text-white/90 text-xs font-semibold">👇 ¡COMPARTE AHORA Y GANA! 👇</p>
                  <div className="flex gap-2 justify-center">
                    <Button
                      onClick={shareWhatsApp}
                      className="bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-5 rounded-xl shadow-lg animate-pulse"
                    >
                      <MessageCircle className="w-5 h-5 mr-2" />
                      Enviar por WhatsApp
                    </Button>
                    <Button
                      onClick={copyFemeninoLink}
                      variant="outline"
                      className="bg-white/20 hover:bg-white/30 text-white border-white/30 py-3 px-4 rounded-xl"
                    >
                      <Copy className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
              )}

              <p className="text-white/80 text-xs mt-3">
                ¡Por cada nueva jugadora que inscribas en el fútbol femenino!
              </p>
              {userFemeninoReferrals > 0 && (
                <div className="mt-3 bg-white/20 rounded-xl p-2">
                  <p className="text-white font-bold">
                    ✨ Ya has traído {userFemeninoReferrals} jugadora{userFemeninoReferrals > 1 ? 's' : ''} al femenino
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {userReferrals > 0 && (
          <div className="bg-white rounded-2xl p-4 text-slate-900">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-600" />
                <span className="font-bold">Socios que has traído:</span>
              </div>
              <Badge className="bg-purple-600 text-white text-lg px-3">{userReferrals}</Badge>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-green-50 rounded-xl p-3 text-center border-2 border-green-200">
                <Shirt className="w-6 h-6 text-green-600 mx-auto mb-1" />
                <p className="text-2xl font-bold text-green-700">{userCredit}€</p>
                <p className="text-xs text-green-600">Crédito en ropa</p>
              </div>
              <div className="bg-orange-50 rounded-xl p-3 text-center border-2 border-orange-200">
                <Ticket className="w-6 h-6 text-orange-600 mx-auto mb-1" />
                <p className="text-2xl font-bold text-orange-700">{userRaffleEntries}</p>
                <p className="text-xs text-orange-600">Participaciones sorteo</p>
              </div>
            </div>

            {nextTier && (
              <div className="mt-3 bg-gradient-to-r from-purple-100 to-pink-100 rounded-xl p-3 text-center border-2 border-purple-200">
                <p className="text-sm text-purple-800">
                  <Zap className="w-4 h-4 inline mr-1" />
                  ¡Te faltan solo <strong className="text-purple-900">{referralsToNext}</strong> amigo(s) para el siguiente nivel!
                </p>
              </div>
            )}
          </div>
        )}

        <div className="bg-white rounded-2xl p-4 text-slate-900">
          <h3 className="font-bold text-lg mb-3 flex items-center gap-2 text-purple-700">
            <Gift className="w-5 h-5" />
            Tabla de Premios
          </h3>
          
          <div className="space-y-2">
            {REWARD_TIERS.filter(tier => {
              if (tier.count === 1 && seasonConfig.tier_1_activo === false) return false;
              if (tier.count === 3 && seasonConfig.tier_3_activo === false) return false;
              if (tier.count === 5 && seasonConfig.tier_5_activo === false) return false;
              if (tier.count === 10 && seasonConfig.tier_10_activo === false) return false;
              if (tier.count === 15 && seasonConfig.tier_15_activo === false) return false;
              return true;
            }).map((tier) => {
              const reward = getRewardForTier(tier.count);
              const isAchieved = userReferrals >= tier.count;
              const isNext = nextTier === tier.count;

              return (
                <div
                  key={tier.count}
                  className={`rounded-xl p-3 border-2 transition-all ${
                    isAchieved 
                      ? `${tier.bgColor} ${tier.borderColor} ring-2 ring-offset-1 ring-green-400`
                      : isNext 
                        ? `${tier.bgColor} ${tier.borderColor} animate-pulse`
                        : "bg-slate-50 border-slate-200"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${tier.color} flex items-center justify-center text-white shadow-lg`}>
                        <span className="text-lg">{tier.emoji}</span>
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{tier.title}</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-300">
                            <Shirt className="w-3 h-3 mr-1" /> {reward.credit}€ ropa
                          </Badge>
                          {reward.raffles > 0 && (
                            <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-300">
                              <Ticket className="w-3 h-3 mr-1" /> {reward.raffles} sorteo(s)
                            </Badge>
                          )}
                        </div>
                        {reward.special && (
                          <p className={`text-xs mt-1 font-bold ${tier.count === 15 ? "text-pink-600" : "text-purple-600"}`}>
                            {reward.special}
                          </p>
                        )}
                      </div>
                    </div>
                    {isAchieved && (
                      <Badge className="bg-green-500 text-white">✓ ¡Conseguido!</Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {seasonConfig.referidos_premio_hotel && (
          <div className="bg-gradient-to-r from-pink-100 via-purple-100 to-pink-100 rounded-2xl p-4 text-center border-4 border-pink-300 relative overflow-hidden">
            <div className="text-5xl mb-2">🏨✨</div>
            <h4 className="text-xl font-bold text-pink-800 mb-1">¡PREMIO ESTRELLA!</h4>
            <p className="text-pink-700 font-medium">Trae <strong>15 socios amigos</strong> y gana una</p>
            <p className="text-2xl font-bold text-pink-900 mt-1">🌙 NOCHE DE HOTEL PARA DOS 🌙</p>
            <p className="text-xs text-pink-600 mt-2">+ 50€ en ropa + 10 participaciones en sorteos</p>
          </div>
        )}

        <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4">
          <h4 className="font-bold mb-2 flex items-center gap-2">
            <Heart className="w-5 h-5 text-red-300" />
            ¿Cómo participar?
          </h4>
          <ol className="text-sm space-y-1 text-white/95">
            <li>1️⃣ Invita a amigos y familiares a hacerse socios</li>
            <li>2️⃣ Cuando se registren, diles que pongan tu nombre como referido</li>
            <li>3️⃣ ¡Tus premios se acumulan con cada nuevo socio!</li>
          </ol>
        </div>

        {hasReachedLimit && (
          <div className="bg-gradient-to-r from-yellow-100 to-orange-100 rounded-2xl p-4 text-center border-2 border-yellow-300">
            <Trophy className="w-10 h-10 mx-auto mb-2 text-yellow-600" />
            <p className="font-bold text-yellow-900 text-lg">🎉 ¡ENHORABUENA!</p>
            <p className="text-yellow-800 text-sm">
              Has alcanzado el máximo de <strong>15 socios invitados</strong>. ¡Eres un/a campeón/a del programa!
            </p>
          </div>
        )}

        {seasonConfig.sorteo_premios && seasonConfig.sorteo_premios.filter(p => p.activo !== false).length > 0 && (
          <div className="bg-white rounded-2xl p-4 text-slate-900">
            <h3 className="font-bold text-lg mb-3 flex items-center gap-2 text-yellow-700">
              <span className="text-2xl">🎰</span>
              ¿Qué puedes ganar en los sorteos?
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {seasonConfig.sorteo_premios.filter(p => p.activo !== false).map((prize, index) => (
                <div key={index} className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl p-3 text-center border-2 border-yellow-200">
                  <span className="text-3xl block mb-1">{prize.emoji}</span>
                  <p className="font-bold text-sm text-slate-900">{prize.nombre}</p>
                  <p className="text-xs text-slate-600">{prize.descripcion}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="text-center text-xs text-white/70">
          * Los premios se pueden usar en pedidos de ropa del club. Los sorteos se realizan al final de la temporada.
        </p>
      </CardContent>
    </Card>
  );
}