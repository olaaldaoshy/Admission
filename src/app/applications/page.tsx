
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  ChevronDown,
  Calendar as CalendarIcon,
  Clock,
  Users,
  UserCheck,
  CalendarDays,
  ListChecks,
  Building2,
  MapPin,
  Layers,
  GraduationCap,
  RotateCcw,
  X,
  Save,
  Loader2,
  FileText,
  ExternalLink,
  Filter,
  Check
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { DateRange } from "react-day-picker";
import { format, differenceInDays } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useFirestore, useCollection, useMemoFirebase, updateDocumentNonBlocking, useEmployee, useUser, setDocumentNonBlocking } from "@/firebase";
import { collection, doc, query, where, getDocs, getDoc, updateDoc, arrayUnion } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/context/language-context";

const statusStyles: Record<string, string> = {
  "Applicant": "bg-blue-50 text-blue-600 border-blue-100",
  "Confirmed Assessment": "bg-indigo-50 text-indigo-600 border-indigo-100",
  "Tested": "bg-sky-50 text-sky-600 border-sky-100",
  "Re-exam": "bg-violet-50 text-violet-700 border-violet-100",
  "Passed Assessment": "bg-emerald-100 text-emerald-800 border-emerald-200",
  "Failed Assessment": "bg-rose-100 text-rose-800 border-rose-200",
  "Passed Admission Interview": "bg-emerald-50 text-emerald-700 border-emerald-100",
  "Oral Interview": "bg-blue-50 text-blue-600 border-blue-100",
  "Confirmed Interview": "bg-indigo-50 text-indigo-600 border-indigo-100",
  "Passed Parent Interview": "bg-teal-50 text-teal-700 border-teal-100",
  "Failed Parent Interview": "bg-rose-100 text-rose-800 border-rose-200",
  "Passed Oral Interview": "bg-emerald-100 text-emerald-800 border-emerald-200",
  "Failed Oral Interview": "bg-rose-200 text-rose-900 border-rose-300",
  "Approved By Principal": "bg-purple-50 text-purple-700 border-purple-200",
  "Approved by Director": "bg-purple-100 text-purple-800 border-purple-300",
  "Approved by General Director": "bg-fuchsia-100 text-fuchsia-800 border-fuchsia-300",
  "Acceptance Sent": "bg-teal-50 text-teal-700 border-teal-100",
  "Paid": "bg-green-100 text-green-800 border-green-200",
  "Booked Place & Paid": "bg-emerald-100 text-emerald-900 border-emerald-300",
  "Waiting List": "bg-yellow-50 text-yellow-700 border-yellow-100",
  "Refund Request": "bg-amber-50 text-amber-700 border-amber-100",
  "No Show": "bg-rose-50 text-rose-600 border-rose-200",
  "No Answer": "bg-rose-50 text-rose-600 border-rose-100",
  "Cancelled by Phone": "bg-rose-50 text-rose-500 border-rose-100",
  "Postponed": "bg-orange-50 text-orange-600 border-orange-100",
  "Declined": "bg-slate-100 text-slate-500 border-slate-200",
  "Duplicate": "bg-slate-200 text-slate-700 border-slate-300",
  "Rejected": "bg-red-100 text-red-800 border-red-200",
  "Converted": "bg-emerald-50 text-emerald-700 border-emerald-100",
  "New": "bg-blue-50 text-blue-700 border-blue-100",
};

export interface StatusDefinition {
  key: string;
  labelEn: string;
  labelAr: string;
  category: "assessment" | "interview" | "approvals" | "enrollment" | "sales" | "other";
  categoryNameEn: string;
  categoryNameAr: string;
  style: string;
}

const SYSTEM_STATUS_DEFINITIONS: StatusDefinition[] = [
  // 1. التقييم الأكاديمي
  { key: "Applicant", labelEn: "Applicant", labelAr: "متقدم جديد", category: "assessment", categoryNameEn: "Assessment Stage", categoryNameAr: "مرحلة التقديم والتقييم الأكاديمي", style: "bg-blue-50 text-blue-600 border-blue-100" },
  { key: "Confirmed Assessment", labelEn: "Confirmed Assessment", labelAr: "تأكيد موعد التقييم", category: "assessment", categoryNameEn: "Assessment Stage", categoryNameAr: "مرحلة التقديم والتقييم الأكاديمي", style: "bg-indigo-50 text-indigo-600 border-indigo-100" },
  { key: "Tested", labelEn: "Tested", labelAr: "تم الاختبار / التقييم", category: "assessment", categoryNameEn: "Assessment Stage", categoryNameAr: "مرحلة التقديم والتقييم الأكاديمي", style: "bg-sky-50 text-sky-600 border-sky-100" },
  { key: "Re-exam", labelEn: "Re-exam", labelAr: "إعادة تقييم", category: "assessment", categoryNameEn: "Assessment Stage", categoryNameAr: "مرحلة التقديم والتقييم الأكاديمي", style: "bg-violet-50 text-violet-700 border-violet-100" },
  { key: "Passed Assessment", labelEn: "Passed Assessment", labelAr: "اجتاز التقييم الأكاديمي", category: "assessment", categoryNameEn: "Assessment Stage", categoryNameAr: "مرحلة التقديم والتقييم الأكاديمي", style: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  { key: "Failed Assessment", labelEn: "Failed Assessment", labelAr: "لم يجتز التقييم الأكاديمي", category: "assessment", categoryNameEn: "Assessment Stage", categoryNameAr: "مرحلة التقديم والتقييم الأكاديمي", style: "bg-rose-100 text-rose-800 border-rose-200" },

  // 2. المقابلات
  { key: "Passed Admission Interview", labelEn: "Passed Admission Interview", labelAr: "اجتاز مقابلة القبول", category: "interview", categoryNameEn: "Interviews", categoryNameAr: "المقابلات الشخصية والشفوية", style: "bg-emerald-50 text-emerald-700 border-emerald-100" },
  { key: "Oral Interview", labelEn: "Oral Interview", labelAr: "مقابلة شفوية", category: "interview", categoryNameEn: "Interviews", categoryNameAr: "المقابلات الشخصية والشفوية", style: "bg-blue-50 text-blue-600 border-blue-100" },
  { key: "Confirmed Interview", labelEn: "Confirmed Interview", labelAr: "تأكيد موعد المقابلة", category: "interview", categoryNameEn: "Interviews", categoryNameAr: "المقابلات الشخصية والشفوية", style: "bg-indigo-50 text-indigo-600 border-indigo-100" },
  { key: "Passed Parent Interview", labelEn: "Passed Parent Interview", labelAr: "اجتاز مقابلة ولي الأمر", category: "interview", categoryNameEn: "Interviews", categoryNameAr: "المقابلات الشخصية والشفوية", style: "bg-teal-50 text-teal-700 border-teal-100" },
  { key: "Failed Parent Interview", labelEn: "Failed Parent Interview", labelAr: "لم يجتز مقابلة ولي الأمر", category: "interview", categoryNameEn: "Interviews", categoryNameAr: "المقابلات الشخصية والشفوية", style: "bg-rose-100 text-rose-800 border-rose-200" },
  { key: "Passed Oral Interview", labelEn: "Passed Oral Interview", labelAr: "اجتاز المقابلة الشفوية", category: "interview", categoryNameEn: "Interviews", categoryNameAr: "المقابلات الشخصية والشفوية", style: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  { key: "Failed Oral Interview", labelEn: "Failed Oral Interview", labelAr: "لم يجتز المقابلة الشفوية", category: "interview", categoryNameEn: "Interviews", categoryNameAr: "المقابلات الشخصية والشفوية", style: "bg-rose-200 text-rose-900 border-rose-300" },

  // 3. الاعتمادات الإدارية
  { key: "Approved By Principal", labelEn: "Approved By Principal", labelAr: "معتمد من الناظر", category: "approvals", categoryNameEn: "Directorial Approvals", categoryNameAr: "الاعتمادات الإدارية", style: "bg-purple-50 text-purple-700 border-purple-200" },
  { key: "Approved by Director", labelEn: "Approved by Director", labelAr: "معتمد من المدير", category: "approvals", categoryNameEn: "Directorial Approvals", categoryNameAr: "الاعتمادات الإدارية", style: "bg-purple-100 text-purple-800 border-purple-300" },
  { key: "Approved by General Director", labelEn: "Approved by General Director", labelAr: "معتمد من المدير العام", category: "approvals", categoryNameEn: "Directorial Approvals", categoryNameAr: "الاعتمادات الإدارية", style: "bg-fuchsia-100 text-fuchsia-800 border-fuchsia-300" },

  // 4. التسجيل والمالية
  { key: "Acceptance Sent", labelEn: "Acceptance Sent", labelAr: "تم إرسال إشعار القبول", category: "enrollment", categoryNameEn: "Enrollment & Financial", categoryNameAr: "القبول والتسجيل والمالية", style: "bg-teal-50 text-teal-700 border-teal-100" },
  { key: "Paid", labelEn: "Paid", labelAr: "تم السداد / مدفوع", category: "enrollment", categoryNameEn: "Enrollment & Financial", categoryNameAr: "القبول والتسجيل والمالية", style: "bg-green-100 text-green-800 border-green-200" },
  { key: "Booked Place & Paid", labelEn: "Booked Place & Paid", labelAr: "حجز مقعد وسداد", category: "enrollment", categoryNameEn: "Enrollment & Financial", categoryNameAr: "القبول والتسجيل والمالية", style: "bg-emerald-100 text-emerald-900 border-emerald-300" },
  { key: "Waiting List", labelEn: "Waiting List", labelAr: "قائمة الانتظار", category: "enrollment", categoryNameEn: "Enrollment & Financial", categoryNameAr: "القبول والتسجيل والمالية", style: "bg-yellow-50 text-yellow-700 border-yellow-100" },
  { key: "Refund Request", labelEn: "Refund Request", labelAr: "طلب استرداد", category: "enrollment", categoryNameEn: "Enrollment & Financial", categoryNameAr: "القبول والتسجيل والمالية", style: "bg-amber-50 text-amber-700 border-amber-100" },

  // 5. المتابعة وعدم الحضور والمبيعات
  { key: "No Show", labelEn: "No Show", labelAr: "لم يحضر", category: "sales", categoryNameEn: "Follow-up & Sales", categoryNameAr: "المتابعة والمبيعات والاعتذارات", style: "bg-rose-50 text-rose-600 border-rose-200" },
  { key: "No Answer", labelEn: "No Answer", labelAr: "لم يرد", category: "sales", categoryNameEn: "Follow-up & Sales", categoryNameAr: "المتابعة والمبيعات والاعتذارات", style: "bg-rose-50 text-rose-600 border-rose-100" },
  { key: "Cancelled by Phone", labelEn: "Cancelled by Phone", labelAr: "إلغاء هاتفي", category: "sales", categoryNameEn: "Follow-up & Sales", categoryNameAr: "المتابعة والمبيعات والاعتذارات", style: "bg-rose-50 text-rose-500 border-rose-100" },
  { key: "Postponed", labelEn: "Postponed", labelAr: "مؤجل", category: "sales", categoryNameEn: "Follow-up & Sales", categoryNameAr: "المتابعة والمبيعات والاعتذارات", style: "bg-orange-50 text-orange-600 border-orange-100" },
  { key: "Declined", labelEn: "Declined", labelAr: "مرفوض / اعتذار", category: "sales", categoryNameEn: "Follow-up & Sales", categoryNameAr: "المتابعة والمبيعات والاعتذارات", style: "bg-slate-100 text-slate-500 border-slate-200" },
  { key: "Duplicate", labelEn: "Duplicate", labelAr: "طلب مكرر", category: "sales", categoryNameEn: "Follow-up & Sales", categoryNameAr: "المتابعة والمبيعات والاعتذارات", style: "bg-slate-200 text-slate-700 border-slate-300" },
  { key: "Rejected", labelEn: "Rejected", labelAr: "مرفوض نهائياً", category: "sales", categoryNameEn: "Follow-up & Sales", categoryNameAr: "المتابعة والمبيعات والاعتذارات", style: "bg-red-100 text-red-800 border-red-200" },
  { key: "Converted", labelEn: "Converted", labelAr: "محول لمبيعات", category: "sales", categoryNameEn: "Follow-up & Sales", categoryNameAr: "المتابعة والمبيعات والاعتذارات", style: "bg-emerald-50 text-emerald-600 border-emerald-100" },
  { key: "New", labelEn: "New", labelAr: "طلب جديد", category: "sales", categoryNameEn: "Follow-up & Sales", categoryNameAr: "المتابعة والمبيعات والاعتذارات", style: "bg-blue-50 text-blue-600 border-blue-100" },
];

const allStatusOptions = SYSTEM_STATUS_DEFINITIONS.map(s => s.key);

const salesStatuses = ["No Show", "Cancelled by Phone", "Declined", "Duplicate"];

export const isSalesFollowupStatus = (status: string | undefined | null) => {
  if (!status) return false;
  const s = status.trim().toLowerCase();
  return (
    s === "no show" || 
    s === "cancelled by phone" || 
    s === "canceled by phone" ||
    s.includes("no show") ||
    s.includes("cancelled by phone") ||
    s.includes("canceled by phone")
  );
};

const formatName = (name: string) => {
  if (!name) return "—";
  const parts = name.trim().split(/\s+/);
  if (parts.length <= 2) return <span className="font-bold">{name}</span>;
  return (
    <div className="flex flex-col leading-tight">
      <span className="truncate font-bold">{parts.slice(0, 2).join(" ")}</span>
      <span className="text-[10px] opacity-50 font-normal truncate">
        {parts.slice(2).join(" ")}
      </span>
    </div>
  );
};

export default function ApplicationsPage() {
  const router = useRouter();
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const { isDirector, isManager, isSales, isSalesManager, campus: userCampus, employee } = useEmployee();
  const { t, isRTL } = useLanguage();

  // Only Director, Sales, and Sales Manager are allowed to see No Show and Cancelled by Phone statuses
  const canSeeSalesFollowupStatuses = isDirector || isSales || isSalesManager;
  
  const [date, setDate] = React.useState<DateRange | undefined>(undefined);
  const [selectedGrade, setSelectedGrade] = React.useState("all");
  const [selectedStatus, setSelectedStatus] = React.useState("all");
  const [selectedType, setSelectedType] = React.useState("all");
  const [selectedSchool, setSelectedSchool] = React.useState("all");
  const [selectedCampus, setSelectedCampus] = React.useState("all");
  const [searchTerm, setSearchTerm] = React.useState("");

  // Status Filter Popover State
  const [isStatusPopoverOpen, setIsStatusPopoverOpen] = React.useState(false);
  const [statusSearchQuery, setStatusSearchQuery] = React.useState("");
  const [selectedStatusCategory, setSelectedStatusCategory] = React.useState("all");

  // If a regular employee had a sales-only status selected, reset to all
  React.useEffect(() => {
    if (!canSeeSalesFollowupStatuses && isSalesFollowupStatus(selectedStatus)) {
      setSelectedStatus("all");
    }
  }, [canSeeSalesFollowupStatuses, selectedStatus]);

  // Postponed Logic
  const [isPostponeOpen, setIsPostponeOpen] = React.useState(false);
  const [selectedStudent, setSelectedStudent] = React.useState<any>(null);
  const [postponeComment, setPostponeComment] = React.useState("");
  const [isSavingPostpone, setIsSavingPostpone] = React.useState(false);

  const appsQuery = useMemoFirebase(() => user ? collection(db, "applications") : null, [db, user]);
  const { data: applicationsData, isLoading } = useCollection(appsQuery);
  const applications = applicationsData || [];
  
  const gradesQuery = useMemoFirebase(() => user ? collection(db, "grade") : null, [db, user]);
  const { data: gradesDataRaw } = useCollection(gradesQuery);
  const gradesData = (gradesDataRaw || []).filter(Boolean);

  const campusQuery = useMemoFirebase(() => collection(db, "campus"), [db]);
  const { data: campusDataRaw } = useCollection(campusQuery);
  const campusData = (campusDataRaw || []).filter(Boolean);

  const schoolsQuery = useMemoFirebase(() => collection(db, "schools"), [db]);
  const { data: schoolsDataRaw } = useCollection(schoolsQuery);
  const schoolsData = (schoolsDataRaw || []).filter(Boolean);

  // Dynamic system statuses combining default catalog and any custom statuses in DB
  // Resolve employee's campus name from campus data or userCampus string
  const userCampusName = React.useMemo(() => {
    if (!userCampus) return "";
    const match = (campusData || []).find(c => 
      c.id === userCampus || 
      (c.name && c.name.toLowerCase().trim() === userCampus.toLowerCase().trim())
    );
    return match?.name || userCampus;
  }, [userCampus, campusData]);

  // Non-director employees can see applications on their campus ONLY,
  // excluding "No Show" and "Cancelled by Phone" which are visible to Director + Sales ONLY
  const accessibleApps = React.useMemo(() => {
    return (applications || []).filter(item => {
      // Hide "No Show" and "Cancelled by Phone" from regular employees
      if (!canSeeSalesFollowupStatuses && isSalesFollowupStatus(item.status)) {
        return false;
      }

      if (isDirector) return true;
      if (userCampus) {
        const target = (userCampusName || userCampus).trim().toLowerCase();
        if (target === "all") return true;
        const appCampus = item.campus ? String(item.campus).trim().toLowerCase() : "";
        const appSchool = item.school ? String(item.school).trim().toLowerCase() : "";
        if (appCampus === target || appSchool === target) return true;
        if ((target.includes("sherouk") || target.includes("shorouk")) && 
            (appCampus.includes("sherouk") || appCampus.includes("shorouk") || appSchool.includes("sherouk") || appSchool.includes("shorouk"))) return true;
        if (target.includes("october") && (appCampus.includes("october") || appSchool.includes("october"))) return true;
        if (target.includes("cairo") && (appCampus.includes("cairo") || appSchool.includes("cairo"))) return true;
        if (target.includes("zayed") && (appCampus.includes("zayed") || appSchool.includes("zayed"))) return true;
        return false;
      }
      return item.assignedEmployeeId === user?.uid;
    });
  }, [applications, isDirector, canSeeSalesFollowupStatuses, userCampus, userCampusName, user]);

  const allSystemStatuses = React.useMemo(() => {
    const existingKeys = new Set(SYSTEM_STATUS_DEFINITIONS.map(s => s.key.toLowerCase()));
    let list = [...SYSTEM_STATUS_DEFINITIONS];

    (accessibleApps || []).forEach((app: any) => {
      const rawStatus = app?.status ? String(app.status).trim() : "";
      if (rawStatus && !existingKeys.has(rawStatus.toLowerCase())) {
        existingKeys.add(rawStatus.toLowerCase());
        list.push({
          key: rawStatus,
          labelEn: rawStatus,
          labelAr: rawStatus,
          category: "other",
          categoryNameEn: "Other System Statuses",
          categoryNameAr: "حالات مسجلة أخرى بالنظام",
          style: "bg-slate-100 text-slate-700 border-slate-200"
        });
      }
    });

    // If user is not Director or Sales, filter out "No Show" and "Cancelled by Phone"
    if (!canSeeSalesFollowupStatuses) {
      list = list.filter(s => !isSalesFollowupStatus(s.key));
    }

    return list;
  }, [accessibleApps, canSeeSalesFollowupStatuses]);

  const statusCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    accessibleApps.forEach((item: any) => {
      const st = item.status ? String(item.status).trim() : "";
      if (st) {
        counts[st] = (counts[st] || 0) + 1;
        counts[st.toLowerCase()] = (counts[st.toLowerCase()] || 0) + 1;
      }
    });
    return counts;
  }, [accessibleApps]);

  const filteredStatusList = React.useMemo(() => {
    const q = statusSearchQuery.trim().toLowerCase();
    return allSystemStatuses.filter((st) => {
      if (selectedStatusCategory !== "all" && st.category !== selectedStatusCategory) {
        return false;
      }
      if (!q) return true;
      return (
        st.labelAr.toLowerCase().includes(q) ||
        st.labelEn.toLowerCase().includes(q) ||
        st.key.toLowerCase().includes(q)
      );
    });
  }, [allSystemStatuses, statusSearchQuery, selectedStatusCategory]);

  const schoolOptions = React.useMemo(() => {
    const campusNames = new Set((campusData || []).map(c => c.name?.toLowerCase().trim()).filter(Boolean));
    const set = new Set<string>();
    ["American", "IB", "International Girls Only, British"].forEach(s => set.add(s));
    (schoolsData || []).forEach(s => {
      if (s?.name && !campusNames.has(s.name.toLowerCase().trim())) {
        set.add(s.name.trim());
      }
    });
    (accessibleApps || []).forEach(a => {
      if (a?.school && !campusNames.has(a.school.toLowerCase().trim())) {
        set.add(a.school.trim());
      }
    });
    return Array.from(set).filter(Boolean);
  }, [schoolsData, campusData, accessibleApps]);

  const kpiData = React.useMemo(() => {
    return [
      { title: t('total_applications'), value: accessibleApps.length.toString(), icon: Users, color: "border-l-blue-500", iconBg: "bg-blue-50", iconColor: "text-blue-600" },
      { title: t('active_cases'), value: accessibleApps.filter(a => !["Failed Oral Interview", "Failed Assessment", "Declined", "Paid", "Postponed"].includes(a.status)).length.toString(), icon: UserCheck, color: "border-l-green-500", iconBg: "bg-green-50", iconColor: "text-green-600" },
      { title: t('interviews'), value: accessibleApps.filter(a => a.status?.includes("Interview") || a.status?.includes("Assessment")).length.toString(), icon: CalendarDays, color: "border-l-purple-500", iconBg: "bg-purple-50", iconColor: "text-purple-600" },
      { title: t('pending_actions'), value: accessibleApps.filter(a => ["Applicant", "Confirmed Assessment"].includes(a.status)).length.toString(), icon: ListChecks, color: "border-l-orange-500", iconBg: "bg-orange-50", iconColor: "text-orange-600" },
    ];
  }, [accessibleApps, t]);

  const filteredData = React.useMemo(() => {
    return (accessibleApps || [])
      .filter((item) => {
        const matchesGrade = selectedGrade === "all" || item.grade === selectedGrade;
        const matchesStatus = selectedStatus === "all" || 
          item.status === selectedStatus || 
          (item.status && String(item.status).trim().toLowerCase() === selectedStatus.trim().toLowerCase());
        const matchesType = selectedType === "all" || item.category === selectedType;
        const matchesSchool = selectedSchool === "all" || item.school === selectedSchool;
        const matchesCampus = isDirector ? (selectedCampus === "all" || item.campus === selectedCampus) : true;
        
        const matchesSearch = 
          item.studentName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
          item.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
          item.fatherPhone?.includes(searchTerm) ||
          item.fatherName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.motherName?.toLowerCase().includes(searchTerm.toLowerCase());
        
        if (date?.from || date?.to) {
          if (!item.interviewDate && !item.applicationDate) return false;
          const targetDate = item.interviewDate || item.applicationDate;
          const appDate = new Date(targetDate);
          const from = date?.from ? new Date(date.from) : null;
          const to = date?.to ? new Date(date.to) : null;
          if(from) from.setHours(0,0,0,0);
          if(to) to.setHours(23,59,59,999);
          const matchesDate = (!from || appDate >= from) && (!to || appDate <= to);
          if (!matchesDate) return false;
        }

        return matchesSearch && matchesGrade && matchesStatus && matchesType && matchesSchool && matchesCampus;
      })
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  }, [accessibleApps, searchTerm, selectedGrade, selectedStatus, selectedType, selectedSchool, selectedCampus, date, isDirector]);

  const isFiltering = React.useMemo(() => {
    return selectedGrade !== "all" || 
           selectedStatus !== "all" || 
           selectedType !== "all" || 
           selectedSchool !== "all" || 
           (isDirector && selectedCampus !== "all") || 
           searchTerm !== "" || 
           !!date;
  }, [selectedGrade, selectedStatus, selectedType, selectedSchool, selectedCampus, searchTerm, date, isDirector]);

  const handleResetFilters = () => {
    setSelectedGrade("all");
    setSelectedStatus("all");
    setSelectedType("all");
    setSelectedSchool("all");
    if (isDirector) {
      setSelectedCampus("all");
    }
    setDate(undefined);
    setSearchTerm("");
    setStatusSearchQuery("");
    setSelectedStatusCategory("all");
  };

  const handleStatusChange = async (item: any, newStatus: string) => {
    if (newStatus === item.status) return;

    if (newStatus === "Postponed") {
      setSelectedStudent(item);
      setPostponeComment("");
      setIsPostponeOpen(true);
      return;
    }

    const updateData: any = {
      status: newStatus,
      previousStatus: item.status,
      updatedAt: new Date().toISOString()
    };

    if (newStatus === "No Show") {
      const count = (item.noShowCount || 0) + 1;
      updateData.noShowCount = count;
      toast({ title: "Moved to Sales", description: `Student ${item.studentName} marked as No Show and routed to Sales.` });
    } else if (newStatus === "Cancelled by Phone") {
      toast({ title: "Moved to Sales", description: `Student ${item.studentName} routed to Sales.` });
    } else if (newStatus === "No Answer") {
      toast({ title: "Status Updated", description: `Student ${item.studentName} marked as No Answer.` });
    }

    if (isSales && !salesStatuses.includes(newStatus)) {
      try {
        const admissionsQuery = query(collection(db, "employees"), where("role", "==", "Employee"), where("isActive", "==", true));
        const admissionsSnap = await getDocs(admissionsQuery);
        const allEligible = admissionsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
        const campusEligible = allEligible.filter(e => e.campus === item.campus);
        const finalEligible = campusEligible.length > 0 ? campusEligible : allEligible;

        if (finalEligible.length > 0) {
          finalEligible.sort((a, b) => a.id.localeCompare(b.id));
          const trackerId = `round_robin_revive_${item.campus?.replace(/\s+/g, '_').toLowerCase() || 'global'}`;
          const trackerRef = doc(db, "settings", trackerId);
          const trackerSnap = await getDoc(trackerRef);
          
          let targetIndex = 0;
          if (trackerSnap.exists()) {
            const lastId = trackerSnap.data().lastAssignedId;
            const lastIdx = finalEligible.findIndex(e => e.id === lastId);
            targetIndex = (lastIdx + 1) % finalEligible.length;
          }
          
          const selected = finalEligible[targetIndex];
          updateData.assignedEmployeeId = selected.id;
          updateData.assignedEmployeeName = selected.name || selected.firstName || "Admission Officer";
          
          setDocumentNonBlocking(trackerRef, {
            lastAssignedId: selected.id,
            lastAssignedName: selected.name || selected.firstName,
            type: "assignment_tracker",
            updatedAt: new Date().toISOString()
          }, { merge: true });
        }
      } catch (err) {
        console.error("Reassignment failed", err);
      }
    }

    updateDocumentNonBlocking(doc(db, "applications", item.id), updateData);
    toast({ title: t('status') + " Updated" });
  };

  const handleSavePostpone = async () => {
    if (!selectedStudent || !postponeComment.trim()) {
      toast({ variant: "destructive", title: "Comment Required" });
      return;
    }
    setIsSavingPostpone(true);
    try {
      const historyEntry = {
        status: "Postponed",
        previousStatus: selectedStudent.status,
        comment: postponeComment.trim(),
        changedAt: new Date().toISOString(),
        changedBy: employee?.name || user?.email?.split('@')[0] || "System"
      };

      await updateDoc(doc(db, "applications", selectedStudent.id), {
        status: "Postponed",
        previousStatus: selectedStudent.status,
        postponeComment: postponeComment.trim(),
        statusHistory: arrayUnion(historyEntry),
        updatedAt: new Date().toISOString()
      });

      toast({ title: "Status Updated", description: "Applicant moved to Postponed status." });
      setIsPostponeOpen(false);
    } catch (e) {
      console.error("Failed to save postpone status in applications:", e);
      toast({ variant: "destructive", title: "Error" });
    } finally {
      setIsSavingPostpone(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6 w-full max-w-full animate-in fade-in duration-500", isRTL && "font-arabic")}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-[#1a1a1a] font-serif">{t('applications_management')}</h1>
            {!isDirector && (userCampusName || userCampus) && (
              <Badge variant="outline" className="w-fit bg-blue-50 text-blue-700 border-blue-200 font-bold flex items-center gap-1.5 px-3 py-1 rounded-full text-xs shadow-xs">
                <MapPin className="h-3 w-3 text-blue-600" />
                <span>{userCampusName || userCampus}</span>
              </Badge>
            )}
          </div>
          <span className="text-xs font-bold text-slate-400">{t('total')}: {filteredData.length}</span>
        </div>
        <div className="flex items-center gap-2.5">
          <Button 
            id="open-online-form-btn"
            size="sm"
            onClick={() => window.open('https://blb-admin-staging.web.app/#/application', '_blank')}
            className="h-10 px-4 rounded-xl bg-[#0a1a3a] hover:bg-[#1a1a5a] text-white font-bold gap-2 shadow-md shadow-blue-900/10 text-xs"
          >
            <FileText className="h-4 w-4" />
            <span>{t('online_form') || "Online Form"}</span>
            <ExternalLink className="h-3.5 w-3.5 text-slate-300" />
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-2">
        {kpiData.map((kpi) => (
          <Card key={kpi.title} className={cn("overflow-hidden border border-gray-100 shadow-sm bg-white rounded-2xl border-l-8", kpi.color)}>
            <CardContent className="px-5 py-8">
              <div className="flex items-center justify-between">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{kpi.title}</span>
                  <span className="text-3xl font-black text-[#1a1a1a]">{kpi.value}</span>
                </div>
                <div className={cn("p-3 rounded-2xl", kpi.iconBg)}><kpi.icon className={cn("h-6 w-6", kpi.iconColor)} /></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-6">
        <div className="space-y-4">
          <div className="flex flex-col lg:flex-row gap-4 items-center">
            <div className="relative flex-1 w-full">
              <Search className={cn("absolute top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300", isRTL ? "right-4" : "left-4")} />
              <Input placeholder={t('search_placeholder')} className={cn("h-12 rounded-2xl bg-slate-50 border-transparent focus:bg-white focus:border-slate-100 transition-all shadow-none", isRTL ? "pr-11" : "pl-11")} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <div className="flex flex-wrap gap-2 w-full lg:w-auto">
              {/* Status Filter Popover */}
              <Popover open={isStatusPopoverOpen} onOpenChange={setIsStatusPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button 
                    id="filter-status-popover-btn"
                    variant="outline" 
                    className={cn(
                      "h-11 min-w-[190px] px-3.5 rounded-xl border font-bold text-xs transition-all flex items-center justify-between gap-2 shadow-sm",
                      selectedStatus !== "all" 
                        ? "border-blue-500 bg-blue-50/70 text-blue-700 ring-2 ring-blue-500/15" 
                        : "border-slate-200 text-slate-700 bg-white hover:bg-slate-50"
                    )}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Filter className={cn("h-3.5 w-3.5 shrink-0", selectedStatus !== "all" ? "text-blue-600" : "text-slate-400")} />
                      <span className="truncate">
                        {selectedStatus === "all" 
                          ? t('all_statuses') 
                          : (
                            isRTL 
                              ? (allSystemStatuses.find(s => s.key === selectedStatus)?.labelAr || selectedStatus)
                              : (allSystemStatuses.find(s => s.key === selectedStatus)?.labelEn || selectedStatus)
                          )}
                      </span>
                      {selectedStatus !== "all" && (
                        <Badge className="h-5 px-1.5 rounded-md bg-blue-600 text-white text-[10px] font-bold shrink-0">
                          {statusCounts[selectedStatus] || 0}
                        </Badge>
                      )}
                    </div>
                    {selectedStatus !== "all" ? (
                      <span 
                        role="button"
                        tabIndex={0}
                        className="p-0.5 rounded-md hover:bg-blue-200/60 text-blue-600 cursor-pointer shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedStatus("all");
                        }}
                        title={isRTL ? "إلغاء التصفية" : "Clear filter"}
                      >
                        <X className="h-3.5 w-3.5" />
                      </span>
                    ) : (
                      <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent 
                  className={cn("w-[340px] sm:w-[380px] p-0 rounded-2xl border border-slate-200 shadow-2xl overflow-hidden bg-white z-50", isRTL && "font-arabic")}
                  align={isRTL ? "end" : "start"}
                >
                  <div className="p-3 border-b border-slate-100 bg-slate-50/80 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Filter className="h-4 w-4 text-blue-600" />
                        <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                          {isRTL ? "تصفية بحالات النظام" : "Filter by Status"}
                        </span>
                      </div>
                      <span className="text-[11px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded-full border border-slate-200">
                        {accessibleApps.length} {isRTL ? "طلب" : "apps"}
                      </span>
                    </div>

                    <div className="relative">
                      <Search className={cn("absolute top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400", isRTL ? "right-3" : "left-3")} />
                      <Input 
                        placeholder={isRTL ? "ابحث عن أي حالة (عربي أو English)..." : "Search statuses..."}
                        className={cn("h-9 text-xs rounded-xl bg-white border-slate-200 focus:border-blue-400", isRTL ? "pr-8 pl-7" : "pl-8 pr-7")}
                        value={statusSearchQuery}
                        onChange={(e) => setStatusSearchQuery(e.target.value)}
                      />
                      {statusSearchQuery && (
                        <button 
                          type="button" 
                          onClick={() => setStatusSearchQuery("")}
                          className={cn("absolute top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1", isRTL ? "left-2" : "right-2")}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>

                    {/* Category Pills */}
                    <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[11px]">
                      {[
                        { id: "all", label: isRTL ? "الكل" : "All" },
                        { id: "assessment", label: isRTL ? "التقييم" : "Assess." },
                        { id: "interview", label: isRTL ? "المقابلات" : "Interview" },
                        { id: "approvals", label: isRTL ? "الاعتمادات" : "Approv." },
                        { id: "enrollment", label: isRTL ? "المالية" : "Finance" },
                        ...(canSeeSalesFollowupStatuses ? [{ id: "sales", label: isRTL ? "المتابعة" : "Follow-up" }] : []),
                      ].map(cat => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setSelectedStatusCategory(cat.id)}
                          className={cn(
                            "px-2.5 py-1 rounded-lg font-bold whitespace-nowrap transition-all text-[10px]",
                            selectedStatusCategory === cat.id
                              ? "bg-blue-600 text-white shadow-sm"
                              : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                          )}
                        >
                          {cat.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Scrollable list of statuses */}
                  <div className="max-h-[300px] overflow-y-auto p-2 space-y-1">
                    {/* Option: All Statuses */}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedStatus("all");
                        setIsStatusPopoverOpen(false);
                      }}
                      className={cn(
                        "w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-bold transition-colors text-left",
                        isRTL ? "text-right" : "text-left",
                        selectedStatus === "all"
                          ? "bg-blue-50 text-blue-700 font-black border border-blue-100"
                          : "text-slate-700 hover:bg-slate-50"
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="h-2.5 w-2.5 rounded-full bg-slate-400 shrink-0" />
                        <div>
                          <div className="font-bold">{isRTL ? "جميع الحالات (عرض الكل)" : "All Statuses (Show All)"}</div>
                          <div className="text-[10px] text-slate-400 font-normal">{isRTL ? "إجمالي كافة الطلبات المسجلة" : "All registered applications"}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="outline" className="bg-slate-100 text-slate-600 border-slate-200 text-[10px] px-2 py-0.5">
                          {accessibleApps.length}
                        </Badge>
                        {selectedStatus === "all" && <Check className="h-4 w-4 text-blue-600" />}
                      </div>
                    </button>

                    {/* Render status list */}
                    {filteredStatusList.length === 0 ? (
                      <div className="py-6 text-center text-xs text-slate-400 font-medium">
                        {isRTL ? "لم يتم العثور على أي حالة مطابقة" : "No matching statuses found"}
                      </div>
                    ) : (
                      filteredStatusList.map((st) => {
                        const count = statusCounts[st.key] || statusCounts[st.key.toLowerCase()] || 0;
                        const isSelected = selectedStatus === st.key;
                        return (
                          <button
                            key={st.key}
                            type="button"
                            onClick={() => {
                              setSelectedStatus(st.key);
                              setIsStatusPopoverOpen(false);
                            }}
                            className={cn(
                              "w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-bold transition-colors text-left",
                              isRTL ? "text-right" : "text-left",
                              isSelected
                                ? "bg-blue-50 text-blue-700 font-black border border-blue-200"
                                : "text-slate-700 hover:bg-slate-50"
                            )}
                          >
                            <div className="flex items-center gap-2.5 min-w-0 pr-2">
                              <span className={cn("px-2 py-0.5 rounded-md border text-[9px] font-black uppercase shrink-0", st.style || statusStyles[st.key] || "bg-slate-100 text-slate-600")}>
                                {st.key}
                              </span>
                              <div className="min-w-0">
                                <div className="font-bold truncate text-slate-800">
                                  {isRTL ? st.labelAr : st.labelEn}
                                </div>
                                {isRTL && st.labelAr !== st.labelEn && (
                                  <div className="text-[10px] text-slate-400 font-mono truncate">
                                    {st.labelEn}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-[10px] px-2 py-0.5 font-bold rounded-md",
                                  count > 0 
                                    ? "bg-blue-50 text-blue-700 border-blue-200" 
                                    : "bg-slate-50 text-slate-400 border-slate-100"
                                )}
                              >
                                {count}
                              </Badge>
                              {isSelected && <Check className="h-4 w-4 text-blue-600 shrink-0" />}
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>

                  {selectedStatus !== "all" && (
                    <div className="p-2 border-t border-slate-100 bg-slate-50/50 flex justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs font-bold text-slate-500 hover:text-rose-600 gap-1.5"
                        onClick={() => {
                          setSelectedStatus("all");
                          setIsStatusPopoverOpen(false);
                        }}
                      >
                        <RotateCcw className="h-3 w-3" />
                        {isRTL ? "إعادة تعيين الحالة إلى الكل" : "Reset to All Statuses"}
                      </Button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>

              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="h-11 w-[140px] rounded-xl border-slate-200 font-bold text-slate-600 bg-white">
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-slate-400" />
                    <SelectValue placeholder={t('type_label')} />
                  </div>
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all">{t('type_label')}</SelectItem>
                  <SelectItem value="New Commer">{t('new_commer')}</SelectItem>
                  <SelectItem value="Internal Transfer">{t('internal_transfer')}</SelectItem>
                </SelectContent>
              </Select>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="h-11 rounded-xl border-slate-200 font-bold text-slate-600 gap-2 bg-white px-4">
                    <CalendarIcon className="h-4 w-4 text-blue-500" /> 
                    {date?.from ? format(date.from, "LLL dd") : t('appointment')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 rounded-2xl overflow-hidden" align={isRTL ? "start" : "end"}>
                  <Calendar initialFocus mode="range" defaultMonth={date?.from} selected={date} onSelect={setDate} numberOfMonths={2} />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-2">
            {isDirector ? (
              <Select value={selectedCampus} onValueChange={setSelectedCampus}>
                <SelectTrigger className="h-10 w-[160px] rounded-xl border-slate-100 bg-slate-50/50 font-bold text-slate-500 text-xs">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5" />
                    <SelectValue placeholder={t('campus_label')} />
                  </div>
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all">{t('all_campuses')}</SelectItem>
                  {(campusData || []).map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            ) : (userCampusName || userCampus) ? (
              <div className="h-10 px-3.5 rounded-xl border border-blue-200 bg-blue-50/70 text-blue-800 font-bold text-xs flex items-center gap-2 shadow-xs">
                <MapPin className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                <span className="truncate">{userCampusName || userCampus}</span>
              </div>
            ) : null}

            <Select value={selectedSchool} onValueChange={setSelectedSchool}>
              <SelectTrigger className="h-10 w-[150px] rounded-xl border-slate-100 bg-slate-50/50 font-bold text-slate-500 text-xs">
                <div className="flex items-center gap-2">
                  <Building2 className="h-3.5 w-3.5" />
                  <SelectValue placeholder={t('school')} />
                </div>
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all">{t('all_schools')}</SelectItem>
                {schoolOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={selectedGrade} onValueChange={setSelectedGrade}>
              <SelectTrigger className="h-10 w-[130px] rounded-xl border-slate-100 bg-slate-50/50 font-bold text-slate-500 text-xs">
                <div className="flex items-center gap-2">
                  <GraduationCap className="h-3.5 w-3.5" />
                  <SelectValue placeholder={t('grades')} />
                </div>
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all">{t('all_grades')}</SelectItem>
                {(gradesData || []).map(g => (
                  <SelectItem key={g.id} value={g.name}>{g.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {isFiltering && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-10 w-10 text-rose-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                onClick={handleResetFilters}
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden overflow-x-auto">
        <Table>
          <TableHeader className="bg-slate-50/50">
            <TableRow className="hover:bg-transparent border-slate-100 h-16">
              <TableHead className={cn("font-black text-[#1a1a1a] text-[10px] uppercase tracking-tight", isRTL ? "text-right pr-6" : "text-left pl-6")}>{t('id')}</TableHead>
              <TableHead className={cn("font-black text-[#1a1a1a] text-[10px] uppercase tracking-tight", isRTL ? "text-right" : "text-left")}>{t('student_name')}</TableHead>
              <TableHead className={cn("font-black text-[#1a1a1a] text-[10px] uppercase tracking-tight", isRTL ? "text-right" : "text-left")}>{t('campus_label')}</TableHead>
              <TableHead className={cn("font-black text-[#1a1a1a] text-[10px] uppercase tracking-tight", isRTL ? "text-right" : "text-left")}>{t('school')}</TableHead>
              <TableHead className={cn("font-black text-[#1a1a1a] text-[10px] uppercase tracking-tight", isRTL ? "text-right" : "text-left")}>{t('parent_name')}</TableHead>
              <TableHead className={cn("font-black text-[#1a1a1a] text-[10px] uppercase tracking-tight", isRTL ? "text-right" : "text-left")}>{t('mother_name')}</TableHead>
              <TableHead className={cn("font-black text-[#1a1a1a] text-[10px] uppercase tracking-tight", isRTL ? "text-right" : "text-left")}>{t('grade')}</TableHead>
              <TableHead className={cn("font-black text-[#1a1a1a] text-[10px] uppercase tracking-tight", isRTL ? "text-right" : "text-left")}>{t('category')}</TableHead>
              <TableHead className={cn("font-black text-[#1a1a1a] text-[10px] uppercase tracking-tight", isRTL ? "text-right" : "text-left")}>{t('previous_status')}</TableHead>
              <TableHead className={cn("font-black text-[#1a1a1a] text-[10px] uppercase tracking-tight", isRTL ? "text-right" : "text-left")}>{t('days')}</TableHead>
              <TableHead className={cn("font-black text-[#1a1a1a] text-[10px] uppercase tracking-tight", isRTL ? "text-right" : "text-left")}>{t('status')}</TableHead>
              <TableHead className={cn("font-black text-[#1a1a1a] text-[10px] uppercase tracking-tight", isRTL ? "text-right" : "text-left")}>{t('appointment')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.length > 0 ? filteredData.map((item) => {
              const daysInProcess = differenceInDays(new Date(), new Date(item.applicationDate || item.createdAt || new Date()));
              
              return (
                <TableRow key={item.id} className="border-slate-50 h-20 hover:bg-slate-50/50 cursor-pointer" onClick={() => router.push(`/students/${item.id}`)}>
                  <TableCell className={cn("font-bold text-slate-500 uppercase text-[10px]", isRTL ? "pr-6" : "pl-6")}>{item.id}</TableCell>
                  <TableCell className={cn("font-bold text-slate-800 text-sm", isRTL ? "text-right" : "text-left")}>{formatName(item.studentName)}</TableCell>
                  <TableCell className={cn("text-slate-600 font-bold text-[10px] uppercase", isRTL ? "text-right" : "text-left")}><div className="flex items-center gap-1"><MapPin className="h-2.5 w-2.5 text-blue-400" /> {item.campus || '—'}</div></TableCell>
                  <TableCell className={cn("text-slate-600 font-bold text-[10px] uppercase", isRTL ? "text-right" : "text-left")}><div className="flex items-center gap-1"><Building2 className="h-2.5 w-2.5 text-emerald-400" /> {item.school || '—'}</div></TableCell>
                  <TableCell className={cn("text-slate-600 font-medium text-xs", isRTL ? "text-right" : "text-left")}>{formatName(item.fatherName || item.parentName)}</TableCell>
                  <TableCell className={cn("text-slate-600 font-medium text-xs", isRTL ? "text-right" : "text-left")}>{formatName(item.motherName)}</TableCell>
                  <TableCell className={cn("text-slate-500 font-bold text-xs", isRTL ? "text-right" : "text-left")}>{item.grade}</TableCell>
                  <TableCell className={cn("text-slate-800 font-bold text-xs", isRTL ? "text-right" : "text-left")}>
                    <div>{item.category || '—'}</div>
                    {item.category === "Internal Transfer" && item.previousCampus && (
                      <span className="text-[10px] text-purple-600 font-medium block whitespace-nowrap">
                        {t('previous_campus_label')}: {item.previousCampus}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className={isRTL ? "text-right" : "text-left"}>
                    <Badge variant="outline" className="font-bold px-3 py-1 rounded-full border text-[10px] bg-slate-50 text-slate-400 border-slate-100 italic">
                      {item.previousStatus || "—"}
                    </Badge>
                  </TableCell>
                  <TableCell className={isRTL ? "text-right" : "text-left"}>
                    <div className="flex items-center gap-1 text-slate-600 font-bold text-xs">
                      <Clock className="h-3.5 w-3.5 text-orange-500" />
                      {daysInProcess}d
                    </div>
                  </TableCell>
                  <TableCell onClick={e => e.stopPropagation()} className={isRTL ? "text-right" : "text-left"}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className={cn("inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-black uppercase transition-all focus:outline-none", statusStyles[item.status] || "bg-slate-100 border-slate-200 text-slate-600")}>
                          {item.status} <ChevronDown className="h-2.5 w-2.5 opacity-40" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align={isRTL ? "end" : "start"} className="w-72 rounded-xl shadow-2xl border-slate-100 p-1">
                        <ScrollArea className="h-80">
                          {allSystemStatuses.map(s => (
                            <DropdownMenuItem 
                              key={s.key} 
                              onClick={() => handleStatusChange(item, s.key)} 
                              className={cn(
                                "text-xs font-bold py-2 px-2.5 rounded-lg flex items-center justify-between gap-2 cursor-pointer",
                                item.status === s.key ? "bg-slate-100 font-black" : ""
                              )}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span className={cn("px-1.5 py-0.5 rounded text-[9px] font-black uppercase shrink-0", s.style || statusStyles[s.key] || "bg-slate-100 text-slate-700")}>
                                  {s.key}
                                </span>
                                <span className="truncate text-slate-700">{isRTL ? s.labelAr : s.labelEn}</span>
                              </div>
                              {item.status === s.key && <Check className="h-3.5 w-3.5 text-blue-600 shrink-0" />}
                            </DropdownMenuItem>
                          ))}
                        </ScrollArea>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                  <TableCell className={isRTL ? "text-right" : "text-left"}>
                    <div className="flex flex-col gap-0.5">
                      <span className="flex items-center gap-1 text-[10px] font-bold text-slate-700">
                        <CalendarIcon className="h-2.5 w-2.5 text-blue-500" /> {item.interviewDate || item.applicationDate || "—"}
                      </span>
                      <span className="flex items-center gap-1 text-[10px] font-medium text-slate-400">
                        <Clock className="h-2.5 w-2.5 text-emerald-500" /> {item.interviewTime || "—"}
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              );
            }) : (
              <TableRow>
                <TableCell colSpan={12} className="h-48 text-center text-slate-300 font-bold italic">
                  {isLoading ? t('syncing') : "No applications found matching the selected filters."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Postpone Dialog */}
      <Dialog open={isPostponeOpen} onOpenChange={setIsPostponeOpen}>
        <DialogContent className={cn("max-w-[420px] p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl", isRTL && "font-arabic")}>
          <div className="p-8 pb-4 bg-orange-50 border-b border-orange-100">
            <DialogHeader className="relative">
              <button onClick={() => setIsPostponeOpen(false)} className={cn("absolute top-0 h-6 w-6 text-orange-300 hover:text-orange-600 transition-colors", isRTL ? "left-0" : "right-0")}>
                <X className="h-5 w-5" />
              </button>
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center shrink-0 shadow-sm">
                  <Clock className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <DialogTitle className="text-2xl font-black text-[#1a1a1a] font-serif leading-tight">Postpone Applicant</DialogTitle>
                  <DialogDescription className="text-orange-700/60 font-medium mt-1">Please provide a reason for postponement.</DialogDescription>
                </div>
              </div>
            </DialogHeader>
          </div>
          <div className="p-8 space-y-6">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Postponement Comment *</Label>
              <Textarea 
                placeholder="Type here..." 
                className="min-h-[120px] rounded-2xl bg-slate-50 border-slate-100 focus-visible:ring-orange-500/20 resize-none font-medium p-4"
                value={postponeComment}
                onChange={(e) => setPostponeComment(e.target.value)}
              />
            </div>
          </div>
          <div className="p-8 pt-2 flex gap-3 bg-slate-50/50 border-t">
            <Button variant="outline" className="flex-1 h-12 rounded-xl font-bold" onClick={() => setIsPostponeOpen(false)}>Cancel</Button>
            <Button 
              className="flex-1 h-12 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold gap-2 shadow-lg shadow-orange-500/20" 
              onClick={handleSavePostpone}
              disabled={isSavingPostpone || !postponeComment.trim()}
            >
              {isSavingPostpone ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Confirm
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
