// Central app state via React context. Holds parsed questions in memory for the
// whole session and drives the view machine. Parsed results are also cached in
// localStorage (best-effort) keyed by the set of screenshot filenames, so a
// reload doesn't force re-running OCR.

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { ParsedQuestion, ParseProgress, ScreenshotSource, TestQuestion } from "./types";
import { loadScreenshotSources, parseAllScreenshots } from "./parser";
import { buildTest, gradeTest, type GradeSummary } from "./lib/testEngine";

export type View = "dashboard" | "test" | "results" | "review" | "debug";
export type LoadState = "idle" | "loading" | "done";

const CACHE_PREFIX = "roadiq:cache:";

function cacheKey(sources: ScreenshotSource[]): string {
  return CACHE_PREFIX + sources.map((s) => s.fileName).sort().join("|");
}

interface Store {
  view: View;
  setView: (v: View) => void;

  sources: ScreenshotSource[];
  questions: ParsedQuestion[];
  loadState: LoadState;
  progress: ProgressState | null;

  loadQuestions: (force?: boolean) => Promise<void>;

  // Active test
  test: TestQuestion[] | null;
  currentIndex: number;
  startTest: (count: number) => void;
  goto: (i: number) => void;
  toggleAnswer: (questionIndex: number, answerId: string) => void;
  capHitSignal: number; // increments when selection cap blocks a pick (for shake)
  submitTest: () => void;
  grade: GradeSummary | null;
  elapsedMs: number;
}

interface ProgressState extends ParseProgress {
  parsedSoFar: number;
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState<View>("dashboard");
  const [sources] = useState<ScreenshotSource[]>(() => loadScreenshotSources());
  const [questions, setQuestions] = useState<ParsedQuestion[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [progress, setProgress] = useState<ProgressState | null>(null);

  const [test, setTest] = useState<TestQuestion[] | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [capHitSignal, setCapHitSignal] = useState(0);
  const [grade, setGrade] = useState<GradeSummary | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const startTimeRef = useRef(0);

  const loadQuestions = useCallback(
    async (force = false) => {
      if (loadState === "loading") return;
      const key = cacheKey(sources);

      if (!force) {
        try {
          const raw = localStorage.getItem(key);
          if (raw) {
            const cached = JSON.parse(raw) as ParsedQuestion[];
            setQuestions(cached);
            setLoadState("done");
            return;
          }
        } catch {
          /* ignore corrupt cache */
        }
      }

      setLoadState("loading");
      setProgress({ current: 0, total: sources.length, fileName: "", percent: 0, parsedSoFar: 0 });

      const parsed = await parseAllScreenshots(sources, (p) => {
        setProgress({ ...p, parsedSoFar: p.current });
      });

      setQuestions(parsed);
      setLoadState("done");
      try {
        localStorage.setItem(key, JSON.stringify(parsed));
      } catch {
        /* quota exceeded — caching is best-effort */
      }
    },
    [loadState, sources],
  );

  const startTest = useCallback(
    (count: number) => {
      const built = buildTest(questions, count);
      setTest(built);
      setCurrentIndex(0);
      setGrade(null);
      startTimeRef.current = Date.now();
      setView("test");
    },
    [questions],
  );

  const goto = useCallback((i: number) => setCurrentIndex(i), []);

  const toggleAnswer = useCallback((questionIndex: number, answerId: string) => {
    setTest((prev) => {
      if (!prev) return prev;
      const next = prev.map((tq, i) => {
        if (i !== questionIndex) return tq;
        const cap = tq.question.correctCount || 1;
        const has = tq.selected.includes(answerId);
        let selected: string[];
        if (has) {
          selected = tq.selected.filter((id) => id !== answerId);
        } else if (tq.selected.length < cap) {
          selected = [...tq.selected, answerId];
        } else if (cap === 1) {
          // Single-answer question: replace selection.
          selected = [answerId];
        } else {
          // At cap (multi): drop the oldest, add the new one, and signal a shake.
          setCapHitSignal((s) => s + 1);
          selected = [...tq.selected.slice(1), answerId];
        }
        return { ...tq, selected };
      });
      return next;
    });
  }, []);

  const submitTest = useCallback(() => {
    setTest((prev) => {
      if (!prev) return prev;
      setGrade(gradeTest(prev));
      setElapsedMs(Date.now() - startTimeRef.current);
      setView("results");
      return prev;
    });
  }, []);

  const value = useMemo<Store>(
    () => ({
      view,
      setView,
      sources,
      questions,
      loadState,
      progress,
      loadQuestions,
      test,
      currentIndex,
      startTest,
      goto,
      toggleAnswer,
      capHitSignal,
      submitTest,
      grade,
      elapsedMs,
    }),
    [
      view,
      sources,
      questions,
      loadState,
      progress,
      loadQuestions,
      test,
      currentIndex,
      startTest,
      goto,
      toggleAnswer,
      capHitSignal,
      submitTest,
      grade,
      elapsedMs,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}
