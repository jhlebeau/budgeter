"use client";

import { ReactNode, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useBudget } from "./budget-context";

const PUBLIC_PATHS = new Set(["/", "/create-account"]);

export function AuthGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { currentUser } = useBudget();

  const isPublicPath = PUBLIC_PATHS.has(pathname);

  useEffect(() => {
    if (!currentUser && !isPublicPath) {
      router.replace("/");
    }
  }, [currentUser, isPublicPath, router]);

  if (!currentUser && !isPublicPath) {
    return null;
  }

  return <>{children}</>;
}

