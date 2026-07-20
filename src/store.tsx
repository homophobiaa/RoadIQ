// Central app state via React context.
//
// Single source of truth for questions = raw parser output (`rawQuestions`) +
// the manual-correction map (`corrections`). The displayed `questions` are
// derived by re-applying corrections on top of raw output, so every edit is just
// a mutation of the correction map (which is persisted to localStorage).

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type {
  ParsedAnswer,
  ParsedQuestion,
  ParseProgress,
  ScreenshotSource,
  TestQuestion,
} from "./types";
import { loadScreenshotSources, parseAllScreenshots } from "./parser";
import { buildTest, gradeTest, isGradable, type GradeSummary } from "./lib/testEngine";
import {
  applyAll,
  clearCorrections,
  exportCorrections,
  importCorrections,
  loadCorrections,
  saveCorrections,
  type Correction,
  type CorrectionMap,
} from "./lib/corrections";

export type LoadState = "idle" | "loading" | "done";

// Central route paths (real URLs via react-router).
export const ROUTES = {
  dashboard: "/",
  test: "/test",
  results: "/results",
  review: "/review",
  debug: "/debug",
  cheatsheets: "/cheatsheets",
  speedLimits: "/cheatsheets/speed-limits",
  categories: "/cheatsheets/categories",
} as const;

const RAW_CACHE_PREFIX = "roadiq:rawcache:";
const cacheKey = (s: ScreenshotSource[]) =>
  RAW_CACHE_PREFIX + s.map((x) => x.fileName).sort().join("|");

let aid = 0;
const newAnswerId = () => `a_manual_${Date.now().toString(36)}_${aid++}`;

interface ProgressState extends ParseProgress {
  parsedSoFar: number;
}

interface Store {
  sources: ScreenshotSource[];
  questions: ParsedQuestion[]; // corrected/displayed
  loadState: LoadState;
  progress: ProgressState | null;
  loadQuestions: (force?: boolean) => Promise<void>;

  // ---- Correction editor API (all persist + recompute) ----
  editTitle: (file: string, title: string) => void;
  editAnswerText: (file: string, answerId: string, text: string) => void;
  toggleAnswerCorrect: (file: string, answerId: string) => void;
  addAnswer: (file: string) => void;
  deleteAnswer: (file: string, answerId: string) => void;
  setVerified: (file: string, v: boolean) => void;
  setExcluded: (file: string, v: boolean) => void;
  setSituationImage: (file: string, dataUrl: string | null) => void;
  resetQuestion: (file: string) => void;
  exportJSON: () => string;
  importJSON: (json: string) => void;
  clearAllCorrections: () => void;

  // ---- Shared study-category preference (localStorage) ----
  studyCategory: string;
  setStudyCategory: (c: string) => void;

  // ---- Test ----
  includeUnverified: boolean;
  setIncludeUnverified: (v: boolean) => void;
  test: TestQuestion[] | null;
  currentIndex: number;
  startTest: (count: number) => void;
  goto: (i: number) => void;
  toggleAnswer: (questionIndex: number, answerId: string) => void;
  capHitSignal: number;
  submitTest: () => void;
  grade: GradeSummary | null;
  elapsedMs: number;
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [sources] = useState<ScreenshotSource[]>(() => loadScreenshotSources());
  const [rawQuestions, setRawQuestions] = useState<ParsedQuestion[]>([]);
  const [corrections, setCorrections] = useState<CorrectionMap>(() => loadCorrections());
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [progress, setProgress] = useState<ProgressState | null>(null);

  // Shared "which licence am I studying for" preference — drives default quiz
  // scope on both the speed and category pages. Defaults to B.
  const [studyCategory, setStudyCategoryState] = useState<string>(
    () => localStorage.getItem("roadiq:studyCategory") || "B",
  );
  const setStudyCategory = useCallback((c: string) => {
    setStudyCategoryState(c);
    try {
      localStorage.setItem("roadiq:studyCategory", c);
    } catch {
      /* ignore */
    }
  }, []);

  // Default: prefer verified/corrected; only fall back to unverified when there
  // aren't enough (buildTest tops up automatically), or when the user opts in.
  const [includeUnverified, setIncludeUnverified] = useState(false);
  const [test, setTest] = useState<TestQuestion[] | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [capHitSignal, setCapHitSignal] = useState(0);
  const [grade, setGrade] = useState<GradeSummary | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const startTimeRef = useRef(0);

  // Displayed questions = parser output with corrections applied.
  const questions = useMemo(
    () => applyAll(rawQuestions, corrections),
    [rawQuestions, corrections],
  );

  const loadQuestions = useCallback(
    async (force = false) => {
      if (loadState === "loading") return;
      const key = cacheKey(sources);

      if (!force) {
        try {
          const cached = localStorage.getItem(key);
          if (cached) {
            setRawQuestions(JSON.parse(cached) as ParsedQuestion[]);
            setLoadState("done");
            return;
          }
        } catch {
          /* ignore */
        }
      }

      setLoadState("loading");
      setProgress({ current: 0, total: sources.length, fileName: "", percent: 0, parsedSoFar: 0 });
      const parsed = await parseAllScreenshots(sources, (p) =>
        setProgress({ ...p, parsedSoFar: p.current }),
      );
      setRawQuestions(parsed);
      setLoadState("done");
      try {
        localStorage.setItem(key, JSON.stringify(parsed));
      } catch {
        /* quota — best effort */
      }
    },
    [loadState, sources],
  );

  // ---- Correction mutations ----
  // Persist whenever corrections change.
  useEffect(() => {
    saveCorrections(corrections);
  }, [corrections]);

  /** Current effective answers for a file (correction snapshot or raw). */
  const effectiveAnswers = useCallback(
    (file: string, map: CorrectionMap): ParsedAnswer[] => {
      const corr = map[file];
      if (corr?.answers) return corr.answers;
      const raw = rawQuestions.find((q) => q.fileName === file);
      return raw ? raw.answers : [];
    },
    [rawQuestions],
  );

  const patch = useCallback(
    (file: string, fn: (base: Correction, map: CorrectionMap) => Correction) => {
      setCorrections((prev) => ({ ...prev, [file]: fn(prev[file] ?? {}, prev) }));
    },
    [],
  );

  const editTitle = useCallback(
    (file: string, title: string) => patch(file, (b) => ({ ...b, title, edited: true })),
    [patch],
  );
  const editAnswerText = useCallback(
    (file: string, answerId: string, text: string) =>
      patch(file, (b, map) => ({
        ...b,
        answers: effectiveAnswers(file, map).map((a) => (a.id === answerId ? { ...a, text } : a)),
        edited: true,
      })),
    [patch, effectiveAnswers],
  );
  const toggleAnswerCorrect = useCallback(
    (file: string, answerId: string) =>
      patch(file, (b, map) => ({
        ...b,
        answers: effectiveAnswers(file, map).map((a) =>
          a.id === answerId ? { ...a, correct: !a.correct } : a,
        ),
        edited: true,
      })),
    [patch, effectiveAnswers],
  );
  const addAnswer = useCallback(
    (file: string) =>
      patch(file, (b, map) => ({
        ...b,
        answers: [
          ...effectiveAnswers(file, map),
          { id: newAnswerId(), text: "Нов отговор", correct: false },
        ],
        edited: true,
      })),
    [patch, effectiveAnswers],
  );
  const deleteAnswer = useCallback(
    (file: string, answerId: string) =>
      patch(file, (b, map) => ({
        ...b,
        answers: effectiveAnswers(file, map).filter((a) => a.id !== answerId),
        edited: true,
      })),
    [patch, effectiveAnswers],
  );
  const setVerified = useCallback(
    (file: string, v: boolean) => patch(file, (b) => ({ ...b, verified: v })),
    [patch],
  );
  const setExcluded = useCallback(
    (file: string, v: boolean) => patch(file, (b) => ({ ...b, excluded: v })),
    [patch],
  );
  const setSituationImage = useCallback(
    (file: string, dataUrl: string | null) =>
      patch(file, (b) => ({ ...b, situationImageUrl: dataUrl, edited: true })),
    [patch],
  );
  const resetQuestion = useCallback((file: string) => {
    setCorrections((prev) => {
      const next = { ...prev };
      delete next[file];
      return next;
    });
  }, []);

  const exportJSON = useCallback(() => exportCorrections(), []);
  const importJSON = useCallback((json: string) => {
    setCorrections(importCorrections(json));
  }, []);
  const clearAllCorrections = useCallback(() => {
    clearCorrections();
    setCorrections({});
  }, []);

  // ---- Test ----
  const startTest = useCallback(
    (count: number) => {
      const built = buildTest(questions, count, { includeUnverified });
      setTest(built);
      setCurrentIndex(0);
      setGrade(null);
      startTimeRef.current = Date.now();
    },
    [questions, includeUnverified],
  );

  const goto = useCallback((i: number) => setCurrentIndex(i), []);

  const toggleAnswer = useCallback((questionIndex: number, answerId: string) => {
    setTest((prev) => {
      if (!prev) return prev;
      return prev.map((tq, i) => {
        if (i !== questionIndex) return tq;
        const cap = tq.question.correctCount || 1;
        const has = tq.selected.includes(answerId);
        let selected: string[];
        if (has) selected = tq.selected.filter((id) => id !== answerId);
        else if (tq.selected.length < cap) selected = [...tq.selected, answerId];
        else if (cap === 1) selected = [answerId];
        else {
          setCapHitSignal((s) => s + 1);
          selected = [...tq.selected.slice(1), answerId];
        }
        return { ...tq, selected };
      });
    });
  }, []);

  const submitTest = useCallback(() => {
    setTest((prev) => {
      if (!prev) return prev;
      setGrade(gradeTest(prev));
      setElapsedMs(Date.now() - startTimeRef.current);
      return prev;
    });
  }, []);

  const value = useMemo<Store>(
    () => ({
      sources,
      questions,
      loadState,
      progress,
      loadQuestions,
      editTitle,
      editAnswerText,
      toggleAnswerCorrect,
      addAnswer,
      deleteAnswer,
      setVerified,
      setExcluded,
      setSituationImage,
      resetQuestion,
      exportJSON,
      importJSON,
      clearAllCorrections,
      studyCategory,
      setStudyCategory,
      includeUnverified,
      setIncludeUnverified,
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
      sources,
      questions,
      loadState,
      progress,
      loadQuestions,
      editTitle,
      editAnswerText,
      toggleAnswerCorrect,
      addAnswer,
      deleteAnswer,
      setVerified,
      setExcluded,
      setSituationImage,
      resetQuestion,
      exportJSON,
      importJSON,
      clearAllCorrections,
      studyCategory,
      setStudyCategory,
      includeUnverified,
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

/** Derived counts for the dashboard. */
export function questionCounts(questions: ParsedQuestion[]) {
  return {
    total: questions.length,
    parsed: questions.filter((q) => !q.excluded).length,
    usable: questions.filter(isGradable).length,
    verified: questions.filter((q) => q.verified && !q.excluded).length,
    corrected: questions.filter((q) => q.corrected && !q.verified && !q.excluded).length,
    // Need review: usable, not verified, and weak (low confidence or warnings).
    needsReview: questions.filter(
      (q) =>
        !q.excluded &&
        !q.verified &&
        (q.parseConfidence === "low" || q.parseWarnings.length > 0 || q.correctCount === 0),
    ).length,
    low: questions.filter((q) => q.parseConfidence === "low" && !q.excluded).length,
    excluded: questions.filter((q) => q.excluded).length,
    manualCrops: questions.filter((q) => q.manualCrop && !q.excluded).length,
  };
}
