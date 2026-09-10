
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
import { Calendar as CalendarComp } from "@/components/ui/calendar";
import { 
  Search, 
  Calendar as CalendarIcon, 
  GraduationCap, 
  Building2,
  MapPin,
  Filter,
  Layers,
  RotateCcw,
  ChevronDown,
  Phone,
  Clock,
  X,
  Loader2,
  Save,
  Trophy
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { useFirestore, useCollection, useMemoFirebase, useUser, useEmployee, updateDocumentNonBlocking } from "@/firebase";
import { collection, doc, updateDoc, arrayUnion } from "firebase/firestore";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/context/language-context";

const resultStatuses = [
  "Passed Oral Interview",
  "Approved by Director",
  "Acceptance Sent",
  "Paid",
  "Waiting List",
  "Refund Request",
  "Duplicate"
];

const statusStyles: Record<string, string> = {
  "Passed Oral Interview": "bg-blue-50 text-blue-700 border-blue-100",
  "Approved by Director": "bg-emerald-50 text-emerald-700 border-emerald-100",
  "Acceptance Sent": "bg-sky-50 text-sky-700 border-sky-100",
  "Paid": "bg-green-50 text-green-700 border-green-100",
  "Waiting List": "bg-yellow-50 text-yellow-700 border-yellow-100",
  "Refund Request": "bg-amber-50 text-amber-700 border-amber-100",
  "Duplicate": "bg-slate-100 text-slate-600 border-slate-200",
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

const getAdmissionsScore = (item: any) => {
  const admScores = item?.admissionsScores || {};
  const vals = Object.values(admScores).map(Number).filter(n => !isNaN(n) && n > 0);
  if (vals.length > 0) return vals.reduce((a, b) => a + b, 0) / vals.length;
  if (item?.parentAdmissionScore !== undefined && item?.parentAdmissionScore !== null) {
    const p = parseFloat(item.parentAdmissionScore);
    if (!isNaN(p)) return p;
  }
  const raw = parseFloat(item?.interviewScoreObtained);
  if (!isNaN(raw) && raw <= 4.0) return raw;
  return null;
};

const ScoreBadge = ({ value, label }: { value: any, label: string }) => {
  const num = parseFloat(value);
  const isValid = !isNaN(num);
  const formatted = isValid ? (num % 1 === 0 ? num.toString() : num.toFixed(2)) : "—";
  
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter whitespace-nowrap">{label}</span>
      <Badge variant="outline" className={cn(
        "font-black px-2 py-0.5 rounded-lg text-[10px] min-w-[45px] justify-center",
        isValid ? "bg-blue-50 text-blue-600 border-blue-100" : "bg-slate-50 text-slate-300 border-slate-100"
      )}>
        {formatted}
      </Badge>
    </div>
  );
};

export default function FinalResultPage() {
  const router = useRouter();
  const db = useFirestore();
  const { user } = useUser();
  const { isDirector, isManager, campus: userCampus, employee } = useEmployee();
  const canChangeStatus = isDirector || isManager;
  const { toast } = useToast();
  const { t, isRTL } = useLanguage();
  
  const [searchTerm, setSearchTerm] = React.useState("");
  const [selectedStatus, setSelectedStatus] = React.useState("all");
  const [grade, setGrade] = React.useState("all");
  const [school, setSchool] = React.useState("all");
  const [type, setType] = React.useState("all");

  // Postponed Logic
  const [isPostponeOpen, setIsPostponeOpen] = React.useState(false);
  const [selectedStudent, setSelectedStudent] = React.useState<any>(null);
  const [postponeComment, setPostponeComment] = React.useState("");
  const [isSavingPostpone, setIsSavingPostpone] = React.useState(false);

  const appsQuery = useMemoFirebase(() => user ? collection(db, "applications") : null, [db, user]);
  const { data: applicationsRaw, isLoading } = useCollection(appsQuery);
  const applications = applicationsRaw || [];

  // Auto-heal applications where interviewScoreObtained was overwritten by an academic percentage (> 4.0)
  React.useEffect(() => {
    if (!applicationsRaw || !db) return;
    applicationsRaw.forEach((app: any) => {
      const admScores = app.admissionsScores || {};
      const vals = Object.values(admScores).map(Number).filter(n => !isNaN(n) && n > 0);
      if (vals.length > 0) {
        const rubricAvg = vals.reduce((a, b) => a + b, 0) / vals.length;
        if (app.interviewScoreObtained !== undefined && app.interviewScoreObtained !== null && Number(app.interviewScoreObtained) > 4.0) {
          updateDoc(doc(db, "applications", app.id), {
            interviewScoreObtained: rubricAvg,
            parentAdmissionScore: rubricAvg,
            academicScoreObtained: app.interviewScoreObtained
          }).catch(err => console.error("Auto heal score err in final-result:", err));
        }
      }
    });
  }, [applicationsRaw, db]);

  const gradesQuery = useMemoFirebase(() => user ? collection(db, "grade") : null, [db, user]);
  const { data: gradesDataRaw } = useCollection(gradesQuery);
  const gradesData = (gradesDataRaw || []).filter(Boolean);

  const schoolsQuery = useMemoFirebase(() => user ? collection(db, "schools") : null, [db, user]);
  const { data: schoolsDataRaw } = useCollection(schoolsQuery);
  const schoolsData = (schoolsDataRaw || []).filter(Boolean);

  const filteredData = React.useMemo(() => {
    return (applications || [])
      .filter(item => {
        const status = item.status || "";
        if (status === "Cancelled by Phone" || status === "No Answer" || status === "Postponed") return false;
        if (!resultStatuses.includes(status)) return false;

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

        if (selectedStatus !== "all" && item.status !== selectedStatus) return false;
        if (grade !== "all" && item.grade !== grade) return false;
        if (school !== "all" && item.school !== school) return false;
        if (type !== "all" && item.category !== type) return false;
        
        return item.studentName?.toLowerCase().includes(searchTerm.toLowerCase()) || item.id.toLowerCase().includes(searchTerm.toLowerCase());
      })
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  }, [applications, searchTerm, selectedStatus, grade, school, type, isDirector, isManager, userCampus, user]);

  const isFiltering = React.useMemo(() => {
    return searchTerm !== "" || selectedStatus !== "all" || grade !== "all" || school !== "all" || type !== "all";
  }, [searchTerm, selectedStatus, grade, school, type]);

  const handleResetFilters = () => {
    setSearchTerm("");
    setGrade("all");
    setSchool("all");
    setType("all");
    setSelectedStatus("all");
  };

  const handleStatusUpdate = async (item: any, newStatus: string) => {
    if (!canChangeStatus) {
      toast({ 
        variant: "destructive", 
        title: isRTL ? "غير مصرح" : "Unauthorized", 
        description: isRTL ? "تغيير حالة الطالب في النتائج النهائية مقتصر على الإدارة." : "Only Directors and Managers can update final result status." 
      });
      return;
    }
    if (newStatus === item.status) return;

    if (newStatus === "Postponed") {
      setSelectedStudent(item);
      setPostponeComment("");
      setIsPostponeOpen(true);
      return;
    }

    if (newStatus === "Cancelled by Phone") {
      toast({ title: "Moved to Sales", description: `${item.studentName} is now in the Sales queue.` });
    }
    await updateDoc(doc(db, "applications", item.id), { 
      status: newStatus, 
      previousStatus: item.status,
      updatedAt: new Date().toISOString() 
    });
    toast({ title: "Status Updated" });
  };

  const handleSavePostpone = async () => {
    if (!canChangeStatus) {
      toast({ 
        variant: "destructive", 
        title: isRTL ? "غير مصرح" : "Unauthorized", 
        description: isRTL ? "تأجيل الطالب في النتائج النهائية مقتصر على الإدارة." : "Only Directors and Managers can postpone final results." 
      });
      return;
    }
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
      console.error("Failed to save postpone status in final-result:", e);
      toast({ variant: "destructive", title: "Error" });
    } finally {
      setIsSavingPostpone(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6 w-full max-w-full animate-in fade-in duration-500", isRTL && "font-arabic")}>
      <h1 className="text-3xl font-black text-[#1a1a1a] font-serif">{t('final_results_title')}</h1>
      <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-6">
        <div className="flex flex-col lg:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full"><Search className={cn("absolute top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300", isRTL ? "right-4" : "left-4")} /><Input placeholder={t('search_placeholder')} className={cn("h-12 rounded-2xl bg-slate-50 border-transparent focus:bg-white focus:border-slate-100 transition-all", isRTL ? "pr-11" : "pl-11")} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div>
          <div className="flex flex-wrap gap-2">
            <Select value={grade} onValueChange={setGrade}><SelectTrigger className="h-11 w-[130px] rounded-xl border-slate-200 font-bold text-slate-600 bg-white"><SelectValue placeholder={t('grades')} /></SelectTrigger><SelectContent className="rounded-xl"><SelectItem value="all">{t('all_grades')}</SelectItem>{gradesData.map(g => <SelectItem key={g.id} value={g.name}>{g.name}</SelectItem>)}</SelectContent></Select>
            <Select value={school} onValueChange={setSchool}><SelectTrigger className="h-11 w-[150px] rounded-xl border-slate-200 font-bold text-slate-600 bg-white"><SelectValue placeholder={t('school')} /></SelectTrigger><SelectContent className="rounded-xl"><SelectItem value="all">{t('all_schools')}</SelectItem>{schoolsData.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}</SelectContent></Select>
            <Select value={type} onValueChange={setType}><SelectTrigger className="h-11 w-[130px] rounded-xl border-slate-200 font-bold text-slate-600 bg-white"><SelectValue placeholder={t('type_label')} /></SelectTrigger><SelectContent className="rounded-xl"><SelectItem value="all">Type</SelectItem><SelectItem value="New Commer">{t('new_commer')}</SelectItem><SelectItem value="Internal Transfer">{t('internal_transfer')}</SelectItem></SelectContent></Select>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}><SelectTrigger className="h-11 w-[160px] rounded-xl border-slate-200 font-bold text-slate-600 bg-white"><SelectValue placeholder={t('status')} /></SelectTrigger><SelectContent className="rounded-xl"><SelectItem value="all">{t('all_statuses')}</SelectItem>{resultStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
            {isFiltering && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-11 w-11 rounded-xl text-rose-500 hover:bg-rose-50 transition-all" 
                onClick={handleResetFilters}
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow className="h-16">
                <TableHead className={cn("font-black text-[#1a1a1a] text-[10px] uppercase", isRTL ? "pr-8 text-right" : "pl-8 text-left")}>{t('id')}</TableHead>
                <TableHead className={cn("font-black text-[#1a1a1a] text-[10px] uppercase", isRTL ? "text-right" : "text-left")}>{t('student_name')}</TableHead>
                <TableHead className={cn("font-black text-[#1a1a1a] text-[10px] uppercase", isRTL ? "text-right" : "text-left")}>{t('campus_label')}</TableHead>
                <TableHead className={cn("font-black text-[#1a1a1a] text-[10px] uppercase", isRTL ? "text-right" : "text-left")}>{t('grade')}</TableHead>
                <TableHead className="font-black text-[#1a1a1a] text-[9px] uppercase text-center px-1">Admission Interview</TableHead>
                <TableHead className="font-black text-[#1a1a1a] text-[9px] uppercase text-center px-1">Parents Interview</TableHead>
                <TableHead className="font-black text-[#1a1a1a] text-[9px] uppercase text-center px-1">Student Interview</TableHead>
                <TableHead className={cn("font-black text-[#1a1a1a] text-[10px] uppercase", isRTL ? "text-right" : "text-left")}>{t('status')}</TableHead>
                <TableHead className={cn("font-black text-[#1a1a1a] text-[10px] uppercase", isRTL ? "text-right" : "text-left")}>{t('contact_info_header')}</TableHead>
                <TableHead className={cn("font-black text-[#1a1a1a] text-[10px] uppercase text-center", isRTL ? "pl-8" : "pr-8")}>{t('appointment')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.length > 0 ? filteredData.map(item => (
                <TableRow key={item.id} className="h-24 hover:bg-slate-50/50 cursor-pointer" onClick={() => router.push(`/students/${item.id}`)}>
                  <TableCell className={cn("font-bold text-slate-400 text-[11px]", isRTL ? "pr-8" : "pl-8")}>{item.id}</TableCell>
                  <TableCell className={cn("font-bold text-slate-800 text-sm whitespace-nowrap", isRTL ? "text-right" : "text-left")}>{formatName(item.studentName)}</TableCell>
                  <TableCell className={cn("text-slate-600 font-bold text-[10px] uppercase whitespace-nowrap", isRTL ? "text-right" : "text-left")}>
                    <div className="flex items-center gap-1">
                      <MapPin className="h-2.5 w-2.5 text-blue-400" />
                      {item.campus || '—'}
                    </div>
                  </TableCell>
                  <TableCell className={cn("text-slate-500 font-bold text-xs", isRTL ? "text-right" : "text-left")}>{item.grade}</TableCell>
                  <TableCell className="text-center px-1">
                    <ScoreBadge value={getAdmissionsScore(item)} label="ADMISSIONS" />
                  </TableCell>
                  <TableCell className="text-center px-1">
                    <ScoreBadge value={item.oralScoreObtained} label="PARENT" />
                  </TableCell>
                  <TableCell className="text-center px-1">
                    <ScoreBadge value={item.studentInterviewScoreObtained} label="STUDENT" />
                  </TableCell>
                  <TableCell onClick={e => e.stopPropagation()} className={isRTL ? "text-right" : "text-left"}>
                    {canChangeStatus ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className={cn("inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[10px] font-black uppercase transition-all focus:outline-none hover:opacity-80 cursor-pointer", statusStyles[item.status] || "bg-slate-50 text-slate-600 border-slate-100")}>
                            {item.status} <ChevronDown className="h-3 w-3 opacity-40" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align={isRTL ? "end" : "start"} className="w-56 rounded-xl shadow-2xl border-slate-100">
                          <ScrollArea className="h-64">
                            {[...resultStatuses, "Postponed", "Cancelled by Phone"].map(s => (
                              <DropdownMenuItem key={s} onClick={() => handleStatusUpdate(item, s)} className="text-xs font-bold py-2.5 cursor-pointer">
                                {s}
                              </DropdownMenuItem>
                            ))}
                          </ScrollArea>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : (
                      <span className={cn("inline-flex items-center px-3 py-1.5 rounded-full border text-[10px] font-black uppercase select-none cursor-default", statusStyles[item.status] || "bg-slate-50 text-slate-600 border-slate-100")}>
                        {item.status}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className={isRTL ? "text-right" : "text-left"}><div className="flex items-center gap-2 text-slate-700 font-bold text-xs"><Phone className="h-3.5 w-3.5 text-emerald-500" /> {item.primaryContactPhone || item.fatherPhone || item.motherPhone || '—'}</div></TableCell>
                  <TableCell className={cn("text-center", isRTL ? "pl-8" : "pr-8")}><div className="flex flex-col gap-0.5 items-center"><span className="flex items-center gap-1 text-[10px] font-bold text-slate-700"><CalendarIcon className="h-2.5 w-2.5 text-blue-500" /> {item.interviewDate || '—'}</span><span className="flex items-center gap-1 text-[10px] font-medium text-slate-400"><Clock className="h-2.5 w-2.5 text-emerald-500" /> {item.interviewTime || '—'}</span></div></TableCell>
                </TableRow>
              )) : <TableRow><TableCell colSpan={10} className="h-48 text-center text-slate-300 font-bold italic">No final results found.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
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
