import { AnimatePresence } from "framer-motion";
import { useStore } from "./store";
import Dashboard from "./pages/Dashboard";
import TestScreen from "./pages/TestScreen";
import Results from "./pages/Results";
import Review from "./pages/Review";
import Debug from "./pages/Debug";
import CheatSheetsPage from "./pages/CheatSheetsPage";
import SpeedLimitsPage from "./pages/SpeedLimitsPage";

export default function App() {
  const { view } = useStore();

  return (
    <div className="min-h-full">
      <AnimatePresence mode="wait">
        {view === "dashboard" && <Dashboard key="dashboard" />}
        {view === "test" && <TestScreen key="test" />}
        {view === "results" && <Results key="results" />}
        {view === "review" && <Review key="review" />}
        {view === "debug" && <Debug key="debug" />}
        {view === "cheatsheets" && <CheatSheetsPage key="cheatsheets" />}
        {view === "speedLimits" && <SpeedLimitsPage key="speedLimits" />}
      </AnimatePresence>
    </div>
  );
}
