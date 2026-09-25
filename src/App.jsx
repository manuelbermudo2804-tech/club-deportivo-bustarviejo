import React, { useRef } from 'react'
import './App.css'
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import VisualEditAgent from '@/lib/VisualEditAgent'
import NavigationTracker from '@/lib/NavigationTracker'
import { installGlobalErrorHandlers, trackAppOpen } from '@/lib/diagnosticLogger'

// Instalar vigilante global de errores JS una sola vez al arrancar
installGlobalErrorHandlers();

// Registrar apertura de app (con throttle 24h) para medir adopción PWA real
// Se ejecuta tras un pequeño delay para no bloquear el render inicial
setTimeout(() => { trackAppOpen(); }, 3000);

import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import SponsorSplash from '@/components/sponsors/SponsorSplash';
import { lazy, Suspense } from 'react';

// Páginas cargadas bajo demanda: solo se descarga la pantalla que se abre
const MinorPreview = lazy(() => import('@/pages/MinorPreview'));
const CreditUsage = lazy(() => import('@/pages/CreditUsage'));
const PushBadgeTest = lazy(() => import('@/pages/PushBadgeTest'));
const PushStats = lazy(() => import('@/pages/PushStats'));
const FamilyPresentation = lazy(() => import('@/pages/FamilyPresentation'));
const PublicMemberCard = lazy(() => import('@/pages/PublicMemberCard'));
const SocialHub = lazy(() => import('@/pages/SocialHub'));
const PublicAccessRequest = lazy(() => import('@/pages/PublicAccessRequest'));
const PublicSponsors = lazy(() => import('@/pages/PublicSponsors'));
const Colabora = lazy(() => import('@/pages/Colabora'));
const BudgetPlanner = lazy(() => import('@/pages/BudgetPlanner'));
const SanIsidroAdmin = lazy(() => import('@/pages/SanIsidroAdmin'));
const SanIsidroInscripcion = lazy(() => import('@/pages/SanIsidroInscripcion'));
const ExternalLinks = lazy(() => import('@/pages/ExternalLinks'));
const ReciboGenerator = lazy(() => import('@/pages/ReciboGenerator'));
const FacturaGenerator = lazy(() => import('@/pages/FacturaGenerator'));
const PresupuestoGenerator = lazy(() => import('@/pages/PresupuestoGenerator'));
const CuestionarioPadelPDF = lazy(() => import('@/pages/CuestionarioPadelPDF'));
const MorososManagement = lazy(() => import('@/pages/MorososManagement'));
const MyFeedback = lazy(() => import('@/pages/MyFeedback'));
const Porra = lazy(() => import('@/pages/Porra'));
const MiPorra = lazy(() => import('@/pages/MiPorra'));
const PorraAdmin = lazy(() => import('@/pages/PorraAdmin'));
const PorraCrear = lazy(() => import('@/pages/PorraCrear'));
const PorraExito = lazy(() => import('@/pages/PorraExito'));
const PorraMiPorra = lazy(() => import('@/pages/PorraMiPorra'));
const PorraRanking = lazy(() => import('@/pages/PorraRanking'));
const PropuestaGVCGaesco = lazy(() => import('@/pages/PropuestaGVCGaesco'));
const PublicLanding = lazy(() => import('@/pages/PublicLanding'));
const PublicTorneo = lazy(() => import('@/pages/PublicTorneo'));
const PageBuilder = lazy(() => import('@/pages/PageBuilder'));
const PageBuilderEditor = lazy(() => import('@/pages/PageBuilderEditor'));
const PageBuilderInscritos = lazy(() => import('@/pages/PageBuilderInscritos'));
const PageBuilderPreInscritos = lazy(() => import('@/pages/PageBuilderPreInscritos'));
const PageBuilderAnalytics = lazy(() => import('@/pages/PageBuilderAnalytics'));
const PageBuilderGuia = lazy(() => import('@/pages/PageBuilderGuia'));
const DorsalManagement = lazy(() => import('@/pages/DorsalManagement'));
const GuiaEventos = lazy(() => import('@/pages/GuiaEventos'));
const Privacidad = lazy(() => import('@/pages/Privacidad'));
const ShareReceiver = lazy(() => import('@/pages/ShareReceiver'));
const PhotoAuthorizations = lazy(() => import('@/pages/PhotoAuthorizations'));
const HealthCheck = lazy(() => import('@/pages/HealthCheck'));
const ClubMemory = lazy(() => import('@/pages/ClubMemory'));
const SubvencionesPanel = lazy(() => import('@/pages/SubvencionesPanel'));
const AltaSocio = lazy(() => import('@/pages/AltaSocio'));
const GrowthMap = lazy(() => import('@/pages/GrowthMap'));
const ClubIA = lazy(() => import('@/pages/ClubIA'));
const RiesgoAbandono = lazy(() => import('@/pages/RiesgoAbandono'));
const TorneosAdmin = lazy(() => import('@/pages/TorneosAdmin'));
const TorneoManager = lazy(() => import('@/pages/TorneoManager'));
const MeteoClub = lazy(() => import('@/pages/MeteoClub'));
const EntrenamientoHub = lazy(() => import('@/pages/EntrenamientoHub'));
const CentroDatos = lazy(() => import('@/pages/CentroDatos'));
const LoteriaNavidad = lazy(() => import('@/pages/LoteriaNavidad'));
const PedidosEquipacion = lazy(() => import('@/pages/PedidosEquipacion'));
const ExportarSheets = lazy(() => import('@/pages/ExportarSheets'));
const ConsentimientosComerciales = lazy(() => import('@/pages/ConsentimientosComerciales'));
const DirectorioContactos = lazy(() => import('@/pages/DirectorioContactos'));
const CentroContenido = lazy(() => import('@/pages/CentroContenido'));
const SubirContenido = lazy(() => import('@/pages/SubirContenido'));
const InstalarApp = lazy(() => import('@/pages/InstalarApp'));
const EntrenadorPracticas = lazy(() => import('@/pages/EntrenadorPracticas'));
const MinorCoachCallups = lazy(() => import('@/pages/MinorCoachCallups'));
const MinorCoachAttendance = lazy(() => import('@/pages/MinorCoachAttendance'));
const EnviarContenidoWeb = lazy(() => import('@/pages/EnviarContenidoWeb'));
const AgendaClub = lazy(() => import('@/pages/AgendaClub'));
const ExpedienteSubvencion = lazy(() => import('@/pages/ExpedienteSubvencion'));

const PageSpinner = () => (
  <div className="fixed inset-0 flex items-center justify-center">
    <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
  </div>
);
const InlineSpinner = () => (
  <div className="flex items-center justify-center py-24">
    <div className="w-8 h-8 border-4 border-slate-200 border-t-orange-600 rounded-full animate-spin"></div>
  </div>
);

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}><Suspense fallback={<InlineSpinner />}>{children}</Suspense></Layout>
  : <Suspense fallback={<InlineSpinner />}>{children}</Suspense>;

const AppRouter = () => {
  const location = useLocation();
  
  // Rutas 100% públicas (sin auth, sin layout)
  const cleanPath = location.pathname.replace(/\/+$/, '').replace(/^\/+/, '/').toLowerCase();
  const publicPaths = ['/publicmembercard', '/familypresentation', '/solicitaracceso', '/patrocinadores', '/sanisidro', '/porra', '/porracrear', '/porraexito', '/porramiporra', '/porraranking', '/propuestagvcgaesco', '/privacidad', '/colabora', '/altasocio', '/loteria', '/instalarapp', '/enviarfotos'];
  // Constructor de páginas: cualquier URL que empiece por /l/ es pública
  const isLandingPath = cleanPath.startsWith('/l/');
  // Página pública propia de torneo: cualquier URL que empiece por /torneo/
  const isTorneoPath = cleanPath.startsWith('/torneo/');
  // Si la URL incluye ?from=app, el usuario viene de la app interna autenticada:
  // queremos renderizar con el layout normal (menú lateral, etc.) en vez de tratar
  // /PorraMiPorra y /PorraRanking como páginas 100% públicas sin entorno.
  const urlParams = new URLSearchParams(location.search);
  const fromApp = urlParams.get('from') === 'app';
  if (isLandingPath) {
    return (
      <Routes>
        <Route path="/l/:slug" element={<PublicLanding />} />
      </Routes>
    );
  }
  if (isTorneoPath) {
    return (
      <Routes>
        <Route path="/torneo/:slug" element={<PublicTorneo />} />
      </Routes>
    );
  }
  if (publicPaths.includes(cleanPath) && !fromApp) {
    return (
      <Routes>
        <Route path="/PublicMemberCard" element={<PublicMemberCard />} />
        <Route path="/FamilyPresentation" element={<FamilyPresentation />} />
        <Route path="/SolicitarAcceso" element={<PublicAccessRequest />} />
        <Route path="/solicitaracceso" element={<PublicAccessRequest />} />
        <Route path="/Solicitaracceso" element={<PublicAccessRequest />} />
        <Route path="/SOLICITARACCESO" element={<PublicAccessRequest />} />
        <Route path="/Patrocinadores" element={<PublicSponsors />} />
        <Route path="/patrocinadores" element={<PublicSponsors />} />
        <Route path="/Colabora" element={<Colabora />} />
        <Route path="/colabora" element={<Colabora />} />
        <Route path="/SanIsidro" element={<SanIsidroInscripcion />} />
        <Route path="/sanisidro" element={<SanIsidroInscripcion />} />
        <Route path="/Sanisidro" element={<SanIsidroInscripcion />} />
        <Route path="/SANISIDRO" element={<SanIsidroInscripcion />} />
        <Route path="/Porra" element={<Porra />} />
        <Route path="/porra" element={<Porra />} />
        <Route path="/PORRA" element={<Porra />} />
        <Route path="/PorraCrear" element={<PorraCrear />} />
        <Route path="/porracrear" element={<PorraCrear />} />
        <Route path="/PorraExito" element={<PorraExito />} />
        <Route path="/porraexito" element={<PorraExito />} />
        <Route path="/PorraMiPorra" element={<PorraMiPorra />} />
        <Route path="/porramiporra" element={<PorraMiPorra />} />
        <Route path="/PorraRanking" element={<PorraRanking />} />
        <Route path="/porraranking" element={<PorraRanking />} />
        <Route path="/PropuestaGVCGaesco" element={<PropuestaGVCGaesco />} />
        <Route path="/propuestagvcgaesco" element={<PropuestaGVCGaesco />} />
        <Route path="/Privacidad" element={<Privacidad />} />
        <Route path="/privacidad" element={<Privacidad />} />
        <Route path="/AltaSocio" element={<AltaSocio />} />
        <Route path="/altasocio" element={<AltaSocio />} />
        <Route path="/Loteria" element={<LoteriaNavidad />} />
        <Route path="/loteria" element={<LoteriaNavidad />} />
        <Route path="/InstalarApp" element={<InstalarApp />} />
        <Route path="/instalarapp" element={<InstalarApp />} />
        <Route path="/EnviarFotos" element={<EnviarContenidoWeb />} />
        <Route path="/enviarfotos" element={<EnviarContenidoWeb />} />
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
    <>
    <SponsorSplash />
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
      <Route path="/CreditUsage" element={<LayoutWrapper currentPageName="CreditUsage"><CreditUsage /></LayoutWrapper>} />
      <Route path="/PushBadgeTest" element={<LayoutWrapper currentPageName="PushBadgeTest"><PushBadgeTest /></LayoutWrapper>} />
      <Route path="/PushStats" element={<LayoutWrapper currentPageName="PushStats"><PushStats /></LayoutWrapper>} />
      <Route path="/SocialHub" element={<LayoutWrapper currentPageName="SocialHub"><SocialHub /></LayoutWrapper>} />
      <Route path="/BudgetPlanner" element={<LayoutWrapper currentPageName="BudgetPlanner"><BudgetPlanner /></LayoutWrapper>} />
      <Route path="/SanIsidroAdmin" element={<LayoutWrapper currentPageName="SanIsidroAdmin"><SanIsidroAdmin /></LayoutWrapper>} />
      <Route path="/ExternalLinks" element={<LayoutWrapper currentPageName="ExternalLinks"><ExternalLinks /></LayoutWrapper>} />
      <Route path="/ReciboGenerator" element={<LayoutWrapper currentPageName="ReciboGenerator"><ReciboGenerator /></LayoutWrapper>} />
      <Route path="/FacturaGenerator" element={<LayoutWrapper currentPageName="FacturaGenerator"><FacturaGenerator /></LayoutWrapper>} />
      <Route path="/PresupuestoGenerator" element={<LayoutWrapper currentPageName="PresupuestoGenerator"><PresupuestoGenerator /></LayoutWrapper>} />
      <Route path="/CuestionarioPadelPDF" element={<LayoutWrapper currentPageName="CuestionarioPadelPDF"><CuestionarioPadelPDF /></LayoutWrapper>} />
      <Route path="/MorososManagement" element={<LayoutWrapper currentPageName="MorososManagement"><MorososManagement /></LayoutWrapper>} />
      <Route path="/MyFeedback" element={<LayoutWrapper currentPageName="MyFeedback"><MyFeedback /></LayoutWrapper>} />
      <Route path="/PorraAdmin" element={<LayoutWrapper currentPageName="PorraAdmin"><PorraAdmin /></LayoutWrapper>} />
      <Route path="/MiPorra" element={<LayoutWrapper currentPageName="MiPorra"><MiPorra /></LayoutWrapper>} />
      <Route path="/PageBuilder" element={<LayoutWrapper currentPageName="PageBuilder"><PageBuilder /></LayoutWrapper>} />
      <Route path="/PageBuilderEditor" element={<LayoutWrapper currentPageName="PageBuilderEditor"><PageBuilderEditor /></LayoutWrapper>} />
      <Route path="/PageBuilderInscritos" element={<LayoutWrapper currentPageName="PageBuilderInscritos"><PageBuilderInscritos /></LayoutWrapper>} />
      <Route path="/PageBuilderPreInscritos" element={<LayoutWrapper currentPageName="PageBuilderPreInscritos"><PageBuilderPreInscritos /></LayoutWrapper>} />
      <Route path="/PageBuilderAnalytics" element={<LayoutWrapper currentPageName="PageBuilderAnalytics"><PageBuilderAnalytics /></LayoutWrapper>} />
      <Route path="/PageBuilderGuia" element={<LayoutWrapper currentPageName="PageBuilderGuia"><PageBuilderGuia /></LayoutWrapper>} />
      <Route path="/DorsalManagement" element={<LayoutWrapper currentPageName="DorsalManagement"><DorsalManagement /></LayoutWrapper>} />
      <Route path="/GuiaEventos" element={<LayoutWrapper currentPageName="GuiaEventos"><GuiaEventos /></LayoutWrapper>} />
      <Route path="/PhotoAuthorizations" element={<LayoutWrapper currentPageName="PhotoAuthorizations"><PhotoAuthorizations /></LayoutWrapper>} />
      <Route path="/HealthCheck" element={<LayoutWrapper currentPageName="HealthCheck"><HealthCheck /></LayoutWrapper>} />
      <Route path="/ClubMemory" element={<LayoutWrapper currentPageName="ClubMemory"><ClubMemory /></LayoutWrapper>} />
      <Route path="/SubvencionesPanel" element={<LayoutWrapper currentPageName="SubvencionesPanel"><SubvencionesPanel /></LayoutWrapper>} />
      <Route path="/GrowthMap" element={<LayoutWrapper currentPageName="GrowthMap"><GrowthMap /></LayoutWrapper>} />
      <Route path="/ClubIA" element={<LayoutWrapper currentPageName="ClubIA"><ClubIA /></LayoutWrapper>} />
      <Route path="/RiesgoAbandono" element={<LayoutWrapper currentPageName="RiesgoAbandono"><RiesgoAbandono /></LayoutWrapper>} />
      <Route path="/TorneosAdmin" element={<LayoutWrapper currentPageName="TorneosAdmin"><TorneosAdmin /></LayoutWrapper>} />
      <Route path="/TorneoManager" element={<LayoutWrapper currentPageName="TorneoManager"><TorneoManager /></LayoutWrapper>} />
      <Route path="/MeteoClub" element={<LayoutWrapper currentPageName="MeteoClub"><MeteoClub /></LayoutWrapper>} />
      <Route path="/EntrenamientoHub" element={<LayoutWrapper currentPageName="EntrenamientoHub"><EntrenamientoHub /></LayoutWrapper>} />
      <Route path="/CentroDatos" element={<LayoutWrapper currentPageName="CentroDatos"><CentroDatos /></LayoutWrapper>} />
      <Route path="/PedidosEquipacion" element={<LayoutWrapper currentPageName="PedidosEquipacion"><PedidosEquipacion /></LayoutWrapper>} />
      <Route path="/ExportarSheets" element={<LayoutWrapper currentPageName="ExportarSheets"><ExportarSheets /></LayoutWrapper>} />
      <Route path="/ConsentimientosComerciales" element={<LayoutWrapper currentPageName="ConsentimientosComerciales"><ConsentimientosComerciales /></LayoutWrapper>} />
      <Route path="/DirectorioContactos" element={<LayoutWrapper currentPageName="DirectorioContactos"><DirectorioContactos /></LayoutWrapper>} />
      <Route path="/CentroContenido" element={<LayoutWrapper currentPageName="CentroContenido"><CentroContenido /></LayoutWrapper>} />
      <Route path="/SubirContenido" element={<LayoutWrapper currentPageName="SubirContenido"><SubirContenido /></LayoutWrapper>} />
      <Route path="/EntrenadorPracticas" element={<LayoutWrapper currentPageName="EntrenadorPracticas"><EntrenadorPracticas /></LayoutWrapper>} />
      <Route path="/MinorCoachCallups" element={<LayoutWrapper currentPageName="MinorCoachCallups"><MinorCoachCallups /></LayoutWrapper>} />
      <Route path="/MinorCoachAttendance" element={<LayoutWrapper currentPageName="MinorCoachAttendance"><MinorCoachAttendance /></LayoutWrapper>} />
      <Route path="/AgendaClub" element={<LayoutWrapper currentPageName="AgendaClub"><AgendaClub /></LayoutWrapper>} />
      <Route path="/ExpedienteSubvencion" element={<LayoutWrapper currentPageName="ExpedienteSubvencion"><ExpedienteSubvencion /></LayoutWrapper>} />

      <Route path="/ShareReceiver" element={<LayoutWrapper currentPageName="ShareReceiver"><ShareReceiver /></LayoutWrapper>} />
      <Route path="/sharereceiver" element={<LayoutWrapper currentPageName="ShareReceiver"><ShareReceiver /></LayoutWrapper>} />
      {/* Versiones INTERNAS (con layout/menú) de PorraMiPorra y PorraRanking — activadas
          cuando se llega con ?from=app desde la app autenticada. Las versiones públicas
          siguen siendo accesibles sin auth en el bloque público de AppRouter. */}
      <Route path="/PorraMiPorra" element={<LayoutWrapper currentPageName="PorraMiPorra"><PorraMiPorra /></LayoutWrapper>} />
      <Route path="/PorraRanking" element={<LayoutWrapper currentPageName="PorraRanking"><PorraRanking /></LayoutWrapper>} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
    </>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <NavigationTracker />
          <Suspense fallback={<PageSpinner />}>
            <AppRouter />
          </Suspense>
        </Router>
        <Toaster />
        <VisualEditAgent />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App