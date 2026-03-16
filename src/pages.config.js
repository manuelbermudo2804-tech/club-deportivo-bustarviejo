/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import AdminAccessCodes from './pages/AdminAccessCodes';
import AdminChatsHub from './pages/AdminChatsHub';
import AdminGallery from './pages/AdminGallery';
import AdminStats from './pages/AdminStats';
import Announcements from './pages/Announcements';
import Anuncios from './pages/Anuncios';
import AppAnalytics from './pages/AppAnalytics';
import BirthdayPreview from './pages/BirthdayPreview';
import BoardTasks from './pages/BoardTasks';
import CalendarAndSchedules from './pages/CalendarAndSchedules';
import CategoryConfigAdmin from './pages/CategoryConfigAdmin';
import CategoryManagement from './pages/CategoryManagement';
import CentroCompeticion from './pages/CentroCompeticion';
import CentroCompeticionTecnico from './pages/CentroCompeticionTecnico';
import ChatAnalyticsDashboard from './pages/ChatAnalyticsDashboard';
import ChatNotificationAuditPage from './pages/ChatNotificationAuditPage';
import ChatTestConsole from './pages/ChatTestConsole';
import Chatbot from './pages/Chatbot';
import CheckinTablet from './pages/CheckinTablet';
import ClubMembersManagement from './pages/ClubMembersManagement';
import ClubMembership from './pages/ClubMembership';
import ClubStats from './pages/ClubStats';
import CoachAttendance from './pages/CoachAttendance';
import CoachCallups from './pages/CoachCallups';
import CoachChatSettings from './pages/CoachChatSettings';
import CoachChatsHub from './pages/CoachChatsHub';
import CoachDashboard from './pages/CoachDashboard';
import CoachEvaluationReports from './pages/CoachEvaluationReports';
import CoachParentChat from './pages/CoachParentChat';
import CoachProfile from './pages/CoachProfile';
import CoachProfiles from './pages/CoachProfiles';
import CoachStandingsAnalysis from './pages/CoachStandingsAnalysis';
import CompetitionChecklist from './pages/CompetitionChecklist';
import ContactRequests from './pages/ContactRequests';
import CoordinatorChat from './pages/CoordinatorChat';
import CoordinatorChatsHub from './pages/CoordinatorChatsHub';
import CoordinatorDashboard from './pages/CoordinatorDashboard';
import CoordinatorSettings from './pages/CoordinatorSettings';
import CustomPaymentPlans from './pages/CustomPaymentPlans';
import DeleteAccount from './pages/DeleteAccount';
import DocumentManagement from './pages/DocumentManagement';
import EmailTemplates from './pages/EmailTemplates';
import EventManagement from './pages/EventManagement';
import ExerciseLibrary from './pages/ExerciseLibrary';
import ExtraCharges from './pages/ExtraCharges';
import ExtraPayments from './pages/ExtraPayments';
import FamilyChats from './pages/FamilyChats';
import FamilyChatsHub from './pages/FamilyChatsHub';
import FamilyGuide from './pages/FamilyGuide';
import FederationSignatures from './pages/FederationSignatures';
import FederationSignaturesAdmin from './pages/FederationSignaturesAdmin';
import FeedbackManagement from './pages/FeedbackManagement';
import FemeninoInterests from './pages/FemeninoInterests';
import Gallery from './pages/Gallery';
import Home from './pages/Home';
import InstallSuccessPreview from './pages/InstallSuccessPreview';
import InvitationRequests from './pages/InvitationRequests';
import JoinFemenino from './pages/JoinFemenino';
import JoinReferral from './pages/JoinReferral';
import JuniorMailbox from './pages/JuniorMailbox';
import JuniorMailboxAdmin from './pages/JuniorMailboxAdmin';
import LotteryManagement from './pages/LotteryManagement';
import ManualAcceso from './pages/ManualAcceso';
import MarketListingDetail from './pages/MarketListingDetail';
import MatchApp from './pages/MatchApp';
import MatchMinutesTracker from './pages/MatchMinutesTracker';
import MatchResults from './pages/MatchResults';
import MedicalRecords from './pages/MedicalRecords';
import MemberCardDisplay from './pages/MemberCardDisplay';
import MemberManagement from './pages/MemberManagement';
import Mercadillo from './pages/Mercadillo';
import MinorDashboard from './pages/MinorDashboard';
import MinorPreview from './pages/MinorPreview';
import NotificationPreferences from './pages/NotificationPreferences';
import OnboardingPreview from './pages/OnboardingPreview';
import PWASetup from './pages/PWASetup';
import ParentCallups from './pages/ParentCallups';
import ParentCoachChat from './pages/ParentCoachChat';
import ParentCoordinatorChat from './pages/ParentCoordinatorChat';
import ParentDashboard from './pages/ParentDashboard';
import ParentDirectMessages from './pages/ParentDirectMessages';
import ParentDocuments from './pages/ParentDocuments';
import ParentEventRSVP from './pages/ParentEventRSVP';
import ParentExtraPayments from './pages/ParentExtraPayments';
import ParentGallery from './pages/ParentGallery';
import ParentLottery from './pages/ParentLottery';
import ParentOrders from './pages/ParentOrders';
import ParentPayments from './pages/ParentPayments';
import ParentPlayers from './pages/ParentPlayers';
import ParentSystemMessages from './pages/ParentSystemMessages';
import ParentTrainingSchedules from './pages/ParentTrainingSchedules';
import PaymentHistory from './pages/PaymentHistory';
import PaymentReminders from './pages/PaymentReminders';
import Payments from './pages/Payments';
import PaymentsDashboard from './pages/PaymentsDashboard';
import PlayerDashboard from './pages/PlayerDashboard';
import Players from './pages/Players';
import PlayerEvaluations from './pages/PlayerEvaluations';
import PlayerProfile from './pages/PlayerProfile';
import PlayerRenewal from './pages/PlayerRenewal';
import PlayerStatsPreview from './pages/PlayerStatsPreview';
import PwaEntry from './pages/PwaEntry';
import ReferralManagement from './pages/ReferralManagement';
import Reminders from './pages/Reminders';
import RenewalDashboard from './pages/RenewalDashboard';
import RffmMonitor from './pages/RffmMonitor';
import Schedules from './pages/Schedules';
import SeasonManagement from './pages/SeasonManagement';
import Shop from './pages/Shop';
import Sponsorships from './pages/Sponsorships';
import StaffChat from './pages/StaffChat';
import Surveys from './pages/Surveys';
import TacticsBoard from './pages/TacticsBoard';
import TeamAttendanceEvaluation from './pages/TeamAttendanceEvaluation';
import TeamRosters from './pages/TeamRosters';
import Tienda from './pages/Tienda';
import TrainingSchedules from './pages/TrainingSchedules';
import TreasurerDashboard from './pages/TreasurerDashboard';
import TreasurerFinancialPanel from './pages/TreasurerFinancialPanel';
import UploadDiagnostics from './pages/UploadDiagnostics';
import UserManagement from './pages/UserManagement';
import Voluntariado from './pages/Voluntariado';
import WebContacts from './pages/WebContacts';
import PosterGenerator from './pages/PosterGenerator';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AdminAccessCodes": AdminAccessCodes,
    "AdminChatsHub": AdminChatsHub,
    "AdminGallery": AdminGallery,
    "AdminStats": AdminStats,
    "Announcements": Announcements,
    "Anuncios": Anuncios,
    "AppAnalytics": AppAnalytics,
    "BirthdayPreview": BirthdayPreview,
    "BoardTasks": BoardTasks,
    "CalendarAndSchedules": CalendarAndSchedules,
    "CategoryConfigAdmin": CategoryConfigAdmin,
    "CategoryManagement": CategoryManagement,
    "CentroCompeticion": CentroCompeticion,
    "CentroCompeticionTecnico": CentroCompeticionTecnico,
    "ChatAnalyticsDashboard": ChatAnalyticsDashboard,
    "ChatNotificationAuditPage": ChatNotificationAuditPage,
    "ChatTestConsole": ChatTestConsole,
    "Chatbot": Chatbot,
    "CheckinTablet": CheckinTablet,
    "ClubMembersManagement": ClubMembersManagement,
    "ClubMembership": ClubMembership,
    "ClubStats": ClubStats,
    "CoachAttendance": CoachAttendance,
    "CoachCallups": CoachCallups,
    "CoachChatSettings": CoachChatSettings,
    "CoachChatsHub": CoachChatsHub,
    "CoachDashboard": CoachDashboard,
    "CoachEvaluationReports": CoachEvaluationReports,
    "CoachParentChat": CoachParentChat,
    "CoachProfile": CoachProfile,
    "CoachProfiles": CoachProfiles,
    "CoachStandingsAnalysis": CoachStandingsAnalysis,
    "CompetitionChecklist": CompetitionChecklist,
    "ContactRequests": ContactRequests,
    "CoordinatorChat": CoordinatorChat,
    "CoordinatorChatsHub": CoordinatorChatsHub,
    "CoordinatorDashboard": CoordinatorDashboard,
    "CoordinatorSettings": CoordinatorSettings,
    "CustomPaymentPlans": CustomPaymentPlans,
    "DeleteAccount": DeleteAccount,
    "DocumentManagement": DocumentManagement,
    "EmailTemplates": EmailTemplates,
    "EventManagement": EventManagement,
    "ExerciseLibrary": ExerciseLibrary,
    "ExtraCharges": ExtraCharges,
    "ExtraPayments": ExtraPayments,
    "FamilyChats": FamilyChats,
    "FamilyChatsHub": FamilyChatsHub,
    "FamilyGuide": FamilyGuide,
    "FederationSignatures": FederationSignatures,
    "FederationSignaturesAdmin": FederationSignaturesAdmin,
    "FeedbackManagement": FeedbackManagement,
    "FemeninoInterests": FemeninoInterests,
    "Gallery": Gallery,
    "Home": Home,
    "InstallSuccessPreview": InstallSuccessPreview,
    "InvitationRequests": InvitationRequests,
    "JoinFemenino": JoinFemenino,
    "JoinReferral": JoinReferral,
    "JuniorMailbox": JuniorMailbox,
    "JuniorMailboxAdmin": JuniorMailboxAdmin,
    "LotteryManagement": LotteryManagement,
    "ManualAcceso": ManualAcceso,
    "MarketListingDetail": MarketListingDetail,
    "MatchApp": MatchApp,
    "MatchMinutesTracker": MatchMinutesTracker,
    "MatchResults": MatchResults,
    "MedicalRecords": MedicalRecords,
    "MemberCardDisplay": MemberCardDisplay,
    "MemberManagement": MemberManagement,
    "Mercadillo": Mercadillo,
    "MinorDashboard": MinorDashboard,
    "MinorPreview": MinorPreview,
    "NotificationPreferences": NotificationPreferences,
    "OnboardingPreview": OnboardingPreview,
    "PWASetup": PWASetup,
    "ParentCallups": ParentCallups,
    "ParentCoachChat": ParentCoachChat,
    "ParentCoordinatorChat": ParentCoordinatorChat,
    "ParentDashboard": ParentDashboard,
    "ParentDirectMessages": ParentDirectMessages,
    "ParentDocuments": ParentDocuments,
    "ParentEventRSVP": ParentEventRSVP,
    "ParentExtraPayments": ParentExtraPayments,
    "ParentGallery": ParentGallery,
    "ParentLottery": ParentLottery,
    "ParentOrders": ParentOrders,
    "ParentPayments": ParentPayments,
    "ParentPlayers": ParentPlayers,
    "ParentSystemMessages": ParentSystemMessages,
    "ParentTrainingSchedules": ParentTrainingSchedules,
    "PaymentHistory": PaymentHistory,
    "PaymentReminders": PaymentReminders,
    "Payments": Payments,
    "PaymentsDashboard": PaymentsDashboard,
    "PlayerDashboard": PlayerDashboard,
    "Players": Players,
    "PlayerEvaluations": PlayerEvaluations,
    "PlayerProfile": PlayerProfile,
    "PlayerRenewal": PlayerRenewal,
    "PlayerStatsPreview": PlayerStatsPreview,
    "PwaEntry": PwaEntry,
    "ReferralManagement": ReferralManagement,
    "Reminders": Reminders,
    "RenewalDashboard": RenewalDashboard,
    "RffmMonitor": RffmMonitor,
    "Schedules": Schedules,
    "SeasonManagement": SeasonManagement,
    "Shop": Shop,
    "Sponsorships": Sponsorships,
    "StaffChat": StaffChat,
    "Surveys": Surveys,
    "TacticsBoard": TacticsBoard,
    "TeamAttendanceEvaluation": TeamAttendanceEvaluation,
    "TeamRosters": TeamRosters,
    "Tienda": Tienda,
    "TrainingSchedules": TrainingSchedules,
    "TreasurerDashboard": TreasurerDashboard,
    "TreasurerFinancialPanel": TreasurerFinancialPanel,
    "UploadDiagnostics": UploadDiagnostics,
    "UserManagement": UserManagement,
    "Voluntariado": Voluntariado,
    "WebContacts": WebContacts,
    "PosterGenerator": PosterGenerator,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};