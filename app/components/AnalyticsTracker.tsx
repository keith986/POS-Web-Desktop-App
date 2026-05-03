 "use client";
  import { useEffect } from "react";

  export function AnalyticsTracker({ domain }: { domain: string }) {
    useEffect(() => {
      // Page visit
      fetch("/api/analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain, type: "visit" }),
      }).catch(() => {});
 
      // Any click on the page
      const onClick = () => {
        fetch("/api/analytics", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ domain, type: "click" }),
        }).catch(() => {});
      };
 
      document.addEventListener("click", onClick);
      return () => document.removeEventListener("click", onClick);
    }, [domain]);
 
    return null;
  }

 
 