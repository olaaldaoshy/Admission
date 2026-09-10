
"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { 
  User, 
  GraduationCap, 
  Users, 
  ChevronRight, 
  ChevronLeft,
  Calendar as CalendarIcon,
  ShieldCheck,
  Loader2,
  Clock,
  CheckCircle2,
  Mail,
  MapPin,
  X,
  Phone,
  Briefcase,
  BookOpen,
  Printer,
  RotateCcw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { useFirestore, useCollection, useMemoFirebase, useUser, setDocumentNonBlocking, useDoc } from "@/firebase";
import { collection, doc, query, where, getDocs, getDoc, setDoc, runTransaction } from "firebase/firestore";
import { cn, parseLocalDate, isTimeSlotPast } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { format, getDay, startOfDay, isBefore } from "date-fns";

const steps = [
  { id: 1, title: "Student Personal Information", icon: User },
  { id: 2, title: "Student Scholar Information", icon: GraduationCap },
  { id: 3, title: "Family Information", icon: Users },
  { id: 4, title: "Appointment Information", icon: CalendarIcon },
];

const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const occupations = ["Manager", "Teacher", "Engineer", "Doctor", "Private Business", "Housewife", "Other"];

const isTimePast = (slotName: string, selectedDate: Date | undefined) => {
  return isTimeSlotPast(slotName, selectedDate);
};

export default function ApplicationFormPage() {
  const router = useRouter();
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submittedAppId, setSubmittedAppId] = useState<string | null>(null);
  const isSubmittingRef = React.useRef(false);
  const appIdRef = React.useRef<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    arabicName: "",
    dateOfBirth: "",
    nationalId: "",
    religion: "",
    citizenship: "",
    secondLanguage: "",
    gender: "",
    governorate: "",
    city: "",
    street: "",
    compound: "",
    hearAbout: "",
    campus: "",
    school: "",
    grade: "",
    category: "",
    previousSchool: "",
    previousCampus: "",
    notes: "",
    fatherFirstName: "",
    fatherLastName: "",
    fatherArabicName: "",
    fatherDOB: "",
    fatherPhone: "",
    fatherEmail: "",
    fatherNationalId: "",
    fatherAcademicDegree: "",
    fatherOccupation: "",
    fatherCompanyBusiness: "",
    motherFirstName: "",
    motherLastName: "",
    motherArabicName: "",
    motherDOB: "",
    motherPhone: "",
    motherEmail: "",
    motherAcademicDegree: "",
    motherOccupation: "",
    motherCompanyBusiness: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const savedData = localStorage.getItem("admission_form_data");
    const savedRemember = localStorage.getItem("admission_form_remember");
    if (savedRemember === "true" && savedData) {
      try {
        setFormData(JSON.parse(savedData));
        setRememberMe(true);
      } catch (e) {
        console.error("Error parsing saved data", e);
      }
    }
  }, []);

  useEffect(() => {
    if (rememberMe) {
      localStorage.setItem("admission_form_data", JSON.stringify(formData));
      localStorage.setItem("admission_form_remember", "true");
    } else {
      localStorage.removeItem("admission_form_data");
      localStorage.setItem("admission_form_remember", "false");
    }
  }, [formData, rememberMe]);

  const campusQuery = useMemoFirebase(() => collection(db, "campus"), [db]);
  const { data: campusData } = useCollection(campusQuery);
  const campuses = campusData || [];

  const schoolsQuery = useMemoFirebase(() => collection(db, "schools"), [db]);
  const { data: schoolsData } = useCollection(schoolsQuery);
  const gradesQuery = useMemoFirebase(() => collection(db, "grade"), [db]);
  const { data: gradesData } = useCollection(gradesQuery);
  const settingsQuery = useMemoFirebase(() => collection(db, "settings"), [db]);
  const { data: settingsData } = useCollection(settingsQuery);
  
  const schools = schoolsData || [];
  const allSettings = settingsData || [];

  const selectedCampusId = React.useMemo(() => campuses.find(c => c.name === formData.campus)?.id || "", [formData.campus, campuses]);
  const selectedSchoolId = React.useMemo(() => schools.find(s => s.name === formData.school)?.id || "", [formData.school, schools]);

  const mappingRef = useMemoFirebase(() => selectedCampusId ? doc(db, "campus_mappings", selectedCampusId) : null, [db, selectedCampusId]);
  const { data: campusMapping } = useDoc(mappingRef);

  const availableSchools = React.useMemo(() => {
    if (selectedCampusId && campusMapping?.schools && Object.keys(campusMapping.schools).length > 0) {
      return Object.entries(campusMapping.schools).map(([sid, sData]: [string, any]) => ({
        id: sid,
        name: sData.name,
      }));
    }
    const campusNames = new Set(campuses.map(c => c.name?.toLowerCase().trim()).filter(Boolean));
    const fallbackList: { id: string, name: string }[] = [];
    const seen = new Set<string>();

    (schools || []).forEach(s => {
      if (s?.name && !campusNames.has(s.name.toLowerCase().trim()) && !seen.has(s.name.trim())) {
        seen.add(s.name.trim());
        fallbackList.push({ id: s.id || s.name, name: s.name.trim() });
      }
    });

    ["American", "IB", "International Girls Only, British"].forEach(name => {
      if (!seen.has(name) && !campusNames.has(name.toLowerCase())) {
        seen.add(name);
        fallbackList.push({ id: name, name });
      }
    });

    return fallbackList;
  }, [selectedCampusId, campusMapping, campuses, schools]);

  const filteredGrades = React.useMemo(() => {
    if (!campusMapping || !campusMapping.schools || !selectedSchoolId) return gradesData || [];
    const schoolData = campusMapping.schools[selectedSchoolId];
    if (!schoolData || !schoolData.grades || Object.keys(schoolData.grades).length === 0) return gradesData || [];
    
    const mappedGradeIds = Object.keys(schoolData.grades);
    const filtered = (gradesData || []).filter(g => mappedGradeIds.includes(g.id));
    return filtered.length > 0 ? filtered : (gradesData || []);
  }, [gradesData, campusMapping, selectedSchoolId]);

  const formattedSelectedDate = selectedDate ? format(selectedDate, "yyyy-MM-dd") : null;
  const appsForDateQuery = useMemoFirebase(() => {
    if (!formattedSelectedDate) return null;
    return query(collection(db, "applications"), where("interviewDate", "==", formattedSelectedDate));
  }, [db, formattedSelectedDate]);

  const { data: existingApps } = useCollection(appsForDateQuery);
  
  const timeOccupancy = React.useMemo(() => {
    const counts: { [key: string]: number } = {};
    (existingApps || []).forEach(app => {
      if (app.interviewTime) {
        counts[app.interviewTime] = (counts[app.interviewTime] || 0) + 1;
      }
    });
    return counts;
  }, [existingApps]);

  const updateField = (field: string, value: string) => {
    const newErrors = { ...errors };
    if (['firstName', 'lastName', 'fatherFirstName', 'fatherLastName', 'motherFirstName', 'motherLastName'].includes(field)) {
      const englishRegex = /^[a-zA-Z\s]*$/;
      if (value && !englishRegex.test(value)) newErrors[field] = "Please use English characters only";
      else delete newErrors[field];
    }
    if (['arabicName', 'motherArabicName', 'fatherArabicName'].includes(field)) {
      const arabicRegex = /^[\u0600-\u06FF\s]*$/;
      if (value && !arabicRegex.test(value)) newErrors[field] = "يرجى كتابة الاسم باللغة العربية فقط";
      else delete newErrors[field];
      if ((field === 'arabicName' || field === 'fatherArabicName') && value) {
        const wordCount = value.trim().split(/\s+/).filter(word => word.length > 0).length;
        if (wordCount < 4) newErrors[field] = "يرجى كتابة الاسم الرباعي بالكامل";
      }
    }
    setErrors(newErrors);
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateStep1 = () => {
    const requiredFields = ['firstName', 'lastName', 'arabicName', 'dateOfBirth', 'religion', 'citizenship', 'secondLanguage', 'gender', 'governorate', 'city', 'street'];
    const missing = requiredFields.filter(f => !formData[f as keyof typeof formData]);
    if (missing.length > 0 || Object.keys(errors).length > 0) {
      toast({ variant: "destructive", title: "Validation Error", description: "Please complete all required fields correctly." });
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (currentStep === 1 && !validateStep1()) return;
    
    if (currentStep === 2) {
      const isInternal = formData.category === "Internal Transfer";
      const missingFields = !formData.campus || !formData.school || !formData.grade || !formData.category;
      
      // Conditionally check hearAbout or previousCampus based on student type
      const extraCheck = isInternal ? !formData.previousCampus : !formData.hearAbout;

      if (missingFields || extraCheck) {
        toast({ variant: "destructive", title: "Incomplete Information", description: "Please ensure all required fields (*) are filled." });
        return;
      }
    }
    
    if (currentStep < steps.length) setCurrentStep(prev => prev + 1);
  };

  const handleBack = () => { if (currentStep > 1) setCurrentStep(prev => prev - 1); };

  const handleSubmit = async () => {
    // 1. Immediately prevent duplicate submissions synchronously & asynchronously
    if (isSubmittingRef.current || isSubmitting || isSubmitted) return;
    
    if (!selectedDate || !selectedTime) {
      toast({ 
        variant: "destructive", 
        title: "Appointment Required", 
        description: "Please select both an interview date and time slot." 
      });
      return;
    }

    // 2. Lock synchronously before any async operations start
    isSubmittingRef.current = true;
    setIsSubmitting(true);

    try {
      const payloadData = {
        ...formData,
        studentName: `${formData.firstName} ${formData.lastName}`.trim(),
        fatherName: `${formData.fatherFirstName} ${formData.fatherLastName}`.trim(),
        motherName: `${formData.motherFirstName} ${formData.motherLastName}`.trim(),
        status: "Applicant",
        applicationDate: new Date().toISOString().split('T')[0],
        interviewDate: format(selectedDate, "yyyy-MM-dd"),
        interviewTime: selectedTime,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      let targetAppId = appIdRef.current;

      // 3. Atomically allocate next sequential ID (1111, 1112, 1113, ...) and commit application
      if (!targetAppId) {
        const counterRef = doc(db, "counters", "applications");

        targetAppId = await runTransaction(db, async (transaction) => {
          const counterSnap = await transaction.get(counterRef);
          let nextNum = 1111;

          if (counterSnap.exists()) {
            const data = counterSnap.data();
            if (typeof data?.lastId === "number" && data.lastId >= 1111) {
              nextNum = data.lastId + 1;
            }
          }

          // Verify no document collision in applications collection
          let loopCount = 0;
          while (loopCount < 200) {
            const candidateRef = doc(db, "applications", String(nextNum));
            const candidateSnap = await transaction.get(candidateRef);
            if (!candidateSnap.exists()) {
              break;
            }
            nextNum++;
            loopCount++;
          }

          const assignedId = String(nextNum);
          const applicationDocRef = doc(db, "applications", assignedId);

          // Update counter in transaction
          transaction.set(counterRef, {
            lastId: nextNum,
            updatedAt: new Date().toISOString()
          }, { merge: true });

          // Save application atomically in the same transaction
          transaction.set(applicationDocRef, {
            ...payloadData,
            id: assignedId
          }, { merge: true });

          return assignedId;
        });

        appIdRef.current = targetAppId;
      } else {
        // Fallback for retries where targetAppId was already allocated
        const applicationDocRef = doc(db, "applications", targetAppId);
        await setDoc(applicationDocRef, {
          ...payloadData,
          id: targetAppId
        }, { merge: true });
      }
      
      // 4. Clear locally cached draft
      localStorage.removeItem("admission_form_data");

      // 5. Transition to submitted state permanently for this session
      setSubmittedAppId(targetAppId);
      setIsSubmitted(true);
      setIsSubmitting(false);

      toast({ 
        title: "Application Submitted Successfully", 
        description: `Your application has been registered with ID #${targetAppId}.` 
      });

      // Try closing if this window was opened via window.open
      try {
        if (typeof window !== "undefined" && window.opener) {
          setTimeout(() => window.close(), 3000);
        }
      } catch (_) {}
    } catch (error: any) {
      console.error("Failed to submit admission form:", error);
      // Unlock only on genuine failure so applicant can retry
      isSubmittingRef.current = false;
      setIsSubmitting(false);
      toast({ 
        variant: "destructive", 
        title: "Submission Error", 
        description: error?.message || "Failed to submit application. Please check your connection and try again." 
      });
    }
  };

  const handleResetForNew = () => {
    setFormData({
      firstName: "",
      lastName: "",
      arabicName: "",
      dateOfBirth: "",
      nationalId: "",
      religion: "",
      citizenship: "",
      secondLanguage: "",
      gender: "",
      governorate: "",
      city: "",
      street: "",
      compound: "",
      hearAbout: "",
      campus: "",
      school: "",
      grade: "",
      category: "",
      previousSchool: "",
      previousCampus: "",
      notes: "",
      fatherFirstName: "",
      fatherLastName: "",
      fatherArabicName: "",
      fatherDOB: "",
      fatherPhone: "",
      fatherEmail: "",
      fatherNationalId: "",
      fatherAcademicDegree: "",
      fatherOccupation: "",
      fatherCompanyBusiness: "",
      motherFirstName: "",
      motherLastName: "",
      motherArabicName: "",
      motherDOB: "",
      motherPhone: "",
      motherEmail: "",
      motherAcademicDegree: "",
      motherOccupation: "",
      motherCompanyBusiness: "",
    });
    setErrors({});
    setSelectedDate(undefined);
    setSelectedTime("");
    setCurrentStep(1);
    setIsSubmitted(false);
    setSubmittedAppId(null);
    appIdRef.current = null;
    isSubmittingRef.current = false;
    setIsSubmitting(false);
  };

  const timeSlots = React.useMemo(() => {
    if (!formattedSelectedDate || !selectedDate) return [];
    return allSettings
      .filter(s => s.type === "assessment_time" && ((s.date === formattedSelectedDate) || (!s.date && s.day === dayNames[getDay(selectedDate)])))
      .map(s => ({ 
        id: s.id, 
        name: s.name, 
        isFull: (timeOccupancy[s.name] || 0) >= (parseInt(s.capacity) || 1),
        isPast: isTimePast(s.name, selectedDate)
      }))
      .filter(slot => !slot.isPast)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [selectedDate, formattedSelectedDate, allSettings, timeOccupancy]);

  const availableDates = React.useMemo(() => {
    const dates = new Set<string>();
    const recurringDays = new Set<string>();
    if (allSettings) {
      allSettings.forEach(s => {
        if (s.type === "assessment_time") {
          if (s.date) dates.add(s.date);
          else if (s.day) recurringDays.add(s.day);
        }
      });
    }
    return { dates, recurringDays };
  }, [allSettings]);

  const StepHeader = ({ num, title }: { num: number; title: string }) => (
    <div className="flex items-center gap-4 bg-[#0a1a3a] text-white p-5 rounded-xl mb-8 shadow-lg shadow-blue-900/10">
      <div className="h-10 w-10 bg-white/10 rounded-full flex items-center justify-center font-black text-lg border border-white/20">{num}</div>
      <h2 className="text-xl font-bold font-serif">{title}</h2>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f8f9fa] pb-40 -mx-4 md:-mx-10 -my-10">
      <div className="bg-white border-b border-slate-100 py-6 mb-10 shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-[#0a1a3a] rounded-xl flex items-center justify-center"><ShieldCheck className="h-7 w-7 text-white" /></div>
            <div>
              <h1 className="text-2xl font-black text-slate-800 font-serif">NIS Admission Form</h1>
              <p className="text-slate-400 text-xs font-bold uppercase">Enrollment Cycle 2025/2026</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {steps.map((step) => (
              <div 
                key={step.id} 
                className={cn(
                  "h-2 w-12 rounded-full transition-all duration-500", 
                  isSubmitted 
                    ? "bg-emerald-600" 
                    : currentStep >= step.id 
                    ? "bg-blue-600" 
                    : "bg-slate-200"
                )} 
              />
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6">
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          {isSubmitted ? (
            <Card className="border-none shadow-2xl rounded-[2.5rem] bg-white overflow-hidden animate-in fade-in zoom-in-95 duration-500">
              <CardContent className="p-8 md:p-14 flex flex-col items-center text-center space-y-8">
                <div className="h-24 w-24 bg-emerald-50 rounded-full flex items-center justify-center border-4 border-emerald-100 shadow-xl shadow-emerald-500/10">
                  <CheckCircle2 className="h-12 w-12 text-emerald-600 animate-in zoom-in duration-300" />
                </div>

                <div className="space-y-3 max-w-xl">
                  <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-emerald-100/80 text-emerald-800 text-xs font-black uppercase tracking-wider">
                    Application Received • تم استلام طلب التقديم
                  </span>
                  <h2 className="text-3xl md:text-4xl font-black text-slate-900 font-serif">
                    Application Submitted Successfully!
                  </h2>
                  <p className="text-slate-500 font-medium text-sm md:text-base leading-relaxed">
                    Thank you for applying to NIS. Your admission file and assessment appointment have been registered successfully.
                  </p>
                </div>

                {/* Reference ID Card */}
                <div className="w-full max-w-lg bg-slate-50 border-2 border-slate-100 rounded-3xl p-6 space-y-5">
                  <div className="flex flex-col items-center">
                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest">
                      Application Reference Number / رقم الطلب
                    </span>
                    <span className="text-4xl md:text-5xl font-black text-blue-600 font-mono tracking-tight mt-1">
                      #{submittedAppId}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 border-t border-slate-200/80 text-left text-xs">
                    <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm">
                      <span className="text-slate-400 block font-bold text-[11px] uppercase tracking-wider">Student Name</span>
                      <span className="font-black text-slate-800 text-sm truncate block mt-0.5">
                        {formData.firstName} {formData.lastName}
                      </span>
                      {formData.arabicName && (
                        <span className="text-[11px] text-slate-500 font-medium truncate block">
                          {formData.arabicName}
                        </span>
                      )}
                    </div>
                    <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm">
                      <span className="text-slate-400 block font-bold text-[11px] uppercase tracking-wider">Campus & System</span>
                      <span className="font-black text-slate-800 text-sm truncate block mt-0.5">
                        {formData.campus || "Selected Campus"}
                      </span>
                      <span className="text-[11px] text-slate-500 font-medium truncate block">
                        {formData.school} - {formData.grade}
                      </span>
                    </div>
                    <div className="bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm sm:col-span-2">
                      <span className="text-slate-400 block font-bold text-[11px] uppercase tracking-wider">Scheduled Assessment Appointment</span>
                      <div className="flex items-center gap-2 mt-1">
                        <CalendarIcon className="h-4 w-4 text-rose-500 shrink-0" />
                        <span className="font-black text-slate-800 text-sm">
                          {selectedDate ? format(selectedDate, "EEEE, MMMM do, yyyy") : ""}
                        </span>
                        <span className="bg-rose-50 text-rose-600 px-2.5 py-0.5 rounded-lg font-black text-xs">
                          {selectedTime}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="text-xs text-slate-600 bg-blue-50/70 border border-blue-100/80 rounded-2xl p-4 max-w-lg leading-relaxed text-left">
                  <p className="font-bold text-blue-900 mb-1">Important Instructions / تعليمات هامة:</p>
                  <ul className="list-disc list-inside space-y-1 text-slate-600">
                    <li>Please keep your <strong>Application ID (#{submittedAppId})</strong> saved.</li>
                    <li>Please arrive 15 minutes before your scheduled appointment time.</li>
                    <li>Bring all official previous student certificates and identification documents.</li>
                  </ul>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
                  <Button 
                    id="print-confirmation-btn"
                    variant="outline" 
                    onClick={() => window.print()}
                    className="h-12 px-6 rounded-2xl font-bold border-slate-200 text-slate-700 hover:bg-slate-50 gap-2 shadow-sm"
                  >
                    <Printer className="h-4 w-4 text-slate-500" />
                    Print Confirmation
                  </Button>
                  <Button 
                    id="submit-another-btn"
                    onClick={handleResetForNew}
                    className="h-12 px-8 rounded-2xl font-bold bg-[#0a1a3a] hover:bg-[#1a1a5a] text-white gap-2 shadow-xl shadow-blue-900/10"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Submit Another Application
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              {currentStep === 1 && (
            <Card className="border-none shadow-2xl rounded-[2.5rem] bg-white overflow-hidden">
              <CardContent className="p-10 space-y-10">
                <StepHeader num={1} title="Student Personal Information" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  <div className="space-y-2"><Label className="font-bold">First Name (English) *</Label><input className={cn("flex h-14 w-full px-5 rounded-2xl bg-slate-50 border border-slate-100", errors.firstName && "border-rose-500")} placeholder="First name" value={formData.firstName} onChange={e => updateField('firstName', e.target.value)} /></div>
                  <div className="space-y-2"><Label className="font-bold">Last Name (English) *</Label><input className={cn("flex h-14 w-full px-5 rounded-2xl bg-slate-50 border border-slate-100", errors.lastName && "border-rose-500")} placeholder="Last name" value={formData.lastName} onChange={e => updateField('lastName', e.target.value)} /></div>
                  <div className="space-y-2 text-right"><Label className="font-bold">Arabic Full Name *</Label><input className={cn("flex h-14 w-full px-5 rounded-2xl bg-slate-50 border border-slate-100 text-right", errors.arabicName && "border-rose-500")} placeholder="الاسم كامل باللغة العربية" value={formData.arabicName} onChange={e => updateField('arabicName', e.target.value)} /></div>
                  <div className="space-y-2"><Label className="font-bold">Date of Birth *</Label><input type="date" className="flex h-14 w-full px-5 rounded-2xl bg-slate-50 border border-slate-100" value={formData.dateOfBirth} onChange={e => updateField('dateOfBirth', e.target.value)} /></div>
                  <div className="space-y-2"><Label className="font-bold">National ID</Label><input className="flex h-14 w-full px-5 rounded-2xl bg-slate-50 border border-slate-100" placeholder="14 digits ID" value={formData.nationalId} onChange={e => updateField('nationalId', e.target.value)} /></div>
                  <div className="space-y-2"><Label className="font-bold">Religion *</Label><Select value={formData.religion} onValueChange={v => updateField('religion', v)}><SelectTrigger className="h-14 rounded-2xl bg-slate-50"><SelectValue placeholder="Select" /></SelectTrigger><SelectContent><SelectItem value="Muslim">Muslim</SelectItem><SelectItem value="Christian">Christian</SelectItem><SelectItem value="Other">Other</SelectItem></SelectContent></Select></div>
                  <div className="space-y-2"><Label className="font-bold">Citizenship *</Label><input className="flex h-14 w-full px-5 rounded-2xl bg-slate-50 border border-slate-100" placeholder="Citizenship" value={formData.citizenship} onChange={e => updateField('citizenship', e.target.value)} /></div>
                  <div className="space-y-2"><Label className="font-bold">Second Language *</Label><Select value={formData.secondLanguage} onValueChange={v => updateField('secondLanguage', v)}><SelectTrigger className="h-14 rounded-2xl bg-slate-50"><SelectValue placeholder="Select" /></SelectTrigger><SelectContent><SelectItem value="French">French</SelectItem><SelectItem value="German">German</SelectItem><SelectItem value="Other">Other</SelectItem></SelectContent></Select></div>
                  <div className="space-y-2"><Label className="font-bold">Gender *</Label><Select value={formData.gender} onValueChange={v => updateField('gender', v)}><SelectTrigger className="h-14 rounded-2xl bg-slate-50"><SelectValue placeholder="Select" /></SelectTrigger><SelectContent><SelectItem value="Male">Male</SelectItem><SelectItem value="Female">Female</SelectItem></SelectContent></Select></div>
                  <div className="space-y-2"><Label className="font-bold">Governorate *</Label><input className="flex h-14 w-full px-5 rounded-2xl bg-slate-50 border border-slate-100" placeholder="Governorate" value={formData.governorate} onChange={e => updateField('governorate', e.target.value)} /></div>
                  <div className="space-y-2"><Label className="font-bold">City / District *</Label><input className="flex h-14 w-full px-5 rounded-2xl bg-slate-50 border border-slate-100" placeholder="City" value={formData.city} onChange={e => updateField('city', e.target.value)} /></div>
                  <div className="space-y-2"><Label className="font-bold">Street + Building *</Label><input className="flex h-14 w-full px-5 rounded-2xl bg-slate-50 border border-slate-100" placeholder="Street, Building" value={formData.street} onChange={e => updateField('street', e.target.value)} /></div>
                </div>
              </CardContent>
            </Card>
          )}

          {currentStep === 2 && (
            <Card className="border-none shadow-2xl rounded-[2.5rem] bg-white overflow-hidden">
              <CardContent className="p-10 space-y-10">
                <StepHeader num={2} title="Student Scholar Information" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <Label className="font-bold">Campus *</Label>
                    <Select value={formData.campus} onValueChange={v => { updateField('campus', v); updateField('school', ''); updateField('grade', ''); }}>
                      <SelectTrigger className="h-14 rounded-2xl bg-white"><SelectValue placeholder="Select Campus" /></SelectTrigger>
                      <SelectContent>{campuses.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold">School (System) *</Label>
                    <Select value={formData.school} onValueChange={v => { updateField('school', v); updateField('grade', ''); }} disabled={!formData.campus}>
                      <SelectTrigger className="h-14 rounded-2xl bg-white"><SelectValue placeholder={!formData.campus ? "Select Campus first" : "Select System"} /></SelectTrigger>
                      <SelectContent>
                        {availableSchools.map(s => (
                          <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold">Grade *</Label>
                    <Select value={formData.grade} onValueChange={v => updateField('grade', v)} disabled={!formData.school}>
                      <SelectTrigger className="h-14 rounded-2xl bg-white"><SelectValue placeholder={!formData.school ? "Select System first" : "Select Grade"} /></SelectTrigger>
                      <SelectContent>{filteredGrades.map(g => <SelectItem key={g.id} value={g.name}>{g.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="font-bold">Student Type *</Label>
                    <Select value={formData.category} onValueChange={v => { updateField('category', v); if(v !== "Internal Transfer") updateField('previousCampus', ''); }}>
                      <SelectTrigger className="h-14 rounded-2xl bg-white"><SelectValue placeholder="Select Type" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="New Commer">New Commer</SelectItem>
                        <SelectItem value="Internal Transfer">Internal Transfer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {formData.category === "Internal Transfer" ? (
                    <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                      <Label className="font-bold">Previous Campus *</Label>
                      <Select value={formData.previousCampus} onValueChange={v => updateField('previousCampus', v)}>
                        <SelectTrigger className="h-14 rounded-2xl bg-white"><SelectValue placeholder="Select Previous Campus" /></SelectTrigger>
                        <SelectContent>{campuses.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <div className="space-y-2 col-span-full animate-in fade-in slide-in-from-top-2">
                      <Label className="font-bold">How did you hear about NIS? *</Label>
                      <Select value={formData.hearAbout} onValueChange={v => updateField('hearAbout', v)}>
                        <SelectTrigger className="h-14 rounded-2xl bg-white"><SelectValue placeholder="Select Source" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Social Media">Social Media</SelectItem>
                          <SelectItem value="Friends">Friends</SelectItem>
                          <SelectItem value="Website">Website</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="space-y-2"><Label className="font-bold">Previous School / Nursery</Label><input className="flex h-14 w-full px-5 rounded-2xl bg-white border border-slate-200" placeholder="Previous school" value={formData.previousSchool} onChange={e => updateField('previousSchool', e.target.value)} /></div>
                </div>
              </CardContent>
            </Card>
          )}

          {currentStep === 3 && (
            <Card className="border-none shadow-2xl rounded-[2.5rem] bg-white overflow-hidden">
              <CardContent className="p-10 space-y-12">
                <StepHeader num={3} title="Family Information" />
                
                {/* Father Information Section */}
                <div className="space-y-8">
                  <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                    <div className="h-8 w-8 bg-blue-50 rounded-lg flex items-center justify-center"><User className="h-5 w-5 text-blue-600" /></div>
                    <h3 className="text-lg font-bold text-slate-800">Father's Information</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="space-y-2"><Label className="font-bold">Father First Name *</Label><input className={cn("flex h-14 w-full px-5 rounded-2xl bg-slate-50 border border-slate-100", errors.fatherFirstName && "border-rose-500")} value={formData.fatherFirstName} onChange={e => updateField('fatherFirstName', e.target.value)} /></div>
                    <div className="space-y-2"><Label className="font-bold">Father Last Name *</Label><input className={cn("flex h-14 w-full px-5 rounded-2xl bg-slate-50 border border-slate-100", errors.fatherLastName && "border-rose-500")} value={formData.fatherLastName} onChange={e => updateField('fatherLastName', e.target.value)} /></div>
                    <div className="space-y-2 text-right"><Label className="font-bold">Father Arabic Name *</Label><input className={cn("flex h-14 w-full px-5 rounded-2xl bg-slate-50 border border-slate-100 text-right", errors.fatherArabicName && "border-rose-500")} value={formData.fatherArabicName} onChange={e => updateField('fatherArabicName', e.target.value)} /></div>
                    <div className="space-y-2"><Label className="font-bold">Father Date of Birth *</Label><input type="date" className="flex h-14 w-full px-5 rounded-2xl bg-slate-50 border border-slate-100" value={formData.fatherDOB} onChange={e => updateField('fatherDOB', e.target.value)} /></div>
                    <div className="space-y-2"><Label className="font-bold">Father Phone *</Label><input className="flex h-14 w-full px-5 rounded-2xl bg-slate-50 border border-slate-100" value={formData.fatherPhone} onChange={e => updateField('fatherPhone', e.target.value)} /></div>
                    <div className="space-y-2"><Label className="font-bold">Father Email *</Label><input type="email" className="flex h-14 w-full px-5 rounded-2xl bg-slate-50 border border-slate-100" value={formData.fatherEmail} onChange={e => updateField('fatherEmail', e.target.value)} /></div>
                    <div className="space-y-2"><Label className="font-bold">Father National ID *</Label><input className="flex h-14 w-full px-5 rounded-2xl bg-slate-50 border border-slate-100" value={formData.fatherNationalId} onChange={e => updateField('fatherNationalId', e.target.value)} /></div>
                    <div className="space-y-2"><Label className="font-bold">Father Academic Degree *</Label><input className="flex h-14 w-full px-5 rounded-2xl bg-slate-50 border border-slate-100" value={formData.fatherAcademicDegree} onChange={e => updateField('fatherAcademicDegree', e.target.value)} /></div>
                    <div className="space-y-2"><Label className="font-bold">Father Occupation *</Label><Select value={formData.fatherOccupation} onValueChange={v => updateField('fatherOccupation', v)}><SelectTrigger className="h-14 rounded-2xl bg-slate-50"><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{occupations.map(occ => <SelectItem key={occ} value={occ}>{occ}</SelectItem>)}</SelectContent></Select></div>
                    <div className="space-y-2 lg:col-span-2"><Label className="font-bold">Father Company / Business *</Label><input className="flex h-14 w-full px-5 rounded-2xl bg-slate-50 border border-slate-100" value={formData.fatherCompanyBusiness} onChange={e => updateField('fatherCompanyBusiness', e.target.value)} /></div>
                  </div>
                </div>

                {/* Mother Information Section */}
                <div className="space-y-8 pt-8 border-t border-slate-100">
                  <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                    <div className="h-8 w-8 bg-rose-50 rounded-lg flex items-center justify-center"><User className="h-5 w-5 text-rose-600" /></div>
                    <h3 className="text-lg font-bold text-slate-800">Mother's Information</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="space-y-2"><Label className="font-bold">Mother First Name *</Label><input className={cn("flex h-14 w-full px-5 rounded-2xl bg-slate-50 border border-slate-100", errors.motherFirstName && "border-rose-500")} value={formData.motherFirstName} onChange={e => updateField('motherFirstName', e.target.value)} /></div>
                    <div className="space-y-2"><Label className="font-bold">Mother Last Name *</Label><input className={cn("flex h-14 w-full px-5 rounded-2xl bg-slate-50 border border-slate-100", errors.motherLastName && "border-rose-500")} value={formData.motherLastName} onChange={e => updateField('motherLastName', e.target.value)} /></div>
                    <div className="space-y-2 text-right"><Label className="font-bold">Mother Arabic Name *</Label><input className={cn("flex h-14 w-full px-5 rounded-2xl bg-slate-50 border border-slate-100 text-right", errors.motherArabicName && "border-rose-500")} value={formData.motherArabicName} onChange={e => updateField('motherArabicName', e.target.value)} /></div>
                    <div className="space-y-2"><Label className="font-bold">Mother Date of Birth *</Label><input type="date" className="flex h-14 w-full px-5 rounded-2xl bg-slate-50 border border-slate-100" value={formData.motherDOB} onChange={e => updateField('motherDOB', e.target.value)} /></div>
                    <div className="space-y-2"><Label className="font-bold">Mother Phone *</Label><input className="flex h-14 w-full px-5 rounded-2xl bg-slate-50 border border-slate-100" value={formData.motherPhone} onChange={e => updateField('motherPhone', e.target.value)} /></div>
                    <div className="space-y-2"><Label className="font-bold">Mother Email *</Label><input type="email" className="flex h-14 w-full px-5 rounded-2xl bg-slate-50 border border-slate-100" value={formData.motherEmail} onChange={e => updateField('motherEmail', e.target.value)} /></div>
                    <div className="space-y-2"><Label className="font-bold">Mother Academic Degree *</Label><input className="flex h-14 w-full px-5 rounded-2xl bg-slate-50 border border-slate-100" value={formData.motherAcademicDegree} onChange={e => updateField('motherAcademicDegree', e.target.value)} /></div>
                    <div className="space-y-2"><Label className="font-bold">Mother Occupation *</Label><Select value={formData.motherOccupation} onValueChange={v => updateField('motherOccupation', v)}><SelectTrigger className="h-14 rounded-2xl bg-slate-50"><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{occupations.map(occ => <SelectItem key={occ} value={occ}>{occ}</SelectItem>)}</SelectContent></Select></div>
                    <div className="space-y-2 lg:col-span-2"><Label className="font-bold">Mother Company / Business *</Label><input className="flex h-14 w-full px-5 rounded-2xl bg-slate-50 border border-slate-100" value={formData.motherCompanyBusiness} onChange={e => updateField('motherCompanyBusiness', e.target.value)} /></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {currentStep === 4 && (
            <Card className="border-none shadow-2xl rounded-[2.5rem] bg-white overflow-hidden">
              <CardContent className="p-10 space-y-10">
                <StepHeader num={4} title="Appointment Information" />
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                   <div className="space-y-6">
                      <Label className="font-bold text-lg">Select date *</Label>
                      <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                        <PopoverTrigger asChild><Button variant="outline" className="w-full h-14 rounded-2xl justify-start font-bold"><CalendarIcon className="mr-3 h-5 w-5 text-blue-500" />{selectedDate ? format(selectedDate, "MMMM do, yyyy") : "Select Date"}</Button></PopoverTrigger>
                        <PopoverContent className="w-auto p-0 rounded-2xl overflow-hidden" align="start"><Calendar mode="single" selected={selectedDate} onSelect={(d) => { setSelectedDate(d); setSelectedTime(""); setIsCalendarOpen(false); }} initialFocus modifiers={{ hasSlots: (date) => { const fmt = format(date, "yyyy-MM-dd"); return availableDates.dates.has(fmt) || availableDates.recurringDays.has(dayNames[getDay(date)]); } }} modifiersClassNames={{ hasSlots: "relative after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-1 after:h-1 after:bg-blue-600 after:rounded-full" }} disabled={(date) => {
                          const today = startOfDay(new Date());
                          const isPast = isBefore(startOfDay(date), today);
                          const hasNoSlots = !availableDates.dates.has(format(date, "yyyy-MM-dd")) && !availableDates.recurringDays.has(dayNames[getDay(date)]);
                          return isPast || hasNoSlots;
                        }} /></PopoverContent>
                      </Popover>
                   </div>
                   <div className="space-y-6">
                      <Label className="font-bold text-lg">Select time *</Label>
                      <div className="p-8 bg-slate-50 rounded-3xl min-h-[150px]">
                        {!selectedDate ? <p className="text-slate-400 text-center">Select a date first.</p> : timeSlots.length > 0 ? (
                          <div className="grid grid-cols-2 gap-4">
                            {timeSlots.map((slot) => (
                              <button key={slot.id} type="button" onClick={() => !slot.isFull && setSelectedTime(slot.name)} disabled={slot.isFull} className={cn("h-16 rounded-xl font-bold border-2 transition-all", selectedTime === slot.name ? "bg-white border-rose-500 text-rose-600 scale-105" : slot.isFull ? "bg-slate-100 text-slate-300 opacity-70" : "bg-white border-white hover:border-slate-200")}>
                                {slot.name} {slot.isFull && "(Full)"}
                              </button>
                            ))}
                          </div>
                        ) : <p className="text-slate-400 text-center">No available slots for this day.</p>}
                      </div>
                   </div>
                </div>
              </CardContent>
            </Card>
          )}
          </>
        )}

          {!isSubmitted && (
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 p-8 shadow-2xl z-50">
              <div className="max-w-7xl mx-auto flex flex-col items-center gap-6">
                <div className="flex items-center space-x-2 mb-4">
                  <Checkbox id="save-data" checked={rememberMe} onCheckedChange={(checked) => setRememberMe(checked === true)} />
                  <label htmlFor="save-data" className="text-sm font-medium">هل تريد حفظ بياناتك؟ (تلقائي الحفظ عند التعديل)</label>
                </div>
                <div className="flex gap-6 w-full justify-center">
                  {currentStep > 1 && (
                    <Button variant="outline" className="h-14 px-12 rounded-2xl font-bold" onClick={handleBack} disabled={isSubmitting}>
                      <ChevronLeft className="h-5 w-5" /> Back
                    </Button>
                  )}
                  {currentStep < steps.length ? (
                    <Button className="h-14 px-20 bg-[#0a1a3a] hover:bg-[#1a1a5a] text-white font-bold rounded-2xl gap-2 shadow-xl" onClick={handleNext}>
                      Continue <ChevronRight className="h-5 w-5" />
                    </Button>
                  ) : (
                    <Button 
                      id="send-application-btn"
                      className="h-14 px-24 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-2xl gap-2 shadow-xl disabled:opacity-50 disabled:cursor-not-allowed" 
                      onClick={handleSubmit} 
                      disabled={isSubmitting || isSubmitted || !selectedDate || !selectedTime}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          <span>Submitting Application...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-5 w-5" />
                          <span>Send Application</span>
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
