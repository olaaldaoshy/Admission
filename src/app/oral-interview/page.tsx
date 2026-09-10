
"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComp } from "@/components/ui/calendar";
import { 
  Search, 
  Calendar as CalendarIcon, 
  GraduationCap, 
  Building2,
  Clock,
  User,
  ChevronDown,
  CheckCircle2,
  XCircle,
  Pencil,
  Loader2,
  RotateCcw,
  CalendarDays,
  MessageSquare,
  Layers,
  Phone,
  MapPin,
  Briefcase,
  X,
  Save,
  AlertCircle,
  UserX,
  Send
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useFirestore, useCollection, useMemoFirebase, useUser, useEmployee, updateDocumentNonBlocking } from "@/firebase";
import { collection, doc, query, where, updateDoc, arrayUnion } from "firebase/firestore";
import { cn, parseLocalDate, isTimeSlotPast } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/context/language-context";
import { format, startOfDay, getDay, isBefore } from "date-fns";
import { DateRange } from "react-day-picker";

const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const isTimePast = (slotName: string, selectedDate: Date | undefined) => {
  return isTimeSlotPast(slotName, selectedDate);
};

const statusStyles: { [key: string]: string } = {
  "Oral Interview": "bg-blue-50 text-blue-600 border-blue-100",
  "Confirmed Interview": "bg-indigo-50 text-indigo-600 border-indigo-100",
  "Passed Parent Interview": "bg-blue-100 text-blue-700 border-blue-200",
  "Failed Parent Interview": "bg-rose-50 text-rose-700 border-rose-100",
  "Failed Oral Interview": "bg-rose-100 text-rose-800 border-rose-200",
  "Passed Oral Interview": "bg-emerald-100 text-emerald-800 border-emerald-200",
  "Approved by Director": "bg-emerald-50 text-emerald-700 border-emerald-100",
  "Declined": "bg-rose-50 text-rose-600 border-rose-100",
  "Postponed": "bg-orange-50 text-orange-600 border-orange-100",
  "Duplicate": "bg-slate-200 text-slate-700 border-slate-300",
  "No Answer": "bg-rose-50 text-rose-600 border-rose-100",
  "Cancelled by Phone": "bg-rose-50 text-rose-500 border-rose-100",
  "No Show": "bg-rose-100 text-rose-700 border-rose-200",
};

const formatName = (name: string) => {
  if (!name) return "—";
  const parts = name.trim().split(/\s+/);
  if (parts.length <= 2) return <span className="font-bold">{name}</span>;
  return (
    <div className="flex flex-col leading-tight">
      <span className="truncate font-bold">{parts.slice(0, 2).join(" ")}</span>
      <span className="text-[10px] opacity-50 font-normal truncate">{parts.slice(2).join(" ")}</span>
    </div>
  );
};

function OralInterviewContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const db = useFirestore();
  const { user } = useUser();
  const { isDirector, isManager, isSales, isSalesManager, campus: userCampus, employee } = useEmployee();
  const canSeeSalesFollowupStatuses = isDirector || isSales || isSalesManager;
  const { toast } = useToast();
  const { t, isRTL } = useLanguage();

  const currentTabParam = searchParams.get("tab") || "upcoming";
  const [activeTab, setActiveTab] = React.useState(currentTabParam);

  React.useEffect(() => {
    setActiveTab(currentTabParam);
  }, [currentTabParam]);

  const onTabChange = (val: string) => {
    setActiveTab(val);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", val);
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  const [searchTerm, setSearchTerm] = React.useState("");
  const [selectedGrade, setSelectedGrade] = React.useState("all");
  const [selectedSchool, setSelectedSchool] = React.useState("all");
  const [selectedType, setSelectedType] = React.useState("all");
  const [selectedStatus, setSelectedStatus] = React.useState("all");
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>(undefined);

  const [isRescheduleOpen, setIsRescheduleOpen] = React.useState(false);
  const [selectedStudent, setSelectedStudent] = React.useState<any>(null);
  const [rescheduleDate, setRescheduleDate] = React.useState<Date | undefined>(undefined);
  const [selectedRescheduleTime, setSelectedRescheduleTime] = React.useState<string>("");
  const [isSavingReschedule, setIsSavingReschedule] = React.useState(false);
  const [rescheduleModalMode, setRescheduleModalMode] = React.useState<'reschedule' | 're_exam'>('reschedule');

  const [isPostponeOpen, setIsPostponeOpen] = React.useState(false);
  const [postponeComment, setPostponeComment] = React.useState("");
  const [isSavingPostpone, setIsSavingPostpone] = React.useState(false);

  const appsQuery = useMemoFirebase(() => user ? collection(db, "applications") : null, [db, user]);
  const { data: appsData } = useCollection(appsQuery);
  const applications = appsData || [];

  const settingsQuery = useMemoFirebase(() => user ? collection(db, "settings") : null, [db, user]);
  const { data: settingsDataRaw } = useCollection(settingsQuery);
  const allSettings = (settingsDataRaw || []).filter(Boolean);

  const gradesQuery = useMemoFirebase(() => user ? collection(db, "grade") : null, [db, user]);
  const { data: gradesDataRaw } = useCollection(gradesQuery);
  const gradesData = gradesDataRaw || [];

  const schoolsQuery = useMemoFirebase(() => user ? collection(db, "schools") : null, [db, user]);
  const { data: schoolsDataRaw } = useCollection(schoolsQuery);
  const schoolsData = schoolsDataRaw || [];

  const filteredData = React.useMemo(() => {
    return (applications || []).filter((item) => {
      const status = item.status || "";
      const statusLower = status.toLowerCase();
      
      if (statusLower.includes("cancelled by phone") || statusLower.includes("no show") || statusLower.includes("returned to sales") || statusLower === "postponed") {
        return false;
      }

      if (!isDirector) {
        if (userCampus) {
          const target = userCampus.trim().toLowerCase();
          const appCampus = item.campus ? String(item.campus).trim().toLowerCase() : "";
          const appSchool = item.school ? String(item.school).trim().toLowerCase() : "";
          if (appCampus !== target && appSchool !== target) return false;
        } else if (item.assignedEmployeeId !== user?.uid) {
          return false;
        }
      }

      let matchesTab = false;
      if (activeTab === "upcoming") {
        const hasAssessmentRetest = (item.retestTypes || []).includes("Assessment Retest") || (item.retestTypes || []).includes("Interview Retest");
        const isOralRetestOnly = (item.retestTypes || []).includes("Oral Interview Retest") && !hasAssessmentRetest;

        if (status === "No Answer") {
          matchesTab = !item.previousStatus || ["Oral Interview", "Confirmed Interview", "Duplicate"].includes(item.previousStatus);
        } else {
          matchesTab = ["Oral Interview", "Confirmed Interview", "Duplicate"].includes(status) ||
            (status === "Applicant" && !!item.oralInterviewDate && (item.rescheduleHistory || []).some((h: any) => h.type === "Oral Interview")) ||
            isOralRetestOnly;
        }
      } else if (activeTab === "results") {
        if (status === "No Answer") {
          matchesTab = ["Passed Parent Interview", "Duplicate"].includes(item.previousStatus);
        } else {
          matchesTab = ["Passed Parent Interview", "Duplicate"].includes(status);
        }
      } else if (activeTab === "approved") {
        matchesTab = ["Passed Oral Interview", "Approved by Director", "Duplicate"].includes(status);
      } else if (activeTab === "rejected") {
        matchesTab = ["Failed Parent Interview", "Failed Oral Interview", "Declined", "Duplicate"].includes(status);
      }

      if (!matchesTab) return false;

      const matchesSearch = item.studentName?.toLowerCase().includes(searchTerm.toLowerCase()) || item.id.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchesSearch) return false;
      
      if (selectedGrade !== "all" && item.grade !== selectedGrade) return false;
      if (selectedSchool !== "all" && item.school !== selectedSchool) return false;
      if (selectedType !== "all" && item.category !== selectedType) return false;
      if (selectedStatus !== "all" && item.status !== selectedStatus) return false;

      if (dateRange?.from || dateRange?.to) {
        const appDateStr = item.oralInterviewDate || item.interviewDate || item.applicationDate;
        if (!appDateStr) return false;
        const appDate = new Date(appDateStr);
        const from = dateRange?.from ? new Date(dateRange.from) : null;
        const to = dateRange?.to ? new Date(dateRange.to) : null;
        if(from) from.setHours(0,0,0,0);
        if(to) to.setHours(23,59,59,999);
        if ((from && appDate < from) || (to && appDate > to)) return false;
      }

      return true;
    }).sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  }, [applications, searchTerm, activeTab, isDirector, isManager, userCampus, user, selectedGrade, selectedSchool, selectedType, selectedStatus, dateRange]);

  const isFiltering = React.useMemo(() => {
    return searchTerm !== "" || selectedGrade !== "all" || selectedSchool !== "all" || selectedType !== "all" || selectedStatus !== "all" || !!dateRange;
  }, [searchTerm, selectedGrade, selectedSchool, selectedType, selectedStatus, dateRange]);

  const handleResetFilters = () => {
    setSearchTerm("");
    setSelectedGrade("all");
    setSelectedSchool("all");
    setSelectedType("all");
    setSelectedStatus("all");
    setDateRange(undefined);
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
      toast({ title: "Moved to Sales", description: `Student ${item.studentName} marked as No Show and routed to Sales queue.` });
    } else if (newStatus === "Cancelled by Phone") {
      toast({ title: "Moved to Sales", description: `Student ${item.studentName} has been routed to Sales queue.` });
    } else if (newStatus === "No Answer") {
      toast({ title: "Status Updated", description: `Student ${item.studentName} marked as No Answer.` });
    }

    await updateDoc(doc(db, "applications", item.id), updateData);
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
      console.error("Failed to save postpone status in oral-interview:", e);
      toast({ variant: "destructive", title: "Error" });
    } finally {
      setIsSavingPostpone(false);
    }
  };

  const handleOpenReschedule = (student: any, mode: 'reschedule' | 're_exam' = 'reschedule') => {
    setSelectedStudent(student);
    setRescheduleModalMode(mode);
    setRescheduleDate(undefined);
    setSelectedRescheduleTime("");
    setIsRescheduleOpen(true);
  };

  const handleSaveReschedule = async () => {
    if (!selectedStudent || !rescheduleDate || !selectedRescheduleTime) {
      toast({ variant: "destructive", title: "Incomplete", description: "Please select date and time." });
      return;
    }
    setIsSavingReschedule(true);
    try {
      if (rescheduleModalMode === 're_exam') {
        const isFailedOral = selectedStudent.status === "Failed Oral Interview";
        const history = selectedStudent.reExamHistory || [];
        const newEntry = {
          previousDate: selectedStudent.oralInterviewDate || 'None',
          previousTime: selectedStudent.oralInterviewTime || 'None',
          newDate: format(rescheduleDate, "yyyy-MM-dd"),
          newTime: selectedRescheduleTime,
          changedAt: new Date().toISOString(),
          changedBy: employee?.name || user?.email?.split('@')[0] || "System",
          type: isFailedOral ? "Re-Exam Student Oral Interview" : "Re-Exam Parent Interview"
        };

        const updatedHistory = [...history, newEntry];

        if (isFailedOral) {
          const previousStudentAttempt = (selectedStudent.studentInterviewScoreObtained !== undefined && selectedStudent.studentInterviewScoreObtained !== null && selectedStudent.studentInterviewScoreObtained !== "" && selectedStudent.studentInterviewScoreObtained !== 0) || (selectedStudent.studentInterviewScores && Object.keys(selectedStudent.studentInterviewScores).length > 0) ? {
            type: "Student Oral Interview",
            status: selectedStudent.status || "Failed Oral Interview",
            result: selectedStudent.studentInterviewResult || "Failed",
            scoreObtained: selectedStudent.studentInterviewScoreObtained || 0,
            scores: selectedStudent.studentInterviewScores || {},
            comments: selectedStudent.studentInterviewItemComments || {},
            savedBy: employee?.name || user?.email?.split('@')[0] || "Principal",
            createdAt: selectedStudent.updatedAt || new Date().toISOString(),
            date: selectedStudent.oralInterviewDate || format(new Date(), "yyyy-MM-dd"),
            time: selectedStudent.oralInterviewTime || format(new Date(), "HH:mm")
          } : null;

          const updatedStudentOralHistory = previousStudentAttempt 
            ? [...(selectedStudent.studentOralHistory || []), previousStudentAttempt]
            : (selectedStudent.studentOralHistory || []);

          // Failed Oral Interview -> Re-exam routes to Student Interview tab ("results") with status "Passed Parent Interview"
          await updateDoc(doc(db, "applications", selectedStudent.id), {
            status: "Passed Parent Interview",
            previousStatus: selectedStudent.status,
            oralInterviewDate: format(rescheduleDate, "yyyy-MM-dd"),
            oralInterviewTime: selectedRescheduleTime,
            reExamHistory: updatedHistory,
            reExamCount: updatedHistory.length,
            studentOralHistory: updatedStudentOralHistory,
            studentInterviewScores: {},
            studentInterviewDraftScores: {},
            studentInterviewItemComments: {},
            studentInterviewDraftComments: {},
            studentInterviewScoreObtained: 0,
            studentInterviewResult: null,
            updatedAt: new Date().toISOString()
          });

          try {
            localStorage.removeItem(`student_scores_${selectedStudent.id}_student`);
            localStorage.removeItem(`student_comments_${selectedStudent.id}_student`);
          } catch (e) {
            console.error("Local storage error on student re-exam reset:", e);
          }

          toast({ 
            title: isRTL ? "تم تحديد موعد إعادة مقابلة الطالب" : "Student Interview Re-Exam Scheduled", 
            description: isRTL 
              ? `تم تحويل الطالب ${selectedStudent.studentName} إلى مرحلة مقابلة الطالب بنجاح.` 
              : `Student ${selectedStudent.studentName} routed to Student Interview queue.` 
          });

          setIsRescheduleOpen(false);
          setRescheduleDate(undefined);
          setSelectedRescheduleTime("");
          setSelectedStatus("all");
          onTabChange("results");
          return;
        } else {
          const previousParentAttempt = (selectedStudent.oralScoreObtained !== undefined && selectedStudent.oralScoreObtained !== null && selectedStudent.oralScoreObtained !== "" && selectedStudent.oralScoreObtained !== 0) || (selectedStudent.oralScores && Object.keys(selectedStudent.oralScores).length > 0) ? {
            type: "Parent Oral Interview",
            status: selectedStudent.status || "Failed Parent Interview",
            result: selectedStudent.oralResult || "Failed",
            scoreObtained: selectedStudent.oralScoreObtained || 0,
            scores: selectedStudent.oralScores || {},
            comments: selectedStudent.oralItemComments || {},
            savedBy: employee?.name || user?.email?.split('@')[0] || "Principal",
            createdAt: selectedStudent.updatedAt || new Date().toISOString(),
            date: selectedStudent.oralInterviewDate || format(new Date(), "yyyy-MM-dd"),
            time: selectedStudent.oralInterviewTime || format(new Date(), "HH:mm")
          } : null;

          const updatedParentOralHistory = previousParentAttempt
            ? [...(selectedStudent.parentOralHistory || []), previousParentAttempt]
            : (selectedStudent.parentOralHistory || []);

          // Declined / Failed Parent Interview -> Re-exam routes to Parent Interview tab ("upcoming") with status "Oral Interview"
          await updateDoc(doc(db, "applications", selectedStudent.id), {
            status: "Oral Interview",
            previousStatus: selectedStudent.status,
            oralInterviewDate: format(rescheduleDate, "yyyy-MM-dd"),
            oralInterviewTime: selectedRescheduleTime,
            reExamHistory: updatedHistory,
            reExamCount: updatedHistory.length,
            parentOralHistory: updatedParentOralHistory,
            oralResult: "Pending",
            oralScores: {},
            oralDraftScores: {},
            oralItemComments: {},
            oralDraftComments: {},
            oralScoreObtained: 0,
            updatedAt: new Date().toISOString()
          });

          try {
            localStorage.removeItem(`assessment_scores_${selectedStudent.id}_admissions`);
            localStorage.removeItem(`assessment_comments_${selectedStudent.id}_admissions`);
          } catch (e) {
            console.error("Local storage error on parent re-exam reset:", e);
          }

          toast({ 
            title: isRTL ? "تم تحديد موعد إعادة مقابلة ولي الأمر" : "Parent Interview Re-Exam Scheduled", 
            description: isRTL 
              ? `تم تحويل الطالب ${selectedStudent.studentName} إلى مرحلة مقابلة ولي الأمر بنجاح.` 
              : `Student ${selectedStudent.studentName} routed to Parent Interview queue.` 
          });

          setIsRescheduleOpen(false);
          setRescheduleDate(undefined);
          setSelectedRescheduleTime("");
          setSelectedStatus("all");
          onTabChange("upcoming");
          return;
        }
      } else {
        const history = selectedStudent.rescheduleHistory || [];
        const newEntry = {
          previousDate: selectedStudent.oralInterviewDate || 'None',
          previousTime: selectedStudent.oralInterviewTime || 'None',
          newDate: format(rescheduleDate, "yyyy-MM-dd"),
          newTime: selectedRescheduleTime,
          changedAt: new Date().toISOString(),
          changedBy: employee?.name || user?.email?.split('@')[0] || "System",
          type: "Oral Interview"
        };

        const updatedHistory = [...history, newEntry];
        const rescheduleCount = updatedHistory.length;

        // 2 normal reschedules allowed. On the 3rd reschedule, status becomes "No Show" (routing directly to Sales)
        const isMaxReschedules = rescheduleCount >= 3;
        const newStatus = isMaxReschedules ? "No Show" : "Oral Interview";

        await updateDoc(doc(db, "applications", selectedStudent.id), {
          status: newStatus,
          previousStatus: selectedStudent.status,
          oralInterviewDate: format(rescheduleDate, "yyyy-MM-dd"),
          oralInterviewTime: selectedRescheduleTime,
          rescheduleHistory: updatedHistory,
          rescheduleCount: rescheduleCount,
          ...(isMaxReschedules ? { noShowCount: (selectedStudent.noShowCount || 0) + 1 } : {}),
          updatedAt: new Date().toISOString()
        });

        if (isMaxReschedules) {
          toast({ 
            variant: "destructive", 
            title: isRTL ? "تم بلوغ الحد الأقصى لإعادة الجدولة" : "Maximum Reschedules Reached", 
            description: isRTL 
              ? `الطالب ${selectedStudent.studentName} وصل لـ 3 مرات إعادة جدولة. تم تحويل الحالة إلى عدم حضور (No Show) وتوجيهه للمبيعات.`
              : `Student ${selectedStudent.studentName} reached 3 reschedules. Status set to No Show and routed to Sales.` 
          });
        } else {
          toast({ 
            title: isRTL ? "تم تحديث موعد المقابلة" : "Appointment Updated", 
            description: isRTL 
              ? `تمت إعادة جدولة المقابلة الشفهية للطالب ${selectedStudent.studentName} بنجاح إلى ${format(rescheduleDate, "yyyy-MM-dd")} الساعة ${selectedRescheduleTime}. (إعادة جدولة ${rescheduleCount}/2)`
              : `Oral interview rescheduled for ${selectedStudent.studentName} to ${format(rescheduleDate, "yyyy-MM-dd")} at ${selectedRescheduleTime}. (Reschedule ${rescheduleCount}/2)` 
          });
        }

        setIsRescheduleOpen(false);

        // Stay on current page and switch to "Parent Interview" (upcoming) tab if not routed to sales
        if (!isMaxReschedules) {
          onTabChange("upcoming");
        }
      }
    } catch (e) {
      console.error("Failed to reschedule in oral-interview:", e);
      toast({ variant: "destructive", title: "Error", description: "Failed to reschedule." });
    } finally {
      setIsSavingReschedule(false);
    }
  };

  const rescheduleOccupancy = React.useMemo(() => {
    if (!rescheduleDate) return {};
    const fmt = format(rescheduleDate, "yyyy-MM-dd");
    const counts: Record<string, number> = {};
    (applications || []).forEach(a => {
      if (a.oralInterviewDate === fmt && a.oralInterviewTime) {
        counts[a.oralInterviewTime] = (counts[a.oralInterviewTime] || 0) + 1;
      }
    });
    return counts;
  }, [rescheduleDate, applications]);

  const rescheduleSlots = React.useMemo(() => {
    if (!rescheduleDate) return [];
    const fmt = format(rescheduleDate, "yyyy-MM-dd");
    return (allSettings || [])
      .filter(s => s.type === "oral_time" && (s.date === fmt || (!s.date && s.day === dayNames[getDay(rescheduleDate)])))
      .map(s => ({
        ...s,
        isFull: (rescheduleOccupancy[s.name] || 0) >= (parseInt(s.capacity) || 1),
        isPast: isTimePast(s.name, rescheduleDate)
      }))
      .filter(slot => !slot.isPast);
  }, [rescheduleDate, allSettings, rescheduleOccupancy]);

  const availableRescheduleDates = React.useMemo(() => {
    const dates = new Set<string>();
    const recurringDays = new Set<string>();
    (allSettings || []).filter(s => s.type === "oral_time").forEach(s => {
      if (s.date) dates.add(s.date);
      else if (s.day) recurringDays.add(s.day);
    });
    return { dates, recurringDays };
  }, [allSettings]);

  const StudentTable = ({ data, tab }: { data: any[], tab: string }) => {
    const allowedStatuses = React.useMemo(() => {
      let statuses: string[] = [];
      if (tab === 'upcoming') statuses = ["Oral Interview", "Confirmed Interview", "Passed Parent Interview", "Failed Parent Interview", "Postponed", "Duplicate", "Cancelled by Phone", "No Answer", "No Show"];
      else if (tab === 'results') statuses = ["Passed Parent Interview", "Passed Oral Interview", "Failed Oral Interview", "Duplicate", "Cancelled by Phone", "No Answer", "No Show"];
      else if (tab === 'approved') statuses = ["Passed Oral Interview", "Approved by Director", "Cancelled by Phone", "Duplicate", "No Show"];
      else if (tab === 'rejected') statuses = ["Failed Parent Interview", "Failed Oral Interview", "Declined", "Approved by Director", "Cancelled by Phone", "Duplicate", "No Show"];
      
      if (!canSeeSalesFollowupStatuses) {
        statuses = statuses.filter(s => s !== "No Show" && s !== "Cancelled by Phone" && s !== "Canceled by Phone");
      }
      return statuses;
    }, [tab, canSeeSalesFollowupStatuses]);

    return (
      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden overflow-x-auto">
        <Table>
          <TableHeader className="bg-slate-50/50">
            <TableRow className="h-14 border-slate-100">
              <TableHead className={cn("font-bold text-[#1a1a1a] text-[10px] uppercase", isRTL ? "pr-8 text-right" : "pl-8 text-left")}>{t('id')}</TableHead>
              <TableHead className={cn("font-bold text-[#1a1a1a] text-[10px] uppercase", isRTL ? "text-right" : "text-left")}>{t('student_name')}</TableHead>
              <TableHead className={cn("font-bold text-[#1a1a1a] text-[10px] uppercase", isRTL ? "text-right" : "text-left")}>{t('campus_label')}</TableHead>
              <TableHead className={cn("font-bold text-[#1a1a1a] text-[10px] uppercase", isRTL ? "text-right" : "text-left")}>{t('school')}</TableHead>
              <TableHead className={cn("font-bold text-[#1a1a1a] text-[10px] uppercase", isRTL ? "text-right" : "text-left")}>{t('type_label')}</TableHead>
              <TableHead className={cn("font-bold text-[#1a1a1a] text-[10px] uppercase", isRTL ? "text-right" : "text-left")}>{t('father_name')}</TableHead>
              <TableHead className={cn("font-bold text-[#1a1a1a] text-[10px] uppercase", isRTL ? "text-right" : "text-left")}>{t('mother_name')}</TableHead>
              <TableHead className={cn("font-bold text-[#1a1a1a] text-[10px] uppercase", isRTL ? "text-right" : "text-left")}>{t('contact_info_header')}</TableHead>
              <TableHead className={cn("font-bold text-[#1a1a1a] text-[10px] uppercase", isRTL ? "text-right" : "text-left")}>{t('grade')}</TableHead>
              
              {tab === 'upcoming' && <TableHead className={cn("font-bold text-[#1a1a1a] text-[10px] uppercase text-center")}>{t('parents_interview')} Score</TableHead>}
              {tab === 'results' && <TableHead className={cn("font-bold text-[#1a1a1a] text-[10px] uppercase text-center")}>{t('student_interview')} Score</TableHead>}

              <TableHead className={cn("font-bold text-[#1a1a1a] text-[10px] uppercase", isRTL ? "text-right" : "text-left")}>{t('interviewer')}</TableHead>
              <TableHead className={cn("font-bold text-[#1a1a1a] text-[10px] uppercase", isRTL ? "text-right" : "text-left")}>{t('previous_status')}</TableHead>
              <TableHead className={cn("font-bold text-[#1a1a1a] text-[10px] uppercase", isRTL ? "text-right" : "text-left")}>{t('status')}</TableHead>
              <TableHead className={cn("font-bold text-[#1a1a1a] text-[10px] uppercase", isRTL ? "text-right" : "text-left")}>{t('oral_appointment')}</TableHead>
              <TableHead className="font-bold text-[#1a1a1a] text-[10px] uppercase text-center">{t('actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length > 0 ? data.map(item => (
              <TableRow key={item.id} className="h-20 border-slate-50 hover:bg-slate-50/50 cursor-pointer" onClick={() => router.push(`/students/${item.id}`)}>
                <TableCell className={cn("font-bold text-slate-400 text-[11px] uppercase", isRTL ? "pr-8" : "pl-8")}>{item.id}</TableCell>
                <TableCell className={cn("font-bold text-slate-800 text-sm", isRTL ? "text-right" : "text-left")}>{formatName(item.studentName)}</TableCell>
                <TableCell className={cn("text-slate-600 font-bold text-[10px] uppercase", isRTL ? "text-right" : "text-left")}><div className="flex items-center gap-1"><MapPin className="h-2.5 w-2.5 text-blue-400" /> {item.campus || '—'}</div></TableCell>
                <TableCell className={cn("text-slate-600 font-bold text-[10px] uppercase", isRTL ? "text-right" : "text-left")}><div className="flex items-center gap-1"><Building2 className="h-2.5 w-2.5 text-emerald-400" /> {item.school || '—'}</div></TableCell>
                <TableCell className={cn("text-slate-700 font-bold text-xs", isRTL ? "text-right" : "text-left")}>{item.category || '—'}</TableCell>
                <TableCell className={cn("text-slate-600 font-medium text-xs", isRTL ? "text-right" : "text-left")}>{formatName(item.fatherName)}</TableCell>
                <TableCell className={cn("text-slate-600 font-medium text-xs", isRTL ? "text-right" : "text-left")}>{formatName(item.motherName)}</TableCell>
                <TableCell className={isRTL ? "text-right" : "text-left"}>
                  <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                    <Phone className="h-3.5 w-3.5 text-emerald-500" />
                    {item.primaryContactPhone || item.fatherPhone || item.motherPhone || '—'}
                  </div>
                </TableCell>
                <TableCell className={cn("text-slate-500 font-bold text-xs", isRTL ? "text-right" : "text-left")}>{item.grade}</TableCell>
                
                {tab === 'upcoming' && (
                  <TableCell className="text-center">
                    <Badge variant="outline" className={cn("font-black px-2 py-0.5 rounded-lg text-[10px]", item.oralScoreObtained ? "bg-blue-50 text-blue-600 border-blue-100" : "bg-slate-50 text-slate-300 border-slate-100")}>
                      {item.oralScoreObtained ? parseFloat(item.oralScoreObtained).toFixed(2) : "—"}
                    </Badge>
                  </TableCell>
                )}
                {tab === 'results' && (
                  <TableCell className="text-center">
                    <Badge variant="outline" className={cn("font-black px-2 py-0.5 rounded-lg text-[10px]", item.studentInterviewScoreObtained ? "bg-blue-50 text-blue-600 border-blue-100" : "bg-slate-50 text-slate-300 border-slate-100")}>
                      {item.studentInterviewScoreObtained ? parseFloat(item.studentInterviewScoreObtained).toFixed(2) : "—"}
                    </Badge>
                  </TableCell>
                )}

                <TableCell onClick={e => e.stopPropagation()} className={isRTL ? "text-right" : "text-left"}>
                   <Input 
                    className="h-10 w-40 bg-slate-50 border-slate-200 focus:bg-white focus:border-blue-500 text-[11px] font-medium transition-all text-center rounded-xl"
                    placeholder="Enter Interviewer"
                    defaultValue={item.oralInterviewer || ""}
                    onBlur={(e) => {
                      const newVal = e.target.value;
                      if (newVal !== item.oralInterviewer) {
                        updateDocumentNonBlocking(doc(db, "applications", item.id), { oralInterviewer: newVal });
                        toast({ title: "Interviewer Updated" });
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        (e.target as HTMLInputElement).blur();
                      }
                    }}
                   />
                </TableCell>
                <TableCell className={isRTL ? "text-right" : "text-left"}>
                  <Badge variant="outline" className="font-bold px-2.5 py-0.5 rounded-lg border text-[10px] bg-slate-50 text-slate-400 border-slate-100 italic">
                    {item.previousStatus || "—"}
                  </Badge>
                </TableCell>
                <TableCell onClick={e => e.stopPropagation()} className={isRTL ? "text-right" : "text-left"}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><button className={cn("inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[10px] font-bold focus:outline-none", statusStyles[item.status] || "bg-slate-50 text-slate-600 border-slate-100")}>{item.status} <ChevronDown className="h-3 w-3 opacity-40" /></button></DropdownMenuTrigger>
                    <DropdownMenuContent align={isRTL ? "end" : "start"} className="w-56 rounded-xl shadow-2xl border-slate-100">
                      <ScrollArea className="h-64">{allowedStatuses.map(s => (<DropdownMenuItem key={s} onClick={() => handleStatusChange(item, s)} className="text-xs font-bold py-2.5">{s}</DropdownMenuItem>))}</ScrollArea>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
                <TableCell className={cn("text-[10px] font-medium text-slate-600", isRTL ? "text-right" : "text-left")}>
                  <div className="flex flex-col gap-0.5">
                    <span className="flex items-center gap-1 font-bold text-slate-700"><CalendarIcon className="h-2.5 w-2.5 text-blue-500" /> {item.oralInterviewDate || '—'}</span>
                    <span className="flex items-center gap-1 text-slate-400 font-medium"><Clock className="h-2.5 w-2.5 text-emerald-500" /> {item.oralInterviewTime || '—'}</span>
                  </div>
                </TableCell>
                <TableCell className="text-center" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center justify-center gap-2">
                    {tab === 'upcoming' && (
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" className="h-9 px-4 bg-white hover:bg-slate-50 border-slate-200 text-slate-700 font-bold text-xs rounded-xl shadow-sm" onClick={() => router.push(`/principal-parent-assessment?id=${item.id}`)}>
                          <Pencil className="h-3.5 w-3.5" /> {t('parent_form')}
                        </Button>
                        <Button variant="outline" size="sm" className="h-9 px-4 bg-white hover:bg-slate-50 border-slate-200 text-slate-700 font-bold text-xs rounded-xl shadow-sm" onClick={() => handleOpenReschedule(item, 'reschedule')}>
                          <RotateCcw className="h-3.5 w-3.5" /> {t('reschedule')}
                        </Button>
                        <Button variant="outline" size="sm" className="h-9 px-4 bg-rose-50 hover:bg-rose-100 border-rose-100 text-rose-600 font-bold text-xs rounded-xl shadow-sm" onClick={() => handleStatusChange(item, "No Show")}>
                          <UserX className="h-3.5 w-3.5" /> {t('no_show')}
                        </Button>
                      </div>
                    )}
                    {tab === 'results' && (
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" className="h-9 px-5 bg-blue-600 hover:bg-blue-700 border-blue-600 text-white font-bold text-xs rounded-xl shadow-sm" onClick={() => router.push(`/principal-student-assessment?id=${item.id}`)}>
                          <Pencil className="h-3.5 w-3.5" /> {t('student_form')}
                        </Button>
                        <Button variant="outline" size="sm" className="h-9 px-4 bg-white hover:bg-slate-50 border-slate-200 text-slate-700 font-bold text-xs rounded-xl shadow-sm" onClick={() => handleOpenReschedule(item, 'reschedule')}>
                          <RotateCcw className="h-3.5 w-3.5" /> {t('reschedule')}
                        </Button>
                        <Button variant="outline" size="sm" className="h-9 px-4 bg-rose-50 hover:bg-rose-100 border-rose-100 text-rose-600 font-bold text-xs rounded-xl shadow-sm" onClick={() => handleStatusChange(item, "No Show")}>
                          <UserX className="h-3.5 w-3.5" /> {t('no_show')}
                        </Button>
                      </div>
                    )}
                    {(tab === 'approved' || tab === 'rejected') && (
                      <div className="flex items-center gap-2">
                        {tab === 'rejected' && (
                          <Button variant="outline" size="sm" className="h-9 px-4 bg-white hover:bg-slate-50 border-slate-200 text-slate-700 font-bold text-xs rounded-xl shadow-sm" onClick={() => handleOpenReschedule(item, 're_exam')}>
                            <RotateCcw className="h-3.5 w-3.5" /> {t('re_exam')}
                          </Button>
                        )}
                        <Button variant="outline" size="sm" className="h-9 px-4 border-slate-200 text-slate-600 hover:bg-slate-50 font-bold rounded-xl gap-2 shadow-sm text-xs" onClick={() => toast({ title: "Update Sent" })}>
                            <Send className="h-3.5 w-3.5" /> Send Update
                        </Button>
                        {tab === 'rejected' && isDirector && (
                           <Button variant="outline" size="sm" className="h-9 px-4 bg-emerald-600 hover:bg-emerald-700 border-emerald-600 text-white font-bold text-xs rounded-xl shadow-sm" onClick={() => handleStatusChange(item, "Approved by Director")}>
                            <CheckCircle2 className="h-3.5 w-3.5" /> {t('approve')}
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            )) : <TableRow><TableCell colSpan={14} className="h-48 text-center text-slate-300 font-bold italic">No candidates found.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>
    );
  };

  return (
    <div className={cn("flex flex-col gap-6 w-full max-w-full animate-in fade-in duration-500", isRTL && "font-arabic")}>
      <h1 className="text-3xl font-black text-[#1a1a1a] font-serif">{t('oral_queue')}</h1>
      <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
        <TabsList className="bg-slate-100/60 p-1.5 rounded-full w-full flex mb-8 h-auto">
          <TabsTrigger value="upcoming" className="flex-1 rounded-full px-6 py-3 data-[state=active]:bg-white text-slate-600 text-xs font-bold uppercase">{t('parent_interview')}</TabsTrigger>
          <TabsTrigger value="results" className="flex-1 rounded-full px-6 py-3 data-[state=active]:bg-white text-slate-600 text-xs font-bold uppercase">{t('student_interview')}</TabsTrigger>
          <TabsTrigger value="approved" className="flex-1 rounded-full px-6 py-3 data-[state=active]:bg-white text-slate-600 text-xs font-bold uppercase">{t('passed_interview')}</TabsTrigger>
          <TabsTrigger value="rejected" className="flex-1 rounded-full px-6 py-3 data-[state=active]:bg-white text-slate-600 text-xs font-bold uppercase">{t('failed_interview')}</TabsTrigger>
        </TabsList>
        <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1"><Search className={cn("absolute top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400", isRTL ? "right-4" : "left-4")} /><Input placeholder={t('search_students')} className={cn("h-12 rounded-2xl bg-slate-50/50 border-slate-100 focus:bg-white transition-all shadow-none", isRTL ? "pr-11" : "pl-11")} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div>
            <div className="flex flex-wrap gap-2">
              <Select value={selectedGrade} onValueChange={setSelectedGrade}><SelectTrigger className="h-12 w-[130px] rounded-xl border-slate-100 bg-white font-bold text-slate-600"><SelectValue placeholder={t('grades')} /></SelectTrigger><SelectContent className="rounded-xl"><SelectItem value="all">{t('all_grades')}</SelectItem>{(gradesData || []).map(g => <SelectItem key={g.id} value={g.name}>{g.name}</SelectItem>)}</SelectContent></Select>
              <Select value={selectedSchool} onValueChange={setSelectedSchool}><SelectTrigger className="h-12 w-[150px] rounded-xl border-slate-100 bg-white font-bold text-slate-600"><SelectValue placeholder={t('school')} /></SelectTrigger><SelectContent className="rounded-xl"><SelectItem value="all">{t('all_schools')}</SelectItem>{(schoolsData || []).map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}</SelectContent></Select>
              <Select value={selectedType} onValueChange={setSelectedType}><SelectTrigger className="h-12 w-[130px] rounded-xl border-slate-100 bg-white font-bold text-slate-600"><SelectValue placeholder="Type" /></SelectTrigger><SelectContent className="rounded-xl"><SelectItem value="all">Type</SelectItem><SelectItem value="New Commer">{t('new_commer')}</SelectItem><SelectItem value="Internal Transfer">{t('internal_transfer')}</SelectItem></SelectContent></Select>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}><SelectTrigger className="h-12 w-[140px] rounded-xl border-slate-100 bg-white font-bold text-slate-600"><SelectValue placeholder={t('status')} /></SelectTrigger><SelectContent className="rounded-xl"><SelectItem value="all">{t('all_statuses')}</SelectItem>{["Oral Interview", "Confirmed Interview", "Passed Parent Interview", "Failed Parent Interview", "Passed Oral Interview", "Failed Oral Interview", "Declined", "Approved by Director", "Postponed", "Duplicate", "No Answer"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
              <Popover>
                <PopoverTrigger asChild><Button variant="outline" className="h-12 rounded-xl border-slate-100 bg-white font-bold text-slate-600 gap-2"><CalendarIcon className="h-4 w-4 text-blue-500" />{dateRange?.from ? format(dateRange.from, "LLL dd") : t('date')}</Button></PopoverTrigger>
                <PopoverContent className="w-auto p-0 rounded-2xl overflow-hidden" align="end"><CalendarComp mode="range" selected={dateRange} onSelect={setDateRange} initialFocus /></PopoverContent>
              </Popover>
              {isFiltering && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-12 w-12 text-rose-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                  onClick={handleResetFilters}
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
          <TabsContent value="upcoming" className="mt-0"><StudentTable data={filteredData} tab="upcoming" /></TabsContent>
          <TabsContent value="results" className="mt-0"><StudentTable data={filteredData} tab="results" /></TabsContent>
          <TabsContent value="approved" className="mt-0"><StudentTable data={filteredData} tab="approved" /></TabsContent>
          <TabsContent value="rejected" className="mt-0"><StudentTable data={filteredData} tab="rejected" /></TabsContent>
        </div>
      </Tabs>

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

      {/* Reschedule Oral Interview Dialog */}
      <Dialog open={isRescheduleOpen} onOpenChange={setIsRescheduleOpen}>
        <DialogContent className={cn("max-w-[420px] p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl", isRTL && "font-arabic")}>
           <div className="p-8 pb-4 bg-slate-50 border-b">
              <DialogHeader className="relative">
                 <button onClick={() => setIsRescheduleOpen(false)} className={cn("absolute top-0 h-6 w-6 text-slate-300 hover:text-slate-600 transition-colors", isRTL ? "left-0" : "right-0")}>
                    <X className="h-5 w-5" />
                 </button>
                 <div className="flex items-start gap-4">
                    <div className="h-10 w-10 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
                       <RotateCcw className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <DialogTitle className="text-2xl font-black text-[#1a1a1a] font-serif leading-tight">
                        {rescheduleModalMode === 're_exam' 
                          ? (selectedStudent?.status === 'Failed Oral Interview'
                              ? (isRTL ? "إعادة مقابلة الطالب" : "Student Interview Re-Exam")
                              : (isRTL ? "إعادة مقابلة ولي الأمر" : "Parent Interview Re-Exam"))
                          : t('reschedule')}
                      </DialogTitle>
                      <DialogDescription className="text-slate-400 font-medium mt-1">
                        {rescheduleModalMode === 're_exam'
                          ? (selectedStudent?.status === 'Failed Oral Interview'
                              ? (isRTL ? `تحديد موعد إعادة مقابلة الطالب لـ ${selectedStudent?.studentName}` : `Schedule student interview re-exam slot for ${selectedStudent?.studentName}`)
                              : (isRTL ? `تحديد موعد إعادة مقابلة ولي الأمر لـ ${selectedStudent?.studentName}` : `Schedule parent interview re-exam slot for ${selectedStudent?.studentName}`))
                          : (isRTL ? `اختيار موعد مقابلة جديد لـ ${selectedStudent?.studentName}` : `Pick a new oral interview slot for ${selectedStudent?.studentName}`)}
                      </DialogDescription>
                    </div>
                 </div>
              </DialogHeader>
           </div>
           
           <div className="p-8 space-y-6">
              {rescheduleModalMode === 'reschedule' && (selectedStudent?.rescheduleHistory || []).length === 1 && (
                 <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-2xl flex items-start gap-2.5">
                    <AlertCircle className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                    <p className="text-xs font-semibold text-blue-800 leading-relaxed">
                       {t('reschedule_notice_first')}
                    </p>
                 </div>
              )}

              {rescheduleModalMode === 'reschedule' && (selectedStudent?.rescheduleHistory || []).length >= 2 && (
                 <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-2.5">
                    <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-xs font-semibold text-amber-800 leading-relaxed">
                       {t('reschedule_warning_third')}
                    </p>
                 </div>
              )}

              <div className="space-y-2">
                 <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Select New Date</Label>
                 <Popover>
                    <PopoverTrigger asChild>
                       <Button variant="outline" className="w-full h-12 justify-start font-medium rounded-xl border-slate-200">
                          <CalendarIcon className="mr-2 h-4 w-4 text-blue-500" />
                          {rescheduleDate ? format(rescheduleDate, "PPP") : "Choose Date"}
                       </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 rounded-2xl overflow-hidden" align="start">
                       <CalendarComp
                          mode="single"
                          selected={rescheduleDate}
                          onSelect={setRescheduleDate}
                          initialFocus
                          modifiers={{ hasSlots: (date) => { const fmt = format(date, "yyyy-MM-dd"); return availableRescheduleDates.dates.has(fmt) || availableRescheduleDates.recurringDays.has(dayNames[getDay(date)]); } }}
                          modifiersClassNames={{ hasSlots: "relative after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-1 after:h-1 after:bg-blue-600 after:rounded-full" }}
                          disabled={(date) => isBefore(startOfDay(date), startOfDay(new Date())) || (!availableRescheduleDates.dates.has(format(date, "yyyy-MM-dd")) && !availableRescheduleDates.recurringDays.has(dayNames[getDay(date)]))}
                       />
                    </PopoverContent>
                 </Popover>
              </div>

              <div className="space-y-3">
                 <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Available Slots</Label>
                 <div className="grid grid-cols-2 gap-2">
                    {rescheduleDate ? (
                       rescheduleSlots.length > 0 ? rescheduleSlots.map((slot: any) => (
                          <Button
                             key={slot.id}
                             variant="outline"
                             disabled={slot.isFull}
                             className={cn(
                                "h-11 rounded-lg font-bold text-xs",
                                selectedRescheduleTime === slot.name ? "border-blue-600 bg-blue-50 text-blue-600" : "border-slate-100"
                             )}
                             onClick={() => setSelectedRescheduleTime(slot.name)}
                          >
                             {slot.name} {slot.isFull && `(${t('cap')})`}
                          </Button>
                       )) : <p className="col-span-2 text-center text-xs text-slate-400 italic py-4">No slots available for this date.</p>
                    ) : <p className="col-span-2 text-center text-xs text-slate-400 italic py-4">Select a date to see times.</p>}
                 </div>
              </div>
           </div>

           <div className="p-8 pt-2 flex gap-3 bg-slate-50/50 border-t">
              <Button variant="outline" className="flex-1 h-12 rounded-xl font-bold" onClick={() => setIsRescheduleOpen(false)}>{t('cancel')}</Button>
              <Button 
                className="flex-1 h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold gap-2" 
                onClick={handleSaveReschedule}
                disabled={isSavingReschedule || !rescheduleDate || !selectedRescheduleTime}
              >
                {isSavingReschedule ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} {t('confirm')}
              </Button>
           </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function OralInterviewPage() {
  return (
    <React.Suspense fallback={<div className="flex min-h-[300px] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>}>
      <OralInterviewContent />
    </React.Suspense>
  );
}
