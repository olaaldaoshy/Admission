"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  ShieldCheck, 
  Briefcase, 
  Calendar, 
  Key, 
  CheckCircle2, 
  Clock, 
  Pencil, 
  ArrowLeft, 
  ArrowRight, 
  RefreshCw, 
  LogOut, 
  Building, 
  Award, 
  Copy, 
  Check, 
  ChevronRight, 
  FileText, 
  Users, 
  TrendingUp, 
  BarChart3, 
  Settings as SettingsIcon,
  ShieldAlert,
  GraduationCap
} from "lucide-react";
import { 
  useUser, 
  useEmployee, 
  useFirestore, 
  useCollection, 
  useMemoFirebase,
  useAuth
} from "@/firebase";
import { signOut, updateProfile } from "firebase/auth";
import { doc, updateDoc, setDoc, collection, query, where, getDocs } from "firebase/firestore";
import { useLanguage } from "@/context/language-context";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function ProfilePage() {
  const router = useRouter();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const { employee, isDirector, isManager, isSales, isSalesManager, isAuthorized, isLoading: isAuthLoading, campus: userCampus } = useEmployee();
  const { t, language, isRTL } = useLanguage();
  const { toast } = useToast();
  const firestore = useFirestore();

  // Dialog State
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [copiedField, setCopiedField] = React.useState<string | null>(null);

  // Campuses Query
  const campusesQuery = useMemoFirebase(() => user ? collection(firestore, "campus") : null, [firestore, user]);
  const { data: campusesData } = useCollection(campusesQuery);
  const campuses = campusesData || [];

  // Form State
  const [formData, setFormData] = React.useState({
    name: "",
    phone: "",
    campus: ""
  });

  // Sync Form Data when employee or user data arrives
  React.useEffect(() => {
    if (employee || user) {
      setFormData({
        name: employee?.name || user?.displayName || user?.email?.split('@')[0] || "",
        phone: employee?.phone || "",
        campus: employee?.campus || userCampus || ""
      });
    }
  }, [employee, user, userCampus]);

  // Copy helper
  const handleCopy = (text: string, fieldName: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    toast({
      title: isRTL ? "تم النسخ" : "Copied to clipboard",
      description: text
    });
    setTimeout(() => {
      setCopiedField(null);
    }, 2000);
  };

  // Logout handler
  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push("/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  // Save profile changes
  const handleSaveChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const cleanName = formData.name.trim();
    const cleanPhone = formData.phone.trim();
    const cleanCampus = formData.campus.trim();

    if (!cleanName) {
      toast({
        variant: "destructive",
        title: isRTL ? "بيانات غير مكتملة" : "Missing Name",
        description: isRTL ? "يرجى إدخال الاسم كاملاً." : "Please provide a valid name."
      });
      return;
    }

    setIsSaving(true);
    try {
      // 1. Update Firebase Auth display name if changed
      if (auth.currentUser && auth.currentUser.displayName !== cleanName) {
        await updateProfile(auth.currentUser, {
          displayName: cleanName
        });
      }

      // 2. Update or create Firestore employee record
      const targetDocId = employee?.id || user.uid;
      const empDocRef = doc(firestore, "employees", targetDocId);

      const payload = {
        name: cleanName,
        phone: cleanPhone,
        campus: cleanCampus,
        email: user.email?.toLowerCase().trim() || "",
        role: employee?.role || (isDirector ? "Director" : "Staff"),
        status: employee?.status || "Active",
        isActive: true,
        updatedAt: new Date().toISOString()
      };

      if (employee?.id) {
        await updateDoc(empDocRef, payload);
      } else {
        await setDoc(empDocRef, {
          ...payload,
          id: targetDocId,
          createdAt: new Date().toISOString()
        });
      }

      toast({
        title: t('profile_updated'),
        description: t('profile_updated_desc')
      });
      setIsEditDialogOpen(false);
    } catch (error: any) {
      console.error("Failed to update profile:", error);
      toast({
        variant: "destructive",
        title: isRTL ? "فشل تحديث البيانات" : "Update Failed",
        description: error.message || (isRTL ? "تعذر حفظ التعديلات في قاعدة البيانات" : "Could not save profile changes to database")
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Format Dates
  const formattedCreationDate = React.useMemo(() => {
    if (!user?.metadata?.creationTime) return "—";
    try {
      return new Date(user.metadata.creationTime).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return user.metadata.creationTime;
    }
  }, [user?.metadata?.creationTime, language]);

  const formattedLastSignIn = React.useMemo(() => {
    if (!user?.metadata?.lastSignInTime) return "—";
    try {
      return new Date(user.metadata.lastSignInTime).toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return user.metadata.lastSignInTime;
    }
  }, [user?.metadata?.lastSignInTime, language]);

  // Loading state
  if (isUserLoading || isAuthLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-500 font-bold text-sm tracking-wide">{t('syncing')}</p>
      </div>
    );
  }

  // Not logged in
  if (!user || user.isAnonymous) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4 text-center max-w-md mx-auto p-6 bg-white rounded-3xl border border-slate-100 shadow-xl">
        <ShieldAlert className="h-16 w-16 text-amber-500" />
        <h2 className="text-2xl font-black text-slate-800 font-serif">{t('access_issue')}</h2>
        <p className="text-slate-500 text-sm font-medium">{t('authorized_personnel_only')}</p>
        <Button onClick={() => router.push("/login")} className="h-12 px-8 rounded-2xl bg-blue-600 hover:bg-blue-700 font-bold mt-2">
          {t('staff_login')}
        </Button>
      </div>
    );
  }

  const displayName = employee?.name || user.displayName || user.email?.split('@')[0] || "Staff";
  const initials = displayName.slice(0, 2).toUpperCase();
  const currentRole = employee?.role || (isDirector ? "Director" : "Staff");
  const assignedCampusName = employee?.campus || userCampus || (isDirector ? t('all_campuses_hq') : t('no_campus_assigned'));
  const userPhone = employee?.phone || (employee as any)?.phoneNumber || t('phone_not_set');
  const providerId = user.providerData?.[0]?.providerId || "google.com";

  return (
    <div className={cn("max-w-6xl mx-auto space-y-8 pb-16 animate-in fade-in duration-300", isRTL && "font-arabic")}>
      
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.back()}
            className="h-10 w-10 p-0 rounded-2xl border-slate-200 bg-white hover:bg-slate-50 text-slate-600 shadow-sm"
          >
            {isRTL ? <ArrowRight className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
          </Button>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight font-serif">{t('my_profile')}</h1>
            <p className="text-slate-500 text-xs font-medium mt-0.5">{t('profile_subtitle')}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Button
            variant="outline"
            onClick={() => setIsEditDialogOpen(true)}
            className="h-11 px-5 rounded-2xl font-bold border-slate-200 bg-white hover:bg-slate-50 text-slate-700 gap-2 shadow-sm"
          >
            <Pencil className="h-4 w-4 text-blue-600" />
            {t('edit_details')}
          </Button>
          <Button
            variant="outline"
            onClick={handleLogout}
            className="h-11 px-5 rounded-2xl font-bold border-rose-100 bg-rose-50/50 hover:bg-rose-100/60 text-rose-600 gap-2"
          >
            <LogOut className="h-4 w-4" />
            {t('logout')}
          </Button>
        </div>
      </div>

      {/* Hero Profile Banner Card */}
      <Card className="rounded-3xl border-slate-100 shadow-xl overflow-hidden bg-gradient-to-br from-[#0a1a3a] via-[#11244e] to-[#0f1f42] text-white">
        <CardContent className="p-8 sm:p-10">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
            
            {/* Left: Avatar & Identity Details */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
              <div className="relative">
                <Avatar className="h-24 w-24 sm:h-28 sm:w-28 border-4 border-white/20 shadow-2xl rounded-3xl">
                  <AvatarFallback className="bg-gradient-to-tr from-orange-500 to-amber-500 text-white font-black text-3xl font-serif">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-emerald-500 border-2 border-[#0a1a3a] flex items-center justify-center shadow-lg" title="Active">
                  <span className="h-2 w-2 rounded-full bg-white animate-ping" />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h2 className="text-2xl sm:text-3xl font-black text-white font-serif tracking-tight">
                    {displayName}
                  </h2>
                  <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[11px] font-bold px-3 py-1 rounded-xl">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 inline-block mr-1.5 rtl:ml-1.5" />
                    {t('active_status')}
                  </Badge>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-slate-300 text-xs sm:text-sm">
                  <span className="flex items-center gap-1.5 font-mono text-slate-300 bg-white/10 px-3 py-1 rounded-xl">
                    <Mail className="h-3.5 w-3.5 text-blue-300" />
                    {user.email}
                  </span>
                  {employee?.phone && (
                    <span className="flex items-center gap-1.5 font-mono text-slate-300 bg-white/10 px-3 py-1 rounded-xl">
                      <Phone className="h-3.5 w-3.5 text-emerald-300" />
                      {employee.phone}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <Badge className={cn(
                    "text-xs font-black px-3.5 py-1.5 rounded-xl border-none shadow-sm uppercase tracking-wider",
                    currentRole === "Director" ? "bg-blue-500 text-white" :
                    currentRole.includes("Sales") ? "bg-orange-500 text-white" :
                    currentRole === "Manager" ? "bg-emerald-500 text-white" :
                    "bg-white/20 text-white"
                  )}>
                    <Award className="h-3.5 w-3.5 mr-1.5 rtl:ml-1.5" />
                    {currentRole}
                  </Badge>

                  <Badge variant="outline" className="bg-white/10 text-white border-white/20 text-xs font-bold px-3 py-1.5 rounded-xl">
                    <MapPin className="h-3.5 w-3.5 text-blue-300 mr-1.5 rtl:ml-1.5" />
                    {assignedCampusName}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Right: Quick Action Widget */}
            <div className="flex flex-col gap-2.5 w-full md:w-auto self-stretch md:self-center bg-white/5 p-4 rounded-2xl border border-white/10 backdrop-blur-sm">
              <div className="text-[11px] font-black uppercase tracking-widest text-slate-300">
                {t('user_id_label')}
              </div>
              <div className="flex items-center justify-between gap-2 font-mono text-xs text-white/90 bg-black/20 px-3 py-2 rounded-xl">
                <span className="truncate max-w-[180px]">{employee?.id || user.uid}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopy(employee?.id || user.uid, "uid")}
                  className="h-7 w-7 p-0 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg"
                >
                  {copiedField === "uid" ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                </Button>
              </div>
              <div className="text-[10px] text-slate-400 font-medium">
                {t('last_login_label')}: <span className="text-white font-bold">{formattedLastSignIn}</span>
              </div>
            </div>

          </div>
        </CardContent>
      </Card>

      {/* Profile Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Column 1 & 2: Personal Info & Permissions */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Card: Personal & Official Information */}
          <Card className="rounded-3xl border-slate-100 shadow-sm bg-white overflow-hidden">
            <CardHeader className="border-b border-slate-50 bg-slate-50/50 pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
                    <User className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-black text-slate-900 font-serif">
                      {t('personal_information')}
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-400 font-medium">
                      {isRTL ? "البيانات المسجلة للموظف في النظام" : "Official staff credentials and workplace assignment"}
                    </CardDescription>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditDialogOpen(true)}
                  className="h-8 px-3 rounded-xl text-blue-600 hover:text-blue-700 hover:bg-blue-50 font-bold text-xs gap-1.5"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  {t('edit_profile')}
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                
                {/* Full Name */}
                <div className="space-y-1.5 p-4 rounded-2xl bg-slate-50/70 border border-slate-100/80">
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-400">
                    <User className="h-3.5 w-3.5 text-blue-500" />
                    {t('full_name_label')}
                  </div>
                  <div className="text-base font-black text-slate-900 font-serif">
                    {displayName}
                  </div>
                </div>

                {/* Email Address */}
                <div className="space-y-1.5 p-4 rounded-2xl bg-slate-50/70 border border-slate-100/80">
                  <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider text-slate-400">
                    <span className="flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5 text-blue-500" />
                      {t('email')}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopy(user.email || "", "email")}
                      className="h-6 w-6 p-0 text-slate-400 hover:text-slate-700"
                    >
                      {copiedField === "email" ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                    </Button>
                  </div>
                  <div className="text-sm font-bold text-slate-800 font-mono break-all">
                    {user.email}
                  </div>
                </div>

                {/* Phone Number */}
                <div className="space-y-1.5 p-4 rounded-2xl bg-slate-50/70 border border-slate-100/80">
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-400">
                    <Phone className="h-3.5 w-3.5 text-emerald-500" />
                    {t('phone_label')}
                  </div>
                  <div className="text-sm font-bold text-slate-800 font-mono">
                    {userPhone}
                  </div>
                </div>

                {/* Role / Position */}
                <div className="space-y-1.5 p-4 rounded-2xl bg-slate-50/70 border border-slate-100/80">
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-400">
                    <Briefcase className="h-3.5 w-3.5 text-indigo-500" />
                    {t('job_title_label')}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-100 font-bold text-xs py-1 px-3 rounded-lg">
                      {currentRole}
                    </Badge>
                  </div>
                </div>

                {/* Assigned Campus */}
                <div className="space-y-1.5 p-4 rounded-2xl bg-slate-50/70 border border-slate-100/80">
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-400">
                    <Building className="h-3.5 w-3.5 text-orange-500" />
                    {t('campus_assigned_label')}
                  </div>
                  <div className="text-sm font-black text-slate-800">
                    {assignedCampusName}
                  </div>
                </div>

                {/* Account Status */}
                <div className="space-y-1.5 p-4 rounded-2xl bg-slate-50/70 border border-slate-100/80">
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-400">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                    {t('account_status_label')}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span className="text-sm font-bold text-emerald-700">{t('active_status')}</span>
                  </div>
                </div>

              </div>
            </CardContent>
          </Card>

          {/* Card: Role & System Permissions */}
          <Card className="rounded-3xl border-slate-100 shadow-sm bg-white overflow-hidden">
            <CardHeader className="border-b border-slate-50 bg-slate-50/50 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-lg font-black text-slate-900 font-serif">
                    {t('role_permissions')}
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-400 font-medium">
                    {t('permissions_summary')}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-6">
              <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50/50 border border-blue-100">
                <div className="flex items-start gap-3">
                  <Award className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-black text-blue-900">
                      {currentRole === "Director" ? (isRTL ? "صلاحيات إدارة كاملة (مدير عام)" : "Executive Full Administration (Director)") :
                       currentRole === "Manager" ? (isRTL ? "صلاحيات إدارة الفرع وتنسيق المقابلات" : "Campus Branch Manager Access") :
                       currentRole.includes("Sales") ? (isRTL ? "صلاحيات إدارة ومتابعة خط المبيعات والعملاء" : "Sales Pipeline & Lead Follow-up Access") :
                       (isRTL ? "صلاحيات تقييم ومراجعة طلبات القبول" : "Admissions Staff Assessment Access")}
                    </h4>
                    <p className="text-xs text-blue-700/80 font-medium mt-1">
                      {isDirector 
                        ? (isRTL ? "يمتلك هذا الحساب كامل الصلاحيات لتعديل الإعدادات، واستعراض كافة الفروع، واعتماد النتائج النهائية وإدارة طاقم العمل." : "This account has global access to all campuses, settings, staff directory, final decisions, and analytics.")
                        : isSales || isSalesManager
                        ? (isRTL ? "يمتلك هذا الحساب إمكانية متابعة وتسجيل بيانات العملاء المحتملين وحملات المبيعات وإجراء المكالمات." : "This account focuses on tracking prospective student inquiries, sales follow-ups, and conversion metrics.")
                        : (isRTL ? "يمتلك هذا الحساب صلاحية مراجعة بيانات الطلاب، وجدولة الامتحانات وإدخال نتائج المقابلات الأكاديمية." : "This account evaluates student applications, logs oral and written scores, and monitors campus queues.")}
                    </p>
                  </div>
                </div>
              </div>

              {/* Module access checklist */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { name: t('perm_applications'), active: isAuthorized, icon: Users },
                  { name: t('perm_assessment'), active: isAuthorized && !isSales, icon: GraduationCap },
                  { name: t('perm_oral'), active: isAuthorized && !isSales, icon: User },
                  { name: t('perm_final_results'), active: isAuthorized && !isSales, icon: CheckCircle2 },
                  { name: t('perm_enrollment'), active: isAuthorized && !isSales, icon: FileText },
                  { name: t('perm_sales'), active: isSales || isSalesManager || isDirector, icon: TrendingUp },
                  { name: t('perm_reports'), active: isDirector, icon: BarChart3 },
                  { name: t('perm_settings'), active: isDirector, icon: SettingsIcon },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "flex items-center justify-between p-3.5 rounded-2xl border transition-all",
                      item.active 
                        ? "bg-slate-50/80 border-slate-100 text-slate-800" 
                        : "bg-slate-50/30 border-slate-100/50 text-slate-400 opacity-60"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "h-8 w-8 rounded-xl flex items-center justify-center text-xs",
                        item.active ? "bg-white text-blue-600 shadow-sm border border-slate-100" : "bg-slate-100 text-slate-400"
                      )}>
                        <item.icon className="h-4 w-4" />
                      </div>
                      <span className="text-xs font-bold">{item.name}</span>
                    </div>

                    {item.active ? (
                      <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-100 text-[10px] font-bold px-2 py-0.5 rounded-md">
                        {isRTL ? "مفعل" : "Active"}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-slate-100 text-slate-400 border-transparent text-[10px] font-bold px-2 py-0.5 rounded-md">
                        {isRTL ? "غير مصرح" : "Restricted"}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

        </div>

        {/* Column 3: Security, Session & Quick Navigation */}
        <div className="space-y-6">
          
          {/* Card: Account Security & Authentication */}
          <Card className="rounded-3xl border-slate-100 shadow-sm bg-white overflow-hidden">
            <CardHeader className="border-b border-slate-50 bg-slate-50/50 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                  <Key className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base font-black text-slate-900 font-serif">
                    {t('account_security')}
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-400 font-medium">
                    {isRTL ? "بيانات الدخول وتوثيق الحساب" : "Authentication provider and session details"}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-6 space-y-4">
              
              {/* Sign-in Provider */}
              <div className="flex items-center justify-between py-2 border-b border-slate-50 text-xs">
                <span className="text-slate-400 font-bold uppercase tracking-wider">{t('auth_provider_label')}</span>
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-blue-500" />
                  {providerId === "google.com" ? "Google Workspace" : providerId}
                </span>
              </div>

              {/* Email Status */}
              <div className="flex items-center justify-between py-2 border-b border-slate-50 text-xs">
                <span className="text-slate-400 font-bold uppercase tracking-wider">{t('email_verified_label')}</span>
                <span className="font-bold text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {user.emailVerified !== false ? t('verified') : t('unverified')}
                </span>
              </div>

              {/* Account Created Date */}
              <div className="flex items-center justify-between py-2 border-b border-slate-50 text-xs">
                <span className="text-slate-400 font-bold uppercase tracking-wider">{t('account_created_label')}</span>
                <span className="font-bold text-slate-700">{formattedCreationDate}</span>
              </div>

              {/* Last Login Date */}
              <div className="flex items-center justify-between py-2 border-b border-slate-50 text-xs">
                <span className="text-slate-400 font-bold uppercase tracking-wider">{t('last_login_label')}</span>
                <span className="font-bold text-slate-700">{formattedLastSignIn}</span>
              </div>

              {/* User UID */}
              <div className="pt-2">
                <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block mb-1">{t('user_id_label')}</span>
                <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-100 font-mono text-[11px] text-slate-600">
                  <span className="truncate max-w-[200px]">{user.uid}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopy(user.uid, "uid_bottom")}
                    className="h-6 w-6 p-0 text-slate-400 hover:text-slate-700"
                  >
                    {copiedField === "uid_bottom" ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                  </Button>
                </div>
              </div>

            </CardContent>
          </Card>

          {/* Card: Quick Navigation Hub */}
          <Card className="rounded-3xl border-slate-100 shadow-sm bg-white overflow-hidden">
            <CardHeader className="border-b border-slate-50 bg-slate-50/50 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600">
                  <ChevronRight className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base font-black text-slate-900 font-serif">
                    {t('quick_navigation')}
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-400 font-medium">
                    {isRTL ? "انتقل سريعاً إلى أقسام النظام" : "Jump directly to authorized modules"}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-4 space-y-2">
              <Button
                variant="outline"
                onClick={() => router.push("/applications")}
                className="w-full h-12 justify-between rounded-2xl border-slate-100 bg-slate-50/50 hover:bg-slate-100 font-bold text-slate-700 text-xs px-4"
              >
                <span className="flex items-center gap-2.5">
                  <Users className="h-4 w-4 text-blue-600" />
                  {t('nav_applications')}
                </span>
                {isRTL ? <ArrowLeft className="h-4 w-4 text-slate-400" /> : <ArrowRight className="h-4 w-4 text-slate-400" />}
              </Button>

              {(isSales || isSalesManager) && (
                <Button
                  variant="outline"
                  onClick={() => router.push("/sales")}
                  className="w-full h-12 justify-between rounded-2xl border-slate-100 bg-slate-50/50 hover:bg-slate-100 font-bold text-slate-700 text-xs px-4"
                >
                  <span className="flex items-center gap-2.5">
                    <TrendingUp className="h-4 w-4 text-orange-600" />
                    {t('nav_sales')}
                  </span>
                  {isRTL ? <ArrowLeft className="h-4 w-4 text-slate-400" /> : <ArrowRight className="h-4 w-4 text-slate-400" />}
                </Button>
              )}

              {isDirector && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => router.push("/reports")}
                    className="w-full h-12 justify-between rounded-2xl border-slate-100 bg-slate-50/50 hover:bg-slate-100 font-bold text-slate-700 text-xs px-4"
                  >
                    <span className="flex items-center gap-2.5">
                      <BarChart3 className="h-4 w-4 text-emerald-600" />
                      {t('nav_analytics')}
                    </span>
                    {isRTL ? <ArrowLeft className="h-4 w-4 text-slate-400" /> : <ArrowRight className="h-4 w-4 text-slate-400" />}
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => router.push("/settings")}
                    className="w-full h-12 justify-between rounded-2xl border-slate-100 bg-slate-50/50 hover:bg-slate-100 font-bold text-slate-700 text-xs px-4"
                  >
                    <span className="flex items-center gap-2.5">
                      <SettingsIcon className="h-4 w-4 text-slate-600" />
                      {t('nav_settings')}
                    </span>
                    {isRTL ? <ArrowLeft className="h-4 w-4 text-slate-400" /> : <ArrowRight className="h-4 w-4 text-slate-400" />}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

        </div>

      </div>

      {/* Edit Profile Details Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className={cn("sm:max-w-[500px] rounded-3xl p-6 border-slate-100 shadow-2xl", isRTL && "font-arabic text-right")}>
          <DialogHeader className={cn(isRTL ? "text-right" : "text-left")}>
            <DialogTitle className="text-xl font-black text-slate-900 font-serif">
              {t('edit_profile_dialog_title')}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400 font-medium">
              {t('edit_profile_dialog_desc')}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveChanges} className="space-y-4 py-4">
            
            {/* Full Name */}
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest text-slate-400">
                {t('full_name_label')} *
              </Label>
              <Input
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Omnia Taalab"
                className="h-12 rounded-2xl bg-slate-50 border-slate-200 font-bold text-slate-800"
                required
              />
            </div>

            {/* Email (Read Only) */}
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest text-slate-400">
                {t('email')} ({isRTL ? "للقراءة فقط" : "Read Only"})
              </Label>
              <Input
                value={user.email || ""}
                disabled
                className="h-12 rounded-2xl bg-slate-100/70 border-slate-200 font-mono text-xs text-slate-500 cursor-not-allowed"
              />
            </div>

            {/* Phone Number */}
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest text-slate-400">
                {t('phone_label')}
              </Label>
              <Input
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                placeholder="e.g. +20 100 123 4567"
                className="h-12 rounded-2xl bg-slate-50 border-slate-200 font-mono text-slate-800 font-bold"
              />
            </div>

            {/* Assigned Campus */}
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest text-slate-400">
                {t('campus_assigned_label')}
              </Label>
              <Select
                value={formData.campus || "none"}
                onValueChange={val => setFormData({ ...formData, campus: val === "none" ? "" : val })}
              >
                <SelectTrigger className="h-12 rounded-2xl bg-slate-50 border-slate-200 font-bold text-slate-800">
                  <SelectValue placeholder={t('no_campus_assigned')} />
                </SelectTrigger>
                <SelectContent className="rounded-2xl">
                  <SelectItem value="none" className="font-bold py-2.5">
                    {isDirector ? t('all_campuses_hq') : t('no_campus_assigned')}
                  </SelectItem>
                  {campuses.map(c => (
                    <SelectItem key={c.id || c.name} value={c.name} className="font-bold py-2.5">
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
                className="h-12 px-6 rounded-2xl font-bold border-slate-200 text-slate-600"
              >
                {t('cancel')}
              </Button>
              <Button
                type="submit"
                disabled={isSaving}
                className="h-12 px-8 rounded-2xl bg-blue-600 hover:bg-blue-700 font-bold shadow-lg shadow-blue-500/20 text-white"
              >
                {isSaving ? (
                  <RefreshCw className="h-4 w-4 animate-spin mr-2 rtl:ml-2" />
                ) : null}
                {t('save_changes')}
              </Button>
            </DialogFooter>

          </form>
        </DialogContent>
      </Dialog>

    </div>
  );
}
