/**
 * changelog.ts
 * ─────────────────────────────────────────────────────────────
 * Single source of truth for "what changed" on the staff dashboard.
 *
 * HOW TO USE:
 * Every time you ship a change to the staff app (new feature, removed
 * feature, fix, etc.), add ONE new entry to the TOP of CHANGELOG below
 * and bump the version number. That's it — the update modal, the
 * header "Update available" pill, and the ignore/seen tracking all
 * key off this file automatically. Nothing else needs to change.
 *
 * Version format: simple semver-ish "MAJOR.MINOR.PATCH", compared
 * numerically (so "1.10.0" > "1.9.0").
 */

export type ChangeType = "feature" | "improvement" | "fix" | "removed";

export interface ChangelogEntry {
  /** Version this entry shipped in. Must be unique + increasing. */
  version: string;
  /** ISO date, e.g. "2026-07-05" */
  date: string;
  type: ChangeType;
  /** Short, plain-language title — what changed. */
  title: string;
  /** 1–2 sentences describing the change itself. */
  description: string;
  /** Why it matters to the staff member using the dashboard. */
  importance: string;
}

/**
 * Newest entry first. CURRENT_VERSION is derived from CHANGELOG[0],
 * so you never need to update a version constant separately.
 */
export const CHANGELOG: ChangelogEntry[] = [
  {
    version: "1.1.0",
    date: "2026-07-05",
    type: "feature",
    title: "Update notifications",
    description:
      "The dashboard now tells you when new features or changes are available instead of updating silently in the background.",
    importance:
      "You'll never be confused by something that changed without warning. You decide when to refresh.",
  },
  // Example of a future entry — copy this shape when you ship something new:
  // {
  //   version: "1.2.0",
  //   date: "2026-08-01",
  //   type: "removed",
  //   title: "Manual discount entry removed from Record Sale",
  //   description:
  //     "Staff can no longer type a custom discount amount at checkout; only admin-configured discount codes can be applied.",
  //   importance:
  //     "Prevents unauthorized discounts at the till — all discounts are now tracked centrally by the admin.",
  // },
];

export const CURRENT_VERSION = CHANGELOG[0]?.version ?? "1.0.0";