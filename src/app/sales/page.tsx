
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
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
  Plus,
  Phone,
  MessageSquare,
  TrendingUp,
  Users,
  Target,
  Clock,
  Loader2,
  Calendar,
  Save,
  X,
  Pencil,
  Trash2,
  ArrowUpRight,
  Filter,
  UserCheck,
  MapPin,
  Lock
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  useFirestore, 
  useCollection, 
  useMemoFirebase, 
  useUser, 
  useEmployee, 
  addDocumentNonBlocking, 
  updateDocumentNonBlocking, 
  deleteDocumentNonBlocking 
} from "@/firebase";
import { collection, doc, query, where } from "firebase/firestore";
import { useLanguage } from "@/context/language-context";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

export default function SalesPage() {
  const router = useRouter();
  const db = useFirestore();
  const { user } = useUser();
  const { employee, isSales, isSalesManager, isDirector, isLoading: isEmployeeLoading } = useEmployee();
  const { t, isRTL } = useLanguage();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = React.useState("followups");
  const [searchTerm, setSearchTerm] = React.useState("");
  
  // Leads Management
  const [isLeadDialogOpen, setIsLeadDialogOpen] = React.useState(false);
  const [editingLead, setEditingLead] = React.useState<any>(null);
  const [leadForm, setLeadForm] = React.useState({
    name: "",
    phone: "",
    campus: "",
    source: "",
    status: "New",
    assignedToId: "",
    assignedToName: "",
    notes: ""
  });

  // Queries
  const appsQuery = useMemoFirebase(() => collection(db, "applications"), [db]);
  const { data: allApplications } = useCollection(appsQuery);

  const campusQuery = useMemoFirebase(() => collection(db, "campus"), [db]);
  const { data: campusesData } = useCollection(campusQuery);
  const campuses = campusesData || [];

  const leadsQuery = useMemoFirebase(() => collection(db, "leads"), [db]);
  const { data: allLeads, isLoading: isLeadsLoading } = useCollection(leadsQuery);

  const employeesQuery = useMemoFirebase(() => query(collection(db, "employees"), where("role", "in", ["Sales", "Sales Manager"])), [db]);
  const { data: salesTeam } = useCollection(employeesQuery);

  // Filter Logic: Follow-ups
  const followups = React.useMemo(() => {
    return (allApplications || []).filter(app => {
      const isTargetStatus = ["No Show", "Cancelled by Phone"].includes(app.status);
      if (!isTargetStatus) return false;

      if (isSales && !isSalesManager && !isDirector) {
        return app.assignedEmployeeId === user?.uid;
      }
      return true;
    }).sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  }, [allApplications, isSales, isSalesManager, isDirector, user]);

  // Filter Logic: Leads
  const filteredLeads = React.useMemo(() => {
    return (allLeads || []).filter(lead => {
      const matchesSearch = lead.name?.toLowerCase().includes(searchTerm.toLowerCase()) || lead.phone?.includes(searchTerm);
      if (!matchesSearch) return false;

      if (isSales && !isSalesManager && !isDirector) {
        return lead.assignedToId === user?.uid;
      }
      return true;
    }).sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  }, [allLeads, searchTerm, isSales, isSalesManager, isDirector, user]);

  // Analytics Calculation
  const stats = React.useMemo(() => {
    const relevantLeads = (allLeads || []).filter(l => (isSales && !isSalesManager && !isDirector) ? l.assignedToId === user?.uid : true);
    const relevantFollowups = followups;

    return [
      { title: t('total_leads'), value: relevantLeads.length, icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
      { title: t('active_followups'), value: relevantFollowups.length, icon: Clock, color: "text-orange-600", bg: "bg-orange-50" },
      { title: t('converted_leads'), value: relevantLeads.filter(l => l.status === "Converted").length, icon: Target, color: "text-emerald-600", bg: "bg-emerald-50" },
      { title: t('conversion_rate_sales'), value: relevantLeads.length > 0 ? `${((relevantLeads.filter(l => l.status === "Converted").length / relevantLeads.length) * 100).toFixed(1)}%` : "0%", icon: TrendingUp, color: "text-purple-600", bg: "bg-purple-50" },
    ];
  }, [allLeads, followups, isSales, isSalesManager, isDirector, user, t]);

  const handleOpenLeadDialog = (lead?: any) => {
    if (lead) {
      setEditingLead(lead);
      setLeadForm({
        name: lead.name,
        phone: lead.phone,
        campus: lead.campus || "",
        source: lead.source || "",
        status: lead.status,
        assignedToId: lead.assignedToId || "",
        assignedToName: lead.assignedToName || "",
        notes: lead.notes || ""
      });
    } else {
      setEditingLead(null);
      setLeadForm({
        name: "",
        phone: "",
        campus: employee?.campus || "",
        source: "",
        status: "New",
        assignedToId: user?.uid || "",
        assignedToName: employee?.name || "",
        notes: ""
      });
    }
    setIsLeadDialogOpen(true);
  };

  const handleSaveLead = async () => {
    if (!leadForm.name || !leadForm.phone) {
      toast({ variant: "destructive", title: "Missing fields", description: "Name and Phone are required." });
      return;
    }

    try {
      const data = {
        ...leadForm,
        updatedAt: new Date().toISOString()
      };

      if (editingLead) {
        await updateDocumentNonBlocking(doc(db, "leads", editingLead.id), data);
        toast({ title: "Lead updated successfully" });
      } else {
        await addDocumentNonBlocking(collection(db, "leads"), {
          ...data,
          createdAt: new Date().toISOString()
        });
        toast({ title: "Lead added successfully" });
      }
      setIsLeadDialogOpen(false);
    } catch (e) {
      console.error("Error saving lead:", e);
      toast({ variant: "destructive", title: "Error saving lead" });
    }
  };

  const handleDeleteLead = (id: string) => {
    if (confirm("Are you sure you want to delete this lead?")) {
      deleteDocumentNonBlocking(doc(db, "leads", id));
      toast({ title: "Lead deleted" });
    }
  };

  if (!isEmployeeLoading && !isSales && !isSalesManager) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-100 shadow-sm text-center space-y-4">
          <div className="h-16 w-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
            <Lock className="h-8 w-8" />
          </div>
          <h2 className="text-lg font-black text-slate-900">
            {isRTL ? "قسم المبيعات والمتابعة" : "Sales Hub Restricted"}
          </h2>
          <p className="text-xs text-slate-500 leading-relaxed font-medium">
            {isRTL
              ? "هذا القسم مخصص لفريق المبيعات فقط (Sales) لمتابعة العملاء وحالات عدم الحضور والاعتذارات الهاتفية."
              : "This hub is restricted strictly to the Sales team to manage follow-up cases (No Show / Cancelled by Phone)."}
          </p>
          <Button onClick={() => router.push("/applications")} className="rounded-xl h-11 px-6 font-bold text-xs bg-blue-600 hover:bg-blue-700 text-white">
            {isRTL ? "العودة للطلبات" : "Back to Applications"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-8 w-full animate-in fade-in duration-500", isRTL && "font-arabic")}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-[#1a1a1a] font-serif">{t('sales_management')}</h1>
          <p className="text-slate-400 font-medium">{t('performance_overview')}</p>
        </div>
        {(isSalesManager || isSales) && (
          <Button onClick={() => handleOpenLeadDialog()} className="h-12 px-8 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl gap-2 shadow-xl shadow-blue-500/20">
            <Plus className="h-5 w-5" /> {t('add_lead')}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <Card key={stat.title} className="border-none shadow-sm rounded-3xl overflow-hidden bg-white group hover:shadow-md transition-all">
            <CardContent className="p-8 flex items-center gap-6">
              <div className={cn("h-14 w-14 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110", stat.bg)}>
                <stat.icon className={cn("h-7 w-7", stat.color)} />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{stat.title}</span>
                <span className="text-3xl font-black text-slate-900">{stat.value}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-slate-100/50 p-1 rounded-full w-fit mb-8 h-auto flex flex-wrap">
          <TabsTrigger value="followups" className="rounded-full px-8 py-3 data-[state=active]:bg-[#0a1a3a] data-[state=active]:text-white text-slate-600 text-xs font-bold uppercase tracking-widest gap-2">
            <MessageSquare className="h-4 w-4" /> {t('admissions_followups')}
          </TabsTrigger>
          <TabsTrigger value="leads" className="rounded-full px-8 py-3 data-[state=active]:bg-[#0a1a3a] data-[state=active]:text-white text-slate-600 text-xs font-bold uppercase tracking-widest gap-2">
            <Users className="h-4 w-4" /> {t('campaign_leads')}
          </TabsTrigger>
          <TabsTrigger value="analytics" className="rounded-full px-8 py-3 data-[state=active]:bg-[#0a1a3a] data-[state=active]:text-white text-slate-600 text-xs font-bold uppercase tracking-widest gap-2">
            <TrendingUp className="h-4 w-4" /> {t('sales_analytics')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="followups" className="mt-0">
          <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm space-y-8">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">{t('followup_needed')}</h3>
              <Badge variant="outline" className="bg-orange-50 text-orange-600 border-orange-100 font-bold px-4 py-1.5 rounded-full uppercase text-[10px]">
                {followups.length} {t('queue')}
              </Badge>
            </div>

            <div className="rounded-2xl border border-slate-100 overflow-hidden shadow-sm overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="h-14 border-slate-100">
                    <TableHead className="font-bold text-slate-700">{t('student_name')}</TableHead>
                    <TableHead className="font-bold text-slate-700">{t('campus_label')}</TableHead>
                    <TableHead className="font-bold text-slate-700">{t('phone_label')}</TableHead>
                    <TableHead className="font-bold text-slate-700">{t('status')}</TableHead>
                    <TableHead className="font-bold text-slate-700">{t('assigned')}</TableHead>
                    <TableHead className="font-bold text-slate-700 text-center">{t('actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {followups.length > 0 ? followups.map((app) => (
                    <TableRow key={app.id} className="h-20 border-slate-50 hover:bg-slate-50/50 cursor-pointer" onClick={() => router.push(`/students/${app.id}`)}>
                      <TableCell className="font-bold text-slate-800">{app.studentName}</TableCell>
                      <TableCell className="text-slate-600 font-bold text-xs uppercase">
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-blue-400" />
                          {app.campus || '—'}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium text-slate-600">
                        <div className="flex items-center gap-2">
                          <Phone className="h-3.5 w-3.5 text-blue-500" />
                          {app.fatherPhone || app.motherPhone || '—'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-rose-50 text-rose-600 border-rose-100 font-bold px-3 py-1 rounded-lg text-[10px] uppercase border">
                          {app.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-600 font-bold text-xs uppercase">{app.assignedEmployeeName}</TableCell>
                      <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                        <Button variant="outline" size="sm" className="h-9 px-4 rounded-xl font-bold gap-2 text-blue-600 border-blue-100 hover:bg-blue-50" onClick={() => router.push(`/students/${app.id}?tab=history`)}>
                           <ArrowUpRight className="h-4 w-4" /> Log Call
                        </Button>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={6} className="h-32 text-center text-slate-300 font-bold italic">No follow-ups currently needed.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="leads" className="mt-0">
          <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm space-y-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input placeholder={t('search_placeholder')} className="pl-10 h-12 rounded-xl border-slate-100 bg-slate-50/50" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-100 font-bold px-4 py-1.5 rounded-full">
                  {filteredLeads.length} {t('total')}
                </Badge>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-100 overflow-hidden shadow-sm overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="h-14 border-slate-100">
                    <TableHead className="font-bold text-slate-700">{t('lead_name')}</TableHead>
                    <TableHead className="font-bold text-slate-700">{t('campus_label')}</TableHead>
                    <TableHead className="font-bold text-slate-700">{t('phone_label')}</TableHead>
                    <TableHead className="font-bold text-slate-700">{t('lead_source')}</TableHead>
                    <TableHead className="font-bold text-slate-700">{t('lead_status')}</TableHead>
                    <TableHead className="font-bold text-slate-700">{t('assigned_to')}</TableHead>
                    <TableHead className="font-bold text-slate-700 text-center">{t('actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLeads.length > 0 ? filteredLeads.map((lead) => (
                    <TableRow key={lead.id} className="h-20 border-slate-50 hover:bg-slate-50/50">
                      <TableCell className="font-bold text-slate-800">{lead.name}</TableCell>
                      <TableCell className="text-slate-600 font-bold text-xs uppercase">
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-blue-400" />
                          {lead.campus || '—'}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium text-slate-600">{lead.phone}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-slate-50 text-slate-400 font-bold px-3 py-1 rounded-lg uppercase text-[10px] border-slate-100">
                          {lead.source || "Organic"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={cn(
                          "font-black px-3 py-1 rounded-lg text-[9px] uppercase border tracking-widest",
                          lead.status === 'Converted' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                          lead.status === 'New' ? "bg-blue-50 text-blue-600 border-blue-100" :
                          "bg-slate-100 text-slate-600 border-slate-200"
                        )}>
                          {lead.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-600 font-bold text-xs uppercase">{lead.assignedToName || 'Unassigned'}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                           <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-400 hover:text-blue-600" onClick={() => handleOpenLeadDialog(lead)}>
                              <Pencil className="h-4 w-4" />
                           </Button>
                           {(isSalesManager || isDirector) && (
                             <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-400 hover:text-rose-600" onClick={() => handleDeleteLead(lead.id)}>
                                <Trash2 className="h-4 w-4" />
                             </Button>
                           )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={7} className="h-32 text-center text-slate-300 font-bold italic">No leads found.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="mt-0">
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
             <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm space-y-12">
                <div className="space-y-2">
                   <h3 className="text-2xl font-black text-slate-800 font-serif">Performance Metrics</h3>
                   <p className="text-slate-400 text-sm font-medium">Real-time sales conversion and follow-up data.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                   <Card className="rounded-[2.5rem] border-slate-100 bg-slate-50/30 overflow-hidden shadow-none">
                      <CardHeader className="p-8 pb-0">
                         <CardTitle className="text-lg font-bold text-slate-700">Leads by Status</CardTitle>
                      </CardHeader>
                      <CardContent className="p-8 pt-6 space-y-6">
                         {["New", "Followed up", "Interested", "Not Interested", "Converted"].map(status => {
                           const count = (allLeads || []).filter(l => l.status === status).length;
                           const total = (allLeads || []).length || 1;
                           const percentage = (count / total) * 100;
                           return (
                             <div key={status} className="space-y-2">
                                <div className="flex items-center justify-between text-xs font-black uppercase tracking-widest">
                                   <span className="text-slate-500">{status}</span>
                                   <span className="text-slate-900">{count} ({percentage.toFixed(1)}%)</span>
                                </div>
                                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                   <div className="h-full bg-blue-600 transition-all duration-1000" style={{ width: `${percentage}%` }} />
                                </div>
                             </div>
                           )
                         })}
                      </CardContent>
                   </Card>

                   <Card className="rounded-[2.5rem] border-slate-100 bg-slate-50/30 overflow-hidden shadow-none">
                      <CardHeader className="p-8 pb-0">
                         <CardTitle className="text-lg font-bold text-slate-700">Admissions Conversion</CardTitle>
                      </CardHeader>
                      <CardContent className="p-8 pt-6 flex flex-col items-center justify-center min-h-[250px] gap-4">
                         <div className="relative h-40 w-40">
                            <svg className="h-full w-full" viewBox="0 0 36 36">
                               <path className="text-slate-100" strokeDasharray="100, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
                               <path className="text-emerald-500" strokeDasharray={`${stats[3].value}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                               <span className="text-3xl font-black text-slate-900">{stats[3].value}</span>
                               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Rate</span>
                            </div>
                         </div>
                         <p className="text-xs font-bold text-slate-500 text-center max-w-[200px]">Percentage of leads successfully converted to paid applications.</p>
                      </CardContent>
                   </Card>
                </div>
             </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Lead Dialog */}
      <Dialog open={isLeadDialogOpen} onOpenChange={setIsLeadDialogOpen}>
        <DialogContent className={cn("max-w-[450px] p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl", isRTL && "font-arabic")}>
           <div className="p-10 pb-4 bg-slate-50">
              <DialogHeader>
                 <div className="h-14 w-14 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg mb-4">
                    <UserCheck className="h-7 w-7 text-white" />
                 </div>
                 <DialogTitle className="text-3xl font-black font-serif">
                    {editingLead ? t('edit_lead') : t('add_lead')}
                 </DialogTitle>
                 <DialogDescription className="text-slate-500 font-medium">Enter lead contact details and source</DialogDescription>
              </DialogHeader>
           </div>

           <ScrollArea className="max-h-[60vh]">
              <div className="p-10 space-y-6">
                 <div className="space-y-2">
                    <Label className="text-xs font-black uppercase tracking-widest text-slate-400">Client Name *</Label>
                    <Input className="h-14 rounded-2xl bg-slate-50 border-slate-100" value={leadForm.name} onChange={e => setLeadForm({...leadForm, name: e.target.value})} />
                 </div>
                 <div className="space-y-2">
                    <Label className="text-xs font-black uppercase tracking-widest text-slate-400">Phone Number *</Label>
                    <Input className="h-14 rounded-2xl bg-slate-50 border-slate-100" value={leadForm.phone} onChange={e => setLeadForm({...leadForm, phone: e.target.value})} />
                 </div>
                 <div className="space-y-2">
                    <Label className="text-xs font-black uppercase tracking-widest text-slate-400">{t('campus_label')}</Label>
                    <Select value={leadForm.campus} onValueChange={v => setLeadForm({...leadForm, campus: v})}>
                       <SelectTrigger className="h-14 rounded-2xl bg-slate-50 border-slate-100 font-bold"><SelectValue placeholder="Select Campus" /></SelectTrigger>
                       <SelectContent className="rounded-2xl">
                          {campuses.map(c => <SelectItem key={c.id || c.name} value={c.name} className="font-bold py-3">{c.name}</SelectItem>)}
                       </SelectContent>
                    </Select>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                       <Label className="text-xs font-black uppercase tracking-widest text-slate-400">Campaign Source</Label>
                       <Input className="h-14 rounded-2xl bg-slate-50 border-slate-100" value={leadForm.source} onChange={e => setLeadForm({...leadForm, source: e.target.value})} placeholder="Organic / FB / IG" />
                    </div>
                    <div className="space-y-2">
                       <Label className="text-xs font-black uppercase tracking-widest text-slate-400">Status</Label>
                       <Select value={leadForm.status} onValueChange={v => setLeadForm({...leadForm, status: v})}>
                          <SelectTrigger className="h-14 rounded-2xl bg-slate-50 border-slate-100 font-bold"><SelectValue /></SelectTrigger>
                          <SelectContent className="rounded-2xl">
                             {["New", "Followed up", "Interested", "Not Interested", "Converted"].map(s => <SelectItem key={s} value={s} className="font-bold py-3">{s}</SelectItem>)}
                          </SelectContent>
                       </Select>
                    </div>
                 </div>

                 {isSalesManager || isDirector ? (
                   <div className="space-y-2">
                      <Label className="text-xs font-black uppercase tracking-widest text-slate-400">Assign To Staff</Label>
                      <Select value={leadForm.assignedToId} onValueChange={v => {
                        const emp = salesTeam?.find(e => e.id === v);
                        setLeadForm({...leadForm, assignedToId: v, assignedToName: emp?.name || emp?.firstName || ""});
                      }}>
                         <SelectTrigger className="h-14 rounded-2xl bg-slate-50 border-slate-100 font-bold"><SelectValue placeholder="Select Staff" /></SelectTrigger>
                         <SelectContent className="rounded-2xl">
                            {(salesTeam || []).map(e => <SelectItem key={e.id} value={e.id} className="font-bold py-3">{e.name || e.firstName}</SelectItem>)}
                         </SelectContent>
                      </Select>
                   </div>
                 ) : null}

                 <div className="space-y-2">
                    <Label className="text-xs font-black uppercase tracking-widest text-slate-400">Internal Notes</Label>
                    <Textarea className="min-h-[100px] rounded-2xl bg-slate-50 border-slate-100 resize-none font-medium" value={leadForm.notes} onChange={e => setLeadForm({...leadForm, notes: e.target.value})} />
                 </div>
              </div>
           </ScrollArea>

           <div className="p-10 pt-2 flex gap-4 bg-slate-50/30 border-t">
              <Button variant="outline" className="flex-1 h-14 rounded-2xl font-bold" onClick={() => setIsLeadDialogOpen(false)}>{t('cancel')}</Button>
              <Button className="flex-1 h-14 rounded-2xl bg-blue-600 text-white font-bold gap-2" onClick={handleSaveLead}>
                 <Save className="h-4 w-4" /> {t('confirm')}
              </Button>
           </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
