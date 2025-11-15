import Home from './pages/Home';
import Players from './pages/Players';
import Payments from './pages/Payments';
import Store from './pages/Store';
import Reminders from './pages/Reminders';
import ParentDashboard from './pages/ParentDashboard';
import ParentPayments from './pages/ParentPayments';
import ParentPlayers from './pages/ParentPlayers';
import Calendar from './pages/Calendar';
import Announcements from './pages/Announcements';
import SeasonManagement from './pages/SeasonManagement';
import PaymentHistory from './pages/PaymentHistory';
import AdminChat from './pages/AdminChat';
import ParentChat from './pages/ParentChat';
import UserManagement from './pages/UserManagement';
import OrderManagement from './pages/OrderManagement';
import ParentOrders from './pages/ParentOrders';
import ClothingOrders from './pages/ClothingOrders';
import TrainingSchedules from './pages/TrainingSchedules';
import ParentTrainingSchedules from './pages/ParentTrainingSchedules';
import AdminGallery from './pages/AdminGallery';
import ParentGallery from './pages/ParentGallery';
import PlayerDashboard from './pages/PlayerDashboard';
import PlayerProfile from './pages/PlayerProfile';
import PlayerChat from './pages/PlayerChat';
import PlayerSchedules from './pages/PlayerSchedules';
import PlayerGallery from './pages/PlayerGallery';
import CoachCallups from './pages/CoachCallups';
import ParentCallups from './pages/ParentCallups';
import PlayerCallups from './pages/PlayerCallups';
import CoachChat from './pages/CoachChat';
import TeamRosters from './pages/TeamRosters';
import CoachAttendance from './pages/CoachAttendance';
import PlayerEvaluations from './pages/PlayerEvaluations';
import ClubStats from './pages/ClubStats';
import Layout from './Layout.jsx';


export const PAGES = {
    "Home": Home,
    "Players": Players,
    "Payments": Payments,
    "Store": Store,
    "Reminders": Reminders,
    "ParentDashboard": ParentDashboard,
    "ParentPayments": ParentPayments,
    "ParentPlayers": ParentPlayers,
    "Calendar": Calendar,
    "Announcements": Announcements,
    "SeasonManagement": SeasonManagement,
    "PaymentHistory": PaymentHistory,
    "AdminChat": AdminChat,
    "ParentChat": ParentChat,
    "UserManagement": UserManagement,
    "OrderManagement": OrderManagement,
    "ParentOrders": ParentOrders,
    "ClothingOrders": ClothingOrders,
    "TrainingSchedules": TrainingSchedules,
    "ParentTrainingSchedules": ParentTrainingSchedules,
    "AdminGallery": AdminGallery,
    "ParentGallery": ParentGallery,
    "PlayerDashboard": PlayerDashboard,
    "PlayerProfile": PlayerProfile,
    "PlayerChat": PlayerChat,
    "PlayerSchedules": PlayerSchedules,
    "PlayerGallery": PlayerGallery,
    "CoachCallups": CoachCallups,
    "ParentCallups": ParentCallups,
    "PlayerCallups": PlayerCallups,
    "CoachChat": CoachChat,
    "TeamRosters": TeamRosters,
    "CoachAttendance": CoachAttendance,
    "PlayerEvaluations": PlayerEvaluations,
    "ClubStats": ClubStats,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: Layout,
};