import Home from './pages/Home';
import Players from './pages/Players';
import Payments from './pages/Payments';
import Store from './pages/Store';
import Layout from './Layout.jsx';


export const PAGES = {
    "Home": Home,
    "Players": Players,
    "Payments": Payments,
    "Store": Store,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: Layout,
};