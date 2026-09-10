
"use client"

import * as React from "react";
import { useRouter } from "next/navigation";
import { useUser, useEmployee } from "@/firebase";

export default function DashboardPage() {
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const { isSales, isLoading: isAuthLoading, isAuthorized } = useEmployee();

  React.useEffect(() => {
    if (!isUserLoading && !isAuthLoading) {
      if (!user || user.isAnonymous) {
        router.replace("/login");
      } else if (!isAuthorized) {
        // Stay here to show unauthorized message (handled in the component)
      } else if (isSales) {
        // Sales has its own workspace logic, but instructions said to clear dashboard
        // If we want to keep sales workspace, we'd add it here.
        // For now, redirecting everyone to the main portal area as requested.
        router.replace("/applications");
      } else {
        router.replace("/applications");
      }
    }
  }, [user, isUserLoading, isAuthLoading, isSales, isAuthorized, router]);

  if (isUserLoading || isAuthLoading) {
    return <div className="p-20 text-center animate-pulse text-slate-400 font-bold">Syncing Workspace...</div>;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
      <div className="h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
      <p className="text-slate-500 font-bold">Redirecting to Applications Registry...</p>
    </div>
  );
}
