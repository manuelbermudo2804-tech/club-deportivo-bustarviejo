import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useErrorTracking } from '@/components/analytics/ErrorTracker';
import AnalyticsDashboard from '@/components/analytics/AnalyticsDashboard';

export default function AppAnalytics() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        setIsAdmin(currentUser.role === 'admin');
        setLoading(false);
      } catch (e) {
        base44.auth.redirectToLogin();
      }
    };
    fetchUser();
  }, []);

  // Activar tracking de errores
  useErrorTracking(user?.email, user?.role);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
          <p className="text-slate-600 mt-4">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="max-w-2xl mx-auto bg-red-50 border-2 border-red-300 rounded-xl p-8 text-center">
          <h1 className="text-2xl font-bold text-red-900 mb-2">❌ Acceso Restringido</h1>
          <p className="text-red-800">Solo los administradores pueden acceder a Analytics</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-screen">
      <AnalyticsDashboard />
    </div>
  );
}