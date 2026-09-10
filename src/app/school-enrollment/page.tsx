
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
  CheckCircle2, 
  GraduationCap, 
  Building2,
  ChevronDown,
  Users,
  Phone,
  MapPin,
  Layers,
  RotateCcw
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  useFirestore, 
  useCollection, 
  useMemoFirebase, 
  useUser, 
  useEmployee, 
  updateDocumentNonBlocking 
} from "@/firebase";
import { collection, doc } from "firebase/firestore";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLanguage } from "@/context/language-context";

const enrollmentStatuses = [
  "Paid",
  "Enrolled",
  "Refund Request"
];

const statusStyles: { [key: string]: string } = {
  "Paid": "bg-green-50 text-green-700 border-green-100",
  "Enrolled": "bg-emerald-100 text-emerald-800 border-emerald-200",
  "Refund Request": "bg-amber-50 text-amber-700 border-amber-100",
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

export default function SchoolEnrollmentPage() {
  const router = useRouter();
  const db = useFirestore();
  const { user } = useUser();
  const { isDirector, isManager, campus: userCampus } = useEmployee();
  const canChangeStatus = isDirector || isManager;
  const { toast } = useToast();
  const { t, isRTL } = useLanguage();
  
  const [searchTerm, setSearchTerm] = React.useState("");
  const [grade, setGrade] = React.useState("all");
  const [school, setSchool] = React.useState("all");
  const [type, setType] = React.useState("all");
  const [status, setStatus] = React.useState("all");
  const [selectedCampus, setSelectedCampus] = React.useState("all");

  const appsQuery = useMemoFirebase(() => user ? collection(db, "applications") : null, [db, user]);
  const { data: applicationsData, isLoading } = useCollection(appsQuery);
  const applications = applicationsData || [];

  const gradesQuery = useMemoFirebase(() => user ? collection(db, "grade") : null, [db, user]);
  const { data: gradesDataRaw } = useCollection(gradesQuery);
  const gradesData = gradesDataRaw || [];

  const schoolsQuery = useMemoFirebase(() => user ? collection(db, "schools") : null, [db, user]);
  const { data: schoolsDataRaw } = useCollection(schoolsQuery);
  const schoolsData = schoolsDataRaw || [];

  const campusQuery = useMemoFirebase(() => collection(db, "campus"), [db]);
  const { data: campusDataRaw } = useCollection(campusQuery);
  const campusData = campusDataRaw || [];

  const filteredData = React.useMemo(() => {
    return (applications || [])
      .filter(item => {
        const itemStatus = item.status || "";
        const isInEnrollment = enrollmentStatuses.includes(itemStatus);
        if (!isInEnrollment) return false;

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

        const matchesSearch = 
          (item.studentName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.fatherPhone?.includes(searchTerm) ||
            item.primaryContactPhone?.includes(searchTerm));
        
        const matchesGrade = grade === "all" || item.grade === grade;
        const matchesSchool = school === "all" || item.school === school;
        const matchesType = type === "all" || item.category === type;
        const matchesStatus = status === "all" || item.status === status;
        const matchesCampus = selectedCampus === "all" || item.campus === selectedCampus;

        return matchesSearch && matchesGrade && matchesSchool && matchesType && matchesStatus && matchesCampus;
      })
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  }, [applications, searchTerm, grade, school, type, status, selectedCampus, isDirector, isManager, userCampus, user]);

  const isFiltering = React.useMemo(() => {
    return searchTerm !== "" || grade !== "all" || school !== "all" || type !== "all" || status !== "all" || selectedCampus !== "all";
  }, [searchTerm, grade, school, type, status, selectedCampus]);

  const handleResetFilters = () => {
    setSearchTerm("");
    setGrade("all");
    setSchool("all");
    setType("all");
    setStatus("all");
    setSelectedCampus("all");
  };

  const handleStatusChange = (id: string, newStatus: string) => {
    if (!canChangeStatus) {
      toast({ 
        variant: "destructive", 
        title: isRTL ? "غير مصرح" : "Unauthorized", 
        description: isRTL ? "تغيير حالة القبول والتسجيل مقتصر على الإدارة." : "Only Directors and Managers can update enrollment status." 
      });
      return;
    }
    updateDocumentNonBlocking(doc(db, "applications", id), { 
      status: newStatus, 
      updatedAt: new Date().toISOString() 
    });
    toast({ title: t('status') + " Updated", description: `Student updated to ${newStatus}.` });
  };

  return (
    <div className={cn("flex flex-col gap-6 w-full max-w-full animate-in fade-in duration-500", isRTL && "font-arabic")}>
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-black text-[#1a1a1a] font-serif flex items-center gap-3">
            <div className="h-12 w-12 bg-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-600/20">
              <CheckCircle2 className="h-7 w-7 text-white" />
            </div>
            {t('school_enrollment_title')}
          </h1>
          <p className="text-slate-400 font-medium ml-1">{t('manage_enrollment_desc')}</p>
        </div>
        <div className="text-sm font-bold text-slate-500 bg-white px-6 py-3 rounded-2xl border shadow-sm flex items-center gap-2">
          <Users className="h-4 w-4 text-blue-500" />
          <span>{t('total_records')}: {filteredData.length}</span>
        </div>
      </div>

      <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-6">
        <div className="flex flex-col lg:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full">
            <Search className={cn("absolute top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300", isRTL ? "right-4" : "left-4")} />
            <Input
              placeholder={t('search_enrolled_placeholder')}
              className={cn("h-12 rounded-xl bg-slate-50/50 border-transparent focus:bg-white focus:border-slate-200 transition-all shadow-none font-medium", isRTL ? "pr-12" : "pl-12")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap gap-2 w-full lg:w-auto">
            {isDirector && (
              <Select value={selectedCampus} onValueChange={setSelectedCampus}>
                <SelectTrigger className="h-12 w-[160px] rounded-xl border-slate-200 font-bold text-slate-600 bg-white">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-slate-400" />
                    <SelectValue placeholder={t('campus_label')} />
                  </div>
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all">{t('all_campuses')}</SelectItem>
                  {(campusData || []).map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            )}

            <Select value={school} onValueChange={setSchool} disabled={isManager}>
              <SelectTrigger className="h-12 w-[160px] rounded-xl border-slate-200 font-bold text-slate-600 bg-white">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-slate-400" />
                  <SelectValue placeholder={isManager ? userCampus : t('all_schools')} />
                </div>
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all" className="font-bold">{t('all_schools')}</SelectItem>
                {(schoolsData || []).map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={grade} onValueChange={setGrade}>
              <SelectTrigger className="h-12 w-[140px] rounded-xl border-slate-200 font-bold text-slate-600 bg-white">
                <div className="flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-slate-400" />
                  <SelectValue placeholder={t('all_grades')} />
                </div>
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all" className="font-bold">{t('all_grades')}</SelectItem>
                {(gradesData || []).map(g => <SelectItem key={g.id} value={g.name}>{g.name}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="h-12 w-[140px] rounded-xl border-slate-200 font-bold text-slate-600 bg-white">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-slate-400" />
                  <SelectValue placeholder="Type" />
                </div>
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all">Type</SelectItem>
                <SelectItem value="New Commer">{t('new_commer')}</SelectItem>
                <SelectItem value="Internal Transfer">{t('internal_transfer')}</SelectItem>
              </SelectContent>
            </Select>

            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-12 w-[140px] rounded-xl border-slate-200 font-bold text-slate-600 bg-white">
                <SelectValue placeholder={t('status')} />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all">{t('all_statuses')}</SelectItem>
                {enrollmentStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>

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
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden overflow-x-auto">
        <Table>
          <TableHeader className="bg-slate-50/50">
            <TableRow className="hover:bg-transparent border-slate-100 h-16">
              <TableHead className={cn("font-black text-[#1a1a1a] text-[10px] uppercase tracking-widest", isRTL ? "pr-10 text-right" : "pl-10 text-left")}>{t('id')}</TableHead>
              <TableHead className={cn("font-black text-[#1a1a1a] text-[10px] uppercase tracking-widest", isRTL ? "text-right" : "text-left")}>{t('student_name_header')}</TableHead>
              <TableHead className={cn("font-black text-[#1a1a1a] text-[10px] uppercase tracking-widest", isRTL ? "text-right" : "text-left")}>{t('parent_name')}</TableHead>
              <TableHead className={cn("font-black text-[#1a1a1a] text-[10px] uppercase tracking-widest", isRTL ? "text-right" : "text-left")}>{t('mother_name')}</TableHead>
              <TableHead className={cn("font-black text-[#1a1a1a] text-[10px] uppercase tracking-widest", isRTL ? "text-right" : "text-left")}>{t('campus_label')}</TableHead>
              <TableHead className={cn("font-black text-[#1a1a1a] text-[10px] uppercase tracking-widest", isRTL ? "text-right" : "text-left")}>{t('school')}</TableHead>
              <TableHead className={cn("font-black text-[#1a1a1a] text-[10px] uppercase tracking-widest", isRTL ? "text-right" : "text-left")}>{t('grade')}</TableHead>
              <TableHead className={cn("font-black text-[#1a1a1a] text-[10px] uppercase tracking-widest", isRTL ? "text-right" : "text-left")}>{t('category')}</TableHead>
              <TableHead className={cn("font-black text-[#1a1a1a] text-[10px] uppercase tracking-widest", isRTL ? "text-right" : "text-left")}>{t('current_status_header')}</TableHead>
              <TableHead className={cn("font-black text-[#1a1a1a] text-[10px] uppercase tracking-widest", isRTL ? "text-right" : "text-left")}>{t('contact_info_header')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.length > 0 ? (
              filteredData.map((item) => (
                <TableRow 
                  key={item.id} 
                  className="border-slate-50 h-24 hover:bg-slate-50/50 transition-colors cursor-pointer group"
                  onClick={() => router.push(`/students/${item.id}`)}
                >
                  <TableCell className={cn("font-bold text-slate-400 text-[11px] uppercase", isRTL ? "pr-10" : "pl-10")}>
                    {`${item.id}`}
                  </TableCell>
                  <TableCell className={cn("font-bold text-slate-800 text-sm whitespace-nowrap", isRTL ? "text-right" : "text-left")}>
                    {formatName(item.studentName)}
                  </TableCell>
                  <TableCell className={cn("text-slate-600 font-medium text-xs whitespace-nowrap", isRTL ? "text-right" : "text-left")}>
                    {formatName(item.fatherName || item.parentName)}
                  </TableCell>
                  <TableCell className={cn("text-slate-600 font-medium text-xs whitespace-nowrap", isRTL ? "text-right" : "text-left")}>
                    {formatName(item.motherName)}
                  </TableCell>
                  <TableCell className={cn("text-slate-600 font-bold text-[10px] uppercase whitespace-nowrap", isRTL ? "text-right" : "text-left")}>
                    <div className="flex items-center gap-1">
                      <MapPin className="h-2.5 w-2.5 text-blue-400" />
                      {item.campus || '—'}
                    </div>
                  </TableCell>
                  <TableCell className={cn("text-slate-600 font-bold text-[10px] uppercase whitespace-nowrap", isRTL ? "text-right" : "text-left")}>
                    <div className="flex items-center gap-1">
                      <Building2 className="h-2.5 w-2.5 text-emerald-400" />
                      {item.school || '—'}
                    </div>
                  </TableCell>
                  <TableCell className={cn("text-slate-900 font-bold text-xs", isRTL ? "text-right" : "text-left")}>
                    {item.grade || '—'}
                  </TableCell>
                  <TableCell className={cn("text-slate-800 font-bold text-xs", isRTL ? "text-right" : "text-left")}>
                    {item.category || '—'}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()} className={isRTL ? "text-right" : "text-left"}>
                    {canChangeStatus ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className={cn(
                            "inline-flex items-center gap-2 px-4 py-2 rounded-full border text-[10px] font-black uppercase tracking-wider transition-all hover:opacity-80 cursor-pointer",
                            statusStyles[item.status] || "bg-slate-50 text-slate-600 border-slate-200"
                          )}>
                            {item.status}
                            <ChevronDown className="h-3 w-3 opacity-40" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-56 rounded-xl shadow-2xl border-slate-100">
                          <ScrollArea className="h-48">
                            {enrollmentStatuses.map((status) => (
                              <DropdownMenuItem key={status} onClick={() => handleStatusChange(item.id, status)} className="text-xs font-bold py-3 cursor-pointer">
                                {status}
                              </DropdownMenuItem>
                            ))}
                          </ScrollArea>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : (
                      <span className={cn(
                        "inline-flex items-center gap-2 px-4 py-2 rounded-full border text-[10px] font-black uppercase tracking-wider select-none cursor-default",
                        statusStyles[item.status] || "bg-slate-50 text-slate-600 border-slate-200"
                      )}>
                        {item.status}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className={isRTL ? "text-right" : "text-left"}>
                    <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                      <Phone className="h-3.5 w-3.5 text-emerald-500" />
                      {item.primaryContactPhone || item.fatherPhone || item.motherPhone || '—'}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={10} className="h-64 text-center text-slate-300 font-bold italic">
                  {isLoading ? t('syncing') : "No students currently in Enrollment phase."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
