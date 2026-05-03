export type PlanId  = "starter" | "pro" | "enterprise";
export type PosType = "retail" | "restaurant" | "salon" | "wholesale" | "pharmacy";

export interface Plan {
  id:          PlanId;
  name:        string;
  description: string;
  features:    string[];
  highlight:   boolean;
  badge?:      string;
}

export interface PosPrice {
  posType: PosType;
  label:   string;
  prices:  Record<PlanId, number>;
}

// ─────────────────────────────────────────
// PLANS
// ─────────────────────────────────────────
export const PLANS: Plan[] = [
  {
    id:          "starter",
    name:        "Starter",
    description: "Perfect for small businesses just getting started.",
    highlight:   false,
    features: [
      "Up to 2 staff accounts",
      "500 products",
      "Overview & Orders",
      "Products, Menu & Services",
      "Suppliers & Price Tiers",
      "Prescriptions & Drugs",
      "Email support",
    ],
  },
  {
    id:          "pro",
    name:        "Pro",
    description: "For growing businesses that need more power.",
    highlight:   true,
    badge:       "Most Popular",
    features: [
      "Everything in Starter",
      "Up to 10 staff accounts",
      "Unlimited products",
      "Inventory management",
      "Advanced analytics",
      "Tables & Appointments",
      "Priority support",
    ],
  },
  {
    id:          "enterprise",
    name:        "Enterprise",
    description: "For large businesses with advanced needs.",
    highlight:   false,
    features: [
      "Everything in Pro",
      "Unlimited staff accounts",
      "Full analytics suite",
      "Customers / Patients management",
      "24/7 dedicated support",
      "Custom integrations",
      "SLA guarantee",
    ],
  },
];

// ─────────────────────────────────────────
// PRICING
// ─────────────────────────────────────────
export const POS_PRICES: PosPrice[] = [
  {
    posType: "retail",
    label:   "Retail Store",
    prices:  { starter: 999, pro: 1999, enterprise: 3999 },
  },
  {
    posType: "restaurant",
    label:   "Restaurant / Food",
    prices:  { starter: 1299, pro: 2499, enterprise: 4999 },
  },
  {
    posType: "salon",
    label:   "Salon / Service",
    prices:  { starter: 999, pro: 1999, enterprise: 3999 },
  },
  {
    posType: "wholesale",
    label:   "Wholesale",
    prices:  { starter: 1499, pro: 2999, enterprise: 5999 },
  },
  {
    posType: "pharmacy",
    label:   "Pharmacy / Medicine",
    prices:  { starter: 1299, pro: 2499, enterprise: 4999 },
  },
];

export function getPrice(posType: PosType, plan: PlanId): number {
  const pos = POS_PRICES.find(p => p.posType === posType);
  return pos?.prices[plan] ?? 999;
}

// ─────────────────────────────────────────
// PLAN ORDER  (used for comparisons)
// ─────────────────────────────────────────
export const PLAN_ORDER: PlanId[] = ["starter", "pro", "enterprise"];

// ─────────────────────────────────────────
// ROUTE ACCESS GATES
//
// Only routes listed here are restricted.
// Any route NOT listed is accessible on ALL plans.
//
// Starter  → Overview, Orders, all Store section,
//            Products, Menu, Services, Suppliers,
//            Price Tiers, Prescriptions, Drugs
// Pro      → + Inventory, Analytics, Tables, Appointments
// Enterprise → + Customers / Patients
// ─────────────────────────────────────────
export const ROUTE_MIN_PLAN: Record<string, PlanId> = {
  // ── Requires Pro ──
  "/admin/inventory":    "pro",
  "/admin/analytics":    "pro",
  "/admin/tables":       "pro",   // restaurant: floor / table management
  "/admin/appointments": "pro",   // salon: appointment calendar

  // ── Requires Enterprise ──
  "/admin/customers":    "enterprise",
  "/admin/patients":     "enterprise", // pharmacy alias for customers
};

// ─────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────

/** Returns true when the given plan cannot access this route. */
export function isRouteLocked(href: string, plan: PlanId = "starter"): boolean {
  const minPlan = ROUTE_MIN_PLAN[href];
  if (!minPlan) return false;
  return PLAN_ORDER.indexOf(plan) < PLAN_ORDER.indexOf(minPlan);
}

/** Returns the minimum plan required for a route, or null if unrestricted. */
export function requiredPlan(href: string): PlanId | null {
  return ROUTE_MIN_PLAN[href] ?? null;
}

/** Human-readable plan label. */
export function planLabel(plan: PlanId): string {
  return plan.charAt(0).toUpperCase() + plan.slice(1);
}