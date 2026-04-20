import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

/**
 * Prevents the browser back button from navigating past the app
 * (e.g., to the login screen). When the user is on a root/dashboard page,
 * pressing back will stay on the same page instead of leaving the app.
 */

// Pages considered "root" — back should NOT go further
const ROOT_PATHS = ['/', '/Home', '/ParentDashboard', '/CoachDashboard', 
  '/CoordinatorDashboard', '/TreasurerDashboard', '/PlayerDashboard', '/MinorDashboard'];

export default function useBackGuard() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // On every navigation, push an extra history entry so the user
    // always has "room" to go back without leaving the app
    const isRoot = ROOT_PATHS.some(p => 
      location.pathname === p || location.pathname.toLowerCase() === p.toLowerCase()
    );

    if (isRoot) {
      // Replace current entry so there's nothing behind it
      window.history.replaceState({ appGuard: true }, '');
    }

    const handlePopState = (e) => {
      const isCurrentRoot = ROOT_PATHS.some(p => 
        window.location.pathname === p || 
        window.location.pathname.toLowerCase() === p.toLowerCase()
      );

      if (isCurrentRoot) {
        // User is on a dashboard and tried to go back — block it
        window.history.pushState({ appGuard: true }, '', window.location.href);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [location.pathname]);
}