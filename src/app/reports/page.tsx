"use client";

import * as React from "react";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Users,
  TrendingUp,
  UserX,
  RotateCcw,
  Lock,
  UserCheck,
  UserMinus,
  BarChart3
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useFirestore, useCollection, useMemoFirebase, useEmployee, useUser } from "@/firebase";
import { collection } from "firebase/firestore";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/context/language-context";

export default function ReportsPage() {
  const { isDirector, isManager, campus: userCampus, isLoading: isAuthLoading } = useEmployee();
  const db = useFirestore();
  const { user } = useUser();
  const { t, isRTL } = useLanguage();
  
  // Guarded query for applications
  const appsQuery = useMemoFirebase(() => user ? collection(db, "applications") : null, [db, user]);
  const { data: applications = [], isLoading: isDataLoading } = useCollection(appsQuery);

  if (isAuthLoading || isDataLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 font-bold">{t('syncing')}</p>
        </div>
      </div>
    );
  }

  if (!isDirector && !isManager) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6 animate-in fade-in zoom-in duration-500">
        <div className="h-24 w-24 bg-rose-50 rounded-[2rem] flex items-center justify-center border border-rose-100 shadow-xl shadow-rose-500/10">
          <Lock className="h-12 w-12 text-rose-500" />
        </div>
        <div className="space-y-2">
          <h2 className="text-3xl font-black text-slate-800 font-serif">{t('access_issue')}</h2>
          <p className="text-slate-500 font-medium max-w-md mx-auto">
            {t('authorized_personnel_only')}
          </p>
        </div>
      </div>
    );
  }

  const filteredApps = isDirector ? (applications || []) : (applications || []).filter(a => a.school === userCampus);

  const total = filteredApps.length || 0;
  const paid = filteredApps.filter(a => a.status?.includes("Paid") || a.status === "Booked Place & Paid").length || 0;
  const rejected = filteredApps.filter(a => a.status?.toLowerCase().includes("rejected") || a.status?.toLowerCase().includes("failed")).length || 0;
  const noShow = filteredApps.filter(a => a.status === "No Show").length || 0;
  const reExamCount = filteredApps.filter(a => a.status === "Re-exam").length || 0;
  const conversionRate = total > 0 ? ((paid / total) * 100).toFixed(1) : "0.0";

  const campusCounts = {
    "Cairo Campus": applications?.filter(a => a.school === "Cairo Campus" || a.school === "Cairo").length || 0,
    "Giza Campus": applications?.filter(a => a.school === "Giza Campus" || a.school === "Giza").length || 0,
    "New Cairo Campus": applications?.filter(a => a.school === "New Cairo Campus" || a.school === "New Cairo").length || 0,
    "Alexandria Campus": applications?.filter(a => a.school === "Alexandria Campus" || a.school === "Alexandria").length || 0,
  };

  const kpis = [
    {
      title: t('total_applicants'),
      value: total.toString(),
      description: t('total_apps_desc'),
      icon: Users,
      color: "text-blue-500",
      bg: "bg-blue-50",
    },
    {
      title: t('paid_applicants'),
      value: paid.toString(),
      description: t('paid_apps_desc'),
      icon: UserCheck,
      color: "text-emerald-500",
      bg: "bg-emerald-50",
    },
    {
      title: t('conversion_rate'),
      value: `${conversionRate}%`,
      description: t('conv_rate_desc'),
      icon: TrendingUp,
      color: "text-purple-500",
      bg: "bg-purple-50",
    },
    {
      title: t('no_show_not_responded'),
      value: noShow.toString(),
      description: t('no_show_desc'),
      icon: UserX,
      color: "text-orange-500",
      bg: "bg-orange-50",
    },
    {
      title: t('rejected_students'),
      value: rejected.toString(),
      description: t('rejected_desc'),
      icon: UserMinus,
      color: "text-rose-500",
      bg: "bg-rose-50",
    },
    {
      title: t('re_exam_cases'),
      value: reExamCount.toString(),
      description: t('re_exam_desc'),
      icon: RotateCcw,
      color: "text-indigo-500",
      bg: "bg-indigo-50",
    },
  ];

  return (
    <div className={cn("flex flex-col gap-8 w-full max-w-full animate-in fade-in duration-700 pb-20", isRTL && "font-arabic")}>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-4xl font-black tracking-tight text-[#1a1a1a] font-serif">
            {t('analytics_reporting')}
          </h1>
          <p className="text-slate-400 text-lg font-medium">
            {t('performance_metrics')}
          </p>
        </div>
        <div className={cn("flex flex-col gap-1", isRTL ? "items-start" : "items-end")}>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('scope')}</span>
          <div className="flex items-center gap-2">
            {isManager && <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-100">{userCampus}</Badge>}
            <span className="text-lg font-bold text-slate-700">{isDirector ? t('all_campuses') : t('your_campus')}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
        {kpis.map((kpi) => (
          <Card key={kpi.title} className="border border-slate-100 shadow-sm rounded-2xl bg-white hover:shadow-md transition-all duration-300">
            <CardContent className="p-8">
              <div className="flex justify-between items-start">
                <div className="space-y-4">
                  <p className="text-[13px] font-bold text-slate-400">{kpi.title}</p>
                  <div className="space-y-1">
                    <h3 className="text-4xl font-black text-slate-900 tracking-tighter">{kpi.value}</h3>
                    <p className="text-xs font-bold text-slate-400 leading-tight">{kpi.description}</p>
                  </div>
                </div>
                <div className={cn("p-3 rounded-full flex items-center justify-center", kpi.bg)}>
                  <kpi.icon className={cn("h-6 w-6", kpi.color)} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {isDirector && (
        <div className="space-y-4 mt-8">
          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-8">
            <div className="space-y-1 mb-6">
              <h2 className="text-2xl font-bold text-[#1a1a1a] font-serif">{t('campus_performance')}</h2>
              <p className="text-slate-400 text-sm font-medium">{t('campus_perf_desc')}</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.entries(campusCounts).map(([campus, count]) => (
                <div key={campus} className="p-6 rounded-2xl border border-slate-100 bg-slate-50/30 flex flex-col gap-2">
                  <span className="text-sm font-bold text-slate-700">{campus}</span>
                  <span className="text-2xl font-black text-blue-600">{count} <span className="text-xs text-slate-400 font-bold uppercase ml-1">{t('students_label')}</span></span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-8">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-[#1a1a1a] font-serif">{t('trends_charts')}</h2>
          </div>
          
          <div className="border-2 border-dashed border-slate-200 rounded-[2rem] min-h-[300px] flex items-center justify-center">
            <div className="flex flex-col items-center gap-3 text-slate-400">
              <BarChart3 className="h-10 w-10 opacity-20" />
              <p className="text-sm font-medium">{t('trends_charts_desc')}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
