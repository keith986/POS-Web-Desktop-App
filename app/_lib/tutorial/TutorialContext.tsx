"use client";

import React, { createContext, useContext, useState, useCallback, useRef } from "react";

export interface TutorialStep {
  /* Matches a data-tutorial="..." attribute on the element to spotlight.
     If omitted, the step shows as a centered intro/outro card with no spotlight. */
  target?:  string;
  title:    string;
  body:     string;
  /* A short concrete example, shown in a distinct "Example" block. */
  example?: string;
}

interface TutorialContextValue {
  isOpen:     boolean;
  stepIndex:  number;
  steps:      TutorialStep[];
  pageLabel:  string;
  registerTour: (pageKey: string, pageLabel: string, steps: TutorialStep[]) => void;
  start:      () => void;
  next:       () => void;
  back:       () => void;
  close:      () => void;
  hasTour:    boolean;
}

const TutorialContext = createContext<TutorialContextValue | null>(null);

export function TutorialProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen]       = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [steps, setSteps]         = useState<TutorialStep[]>([]);
  const [pageLabel, setPageLabel] = useState("this page");
  const currentPageKey = useRef<string | null>(null);

  /* Called by the page itself (via useTutorialSteps) so the button in the
     header always knows the right steps for whatever page is mounted. */
  const registerTour = useCallback((pageKey: string, label: string, newSteps: TutorialStep[]) => {
    if (currentPageKey.current === pageKey) return;
    currentPageKey.current = pageKey;
    setSteps(newSteps);
    setPageLabel(label);
    setStepIndex(0);
    setIsOpen(false);
  }, []);

  const start = useCallback(() => { setStepIndex(0); setIsOpen(true); }, []);
  const close = useCallback(() => setIsOpen(false), []);
  const next  = useCallback(() => setStepIndex(i => Math.min(i + 1, steps.length - 1)), [steps.length]);
  const back  = useCallback(() => setStepIndex(i => Math.max(i - 1, 0)), []);

  return (
    <TutorialContext.Provider value={{
      isOpen, stepIndex, steps, pageLabel, registerTour, start, next, back, close,
      hasTour: steps.length > 0,
    }}>
      {children}
    </TutorialContext.Provider>
  );
}

export function useTutorial(): TutorialContextValue {
  const ctx = useContext(TutorialContext);
  if (!ctx) throw new Error("useTutorial must be used inside TutorialProvider");
  return ctx;
}

/* Convenience hook a page calls once with its own step list. `deps` lets a
   page re-register if its steps depend on loaded data — usually just []. */
export function useTutorialSteps(pageKey: string, pageLabel: string, steps: TutorialStep[]) {
  const { registerTour } = useTutorial();
  React.useEffect(() => {
    registerTour(pageKey, pageLabel, steps);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageKey]);
}
