import { useState, useEffect } from "react";

// Detecta si la app está instalada como PWA y gestiona el first-launch invite
export default function usePwaDetection(user) {
  const [isAppInstalled, setIsAppInstalled] = useState(false);
  const [showFirstLaunchInvite, setShowFirstLaunchInvite] = useState(false);

  // Detectar si marcada como instalada en localStorage
  useEffect(() => {
    const userMarkedInstalled = localStorage.getItem('pwaInstalled') === 'true';
    setIsAppInstalled(userMarkedInstalled);
  }, []);

  // Detectar standalone + first launch invite
  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    if (isStandalone) {
      localStorage.setItem('pwaInstalled', 'true');
      setIsAppInstalled(true);
    }
    if (user?.tipo_panel && isStandalone && !localStorage.getItem('firstLaunchDone') && user?.es_segundo_progenitor !== true) {
      setShowFirstLaunchInvite(true);
    }
  }, [user]);

  const markInstalled = () => {
    localStorage.setItem('pwaInstalled', 'true');
    setIsAppInstalled(true);
  };

  const dismissFirstLaunch = () => {
    setShowFirstLaunchInvite(false);
    localStorage.setItem('firstLaunchDone', 'true');
  };

  return { isAppInstalled, showFirstLaunchInvite, setShowFirstLaunchInvite, markInstalled, dismissFirstLaunch };
}