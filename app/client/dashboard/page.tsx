"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ClientDashboardPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect clients to login for now
    router.push("/");
  }, [router]);

  return null;
}