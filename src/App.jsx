import React, { useRef } from 'react'
import './App.css'
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import VisualEditAgent from '@/lib/VisualEditAgent'
import NavigationTracker from '@/lib/NavigationTracker'

import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import MinorPreview from '@/pages/MinorPreview';
import PosterGenerator from '@/pages/PosterGenerator';
import CreditUsage from '@/pages/CreditUsage';
import PushBadgeTest from '@/pages/PushBadgeTest';
import PushStats from '@/pages/PushStats';
import FamilyPresentation from '@/pages/FamilyPresentation';
import PublicMemberCard from '@/pages/PublicMemberCard';
import SocialHub from '@/pages/SocialHub';
import PublicAccessRequest from '@/pages/PublicAccessRequest';
import PublicSponsors from '@/pages/PublicSponsors';
import BudgetPlanner from '@/pages/BudgetPlanner';
import SanIsidroAdmin from '@/pages/SanIsidroAdmin';
import SanIsidroInscripcion from '@/pages/SanIsidroInscripcion';
import ExternalLinks from '@/pages/ExternalLinks';
import ReciboGenerator from '@/pages/ReciboGenerator';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const AppRouter = () => {
  const location = useLocation();
  
  // Rutas 100% públicas (sin auth, sin layout)
  const cleanPath = location.pathname.replace(/\/+$/, '').toLowerCase();
  const publicPaths = ['/publicmembercard', '/familypresentation', '/solicitaracceso', '/patrocinadores', '/sanisidro'];
  if (publicPaths.includes(cleanPath)) {
    return (
      <Routes>
        <Route path="/PublicMemberCard" element={<PublicMemberCard />} />
        <Route path="/FamilyPresentation" element={<FamilyPresentation />} />
        <Route path="/SolicitarAcceso" element={<PublicAccessRequest />} />
        <Route path="/Patrocinadores" element={<PublicSponsors />} />
        <Route path="/SanIsidro" element={<SanIsidroInscripcion />} />
        <Route path="/sanisidro" element={<SanIsidroInscripcion />} />
        <Route path="/Sanisidro" element={<SanIsidroInscripcion />} />
        <Route path="/SANISIDRO" element={<SanIsidroInscripcion />} />
      </Routes>
    );
  }
  
  return <AuthenticatedApp />;
};

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, isAuthenticated, navigateToLogin, checkAppState } = useAuth();
  const retryCountRef = useRef(0);

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Only redirect to login if there's genuinely no token stored.
      // If a token exists in localStorage, the auth check may have failed transiently
      // (e.g. browser back button reload, network glitch). Retry instead of redirecting.
      const storedToken = localStorage.getItem('base44_access_token');
      if (storedToken && retryCountRef.current < 2) {
        // Token exists — likely a transient failure. Retry auth check (max 2 times).
        retryCountRef.current += 1;
        checkAppState();
        return (
          <div className="fixed inset-0 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
          </div>
        );
      }
      // No token at all — genuinely need to login
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route path="/" element={
        <LayoutWrapper currentPageName={mainPageKey}>
          <MainPage />
        </LayoutWrapper>
      } />
      {Object.entries(Pages).map(([path, Page]) => (
        <Route
          key={path}
          path={`/${path}`}
          element={
            <LayoutWrapper currentPageName={path}>
              <Page />
            </LayoutWrapper>
          }
        />
      ))}
      <Route path="/MinorPreview" element={<LayoutWrapper currentPageName="MinorPreview"><MinorPreview /></LayoutWrapper>} />
      <Route path="/PosterGenerator" element={<LayoutWrapper currentPageName="PosterGenerator"><PosterGenerator /></LayoutWrapper>} />
      <Route path="/CreditUsage" element={<LayoutWrapper currentPageName="CreditUsage"><CreditUsage /></LayoutWrapper>} />
      <Route path="/PushBadgeTest" element={<LayoutWrapper currentPageName="PushBadgeTest"><PushBadgeTest /></LayoutWrapper>} />
      <Route path="/PushStats" element={<LayoutWrapper currentPageName="PushStats"><PushStats /></LayoutWrapper>} />
      <Route path="/SocialHub" element={<LayoutWrapper currentPageName="SocialHub"><SocialHub /></LayoutWrapper>} />
      <Route path="/BudgetPlanner" element={<LayoutWrapper currentPageName="BudgetPlanner"><BudgetPlanner /></LayoutWrapper>} />
      <Route path="/SanIsidroAdmin" element={<LayoutWrapper currentPageName="SanIsidroAdmin"><SanIsidroAdmin /></LayoutWrapper>} />
      <Route path="/ExternalLinks" element={<LayoutWrapper currentPageName="ExternalLinks"><ExternalLinks /></LayoutWrapper>} />
      <Route path="/ReciboGenerator" element={<LayoutWrapper currentPageName="ReciboGenerator"><ReciboGenerator /></LayoutWrapper>} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <NavigationTracker />
          <AppRouter />
        </Router>
        <Toaster />
        <VisualEditAgent />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App