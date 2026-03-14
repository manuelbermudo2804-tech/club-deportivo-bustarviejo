import { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';

export function useFetchUser(location) {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCoach, setIsCoach] = useState(false);
  const [isCoordinator, setIsCoordinator] = useState(false);
  const [isTreasurer, setIsTreasurer] = useState(false);
  const [isJunta, setIsJunta] = useState(false);
  const [isPlayer, setIsPlayer] = useState(false);
  const [isMinor, setIsMinor] = useState(false);
  const [minorPlayerData, setMinorPlayerData] = useState(null);
  const [hasPlayers, setHasPlayers] = useState(false);
  const [playerName, setPlayerName] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showSpecialScreen, setShowSpecialScreen] = useState(null);
  const [activeSeasonConfig, setActiveSeasonConfig] = useState(null);
  const [isMemberPaid, setIsMemberPaid] = useState(false);
  const [loteriaVisible, setLoteriaVisible] = useState(false);
  const [sponsorBannerVisible, setSponsorBannerVisible] = useState(false);
  const [extraChargeVisible, setExtraChargeVisible] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const fetchUserOnceRef = useRef(false);
  // Detectar inmediatamente si es página pública (antes de cualquier async)
  const lowerPathInit = typeof window !== 'undefined' ? window.location.pathname.toLowerCase() : '';
  const isPublicPageRef = useRef(
    lowerPathInit.includes('clubmembership') || 
    lowerPathInit.includes('validateadmininvitation') ||
    lowerPathInit.includes('pwaentry') ||
    lowerPathInit.includes('joinreferral') ||
    lowerPathInit.includes('joinfemenino') ||
    lowerPathInit.includes('publicaltasocio')
  );

  const getPeriodType = () => {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    if (currentMonth === 5) return "closed";
    else if (currentMonth === 6 || currentMonth === 7) return "inscriptions";
    else if (currentMonth === 8) return "vacation";
    return "active";
  };

  const executeFetch = async () => {
    const lowerPath = location.pathname.toLowerCase();
    const isPublicPage = lowerPath.includes('clubmembership') || 
                         lowerPath.includes('validateadmininvitation') ||
                         lowerPath.includes('pwaentry') ||
                         lowerPath.includes('joinreferral') ||
                         lowerPath.includes('joinfemenino') ||
                         lowerPath.includes('publicaltasocio');
    isPublicPageRef.current = isPublicPage;

    // Para páginas públicas, siempre permitir re-check de auth
    // Para páginas normales, solo ejecutar una vez
    if (fetchUserOnceRef.current && !isPublicPage) return;
    if (fetchUserOnceRef.current && isPublicPage && authChecked) return;
    fetchUserOnceRef.current = true;

    try {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

      localStorage.removeItem('pending_invitation_token');
      localStorage.removeItem('pending_invitation_type');

      if (isPublicPage) {
        try {
          const isAuthenticated = await base44.auth.isAuthenticated();
          if (!isAuthenticated) {
            setUser(null);
            setAuthChecked(true);
            setIsLoading(false);
            return;
          }
          try {
            const currentUser = await base44.auth.me();
            setUser(currentUser);
            setAuthChecked(true);
            setIsLoading(false);
          } catch (userError) {
            setUser(null);
            setAuthChecked(true);
            setIsLoading(false);
            return;
          }
          return;
        } catch (authError) {
          setUser(null);
          setAuthChecked(true);
          setIsLoading(false);
          return;
        }
      }

      let currentUser;
      try {
        currentUser = await base44.auth.me();
      } catch (authError) {
        setIsLoading(false);
        base44.auth.redirectToLogin();
        return;
      }

      setUser(currentUser);

      // Rol tablet → redirigir directo al check-in sin más lógica
      if (currentUser.role === 'tablet') {
        setIsLoading(false);
        const currentPath = window.location.pathname.toLowerCase();
        if (!currentPath.includes('checkintablet')) {
          window.location.href = createPageUrl('CheckinTablet');
        }
        return;
      }

      setIsAdmin(currentUser.role === "admin");
      setIsCoach(currentUser.es_entrenador === true);
      setIsCoordinator(currentUser.es_coordinador === true);
      setIsTreasurer(currentUser.es_tesorero === true);
      setIsJunta(currentUser.es_junta === true);

      // Auto-catalogar segundo progenitor
      try {
        if (currentUser.es_segundo_progenitor !== true && currentUser.codigo_acceso_validado === true) {
          const linkedAsSecond = await base44.entities.Player.filter({ email_tutor_2: currentUser.email });
          if (linkedAsSecond.length > 0) {
            await base44.auth.updateMe({ es_segundo_progenitor: true, tipo_panel: 'familia' });
            setUser((prev) => ({ ...(prev || {}), es_segundo_progenitor: true, tipo_panel: 'familia' }));
          }
        }
      } catch (e) {}

      // Detección de menor
      let minorDetected = currentUser.tipo_panel === 'jugador_menor' || currentUser.es_menor === true;
      if (!minorDetected && currentUser.role !== "admin" && !currentUser.es_entrenador && !currentUser.es_coordinador && !currentUser.es_tesorero && currentUser.codigo_acceso_validado === true) {
        try {
          const linkedAsMinor = await base44.entities.Player.filter({
            acceso_menor_email: currentUser.email,
            acceso_menor_autorizado: true,
            activo: true,
          });
          const minorPlayer = linkedAsMinor[0];
          if (minorPlayer && !minorPlayer.acceso_menor_revocado) {
            minorDetected = true;
            setMinorPlayerData(minorPlayer);
            if (currentUser.tipo_panel !== 'jugador_menor') {
              await base44.auth.updateMe({ tipo_panel: 'jugador_menor', es_menor: true, player_id: minorPlayer.id });
              setUser((prev) => ({ ...(prev || {}), tipo_panel: 'jugador_menor', es_menor: true, player_id: minorPlayer.id }));
            }
          }
        } catch (e) {}
      } else if (minorDetected) {
        try {
          const linkedAsMinor2 = await base44.entities.Player.filter({
            acceso_menor_email: currentUser.email,
            acceso_menor_autorizado: true,
            activo: true,
          });
          if (linkedAsMinor2[0] && !linkedAsMinor2[0].acceso_menor_revocado) {
            setMinorPlayerData(linkedAsMinor2[0]);
          } else {
            minorDetected = false;
          }
        } catch {}
      }
      setIsMinor(minorDetected);

      if (minorDetected) {
        setHasPlayers(false);
        setIsPlayer(false);
        setIsLoading(false);
        const currentPath = window.location.pathname.toLowerCase();
        if (currentPath !== '/minordashboard' && !currentPath.includes('minor')) {
          window.location.href = createPageUrl('MinorDashboard');
        }
        return;
      }

      // Detección de jugador +18
      let playerDetected = currentUser.tipo_panel === 'jugador_adulto' || currentUser.es_jugador === true;

      if (!playerDetected && currentUser.role !== "admin") {
        try {
          const linkedCandidates = await base44.entities.Player.filter({ 
            email_jugador: currentUser.email, 
            acceso_jugador_autorizado: true, 
            activo: true 
          });
          const linkedPlayer = linkedCandidates[0];

          if (linkedPlayer) {
            const calcularEdad = (fechaNac) => {
              if (!fechaNac) return null;
              const hoy = new Date();
              const nacimiento = new Date(fechaNac);
              let edad = hoy.getFullYear() - nacimiento.getFullYear();
              const m = hoy.getMonth() - nacimiento.getMonth();
              if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) edad--;
              return edad;
            };

            const edad = calcularEdad(linkedPlayer.fecha_nacimiento);
            const esMayorDe18 = edad >= 18 || linkedPlayer.es_mayor_edad === true;

            if (esMayorDe18) {
              const updateData = { es_jugador: true, player_id: linkedPlayer.id };
              if (!currentUser.es_entrenador && !currentUser.es_coordinador && !currentUser.es_tesorero) {
                updateData.tipo_panel = 'jugador_adulto';
              }
              await base44.auth.updateMe(updateData);
              playerDetected = true;
              setPlayerName(linkedPlayer.nombre);
            }
          }
        } catch (error) {}
      } else if (playerDetected) {
        try {
          const linkedCandidates2 = await base44.entities.Player.filter({ 
            email_jugador: currentUser.email, 
            acceso_jugador_autorizado: true, 
            activo: true 
          });
          const linkedPlayer = linkedCandidates2[0];
          if (linkedPlayer) {
            setPlayerName(linkedPlayer.nombre);
          }
        } catch (error) {}
      }

      setIsPlayer(playerDetected);
      setIsLoading(false);

      // === CARGA EN PARALELO: Temporada + Jugadores (una sola vez) + Socios ===
      // Antes se hacían hasta 12 queries de Player separadas; ahora se reutiliza 1 resultado.
      let cachedMyPlayers = null;
      const fetchMyPlayers = async () => {
        if (cachedMyPlayers) return cachedMyPlayers;
        const [byPadre, byTutor2, byJugador] = await Promise.all([
          base44.entities.Player.filter({ email_padre: currentUser.email }).catch(() => []),
          base44.entities.Player.filter({ email_tutor_2: currentUser.email }).catch(() => []),
          base44.entities.Player.filter({ email_jugador: currentUser.email }).catch(() => []),
        ]);
        const map = new Map();
        [...byPadre, ...byTutor2, ...byJugador].forEach(p => map.set(p.id, p));
        cachedMyPlayers = Array.from(map.values());
        return cachedMyPlayers;
      };

      try {
        // Lanzar las 3 consultas base en paralelo
        const [configs, membersList, allMyPlayers] = await Promise.all([
          base44.entities.SeasonConfig.filter({ activa: true }).catch(() => []),
          base44.entities.ClubMember.filter({ email: currentUser.email, estado_pago: "Pagado" }).catch(() => []),
          (currentUser.role !== "admin" && !currentUser.es_entrenador && !currentUser.es_coordinador && !currentUser.es_tesorero)
            ? fetchMyPlayers()
            : Promise.resolve([]),
        ]);

        const activeConfig = configs[0];
        setActiveSeasonConfig(activeConfig);
        setLoteriaVisible(activeConfig?.loteria_navidad_abierta === true);
        setSponsorBannerVisible(activeConfig?.mostrar_patrocinadores === true);
        setIsMemberPaid(membersList.length > 0);

        // Cargar cobros extra (usa allMyPlayers en vez de re-consultar)
        if (currentUser?.email) {
          try {
            const charges = await base44.entities.ExtraCharge.filter({ publicado: true, estado: 'activo' });
            const myPlayersActive = allMyPlayers.filter(p => p.activo !== false);

            const isCoachVal = currentUser.es_entrenador === true;
            const isCoordinatorVal = currentUser.es_coordinador === true;
            const isTreasurerVal = currentUser.es_tesorero === true;
            const isAdminUser = currentUser.role === 'admin';

            const categoryNames = new Set([
              ...myPlayersActive.map(p => p.categoria_principal).filter(Boolean),
              ...myPlayersActive.flatMap(p => p.categorias || [])
            ]);
            const playerIdSet = new Set(myPlayersActive.map(p => p.id));

            const matchesUser = (charge) => {
              const dests = charge.destinatarios || [];
              if (dests.length === 0) return true;
              if (dests.some(d => d.tipo === 'categoria' && categoryNames.has(d.valor))) return true;
              if (dests.some(d => d.tipo === 'jugador' && playerIdSet.has(d.valor))) return true;
              if (dests.some(d => d.tipo === 'equipo' && d.valor === 'staff:entrenadores') && isCoachVal) return true;
              if (dests.some(d => d.tipo === 'equipo' && d.valor === 'staff:coordinadores') && isCoordinatorVal) return true;
              if (dests.some(d => d.tipo === 'equipo' && d.valor === 'staff:tesoreria') && isTreasurerVal) return true;
              if (dests.some(d => d.tipo === 'equipo' && d.valor === 'staff:admins') && isAdminUser) return true;
              return false;
            };

            const suppressed = (() => { try { return JSON.parse(localStorage.getItem('extraChargeSuppress') || '[]'); } catch { return []; } })();
            const candidates = (charges || []).filter(matchesUser).filter(c => !suppressed.includes(c.id));
            
            if (candidates.length > 0) {
              const [ecpPagado, ecpRevision] = await Promise.all([
                base44.entities.ExtraChargePayment.filter({ usuario_email: currentUser.email, estado: 'Pagado' }).catch(() => []),
                base44.entities.ExtraChargePayment.filter({ usuario_email: currentUser.email, estado: 'En revisión' }).catch(() => []),
              ]);
              const myPayments = [...ecpPagado, ...ecpRevision];
              let visibleCharge = null;
              for (const c of candidates) {
                try {
                  const requiredSum = (c.items || [])
                    .filter(i => i.obligatorio)
                    .reduce((sum, i) => sum + Number(i.precio || 0) * 1, 0);
                  const paymentsForCharge = myPayments.filter(p => p.extra_charge_id === c.id);
                  let hasPaidRequired = false;
                  for (const p of paymentsForCharge) {
                    const sel = p.seleccion || [];
                    const mandatoryNames = new Set((c.items || []).filter(i => i.obligatorio).map(i => i.nombre));
                    const paidMandatorySum = sel
                      .filter(s => mandatoryNames.has(s.item_nombre))
                      .reduce((sum, s) => sum + Number(s.cantidad || 0) * Number(s.precio_unitario || 0), 0);
                    if ((requiredSum > 0 && paidMandatorySum >= requiredSum) || (requiredSum === 0 && Number(p.total || 0) > 0)) {
                      hasPaidRequired = true;
                      break;
                    }
                  }
                  if (!hasPaidRequired) { visibleCharge = c; break; }
                } catch (e) {
                  visibleCharge = c; break;
                }
              }
              setExtraChargeVisible(visibleCharge);
            }
          } catch {}
        }
      } catch (error) {}

      // Detección de hasPlayers (reutiliza allMyPlayers cacheados)
      if (currentUser.role === "admin" || currentUser.es_entrenador || currentUser.es_coordinador || currentUser.es_tesorero) {
        setHasPlayers(currentUser.tiene_hijos_jugando === true);
        setIsLoading(false);
      } else if (playerDetected && !currentUser.es_entrenador && !currentUser.es_coordinador && !currentUser.es_tesorero) {
        setHasPlayers(false);
        setIsLoading(false);
        const currentPath = window.location.pathname.toLowerCase();
        if (currentPath !== '/playerdashboard' && !currentPath.includes('player')) {
          window.location.href = createPageUrl('PlayerDashboard');
          return;
        }
      } else {
        const myPlayers = cachedMyPlayers || await fetchMyPlayers();
        setHasPlayers(myPlayers.length > 0);
        setIsLoading(false);

        if (currentUser.tipo_panel === 'familia' && (currentUser.app_instalada === true || currentUser.es_segundo_progenitor === true)) {
          const currentPath = window.location.pathname.toLowerCase();
          if (currentPath !== '/parentdashboard' && !currentPath.includes('parental')) {
            window.location.href = createPageUrl('ParentDashboard');
            return;
          }
        }
      }

      if (currentUser.es_tesorero === true && !currentUser.es_coordinador && currentUser.role !== "admin") {
        const currentPath = window.location.pathname.toLowerCase();
        if (currentPath !== '/treasurerdashboard' && !currentPath.includes('treasurer')) {
          window.location.href = createPageUrl('TreasurerDashboard');
          return;
        }
      }

      if (currentUser.acceso_activo === false && currentUser.role !== "admin") {
        setShowSpecialScreen("restricted");
        return;
      }

      if (currentUser.role !== "admin" && 
        !currentUser.es_entrenador && 
        !currentUser.es_coordinador &&
        !currentUser.es_tesorero) {
        const period = getPeriodType();
        if (period === "closed") {
          setShowSpecialScreen("closed");
        } else if (period === "inscriptions") {
          setShowSpecialScreen("inscriptions");
        } else if (period === "vacation") {
          setShowSpecialScreen("vacation");
        }
      }
    } catch (error) {
      setIsLoading(false);
      if (isPublicPageRef.current) {
        setUser(null);
        setAuthChecked(true);
      }
    }
  };

  return {
    user, isAdmin, isCoach, isCoordinator, isTreasurer, isJunta, isPlayer, isMinor, minorPlayerData,
    hasPlayers, playerName, isLoading, showSpecialScreen, activeSeasonConfig, isMemberPaid,
    loteriaVisible, sponsorBannerVisible, extraChargeVisible, authChecked, isPublicPageRef,
    executeFetch
  };
}