
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
import { Calendar } from "@/components/ui/calendar";
import { 
  CalendarIcon, 
  Search, 
  Eye, 
  Clock, 
  GraduationCap,
  Building2,
  MapPin
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { format, differenceInDays } from "date-fns";
import type { DateRange } from "react-day-picker";
import { Skeleton } from "@/components/ui/skeleton";
import { useFirestore, useCollection, useMemoFirebase, useUser, useEmployee } from "@/firebase";
import { collection } from "firebase/firestore";

const statusColors: { [key: string]: string } = {
  "Applicant": "bg-blue-50 text-blue-600 border-blue-100",
  "New Commers": "bg-slate-100 text-slate-600 border-slate-200",
  "No Show": "bg-rose-50 text-rose-600 border-rose-100",
  "Paid": "bg-emerald-50 text-emerald-700 border-emerald-100",
  "Refund Request": "bg-amber-50 text-amber-700 border-amber-100",
  "Postponed": "bg-zinc-50 text-zinc-600 border-zinc-100",
  "Cancelled by phone": "bg-rose-50 text-rose-500 border-rose-100",
  "Failed Admission Test": "bg-rose-100 text-rose-800 border-rose-200",
  "Approved": "bg-green-50 text-green-700 border-green-100",
  "Tested": "bg-indigo-50 text-indigo-600 border-indigo-100",
  "Confirmed": "bg-blue-50 text-blue-700 border-blue-100",
  "Re-exam": "bg-orange-50 text-orange-700 border-orange-100",
  "Declined": "bg-slate-100 text-slate-500 border-slate-200",
  "Pending": "bg-yellow-50 text-yellow-700 border-yellow-100",
  "Booked Place & Paid": "bg-teal-50 text-teal-700 border-teal-100",
  "Oral interview": "bg-sky-50 text-sky-600 border-sky-100",
  "Rejected": "bg-rose-100 text-rose-700 border-rose-200",
  "Booked Place": "bg-teal-100 text-teal-800 border-teal-200",
  "Acceptance Sent": "bg-emerald-100 text-emerald-800 border-emerald-200",
  "Waiting List": "bg-amber-100 text-amber-800 border-amber-200",
  "Second Interview": "bg-violet-50 text-violet-700 border-violet-100",
  "Duplicate": "bg-slate-200 text-slate-700 border-slate-300",
  "Internal Transfer": "bg-blue-100 text-blue-800 border-blue-200",
  "Enrolled": "bg-green-100 text-green-800 border-green-200",
};

const statusOptions = [
  "Applicant",
  "Confirmed Appointment/Test",
  "No Show",
  "Refund Request",
  "Reschedule Appointment/Test",
  "Cancelled by phone",
  "Approved by Admission/Tested",
  "Failed Admission Test",
  "Oral Interview",
  "Reschedule Oral Interview",
  "Approved By Principal",
  "Rejected By Principal",
  "Approved By Director",
  "Rejected By Director",
  "Re-exam",
  "Follow-up (Appointment/Test)",
  "Acceptance Sent",
  "Waiting List",
  "Duplicate",
  "Internal Transfer",
  "Booked Place & Paid",
  "Paid",
  "Enrolled",
  "Pending Committee Approval",
  "New Commers",
  "Postponed",
  "Tested",
  "Pending",
  "Second Interview",
  "Interview Scheduled Progress",
];

export function AssignedStudentsTable() {
  const router = useRouter();
  const db = useFirestore();
  const { user } = useUser();
  const { isDirector, isManager, isSales, isSalesManager, campus: userCampus, isLoading: isAuthLoading } = useEmployee();
  
  const canSeeSalesFollowupStatuses = isDirector || isSales || isSalesManager;

  const [searchTerm, setSearchTerm] = React.useState("");
  const [status, setStatus] = React.useState("all");
  const [school, setSchool] = React.useState("all");
  const [grade, setGrade] = React.useState("all");
  const [campus, setCampus] = React.useState("all");
  const [date, setDate] = React.useState<DateRange | undefined>(undefined);

  const availableStatusOptions = React.useMemo(() => {
    if (canSeeSalesFollowupStatuses) return statusOptions;
    return statusOptions.filter(s => {
      const lower = s.toLowerCase();
      return !lower.includes("no show") && !lower.includes("cancelled by phone") && !lower.includes("canceled by phone");
    });
  }, [canSeeSalesFollowupStatuses]);

  const appsQuery = useMemoFirebase(() => user ? collection(db, "applications") : null, [db, user]);
  const { data: applicationsData, isLoading: isAppsLoading } = useCollection(appsQuery);
  const applications = applicationsData || [];

  const employeesQuery = useMemoFirebase(() => user ? collection(db, "employees") : null, [db, user]);
  const { data: employeesData } = useCollection(employeesQuery);
  const employees = employeesData || [];

  const gradesQuery = useMemoFirebase(() => user ? collection(db, "grade") : null, [db, user]);
  const { data: gradesDataRaw } = useCollection(gradesQuery);
  const gradesData = gradesDataRaw || [];

  const schoolsQuery = useMemoFirebase(() => user ? collection(db, "schools") : null, [db, user]);
  const { data: schoolsDataRaw } = useCollection(schoolsQuery);
  const schoolsData = schoolsDataRaw || [];

  const campusQuery = useMemoFirebase(() => user ? collection(db, "campus") : null, [db, user]);
  const { data: campusDataRaw } = useCollection(campusQuery);
  const campusData = campusDataRaw || [];

  const filteredApplications = React.useMemo(() => {
    if (!user) return [];

    const empCampusMap = new Map();
    employees.forEach(emp => {
      empCampusMap.set(emp.id, emp.campus);
    });

    return (applications || [])
      .filter((app) => {
        let hasAccess = false;
        if (isDirector) {
          hasAccess = true;
        } else if (userCampus) {
          const target = userCampus.trim().toLowerCase();
          const appCampus = app.campus ? String(app.campus).trim().toLowerCase() : "";
          const appSchool = app.school ? String(app.school).trim().toLowerCase() : "";
          const assignedEmpCampus = empCampusMap.get(app.assignedEmployeeId)?.trim().toLowerCase();
          hasAccess = appCampus === target || appSchool === target || assignedEmpCampus === target;
        } else {
          hasAccess = app.assignedEmployeeId === user.uid;
        }

        if (!hasAccess) return false;

        // Hide "No Show" and "Cancelled by phone" from regular employees (Director + Sales only)
        if (!canSeeSalesFollowupStatuses) {
          const st = (app.status || "").toLowerCase();
          if (st.includes("no show") || st.includes("cancelled by phone") || st.includes("canceled by phone")) {
            return false;
          }
        }

        const appDate = new Date(app.applicationDate || app.createdAt);
        const from = date?.from ? new Date(date.from) : null;
        const to = date?.to ? new Date(date.to) : null;

        if(from) from.setHours(0,0,0,0);
        if(to) to.setHours(23,59,59,999);

        const matchesSearch = (app.studentName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            app.id.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesStatus = (status === "all" || app.status === status);
        const matchesSchool = (school === "all" || app.school === school);
        const matchesGrade = (grade === "all" || app.grade === grade);
        const matchesCampus = (campus === "all" || app.campus === campus);
        const matchesDate = (!from || appDate >= from) && (!to || appDate <= to);

        return matchesSearch && matchesStatus && matchesSchool && matchesGrade && matchesCampus && matchesDate;
      })
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  }, [applications, searchTerm, status, school, grade, campus, date, isDirector, isManager, userCampus, employees, user]);

  if (isAppsLoading || isAuthLoading) {
    return (
      <Card className="border-none shadow-none bg-transparent">
        <CardHeader className="px-0">
          <CardTitle className="text-2xl font-bold font-serif">My Assigned Students</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          <Skeleton className="h-[400px] w-full rounded-2xl" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-none shadow-none bg-transparent">
      <CardHeader className="px-0 flex flex-row items-center justify-between">
        <CardTitle className="text-2xl font-bold font-serif text-[#1a1a1a]">
          {isDirector ? "All Applications" : userCampus ? `Applications (${userCampus} Campus)` : "My Assigned Students"}
        </CardTitle>
        {!isDirector && userCampus && (
          <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-100 font-bold px-4 py-1.5 rounded-xl">
             Campus: {userCampus}
          </Badge>
        )}
      </CardHeader>
      <CardContent className="px-0">
        <div className="space-y-3 mb-6">
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                type="search"
                placeholder="Search by student name or ID..."
                className="pl-10 h-12 rounded-xl bg-white border-slate-200 focus-visible:ring-blue-500/20 shadow-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="w-full lg:w-[320px]">
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="h-12 rounded-xl bg-white border-slate-200 shadow-sm">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {availableStatusOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="flex flex-wrap justify-end gap-2">
            <div className="w-full sm:w-[150px]">
              <Select value={campus} onValueChange={setCampus}>
                <SelectTrigger className="h-12 rounded-xl bg-white border-slate-200 shadow-sm">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-slate-400" />
                    <SelectValue placeholder="All Campuses" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Campuses</SelectItem>
                  {(campusData || []).map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="w-full sm:w-[140px]">
              <Select value={grade} onValueChange={setGrade}>
                <SelectTrigger className="h-12 rounded-xl bg-white border-slate-200 shadow-sm">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="h-4 w-4 text-slate-400" />
                    <SelectValue placeholder="All Grades" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Grades</SelectItem>
                  {(gradesData || []).map(g => <SelectItem key={g.id} value={g.name}>{g.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="w-full sm:w-[160px]">
              <Select value={school} onValueChange={setSchool}>
                <SelectTrigger className="h-12 rounded-xl bg-white border-slate-200 shadow-sm">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-slate-400" />
                    <SelectValue placeholder="All Schools" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Schools</SelectItem>
                  {(schoolsData || []).map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
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
                  <Calendar
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

        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/80">
              <TableRow className="hover:bg-transparent border-slate-200">
                <TableHead className="font-bold text-slate-700 h-14">ID</TableHead>
                <TableHead className="font-bold text-slate-700 h-14">Student Name</TableHead>
                <TableHead className="font-bold text-slate-700 h-14">School</TableHead>
                <TableHead className="font-bold text-slate-700 h-14">Grade</TableHead>
                <TableHead className="font-bold text-slate-700 h-14">Status</TableHead>
                <TableHead className="font-bold text-slate-700 h-14">Application Date</TableHead>
                <TableHead className="font-bold text-slate-700 h-14">Father Phone</TableHead>
                <TableHead className="font-bold text-slate-700 h-14">Mother Phone</TableHead>
                <TableHead className="font-bold text-slate-700 h-14">Days in Process</TableHead>
                <TableHead className="font-bold text-slate-700 h-14 text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredApplications.length > 0 ? (
                filteredApplications.map((app) => {
                  const daysInProcess = differenceInDays(new Date(), new Date(app.applicationDate || app.createdAt));
                  
                  return (
                    <TableRow 
                      key={app.id} 
                      className="hover:bg-slate-50/50 transition-colors border-slate-100 cursor-pointer"
                      onClick={() => router.push(`/students/${app.id}`)}
                    >
                      <TableCell className="font-semibold text-slate-500">{app.id.slice(0, 6)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10 border-2 border-white shadow-sm">
                            <AvatarFallback className="bg-slate-100 text-slate-600 font-bold">
                              {app.studentName?.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="font-bold text-slate-800">{app.studentName}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-600 font-medium">{app.school || 'N/A'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200 font-bold px-3">
                          {app.grade}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={cn("border px-3 py-1 rounded-full font-bold text-[10px] uppercase tracking-wider", statusColors[app.status] || "bg-slate-100 text-slate-800")}>
                          {app.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-600 font-medium">
                        {app.applicationDate || format(new Date(app.createdAt), "yyyy-MM-dd")}
                      </TableCell>
                      <TableCell className="text-slate-800 font-bold text-xs">{app.fatherPhone || '—'}</TableCell>
                      <TableCell className="text-slate-800 font-bold text-xs">{app.motherPhone || '—'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-slate-600 font-bold">
                          <Clock className="h-3.5 w-3.5 text-orange-500" />
                          {daysInProcess}d
                        </div>
                      </TableCell>
                      <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-9 gap-2 px-4 rounded-xl border-slate-200 text-slate-700 font-bold hover:bg-slate-50 transition-all shadow-sm"
                          onClick={() => router.push(`/students/${app.id}`)}
                        >
                          <Eye className="h-4 w-4" /> View
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={10} className="h-32 text-center text-slate-400 font-medium">
                    No matching student records found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
