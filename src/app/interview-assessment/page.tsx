
"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Search,
  Loader2,
  ChevronDown,
  ClipboardCheck,
  Clock,
  User,
  Pencil,
  Save,
  CheckCircle2,
  XCircle,
  Calendar as CalendarIcon,
  RotateCcw,
  Building2,
  GraduationCap,
  Ban,
  MessageSquare,
  Layers,
  Phone,
  MapPin,
  Calculator,
  BookOpen,
  X,
  CalendarClock,
  AlertCircle,
  UserX,
  Send
} from "lucide-react";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useFirestore, useCollection, useMemoFirebase, useUser, useEmployee, updateDocumentNonBlocking } from "@/firebase";
import { collection, doc, query, where, updateDoc, arrayUnion } from "firebase/firestore";
import { cn, parseLocalDate, isTimeSlotPast } from "@/lib/utils";
import { startOfDay, format, getDay, isBefore } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/context/language-context";
import { DateRange } from "react-day-picker";

const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const isTimePast = (slotName: string, selectedDate: Date | undefined) => {
  return isTimeSlotPast(slotName, selectedDate);
};

const statusStyles: Record<string, string> = {
  "Applicant": "bg-blue-50 text-blue-600 border-blue-100",
  "Confirmed Assessment": "bg-indigo-50 text-indigo-600 border-indigo-100",
  "Passed Admission Interview": "bg-emerald-50 text-emerald-700 border-emerald-100",
  "Declined": "bg-rose-50 text-rose-600 border-rose-100",
  "Postponed": "bg-orange-50 text-orange-600 border-orange-100",
  "Duplicate": "bg-slate-100 text-slate-600 border-slate-200",
  "Re-exam": "bg-violet-50 text-violet-700 border-violet-100",
  "Tested": "bg-sky-50 text-sky-600 border-sky-100",
  "Failed Assessment": "bg-rose-100 text-rose-800 border-rose-200",
  "Passed Assessment": "bg-emerald-100 text-emerald-800 border-emerald-200",
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
      <span className="text-[10px] opacity-50 font-normal truncate">
        {parts.slice(2).join(" ")}
      </span>
    </div>
  );
};

function InterviewAssessmentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const db = useFirestore();
  const { user } = useUser();
  const { isDirector, isManager, isSales, isSalesManager, campus: userCampus, employee } = useEmployee();
  const canSeeSalesFollowupStatuses = isDirector || isSales || isSalesManager;
  const { toast } = useToast();
  const { t, isRTL } = useLanguage();
  
  const currentTabParam = searchParams.get("tab") || "pending";
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

  const [isUpdateOpen, setIsUpdateOpen] = React.useState(false);
  const [selectedStudent, setSelectedStudent] = React.useState<any>(null);
  const [manualStatus, setManualStatus] = React.useState<string>("");
  const [isSavingScores, setIsSavingScores] = React.useState(false);
  const [subjectScores, setSubjectScores] = React.useState<Record<string, string>>({});

  const [isRescheduleAssessmentOpen, setIsRescheduleAssessmentOpen] = React.useState(false);
  const [rescheduleModalMode, setRescheduleModalMode] = React.useState<'reschedule' | 're_exam'>('reschedule');
  const [rescheduleDate, setRescheduleDate] = React.useState<Date | undefined>(undefined);
  const [selectedRescheduleTime, setSelectedRescheduleTime] = React.useState<string>("");
  const [isSavingReschedule, setIsSavingReschedule] = React.useState(false);

  const [isScheduleOralOpen, setIsScheduleOralOpen] = React.useState(false);
  const [oralDate, setOralDate] = React.useState<Date | undefined>(undefined);
  const [selectedOralTime, setSelectedOralTime] = React.useState<string>("");
  const [isSavingOral, setIsSavingOral] = React.useState(false);

  const [isPostponeOpen, setIsPostponeOpen] = React.useState(false);
  const [postponeComment, setPostponeComment] = React.useState("");
  const [isSavingPostpone, setIsSavingPostpone] = React.useState(false);

  const appsQuery = useMemoFirebase(() => user ? collection(db, "applications") : null, [db, user]);
  const { data: applicationsData, isLoading } = useCollection(appsQuery);
  const applications = applicationsData || [];

  // Auto-heal applications where interviewScoreObtained was overwritten by an academic score (> 4.0) instead of the parent rubric score
  React.useEffect(() => {
    if (!applicationsData || !db) return;
    applicationsData.forEach((app: any) => {
      const admScores = app.admissionsScores || {};
      const vals = Object.values(admScores).map(Number).filter(n => !isNaN(n) && n > 0);
      if (vals.length > 0) {
        const rubricAvg = vals.reduce((a, b) => a + b, 0) / vals.length;
        if (app.interviewScoreObtained !== undefined && app.interviewScoreObtained !== null && Number(app.interviewScoreObtained) > 4.0) {
          updateDoc(doc(db, "applications", app.id), {
            interviewScoreObtained: rubricAvg,
            parentAdmissionScore: rubricAvg,
            academicScoreObtained: app.interviewScoreObtained
          }).catch(err => console.error("Auto heal score err:", err));
        }
      }
    });
  }, [applicationsData, db]);

  const settingsQuery = useMemoFirebase(() => user ? collection(db, "settings") : null, [db, user]);
  const { data: settingsDataRaw } = useCollection(settingsQuery);
  const allSettings = (settingsDataRaw || []).filter(Boolean);

  const gradesQuery = useMemoFirebase(() => user ? collection(db, "grade") : null, [db, user]);
  const { data: gradesDataRaw } = useCollection(gradesQuery);
  const gradesData = (gradesDataRaw || []).filter(Boolean);

  const schoolsQuery = useMemoFirebase(() => user ? collection(db, "schools") : null, [db, user]);
  const { data: schoolsDataRaw } = useCollection(schoolsQuery);
  const schoolsData = (schoolsDataRaw || []).filter(Boolean);

  const campusMappingsQuery = useMemoFirebase(() => user ? collection(db, "campus_mappings") : null, [db, user]);
  const { data: campusMappingsRaw } = useCollection(campusMappingsQuery);
  const campusMappings = campusMappingsRaw || [];

  const filteredData = React.useMemo(() => {
    return (applications || []).filter((app) => {
      const status = app.status;
      const statusLower = (status || "").toLowerCase();
      
      if (statusLower.includes("cancelled by phone") || statusLower.includes("no show") || statusLower.includes("returned to sales") || statusLower === "postponed") {
        return false;
      }
      
      if (!isDirector) {
        if (userCampus) {
          const target = userCampus.trim().toLowerCase();
          const appCampus = app.campus ? String(app.campus).trim().toLowerCase() : "";
          const appSchool = app.school ? String(app.school).trim().toLowerCase() : "";
          if (appCampus !== target && appSchool !== target) return false;
        } else if (app.assignedEmployeeId !== user?.uid) {
          return false;
        }
      }
      
      let matchesTab = false;
      if (activeTab === 'pending') {
        const hasAssessmentRetest = (app.retestTypes || []).includes("Assessment Retest") || (app.retestTypes || []).includes("Interview Retest");
        const isOralRetestOnly = (app.retestTypes || []).includes("Oral Interview Retest") && !hasAssessmentRetest;
        const isOralInterview = status === "Oral Interview" || 
          isOralRetestOnly || 
          (!!app.oralInterviewDate && (app.rescheduleHistory || []).some((h: any) => h.type === "Oral Interview") && !hasAssessmentRetest);
        if (isOralInterview) return false;

        if (status === "No Answer") {
          matchesTab = !app.previousStatus || ["Applicant", "Confirmed Assessment", "Duplicate"].includes(app.previousStatus);
        } else {
          matchesTab = ["Applicant", "Confirmed Assessment", "Duplicate"].includes(status);
        }
      }
      else if (activeTab === 'results') {
        if (status === "No Answer") {
          matchesTab = ["Passed Admission Interview", "Re-exam", "Tested", "Duplicate"].includes(app.previousStatus);
        } else {
          matchesTab = ["Passed Admission Interview", "Re-exam", "Tested", "Duplicate"].includes(status);
        }
      }
      else if (activeTab === 'approved') {
        matchesTab = ["Passed Assessment", "Duplicate"].includes(status);
      }
      else if (activeTab === 'rejected') {
        matchesTab = ["Failed Assessment", "Declined", "Duplicate"].includes(status);
      }
      
      if (!matchesTab) return false;

      if (selectedStatus !== "all" && app.status !== selectedStatus) return false;
      if (selectedGrade !== "all" && app.grade !== selectedGrade) return false;
      if (selectedSchool !== "all" && app.school !== selectedSchool) return false;
      if (selectedType !== "all" && app.category !== selectedType) return false;
      
      if (dateRange?.from || dateRange?.to) {
        const appDateStr = app.interviewDate || app.applicationDate;
        if (!appDateStr) return false;
        const appDate = new Date(appDateStr);
        const from = dateRange?.from ? new Date(dateRange.from) : null;
        const to = dateRange?.to ? new Date(dateRange.to) : null;
        if(from) from.setHours(0,0,0,0);
        if(to) to.setHours(23,59,59,999);
        if ((from && appDate < from) || (to && appDate > to)) return false;
      }

      return app.studentName?.toLowerCase().includes(searchTerm.toLowerCase()) || app.id.toLowerCase().includes(searchTerm.toLowerCase());
    }).sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  }, [applications, searchTerm, activeTab, isDirector, isManager, userCampus, user, selectedStatus, selectedGrade, selectedSchool, selectedType, dateRange]);

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

  const availableAssessmentDates = React.useMemo(() => {
    const dates = new Set<string>();
    const recurringDays = new Set<string>();
    allSettings.filter(s => s.type === "assessment_time").forEach(s => {
      if (s.date) dates.add(s.date);
      else if (s.day) recurringDays.add(s.day);
    });
    return { dates, recurringDays };
  }, [allSettings]);

  const availableOralDates = React.useMemo(() => {
    const dates = new Set<string>();
    const recurringDays = new Set<string>();
    allSettings.filter(s => s.type === "oral_time").forEach(s => {
      if (s.date) dates.add(s.date);
      else if (s.day) recurringDays.add(s.day);
    });
    return { dates, recurringDays };
  }, [allSettings]);

  const handleStatusChange = async (item: any, newStatus: string) => {
    if (newStatus === item.status) return;

    if (newStatus === "Postponed") {
      setSelectedStudent(item);
      setPostponeComment("");
      setIsPostponeOpen(true);
      return;
    }

    if (newStatus === "Re-exam") {
      setSelectedStudent(item);
      setRescheduleModalMode('re_exam');
      setRescheduleDate(undefined);
      setSelectedRescheduleTime("");
      setIsRescheduleAssessmentOpen(true);
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
      console.error("Failed to save postpone status in interview-assessment:", e);
      toast({ variant: "destructive", title: "Error" });
    } finally {
      setIsSavingPostpone(false);
    }
  };

  const handleOpenUpdate = (student: any) => {
    setSelectedStudent(student);
    if (student.status === "Passed Assessment") setManualStatus("passed");
    else if (student.status === "Failed Assessment") setManualStatus("failed");
    else setManualStatus("");
    setSubjectScores(student.academicScores || {});
    setIsUpdateOpen(true);
  };

  const handleSaveScores = async () => {
    if (!selectedStudent) return;
    setIsSavingScores(true);
    try {
      let finalStatus = selectedStudent.status;
      if (manualStatus === "passed") finalStatus = "Passed Assessment";
      else if (manualStatus === "failed") finalStatus = "Failed Assessment";

      const scores = Object.values(subjectScores).map(s => parseFloat(s) || 0);
      const avg = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

      // Prepare detailed subject score breakdown
      const detailedScores = (studentSubjects || []).map((sub: any) => ({
        subjectId: sub.subjectId,
        name: sub.name,
        maxScore: sub.maxScore,
        score: (subjectScores[sub.subjectId] !== undefined && subjectScores[sub.subjectId] !== "") 
          ? subjectScores[sub.subjectId] 
          : "—"
      }));

      // In case there are custom or extra subjects in subjectScores not in studentSubjects
      const recognizedIds = new Set((studentSubjects || []).map((s: any) => s.subjectId));
      Object.entries(subjectScores).forEach(([k, v]) => {
        if (!recognizedIds.has(k) && v !== "" && v !== undefined) {
          detailedScores.push({
            subjectId: k,
            name: k,
            maxScore: "—",
            score: v
          });
        }
      });

      const loggedUserName = employee?.name || user?.email?.split('@')[0] || "Staff";
      const nowIso = new Date().toISOString();

      const admissionsScores = selectedStudent.admissionsScores || {};
      const admVals = Object.values(admissionsScores).map(Number).filter(n => !isNaN(n) && n > 0);
      const parentAdmissionScore = admVals.length > 0
        ? (admVals.reduce((a, b) => a + b, 0) / admVals.length)
        : (selectedStudent.parentAdmissionScore ?? (selectedStudent.interviewScoreObtained && Number(selectedStudent.interviewScoreObtained) <= 4.0 ? Number(selectedStudent.interviewScoreObtained) : null));

      const assessmentHistoryEntry = {
        type: "Academic Assessment",
        status: finalStatus,
        resultStatus: finalStatus,
        academicScores: subjectScores,
        scoresList: detailedScores,
        academicScoreObtained: avg,
        studentAcademicScore: avg,
        savedBy: loggedUserName,
        createdAt: nowIso,
        updatedAt: nowIso,
        date: format(new Date(), "yyyy-MM-dd"),
        time: format(new Date(), "HH:mm")
      };

      const applicationUpdates: any = {
        status: finalStatus,
        previousStatus: selectedStudent.status,
        academicScores: subjectScores,
        academicScoresDetailed: detailedScores,
        academicScoreObtained: avg,
        studentAcademicScore: avg,
        academicResult: finalStatus,
        assessmentHistory: arrayUnion(assessmentHistoryEntry),
        updatedAt: nowIso
      };

      if (parentAdmissionScore !== null) {
        applicationUpdates.interviewScoreObtained = parentAdmissionScore;
        applicationUpdates.parentAdmissionScore = parentAdmissionScore;
      }

      await updateDoc(doc(db, "applications", selectedStudent.id), applicationUpdates);

      toast({ 
        title: isRTL ? "تم حفظ الدرجات وتحديث السجل" : "Scores Saved & Logged to History",
        description: isRTL ? `تم تسجيل نتائج التقييم للطالب ${selectedStudent.studentName} بنجاح.` : `Assessment results recorded for ${selectedStudent.studentName}.`
      });
      setIsUpdateOpen(false);
    } catch (e) {
      console.error("Failed to save scores in interview-assessment:", e);
      toast({ variant: "destructive", title: "Error", description: "Failed to save scores." });
    }
    finally { setIsSavingScores(false); }
  };

  const handleSaveReschedule = async () => {
    if (!selectedStudent || !rescheduleDate || !selectedRescheduleTime) {
      toast({ variant: "destructive", title: "Incomplete", description: "Please select date and time." });
      return;
    }
    setIsSavingReschedule(true);
    try {
      if (rescheduleModalMode === 're_exam') {
        const isDeclined = selectedStudent.status === "Declined";
        const history = selectedStudent.reExamHistory || [];
        const newEntry = {
          previousDate: selectedStudent.interviewDate || 'None',
          previousTime: selectedStudent.interviewTime || 'None',
          newDate: format(rescheduleDate, "yyyy-MM-dd"),
          newTime: selectedRescheduleTime,
          changedAt: new Date().toISOString(),
          changedBy: employee?.name || user?.email?.split('@')[0] || "System",
          type: isDeclined ? "Parent Interview" : "Student Assessment"
        };

        const updatedHistory = [...history, newEntry];
        const reExamCount = updatedHistory.length;

        if (isDeclined) {
          // Declined student -> Re-exam routes to Parent Interview (pending tab / Applicant)
          await updateDoc(doc(db, "applications", selectedStudent.id), {
            status: "Applicant",
            previousStatus: selectedStudent.status,
            interviewDate: format(rescheduleDate, "yyyy-MM-dd"),
            interviewTime: selectedRescheduleTime,
            reExamHistory: updatedHistory,
            reExamCount: reExamCount,
            admissionsScores: {},
            admissionsDraftScores: {},
            admissionsItemComments: {},
            admissionsDraftComments: {},
            interviewScoreObtained: 0,
            interviewResult: null,
            updatedAt: new Date().toISOString()
          });

          try {
            localStorage.removeItem(`assessment_scores_${selectedStudent.id}_admissions`);
            localStorage.removeItem(`assessment_comments_${selectedStudent.id}_admissions`);
          } catch (e) {
            console.error("Local storage error on re-exam reset:", e);
          }

          toast({ 
            title: isRTL ? "تمت جدولة إعادة مقابلة ولي الأمر" : "Parent Interview Re-exam Scheduled", 
            description: isRTL ? `تم تحويل الطالب ${selectedStudent.studentName} إلى مرحلة مقابلة ولي الأمر بنجاح.` : `Student ${selectedStudent.studentName} routed to Parent Interview queue.` 
          });

          setIsRescheduleAssessmentOpen(false);
          setRescheduleDate(undefined);
          setSelectedRescheduleTime("");
          onTabChange("pending");
          return;
        } else {
          // Failed Assessment student -> Re-exam routes to Student Assessment (results tab / Re-exam)
          const existingHistory = selectedStudent.assessmentHistory || [];
          let updatedAssessmentHistory = [...existingHistory];

          // If there were existing scores on this student, ensure they are archived in assessmentHistory before resetting
          if (selectedStudent.academicScores && Object.keys(selectedStudent.academicScores).length > 0) {
            const alreadyLogged = existingHistory.some((h: any) =>
              JSON.stringify(h.academicScores) === JSON.stringify(selectedStudent.academicScores)
            );
            if (!alreadyLogged) {
              const previousDetailed = (studentSubjects || []).map((sub: any) => ({
                subjectId: sub.subjectId,
                name: sub.name,
                maxScore: sub.maxScore,
                score: selectedStudent.academicScores[sub.subjectId] ?? "—"
              }));

              updatedAssessmentHistory.push({
                type: "Academic Assessment",
                status: selectedStudent.status || "Failed Assessment",
                resultStatus: selectedStudent.status || "Failed Assessment",
                academicScores: selectedStudent.academicScores,
                scoresList: previousDetailed.length > 0 ? previousDetailed : Object.entries(selectedStudent.academicScores).map(([k, v]) => ({ name: k, score: v, maxScore: "—" })),
                interviewScoreObtained: selectedStudent.interviewScoreObtained ?? selectedStudent.studentInterviewScoreObtained ?? 0,
                savedBy: employee?.name || user?.email?.split('@')[0] || "Staff",
                savedAt: selectedStudent.updatedAt || new Date().toISOString(),
                createdAt: selectedStudent.updatedAt || new Date().toISOString(),
                date: format(new Date(), "yyyy-MM-dd"),
                time: format(new Date(), "HH:mm")
              });
            }
          }

          await updateDoc(doc(db, "applications", selectedStudent.id), {
            status: "Re-exam",
            previousStatus: selectedStudent.status,
            interviewDate: format(rescheduleDate, "yyyy-MM-dd"),
            interviewTime: selectedRescheduleTime,
            reExamHistory: updatedHistory,
            reExamCount: reExamCount,
            academicScores: {},
            academicScoresDetailed: [],
            interviewScoreObtained: 0,
            assessmentHistory: updatedAssessmentHistory,
            updatedAt: new Date().toISOString()
          });

          toast({ 
            title: isRTL ? "تمت جدولة إعادة تقييم الطالب" : "Student Assessment Re-exam Scheduled", 
            description: isRTL ? `تم تحويل الطالب ${selectedStudent.studentName} إلى مرحلة تقييم الطالب بنجاح.` : `Student ${selectedStudent.studentName} routed to Student Assessment queue.` 
          });

          setIsRescheduleAssessmentOpen(false);
          setRescheduleDate(undefined);
          setSelectedRescheduleTime("");
          onTabChange("results");
          return;
        }
      }

      const history = selectedStudent.rescheduleHistory || [];
      const newEntry = {
        previousDate: selectedStudent.interviewDate || 'None',
        previousTime: selectedStudent.interviewTime || 'None',
        newDate: format(rescheduleDate, "yyyy-MM-dd"),
        newTime: selectedRescheduleTime,
        changedAt: new Date().toISOString(),
        changedBy: employee?.name || user?.email?.split('@')[0] || "System",
        type: "Assessment"
      };

      const updatedHistory = [...history, newEntry];
      const rescheduleCount = updatedHistory.length;
      
      // 2 normal reschedules allowed. On the 3rd reschedule, status becomes "No Show" (routing to Sales)
      const isMaxReschedules = rescheduleCount >= 3;
      const newStatus = isMaxReschedules ? "No Show" : "Applicant";

      await updateDoc(doc(db, "applications", selectedStudent.id), {
        status: newStatus,
        previousStatus: selectedStudent.status,
        interviewDate: format(rescheduleDate, "yyyy-MM-dd"),
        interviewTime: selectedRescheduleTime,
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
          title: isRTL ? "تم تحديث موعد التقييم" : "Appointment Updated", 
          description: isRTL
            ? `تمت إعادة جدولة التقييم للطالب ${selectedStudent.studentName} بنجاح إلى ${format(rescheduleDate, "yyyy-MM-dd")} الساعة ${selectedRescheduleTime}. (إعادة جدولة ${rescheduleCount}/2)`
            : `Student appointment rescheduled to ${format(rescheduleDate, "yyyy-MM-dd")} at ${selectedRescheduleTime}. (Reschedule ${rescheduleCount}/2)` 
        });
      }

      setIsRescheduleAssessmentOpen(false);
      setRescheduleDate(undefined);
      setSelectedRescheduleTime("");
      
      // Move to Parent Interview tab (pending) after reschedule within the same page if not routed to sales
      if (!isMaxReschedules) {
        onTabChange("pending");
      }
    } catch (e) {
      console.error("Failed to reschedule in interview-assessment:", e);
      toast({ variant: "destructive", title: "Error", description: "Failed to reschedule." });
    } finally {
      setIsSavingReschedule(false);
    }
  };

  const handleSaveOralSchedule = async () => {
    if (!selectedStudent || !oralDate || !selectedOralTime) {
      toast({ variant: "destructive", title: "Incomplete", description: "Please select date and time." });
      return;
    }
    setIsSavingOral(true);
    try {
      const loggedUserName = employee?.name || user?.email?.split('@')[0] || "Staff";
      const nowIso = new Date().toISOString();
      const historyEntry = {
        status: "Oral Interview",
        previousStatus: selectedStudent.status || "Applicant",
        comment: isRTL ? "تم تحويل الطالب إلى مرحلة المقابلة الشفهية" : "Promoted to Oral Interview phase",
        oralInterviewDate: format(oralDate, "yyyy-MM-dd"),
        oralInterviewTime: selectedOralTime,
        changedAt: nowIso,
        changedBy: loggedUserName
      };

      await updateDoc(doc(db, "applications", selectedStudent.id), {
        status: "Oral Interview",
        previousStatus: selectedStudent.status,
        oralInterviewDate: format(oralDate, "yyyy-MM-dd"),
        oralInterviewTime: selectedOralTime,
        statusHistory: arrayUnion(historyEntry),
        updatedAt: nowIso
      });

      toast({ title: "Oral Interview Scheduled", description: `${selectedStudent.studentName} moved to Oral Interview phase.` });
      setIsScheduleOralOpen(false);
      setOralDate(undefined);
      setSelectedOralTime("");
    } catch (e) {
      console.error("Failed to schedule oral interview:", e);
      toast({ variant: "destructive", title: "Error", description: "Failed to schedule." });
    } finally {
      setIsSavingOral(false);
    }
  };

  const studentSubjects = React.useMemo(() => {
    if (!selectedStudent || !campusMappings) return [];
    const mapping = (campusMappings || []).find((m: any) => m.campusName === selectedStudent.campus || m.campusId === selectedStudent.campusId);
    if (!mapping?.schools) return [];
    const schoolEntry = Object.values(mapping.schools).find((s: any) => s.name === selectedStudent.school) as any;
    if (!schoolEntry?.grades) return [];
    const gradeEntry = Object.values(schoolEntry.grades).find((g: any) => g.name === selectedStudent.grade) as any;
    return gradeEntry?.subjects || [];
  }, [selectedStudent, campusMappings]);

  const rescheduleOccupancy = React.useMemo(() => {
    if (!rescheduleDate) return {};
    const fmt = format(rescheduleDate, "yyyy-MM-dd");
    const counts: Record<string, number> = {};
    (applications || []).forEach(a => {
      if (a.interviewDate === fmt && a.interviewTime) {
        counts[a.interviewTime] = (counts[a.interviewTime] || 0) + 1;
      }
    });
    return counts;
  }, [rescheduleDate, applications]);

  const oralOccupancy = React.useMemo(() => {
    if (!oralDate) return {};
    const fmt = format(oralDate, "yyyy-MM-dd");
    const counts: Record<string, number> = {};
    (applications || []).forEach(a => {
      if (a.oralInterviewDate === fmt && a.oralInterviewTime) {
        counts[a.oralInterviewTime] = (counts[a.oralInterviewTime] || 0) + 1;
      }
    });
    return counts;
  }, [oralDate, applications]);

  const rescheduleSlots = React.useMemo(() => {
    if (!rescheduleDate) return [];
    const fmt = format(rescheduleDate, "yyyy-MM-dd");
    return (allSettings || [])
      .filter(s => s.type === "assessment_time" && (s.date === fmt || (!s.date && s.day === dayNames[getDay(rescheduleDate)])))
      .map(s => ({
        ...s,
        isFull: (rescheduleOccupancy[s.name] || 0) >= (parseInt(s.capacity) || 1),
        isPast: isTimePast(s.name, rescheduleDate)
      }))
      .filter(slot => !slot.isPast);
  }, [rescheduleDate, allSettings, rescheduleOccupancy]);

  const oralSlots = React.useMemo(() => {
    if (!oralDate) return [];
    const fmt = format(oralDate, "yyyy-MM-dd");
    return (allSettings || [])
      .filter(s => s.type === "oral_time" && (s.date === fmt || (!s.date && s.day === dayNames[getDay(oralDate)])))
      .map(s => ({
        ...s,
        isFull: (oralOccupancy[s.name] || 0) >= (parseInt(s.capacity) || 1),
        isPast: isTimePast(s.name, oralDate)
      }))
      .filter(slot => !slot.isPast);
  }, [oralDate, allSettings, oralOccupancy]);

  const StudentTable = ({ data, tab }: { data: any[], tab: string }) => {
    const allowedDropdownStatuses = React.useMemo(() => {
      let statuses: string[] = [];
      if (tab === 'pending') statuses = ["Applicant", "Confirmed Assessment", "Passed Admission Interview", "Declined", "Postponed", "Duplicate", "Cancelled by Phone", "No Answer", "No Show"];
      else if (tab === 'results') statuses = ["Passed Admission Interview", "Re-exam", "Tested", "Failed Assessment", "Passed Assessment", "Postponed", "Duplicate", "Cancelled by Phone", "No Answer", "No Show"];
      else if (tab === 'approved') statuses = ["Passed Assessment", "Cancelled by Phone", "Duplicate", "No Show"];
      else if (tab === 'rejected') statuses = ["Failed Assessment", "Declined", "Re-exam", "Cancelled by Phone", "Duplicate", "No Show"];
      
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
              {tab === 'pending' && <TableHead className={cn("font-bold text-[#1a1a1a] text-[10px] uppercase text-center")}>{t('admissions_score')}</TableHead>}
              <TableHead className={cn("font-bold text-[#1a1a1a] text-[10px] uppercase", isRTL ? "text-right" : "text-left")}>{t('interviewer')}</TableHead>
              <TableHead className={cn("font-bold text-[#1a1a1a] text-[10px] uppercase", isRTL ? "text-right" : "text-left")}>{t('previous_status')}</TableHead>
              <TableHead className={cn("font-bold text-[#1a1a1a] text-[10px] uppercase", isRTL ? "text-right" : "text-left")}>{t('status')}</TableHead>
              <TableHead className={cn("font-bold text-[#1a1a1a] text-[10px] uppercase", isRTL ? "text-right" : "text-left")}>{t('assessment_appointment')}</TableHead>
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
                {tab === 'pending' && (
                  <TableCell className="text-center">
                    {(() => {
                      const admScores = item.admissionsScores || {};
                      const vals = Object.values(admScores).map(Number).filter(n => !isNaN(n) && n > 0);
                      const rubricAvg = vals.length > 0 ? (vals.reduce((a, b) => a + b, 0) / vals.length) : null;
                      const raw = rubricAvg ?? item.parentAdmissionScore ?? (item.interviewScoreObtained !== undefined && item.interviewScoreObtained !== null && Number(item.interviewScoreObtained) <= 4.0 ? Number(item.interviewScoreObtained) : null);
                      const formatted = raw !== null ? (raw % 1 === 0 ? raw.toString() : parseFloat(raw.toFixed(2)).toString()) : null;
                      return (
                        <Badge variant="outline" className={cn("font-black px-2 py-0.5 rounded-lg text-[10px]", formatted ? "bg-blue-50 text-blue-600 border-blue-100" : "bg-slate-50 text-slate-300 border-slate-100")}>
                          {formatted ? `${formatted}/4` : "—"}
                        </Badge>
                      );
                    })()}
                  </TableCell>
                )}
                <TableCell onClick={e => e.stopPropagation()} className={isRTL ? "text-right" : "text-left"}>
                   <Input 
                    className="h-10 w-40 bg-slate-50 border-slate-200 focus:bg-white focus:border-blue-500 text-[11px] font-medium transition-all text-center rounded-xl"
                    placeholder="Enter Interviewer"
                    defaultValue={item.interviewer || item.assignedEmployeeName || ""}
                    onBlur={(e) => {
                      const newVal = e.target.value;
                      if (newVal !== (item.interviewer || item.assignedEmployeeName)) {
                        updateDocumentNonBlocking(doc(db, "applications", item.id), { interviewer: newVal });
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
                    <DropdownMenuTrigger asChild><button className={cn("inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-bold focus:outline-none", statusStyles[item.status] || "bg-slate-50 text-slate-600 border-slate-100")}>{item.status} <ChevronDown className="h-3 w-3 opacity-50" /></button></DropdownMenuTrigger>
                    <DropdownMenuContent align={isRTL ? "end" : "start"} className="w-56 rounded-xl shadow-2xl border-slate-100">
                      <ScrollArea className="h-64">
                        {allowedDropdownStatuses.map(s => (<DropdownMenuItem key={s} onClick={() => handleStatusChange(item, s)} className="text-xs font-bold py-2.5">{s}</DropdownMenuItem>))}
                      </ScrollArea>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
                <TableCell className={cn("text-slate-500 font-bold text-[10px]", isRTL ? "text-right" : "text-left")}>
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-1 font-bold text-slate-700"><CalendarIcon className="h-3 w-3 text-blue-500" /> {item.interviewDate || '—'}</div>
                    <div className="flex items-center gap-1 text-slate-400 font-medium"><Clock className="h-2.5 w-2.5 text-emerald-500" /> {item.interviewTime || '—'}</div>
                  </div>
                </TableCell>
                <TableCell onClick={e => e.stopPropagation()} className="text-center">
                  <div className="flex items-center justify-center gap-2">
                    {tab === 'pending' ? (
                      <div className="flex items-center justify-center gap-2">
                        <Button variant="outline" size="sm" className="h-9 px-4 bg-blue-600 hover:bg-blue-700 border-blue-600 text-white font-bold rounded-xl gap-2 shadow-sm" onClick={() => router.push(`/blank?id=${item.id}`)}>
                          <ClipboardCheck className="h-3.5 w-3.5" /> {t('start_assessment')}
                        </Button>
                        <Button variant="outline" size="sm" className="h-9 px-4 bg-white hover:bg-slate-50 border-slate-200 text-slate-700 font-bold rounded-xl gap-2 shadow-sm" onClick={() => { 
                          setSelectedStudent(item); 
                          setRescheduleModalMode('reschedule');
                          setRescheduleDate(undefined);
                          setSelectedRescheduleTime("");
                          setIsRescheduleAssessmentOpen(true); 
                        }}>
                          <RotateCcw className="h-3.5 w-3.5" /> {t('reschedule')}
                        </Button>
                        <Button variant="outline" size="sm" className="h-9 px-4 bg-rose-50 hover:bg-rose-100 border-rose-100 text-rose-600 font-bold rounded-xl gap-2 shadow-sm" onClick={() => handleStatusChange(item, "No Show")}>
                          <UserX className="h-3.5 w-3.5" /> {t('no_show')}
                        </Button>
                      </div>
                    ) : tab === 'results' ? (
                      <div className="flex items-center justify-center gap-2">
                        <Button variant="outline" size="sm" className="h-9 px-4 bg-white hover:bg-slate-50 border-blue-200 text-blue-600 font-bold rounded-xl gap-2 shadow-sm" onClick={() => handleOpenUpdate(item)}>
                          <Pencil className="h-3.5 w-3.5" /> {t('update_results')}
                        </Button>
                        <Button variant="outline" size="sm" className="h-9 px-4 bg-rose-50 hover:bg-rose-100 border-rose-100 text-rose-600 font-bold rounded-xl gap-2 shadow-sm" onClick={() => handleStatusChange(item, "No Show")}>
                          <UserX className="h-3.5 w-3.5" /> {t('no_show')}
                        </Button>
                      </div>
                    ) : (tab === 'approved' || tab === 'rejected') ? (
                      <div className="flex items-center justify-center gap-2">
                        {tab === 'approved' && (
                          <Button variant="outline" size="sm" className="h-9 px-4 bg-purple-600 hover:bg-purple-700 border-purple-600 text-white font-bold rounded-xl gap-2 shadow-sm" onClick={() => { setSelectedStudent(item); setIsScheduleOralOpen(true); }}>
                            <CalendarClock className="h-3.5 w-3.5" /> {t('reschedule_oral')}
                          </Button>
                        )}
                        {tab === 'rejected' && (
                          <Button variant="outline" size="sm" className="h-9 px-4 bg-white hover:bg-slate-50 border-slate-200 text-slate-700 font-bold rounded-xl gap-2 shadow-sm" onClick={() => { 
                            setSelectedStudent(item); 
                            setRescheduleModalMode('re_exam');
                            setRescheduleDate(undefined);
                            setSelectedRescheduleTime("");
                            setIsRescheduleAssessmentOpen(true); 
                          }}>
                            <RotateCcw className="h-3.5 w-3.5" /> {t('re_exam')}
                          </Button>
                        )}
                        <Button variant="outline" size="sm" className="h-9 px-4 border-slate-200 text-slate-600 hover:bg-slate-50 font-bold rounded-xl gap-2 shadow-sm" onClick={() => toast({ title: "Update Sent" })}>
                          <Send className="h-3.5 w-3.5" /> Send Update
                        </Button>
                      </div>
                    ) : null}
                  </div>
                </TableCell>
              </TableRow>
            )) : <TableRow><TableCell colSpan={15} className="h-48 text-center text-slate-300 font-bold italic">No candidates found in this queue.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>
    );
  };

  return (
    <div className={cn("flex flex-col gap-8 w-full max-w-full animate-in fade-in duration-500", isRTL && "font-arabic")}>
      <div className="flex items-end justify-between">
        <div className="space-y-1">
          <h1 className="text-4xl font-black text-[#1a1a1a] font-serif leading-none mb-1">{t('nav_assessment')}</h1>
          <p className="text-slate-400 font-medium">{t('manage_evaluations')}</p>
        </div>
        <div className="text-sm font-bold text-slate-400 bg-white px-4 py-2 rounded-xl border">{t('queue')}: {filteredData.length}</div>
      </div>

      <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
        <TabsList className="bg-slate-100/60 p-1.5 rounded-full w-full flex mb-8 h-auto">
          <TabsTrigger value="pending" className="flex-1 rounded-full px-6 py-3 data-[state=active]:bg-white text-slate-600 text-xs font-black uppercase tracking-widest">{t('pending_interview')}</TabsTrigger>
          <TabsTrigger value="results" className="flex-1 rounded-full px-6 py-3 data-[state=active]:bg-white text-slate-600 text-xs font-black uppercase tracking-widest">{t('student_assessment')}</TabsTrigger>
          <TabsTrigger value="approved" className="flex-1 rounded-full px-6 py-3 data-[state=active]:bg-white text-slate-600 text-xs font-black uppercase tracking-widest">{t('passed_assessment')}</TabsTrigger>
          <TabsTrigger value="rejected" className="flex-1 rounded-full px-6 py-3 data-[state=active]:bg-white text-slate-600 text-xs font-black uppercase tracking-widest">{t('failed_assessment')}</TabsTrigger>
        </TabsList>

        <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
          <div className="flex flex-col lg:flex-row gap-4 items-center">
            <div className="relative flex-1 w-full">
              <Search className={cn("absolute top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300", isRTL ? "right-4" : "left-4")} />
              <Input placeholder={t('search_students')} className={cn("h-12 rounded-2xl bg-slate-50/50 border-slate-100 focus:bg-white transition-all shadow-none", isRTL ? "pr-11" : "pl-11")} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <div className="flex flex-wrap gap-2 w-full lg:w-auto">
              <Select value={selectedGrade} onValueChange={setSelectedGrade}>
                <SelectTrigger className="h-12 w-[130px] rounded-xl border-slate-100 bg-slate-50/50 font-bold text-slate-600"><SelectValue placeholder={t('grades')} /></SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all">{t('all_grades')}</SelectItem>
                  {(gradesData || []).map(g => <SelectItem key={g.id} value={g.name}>{g.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={selectedSchool} onValueChange={setSelectedSchool}>
                <SelectTrigger className="h-12 w-[150px] rounded-xl border-slate-100 bg-slate-50/50 font-bold text-slate-600"><SelectValue placeholder={t('school')} /></SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all">{t('all_schools')}</SelectItem>
                  {(schoolsData || []).map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="h-12 w-[130px] rounded-xl border-slate-100 bg-slate-50/50 font-bold text-slate-600"><SelectValue placeholder={t('type_label')} /></SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all">{t('type_label')}</SelectItem>
                  <SelectItem value="New Commer">{t('new_commer')}</SelectItem>
                  <SelectItem value="Internal Transfer">{t('internal_transfer')}</SelectItem>
                </SelectContent>
              </Select>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="h-12 w-[140px] rounded-xl border-slate-100 bg-slate-50/50 font-bold text-slate-600"><SelectValue placeholder={t('status')} /></SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all">{t('all_statuses')}</SelectItem>
                  {["Applicant", "Confirmed Assessment", "Passed Admission Interview", "Declined", "Duplicate", "Re-exam", "Tested", "Failed Assessment", "Passed Assessment"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              <Popover>
                <PopoverTrigger asChild><Button variant="outline" className="h-12 rounded-xl border-slate-100 bg-slate-50/50 font-bold text-slate-600 gap-2"><CalendarIcon className="h-4 w-4 text-blue-500" />{dateRange?.from ? format(dateRange.from, "LLL dd") : t('date')}</Button></PopoverTrigger>
                <PopoverContent className="w-auto p-0 rounded-2xl overflow-hidden" align="end"><Calendar mode="range" selected={dateRange} onSelect={setDateRange} initialFocus /></PopoverContent>
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
          <TabsContent value="pending" className="mt-0"><StudentTable data={filteredData} tab="pending" /></TabsContent>
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

      {/* Update Results Dialog */}
      <Dialog open={isUpdateOpen} onOpenChange={setIsUpdateOpen}>
        <DialogContent className={cn("max-w-[500px] p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl", isRTL && "font-arabic")}>
          <div className="p-8 pb-4 bg-slate-50 border-b">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black font-serif text-[#1a1a1a]">{t('update_results')}</DialogTitle>
              <DialogDescription className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">{selectedStudent?.studentName} • {selectedStudent?.grade}</DialogDescription>
            </DialogHeader>
          </div>
          <ScrollArea className="max-h-[60vh]">
            <div className="p-8 space-y-8">
              <div className="space-y-4">
                {studentSubjects.length > 0 ? (
                  <div className="grid gap-4">
                    {studentSubjects.map((sub: any) => (
                      <div key={sub.subjectId} className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between group hover:border-blue-200 transition-all">
                        <div className="space-y-1"><p className="text-sm font-bold text-slate-800">{sub.name}</p><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('max_header')}: {sub.maxScore}</p></div>
                        <div className="w-24"><Input type="number" placeholder="Score" className="h-10 rounded-xl bg-slate-50 border-transparent text-right font-bold focus:bg-white" value={subjectScores[sub.subjectId] || ""} onChange={(e) => setSubjectScores({...subjectScores, [sub.subjectId]: e.target.value})} /></div>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-center text-xs text-slate-400 italic">No academic subjects found.</p>}
              </div>
              <div className="p-6 bg-white rounded-2xl border border-blue-100 shadow-sm space-y-3">
                <Select value={manualStatus} onValueChange={setManualStatus}>
                  <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-transparent focus:ring-blue-500/20 font-bold"><SelectValue placeholder={t('status')} /></SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="passed" className="py-3 font-bold text-emerald-600"><div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> {t('passed')}</div></SelectItem>
                    <SelectItem value="failed" className="py-3 font-bold text-rose-600"><div className="flex items-center gap-2"><XCircle className="h-4 w-4" /> {t('failed')}</div></SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </ScrollArea>
          <div className="p-8 pt-4 flex gap-3 border-t bg-slate-50/50"><Button variant="outline" className="flex-1 h-12 rounded-xl font-bold" onClick={() => { setIsUpdateOpen(false); setManualStatus(""); }}>{t('cancel')}</Button><Button className="flex-1 h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold gap-2" onClick={handleSaveScores} disabled={isSavingScores}>{isSavingScores ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{t('save')}</Button></div>
        </DialogContent>
      </Dialog>

      {/* Reschedule Assessment / Re-exam Dialog */}
      <Dialog open={isRescheduleAssessmentOpen} onOpenChange={setIsRescheduleAssessmentOpen}>
        <DialogContent className={cn("max-w-[420px] p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl", isRTL && "font-arabic")}>
           <div className="p-8 pb-4 bg-slate-50 border-b">
              <DialogHeader className="relative">
                 <button onClick={() => setIsRescheduleAssessmentOpen(false)} className={cn("absolute top-0 h-6 w-6 text-slate-300 hover:text-slate-600 transition-colors", isRTL ? "left-0" : "right-0")}>
                    <X className="h-5 w-5" />
                 </button>
                  <div className="flex items-start gap-4">
                    <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center shrink-0", rescheduleModalMode === 're_exam' ? "bg-violet-50 text-violet-600" : "bg-blue-50 text-blue-600")}>
                       <RotateCcw className="h-6 w-6" />
                    </div>
                    <div>
                      <DialogTitle className="text-2xl font-black text-[#1a1a1a] font-serif leading-tight">
                        {rescheduleModalMode === 're_exam' 
                          ? (selectedStudent?.status === 'Declined' 
                              ? (isRTL ? "إعادة مقابلة ولي الأمر" : "Parent Interview Re-exam") 
                              : (isRTL ? "إعادة تقييم الطالب" : "Student Assessment Re-exam"))
                          : t('reschedule')}
                      </DialogTitle>
                      <DialogDescription className="text-slate-400 font-medium mt-1">
                        {rescheduleModalMode === 're_exam' 
                          ? (selectedStudent?.status === 'Declined'
                              ? (isRTL ? `اختر موعد إعادة مقابلة ولي الأمر للطالب ${selectedStudent?.studentName}` : `Pick a parent interview re-exam slot for ${selectedStudent?.studentName}`)
                              : (isRTL ? `اختر موعد إعادة تقييم الطالب ${selectedStudent?.studentName}` : `Pick a student assessment re-exam slot for ${selectedStudent?.studentName}`))
                          : (isRTL ? `اختيار موعد تقييم جديد لـ ${selectedStudent?.studentName}` : `Pick a new assessment slot for ${selectedStudent?.studentName}`)}
                      </DialogDescription>
                    </div>
                 </div>
              </DialogHeader>
           </div>
           
           <div className="p-8 space-y-6">
              {rescheduleModalMode === 're_exam' && (
                <div className="p-3.5 bg-violet-50 border border-violet-100 rounded-2xl space-y-1">
                  <div className="flex items-center gap-2 text-violet-700 text-xs font-bold">
                    <RotateCcw className="h-4 w-4 shrink-0" />
                    <span>
                      {selectedStudent?.status === 'Declined'
                        ? (isRTL ? "الوجهة: مقابلة ولي الأمر (Parent Interview)" : "Destination: Parent Interview queue")
                        : (isRTL ? "الوجهة: تقييم الطالب (Student Assessment)" : "Destination: Student Assessment queue")}
                    </span>
                  </div>
                  {(selectedStudent?.reExamHistory || []).length > 0 && (
                    <p className="text-[11px] text-violet-600 font-medium pl-6">
                      {isRTL 
                        ? `عدد مرات الإعادة السابقة: ${(selectedStudent?.reExamHistory || []).length}` 
                        : `Previous re-exam attempts: ${(selectedStudent?.reExamHistory || []).length}`}
                    </p>
                  )}
                </div>
              )}

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
                       <Calendar
                          mode="single"
                          selected={rescheduleDate}
                          onSelect={setRescheduleDate}
                          initialFocus
                          modifiers={{ hasSlots: (date) => { const fmt = format(date, "yyyy-MM-dd"); return availableAssessmentDates.dates.has(fmt) || availableAssessmentDates.recurringDays.has(dayNames[getDay(date)]); } }}
                          modifiersClassNames={{ hasSlots: "relative after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-1 after:h-1 after:bg-blue-600 after:rounded-full" }}
                          disabled={(date) => {
                            const today = startOfDay(new Date());
                            const isPast = isBefore(startOfDay(date), today);
                            const hasNoSlots = !availableAssessmentDates.dates.has(format(date, "yyyy-MM-dd")) && !availableAssessmentDates.recurringDays.has(dayNames[getDay(date)]);
                            return isPast || hasNoSlots;
                          }}
                       />
                    </PopoverContent>
                 </Popover>
              </div>

              <div className="space-y-3">
                 <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Available Slots</Label>
                 <div className="grid grid-cols-2 gap-2">
                    {rescheduleDate ? (
                       rescheduleSlots.length > 0 ? rescheduleSlots.map(slot => (
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
                             {slot.name} {slot.isFull && "(Full)"}
                          </Button>
                       )) : <p className="col-span-2 text-center text-xs text-slate-400 italic py-4">No slots available for this date.</p>
                    ) : <p className="col-span-2 text-center text-xs text-slate-400 italic py-4">Select a date to see times.</p>}
                 </div>
              </div>
           </div>

           <div className="p-8 pt-2 flex gap-3 bg-slate-50/50 border-t">
              <Button variant="outline" className="flex-1 h-12 rounded-xl font-bold" onClick={() => setIsRescheduleAssessmentOpen(false)}>{t('cancel')}</Button>
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

      {/* Schedule Oral Interview Dialog */}
      <Dialog open={isScheduleOralOpen} onOpenChange={setIsScheduleOralOpen}>
        <DialogContent className={cn("max-w-[420px] p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl", isRTL && "font-arabic")}>
           <div className="p-8 pb-4 bg-slate-50 border-b">
              <DialogHeader className="relative">
                 <button onClick={() => setIsScheduleOralOpen(false)} className={cn("absolute top-0 h-6 w-6 text-slate-300 hover:text-slate-600 transition-colors", isRTL ? "left-0" : "right-0")}>
                    <X className="h-5 w-5" />
                 </button>
                 <div className="flex items-start gap-4">
                    <div className="h-10 w-10 bg-purple-50 rounded-xl flex items-center justify-center shrink-0">
                       <CalendarClock className="h-6 w-6 text-purple-600" />
                    </div>
                    <div>
                      <DialogTitle className="text-2xl font-black text-[#1a1a1a] font-serif leading-tight">{t('reschedule_oral')}</DialogTitle>
                      <DialogDescription className="text-slate-400 font-medium mt-1">Schedule oral interview for {selectedStudent?.studentName}</DialogDescription>
                    </div>
                 </div>
              </DialogHeader>
           </div>
           
           <div className="p-8 space-y-6">
              <div className="space-y-2">
                 <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t('pick_date')}</Label>
                 <Popover>
                    <PopoverTrigger asChild>
                       <Button variant="outline" className="w-full h-12 justify-start font-bold rounded-xl border-slate-200">
                          <CalendarIcon className="mr-2 h-4 w-4 text-purple-500" />
                          {oralDate ? format(oralDate, "PPP") : t('pick_date')}
                       </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 rounded-2xl overflow-hidden" align="start">
                       <Calendar
                          mode="single"
                          selected={oralDate}
                          onSelect={setOralDate}
                          initialFocus
                          modifiers={{ hasSlots: (date) => { const fmt = format(date, "yyyy-MM-dd"); return availableOralDates.dates.has(fmt) || availableOralDates.recurringDays.has(dayNames[getDay(date)]); } }}
                          modifiersClassNames={{ hasSlots: "relative after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-1 after:h-1 after:bg-purple-600 after:rounded-full" }}
                          disabled={(date) => {
                            const today = startOfDay(new Date());
                            const isPast = isBefore(startOfDay(date), today);
                            const hasNoSlots = !availableOralDates.dates.has(format(date, "yyyy-MM-dd")) && !availableOralDates.recurringDays.has(dayNames[getDay(date)]);
                            return isPast || hasNoSlots;
                          }}
                       />
                    </PopoverContent>
                 </Popover>
              </div>

              <div className="space-y-3">
                 <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t('available_slots')}</Label>
                 <div className="grid grid-cols-2 gap-2">
                    {oralDate ? (
                       oralSlots.length > 0 ? oralSlots.map(slot => (
                          <Button
                             key={slot.id}
                             variant="outline"
                             disabled={slot.isFull}
                             className={cn(
                                "h-11 rounded-lg font-bold text-xs",
                                selectedOralTime === slot.name ? "border-purple-600 bg-purple-50 text-purple-600" : "border-slate-100"
                             )}
                             onClick={() => setSelectedOralTime(slot.name)}
                          >
                             {slot.name} {slot.isFull && `(${t('cap')})`}
                          </Button>
                       )) : <p className="col-span-2 text-center text-xs text-slate-400 italic py-4">No slots available for this date.</p>
                    ) : <p className="col-span-2 text-center text-xs text-slate-400 italic py-4">Select a date to see times.</p>}
                 </div>
              </div>
           </div>

           <div className="p-8 pt-2 flex gap-3 bg-slate-50/50 border-t">
              <Button variant="outline" className="flex-1 h-12 rounded-xl font-bold" onClick={() => setIsScheduleOralOpen(false)}>{t('cancel')}</Button>
              <Button 
                className="flex-1 h-12 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold gap-2" 
                onClick={handleSaveOralSchedule}
                disabled={isSavingOral || !oralDate || !selectedOralTime}
              >
                {isSavingOral ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} {t('confirm')}
              </Button>
           </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function InterviewAssessmentManagementPage() {
  return (
    <React.Suspense fallback={<div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4"><Loader2 className="h-10 w-10 animate-spin text-blue-600" /><p className="text-slate-500 font-bold">Loading Assessment...</p></div>}>
      <InterviewAssessmentContent />
    </React.Suspense>
  );
}

