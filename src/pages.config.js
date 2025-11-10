import Home from './pages/Home';
import Players from './pages/Players';
import Payments from './pages/Payments';
import Store from './pages/Store';
import Reminders from './pages/Reminders';
import ParentDashboard from './pages/ParentDashboard';
import ParentPayments from './pages/ParentPayments';
import Layout from './Layout.jsx';


export const PAGES = {
    "Home": Home,
    "Players": Players,
    "Payments": Payments,
    "Store": Store,
    "Reminders": Reminders,
    "ParentDashboard": ParentDashboard,
    "ParentPayments": ParentPayments,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: Layout,
};