"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { api } from "@/lib/api";

type CurrentUserResponse = {
  user: {
    role?: string;
  };
};

export default function RouteAccessGuard({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [authorizedPath, setAuthorizedPath] = useState<string | null>(null);

  useEffect(() => {
    if (pathname === "/") {
      setAuthorizedPath("/");
      return;
    }

    let active = true;
    setAuthorizedPath(null);

    void api<CurrentUserResponse>("/api/auth/me")
      .then(({ user }) => {
        if (!active) return;
        if (user.role !== "admin") {
          router.replace("/");
          return;
        }
        setAuthorizedPath(pathname);
      })
      .catch(() => {
        if (active) router.replace("/");
      });

    return () => {
      active = false;
    };
  }, [pathname, router]);

  if (pathname !== "/" && authorizedPath !== pathname) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        Verifying access…
      </div>
    );
  }

  return children;
}
