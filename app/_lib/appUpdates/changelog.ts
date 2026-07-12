/**
 * changelog.ts
 * ─────────────────────────────────────────────────────────────
 * Single source of truth for "what changed" across BOTH the admin
 * console and the staff dashboard. They share one Next.js build and
 * one service worker (see /public/sw.js), so a deploy freezes/unfreezes
 * both sides together — one changelog keeps that honest.
 *
 * HOW TO USE:
 * Every time you ship a change (new feature, removed feature, fix,
 * etc.), add ONE new entry to the TOP of CHANGELOG below and bump the
 * version number. That's it — the update modal, the header "Update
 * available" pill, and the ignore/seen tracking all key off this file
 * automatically. Nothing else needs to change.
 *
 * Version format: simple semver-ish "MAJOR.MINOR.PATCH", compared
 * numerically (so "1.10.0" > "1.9.0").
 *
 * Note on "critical": this is a *content* flag — it describes this
 * particular change. It's combined with the server-side critical
 * switch (POST /api/system/version { action: "set_critical" }, admin
 * console only) at runtime: an update is treated as critical if
 * EITHER says so. Use the changelog flag for "this fix can't wait";
 * use the server switch for "something is on fire right now and I
 * need to force it on everyone regardless of what's in the changelog".
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
  /** Why it matters to the person using the dashboard. */
  importance: string;
  /**
   * Mark true for fixes that can't safely wait for someone to click
   * "Update" — e.g. a payment bug, a security patch, a data integrity
   * issue. Critical entries still show the modal (so people know what
   * happened and why), but the "Ignore" option is hidden and the
   * update applies itself automatically after a short countdown.
   * Leave false/omitted for normal features, improvements, and fixes.
   */
  critical?: boolean;
}

/**
 * Newest entry first. CURRENT_VERSION is derived from CHANGELOG[0],
 * so you never need to update a version constant separately.
 */
export const CHANGELOG: ChangelogEntry[] = [
  {
    version: "1.9.0",
    date: "2026-07-12",
    type: "feature",
    title: "Update notifications now available on the admin console too",
    description:
      "Admin now gets the same 'what's new' modal staff already had, and your Update Now / Ignore choice is saved to your account — it stays remembered even if you log out, refresh, or clear your cookies.",
    importance:
      "You'll never lose track of a pending update, and critical fixes are guaranteed to reach everyone within 30 seconds.",
    critical: false,
  },
  {
    version: "1.8.0",
    date: "2026-07-12",
    type: "feature",
    title: "Photo for products are now visible in the product list",
    description:
      "Staff can now see product photos directly in the product list, making it easier to identify items at a glance.",
    importance:
      "Enhances the user experience by providing visual cues for products, reducing errors in product selection.",
    critical: false,
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
  //
  // Example of a CRITICAL entry — applies itself automatically:
  // {
  //   version: "1.2.1",
  //   date: "2026-08-02",
  //   type: "fix",
  //   title: "Fixed incorrect M-Pesa change calculation",
  //   description:
  //     "Cash change due was being calculated with the wrong rounding on amounts over KES 5,000.",
  //   importance:
  //     "Affects money handed back to customers — everyone needs this applied right away.",
  //   critical: true,
  // },
];

export const CURRENT_VERSION = CHANGELOG[0]?.version ?? "1.0.0";
