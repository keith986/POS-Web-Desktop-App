"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { classifyTrafficSource } from "@/app/_lib/trafficSource";

/* Internal panels are not customer traffic — do not pollute source stats with staff/owner activity */
function isInternalPath(path: string) {
  return (
    path.startsWith("/admin") ||
    path.startsWith("/staff") ||
    path.startsWith("/super-admin") ||
    path.startsWith("/api")
  );
}

export function AnalyticsTracker({ domain }: { domain: string }) {
  const pathname = usePathname() || "/";

  useEffect(() => {
    if (!domain) return;
    const internal = isInternalPath(pathname);

    /* Page visit — always counted for the domain totals */
    fetch("/api/analytic", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        internal
          ? { domain, type: "visit" }
          : buildVisitPayload(domain, pathname)
      ),
    }).catch(() => {});

    /* Any click on the page */
    const onClick = () => {
      fetch("/api/analytic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain, type: "click" }),
      }).catch(() => {});
    };

    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [domain, pathname]);

  return null;
}

function buildVisitPayload(domain: string, pathname: string) {
  const referrer = typeof document !== "undefined" ? document.referrer : "";
  const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const utm_source   = params?.get("utm_source")   ?? null;
  const utm_medium   = params?.get("utm_medium")   ?? null;
  const utm_campaign = params?.get("utm_campaign") ?? null;
  const currentHost  = typeof window !== "undefined" ? window.location.hostname : null;

  const source = classifyTrafficSource({ referrer, utmSource: utm_source, currentHost });

  return {
    domain,
    type: "visit",
    source,
    referrer:     referrer || null,
    landing_page: pathname,
    utm_source,
    utm_medium,
    utm_campaign,
  };
}
