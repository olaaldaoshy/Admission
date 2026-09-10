
"use client";

import * as React from "react";
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
  Eye, 
  Calendar as CalendarIcon, 
  GraduationCap, 
  Building2,
  MapPin,
  Loader2,
  UserX,
  FileText,
  Lock
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useFirestore, useCollection, useMemoFirebase, useUser, useEmployee } from "@/firebase";
import { collection } from "firebase/firestore";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/context/language-context";

function RejectedStudentsCuont() {
  const router = useRouter();
  const db = useFirestore();
  const { user } = useUser();
  const { isDirector, isManager, campus: userCampus, isLoading: isAuthLoading } = useEmployee();
  const { t, isRTL } = useLanguage();
  
  const [searchTerm, setSearchTerm] = React.useState("");
  const [grade, setGrade] = React.useState("all");
  const [school, setSchool] = React.useState("all");
  const [date, setDate] = React.useState<DateRange | undefined>(undefined);

  const appsQuery = useMemoFirebase(() => user ? collection(db, "applications") : null, [db, user]);
  const { data: applicationsData, isLoading } = useCollection(appsQuery);
  const applications = applicationsData || [];

  const employeesQuery = useMemoFirebase(() => user ? collection(db, "employees") : null, [db, user]);
  const { data: employeesDataRaw } = useCollection(employeesQuery);
  const employees = employeesDataRaw || [];

  const gradesQuery = useMemoFirebase(() => user ? collection(db, "grade") : null, [db, user]);
  const { data: gradesDataRaw } = useCollection(gradesQuery);
  const gradesData = gradesDataRaw || [];

  const schoolsQuery = useMemoFirebase(() => user ? collection(db, "schools") : null, [db, user]);
  const { data: schoolsDataRaw } = useCollection(schoolsQuery);
  const schoolsData = schoolsDataRaw || [];

  const empCampusMap = React.useMemo(() => {
    const map = new Map();
    employees.forEach(e => map.set(e.id, e.campus));
    return map;
  }, [employees]);

  const filteredData = React.useMemo(() => {
    return (applications || [])
      .filter(item => {
        if (!isDirector) {
          if (userCampus) {
            const target = userCampus.trim().toLowerCase();
            const appCampus = item.campus ? String(item.campus).trim().toLowerCase() : "";
            const appSchool = item.school ? String(item.school).trim().toLowerCase() : "";
            const assignedEmpCampus = empCampusMap.get(item.assignedEmployeeId)?.trim().toLowerCase();
            if (appCampus !== target && appSchool !== target && assignedEmpCampus !== target) return false;
          } else {
            return false;
          }
        }

        const statusLower = item.status?.toLowerCase() || "";
        const isRejected = statusLower.includes("rejected") || statusLower.includes("failed");
        
        if (!isRejected) return false;

        const appDate = new Date(item.applicationDate || item.createdAt);
        const from = date?.from ? new Date(date.from) : null;
        const to = date?.to ? new Date(date.to) : null;
        if(from) from.setHours(0,0,0,0);
        if(to) to.setHours(23,59,59,999);

        const matchesSearch = 
          (item.studentName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.id.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesGrade = grade === "all" || item.grade === grade;
        const matchesSchool = school === "all" || item.school === school;
        const matchesDate = (!from || appDate >= from) && (!to || appDate <= to);

        return matchesSearch && matchesGrade && matchesSchool && matchesDate;
      })
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  }, [applications, searchTerm, grade, school, date, isDirector, isManager, userCampus, empCampusMap]);

  if (isAuthLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 font-bold">Checking Permissions...</p>
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
          <h2 className="text-3xl font-black text-slate-800 font-serif">Access Restricted</h2>
          <p className="text-slate-500 font-medium max-w-md mx-auto">
            The rejected students registry is reserved for Director and Campus Manager roles.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-full animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-black text-[#1a1a1a] font-serif flex items-center gap-3">
            <div className="h-10 w-10 bg-rose-100 rounded-xl flex items-center justify-center">
              <UserX className="h-6 w-6 text-rose-600" />
            </div>
            Rejected Students List
          </h1>
          {isManager && <Badge variant="outline" className="w-fit bg-blue-50 text-blue-600 font-bold border-blue-100">Manager: {userCampus}</Badge>}
        </div>
        <div className="text-sm font-bold text-slate-500 bg-white px-4 py-2 rounded-xl border">
          Total Mapped: {filteredData.length}
        </div>
      </div>

      <div className="space-y-4 mb-8">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by name or applicant ID..."
              className="h-12 pl-10 rounded-xl bg-white border-slate-200 focus-visible:ring-blue-500/20 shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="w-full lg:w-[320px]">
             <div className="flex items-center gap-2 h-12 bg-rose-50 border border-rose-100 px-4 rounded-xl text-rose-700 font-bold">
                <FileText className="h-4 w-4" />
                <span>Auto-Filtering: Rejected Status Only</span>
             </div>
          </div>
        </div>
        
        <div className="flex flex-wrap justify-end gap-2">
          <div className="w-full sm:w-[160px]">
            <Select value={grade} onValueChange={setGrade}>
              <SelectTrigger className="h-12 rounded-xl bg-white border-slate-200 shadow-sm font-medium">
                <div className="flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-slate-400" />
                  <SelectValue placeholder="All Grades" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="font-bold">All Grades</SelectItem>
                {(gradesData || []).map(g => (
                  <SelectItem key={g.id} value={g.name}>{g.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-full sm:w-[180px]">
            <Select value={school} onValueChange={setSchool} disabled={isManager}>
              <SelectTrigger className="h-12 rounded-xl bg-white border-slate-200 shadow-sm font-medium">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-slate-400" />
                  <SelectValue placeholder={isManager ? userCampus : "All Schools"} />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="font-bold">All Schools</SelectItem>
                {(schoolsData || []).map(s => (
                  <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-full sm:w-[240px]">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full h-12 rounded-xl bg-white border-slate-200 justify-start text-left font-normal shadow-sm",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4 text-blue-500" />
                  {date?.from ? (
                    date.to ? (
                      <>{format(date.from, "LLL dd")} - {format(date.to, "LLL dd")}</>
                    ) : (
                      format(date.from, "LLL dd")
                    )
                  ) : (
                    <span>Pick a date range</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 rounded-2xl overflow-hidden" align="end">
                <CalendarComp
                  initialFocus
                  mode="range"
                  defaultMonth={date?.from}
                  selected={date}
                  onSelect={setDate}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50/50">
            <TableRow className="h-14 border-slate-100">
              <TableHead className={cn("font-bold text-slate-700", isRTL ? "text-right" : "text-left")}>{t('student_name')}</TableHead>
              <TableHead className={cn("font-bold text-slate-700", isRTL ? "text-right" : "text-left")}>{t('campus_label')}</TableHead>
              <TableHead className={cn("font-bold text-slate-700", isRTL ? "text-right" : "text-left")}>{t('grade')} / {t('school')}</TableHead>
              <TableHead className={cn("font-bold text-slate-700", isRTL ? "text-right" : "text-left")}>{t('status')}</TableHead>
              <TableHead className="font-bold text-slate-700 text-center">{t('actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.length > 0 ? (
              filteredData.map((item) => (
                <TableRow 
                  key={item.id} 
                  className="h-16 border-slate-100 hover:bg-slate-50/30 transition-colors cursor-pointer"
                  onClick={() => router.push(`/students/${item.id}`)}
                >
                  <TableCell className={cn("font-bold text-slate-800", isRTL ? "text-right" : "text-left")}>{item.studentName}</TableCell>
                  <TableCell className={cn("text-slate-600 font-bold text-xs uppercase", isRTL ? "text-right" : "text-left")}>
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-blue-400" />
                      {item.campus || '—'}
                    </div>
                  </TableCell>
                  <TableCell className={isRTL ? "text-right" : "text-left"}>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-600">{item.grade || 'N/A'}</span>
                      <span className="text-[10px] text-slate-400 uppercase font-bold tracking-tight">{item.school || 'Unspecified'}</span>
                    </div>
                  </TableCell>
                  <TableCell className={isRTL ? "text-right" : "text-left"}>
                    <Badge className="bg-rose-50 text-rose-700 border-rose-100 px-3 py-1 rounded-full font-bold text-[10px] uppercase tracking-wider border">
                      {item.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-9 px-4 gap-2 border-slate-200 text-slate-700 font-bold hover:bg-slate-50 rounded-lg shadow-sm"
                      onClick={() => router.push(`/students/${item.id}`)}
                    >
                      <Eye className="h-4 w-4" /> {t('view')}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-24 text-slate-400 font-medium italic">
                  {isLoading ? "Fetching data..." : "No rejected student records found in database."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
export default function RejectedStudentsPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
          <p className="text-slate-500 font-bold">
            Loading Assessment...
          </p>
        </div>
      }
    >
      <RejectedStudentsCuont />
    </React.Suspense>
  );
}
