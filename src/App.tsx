import { AnimatePresence } from "framer-motion";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { ROUTES, useStore } from "./store";
import Dashboard from "./pages/Dashboard";
import TestScreen from "./pages/TestScreen";
import Results from "./pages/Results";
import Review from "./pages/Review";
import Debug from "./pages/Debug";
import CheatSheetsPage from "./pages/CheatSheetsPage";
import SpeedLimitsPage from "./pages/SpeedLimitsPage";
import CategoriesPage from "./pages/CategoriesPage";

export default function App() {
  const location = useLocation();
  const { test, grade } = useStore();

  return (
    // `location.pathname` keys the transition so route changes animate.
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path={ROUTES.dashboard} element={<Dashboard />} />
        {/* Test flow needs in-memory state; if it's gone (e.g. refresh), bounce home. */}
        <Route path={ROUTES.test} element={test ? <TestScreen /> : <Navigate to={ROUTES.dashboard} replace />} />
        <Route path={ROUTES.results} element={grade ? <Results /> : <Navigate to={ROUTES.dashboard} replace />} />
        <Route path={ROUTES.review} element={grade ? <Review /> : <Navigate to={ROUTES.dashboard} replace />} />
        <Route path={ROUTES.debug} element={<Debug />} />
        <Route path={ROUTES.cheatsheets} element={<CheatSheetsPage />} />
        <Route path={ROUTES.speedLimits} element={<SpeedLimitsPage />} />
        <Route path={ROUTES.categories} element={<CategoriesPage />} />
        <Route path="*" element={<Navigate to={ROUTES.dashboard} replace />} />
      </Routes>
    </AnimatePresence>
  );
}
