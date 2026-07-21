export type PosType = "retail" | "restaurant" | "salon" | "wholesale" | "pharmacy" | "laundry";

/*
  `key` is the STABLE identifier passed to setActiveTab / used in render
  switches — it never changes per vertical, so existing "Record Sale" /
  "Products" tab content keeps working untouched.
  `label` is what the vertical actually sees in the sidebar/header.
  `isNew` tabs are additive — they didn't exist before this change and are
  rendered via <SimpleListTab mode=.../>.
*/
export interface StaffNavItem {
  key:    string;
  label:  string;
  icon:   string;
  isNew?: boolean;
  /* SimpleListTab mode this tab renders, when isNew is true */
  listMode?: "tables" | "appointments" | "prescriptions" | "suppliers";
}

const DASH: StaffNavItem = { key: "Dashboard",     label: "Dashboard",     icon: "grid"    };
const HIST: StaffNavItem = { key: "Sales History", label: "Sales History", icon: "history" };
const SUPP: StaffNavItem = { key: "Support",       label: "Support",       icon: "chat"    };
const SETT: StaffNavItem = { key: "Settings",      label: "Settings",      icon: "settings"};

export const STAFF_NAV_CONFIG: Record<PosType, StaffNavItem[]> = {
  retail: [
    DASH,
    { key: "Record Sale", label: "Record Sale", icon: "sale" },
    { key: "Products",    label: "Products",    icon: "box"  },
    HIST, SUPP, SETT,
  ],
  restaurant: [
    DASH,
    { key: "Record Sale", label: "New Order", icon: "sale" },
    { key: "Products",    label: "Menu",       icon: "box"  },
    { key: "Tables",      label: "Tables",     icon: "utensils", isNew: true, listMode: "tables" },
    HIST, SUPP, SETT,
  ],
  salon: [
    DASH,
    { key: "Record Sale",  label: "Book & Sell",  icon: "sale"     },
    { key: "Products",     label: "Services",     icon: "scissors" },
    { key: "Appointments", label: "Appointments", icon: "calendar", isNew: true, listMode: "appointments" },
    HIST, SUPP, SETT,
  ],
  wholesale: [
    DASH,
    { key: "Record Sale", label: "Record Sale", icon: "sale" },
    { key: "Products",    label: "Products",    icon: "box"  },
    { key: "Suppliers",   label: "Suppliers",   icon: "truck", isNew: true, listMode: "suppliers" },
    HIST, SUPP, SETT,
  ],
  pharmacy: [
    DASH,
    { key: "Record Sale",    label: "Record Sale",   icon: "sale" },
    { key: "Products",       label: "Drugs",          icon: "pill" },
    { key: "Prescriptions",  label: "Prescriptions",  icon: "flask", isNew: true, listMode: "prescriptions" },
    HIST, SUPP, SETT,
  ],
  laundry: [
    DASH,
    { key: "Record Sale",        label: "New Order",          icon: "sale"   },
    { key: "Products",           label: "Products",           icon: "box"    },
    { key: "Pickup & Delivery",  label: "Pickup & Delivery",  icon: "washer", isNew: true, listMode: "appointments" },
    HIST, SUPP, SETT,
  ],
};

export function getStaffNav(posType?: PosType | null): StaffNavItem[] {
  return STAFF_NAV_CONFIG[posType ?? "retail"] ?? STAFF_NAV_CONFIG.retail;
}
