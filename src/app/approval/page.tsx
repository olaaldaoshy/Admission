
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
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Search, 
  CheckCircle2, 
  XCircle, 
  Eye, 
  Phone, 
  RotateCcw,
  Bell,
  Loader2,
  AlertCircle,
  MapPin,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useFirestore, useCollection, useMemoFirebase, updateDocumentNonBlocking, useEmployee, useUser } from "@/firebase";
import { collection, doc } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLanguage } from "@/context/language-context";

const statusStyles: { [key: string]: string } = {
  "Applicant": "bg-blue-50 text-blue-600 border-blue-100",
  "Confirmed Appointment/Test": "bg-indigo-50 text-indigo-600 border-indigo-100",
  "No Show": "bg-rose-50 text-rose-600 border-rose-100",
  "No show / No answer": "bg-rose-50 text-rose-500 border-rose-100",
  "Refund Request": "bg-amber-50 text-amber-700 border-amber-100",
  "Reschedule Appointment/Test": "bg-orange-50 text-orange-600 border-orange-100",
  "Cancelled by phone": "bg-rose-50 text-rose-500 border-rose-100",
  "Approved by Admission/Tested": "bg-emerald-50 text-emerald-700 border-emerald-100",
  "Failed Admission Test": "bg-rose-100 text-rose-800 border-rose-200",
  "Oral Interview": "bg-sky-50 text-sky-600 border-sky-100",
  "Reschedule Oral Interview": "bg-orange-100 text-orange-800 border-orange-200",
  "Approved By Principal": "bg-amber-50 text-amber-700 border-amber-100",
  "Rejected By Principal": "bg-rose-100 text-rose-700 border-rose-200",
  "Approved By Director": "bg-emerald-100 text-emerald-800 border-emerald-200",
  "Rejected By Director": "bg-rose-200 text-rose-900 border-rose-300",
  "Re-exam": "bg-violet-50 text-violet-700 border-violet-100",
  "Follow-up (Appointment/Test)": "bg-zinc-50 text-zinc-600 border-zinc-100",
  "Acceptance Sent": "bg-teal-50 text-teal-700 border-teal-100",
  "Waiting List": "bg-yellow-50 text-yellow-700 border-yellow-100",
  "Duplicate": "bg-slate-200 text-slate-700 border-slate-300",
  "Internal Transfer": "bg-blue-100 text-blue-800 border-blue-200",
  "Booked Place & Paid": "bg-teal-100 text-teal-800 border-teal-200",
  "Paid": "bg-green-100 text-green-800 border-green-100",
  "Enrolled": "bg-green-200 text-green-900 border-green-300",
  "Pending Committee Approval": "bg-slate-100 text-slate-600 border-slate-200",
  "Interview Scheduled Progress": "bg-cyan-50 text-cyan-700 border-cyan-100",
};

function ApprovalContent() {
  const searchParams = useSearchParams(); 
   const router = useRouter();
  
  const db = useFirestore();
  const { user } = useUser();
  const { isDirector, isManager, campus: userCampus, employee } = useEmployee();
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

  // Retest Dialog State
  const [isRetestOpen, setIsRetestOpen] = React.useState(false);
  const [selectedForRetest, setSelectedForRetest] = React.useState<any>(null);
  const [retestTypes, setRetestTypes] = React.useState<string[]>([]);
  const [retestReason, setRetestReason] = React.useState("");
  const [isSubmittingRetest, setIsSubmittingRetest] = React.useState(false);

  const appsQuery = useMemoFirebase(() => user ? collection(db, "applications") : null, [db, user]);
  const { data: applicationsData, isLoading } = useCollection(appsQuery);
  const applications = applicationsData || [];

  const gradesQuery = useMemoFirebase(() => user ? collection(db, "grade") : null, [db, user]);
  const { data: gradesDataRaw } = useCollection(gradesQuery);
  const gradesData = gradesDataRaw || [];

  const filteredData = React.useMemo(() => {
    return (applications || [])
      .filter(item => {
        if (!isDirector) {
          if (userCampus) {
            const target = userCampus.trim().toLowerCase();
            const appCampus = item.campus ? String(item.campus).trim().toLowerCase() : "";
            const appSchool = item.school ? String(item.school).trim().toLowerCase() : "";
            if (appCampus !== target && appSchool !== target) return false;
          } else {
            if (item.assignedEmployeeId !== user?.uid) return false;
          }
        }

        const statusLower = item.status?.toLowerCase() || "";
        
        if (activeTab === "pending") {
          if (item.status !== "Approved By Principal") return false;
        } else if (activeTab === "approved") {
          if (!statusLower.includes("approved") || item.status === "Approved By Principal") return false;
        } else if (activeTab === "rejected") {
          if (!statusLower.includes("rejected") && !statusLower.includes("failed")) return false;
        }

        const matchesSearch = 
          (item.studentName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.fatherName?.toLowerCase().includes(searchTerm.toLowerCase()));
        
        const matchesGrade = selectedGrade === "all" || item.grade === selectedGrade;

        return matchesSearch && matchesGrade;
      })
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  }, [applications, searchTerm, selectedGrade, activeTab, isDirector, isManager, userCampus, user]);

  const handleAction = (id: string, newStatus: string) => {
    updateDocumentNonBlocking(doc(db, "applications", id), { 
      status: newStatus,
      updatedAt: new Date().toISOString()
    });
    toast({
      title: "Status Updated",
      description: `Application updated to ${newStatus}.`,
    });
  };

  const handleOpenRetest = (student: any) => {
    setSelectedForRetest(student);
    setRetestTypes([]);
    setRetestReason("");
    setIsRetestOpen(true);
  };

  const handleConfirmRetest = async () => {
    if (!selectedForRetest) return;
    if (retestTypes.length === 0) {
      toast({ variant: "destructive", title: "Selection Required", description: "Please select at least one retest type." });
      return;
    }
    if (!retestReason.trim()) {
      toast({ variant: "destructive", title: "Reason Required", description: "Please explain the reason for the retest." });
      return;
    }

    setIsSubmittingRetest(true);
    try {
      const history = selectedForRetest.retestHistory || [];
      const newEntry = {
        date: new Date().toISOString(),
        types: retestTypes,
        reason: retestReason,
        createdBy: employee?.name || user?.email?.split('@')[0] || "System"
      };

      // If retesting ONLY Oral Interview, move to "Oral Interview" status so it goes to Oral Interview queue
      const onlyOralRetest = retestTypes.includes("Oral Interview Retest") && !retestTypes.includes("Interview Retest") && !retestTypes.includes("Assessment Retest");
      const targetStatus = onlyOralRetest ? "Oral Interview" : "Applicant";

      await updateDocumentNonBlocking(doc(db, "applications", selectedForRetest.id), {
        status: targetStatus,
        previousStatus: selectedForRetest.status,
        retestTypes: retestTypes,
        retestReason: retestReason,
        retestHistory: [...history, newEntry],
        updatedAt: new Date().toISOString()
      });

      toast({ 
        title: "Retest Created", 
        description: onlyOralRetest 
          ? `${selectedForRetest.studentName} has been moved to Oral Interview queue.` 
          : `${selectedForRetest.studentName} has been moved back to Applicant status.` 
      });
      setIsRetestOpen(false);
      
      // Switch tab within the same page
      onTabChange("pending");
    } catch (e) {
      console.error("Failed to create retest:", e);
      toast({ variant: "destructive", title: "Error", description: "Failed to create retest." });
    } finally {
      setIsSubmittingRetest(false);
    }
  };

  const toggleRetestType = (type: string) => {
    setRetestTypes(prev => 
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const getParentInterviewScore = (item: any) => {
    const admScores = item.admissionsScores || {};
    const vals = Object.values(admScores).map(Number).filter(n => !isNaN(n) && n > 0);
    if (vals.length > 0) return vals.reduce((a, b) => a + b, 0) / vals.length;
    if (item.parentAdmissionScore !== undefined && item.parentAdmissionScore !== null) {
      const p = parseFloat(item.parentAdmissionScore);
      if (!isNaN(p)) return p;
    }
    const raw = parseFloat(item.interviewScoreObtained);
    if (!isNaN(raw) && raw <= 4.0) return raw;
    return null;
  };

  const formatScore = (val: any) => {
    if (val === undefined || val === null || val === "") return '—';
    const num = parseFloat(val);
    if (isNaN(num)) return '—';
    const formatted = num % 1 === 0 ? num.toString() : num.toFixed(2);
    return `${formatted}/4.0`;
  };

  const getTotalScore = (item: any) => {
    const interview = getParentInterviewScore(item);
    const oral = parseFloat(item.oralScoreObtained);
    const hasInterview = interview !== null && !isNaN(interview);
    const hasOral = !isNaN(oral);

    if (!hasInterview && !hasOral) return '—';
    const total = ((hasInterview ? interview : 0) + (hasOral ? oral : 0)) / (hasInterview && hasOral ? 2 : 1);
    const formatted = total % 1 === 0 ? total.toString() : total.toFixed(2);
    return `${formatted}/4.0`;
  };

  const ScoreText = ({ value }: { value: string }) => {
    const numStr = value.split('/')[0];
    const num = parseFloat(numStr);
    let color = "text-emerald-500";
    if (isNaN(num)) return <span className="text-slate-300">—</span>;
    if (num < 2.0) color = "text-rose-500";
    else if (num < 3.0) color = "text-orange-500";
    
    return <span className={cn("font-bold", color)}>{value}</span>;
  };

  return (
    <div className={cn("flex flex-col gap-6 w-full max-w-full animate-in fade-in duration-500", isRTL && "font-arabic")}>
      <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
        <TabsList className="bg-slate-100/60 p-1 rounded-full w-fit mb-8 h-auto">
          <TabsTrigger value="pending" className="rounded-full px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm text-slate-600 text-xs font-bold">{t('pending_interview')}</TabsTrigger>
          <TabsTrigger value="approved" className="rounded-full px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm text-slate-600 text-xs font-bold">{t('passed')}</TabsTrigger>
          <TabsTrigger value="rejected" className="rounded-full px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm text-slate-600 text-xs font-bold">{t('failed')}</TabsTrigger>
        </TabsList>

        <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black text-[#1a1a1a] font-serif capitalize">
              {activeTab === 'pending' ? t('pending_interview') : activeTab === 'approved' ? t('passed') : t('failed')}
            </h2>
            <div className="text-sm font-bold text-slate-400">{t('total')}: {filteredData.length}</div>
          </div>

          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="relative flex-1 w-full">
              <Search className={cn("absolute top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300", isRTL ? "right-4" : "left-4")} />
              <Input
                placeholder={t('search_placeholder')}
                className={cn("h-12 rounded-xl bg-slate-50/50 border-slate-100 focus:bg-white transition-all shadow-none", isRTL ? "pr-11" : "pl-11")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={selectedGrade} onValueChange={setSelectedGrade}>
              <SelectTrigger className="h-12 w-full md:w-[180px] rounded-xl border-slate-100 bg-slate-50/50 font-bold text-slate-600">
                <SelectValue placeholder={t('grades')} />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all" className="font-bold">{t('all_grades')}</SelectItem>
                {(gradesData || []).map(g => (
                  <SelectItem key={g.id} value={g.name}>{g.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-2xl border border-slate-100 overflow-hidden shadow-sm overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow className="h-14 border-slate-100 hover:bg-transparent">
                  <TableHead className={cn("font-bold text-[#1a1a1a] text-[11px] uppercase tracking-wider", isRTL ? "pr-6 text-right" : "pl-6 text-left")}>{t('id')}</TableHead>
                  <TableHead className={cn("font-bold text-[#1a1a1a] text-[11px] uppercase tracking-wider", isRTL ? "text-right" : "text-left")}>{t('student_name')}</TableHead>
                  <TableHead className={cn("font-bold text-[#1a1a1a] text-[11px] uppercase tracking-wider", isRTL ? "text-right" : "text-left")}>{t('campus_label')}</TableHead>
                  <TableHead className={cn("font-bold text-[#1a1a1a] text-[11px] uppercase tracking-wider", isRTL ? "text-right" : "text-left")}>{t('parent_name')}</TableHead>
                  <TableHead className={cn("font-bold text-[#1a1a1a] text-[11px] uppercase tracking-wider", isRTL ? "text-right" : "text-left")}>{t('grade')}</TableHead>
                  <TableHead className={cn("font-bold text-[#1a1a1a] text-[11px] uppercase tracking-wider", isRTL ? "text-right" : "text-left")}>{t('status')}</TableHead>
                  <TableHead className={cn("font-bold text-[#1a1a1a] text-[11px] uppercase tracking-wider", isRTL ? "text-right" : "text-left")}>{t('phone_label')}</TableHead>
                  <TableHead className="font-bold text-[#1a1a1a] text-[11px] uppercase tracking-wider text-center">{t('student_score')}</TableHead>
                  <TableHead className="font-bold text-[#1a1a1a] text-[11px] uppercase tracking-wider text-center">{t('parent_score')}</TableHead>
                  <TableHead className="font-bold text-[#1a1a1a] text-[11px] uppercase tracking-wider text-center">{t('total_average')}</TableHead>
                  <TableHead className={cn("font-bold text-[#1a1a1a] text-[11px] uppercase tracking-wider text-center", isRTL ? "pl-6" : "pr-6")}>{t('actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.length > 0 ? (
                  filteredData.map((item) => (
                    <TableRow 
                      key={item.id} 
                      className="h-20 border-slate-50 hover:bg-slate-50/50 transition-colors group cursor-pointer"
                      onClick={() => router.push(`/students/${item.id}`)}
                    >
                      <TableCell className={cn("font-bold text-slate-400 text-[11px] uppercase", isRTL ? "pr-6" : "pl-6")}>
                        {`APP${item.id}`}
                      </TableCell>
                      <TableCell className={cn("font-bold text-blue-500 text-sm whitespace-nowrap", isRTL ? "text-right" : "text-left")}>
                        {item.studentName}
                      </TableCell>
                      <TableCell className={cn("text-slate-600 font-bold text-[10px] uppercase whitespace-nowrap", isRTL ? "text-right" : "text-left")}>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-2.5 w-2.5 text-blue-400" />
                          {item.campus || '—'}
                        </div>
                      </TableCell>
                      <TableCell className={cn("text-slate-600 font-medium text-xs whitespace-nowrap", isRTL ? "text-right" : "text-left")}>
                        {item.parentName || item.fatherName || '—'}
                      </TableCell>
                      <TableCell className={isRTL ? "text-right" : "text-left"}>
                        <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-100 font-bold px-2.5 py-0.5 rounded-lg text-[10px]">
                          {item.grade}
                        </Badge>
                      </TableCell>
                      <TableCell className={isRTL ? "text-right" : "text-left"}>
                        <Badge variant="outline" className={cn(
                          "font-bold px-2.5 py-0.5 rounded-lg text-[10px] whitespace-nowrap border",
                          statusStyles[item.status] || "bg-slate-50 text-slate-600 border-slate-100"
                        )}>
                          {item.status}
                        </Badge>
                      </TableCell>
                      <TableCell className={isRTL ? "text-right" : "text-left"}>
                        <div className="flex items-center gap-2 text-slate-700 font-bold text-xs whitespace-nowrap">
                          <Phone className="h-3.5 w-3.5 text-emerald-500" />
                          {item.fatherPhone || item.motherPhone || '—'}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <ScoreText value={formatScore(item.studentInterviewScoreObtained)} />
                      </TableCell>
                      <TableCell className="text-center">
                        <ScoreText value={formatScore(getParentInterviewScore(item))} />
                      </TableCell>
                      <TableCell className="text-center">
                        <ScoreText value={getTotalScore(item)} />
                      </TableCell>
                      <TableCell className={cn("text-center", isRTL ? "pl-6" : "pr-6")} onClick={(e) => e.stopPropagation()}>
                        {activeTab === "pending" ? (
                          <div className="flex items-center justify-center gap-2">
                             <Button 
                                size="sm" 
                                className="h-9 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl gap-2 shadow-sm"
                                onClick={() => handleAction(item.id, isDirector ? "Approved By Director" : "Approved By Principal")}
                             >
                                <CheckCircle2 className="h-4 w-4" /> {t('approve')}
                             </Button>
                             <Button 
                                variant="outline"
                                size="sm" 
                                className="h-9 px-4 border-rose-200 text-rose-600 hover:bg-rose-50 font-bold rounded-xl gap-2 shadow-sm"
                                onClick={() => handleAction(item.id, isDirector ? "Rejected By Director" : "Rejected By Principal")}
                             >
                                <XCircle className="h-4 w-4" /> {t('reject')}
                             </Button>
                             <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-9 px-4 border-slate-200 text-slate-700 font-bold hover:bg-slate-50 rounded-xl gap-2 shadow-sm"
                                onClick={() => router.push(`/students/${item.id}`)}
                             >
                                <Eye className="h-4 w-4" /> {t('view')}
                             </Button>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-1.5">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-8 w-full justify-start gap-2 border-blue-200 text-blue-600 hover:bg-blue-50 text-[10px] font-bold rounded-lg"
                              onClick={() => handleOpenRetest(item)}
                            >
                              <RotateCcw className="h-3.5 w-3.5" /> {t('reschedule')}
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-8 w-full justify-start gap-2 border-slate-200 text-slate-600 hover:bg-slate-50 text-[10px] font-bold rounded-lg"
                              onClick={() => toast({ title: t('remind'), description: `${item.studentName}` })}
                            >
                              <Bell className="h-3.5 w-3.5" /> {t('remind')}
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-8 w-full justify-start gap-2 border-slate-200 text-slate-600 hover:bg-slate-50 text-[10px] font-bold rounded-lg"
                              onClick={() => router.push(`/students/${item.id}`)}
                            >
                              <Eye className="h-3.5 w-3.5" /> {t('view')}
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={12} className="h-48 text-center text-slate-300 font-bold italic">
                      {isLoading ? t('syncing') : t('syncing')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </Tabs>

      {/* Create Retest Dialog */}
      <Dialog open={isRetestOpen} onOpenChange={setIsRetestOpen}>
        <DialogContent className={cn("max-w-[420px] p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl", isRTL && "font-arabic")}>
          <div className="p-8 pb-4">
            <DialogHeader className="relative">
               <button onClick={() => setIsRetestOpen(false)} className={cn("absolute top-0 h-6 w-6 text-slate-300 hover:text-slate-600 transition-colors", isRTL ? "left-0" : "right-0")}>
                  <X className="h-5 w-5" />
               </button>
               <div className="flex items-start gap-4">
                  <div className="h-10 w-10 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
                     <RotateCcw className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <DialogTitle className="text-2xl font-black text-[#1a1a1a] font-serif leading-tight">{t('reschedule')}</DialogTitle>
                    <DialogDescription className="text-slate-400 font-medium mt-1">
                      {t('reschedule_reason')}
                    </DialogDescription>
                  </div>
               </div>
            </DialogHeader>
          </div>

          <ScrollArea className="max-h-[60vh]">
            <div className="px-8 space-y-6 pb-6">
              <div className="p-5 bg-rose-50/50 rounded-2xl border border-rose-100 space-y-4 relative overflow-hidden">
                <div className="flex items-center gap-2 text-rose-800 font-black text-xs uppercase tracking-wider mb-1">
                    <AlertCircle className="h-3.5 w-3.5" />
                    {t('student_details')}
                </div>
                <div className="grid grid-cols-2 gap-y-4 gap-x-4">
                    <div className="space-y-0.5">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{t('student_name')}:</p>
                      <p className="text-xs font-bold text-slate-700 truncate">{selectedForRetest?.studentName}</p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{t('id')}:</p>
                      <p className="text-xs font-bold text-slate-700">APP{selectedForRetest?.id}</p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{t('campus_label')}:</p>
                      <p className="text-xs font-bold text-slate-700">{selectedForRetest?.school || '—'}</p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{t('grade')}:</p>
                      <p className="text-xs font-bold text-slate-700">{selectedForRetest?.grade}</p>
                    </div>
                </div>
                <div className="space-y-0.5 pt-1">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{t('status')}:</p>
                    <p className="text-xs font-bold text-rose-600">{selectedForRetest?.status}</p>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-widest">Select Retest Type(s)</h3>
                <div className="space-y-2">
                    {["Interview Retest", "Assessment Retest", "Oral Interview Retest"].map((type) => (
                      <div 
                        key={type} 
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-xl border-2 transition-all cursor-pointer",
                          retestTypes.includes(type) ? "border-blue-600 bg-blue-50/50" : "border-slate-100 hover:border-slate-200"
                        )}
                        onClick={() => toggleRetestType(type)}
                      >
                        <Checkbox 
                          checked={retestTypes.includes(type)} 
                          onCheckedChange={() => toggleRetestType(type)} 
                          className="rounded-md h-4 w-4 border-slate-300"
                        />
                        <span className={cn("text-xs font-bold", retestTypes.includes(type) ? "text-blue-700" : "text-slate-600")}>{type}</span>
                      </div>
                    ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[11px] font-black text-slate-800 uppercase tracking-widest">{t('reschedule_reason')} <span className="text-rose-500">*</span></Label>
                <Textarea 
                  placeholder="..." 
                  className="min-h-[80px] rounded-xl bg-slate-50 border-slate-100 resize-none text-xs font-medium p-3 focus-visible:ring-blue-500/20"
                  value={retestReason}
                  onChange={(e) => setRetestReason(e.target.value)}
                />
              </div>
            </div>
          </ScrollArea>

          <div className="p-8 pt-4 flex gap-3 border-t border-slate-50">
             <Button variant="outline" className="flex-1 l h-11 rounded-xl border-slate-200 text-slate-600 font-bold text-xs" onClick={() => setIsRetestOpen(false)}>{t('cancel')}</Button>
             <Button 
                className="flex-1 h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-lg shadow-blue-500/20 gap-2 text-xs"
                onClick={handleConfirmRetest}
                disabled={isSubmittingRetest}
             >
                {isSubmittingRetest ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : t('confirm')}
             </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
export default function ApprovalPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex min-h-[300px] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      }
    >
      <ApprovalContent />
    </React.Suspense>
  );
}
