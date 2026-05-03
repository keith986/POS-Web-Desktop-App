import { useState, useEffect } from "react";
import type { PlanId } from "./pricing";

/**
 * Fetches the user's active plan from the server on mount.
 * While loading, returns whatever plan is stored in localStorage
 * so the sidebar renders immediately without waiting for the fetch.
 * Once the server responds, updates both state and localStorage.
 *
 * Usage:
 *   const userPlan = usePlan(user?.id);
 */
export function usePlan(userId: string | undefined): PlanId {
  /* Seed from localStorage for instant first render */
  function getStoredPlan(): PlanId {
    if (typeof window === "undefined") return "starter";
    try {
      const user = JSON.parse(localStorage.getItem("user") ?? "null");
      return (user?.plan as PlanId) ?? "starter";
    } catch {
      return "starter";
    }
  }

  const [plan, setPlan] = useState<PlanId>(getStoredPlan);

  useEffect(() => {
    if (!userId) return;

    let cancelled = false;

    fetch(`/api/user/plan?user_id=${userId}`)
      .then(r => r.json())
      .then(data => {
        if (cancelled) return;
        const fetchedPlan = (data.plan as PlanId) ?? "starter";
        setPlan(fetchedPlan);

        /* Keep localStorage in sync so next render is instant */
        try {
          const stored = localStorage.getItem("user");
          if (stored) {
            const user = JSON.parse(stored);
            localStorage.setItem("user", JSON.stringify({ ...user, plan: fetchedPlan }));
          }
        } catch { /* silent */ }
      })
      .catch(() => { /* network error — keep localStorage value */ });

    return () => { cancelled = true; };
  }, [userId]);

  return plan;
}