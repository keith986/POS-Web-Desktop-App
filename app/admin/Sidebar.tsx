"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import {
  isRouteLocked,
  requiredPlan,
  planLabel,
} from "@/app/_lib/pricing";

import { usePlan } from "@/app/_lib/usePlan";

import type {
  PlanId,
  PosType,
} from "@/app/_lib/pricing";

/* ─────────────────────────────────────────
   ICONS
───────────────────────────────────────── */

const iconPaths: Record<string, string> = {
  grid:
    "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z",

  cart:
    "M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18",

  box:
    "M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8",

  users:
    "M17 21v-2a4 4 0 00-4-4H5",

  chart:
    "M18 20V10M12 20V4M6 20v-6",

  tag:
    "M20.59 13.41l-7.17 7.17",

  scissors:
    "M6 9a3 3 0 100-6",

  utensils:
    "M3 2v7c0 1.1.9 2 2 2h4",

  package:
    "M21 16V8a2 2 0 00-1-1.73",

  pill:
    "M10.5 4.5a6 6 0 000 12h3",

  switch:
    "M7 16V4m0 0L3 8m4-4l4 4",

  logout:
    "M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9",

  lock:
    "M19 11H5a2 2 0 00-2 2",
};

function Icon({
  type,
}: {
  type: string;
}) {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0 }}
    >
      <path
        d={
          iconPaths[type] ??
          iconPaths.grid
        }
      />
    </svg>
  );
}

/* ─────────────────────────────────────────
   TYPES
───────────────────────────────────────── */

interface User {
  id: string;

  full_name: string;

  role: string;

  store_name: string | null;

  pos_type?: PosType;

  selected_pos_types?: PosType[];

  pos_selection_locked?: boolean;

  subscription_end?: string | null;
}

type NavItem = {
  href: string;
  icon: string;
  label: string;
};

type NavSection = {
  title: string;
  items: NavItem[];
};

/* ─────────────────────────────────────────
   HELPERS
───────────────────────────────────────── */

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function checkSubscriptionExpired(
  user: User | null
) {
  if (!user) return false;

  if (!user.subscription_end)
    return false;

  return (
    new Date(user.subscription_end) <
    new Date()
  );
}

/* ─────────────────────────────────────────
   NAV
───────────────────────────────────────── */

const BASE_MAIN: NavItem[] = [
  {
    href: "/admin/dashboard",
    icon: "grid",
    label: "Overview",
  },

  {
    href: "/admin/orders",
    icon: "cart",
    label: "Orders",
  },

  {
    href: "/admin/inventory",
    icon: "box",
    label: "Inventory",
  },

  {
    href: "/admin/customers",
    icon: "users",
    label: "Customers",
  },

  {
    href: "/admin/analytics",
    icon: "chart",
    label: "Analytics",
  },
];

const NAV_CONFIG: Record<
  PosType,
  NavSection[]
> = {
  retail: [
    {
      title: "Main",
      items: BASE_MAIN,
    },
  ],

  restaurant: [
    {
      title: "Restaurant",
      items: [
        ...BASE_MAIN,

        {
          href: "/admin/tables",
          icon: "utensils",
          label: "Tables",
        },
      ],
    },
  ],

  salon: [
    {
      title: "Salon",
      items: [
        ...BASE_MAIN,

        {
          href: "/admin/services",
          icon: "scissors",
          label: "Services",
        },
      ],
    },
  ],

  wholesale: [
    {
      title: "Wholesale",
      items: [
        ...BASE_MAIN,

        {
          href: "/admin/suppliers",
          icon: "package",
          label: "Suppliers",
        },
      ],
    },
  ],

  pharmacy: [
    {
      title: "Pharmacy",
      items: [
        ...BASE_MAIN,

        {
          href:
            "/admin/prescriptions",

          icon: "pill",

          label: "Prescriptions",
        },
      ],
    },
  ],
};

/* ─────────────────────────────────────────
   POS META
───────────────────────────────────────── */

const POS_TYPES_META = [
  {
    id: "retail",
    label: "Retail",

    svgIcon: "tag",

    accent: "#2563eb",

    desc: "Inventory & products",
  },

  {
    id: "restaurant",

    label: "Restaurant",

    svgIcon: "utensils",

    accent: "#d97706",

    desc: "Tables & kitchen",
  },

  {
    id: "salon",

    label: "Salon",

    svgIcon: "scissors",

    accent: "#7c3aed",

    desc: "Appointments",
  },

  {
    id: "wholesale",

    label: "Wholesale",

    svgIcon: "package",

    accent: "#16a34a",

    desc: "Suppliers",
  },

  {
    id: "pharmacy",

    label: "Pharmacy",

    svgIcon: "pill",

    accent: "#0891b2",

    desc: "Drugs",
  },
] as const;

/* ─────────────────────────────────────────
   MODAL
───────────────────────────────────────── */

function SwitcherModal({
  current,
  plan,
  user,
  onClose,
  onSwitch,
}: {
  current: PosType;

  plan: PlanId;

  user: User;

  onClose: () => void;

  onSwitch: (
    type: PosType
  ) => void;
}) {
  const selectedTypes =
    user.selected_pos_types ||
    [current];

  const selectionLocked =
    user.pos_selection_locked ||
    false;

  function isPosLocked(
    posId: PosType
  ) {
    if (plan === "enterprise")
      return false;

    if (
      selectedTypes.includes(posId)
    )
      return false;

    if (plan === "starter")
      return true;

    if (
      plan === "pro" &&
      selectionLocked
    )
      return true;

    return false;
  }

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background:
            "rgba(0,0,0,0.6)",
          zIndex: 2000,
        }}
      />

      <div
        style={{
          position: "fixed",

          top: "50%",

          left: "50%",

          transform:
            "translate(-50%, -50%)",

          width: "100%",

          maxWidth: 420,

          background: "#1a1a14",

          border:
            "1px solid rgba(255,255,255,0.08)",

          borderRadius: 16,

          padding: "1.5rem",

          zIndex: 2001,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent:
              "space-between",
            alignItems: "center",
            marginBottom: "1rem",
          }}
        >
          <div>
            <div
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: "#fff",
              }}
            >
              Switch POS Type
            </div>

            <div
              style={{
                fontSize: 11,
                color:
                  "rgba(255,255,255,0.4)",
                marginTop: 4,
              }}
            >
              Select your POS type
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background:
                "rgba(255,255,255,0.08)",
              border: "none",
              width: 30,
              height: 30,
              borderRadius: 8,
              color:
                "rgba(255,255,255,0.7)",
              cursor: "pointer",
            }}
          >
            ×
          </button>
        </div>

        {plan === "pro" && (
          <div
            style={{
              marginBottom: 14,

              padding: 10,

              borderRadius: 10,

              background:
                "rgba(234,179,8,0.1)",

              border:
                "1px solid rgba(234,179,8,0.25)",

              color: "#facc15",

              fontSize: 11,

              lineHeight: 1.5,
            }}
          >
            Pro plans can only
            permanently add ONE
            additional POS type.
          </div>
        )}

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          {POS_TYPES_META.map(
            (type) => {
              const isCurrent =
                type.id === current;

              const owned =
                selectedTypes.includes(
                  type.id as PosType
                );

              const locked =
                isPosLocked(
                  type.id as PosType
                );

              return (
                <button
                  key={type.id}
                  onClick={() => {
                    if (locked)
                      return;

                    if (!isCurrent) {
                      const confirmed =
                        window.confirm(
                          plan === "pro"
                            ? "This selection is permanent and cannot be changed later."
                            : "Switch POS type?"
                        );

                      if (
                        confirmed
                      ) {
                        onSwitch(
                          type.id as PosType
                        );
                      }
                    }
                  }}
                  style={{
                    width: "100%",

                    display: "flex",

                    alignItems:
                      "center",

                    gap: 12,

                    padding:
                      "0.9rem 1rem",

                    borderRadius: 12,

                    border: `1px solid ${
                      isCurrent
                        ? type.accent
                        : "rgba(255,255,255,0.08)"
                    }`,

                    background:
                      isCurrent
                        ? `${type.accent}22`
                        : "rgba(255,255,255,0.03)",

                    cursor: locked
                      ? "not-allowed"
                      : "pointer",

                    opacity: locked
                      ? 0.5
                      : 1,
                  }}
                >
                  <div
                    style={{
                      width: 40,

                      height: 40,

                      borderRadius: 10,

                      background:
                        `${type.accent}22`,

                      display: "flex",

                      alignItems:
                        "center",

                      justifyContent:
                        "center",

                      color:
                        type.accent,

                      flexShrink: 0,
                    }}
                  >
                    <Icon
                      type={
                        locked
                          ? "lock"
                          : type.svgIcon
                      }
                    />
                  </div>

                  <div
                    style={{
                      flex: 1,
                      textAlign:
                        "left",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color:
                          "#fff",
                      }}
                    >
                      {type.label}
                    </div>

                    <div
                      style={{
                        fontSize: 11,
                        color:
                          "rgba(255,255,255,0.45)",
                        marginTop: 2,
                      }}
                    >
                      {type.desc}
                    </div>
                  </div>

                  {isCurrent && (
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color:
                          type.accent,
                      }}
                    >
                      ACTIVE
                    </span>
                  )}

                  {!isCurrent &&
                    owned && (
                      <span
                        style={{
                          fontSize: 10,
                          color:
                            "#22c55e",
                          fontWeight: 700,
                        }}
                      >
                        OWNED
                      </span>
                    )}

                  {plan ===
                    "pro" &&
                    selectionLocked &&
                    !owned && (
                      <span
                        style={{
                          fontSize: 10,
                          color:
                            "#ef4444",
                          fontWeight: 700,
                        }}
                      >
                        LOCKED
                      </span>
                    )}
                </button>
              );
            }
          )}
        </div>
      </div>
    </>
  );
}

/* ─────────────────────────────────────────
   SIDEBAR
───────────────────────────────────────── */

export default function Sidebar() {
  const pathname =
    usePathname() ||
    "/admin/dashboard";

  const router = useRouter();

  const [user, setUser] =
    useState<User | null>(null);

  const [
    switcherOpen,
    setSwitcherOpen,
  ] = useState(false);

  const [
    switching,
    setSwitching,
  ] = useState(false);

  const [
    logoutConfirm,
    setLogoutConfirm,
  ] = useState(false);

  useEffect(() => {
    const stored =
      localStorage.getItem(
        "user"
      );

    if (!stored) return;

    try {
      setUser(JSON.parse(stored));
    } catch {}
  }, []);

  const userPlan =
    usePlan(user?.id);

  const subscriptionExpired =
    checkSubscriptionExpired(
      user
    );

  const handleSwitch =
    async (
      newType: PosType
    ) => {
      if (!user) return;

      setSwitching(true);

      try {
        const existing =
          user.selected_pos_types ||
          [user.pos_type!];

        const updatedTypes = [
          ...existing,
        ];

        if (
          !updatedTypes.includes(
            newType
          )
        ) {
          updatedTypes.push(
            newType
          );
        }

        const lockSelection =
          userPlan === "pro" &&
          updatedTypes.length >=
            2;

        const payload = {
          admin_id: user.id,

          pos_type: newType,

          selected_pos_types:
            updatedTypes,

          pos_selection_locked:
            lockSelection,
        };

        const res =
          await fetch(
            "/api/onboarding",
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify(
                payload
              ),
            }
          );

        if (!res.ok) {
          throw new Error(
            "Failed"
          );
        }

        const updatedUser = {
          ...user,

          pos_type: newType,

          selected_pos_types:
            updatedTypes,

          pos_selection_locked:
            lockSelection,
        };

        localStorage.setItem(
          "user",
          JSON.stringify(
            updatedUser
          )
        );

        setUser(updatedUser);

        setSwitcherOpen(false);

        router.push(
          "/admin/dashboard"
        );
      } finally {
        setSwitching(false);
      }
    };

  const doLogout = () => {
    localStorage.removeItem(
      "user"
    );

    localStorage.removeItem(
      "read_notifs"
    );

    window.location.href =
      "https://pos.upendoapps.com?logout=true";
  };

  if (!user) return null;

  const posType =
    user.pos_type || "retail";

  const sections =
    NAV_CONFIG[posType] ||
    NAV_CONFIG.retail;

  return (
    <>
      {switcherOpen && (
        <SwitcherModal
          current={posType}
          user={user}
          plan={userPlan}
          onClose={() =>
            setSwitcherOpen(
              false
            )
          }
          onSwitch={
            handleSwitch
          }
        />
      )}

      {logoutConfirm && (
        <>
          <div
            onClick={() =>
              setLogoutConfirm(
                false
              )
            }
            style={{
              position: "fixed",
              inset: 0,
              background:
                "rgba(0,0,0,0.6)",
              zIndex: 2000,
            }}
          />

          <div
            style={{
              position:
                "fixed",

              top: "50%",

              left: "50%",

              transform:
                "translate(-50%,-50%)",

              width: "100%",

              maxWidth: 340,

              background:
                "#1a1a14",

              border:
                "1px solid rgba(255,255,255,0.1)",

              borderRadius: 16,

              padding:
                "1.5rem",

              zIndex: 2001,
            }}
          >
            <div
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: "#fff",
                marginBottom: 8,
              }}
            >
              Sign out?
            </div>

            <div
              style={{
                fontSize: 13,
                color:
                  "rgba(255,255,255,0.45)",
                marginBottom:
                  "1.4rem",
              }}
            >
              You will be
              returned to the
              login screen.
            </div>

            <div
              style={{
                display: "flex",
                gap: 8,
              }}
            >
              <button
                onClick={() =>
                  setLogoutConfirm(
                    false
                  )
                }
                style={{
                  flex: 1,
                  padding:
                    "0.8rem",
                  borderRadius: 10,
                  border:
                    "1px solid rgba(255,255,255,0.08)",
                  background:
                    "rgba(255,255,255,0.04)",
                  color:
                    "#fff",
                  cursor:
                    "pointer",
                }}
              >
                Cancel
              </button>

              <button
                onClick={
                  doLogout
                }
                style={{
                  flex: 1,
                  padding:
                    "0.8rem",
                  borderRadius: 10,
                  border:
                    "none",
                  background:
                    "#dc2626",
                  color:
                    "#fff",
                  cursor:
                    "pointer",
                }}
              >
                Sign out
              </button>
            </div>
          </div>
        </>
      )}

      <aside
        className="sidebar"
        style={{
          width: 270,

          minHeight: "100vh",

          background:
            "#11110d",

          borderRight:
            "1px solid rgba(255,255,255,0.06)",

          display: "flex",

          flexDirection:
            "column",

          padding:
            "1rem 0",
        }}
      >
        {/* HEADER */}
        <div
          onClick={() =>
            setSwitcherOpen(true)
          }
          style={{
            padding:
              "0 1rem",

            marginBottom:
              "1rem",

            cursor: "pointer",
          }}
        >
          <div
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: "#fff",
            }}
          >
            {user.store_name ||
              "POS"}
          </div>

          <div
            style={{
              fontSize: 11,
              color:
                "rgba(255,255,255,0.4)",
              marginTop: 4,
            }}
          >
            {posType.toUpperCase()}
          </div>
        </div>

        {/* PLAN */}
        <div
          style={{
            padding:
              "0 1rem",
            marginBottom:
              "1rem",
          }}
        >
          <div
            style={{
              display:
                "inline-flex",

              alignItems:
                "center",

              gap: 6,

              padding:
                "6px 12px",

              borderRadius: 999,

              background:
                "rgba(37,99,235,0.15)",

              border:
                "1px solid rgba(37,99,235,0.3)",

              color:
                "#60a5fa",

              fontSize: 11,

              fontWeight: 700,
            }}
          >
            {planLabel(
              userPlan
            )}{" "}
            PLAN
          </div>
        </div>

        {/* NAV */}
        <div
          style={{
            flex: 1,
          }}
        >
          {sections.map(
            (section) => (
              <div
                key={
                  section.title
                }
                style={{
                  marginBottom:
                    "1rem",
                }}
              >
                <div
                  style={{
                    padding:
                      "0 1rem",

                    marginBottom:
                      8,

                    fontSize: 11,

                    color:
                      "rgba(255,255,255,0.3)",

                    textTransform:
                      "uppercase",
                  }}
                >
                  {
                    section.title
                  }
                </div>

                <div
                  style={{
                    display:
                      "flex",

                    flexDirection:
                      "column",

                    gap: 4,
                  }}
                >
                  {section.items.map(
                    (
                      item
                    ) => {
                      const active =
                        pathname.startsWith(
                          item.href
                        );

                      const locked =
                        isRouteLocked(
                          item.href,
                          userPlan
                        );

                      const reqPlan =
                        requiredPlan(
                          item.href
                        );

                      return (
                        <Link
                          key={
                            item.href
                          }
                          href={
                            locked
                              ? "/admin/subscription"
                              : item.href
                          }
                          style={{
                            display:
                              "flex",

                            alignItems:
                              "center",

                            gap: 10,

                            margin:
                              "0 0.7rem",

                            padding:
                              "0.8rem 0.9rem",

                            borderRadius: 10,

                            textDecoration:
                              "none",

                            background:
                              active
                                ? "rgba(255,255,255,0.08)"
                                : "transparent",

                            color:
                              active
                                ? "#fff"
                                : "rgba(255,255,255,0.65)",
                          }}
                        >
                          <Icon
                            type={
                              locked
                                ? "lock"
                                : item.icon
                            }
                          />

                          <span
                            style={{
                              flex: 1,

                              fontSize: 13,

                              fontWeight: 500,
                            }}
                          >
                            {
                              item.label
                            }
                          </span>

                          {locked && (
                            <span
                              style={{
                                fontSize: 10,
                                color:
                                  "#f59e0b",
                                fontWeight: 700,
                              }}
                            >
                              {planLabel(
                                reqPlan ||
                                  "pro"
                              )}
                            </span>
                          )}
                        </Link>
                      );
                    }
                  )}
                </div>
              </div>
            )
          )}
        </div>

        {/* SWITCH BUTTON */}
        <div
          style={{
            padding:
              "0 1rem",
            marginBottom:
              "1rem",
          }}
        >
          <button
            disabled={
              switching ||
              subscriptionExpired
            }
            onClick={() =>
              setSwitcherOpen(true)
            }
            style={{
              width: "100%",

              display: "flex",

              alignItems:
                "center",

              justifyContent:
                "center",

              gap: 8,

              padding:
                "0.9rem",

              borderRadius: 12,

              border: "none",

              background:
                subscriptionExpired
                  ? "rgba(255,255,255,0.08)"
                  : "#2563eb",

              color: "#fff",

              cursor:
                "pointer",

              fontWeight: 700,
            }}
          >
            <Icon type="switch" />

            {switching
              ? "Switching..."
              : "Switch POS"}
          </button>
        </div>

        {/* FOOTER */}
        <div
          className="sidebar-footer"
          style={{
            padding:
              "0.75rem",

            borderTop:
              "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <Link
            href="/admin/subscription"
            style={{
              display:
                "flex",

              alignItems:
                "center",

              gap: 8,

              padding:
                "0.7rem 0.8rem",

              borderRadius: 10,

              textDecoration:
                "none",

              marginBottom:
                "0.7rem",

              background:
                subscriptionExpired
                  ? "rgba(220,38,38,0.1)"
                  : "rgba(234,88,12,0.08)",

              border: `1px solid ${
                subscriptionExpired
                  ? "rgba(220,38,38,0.3)"
                  : "rgba(234,88,12,0.2)"
              }`,
            }}
          >
            <div
              style={{
                flex: 1,
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,

                  color:
                    subscriptionExpired
                      ? "#ef4444"
                      : "#f97316",
                }}
              >
                {subscriptionExpired
                  ? "Renew Subscription"
                  : "Subscription"}
              </div>

              <div
                style={{
                  fontSize: 10,

                  marginTop: 2,

                  color:
                    "rgba(255,255,255,0.35)",
                }}
              >
                Manage payments
              </div>
            </div>
          </Link>

          <div
            style={{
              display: "flex",

              alignItems:
                "center",

              gap: 10,
            }}
          >
            <div
              style={{
                width: 40,

                height: 40,

                borderRadius:
                  "50%",

                background:
                  "#2563eb",

                display: "flex",

                alignItems:
                  "center",

                justifyContent:
                  "center",

                color: "#fff",

                fontWeight: 700,

                fontSize: 13,

                flexShrink: 0,
              }}
            >
              {getInitials(
                user.full_name
              )}
            </div>

            <div
              style={{
                flex: 1,
                minWidth: 0,
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#fff",
                }}
              >
                {user.full_name}
              </div>

              <div
                style={{
                  fontSize: 11,
                  color:
                    "rgba(255,255,255,0.4)",
                  marginTop: 2,
                }}
              >
                {user.role}
              </div>
            </div>

            <button
              onClick={() =>
                setLogoutConfirm(
                  true
                )
              }
              style={{
                border: "none",

                background:
                  "transparent",

                color:
                  "rgba(255,255,255,0.45)",

                cursor:
                  "pointer",

                width: 34,

                height: 34,

                borderRadius: 8,

                display: "flex",

                alignItems:
                  "center",

                justifyContent:
                  "center",
              }}
            >
              <Icon type="logout" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}