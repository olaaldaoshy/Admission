
"use client";

import * as React from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import {
  ChevronLeft,
  User,
  GraduationCap,
  Calendar,
  ClipboardList,
  CheckCircle2,
  Pencil,
  ChevronDown,
  Save,
  Loader2,
  FileDown,
  ShieldCheck,
  Mail,
  Phone,
  Lock,
  History as HistoryIcon,
  UserRound,
  CalendarClock,
  MapPin,
  Building2,
  Info,
  Globe,
  Link as LinkIcon,
  Trophy,
  ArrowRight,
  Paperclip,
  Plus,
  Trash2,
  ExternalLink,
  FileText,
  CreditCard,
  Wallet,
  UploadCloud,
  MessageSquare,
  Check,
  AlertCircle,
  AlertTriangle,
  Clock,
  Flag,
  UserCheck,
  Users,
  BookOpen,
  RotateCcw,
  CalendarCheck,
  Award,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectValue,
  SelectTrigger,
} from "@/components/ui/select";
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
import { Calendar as CalendarComp } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { useFirestore, useDoc, useCollection, useMemoFirebase, useUser, useEmployee, initializeFirebase } from "@/firebase";
import { collection, doc, updateDoc, query, where, getDocs, getDoc, arrayUnion } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { format, getDay, startOfDay, isBefore } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLanguage } from "@/context/language-context";

const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const isTimePast = (slotName: string, selectedDate: Date | undefined) => {
  if (!selectedDate) return false;
  const now = new Date();
  const selected = startOfDay(selectedDate);
  const today = startOfDay(now);
  
  if (selected < today) return true;
  if (selected > today) return false;
  
  try {
    const [time, period] = slotName.split(' ');
    let [hours, minutes] = time.split(':').map(Number);
    if (period === 'PM' && hours < 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    
    const slotTime = new Date(now);
    slotTime.setHours(hours, minutes, 0, 0);
    return slotTime < now;
  } catch (e) {
    console.error("Error calculating isTimePast in students/[id]:", e);
    return false;
  }
};

const formatDateSafe = (dateVal: any, formatPattern: string = "MMM dd, yyyy - hh:mm a") => {
  if (!dateVal) return "—";
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal);
    return format(d, formatPattern);
  } catch {
    return String(dateVal);
  }
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

const DataField = ({ 
  label, 
  value, 
  field, 
  type = "text", 
  hasArrow = false, 
  isEditing, 
  editedData, 
  onUpdate,
  options,
  isPrimaryContact = false,
  t,
  disabled = false,
  allowCustomInput = false
}: { 
  label: string, 
  value: any, 
  field?: string, 
  type?: string, 
  hasArrow?: boolean,
  isEditing: boolean,
  editedData: any,
  onUpdate: (field: string, value: string) => void,
  options?: string[],
  isPrimaryContact?: boolean,
  t: any,
  disabled?: boolean,
  allowCustomInput?: boolean
}) => {
  const [isManualInput, setIsManualInput] = React.useState(false);

  if (isEditing && field) {
    const rawOptions = options ? [...options] : [];
    if (!allowCustomInput && editedData?.[field] && !rawOptions.includes(editedData[field])) {
      rawOptions.unshift(editedData[field]);
    }
    const uniqueOptions = Array.from(new Set(rawOptions.map(s => String(s).trim()).filter(Boolean)));

    if (uniqueOptions.length > 0 && !isManualInput) {
      return (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between ml-1">
            <label className="text-xs font-bold text-slate-800">{label}</label>
            {allowCustomInput && (
              <button
                type="button"
                onClick={() => setIsManualInput(true)}
                className="text-[11px] font-bold text-blue-600 hover:text-blue-700 underline cursor-pointer"
              >
                {t ? (t('type_manually') || "Type custom") : "Type custom"}
              </button>
            )}
          </div>
          <Select 
            value={uniqueOptions.includes(editedData?.[field]) ? editedData[field] : ""} 
            onValueChange={(v) => {
              if (v === "Other" || v === "أخرى") {
                setIsManualInput(true);
                onUpdate(field, "");
              } else {
                onUpdate(field, v);
              }
            }} 
            disabled={disabled}
          >
            <SelectTrigger className="h-12 bg-white rounded-xl px-5 text-slate-800 font-medium border-slate-200 focus:ring-blue-500/20 shadow-sm">
              <SelectValue placeholder={label} />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-slate-100 shadow-xl max-h-64 overflow-y-auto">
              {uniqueOptions.map((opt, idx) => (
                <SelectItem key={`${opt}-${idx}`} value={opt} className="font-medium">
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
    }

    if (type === "textarea") {
      return (
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-800 ml-1">{label}</label>
          <Textarea 
            className="min-h-[100px] bg-white rounded-xl px-5 text-slate-800 font-medium border-slate-200 focus-visible:ring-blue-500/20 shadow-sm"
            value={editedData?.[field] || ""}
            onChange={(e) => onUpdate(field, e.target.value)}
            disabled={disabled}
          />
        </div>
      );
    }

    return (
      <div className="space-y-1.5">
        <div className="flex items-center justify-between ml-1">
          <label className="text-xs font-bold text-slate-800">{label}</label>
          {allowCustomInput && uniqueOptions.length > 0 && isManualInput && (
            <button
              type="button"
              onClick={() => setIsManualInput(false)}
              className="text-[11px] font-bold text-blue-600 hover:text-blue-700 underline cursor-pointer"
            >
              {t ? (t('select_from_list') || "Select from list") : "Select from list"}
            </button>
          )}
        </div>
        <Input 
          type={type}
          className="h-12 bg-white rounded-xl px-5 text-slate-800 font-medium border-slate-200 focus-visible:ring-blue-500/20 shadow-sm"
          value={editedData?.[field] || ""}
          onChange={(e) => onUpdate(field, e.target.value)}
          readOnly={field === 'id'}
          disabled={disabled}
          placeholder={label}
        />
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between ml-1">
        <label className="text-xs font-bold text-slate-800">{label}</label>
        {isPrimaryContact && (
          <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded shadow-sm gap-1">
            <Check className="h-2 w-2" /> {t('primary_contact')}
          </Badge>
        )}
      </div>
      <div className={cn(
        "h-12 bg-slate-50/80 rounded-xl flex items-center justify-between px-5 text-slate-400 font-medium border transition-all hover:bg-slate-100/50",
        isPrimaryContact ? "border-emerald-200 bg-emerald-50/20 text-emerald-700" : "border-transparent"
      )}>
        <span className="truncate">{value || "—"}</span>
        {(hasArrow || (options && options.length > 0)) && <ChevronDown className="h-4 w-4 opacity-30" />}
      </div>
    </div>
  );
};

export default function StudentProfilePage() {
  const router = useRouter();
  const { id } = useParams();
  const searchParams = useSearchParams();
  const db = useFirestore();
  const { user } = useUser();
  const { storage } = initializeFirebase();
  const { isDirector, isManager, isSales, isSalesManager, campus: userCampus, employee } = useEmployee();
  const canSeeSalesFollowupStatuses = isDirector || isSales || isSalesManager;
  
  const isSalesFollowupStatus = (st: string | undefined | null) => {
    if (!st) return false;
    const s = st.trim().toLowerCase();
    return s === "no show" || s === "cancelled by phone" || s === "canceled by phone" || s.includes("no show") || s.includes("cancelled by phone") || s.includes("canceled by phone");
  };
  const { toast } = useToast();
  const { t, isRTL } = useLanguage();
  
  const validTabs = ["personal", "school", "father", "mother", "appointment", "payment", "attachments", "history"];
  const rawTab = searchParams.get("tab");
  const initialTab = (rawTab && validTabs.includes(rawTab)) ? rawTab : "personal";
  
  const [activeTab, setActiveTab] = React.useState(initialTab);
  const [isEditing, setIsEditing] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = React.useState(false);
  const [editedData, setEditedData] = React.useState<any>(null);
  
  const [isAddAttOpen, setIsAddAttOpen] = React.useState(false);
  const [newAtt, setNewAtt] = React.useState({ title: "", file: null as File | null });
  const [isUploading, setIsUploading] = React.useState(false);

  const [isAssessmentPickerOpen, setIsAssessmentPickerOpen] = React.useState(false);
  const [isOralPickerOpen, setIsOralPickerOpen] = React.useState(false);

  // Postpone Logic
  const [isPostponeOpen, setIsPostponeOpen] = React.useState(false);
  const [postponeComment, setPostponeComment] = React.useState("");
  const [isSavingPostpone, setIsSavingPostpone] = React.useState(false);

  const pdfRef = React.useRef<HTMLDivElement>(null);

  const studentRef = useMemoFirebase(
    () => (user && id) ? doc(db, "applications", id as string) : null, 
    [db, id, user]
  );
  const { data: student, isLoading } = useDoc(studentRef);

  const settingsQuery = useMemoFirebase(() => user ? collection(db, "settings") : null, [db, user]);
  const { data: settingsData } = useCollection(settingsQuery);
  const allSettings = settingsData || [];

  const interviewQuestionsQuery = useMemoFirebase(() => user ? collection(db, "interview_questions") : null, [db, user]);
  const { data: rawInterviewQuestions } = useCollection(interviewQuestionsQuery);
  const interviewQuestionsMap = React.useMemo(() => {
    const map: Record<string, any> = {};
    (rawInterviewQuestions || []).forEach((q: any) => {
      if (q.id) map[q.id] = q;
    });
    return map;
  }, [rawInterviewQuestions]);

  const appsForDateQuery = useMemoFirebase(() => {
    const d = editedData?.interviewDate;
    if (!d) return null;
    return query(collection(db, "applications"), where("interviewDate", "==", d));
  }, [db, editedData?.interviewDate]);
  const { data: existingApps } = useCollection(appsForDateQuery);

  const appsForOralDateQuery = useMemoFirebase(() => {
    const d = editedData?.oralInterviewDate;
    if (!d) return null;
    return query(collection(db, "applications"), where("oralInterviewDate", "==", d));
  }, [db, editedData?.oralInterviewDate]);
  const { data: existingOralApps } = useCollection(appsForOralDateQuery);

  const assessmentOccupancy = React.useMemo(() => {
    const counts: Record<string, number> = {};
    (existingApps || []).forEach(a => { if (a.interviewTime) counts[a.interviewTime] = (counts[a.interviewTime] || 0) + 1; });
    return counts;
  }, [existingApps]);

  const oralOccupancy = React.useMemo(() => {
    const counts: Record<string, number> = {};
    (existingOralApps || []).forEach(a => { if (a.oralInterviewTime) counts[a.oralInterviewTime] = (counts[a.oralInterviewTime] || 0) + 1; });
    return counts;
  }, [existingOralApps]);

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

  const campusQuery = useMemoFirebase(() => collection(db, "campus"), [db]);
  const { data: campusData } = useCollection(campusQuery);
  const campuses = campusData || [];

  // Resolve employee's campus name from campus data or userCampus string
  const userCampusName = React.useMemo(() => {
    if (!userCampus) return "";
    const match = (campuses || []).find(c => 
      c.id === userCampus || 
      (c.name && c.name.toLowerCase().trim() === userCampus.toLowerCase().trim())
    );
    return match?.name || userCampus;
  }, [userCampus, campuses]);

  // Check if student belongs to this employee's campus
  const canEditStudent = React.useMemo(() => {
    // Directors and Managers can edit all applications
    if (isDirector || isManager) return true;
    // If employee has no assigned campus or assigned to 'all', allow editing
    if (!userCampus || userCampus.trim().toLowerCase() === "all") return true;
    if (!student?.campus) return true;

    const empTarget = (userCampusName || userCampus).trim().toLowerCase();
    const appTarget = (student.campus || "").trim().toLowerCase();

    if (empTarget === appTarget) return true;
    if ((empTarget.includes("sherouk") || empTarget.includes("shorouk")) && 
        (appTarget.includes("sherouk") || appTarget.includes("shorouk"))) return true;
    if (empTarget.includes("october") && appTarget.includes("october")) return true;
    if (empTarget.includes("cairo") && appTarget.includes("cairo")) return true;
    if (empTarget.includes("zayed") && appTarget.includes("zayed")) return true;

    return false;
  }, [isDirector, isManager, userCampus, userCampusName, student?.campus]);

  const campusMappingsQuery = useMemoFirebase(() => user ? collection(db, "campus_mappings") : null, [db, user]);
  const { data: campusMappings } = useCollection(campusMappingsQuery);

  const schoolsQuery = useMemoFirebase(() => user ? collection(db, "schools") : null, [db, user]);
  const { data: schoolsData } = useCollection(schoolsQuery);
  const schoolsList = schoolsData || [];

  const gradesQuery = useMemoFirebase(() => user ? collection(db, "grade") : null, [db, user]);
  const { data: gradesData } = useCollection(gradesQuery);
  const gradeList = gradesData || [];

  const prevSchoolsQuery = useMemoFirebase(() => user ? collection(db, "previous_schools") : null, [db, user]);
  const { data: prevSchoolsData } = useCollection(prevSchoolsQuery);

  const prevSchoolSingleQuery = useMemoFirebase(() => user ? collection(db, "previous_school") : null, [db, user]);
  const { data: prevSchoolSingleData } = useCollection(prevSchoolSingleQuery);

  const allAppsQuery = useMemoFirebase(() => user ? collection(db, "applications") : null, [db, user]);
  const { data: allAppsData } = useCollection(allAppsQuery);

  // Dynamic collections from custom categories created in Settings
  const categoriesQuery = useMemoFirebase(() => user ? collection(db, "categories") : null, [db, user]);
  const { data: categoriesData } = useCollection(categoriesQuery);
  const [dynamicCategoryItems, setDynamicCategoryItems] = React.useState<string[]>([]);
  const [settingsSchools, setSettingsSchools] = React.useState<string[]>([]);

  const defaultSchools = React.useMemo(() => [
    "American",
    "IB",
    "International Girls Only, British"
  ], []);

  const campusNamesSet = React.useMemo(() => {
    return new Set(
      (campuses || [])
        .map((c: any) => c?.name?.toLowerCase().trim())
        .filter(Boolean)
    );
  }, [campuses]);

  const isCampusName = React.useCallback((name: string) => {
    if (!name) return false;
    return campusNamesSet.has(name.toLowerCase().trim());
  }, [campusNamesSet]);

  React.useEffect(() => {
    if (!db || !user) return;
    let isMounted = true;

    const fetchDynamic = async () => {
      const items: string[] = [];
      const foundSchools = new Set<string>();

      // 1. Dynamic categories created in Settings (e.g. "Schools", etc.)
      if (categoriesData && categoriesData.length > 0) {
        for (const cat of categoriesData) {
          const colName = (cat.collectionName || "").trim();
          if (!colName) continue;
          try {
            const snap = await getDocs(collection(db, colName));
            const isSchoolCategory = 
              (cat.name || "").toLowerCase().includes("school") || 
              (cat.collectionName || "").toLowerCase().includes("school") ||
              (cat.name || "").includes("مدرس") ||
              (cat.name || "").includes("نظام");

            snap.docs.forEach(doc => {
              const d = doc.data();
              if (d?.name && typeof d.name === "string" && d.name.trim()) {
                const val = d.name.trim();
                items.push(val);
                if (isSchoolCategory) {
                  foundSchools.add(val);
                }
              }
            });
          } catch {
            // ignore non-existent or restricted collections
          }
        }
      }

      // 2. Direct collections "schools" and "school" in Firestore
      for (const colName of ["schools", "school"]) {
        try {
          const snap = await getDocs(collection(db, colName));
          snap.docs.forEach(doc => {
            const d = doc.data();
            if (d?.name && typeof d.name === "string" && d.name.trim()) {
              foundSchools.add(d.name.trim());
            }
          });
        } catch {
          // ignore
        }
      }

      // 3. Settings collection documents where type === "school" or type === "schools"
      (allSettings || []).forEach((s: any) => {
        if ((s.type === "school" || s.type === "schools") && s?.name && typeof s.name === "string" && s.name.trim()) {
          foundSchools.add(s.name.trim());
        }
      });

      if (isMounted) {
        setDynamicCategoryItems(Array.from(new Set(items)));
        setSettingsSchools(Array.from(foundSchools));
      }
    };

    fetchDynamic();
    return () => { isMounted = false; };
  }, [db, user, categoriesData, allSettings]);

  // Auto-heal parent admission score if it was overwritten with an academic percentage (> 4.0) while admissions rubric scores exist
  React.useEffect(() => {
    const studentAppId = (id as string) || student?.id;
    if (!studentAppId || !student || !db) return;
    const admScores = student.admissionsScores || {};
    const rubricVals = Object.values(admScores).map(Number).filter(n => !isNaN(n) && n > 0);
    if (rubricVals.length > 0) {
      const rubricAvg = rubricVals.reduce((a, b) => a + b, 0) / rubricVals.length;
      const currentVal = student.interviewScoreObtained;
      if (currentVal !== undefined && currentVal !== null && Number(currentVal) > 4.0) {
        updateDoc(doc(db, "applications", studentAppId), {
          interviewScoreObtained: rubricAvg,
          academicScoreObtained: currentVal
        }).catch(err => console.error("Error auto-syncing parent admission score:", err));
      }
    }
  }, [id, student, db]);

  const restrictedAssessmentSlots = React.useMemo(() => {
    if (!editedData?.interviewDate) return [];
    const dateObj = new Date(editedData.interviewDate);
    return allSettings
      .filter(s => s.type === "assessment_time" && (s.date === editedData.interviewDate || (!s.date && s.day === dayNames[getDay(dateObj)])))
      .map(s => ({ ...s, isPast: isTimePast(s.name, dateObj) }))
      .filter(slot => !slot.isPast);
  }, [allSettings, editedData?.interviewDate]);

  const restrictedOralSlots = React.useMemo(() => {
    if (!editedData?.oralInterviewDate) return [];
    const dateObj = new Date(editedData.oralInterviewDate);
    return allSettings
      .filter(s => s.type === "oral_time" && (s.date === editedData.oralInterviewDate || (!s.date && s.day === dayNames[getDay(dateObj)])))
      .map(s => ({ ...s, isPast: isTimePast(s.name, dateObj) }))
      .filter(slot => !slot.isPast);
  }, [allSettings, editedData?.oralInterviewDate]);

  const selectedCampusId = React.useMemo(() => 
    (campuses || []).find(c => c.name?.toLowerCase().trim() === (editedData?.campus || student?.campus || "").toLowerCase().trim())?.id || "", 
    [editedData?.campus, student?.campus, campuses]
  );

  const currentMapping = React.useMemo(() => {
    if (!selectedCampusId || !campusMappings) return null;
    return campusMappings.find((m: any) => m.campusId === selectedCampusId || m.id === selectedCampusId) || null;
  }, [campusMappings, selectedCampusId]);

  const isGradeName = (name: string) => {
    if (!name) return false;
    const clean = name.trim().toLowerCase();
    if (/^(grade|year|kg|fs)\s*\d+/i.test(clean)) return true;
    return (gradeList || []).some((g: any) => g?.name?.toLowerCase().trim() === clean);
  };

  const filteredSchoolsOptions = React.useMemo(() => {
    const options = new Set<string>();

    // 1. Schools configured in Settings under the "Schools" card (e.g. American, IB, British)
    (settingsSchools || []).forEach(name => {
      if (name && !isGradeName(name) && !isCampusName(name)) {
        options.add(name.trim());
      }
    });

    // 2. Default NIS schools as fallback
    defaultSchools.forEach(name => {
      if (!isGradeName(name) && !isCampusName(name)) {
        options.add(name);
      }
    });

    // 3. Schools from current campus mapping (excluding any campus or grade names)
    if (currentMapping?.schools && Object.keys(currentMapping.schools).length > 0) {
      Object.values(currentMapping.schools).forEach((s: any) => {
        if (s?.name && !isGradeName(s.name) && !isCampusName(s.name)) {
          options.add(s.name.trim());
        }
      });
    }

    // 4. All registered schools from system (excluding any campus or grade names)
    (schoolsList || []).forEach((s: any) => {
      if (s?.name && !isGradeName(s.name) && !isCampusName(s.name)) {
        options.add(s.name.trim());
      }
    });

    // 5. All schools across all campus mappings (excluding any campus or grade names)
    (campusMappings || []).forEach((m: any) => {
      if (m?.schools) {
        Object.values(m.schools).forEach((s: any) => {
          if (s?.name && !isGradeName(s.name) && !isCampusName(s.name)) {
            options.add(s.name.trim());
          }
        });
      }
    });

    return Array.from(options).filter(Boolean);
  }, [
    settingsSchools,
    defaultSchools,
    currentMapping,
    schoolsList,
    campusMappings,
    gradeList,
    isCampusName
  ]);

  const selectedSchoolId = React.useMemo(() => {
    if (!currentMapping?.schools) return "";
    return Object.entries(currentMapping.schools).find(([id, s]: [string, any]) => 
      s.name?.toLowerCase().trim() === (editedData?.school || student?.school || "").toLowerCase().trim()
    )?.[0] || "";
  }, [currentMapping, editedData?.school, student?.school]);

  const filteredGradesOptions = React.useMemo(() => {
    const options = new Set<string>();

    if (editedData?.grade) options.add(editedData.grade);
    if (student?.grade) options.add(student.grade);

    // Mapped grades for selected campus & school
    if (currentMapping?.schools && selectedSchoolId) {
      const schoolData = currentMapping.schools[selectedSchoolId];
      if (schoolData?.grades && Object.keys(schoolData.grades).length > 0) {
        Object.values(schoolData.grades).forEach((g: any) => {
          if (g?.name) options.add(g.name.trim());
        });
      }
    }

    // All registered grades from the system
    (gradeList || []).forEach((g: any) => {
      if (g?.name) options.add(g.name.trim());
    });

    // All grades across all campus mappings
    (campusMappings || []).forEach((m: any) => {
      if (m?.schools) {
        Object.values(m.schools).forEach((s: any) => {
          if (s?.grades) {
            Object.values(s.grades).forEach((g: any) => {
              if (g?.name) options.add(g.name.trim());
            });
          }
        });
      }
    });

    return Array.from(options).filter(Boolean);
  }, [currentMapping, selectedSchoolId, editedData?.grade, student?.grade, gradeList, campusMappings]);

  const filteredPreviousSchoolsOptions = React.useMemo(() => {
    const options = new Set<string>();

    // 1. ONLY schools configured in Settings under the "Schools" card (e.g. American, IB, British)
    (settingsSchools || []).forEach(name => {
      if (name && !isGradeName(name) && !isCampusName(name)) {
        options.add(name.trim());
      }
    });

    // 2. Default NIS schools from Settings as fallback
    defaultSchools.forEach(name => {
      if (!isGradeName(name) && !isCampusName(name)) {
        options.add(name);
      }
    });

    // 3. Registered schools configured in system
    (schoolsList || []).forEach((s: any) => {
      if (s?.name && !isGradeName(s.name) && !isCampusName(s.name)) {
        options.add(s.name.trim());
      }
    });

    return Array.from(options).filter(Boolean);
  }, [
    settingsSchools,
    defaultSchools,
    schoolsList,
    gradeList,
    isCampusName
  ]);

  const tabs = [
    { id: "personal", label: t('personal'), icon: User },
    { id: "school", label: t('school_info'), icon: GraduationCap },
    { id: "father", label: t('father'), icon: User },
    { id: "mother", label: t('mother'), icon: User },
    { id: "appointment", label: t('appointment'), icon: Calendar },
    { id: "payment", label: t('payment'), icon: CreditCard },
    { id: "attachments", label: t('attachments'), icon: Paperclip },
    { id: "history", label: t('history'), icon: HistoryIcon },
  ];

  React.useEffect(() => {
    if (student && !isEditing) {
      setEditedData(student);
    }
  }, [student, isEditing]);

  const handleUpdateField = (field: string, value: string) => {
    setEditedData((prev: any) => {
      const newData = { ...prev, [field]: value };
      if (field === "governorate") {
        newData.government = value;
      } else if (field === "government") {
        newData.governorate = value;
      }
      if (field === "campus") {
        newData.school = "";
        newData.grade = "";
      }
      if (field === "school") {
        newData.grade = "";
      }
      if (field === "category" && value !== "Internal Transfer") {
        newData.previousCampus = "";
      }
      return newData;
    });
  };

  const handleSetPrimaryContact = async (phone: string) => {
    if (!phone) {
      toast({ variant: "destructive", title: t('syncing'), description: "This parent has no phone number recorded." });
      return;
    }
    if (!studentRef) return;
    
    try {
      await updateDoc(studentRef, { 
        primaryContactPhone: phone,
        updatedAt: new Date().toISOString()
      });
      toast({ title: t('confirm'), description: `Phone number ${phone} is now the primary contact for SMS.` });
    } catch (e) {
      console.error("Failed to update primary contact phone:", e);
      toast({ variant: "destructive", title: "Update Failed" });
    }
  };

  const handleAddAttachment = async () => {
    if (!newAtt.title.trim() || !newAtt.file || !storage || !studentRef) {
      toast({ variant: "destructive", title: "Missing Information", description: "Please provide a title and select a file." });
      return;
    }

    setIsUploading(true);
    try {
      const fileRef = ref(storage, `attachments/${id}/${Date.now()}_${newAtt.file.name}`);
      const uploadResult = await uploadBytes(fileRef, newAtt.file);
      const downloadUrl = await getDownloadURL(uploadResult.ref);

      const currentAtts = student?.attachments || [];
      const updatedAtts = [...currentAtts, { 
        id: Date.now().toString(),
        title: newAtt.title.trim(), 
        url: downloadUrl, 
        fileName: newAtt.file.name,
        addedAt: new Date().toISOString(),
        addedBy: employee?.name || user?.email?.split('@')[0] || "System"
      }];

      await updateDoc(studentRef, {
        attachments: updatedAtts,
        updatedAt: new Date().toISOString()
      });

      setNewAtt({ title: "", file: null });
      setIsAddAttOpen(false);
      toast({ title: "Attachment Uploaded" });
    } catch (error) {
      console.error("Failed to upload attachment:", error);
      toast({ variant: "destructive", title: "Upload Failed" });
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveAttachment = async (attId: string) => {
    if (!studentRef) return;
    const updatedAtts = (student?.attachments || []).filter((a: any) => a.id !== attId);
    try {
      await updateDoc(studentRef, {
        attachments: updatedAtts,
        updatedAt: new Date().toISOString()
      });
      toast({ title: "Attachment Removed" });
    } catch (e) {
      console.error("Failed to remove attachment:", e);
      toast({ variant: "destructive", title: "Action Failed" });
    }
  };

  const handleSave = async () => {
    if (!studentRef || !editedData || !student) return;

    if (!canEditStudent) {
      toast({ 
        variant: "destructive", 
        title: isRTL ? "غير مصرح" : "Unauthorized", 
        description: isRTL ? "يمكنك فقط تعديل طلبات التقديم التابعة للفرع الخاص بك." : "You can only edit applications belonging to your assigned campus." 
      });
      return;
    }

    if (editedData.status === "Postponed" && student.status !== "Postponed") {
      setPostponeComment("");
      setIsPostponeOpen(true);
      return;
    }

    setIsSaving(true);
    try {
      const updatedData = {
        ...editedData,
        studentName: `${editedData.firstName || ''} ${editedData.lastName || ''}`.trim(),
        fatherName: `${editedData.fatherFirstName || ''} ${editedData.fatherLastName || ''}`.trim(),
        motherName: `${editedData.motherFirstName || ''} ${editedData.motherLastName || ''}`.trim(),
        updatedAt: new Date().toISOString()
      };

      if (updatedData.status !== student.status) {
        if (updatedData.status === "No Show") {
          const count = (student.noShowCount || 0) + 1;
          updatedData.noShowCount = count;
        }
      }

      const { id: _, ...dataToSave } = updatedData;
      await updateDoc(studentRef, dataToSave);
      toast({ title: t('confirm'), description: isRTL ? "تم حفظ بيانات الطالب بنجاح" : "Student profile updated." });
      setIsEditing(false);
    } catch (error: any) {
      console.error("Failed to save student profile:", error);
      toast({ 
        variant: "destructive", 
        title: isRTL ? "فشل الحفظ" : "Save Failed", 
        description: error?.message || (isRTL ? "حدث خطأ أثناء حفظ التعديلات" : "Could not save student changes.") 
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePostponeHistory = async () => {
    if (!studentRef || !postponeComment.trim()) return;
    setIsSavingPostpone(true);
    try {
      const historyEntry = {
        status: "Postponed",
        previousStatus: student.status,
        comment: postponeComment.trim(),
        changedAt: new Date().toISOString(),
        changedBy: employee?.name || user?.email?.split('@')[0] || "System"
      };

      await updateDoc(studentRef, {
        status: "Postponed",
        previousStatus: student.status,
        postponeComment: postponeComment.trim(),
        statusHistory: arrayUnion(historyEntry),
        updatedAt: new Date().toISOString()
      });

      toast({ title: "Status Updated", description: "Applicant moved to Postponed status." });
      setIsPostponeOpen(false);
      setIsEditing(false);
    } catch (e) {
      console.error("Failed to save postpone status:", e);
      toast({ variant: "destructive", title: "Error" });
    } finally {
      setIsSavingPostpone(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!pdfRef.current || !student) return;
    setIsDownloadingPdf(true);
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      const element = pdfRef.current.cloneNode(true) as HTMLElement;
      element.style.display = "block";
      element.style.width = "180mm";
      element.style.margin = "0 auto";
      
      const opt = {
        margin: [5, 5, 5, 5],
        filename: `NIS_Student_Report_${student.id}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, letterRendering: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
      };
      
      await html2pdf().set(opt).from(element).save();
      toast({ title: t('download_pdf') });
    } catch (err) {
      console.error("Failed to download PDF:", err);
      toast({ variant: "destructive", title: "Download Failed" });
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const currentData = isEditing ? { ...student, ...editedData } : (student || editedData || {});

  // Parent Admission Rubric Score calculations (available across all tabs and PDF export)
  const compParentAdmissionScoresMap = currentData.admissionsScores || student?.admissionsScores || {};
  const compParentAdmissionRubricVals = Object.values(compParentAdmissionScoresMap)
    .map((v: any) => Number(v))
    .filter((v: number) => !isNaN(v) && v > 0);
  const compParentAdmissionRubricAvg = compParentAdmissionRubricVals.length > 0
    ? compParentAdmissionRubricVals.reduce((a, b) => a + b, 0) / compParentAdmissionRubricVals.length
    : null;

  let compParentAdmissionScoreRaw: any = compParentAdmissionRubricAvg ?? currentData.parentAdmissionScore ?? student?.parentAdmissionScore;
  if (compParentAdmissionScoreRaw === null || compParentAdmissionScoreRaw === undefined) {
    const legacyRaw = currentData.interviewScoreObtained ?? student?.interviewScoreObtained;
    if (legacyRaw !== undefined && legacyRaw !== null && legacyRaw !== "" && legacyRaw !== 0) {
      const n = Number(legacyRaw);
      if (!isNaN(n) && n <= 4.0) {
        compParentAdmissionScoreRaw = n;
      }
    }
  }

  const hasParentAdmissionScore = compParentAdmissionScoreRaw !== undefined && compParentAdmissionScoreRaw !== null && compParentAdmissionScoreRaw !== "" && compParentAdmissionScoreRaw !== 0;
  const parentAdmissionScoreFormatted = hasParentAdmissionScore 
    ? (Number(compParentAdmissionScoreRaw) % 1 === 0 ? Number(compParentAdmissionScoreRaw).toString() : parseFloat(Number(compParentAdmissionScoreRaw).toFixed(2)).toString()) 
    : null;

  const AssessmentRecord = ({ record, title, isCurrent = false, attemptNumber }: { record: any, title: string, isCurrent?: boolean, attemptNumber?: number }) => {
    // Parent rubric average if present in this record
    const admScores = record.admissionsScores || {};
    const admVals = Object.values(admScores).map(Number).filter(n => !isNaN(n) && n > 0);
    const rubricAvg = admVals.length > 0 ? (admVals.reduce((a, b) => a + b, 0) / admVals.length) : null;

    let parentScoreNum = rubricAvg;
    if (parentScoreNum === null) {
      const raw = record.parentAdmissionScore ?? record.interviewScore ?? record.interviewScoreObtained;
      if (raw !== undefined && raw !== null && raw !== '') {
        const n = parseFloat(raw);
        if (!isNaN(n) && n <= 4.0) {
          parentScoreNum = n;
        }
      }
    }
    const formattedScore = parentScoreNum !== null ? `${parentScoreNum % 1 === 0 ? parentScoreNum : parseFloat(parentScoreNum.toFixed(2))}/4.0` : '—';
    const resultStatus = record.resultStatus || record.interviewResult || record.status || 'N/A';
    
    // Safely format timestamp
    let formattedDate = '—';
    const rawDate = record.updatedAt || record.createdAt || record.savedAt || record.interviewDateScored || record.date;
    if (rawDate) {
      try {
        formattedDate = format(new Date(rawDate), "MMM dd, yyyy p");
      } catch {
        formattedDate = String(rawDate);
      }
    }

    // Extract subject grades
    let subjectItems: Array<{ name: string; score: string | number; maxScore?: string | number }> = [];
    if (Array.isArray(record.scoresList) && record.scoresList.length > 0) {
      subjectItems = record.scoresList;
    } else if (Array.isArray(record.academicScoresDetailed) && record.academicScoresDetailed.length > 0) {
      subjectItems = record.academicScoresDetailed;
    } else if (record.academicScores && typeof record.academicScores === "object") {
      const mapping = (campusMappings || []).find((m: any) => 
        m.campusName === currentData.campus || m.campusId === currentData.campusId || m.id === currentData.campusId
      );
      let subjectDefinitions: any[] = [];
      if (mapping?.schools) {
        const schoolEntry = Object.values(mapping.schools).find((s: any) => s.name === currentData.school) as any;
        if (schoolEntry?.grades) {
          const gradeEntry = Object.values(schoolEntry.grades).find((g: any) => g.name === currentData.grade) as any;
          if (gradeEntry?.subjects) {
            subjectDefinitions = gradeEntry.subjects;
          }
        }
      }

      subjectItems = Object.entries(record.academicScores).map(([subId, scoreVal]) => {
        const matchedDef = subjectDefinitions.find((sd: any) => 
          sd.subjectId === subId || sd.name?.toLowerCase() === subId.toLowerCase()
        );
        return {
          name: matchedDef?.name || subId,
          score: scoreVal as any,
          maxScore: matchedDef?.maxScore || "—"
        };
      });
    }

    const academicRawScore = record.studentAcademicScore ?? record.academicScoreObtained ?? (record.type === "Academic Assessment" ? (record.interviewScoreObtained ?? record.studentInterviewScoreObtained) : undefined);
    const hasAcademicScore = academicRawScore !== undefined && academicRawScore !== null && academicRawScore !== "" && academicRawScore !== 0;
    const academicRawNum = hasAcademicScore ? parseFloat(academicRawScore) : null;
    const isAcademicPercentage = academicRawNum !== null && !isNaN(academicRawNum) && academicRawNum > 4.0;
    const academicAvg = academicRawNum !== null ? (isAcademicPercentage ? `${academicRawNum}%` : `${academicRawNum % 1 === 0 ? academicRawNum : parseFloat(academicRawNum.toFixed(2))}/4.0`) : null;
    const hasParentScore = formattedScore !== '—';

    return (
      <div className={cn(
        "p-8 md:p-10 rounded-[3rem] border shadow-sm transition-all space-y-8 relative overflow-hidden group",
        isCurrent ? "bg-white border-blue-200 ring-1 ring-blue-100" : "bg-white border-slate-100"
      )}>
         <div className={cn("flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-slate-100", isRTL && "flex-row-reverse")}>
            <div className={cn("flex items-center gap-4", isRTL && "flex-row-reverse")}>
              <div className={cn(
                "h-14 w-14 rounded-2xl flex items-center justify-center border shadow-sm shrink-0",
                isCurrent ? "bg-blue-50 border-blue-100" : "bg-slate-50 border-slate-100"
              )}>
                <Trophy className={cn("h-7 w-7", isCurrent ? "text-blue-600" : "text-slate-400")} />
              </div>
              <div>
                 <p className="font-black text-slate-900 text-xl tracking-tight">
                   {isCurrent 
                     ? (isRTL ? "التقييم الأكاديمي الحالي (النشط)" : "Current Active Assessment") 
                     : (isRTL ? `المحاولة السابقة #${attemptNumber || 1}` : `Historical Attempt #${attemptNumber || 1}`)}
                 </p>
                 <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-0.5">
                   RECORDED BY <span className="text-slate-900 font-bold">{record.savedBy || record.interviewScoredBy || "SYSTEM"}</span> ON {formattedDate}
                 </p>
              </div>
            </div>

            <div className={cn("flex items-center gap-2.5", isRTL && "flex-row-reverse")}>
               <div className={cn(
                 "flex items-center gap-1.5 px-3.5 py-1 rounded-full border shadow-sm",
                 isCurrent ? "bg-blue-600 text-white border-blue-600" : "bg-slate-50 text-slate-400 border-slate-100"
               )}>
                 <Flag className="h-3 w-3" />
                 <span className="text-[10px] font-black uppercase tracking-widest">
                   {isCurrent ? (isRTL ? "نشط" : "Active Result") : (isRTL ? "مؤرشف" : "Archived")}
                 </span>
               </div>
               <Badge className={cn(
                 "font-black text-[10px] px-4 py-1 rounded-full uppercase tracking-widest border",
                 isCurrent ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-slate-50 text-slate-400 border-slate-100"
               )}>
                 {record.type || "Academic Assessment"}
               </Badge>
            </div>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 bg-slate-50/70 rounded-[2rem] border border-slate-100 space-y-2">
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                 {hasAcademicScore ? (isRTL ? "متوسط التقييم الأكاديمي" : "Academic Assessment Avg") : (isRTL ? "درجة التقييم" : "Assessment Score")}
               </p>
               <p className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
                 {hasAcademicScore ? academicAvg : formattedScore}
               </p>
            </div>
            <div className="p-6 bg-slate-50/70 rounded-[2rem] border border-slate-100 space-y-2">
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                 {isRTL ? "النتيجة النهائية" : "FINAL RESULT"}
               </p>
               <div className="pt-1">
                 <Badge className={cn(
                   "px-4 py-1.5 rounded-xl text-[10px] font-black border uppercase tracking-widest",
                   resultStatus.toLowerCase().includes('pass') ? "bg-emerald-50 text-emerald-600 border-emerald-200" : 
                   resultStatus.toLowerCase().includes('fail') || resultStatus.toLowerCase().includes('reject') ? "bg-rose-50 text-rose-600 border-rose-200" : 
                   "bg-blue-50 text-blue-600 border-blue-200"
                 )}>
                   {resultStatus}
                 </Badge>
               </div>
            </div>
            <div className="p-6 bg-slate-50/70 rounded-[2rem] border border-slate-100 space-y-2">
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                 {isRTL ? "حالة الطالب الحالية" : "CURRENT STATUS"}
               </p>
               <div className="flex items-center gap-2 pt-2">
                 <div className={cn(
                   "h-3 w-3 rounded-full animate-pulse",
                   resultStatus.toLowerCase().includes('pass') ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" :
                   resultStatus.toLowerCase().includes('fail') ? "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]" :
                   "bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"
                 )} />
                 <span className="text-xs font-bold text-slate-600 uppercase tracking-tighter">{resultStatus}</span>
               </div>
            </div>
         </div>

         {/* Academic Subject Breakdown Grid */}
         {subjectItems.length > 0 && (
           <div className="space-y-4 pt-4 border-t border-slate-100">
             <div className={cn("flex items-center justify-between", isRTL && "flex-row-reverse")}>
               <div className={cn("flex items-center gap-2.5", isRTL && "flex-row-reverse")}>
                 <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                   <BookOpen className="h-4 w-4" />
                 </div>
                 <span className="text-xs font-black text-slate-800 uppercase tracking-widest">
                   {isRTL ? "درجات المواد التقييمية" : "Academic Subject Scores"}
                 </span>
               </div>
               <Badge variant="outline" className="text-[10px] font-bold text-slate-500 bg-slate-50 border-slate-200">
                 {subjectItems.length} {isRTL ? "مواد" : "Subjects"}
               </Badge>
             </div>

             <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
               {subjectItems.map((subj, sIdx) => {
                 const scoreNum = parseFloat(String(subj.score));
                 const maxNum = parseFloat(String(subj.maxScore));
                 const hasValidNumbers = !isNaN(scoreNum) && !isNaN(maxNum) && maxNum > 0;
                 const percent = hasValidNumbers ? Math.round((scoreNum / maxNum) * 100) : null;

                 return (
                   <div 
                     key={sIdx} 
                     className="p-5 rounded-2xl bg-slate-50/80 hover:bg-blue-50/40 border border-slate-100 transition-all space-y-3"
                   >
                     <div className={cn("flex items-center justify-between gap-2", isRTL && "flex-row-reverse")}>
                       <span className="font-black text-sm text-slate-800 capitalize tracking-tight truncate">
                         {subj.name}
                       </span>
                       {percent !== null && (
                         <span className={cn(
                           "text-[10px] font-black px-2 py-0.5 rounded-md border",
                           percent >= 60 
                             ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                             : "bg-rose-50 text-rose-700 border-rose-200"
                         )}>
                           {percent}%
                         </span>
                       )}
                     </div>

                     <div className={cn("flex items-baseline justify-between", isRTL && "flex-row-reverse")}>
                       <div className={cn("flex items-baseline gap-1.5", isRTL && "flex-row-reverse")}>
                         <span className="text-3xl font-black text-slate-900 tracking-tight">
                           {subj.score || "—"}
                         </span>
                         {subj.maxScore && subj.maxScore !== "—" && (
                           <span className="text-xs font-bold text-slate-400">
                             / {subj.maxScore}
                           </span>
                         )}
                       </div>
                       <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                         {isRTL ? "الدرجة" : "Score"}
                       </span>
                     </div>

                     {percent !== null && (
                       <div className="w-full bg-slate-200/70 rounded-full h-1.5 overflow-hidden">
                         <div 
                           className={cn(
                             "h-full rounded-full transition-all duration-500",
                             percent >= 60 ? "bg-emerald-500" : "bg-rose-500"
                           )}
                           style={{ width: `${Math.min(percent, 100)}%` }}
                         />
                       </div>
                     )}
                   </div>
                 );
               })}
             </div>
           </div>
         )}
      </div>
    );
  };

  if (isLoading) return <div className="p-20 text-center text-slate-400 font-bold">{t('syncing')}</div>;
  if (!currentData || !student) return <div className="p-20 text-center text-slate-400 font-bold">Student not found.</div>;

  // Regular employees cannot access records with No Show or Cancelled by Phone statuses
  if (!canSeeSalesFollowupStatuses && isSalesFollowupStatus(currentData.status || student.status)) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-100 shadow-sm text-center space-y-4">
          <div className="h-16 w-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
            <Lock className="h-8 w-8" />
          </div>
          <h2 className="text-lg font-black text-slate-900">
            {isRTL ? "غير مصرح بعرض هذا الطلب" : "Access Restricted"}
          </h2>
          <p className="text-xs text-slate-500 leading-relaxed font-medium">
            {isRTL
              ? "هذا الطالب في حالة متابعة/مبيعات (لم يحضر أو اعتذار هاتفي)، وتقتصر صلاحية متابعته على إدارة المدرسة وقسم المبيعات فقط."
              : "This application is in Sales follow-up (No Show / Cancelled by Phone). Visibility is restricted to Director and Sales roles only."}
          </p>
          <Button onClick={() => router.push("/applications")} className="rounded-xl h-11 px-6 font-bold text-xs bg-blue-600 hover:bg-blue-700 text-white">
            {isRTL ? "العودة لقائمة الطلبات" : "Back to Applications"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("max-w-7xl mx-auto space-y-12 pb-20", isRTL && "font-arabic")}>
      <div className="space-y-12 animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100">
          <div className="flex items-center gap-6">
            <Button variant="ghost" size="icon" className="h-12 w-12 rounded-2xl" onClick={() => router.back()}><ChevronLeft className={cn("h-6 w-6", isRTL && "rotate-180")} /></Button>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-4xl font-black text-[#1a1a1a] font-serif">{currentData.studentName || t('syncing')}</h1>
                <span className="bg-blue-50 text-blue-600 text-[10px] font-black px-3 py-1 rounded-full uppercase border border-blue-100">{currentData.status}</span>
                {currentData.category === "Internal Transfer" && (
                  <span className="bg-purple-50 text-purple-700 text-[10px] font-black px-3 py-1 rounded-full uppercase border border-purple-200 flex items-center gap-1">
                    {t('internal_transfer')}{currentData.previousCampus ? ` • ${t('previous_campus_label')}: ${currentData.previousCampus}` : ''}
                  </span>
                )}
              </div>
              <p className="text-slate-400 text-sm font-bold uppercase">{t('id')}: {currentData.id} • {currentData.campus ? `${t('campus_label')}: ${currentData.campus} • ` : ''}{currentData.school}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button className="h-12 px-6 gap-2 rounded-2xl bg-blue-600 font-bold" onClick={handleDownloadPdf} disabled={isDownloadingPdf}>
              {isDownloadingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />} {t('download_pdf')}
            </Button>
            {isEditing ? (
              <><Button variant="outline" className="h-12 px-6 rounded-2xl font-bold" onClick={() => { setIsEditing(false); setEditedData(student); }} disabled={isSaving}>{t('cancel')}</Button>
              <Button className="h-12 px-8 rounded-2xl bg-emerald-600 font-bold" onClick={handleSave} disabled={isSaving}>{isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} {t('save')}</Button></>
            ) : canEditStudent ? (
              <Button variant="outline" className="h-12 px-8 rounded-2xl font-bold" onClick={() => setIsEditing(true)}><Pencil className="h-4 w-4" /> {t('edit_profile')}</Button>
            ) : (
              <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-2xl text-amber-700 text-xs font-bold">
                <MapPin className="h-3.5 w-3.5" />
                <span>{isRTL ? `عرض فقط (فرع ${student?.campus || 'مختلف'})` : `View Only (${student?.campus || 'Other'} Campus)`}</span>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white shadow-lg p-2 rounded-[3.5rem] flex items-center justify-between overflow-x-auto no-scrollbar">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button 
                key={tab.id} 
                onClick={() => setActiveTab(tab.id)} 
                className={cn(
                  "flex-1 flex flex-col items-center justify-center gap-2 py-5 px-6 rounded-[2.5rem] transition-all duration-300 min-w-[130px]",
                  isActive 
                    ? "bg-[#0a1a3a] text-white shadow-xl scale-105" 
                    : "text-slate-400 hover:text-[#0a1a3a] hover:bg-slate-50"
                )}
              >
                <tab.icon className={cn("h-6 w-6", isActive ? "text-white" : "text-slate-400")} />
                <span className={cn(
                  "text-[11px] font-black uppercase tracking-wider text-center whitespace-nowrap",
                  isActive ? "text-white" : "text-slate-400"
                )}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>

        <Card className="border-none shadow-2xl rounded-[4rem] bg-white overflow-hidden transition-all duration-500">
          <CardContent className="p-10 md:p-20">
            {activeTab === "personal" && (
              <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4">
                <h2 className={cn("text-3xl font-bold text-[#1a1a1a] font-serif flex items-center gap-3", isRTL ? "flex-row-reverse" : "")}>
                  <div className="h-10 w-10 bg-blue-50 rounded-xl flex items-center justify-center"><User className="h-6 w-6 text-blue-600" /></div>
                  {t('personal')}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                  <DataField t={t} label={t('application_id_label')} value={currentData.id} field="id" isEditing={isEditing} editedData={editedData} onUpdate={handleUpdateField} />
                  <DataField t={t} label={t('arabic_name_label')} value={currentData.arabicName} field="arabicName" isEditing={isEditing} editedData={editedData} onUpdate={handleUpdateField} />
                  <DataField t={t} label={t('first_name_label')} value={currentData.firstName} field="firstName" isEditing={isEditing} editedData={editedData} onUpdate={handleUpdateField} />
                  <DataField t={t} label={t('last_name_label')} value={currentData.lastName} field="lastName" isEditing={isEditing} editedData={editedData} onUpdate={handleUpdateField} />
                  <DataField t={t} label={t('type_label')} value={currentData.category} field="category" isEditing={isEditing} editedData={editedData} onUpdate={handleUpdateField} options={["New Commer", "Internal Transfer"]} />
                  {(currentData.category === "Internal Transfer" || currentData.previousCampus || (isEditing && editedData?.category === "Internal Transfer")) && (
                    <DataField 
                      t={t} 
                      label={t('previous_campus_label')} 
                      value={currentData.previousCampus} 
                      field="previousCampus" 
                      isEditing={isEditing} 
                      editedData={editedData} 
                      onUpdate={handleUpdateField} 
                      options={campuses.map(c => c.name)} 
                    />
                  )}
                  <DataField t={t} label={t('dob_label')} value={currentData.dateOfBirth} field="dateOfBirth" type="date" isEditing={isEditing} editedData={editedData} onUpdate={handleUpdateField} />
                  <DataField t={t} label={t('national_id_label')} value={currentData.nationalId} field="nationalId" isEditing={isEditing} editedData={editedData} onUpdate={handleUpdateField} />
                  <DataField t={t} label={t('religion_label')} value={currentData.religion} field="religion" isEditing={isEditing} editedData={editedData} onUpdate={handleUpdateField} options={["Muslim", "Christian", "Other"]} />
                  <DataField t={t} label={t('citizenship_label')} value={currentData.citizenship} field="citizenship" isEditing={isEditing} editedData={editedData} onUpdate={handleUpdateField} />
                  <DataField t={t} label={t('gender_label')} value={currentData.gender} field="gender" isEditing={isEditing} editedData={editedData} onUpdate={handleUpdateField} options={["Male", "Female"]} />
                  <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
                    <div className="md:col-span-1">
                      <DataField 
                        t={t} 
                        label={t('status')} 
                        value={currentData.status} 
                        field="status" 
                        isEditing={isEditing} 
                        editedData={editedData} 
                        onUpdate={handleUpdateField} 
                        options={[
                          "Applicant",
                          "Confirmed Assessment",
                          "Passed Admission Interview",
                          "Declined",
                          "Postponed",
                          "Duplicate",
                          ...(canSeeSalesFollowupStatuses ? ["Cancelled by Phone", "No Show"] : []),
                          "No Answer",
                          "Re-exam",
                          "Tested",
                          "Failed Assessment",
                          "Passed Assessment",
                          "Oral Interview",
                          "Confirmed Interview",
                          "Passed Parent Interview",
                          "Failed Parent Interview",
                          "Passed Oral Interview",
                          "Failed Oral Interview",
                          "Acceptance Sent",
                          "Paid",
                          "Waiting List",
                          "Refund Request"
                        ]} 
                      />
                    </div>
                    <DataField 
                      t={t} 
                      label={isRTL ? "المحافظة (Government)" : "Government / Governorate"} 
                      value={currentData.governorate || currentData.government} 
                      field="governorate" 
                      isEditing={isEditing} 
                      editedData={editedData} 
                      onUpdate={handleUpdateField} 
                      options={[
                        "Cairo", "Giza", "Alexandria", "Dakahlia", "Red Sea", "Beheira", "Fayoum", 
                        "Gharbia", "Ismailia", "Menofia", "Minya", "Qaliubiya", "New Valley", 
                        "Suez", "Aswan", "Assiut", "Beni Suef", "Port Said", "Damietta", 
                        "Sharkia", "South Sinai", "Kafr Al-Sheikh", "Matrouh", "Luxor", "Qena", 
                        "North Sinai", "Sohag"
                      ]}
                      allowCustomInput={true}
                    />
                    <DataField 
                      t={t} 
                      label={t('second_lang_label') || (isRTL ? "اللغة الثانية" : "Second Language")} 
                      value={currentData.secondLanguage} 
                      field="secondLanguage" 
                      isEditing={isEditing} 
                      editedData={editedData} 
                      onUpdate={handleUpdateField} 
                      options={["French", "German", "Other"]} 
                    />
                    <DataField t={t} label={t('city_label')} value={currentData.city} field="city" isEditing={isEditing} editedData={editedData} onUpdate={handleUpdateField} />
                    <DataField t={t} label={t('street_label')} value={currentData.street} field="street" isEditing={isEditing} editedData={editedData} onUpdate={handleUpdateField} />
                  </div>
                </div>
              </div>
            )}

            {activeTab === "school" && (
              <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4">
                 <h2 className={cn("text-3xl font-bold text-[#1a1a1a] font-serif flex items-center gap-3", isRTL ? "flex-row-reverse" : "")}>
                    <div className="h-10 w-10 bg-blue-50 rounded-xl flex items-center justify-center"><GraduationCap className="h-6 w-6 text-blue-600" /></div>
                    {t('school_info')}
                 </h2>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                    <DataField 
                      t={t} 
                      label={t('previous_school_label')} 
                      value={currentData.previousSchool} 
                      field="previousSchool" 
                      isEditing={isEditing} 
                      editedData={editedData} 
                      onUpdate={handleUpdateField} 
                      options={filteredPreviousSchoolsOptions}
                      allowCustomInput={true}
                    />
                    {(currentData.category === "Internal Transfer" || currentData.previousCampus || (isEditing && editedData?.category === "Internal Transfer")) && (
                      <DataField 
                        t={t} 
                        label={t('previous_campus_label')} 
                        value={currentData.previousCampus} 
                        field="previousCampus" 
                        isEditing={isEditing} 
                        editedData={editedData} 
                        onUpdate={handleUpdateField} 
                        options={campuses.map(c => c.name)} 
                      />
                    )}
                    <DataField t={t} label={t('applied_grade_label')} value={currentData.grade} field="grade" isEditing={isEditing} editedData={editedData} onUpdate={handleUpdateField} options={filteredGradesOptions} />
                    <DataField t={t} label={t('campus_label')} value={currentData.campus} field="campus" isEditing={isEditing} editedData={editedData} onUpdate={handleUpdateField} options={campuses.map(c => c.name)} />
                    <DataField t={t} label={t('target_school_label')} value={currentData.school} field="school" isEditing={isEditing} editedData={editedData} onUpdate={handleUpdateField} options={filteredSchoolsOptions} allowCustomInput={true} />
                    <DataField t={t} label={t('second_lang_label')} value={currentData.secondLanguage} field="secondLanguage" isEditing={isEditing} editedData={editedData} onUpdate={handleUpdateField} options={["French", "German", "Other"]} />
                    <div className="md:col-span-2">
                       <DataField t={t} label={t('notes_label')} value={currentData.notes} field="notes" type="textarea" isEditing={isEditing} editedData={editedData} onUpdate={handleUpdateField} />
                    </div>
                 </div>
              </div>
            )}

            {activeTab === "father" && (
              <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4">
                <h2 className={cn("text-3xl font-bold text-[#1a1a1a] font-serif flex items-center gap-3", isRTL ? "flex-row-reverse" : "")}>
                  <div className="h-10 w-10 bg-blue-50 rounded-xl flex items-center justify-center"><User className="h-6 w-6 text-blue-600" /></div>
                  {t('father_info')}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-x-12 gap-y-8">
                  <DataField t={t} label={t('first_name_label')} value={currentData.fatherFirstName} field="fatherFirstName" isEditing={isEditing} editedData={editedData} onUpdate={handleUpdateField} />
                  <DataField t={t} label={t('last_name_label')} value={currentData.fatherLastName} field="fatherLastName" isEditing={isEditing} editedData={editedData} onUpdate={handleUpdateField} />
                  <DataField t={t} label={t('arabic_name_label')} value={currentData.fatherArabicName} field="fatherArabicName" isEditing={isEditing} editedData={editedData} onUpdate={handleUpdateField} />
                  <DataField t={t} label={t('dob_label')} value={currentData.fatherDOB} field="fatherDOB" type="date" isEditing={isEditing} editedData={editedData} onUpdate={handleUpdateField} />
                  <DataField t={t} 
                    label={t('phone_label')} 
                    value={currentData.fatherPhone} 
                    field="fatherPhone" 
                    isEditing={isEditing} 
                    editedData={editedData} 
                    onUpdate={handleUpdateField} 
                    isPrimaryContact={currentData.primaryContactPhone === currentData.fatherPhone && !!currentData.fatherPhone}
                  />
                  <DataField t={t} label={t('email_label')} value={currentData.fatherEmail} field="fatherEmail" isEditing={isEditing} editedData={editedData} onUpdate={handleUpdateField} />
                  <DataField t={t} label={t('national_id_label')} value={currentData.fatherNationalId} field="nationalId" isEditing={isEditing} editedData={editedData} onUpdate={handleUpdateField} />
                  <DataField t={t} label={t('degree_label')} value={currentData.fatherAcademicDegree} field="fatherAcademicDegree" isEditing={isEditing} editedData={editedData} onUpdate={handleUpdateField} />
                  <DataField t={t} label={t('occupation_label')} value={currentData.fatherOccupation} field="fatherOccupation" isEditing={isEditing} editedData={editedData} onUpdate={handleUpdateField} options={["Manager", "Teacher", "Engineer", "Doctor", "Private Business", "Other"]} />
                  <DataField t={t} label={t('company_label')} value={currentData.fatherCompanyBusiness} field="company" isEditing={isEditing} editedData={editedData} onUpdate={handleUpdateField} />
                </div>
                <div className="pt-6 border-t border-slate-100">
                   <Button 
                    variant="outline" 
                    className="h-12 px-8 rounded-2xl bg-blue-50 text-blue-600 border-blue-100 font-bold gap-2 hover:bg-blue-100"
                    onClick={() => handleSetPrimaryContact(currentData.fatherPhone)}
                   >
                     <MessageSquare className="h-4 w-4" /> {t('select_primary_contact')}
                   </Button>
                </div>
              </div>
            )}

            {activeTab === "mother" && (
              <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4">
                <h2 className={cn("text-3xl font-bold text-[#1a1a1a] font-serif flex items-center gap-3", isRTL ? "flex-row-reverse" : "")}>
                  <div className="h-10 w-10 bg-rose-50 rounded-xl flex items-center justify-center"><User className="h-6 w-6 text-rose-600" /></div>
                  {t('mother_info')}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-x-12 gap-y-8">
                  <DataField t={t} label={t('first_name_label')} value={currentData.motherFirstName} field="motherFirstName" isEditing={isEditing} editedData={editedData} onUpdate={handleUpdateField} />
                  <DataField t={t} label={t('last_name_label')} value={currentData.motherLastName} field="motherLastName" isEditing={isEditing} editedData={editedData} onUpdate={handleUpdateField} />
                  <DataField t={t} label={t('arabic_name_label')} value={currentData.motherArabicName} field="motherArabicName" isEditing={isEditing} editedData={editedData} onUpdate={handleUpdateField} />
                  <DataField t={t} label={t('dob_label')} value={currentData.motherDOB} field="motherDOB" type="date" isEditing={isEditing} editedData={editedData} onUpdate={handleUpdateField} />
                  <DataField t={t} 
                    label={t('phone_label')} 
                    value={currentData.motherPhone} 
                    field="motherPhone" 
                    isEditing={isEditing} 
                    editedData={editedData} 
                    onUpdate={handleUpdateField} 
                    isPrimaryContact={currentData.primaryContactPhone === currentData.motherPhone && !!currentData.motherPhone}
                  />
                  <DataField t={t} label={t('email_label')} value={currentData.motherEmail} field="motherEmail" isEditing={isEditing} editedData={editedData} onUpdate={handleUpdateField} />
                  <DataField t={t} label={t('national_id_label')} value={currentData.motherAcademicDegree} field="motherAcademicDegree" isEditing={isEditing} editedData={editedData} onUpdate={handleUpdateField} />
                  <DataField t={t} label={t('occupation_label')} value={currentData.motherOccupation} field="motherOccupation" isEditing={isEditing} editedData={editedData} onUpdate={handleUpdateField} options={["Manager", "Teacher", "Engineer", "Doctor", "Private Business", "Housewife", "Other"]} />
                  <DataField t={t} label={t('company_label')} value={currentData.motherCompanyBusiness} field="company" isEditing={isEditing} editedData={editedData} onUpdate={handleUpdateField} />
                </div>
                <div className="pt-6 border-t border-slate-100">
                   <Button 
                    variant="outline" 
                    className="h-12 px-8 rounded-2xl bg-blue-50 text-blue-600 border-blue-100 font-bold gap-2 hover:bg-blue-100"
                    onClick={() => handleSetPrimaryContact(currentData.motherPhone)}
                   >
                     <MessageSquare className="h-4 w-4" /> {t('select_primary_contact')}
                   </Button>
                </div>
              </div>
            )}

            {activeTab === "appointment" && (
              <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4">
                <h2 className={cn("text-3xl font-bold text-[#1a1a1a] font-serif flex items-center gap-3", isRTL ? "flex-row-reverse" : "")}>
                  <div className="h-10 w-10 bg-blue-50 rounded-xl flex items-center justify-center"><Calendar className="h-6 w-6 text-blue-600" /></div>
                  {t('appointment')}
                </h2>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                   <div className="space-y-12">
                      <div className="space-y-6">
                        <h3 className="text-xl font-bold text-slate-800 flex items-center gap-3">
                           <div className="h-10 w-10 bg-blue-50 rounded-xl flex items-center justify-center"><CalendarClock className="h-6 w-6 text-blue-600" /></div>
                           {t('interview_schedule')}
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                           <div className="space-y-1.5">
                              <Label className="text-xs font-bold text-slate-800 ml-1">{t('interview_date_label')}</Label>
                              {isEditing ? (
                                 <Popover open={isAssessmentPickerOpen} onOpenChange={setIsAssessmentPickerOpen}>
                                    <PopoverTrigger asChild>
                                       <Button variant="outline" className="w-full h-12 justify-start font-medium rounded-xl border-slate-200">
                                          <Calendar className="mr-2 h-4 w-4 text-blue-500" />
                                          {editedData.interviewDate ? format(new Date(editedData.interviewDate), "PPP") : t('pick_date')}
                                       </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                       <CalendarComp 
                                        mode="single" 
                                        selected={editedData.interviewDate ? new Date(editedData.interviewDate) : undefined}
                                        onSelect={(d) => { if(d) { handleUpdateField('interviewDate', format(d, "yyyy-MM-dd")); handleUpdateField('interviewTime', ''); setIsAssessmentPickerOpen(false); } }}
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
                              ) : (
                                <div className="h-12 bg-slate-50/80 rounded-xl flex items-center px-5 text-slate-700 font-medium border border-transparent">
                                   {currentData.interviewDate || "—"}
                                </div>
                              )}
                           </div>

                           <div className="space-y-1.5">
                              <Label className="text-xs font-bold text-slate-800 ml-1">{t('interview_time_label')}</Label>
                              {isEditing ? (
                                 <Select value={editedData.interviewTime || ""} onValueChange={(v) => handleUpdateField('interviewTime', v)} disabled={!editedData.interviewDate}>
                                    <SelectTrigger className="h-12 rounded-xl border-slate-200">
                                       <SelectValue placeholder={t('available_slots')} />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl">
                                       {(restrictedAssessmentSlots || []).map((slot: any) => (
                                         <SelectItem key={slot.id} value={slot.name} disabled={(assessmentOccupancy[slot.name] || 0) >= (parseInt(slot.capacity) || 1)} className="py-3">
                                            {slot.name} {(assessmentOccupancy[slot.name] || 0) >= (parseInt(slot.capacity) || 1) ? `(${t('cap')})` : ''}
                                         </SelectItem>
                                       ))}
                                    </SelectContent>
                                 </Select>
                              ) : (
                                <div className="h-12 bg-slate-50/80 rounded-xl flex items-center px-5 text-slate-700 font-medium border border-transparent">
                                   {currentData.interviewTime || "—"}
                                </div>
                              )}
                           </div>

                           <DataField t={t} label={t('location_label')} value={currentData.location} field="location" isEditing={isEditing} editedData={editedData} onUpdate={handleUpdateField} />
                           <DataField t={t} label={t('assessment_type_label')} value={currentData.assessmentType} field="assessmentType" isEditing={isEditing} editedData={editedData} onUpdate={handleUpdateField} options={["On-Campus", "Online"]} />
                           <DataField t={t} label={t('interviewer')} value={currentData.interviewer} field="interviewer" isEditing={isEditing} editedData={editedData} onUpdate={handleUpdateField} />
                        </div>
                      </div>

                      {(currentData.oralInterviewDate || currentData.oralInterviewTime || isEditing) && (
                        <div className="pt-12 border-t border-slate-100 animate-in fade-in slide-in-from-top-4 duration-500">
                           <h3 className="text-xl font-bold text-slate-800 flex items-center gap-3 mb-6">
                              <div className="h-10 w-10 bg-purple-50 rounded-xl flex items-center justify-center"><MessageSquare className="h-6 w-6 text-purple-600" /></div>
                              {t('reschedule_oral')}
                           </h3>
                           <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                              <div className="space-y-1.5">
                                 <Label className="text-xs font-bold text-slate-800 ml-1">{t('interview_date_label')}</Label>
                                 {isEditing ? (
                                    <Popover open={isOralPickerOpen} onOpenChange={setIsOralPickerOpen}>
                                       <PopoverTrigger asChild>
                                          <Button variant="outline" className="w-full h-12 justify-start font-medium rounded-xl border-slate-200">
                                             <Calendar className="mr-2 h-4 w-4 text-purple-500" />
                                             {editedData.oralInterviewDate ? format(new Date(editedData.oralInterviewDate), "PPP") : t('pick_date')}
                                          </Button>
                                       </PopoverTrigger>
                                       <PopoverContent className="w-auto p-0" align="start">
                                          <CalendarComp 
                                           mode="single" 
                                           selected={editedData.oralInterviewDate ? new Date(editedData.oralInterviewDate) : undefined}
                                           onSelect={(d) => { if(d) { handleUpdateField('oralInterviewDate', format(d, "yyyy-MM-dd")); handleUpdateField('oralInterviewTime', ''); setIsOralPickerOpen(false); } }}
                                           initialFocus
                                           modifiers={{ hasSlots: (date) => { const fmt = format(date, "yyyy-MM-dd"); return availableOralDates.dates.has(fmt) || availableOralDates.recurringDays.has(dayNames[getDay(date)]); } }}
                                           modifiersClassNames={{ hasSlots: "relative after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-1 after:h-1 after:bg-purple-600 after:rounded-full" }}
                                           disabled={(date) => {
                                             const today = startOfDay(new Date());
                                             const isPast = isBefore(startOfDay(date), today);
                                             const hasNoSlots = !availableOralDates.dates.has(format(date, "yyyy-MM-dd")) && !availableAssessmentDates.recurringDays.has(dayNames[getDay(date)]);
                                             return isPast || hasNoSlots;
                                           }}
                                          />
                                       </PopoverContent>
                                    </Popover>
                                 ) : (
                                   <div className="h-12 bg-slate-50/80 rounded-xl flex items-center px-5 text-slate-700 font-medium border border-transparent">
                                      {currentData.oralInterviewDate || "—"}
                                   </div>
                                 )}
                              </div>

                              <div className="space-y-1.5">
                                 <Label className="text-xs font-bold text-slate-800 ml-1">{t('interview_time_label')}</Label>
                                 {isEditing ? (
                                    <Select value={editedData.oralInterviewTime || ""} onValueChange={(v) => handleUpdateField('oralInterviewTime', v)} disabled={!editedData.oralInterviewDate}>
                                       <SelectTrigger className="h-12 rounded-xl border-slate-200">
                                          <SelectValue placeholder={t('available_slots')} />
                                       </SelectTrigger>
                                       <SelectContent className="rounded-xl">
                                          {(restrictedOralSlots || []).map((slot: any) => (
                                            <SelectItem key={slot.id} value={slot.name} disabled={(oralOccupancy[slot.name] || 0) >= (parseInt(slot.capacity) || 1)} className="py-3">
                                               {slot.name} {(oralOccupancy[slot.name] || 0) >= (parseInt(slot.capacity) || 1) ? `(${t('cap')})` : ''}
                                            </SelectItem>
                                          ))}
                                       </SelectContent>
                                    </Select>
                                 ) : (
                                   <div className="h-12 bg-slate-50/80 rounded-xl flex items-center px-5 text-slate-700 font-medium border border-transparent">
                                      {currentData.oralInterviewTime || "—"}
                                   </div>
                                 )}
                              </div>

                              <DataField t={t} label={t('location_label')} value={currentData.oralLocation} field="oralLocation" isEditing={isEditing} editedData={editedData} onUpdate={handleUpdateField} />
                              <DataField t={t} label={t('interviewer')} value={currentData.oralInterviewer} field="oralInterviewer" isEditing={isEditing} editedData={editedData} onUpdate={handleUpdateField} />
                           </div>
                        </div>
                      )}
                   </div>

                   <div className="space-y-6">
                      <h3 className="text-xl font-bold text-slate-800 flex items-center gap-3">
                         <div className="h-10 w-10 bg-emerald-50 rounded-xl flex items-center justify-center"><Info className="h-6 w-6 text-emerald-600" /></div>
                         {t('source_info')}
                      </h3>
                      <div className="grid grid-cols-1 gap-4">
                         <DataField 
                           t={t} 
                           label={t('hear_about_label')} 
                           value={currentData.hearAbout} 
                           field="hearAbout" 
                           isEditing={isEditing} 
                           editedData={editedData} 
                           onUpdate={handleUpdateField} 
                           options={["Social Media", "Friends", "Website", "Facebook", "Instagram", "School Fair", "Billboard", "Word of Mouth", "Other"]}
                           allowCustomInput={true}
                         />
                      </div>
                   </div>
                </div>

                {currentData.assessmentType === "Online" && (
                  <div className="mt-12 p-10 bg-emerald-50/50 rounded-[3rem] border border-emerald-100 animate-in zoom-in duration-500">
                    <h3 className="text-xl font-bold text-emerald-800 flex items-center gap-3 mb-8">
                       <div className="h-10 w-10 bg-emerald-100 rounded-xl flex items-center justify-center"><Globe className="h-6 w-6 text-emerald-600" /></div>
                       {t('online_credentials')}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                       <DataField t={t} label={t('portal_email_label')} value={currentData.onlineEmail} field="onlineEmail" isEditing={isEditing} editedData={editedData} onUpdate={handleUpdateField} />
                       <DataField t={t} label={t('portal_pass_label')} value={currentData.onlinePassword} field="onlinePassword" isEditing={isEditing} editedData={editedData} onUpdate={handleUpdateField} />
                       <DataField t={t} label={t('exam_link_label')} value={currentData.onlineLink} field="onlineLink" isEditing={isEditing} editedData={editedData} onUpdate={handleUpdateField} />
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === "payment" && (
              <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4">
                <h2 className={cn("text-3xl font-bold text-[#1a1a1a] font-serif flex items-center gap-3", isRTL ? "flex-row-reverse" : "")}>
                  <div className="h-10 w-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                    <CreditCard className="h-6 w-6 text-emerald-600" />
                  </div>
                  {t('payment')}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                  <div className="space-y-6">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                      <Wallet className="h-5 w-5 text-emerald-500" /> {t('payment_method_label')}
                    </h3>
                    <div className="grid grid-cols-1 gap-6">
                      <DataField t={t} label={t('payment_method_label')} value={currentData.admissionFeeMethod} field="admissionFeeMethod" isEditing={isEditing} editedData={editedData} onUpdate={handleUpdateField} options={["Campus", "Bank"]} disabled={!!student?.admissionFeeMethod} />
                      <DataField t={t} label={t('fee_amount_label')} value={currentData.admissionFeeAmount} field="admissionFeeAmount" type="number" isEditing={isEditing} editedData={editedData} onUpdate={handleUpdateField} disabled={!!student?.admissionFeeAmount} />
                      <div className={cn("flex items-center space-x-4 p-6 rounded-[2rem] border transition-all", currentData.isDeferredToOrientation ? "bg-amber-50 border-amber-200" : "bg-slate-50/50 border-slate-100")}>
                        <Checkbox id="defer-orientation" checked={currentData.isDeferredToOrientation === "true" || currentData.isDeferredToOrientation === true} onCheckedChange={(checked) => { if (isEditing) handleUpdateField('isDeferredToOrientation', checked === true ? "true" : "false"); }} disabled={!isEditing} className="h-5 w-5 rounded-md border-slate-300" />
                        <div className="flex flex-col"><Label htmlFor="defer-orientation" className="text-sm font-bold text-slate-800 cursor-pointer">{t('defer_payment_label')}</Label><p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">{t('defer_payment_desc')}</p></div>
                      </div>
                      <DataField t={t} label={t('payment_comment_label')} value={currentData.paymentComment} field="paymentComment" type="textarea" isEditing={isEditing} editedData={editedData} onUpdate={handleUpdateField} />
                    </div>
                  </div>
                  <div className="space-y-6">
                     <h3 className={cn("text-lg font-bold text-slate-800 flex items-center gap-2", isRTL ? "flex-row-reverse" : "")}><Info className="h-5 w-5 text-blue-500" /> {t('payment_policy')}</h3>
                     <div className="p-8 bg-blue-50/30 rounded-[2.5rem] border border-blue-100 space-y-4">
                        <p className={cn("text-xs text-slate-600 leading-relaxed font-medium", isRTL ? "text-right" : "text-left")}>{t('payment_policy_desc')}</p>
                        <div className={cn("flex items-center gap-3", isRTL ? "flex-row-reverse" : "")}><div className="h-2 w-2 rounded-full bg-blue-500" /><span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{t('payment_policy_campus')}</span></div>
                        <div className={cn("flex items-center gap-3", isRTL ? "flex-row-reverse" : "")}><div className="h-2 w-2 rounded-full bg-blue-500" /><span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{t('payment_policy_bank')}</span></div>
                     </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "attachments" && (
              <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4">
                 <div className="flex items-center justify-between">
                    <h2 className={cn("text-3xl font-bold text-[#1a1a1a] font-serif flex items-center gap-3", isRTL ? "flex-row-reverse" : "")}>
                       <div className="h-10 w-10 bg-blue-50 rounded-xl flex items-center justify-center"><Paperclip className="h-6 w-6 text-blue-600" /></div>
                       {t('attachments_title')}
                    </h2>
                    <Button onClick={() => { setNewAtt({title: "", file: null}); setIsAddAttOpen(true); }} className="bg-blue-600 hover:bg-blue-700 text-white font-bold gap-2 rounded-xl h-11 px-6 shadow-lg shadow-blue-500/20 transition-all active:scale-95">
                        <Plus className="h-4 w-4" /> {t('add_attachment')}
                    </Button>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {(student?.attachments || []).length > 0 ? (
                      student.attachments.map((att: any) => (
                        <Card key={att.id} className="border border-slate-100 shadow-sm rounded-3xl overflow-hidden group hover:shadow-md transition-all">
                           <CardContent className="p-6 space-y-4">
                              <div className="flex items-start justify-between"><div className="h-12 w-12 bg-slate-50 rounded-xl flex items-center justify-center group-hover:bg-blue-50 transition-colors"><FileText className="h-6 w-6 text-slate-400 group-hover:text-blue-500" /></div><Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300 hover:text-rose-500" onClick={() => handleRemoveAttachment(att.id)}><Trash2 className="h-4 w-4" /></Button></div>
                              <div><h4 className="font-bold text-slate-800 text-lg line-clamp-1">{att.title}</h4><p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">{t('saved_by')} {att.addedBy}</p></div>
                              <div className="pt-2 flex items-center gap-2"><Button variant="outline" className="w-full rounded-xl border-slate-200 text-slate-600 font-bold gap-2 text-xs" onClick={() => window.open(att.url, '_blank')}><ExternalLink className="h-3.5 w-3.5" /> {t('view')}</Button></div>
                           </CardContent>
                        </Card>
                      ))
                    ) : (
                      <div className="col-span-full py-24 text-center bg-slate-50/50 border-2 border-dashed border-slate-200 rounded-[3rem]"><div className="h-16 w-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm border border-slate-100"><Paperclip className="h-8 w-8 text-slate-300" /></div><p className="text-slate-400 font-bold italic">{t('no_attachments')}</p></div>
                    )}
                 </div>
              </div>
            )}

                        {activeTab === "history" && (() => {
              const currentStatus = currentData.status || student?.status || "Applicant";
              const isPostponed = currentStatus === "Postponed" || currentStatus?.toLowerCase().includes("postpone");
              const allStatusLogs = ((student?.statusHistory || currentData.statusHistory || []) as any[]);
              const postponeLogs = allStatusLogs.filter((log: any) => log.status === "Postponed");
              const latestPostponeLog = postponeLogs.length > 0 ? postponeLogs[postponeLogs.length - 1] : null;
              const postponeCommentText = currentData.postponeComment || currentData.postponedReason || currentData.postponeReason || latestPostponeLog?.comment || currentData.comment || student?.postponeComment || "";
              const postponedBy = latestPostponeLog?.changedBy || currentData.postponedBy || "Admissions Staff";
              const postponedAt = latestPostponeLog?.changedAt || currentData.updatedAt;

              // 2. Transition from Interview & Assessment to Oral Interview
              const oralTransitionLog = allStatusLogs.slice().reverse().find((log: any) => 
                log.status === "Oral Interview" || 
                log.type === "Oral Interview" || 
                (log.comment && (log.comment.toLowerCase().includes("oral") || log.comment.includes("شفهية")))
              );
              const hasOralDate = !!(currentData.oralInterviewDate || student?.oralInterviewDate);
              const hasOralStatus = [
                "Oral Interview", 
                "Passed Parent Interview", 
                "Failed Parent Interview", 
                "Passed Oral Interview", 
                "Failed Oral Interview", 
                "Approved by Director"
              ].includes(currentStatus);
              const hasTransitionedToOral = !!oralTransitionLog || hasOralDate || hasOralStatus;

              const transitionChangedBy = oralTransitionLog?.changedBy || currentData.oralScheduledBy || currentData.scheduledBy || "Admissions / Assessment Staff";
              const transitionChangedAt = oralTransitionLog?.changedAt || (hasOralDate ? currentData.oralInterviewDate : currentData.updatedAt);
              const transitionScheduledDate = oralTransitionLog?.oralInterviewDate || currentData.oralInterviewDate || student?.oralInterviewDate || "—";
              const transitionScheduledTime = oralTransitionLog?.oralInterviewTime || currentData.oralInterviewTime || student?.oralInterviewTime || "—";
              const transitionComment = oralTransitionLog?.comment || (isRTL ? "تم تحويل الطالب بنجاح إلى مرحلة المقابلة الشفهية" : "Student scheduled and promoted to Oral Interview stage");

              // 3A. Parent Admission Interview (Stage 1: Interview & Assessment)
              const parentAdmissionScoresMap = currentData.admissionsScores || student?.admissionsScores || {};
              const parentAdmissionCommentsMap = currentData.admissionsItemComments || student?.admissionsItemComments || {};

              // Calculate rubric average directly from parentAdmissionScoresMap (1.0 to 4.0 scale)
              const parentAdmissionRubricVals = Object.values(parentAdmissionScoresMap)
                .map((v: any) => Number(v))
                .filter((v: number) => !isNaN(v) && v > 0);
              const parentAdmissionRubricAvg = parentAdmissionRubricVals.length > 0
                ? parentAdmissionRubricVals.reduce((a, b) => a + b, 0) / parentAdmissionRubricVals.length
                : null;

              // If rubric has scores (like 2.5), always prioritize it!
              // Otherwise, check parentAdmissionScore, or interviewScoreObtained ONLY if <= 4.0 (since > 4.0 is academic test percentage like 75)
              let parentAdmissionScoreRaw: any = parentAdmissionRubricAvg ?? currentData.parentAdmissionScore ?? student?.parentAdmissionScore;
              if (parentAdmissionScoreRaw === null || parentAdmissionScoreRaw === undefined) {
                const legacyRaw = currentData.interviewScoreObtained ?? student?.interviewScoreObtained;
                if (legacyRaw !== undefined && legacyRaw !== null && legacyRaw !== "" && legacyRaw !== 0) {
                  const n = Number(legacyRaw);
                  if (!isNaN(n) && n <= 4.0) {
                    parentAdmissionScoreRaw = n;
                  }
                }
              }

              const hasParentAdmissionScore = parentAdmissionScoreRaw !== undefined && parentAdmissionScoreRaw !== null && parentAdmissionScoreRaw !== "" && parentAdmissionScoreRaw !== 0;
              // Format cleanly: if e.g. 2.5, format to "2.5" matching the rubric score directly
              const parentAdmissionScoreFormatted = hasParentAdmissionScore 
                ? (Number(parentAdmissionScoreRaw) % 1 === 0 ? Number(parentAdmissionScoreRaw).toString() : parseFloat(Number(parentAdmissionScoreRaw).toFixed(2)).toString()) 
                : null;
              const parentAdmissionResult = currentData.interviewResult || (currentStatus.includes("Passed Admission Interview") ? "Passed" : (hasParentAdmissionScore ? (parseFloat(String(parentAdmissionScoreRaw)) >= 2.5 ? "Passed" : "Failed") : null));
              const parentAdmissionDate = currentData.interviewDate || currentData.applicationDate || currentData.updatedAt;
              const parentAdmissionEvaluator = currentData.interviewScoredBy || (isRTL ? "لجنة مقابلات القبول (Admissions)" : "Admissions Assessment Committee");

              // Helper to extract numeric score from any attempt object
              const extractOralScore = (att: any) => {
                if (!att) return null;
                const direct = att.scoreObtained ?? att.oralScoreObtained ?? att.studentInterviewScoreObtained ?? att.score;
                if (direct !== undefined && direct !== null && direct !== "" && Number(direct) > 0) {
                  return Number(direct);
                }
                if (att.scores && typeof att.scores === "object") {
                  const vals = Object.values(att.scores).map(Number).filter(n => !isNaN(n) && n > 0);
                  if (vals.length > 0) return vals.reduce((a, b) => a + b, 0) / vals.length;
                }
                return null;
              };

              // 5. Re-Exam and Reschedule Logs
              const rescheduleList = ((currentData.rescheduleHistory || student?.rescheduleHistory || []) as any[]);
              const rescheduleCount = rescheduleList.length;
              const reExamList = ((currentData.reExamHistory || student?.reExamHistory || []) as any[]);
              const reExamCount = reExamList.length;

              // 3B. Parent Oral Interview with Principal (Stage 2: Oral Interview)
              const parentOralHistory = ((currentData.parentOralHistory || student?.parentOralHistory || []) as any[]);
              const parentOralReExamLogs = reExamList.filter((r: any) => 
                r.type && (r.type.toLowerCase().includes("parent oral") || (r.type.toLowerCase().includes("parent") && r.type.toLowerCase().includes("re-exam")))
              );

              const scoredPastParentOralAttempts: Array<{ attempt: any; score: number; result: string; date: any; evaluator: string }> = [];
              parentOralHistory.forEach((att: any) => {
                const sc = extractOralScore(att);
                if (sc !== null && sc > 0) {
                  scoredPastParentOralAttempts.push({
                    attempt: att,
                    score: sc,
                    result: att.result || (sc >= 2.5 ? "Passed" : "Failed"),
                    date: att.date || att.createdAt,
                    evaluator: att.savedBy || (isRTL ? "مدير المدرسة" : "School Principal / Director")
                  });
                }
              });

              const isParentOralReExam = 
                parentOralReExamLogs.length > 0 || 
                parentOralHistory.length > 1 || 
                (scoredPastParentOralAttempts.length >= 1 && (
                  (currentData.oralScoreObtained === 0 || !currentData.oralScoreObtained) ||
                  currentData.previousStatus === "Failed Parent Interview" ||
                  currentData.status === "Oral Interview" ||
                  currentData.status === "Re-exam"
                ));

              let oldParentOralScoreFormatted: string | null = null;
              let oldParentOralResult: string | null = null;
              let oldParentOralDate: any = null;
              let oldParentOralEvaluator: string | null = null;
              let oldParentOralScoreRaw: number | null = null;

              if (scoredPastParentOralAttempts.length > 0) {
                const oldAtt = scoredPastParentOralAttempts[0];
                oldParentOralScoreRaw = oldAtt.score;
                oldParentOralScoreFormatted = (oldAtt.score % 1 === 0 ? oldAtt.score.toString() : parseFloat(oldAtt.score.toFixed(2)).toString());
                oldParentOralResult = oldAtt.result;
                oldParentOralDate = oldAtt.date;
                oldParentOralEvaluator = oldAtt.evaluator;
              }

              const currentLiveParentOralScore = extractOralScore({ scoreObtained: currentData.oralScoreObtained, scores: currentData.oralScores });
              let isNewParentOralScored = false;
              let newParentOralScoreFormatted: string | null = null;
              let newParentOralResult: string | null = null;
              let newParentOralDate: any = null;
              let newParentOralEvaluator: string | null = null;
              let newParentOralScoreRaw: number | null = null;

              if (currentLiveParentOralScore !== null && currentLiveParentOralScore > 0) {
                isNewParentOralScored = true;
                newParentOralScoreRaw = currentLiveParentOralScore;
                newParentOralScoreFormatted = (currentLiveParentOralScore % 1 === 0 ? currentLiveParentOralScore.toString() : parseFloat(currentLiveParentOralScore.toFixed(2)).toString());
                newParentOralResult = currentData.oralResult || (currentLiveParentOralScore >= 2.5 ? "Passed" : "Failed");
                newParentOralDate = currentData.oralInterviewDate || currentData.updatedAt;
                newParentOralEvaluator = currentData.oralEvaluator || currentData.principalName || currentData.updatedBy || (isRTL ? "مدير المدرسة" : "School Principal / Director");
              } else if (scoredPastParentOralAttempts.length >= 2) {
                const latestScored = scoredPastParentOralAttempts[scoredPastParentOralAttempts.length - 1];
                isNewParentOralScored = true;
                newParentOralScoreRaw = latestScored.score;
                newParentOralScoreFormatted = (latestScored.score % 1 === 0 ? latestScored.score.toString() : parseFloat(latestScored.score.toFixed(2)).toString());
                newParentOralResult = latestScored.result;
                newParentOralDate = latestScored.date;
                newParentOralEvaluator = latestScored.evaluator;
              }

              const latestParentOralAttempt = parentOralHistory.length > 0 ? parentOralHistory[parentOralHistory.length - 1] : null;
              const parentOralScoreRaw = isNewParentOralScored ? newParentOralScoreRaw : (oldParentOralScoreRaw ?? (currentData.oralScoreObtained ?? student?.oralScoreObtained ?? latestParentOralAttempt?.scoreObtained));
              const hasParentOralScore = parentOralScoreRaw !== undefined && parentOralScoreRaw !== null && parentOralScoreRaw !== "" && Number(parentOralScoreRaw) > 0;
              const parentOralScoreFormatted = hasParentOralScore ? (Number(parentOralScoreRaw) % 1 === 0 ? Number(parentOralScoreRaw).toString() : parseFloat(Number(parentOralScoreRaw).toFixed(2)).toString()) : null;
              const parentOralResult = isParentOralReExam
                ? (isNewParentOralScored ? newParentOralResult : (isRTL ? "إعادة اختبار مجدولة" : "Re-Exam Scheduled"))
                : (currentData.oralResult || latestParentOralAttempt?.result || (hasParentOralScore ? (parseFloat(String(parentOralScoreRaw)) >= 2.5 ? "Passed" : "Failed") : null));
              const parentOralDate = (isParentOralReExam && isNewParentOralScored ? newParentOralDate : null) || latestParentOralAttempt?.date || latestParentOralAttempt?.createdAt || currentData.oralInterviewDate || currentData.updatedAt;
              const parentOralEvaluator = (isParentOralReExam && isNewParentOralScored ? newParentOralEvaluator : null) || latestParentOralAttempt?.savedBy || currentData.oralEvaluator || currentData.principalName || currentData.updatedBy || (isRTL ? "مدير المدرسة" : "School Principal / Director");
              const parentOralScoresMap = latestParentOralAttempt?.scores || currentData.oralScores || {};
              const parentOralCommentsMap = latestParentOralAttempt?.comments || currentData.oralItemComments || {};

              // 4A. Student Academic Assessment (By Subject)
              const assessmentHistory = ((currentData.assessmentHistory || student?.assessmentHistory || []) as any[]);
              const latestAssessmentAttempt = assessmentHistory.length > 0 ? assessmentHistory[assessmentHistory.length - 1] : null;

              // Extract curriculum subjects for student's grade/campus
              const currentMappingObj = (campusMappings || []).find((m: any) => 
                m.campusName === currentData.campus || m.campusId === currentData.campusId || m.id === currentData.campusId
              );
              let gradeSubjectsList: any[] = [];
              if (currentMappingObj?.schools) {
                const schoolEntry = Object.values(currentMappingObj.schools).find((s: any) => s.name === currentData.school) as any;
                if (schoolEntry?.grades) {
                  const gradeEntry = Object.values(schoolEntry.grades).find((g: any) => g.name === currentData.grade) as any;
                  if (gradeEntry?.subjects) {
                    gradeSubjectsList = gradeEntry.subjects;
                  }
                }
              }

              let subjectItems: Array<{ name: string; score: string | number; maxScore?: string | number; isScored: boolean }> = [];
              if (Array.isArray(latestAssessmentAttempt?.scoresList) && latestAssessmentAttempt.scoresList.length > 0) {
                subjectItems = latestAssessmentAttempt.scoresList.map((s: any) => ({
                  name: s.name,
                  score: s.score,
                  maxScore: s.maxScore || "—",
                  isScored: s.score !== undefined && s.score !== null && s.score !== "" && s.score !== "—"
                }));
              } else if (Array.isArray(currentData.academicScoresDetailed) && currentData.academicScoresDetailed.length > 0) {
                subjectItems = currentData.academicScoresDetailed.map((s: any) => ({
                  name: s.name,
                  score: s.score,
                  maxScore: s.maxScore || "—",
                  isScored: s.score !== undefined && s.score !== null && s.score !== "" && s.score !== "—"
                }));
              } else if (currentData.academicScores && typeof currentData.academicScores === "object" && Object.keys(currentData.academicScores).length > 0) {
                subjectItems = Object.entries(currentData.academicScores).map(([subId, scoreVal]) => {
                  const matched = gradeSubjectsList.find((gs: any) => gs.subjectId === subId || gs.name?.toLowerCase() === subId.toLowerCase());
                  return {
                    name: matched?.name || subId,
                    score: scoreVal as any,
                    maxScore: matched?.maxScore || "—",
                    isScored: scoreVal !== undefined && scoreVal !== null && scoreVal !== "" && scoreVal !== "—"
                  };
                });
              }

              if (subjectItems.length === 0 && gradeSubjectsList.length > 0) {
                subjectItems = gradeSubjectsList.map((gs: any) => ({
                  name: gs.name,
                  score: "—",
                  maxScore: gs.maxScore || "—",
                  isScored: false
                }));
              }

              const hasScoredSubjects = subjectItems.some(s => s.isScored);
              const academicResult = latestAssessmentAttempt?.resultStatus || (currentStatus.includes("Assessment") ? currentStatus : (hasScoredSubjects ? "Tested" : null));
              const academicDate = latestAssessmentAttempt?.date || latestAssessmentAttempt?.createdAt || currentData.academicDateScored || currentData.interviewDate;
              const academicEvaluator = latestAssessmentAttempt?.savedBy || currentData.academicScoredBy || (isRTL ? "مسؤول التقييم الأكاديمي" : "Academic Assessment Committee");

              // 4B. Student Oral Interview with Principal (Stage 2)
              const studentOralHistory = ((currentData.studentOralHistory || student?.studentOralHistory || []) as any[]);
              const studentOralReExamLogs = reExamList.filter((r: any) => 
                r.type && (r.type.toLowerCase().includes("student oral") || (r.type.toLowerCase().includes("student") && r.type.toLowerCase().includes("re-exam")) || (r.type.toLowerCase().includes("oral") && !r.type.toLowerCase().includes("parent")))
              );

              const scoredPastOralAttempts: Array<{ attempt: any; score: number; result: string; date: any; evaluator: string }> = [];
              studentOralHistory.forEach((att: any) => {
                const sc = extractOralScore(att);
                if (sc !== null && sc > 0) {
                  scoredPastOralAttempts.push({
                    attempt: att,
                    score: sc,
                    result: att.result || (sc >= 2.5 ? "Passed" : "Failed"),
                    date: att.date || att.createdAt,
                    evaluator: att.savedBy || (isRTL ? "مدير المدرسة" : "School Principal")
                  });
                }
              });

              const isStudentOralReExam = 
                studentOralReExamLogs.length > 0 || 
                studentOralHistory.length > 1 || 
                (scoredPastOralAttempts.length >= 1 && (
                  (currentData.studentInterviewScoreObtained === 0 || !currentData.studentInterviewScoreObtained) ||
                  currentData.previousStatus === "Failed Oral Interview" ||
                  currentData.status === "Passed Parent Interview" ||
                  currentData.status === "Re-exam"
                ));

              let oldOralScoreFormatted: string | null = null;
              let oldOralResult: string | null = null;
              let oldOralDate: any = null;
              let oldOralEvaluator: string | null = null;
              let oldOralScoreRaw: number | null = null;

              if (scoredPastOralAttempts.length > 0) {
                const oldAtt = scoredPastOralAttempts[0];
                oldOralScoreRaw = oldAtt.score;
                oldOralScoreFormatted = (oldAtt.score % 1 === 0 ? oldAtt.score.toString() : parseFloat(oldAtt.score.toFixed(2)).toString());
                oldOralResult = oldAtt.result;
                oldOralDate = oldAtt.date;
                oldOralEvaluator = oldAtt.evaluator;
              }

              const currentLiveStudentOralScore = extractOralScore({ scoreObtained: currentData.studentInterviewScoreObtained, scores: currentData.studentInterviewScores });
              let isNewOralScored = false;
              let newOralScoreFormatted: string | null = null;
              let newOralResult: string | null = null;
              let newOralDate: any = null;
              let newOralEvaluator: string | null = null;
              let newOralScoreRaw: number | null = null;

              if (currentLiveStudentOralScore !== null && currentLiveStudentOralScore > 0) {
                isNewOralScored = true;
                newOralScoreRaw = currentLiveStudentOralScore;
                newOralScoreFormatted = (currentLiveStudentOralScore % 1 === 0 ? currentLiveStudentOralScore.toString() : parseFloat(currentLiveStudentOralScore.toFixed(2)).toString());
                newOralResult = currentData.studentInterviewResult || (currentLiveStudentOralScore >= 2.5 ? "Passed" : "Failed");
                newOralDate = currentData.oralInterviewDate || currentData.updatedAt;
                newOralEvaluator = currentData.principalName || currentData.updatedBy || (isRTL ? "مدير المدرسة" : "School Principal");
              } else if (scoredPastOralAttempts.length >= 2) {
                const latestScored = scoredPastOralAttempts[scoredPastOralAttempts.length - 1];
                isNewOralScored = true;
                newOralScoreRaw = latestScored.score;
                newOralScoreFormatted = (latestScored.score % 1 === 0 ? latestScored.score.toString() : parseFloat(latestScored.score.toFixed(2)).toString());
                newOralResult = latestScored.result;
                newOralDate = latestScored.date;
                newOralEvaluator = latestScored.evaluator;
              }

              const latestStudentOralAttempt = studentOralHistory.length > 0 ? studentOralHistory[studentOralHistory.length - 1] : null;
              const studentOralScoreRaw = isNewOralScored ? newOralScoreRaw : (oldOralScoreRaw ?? (currentData.studentInterviewScoreObtained ?? student?.studentInterviewScoreObtained ?? latestStudentOralAttempt?.scoreObtained));
              const hasStudentOralScore = studentOralScoreRaw !== undefined && studentOralScoreRaw !== null && studentOralScoreRaw !== "" && Number(studentOralScoreRaw) > 0;
              const studentOralScoreFormatted = hasStudentOralScore ? (Number(studentOralScoreRaw) % 1 === 0 ? Number(studentOralScoreRaw).toString() : parseFloat(Number(studentOralScoreRaw).toFixed(2)).toString()) : null;
              const studentOralResult = isStudentOralReExam 
                ? (isNewOralScored ? newOralResult : (isRTL ? "إعادة اختبار مجدولة" : "Re-Exam Scheduled")) 
                : (currentData.studentInterviewResult || latestStudentOralAttempt?.result || (hasStudentOralScore ? (parseFloat(String(studentOralScoreRaw)) >= 2.5 ? "Passed" : "Failed") : null));
              const studentOralDate = (isStudentOralReExam && isNewOralScored ? newOralDate : null) || latestStudentOralAttempt?.date || latestStudentOralAttempt?.createdAt || currentData.oralInterviewDate || currentData.updatedAt;
              const studentOralEvaluator = (isStudentOralReExam && isNewOralScored ? newOralEvaluator : null) || latestStudentOralAttempt?.savedBy || currentData.principalName || (isRTL ? "مدير المدرسة" : "School Principal");
              const studentOralScoresMap = latestStudentOralAttempt?.scores || currentData.studentInterviewScores || {};
              const studentOralCommentsMap = latestStudentOralAttempt?.comments || currentData.studentInterviewItemComments || {};

              const getRubricLevel = (val: number) => {
                if (val >= 4) return { label: isRTL ? "متقدم (4/4)" : "Advanced (4/4)", color: "bg-emerald-100 text-emerald-800 border-emerald-200" };
                if (val >= 3) return { label: isRTL ? "متمكن (3/4)" : "Proficient (3/4)", color: "bg-blue-100 text-blue-800 border-blue-200" };
                if (val >= 2) return { label: isRTL ? "في طور التطور (2/4)" : "Developing (2/4)", color: "bg-amber-100 text-amber-800 border-amber-200" };
                return { label: isRTL ? "دون المستوى (1/4)" : "Below Benchmark (1/4)", color: "bg-rose-100 text-rose-800 border-rose-200" };
              };

              return (
                <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4">
                  {/* SECTION 1: CURRENT STATUS & POSTPONED YELLOW FLAG */}
                  <div className="space-y-6">
                    <div className={cn("flex items-center justify-between gap-4", isRTL && "flex-row-reverse")}>
                      <div className={cn("flex items-center gap-3", isRTL && "flex-row-reverse")}>
                        <div className="h-12 w-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                          <HistoryIcon className="h-6 w-6" />
                        </div>
                        <div>
                          <h2 className="text-2xl font-black text-slate-900 tracking-tight font-serif">
                            {isRTL ? "سجل الطالب والمقابلات والتقييمات" : "Student Comprehensive History"}
                          </h2>
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                            {isRTL ? "متابعة الحالة والنتائج وتحديثات المقابلات" : "Live stage status, evaluation scores & scheduling history"}
                          </p>
                        </div>
                      </div>
                      <Badge className={cn("font-black text-xs px-4 py-1.5 rounded-full border shadow-sm uppercase tracking-wider", isPostponed ? "bg-amber-100 text-amber-900 border-amber-300" : "bg-blue-50 text-blue-700 border-blue-200")}>
                        {currentStatus}
                      </Badge>
                    </div>

                    {/* POSTPONED YELLOW FLAG ALERT BANNER */}
                    {isPostponed ? (
                      <div className="p-8 rounded-[2.5rem] bg-gradient-to-br from-amber-50 via-yellow-50/70 to-amber-100/40 border-2 border-amber-400 text-amber-950 shadow-md space-y-6 relative overflow-hidden">
                        <div className={cn("flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-amber-300/80", isRTL && "flex-row-reverse")}>
                          <div className={cn("flex items-center gap-3.5", isRTL && "flex-row-reverse")}>
                            <div className="h-14 w-14 rounded-2xl bg-amber-400 text-amber-950 flex items-center justify-center shadow-md border-2 border-amber-300 animate-pulse shrink-0">
                              <Flag className="h-7 w-7 fill-amber-950 text-amber-950" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <Badge className="bg-amber-500 text-white font-black text-[11px] px-3 py-1 rounded-full uppercase tracking-wider border-0 shadow-sm">
                                  {isRTL ? "فلاج أصفر: حالة مؤجلة" : "Yellow Flag: Postponed"}
                                </Badge>
                                <span className="text-xs font-black uppercase text-amber-800 tracking-widest">
                                  POSTPONED APPLICATION
                                </span>
                              </div>
                              <h3 className="text-xl font-black text-amber-950 tracking-tight mt-1">
                                {isRTL ? "حالة الطالب: مؤجل (Postponed)" : "Student Status: Postponed"}
                              </h3>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] font-black uppercase tracking-widest text-amber-700">
                              {isRTL ? "تاريخ التأجيل" : "POSTPONED AT"}
                            </p>
                            <p className="text-xs font-bold text-amber-950 mt-0.5">
                              {formatDateSafe(postponedAt)}
                            </p>
                          </div>
                        </div>

                        {/* Postpone Comment Box */}
                        <div className="p-6 bg-white/95 rounded-2xl border-2 border-amber-300 shadow-sm space-y-2">
                          <div className={cn("flex items-center gap-2 text-amber-800", isRTL && "flex-row-reverse")}>
                            <MessageSquare className="h-4 w-4 shrink-0 text-amber-600" />
                            <span className="text-xs font-black uppercase tracking-wider">
                              {isRTL ? "ملاحظة / سبب التأجيل (Postponement Reason & Comment):" : "Postponement Reason & Note:"}
                            </span>
                          </div>
                          <p className="text-base font-bold text-amber-950 italic leading-relaxed bg-amber-50/50 p-4 rounded-xl border border-amber-200">
                            "{postponeCommentText || (isRTL ? "تم تأجيل موعد الطالب بناءً على طلب ولي الأمر / الإدارة." : "Student appointment postponed per parent/administration request.")}"
                          </p>
                        </div>

                        <div className={cn("flex flex-wrap items-center justify-between gap-4 text-xs font-bold text-amber-900 pt-1", isRTL && "flex-row-reverse")}>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-amber-700" />
                            <span>{isRTL ? "تم التأجيل بواسطة:" : "Postponed by:"}</span>
                            <span className="font-black text-amber-950 bg-white/80 px-2.5 py-0.5 rounded-lg border border-amber-200">
                              {postponedBy}
                            </span>
                          </div>
                          {latestPostponeLog?.previousStatus && (
                            <div className="flex items-center gap-2">
                              <span>{isRTL ? "الحالة السابقة:" : "Prior Status:"}</span>
                              <Badge variant="outline" className="bg-white/80 border-amber-300 text-amber-900 font-bold">
                                {latestPostponeLog.previousStatus}
                              </Badge>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      /* Active Normal Status Header */
                      <div className="p-6 md:p-8 rounded-[2.5rem] bg-white border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-6">
                        <div className={cn("flex items-center gap-4", isRTL && "flex-row-reverse")}>
                          <div className="h-14 w-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shadow-sm shrink-0">
                            <UserCheck className="h-7 w-7" />
                          </div>
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                              {isRTL ? "الحالة النشطة الحالية" : "Current Active Status"}
                            </p>
                            <h3 className="text-2xl font-black text-slate-900 tracking-tight mt-0.5">
                              {currentStatus}
                            </h3>
                            <p className="text-xs text-slate-500 font-medium mt-1">
                              {currentData.campus || "NIS Campus"} • {currentData.school || "School"} • {currentData.grade || "Grade"}
                            </p>
                          </div>
                        </div>

                        <div className={cn("flex items-center gap-3", isRTL && "flex-row-reverse")}>
                          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center min-w-[140px]">
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                              {isRTL ? "رقم الطلب" : "App ID"}
                            </p>
                            <p className="text-sm font-black text-slate-800 mt-0.5">
                              {currentData.id || student?.id || "—"}
                            </p>
                          </div>
                          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center min-w-[140px]">
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                              {isRTL ? "آخر تحديث" : "Last Updated"}
                            </p>
                            <p className="text-xs font-bold text-slate-700 mt-0.5">
                              {formatDateSafe(currentData.updatedAt, "MMM dd, p")}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* SECTION 2: TRANSITION UPDATE: ASSESSMENT ➔ ORAL INTERVIEW */}
                  <div className="space-y-4">
                    <div className={cn("flex items-center gap-3", isRTL && "flex-row-reverse")}>
                      <div className="h-10 w-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100">
                        <CalendarClock className="h-5 w-5" />
                      </div>
                      <h3 className="text-xl font-black text-slate-900 tracking-tight">
                        {isRTL ? "تحديث الانتقال من التقييم إلى المقابلة الشفهية" : "Update: Interview & Assessment ➔ Oral Interview Transition"}
                      </h3>
                    </div>

                    {hasTransitionedToOral ? (
                      <div className="p-8 rounded-[2.5rem] bg-white border-2 border-purple-200 shadow-sm space-y-6 relative overflow-hidden group hover:border-purple-300 transition-all">
                        <div className={cn("flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100", isRTL && "flex-row-reverse")}>
                          <div className={cn("flex items-center gap-3", isRTL && "flex-row-reverse")}>
                            <Badge className="bg-purple-600 text-white font-black text-[10px] px-3 py-1 rounded-full uppercase tracking-widest shadow-sm">
                              {isRTL ? "تمت الترقية للمقابلة الشفهية" : "Promoted to Oral Stage"}
                            </Badge>
                            <span className="text-xs font-bold text-slate-600">
                              {isRTL ? "تم تحويل الطالب من مرحلة التقييم إلى مرحلة المقابلة الشفهية" : "Student transitioned from Assessment to Oral Interview Phase"}
                            </span>
                          </div>
                          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 font-black text-xs px-3 py-1">
                            Oral Interview Phase
                          </Badge>
                        </div>

                        {/* Visual Stage Progress Ribbon */}
                        <div className={cn("flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 text-xs font-bold", isRTL && "flex-row-reverse")}>
                          <div className="px-3 py-1.5 bg-white rounded-xl border border-slate-200 text-slate-500 line-through">
                            {isRTL ? "1. التقييم الأكاديمي والمقابلة" : "1. Interview & Assessment"}
                          </div>
                          <ArrowRight className={cn("h-4 w-4 text-purple-600 shrink-0", isRTL && "rotate-180")} />
                          <div className="px-3 py-1.5 bg-purple-600 text-white rounded-xl shadow-sm">
                            {isRTL ? "2. المقابلة الشفهية (مع المدير)" : "2. Oral Interview (Principal)"}
                          </div>
                        </div>

                        {/* Who did it & When */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                          <div className="p-5 rounded-2xl bg-purple-50/50 border border-purple-100 space-y-1">
                            <p className="text-[10px] font-black uppercase tracking-widest text-purple-600">
                              {isRTL ? "مين اللي عمل التحويل" : "PROMOTED / UPDATED BY"}
                            </p>
                            <p className="text-base font-black text-slate-900 flex items-center gap-2">
                              <User className="h-4 w-4 text-purple-600 shrink-0" />
                              <span className="truncate">{transitionChangedBy}</span>
                            </p>
                          </div>

                          <div className="p-5 rounded-2xl bg-purple-50/50 border border-purple-100 space-y-1">
                            <p className="text-[10px] font-black uppercase tracking-widest text-purple-600">
                              {isRTL ? "تاريخ ووقت التحويل" : "UPDATED AT (DATE & TIME)"}
                            </p>
                            <p className="text-base font-black text-slate-900 flex items-center gap-2">
                              <Clock className="h-4 w-4 text-purple-600 shrink-0" />
                              <span>{formatDateSafe(transitionChangedAt)}</span>
                            </p>
                          </div>

                          <div className="p-5 rounded-2xl bg-purple-50/50 border border-purple-100 space-y-1">
                            <p className="text-[10px] font-black uppercase tracking-widest text-purple-600">
                              {isRTL ? "موعد المقابلة الشفهية المحدد" : "SCHEDULED ORAL INTERVIEW"}
                            </p>
                            <p className="text-base font-black text-slate-900 flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-purple-600 shrink-0" />
                              <span>{transitionScheduledDate} • {transitionScheduledTime}</span>
                            </p>
                          </div>
                        </div>

                        {transitionComment && (
                          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-xs font-medium text-slate-600 italic">
                            <span className="font-bold not-italic text-slate-700 mr-2">{isRTL ? "ملاحظة التحويل:" : "Transition Note:"}</span>
                            "{transitionComment}"
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-8 rounded-[2.5rem] bg-slate-50/70 border border-dashed border-slate-200 text-center space-y-2">
                        <CalendarClock className="h-8 w-8 text-slate-300 mx-auto" />
                        <p className="font-bold text-slate-600 text-sm">
                          {isRTL ? "الطالب لم ينتقل بعد إلى مرحلة المقابلة الشفهية." : "Student has not transitioned to Oral Interview yet."}
                        </p>
                        <p className="text-xs text-slate-400 font-medium">
                          {isRTL ? `المرحلة الحالية: ${currentStatus}` : `Current Stage: ${currentStatus}`}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* SECTION 3: PARENT INTERVIEW SCORES & EVALUATIONS */}
                  <div className="space-y-6">
                    <div className={cn("flex items-center justify-between gap-4", isRTL && "flex-row-reverse")}>
                      <div className={cn("flex items-center gap-3", isRTL && "flex-row-reverse")}>
                        <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                          <Users className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="text-xl font-black text-slate-900 tracking-tight">
                            {isRTL ? "درجات ونتائج مقابلات ولي الأمر (Parent Interview Scores)" : "Parent Interview Scores & Evaluations"}
                          </h3>
                          <p className="text-xs text-slate-400 font-medium mt-0.5">
                            {isRTL ? "مقابلة القبول (Interview & Assessment) ومقابلة المدير الشفهية" : "Parent admission interview score and principal oral interview"}
                          </p>
                        </div>
                      </div>

                      {hasParentAdmissionScore && (
                        <Badge className={cn("font-black text-xs px-4 py-1 rounded-full border shadow-sm uppercase tracking-wider", parentAdmissionResult?.toLowerCase().includes("pass") ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-rose-50 text-rose-700 border-rose-200")}>
                          {parentAdmissionResult || "Evaluated"}
                        </Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* CARD 3A: PARENT ADMISSION INTERVIEW (FROM INTERVIEW & ASSESSMENT PAGE) */}
                      <div className="p-8 rounded-[2.5rem] bg-white border border-slate-200 shadow-sm space-y-6 hover:border-emerald-300 transition-all flex flex-col justify-between">
                        <div className="space-y-6">
                          <div className={cn("flex items-center justify-between pb-3 border-b border-slate-100", isRTL && "flex-row-reverse")}>
                            <div className={cn("flex items-center gap-2.5", isRTL && "flex-row-reverse")}>
                              <Users className="h-5 w-5 text-emerald-600" />
                              <div>
                                <h4 className="font-black text-base text-slate-900 tracking-tight">
                                  {isRTL ? "مقابلة ولي الأمر (مرحلة القبول)" : "Parent Admission Interview"}
                                </h4>
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                  Interview & Assessment Stage
                                </span>
                              </div>
                            </div>
                            <Badge className={cn("font-black text-[10px] px-3 py-1 rounded-full uppercase border", parentAdmissionResult?.toLowerCase().includes("pass") ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200")}>
                              {parentAdmissionResult || "Pending"}
                            </Badge>
                          </div>

                          {hasParentAdmissionScore ? (
                            <div className="space-y-6">
                              {/* Score Banner */}
                              <div className="p-6 rounded-2xl bg-emerald-50/50 border border-emerald-100 space-y-4">
                                <div className="flex items-baseline justify-between">
                                  <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">
                                      {isRTL ? "درجة مقابلة الأب / ولي الأمر" : "PARENT INTERVIEW SCORE"}
                                    </p>
                                    <div className="flex items-baseline gap-2 mt-0.5">
                                      <span className="text-4xl font-black text-slate-900">{parentAdmissionScoreFormatted}</span>
                                      <span className="text-xs font-bold text-slate-400">/ 4.00</span>
                                    </div>
                                    <span className="text-[10px] font-bold text-slate-500 mt-1 block">
                                      {parseFloat(parentAdmissionScoreFormatted || "0") >= 2.5 
                                        ? (isRTL ? "✓ أعلى من معيار القبول (≥ 2.50)" : "✓ Meets Benchmark (≥ 2.50)")
                                        : (isRTL ? "✕ دون معيار القبول (< 2.50)" : "✕ Below Benchmark (< 2.50)")}
                                    </span>
                                  </div>
                                  <div className="text-right">
                                    <Badge className={cn("font-black text-xs px-3 py-1 rounded-lg border", parentAdmissionResult?.toLowerCase().includes("pass") ? "bg-emerald-600 text-white border-emerald-600" : "bg-rose-600 text-white border-rose-600")}>
                                      {parentAdmissionResult || "Passed"}
                                    </Badge>
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-emerald-100/70 text-xs font-bold text-slate-700">
                                  <div>
                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block">
                                      {isRTL ? "مين اللي حط الاسكور دا" : "SCORED & EVALUATED BY"}
                                    </span>
                                    <span className="truncate block font-black text-slate-900 mt-0.5">{parentAdmissionEvaluator}</span>
                                  </div>
                                  <div className="text-right">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block">
                                      {isRTL ? "تاريخ المقابلة" : "INTERVIEW DATE"}
                                    </span>
                                    <span className="block font-black text-slate-900 mt-0.5">{formatDateSafe(parentAdmissionDate, "MMM dd, yyyy")}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Admissions Question Rubric if available */}
                              {Object.keys(parentAdmissionScoresMap).length > 0 && (
                                <div className="space-y-3">
                                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    {isRTL ? "بنود تقييم مقابلة القبول" : "ADMISSIONS INTERVIEW RUBRIC"}
                                  </p>
                                  <div className="space-y-2">
                                    {Object.entries(parentAdmissionScoresMap).slice(0, 5).map(([qId, sVal]: [string, any], idx: number) => {
                                      const qObj = interviewQuestionsMap[qId];
                                      const qLabel = isRTL 
                                        ? (qObj?.questionTextAr || qObj?.questionText || qObj?.text || qObj?.title || qId) 
                                        : (qObj?.questionText || qObj?.text || qObj?.title || qObj?.questionTextAr || qId);
                                      const comment = parentAdmissionCommentsMap[qId];
                                      return (
                                        <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5 text-xs">
                                          <div className={cn("flex items-center justify-between gap-2", isRTL && "flex-row-reverse")}>
                                            <span className="font-bold text-slate-800 line-clamp-1">{qLabel}</span>
                                            <Badge variant="outline" className="font-black text-emerald-700 bg-white border-emerald-200 shrink-0">
                                              {sVal} / 4
                                            </Badge>
                                          </div>
                                          {comment && (
                                            <p className="text-[11px] text-slate-500 italic bg-white/80 p-1.5 rounded-lg border border-slate-100">"{comment}"</p>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="py-12 text-center text-slate-400 space-y-2">
                              <Users className="h-8 w-8 text-slate-200 mx-auto" />
                              <p className="text-xs font-bold">{isRTL ? "لم يتم رصد درجة مقابلة ولي الأمر للقبول بعد." : "Parent admission interview not scored yet."}</p>
                              {currentData.interviewDate && (
                                <p className="text-[11px] text-slate-500 font-medium">
                                  {isRTL ? `الموعد المحدد: ${currentData.interviewDate} ${currentData.interviewTime || ""}` : `Scheduled on: ${currentData.interviewDate} ${currentData.interviewTime || ""}`}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* CARD 3B: PARENT ORAL INTERVIEW WITH PRINCIPAL */}
                      <div className="p-8 rounded-[2.5rem] bg-white border border-slate-200 shadow-sm space-y-6 hover:border-purple-300 transition-all flex flex-col justify-between">
                        <div className="space-y-6">
                          <div className={cn("flex items-center justify-between pb-3 border-b border-slate-100", isRTL && "flex-row-reverse")}>
                            <div className={cn("flex items-center gap-2.5", isRTL && "flex-row-reverse")}>
                              <GraduationCap className="h-5 w-5 text-purple-600" />
                              <div>
                                <h4 className="font-black text-base text-slate-900 tracking-tight">
                                  {isRTL ? "مقابلة ولي الأمر (مع المدير)" : "Parent Oral Interview (Principal)"}
                                </h4>
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                  Oral Stage
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {isParentOralReExam && (
                                <Badge className="bg-amber-100 text-amber-900 border-amber-300 font-black text-[10px] px-2.5 py-0.5 rounded-full uppercase flex items-center gap-1">
                                  <RotateCcw className="h-3 w-3" />
                                  {isRTL ? "إعادة اختبار (Re-Exam)" : "Re-Exam"}
                                </Badge>
                              )}
                              <Badge className={cn("font-black text-[10px] px-3 py-1 rounded-full uppercase border", 
                                parentOralResult?.toLowerCase().includes("pass") ? "bg-emerald-50 text-emerald-700 border-emerald-200" : 
                                parentOralResult?.toLowerCase().includes("sched") ? "bg-amber-50 text-amber-700 border-amber-200" :
                                "bg-purple-50 text-purple-700 border-purple-200"
                              )}>
                                {parentOralResult || (hasParentOralScore ? "Evaluated" : "Oral Interview")}
                              </Badge>
                            </div>
                          </div>

                          {isParentOralReExam ? (
                            <div className="space-y-4">
                              {/* Re-Exam Alert Banner */}
                              <div className={cn("p-4 rounded-2xl bg-amber-50/80 border border-amber-200 flex items-center justify-between gap-3 text-xs", isRTL && "flex-row-reverse")}>
                                <div className="flex items-center gap-2 text-amber-900 font-bold">
                                  <RotateCcw className="h-4 w-4 text-amber-600 shrink-0" />
                                  <span>{isRTL ? "تم تفعيل إعادة الاختبار لمقابلة ولي الأمر (Re-Exam Active)" : "Re-Exam Scheduled for Parent Oral Interview"}</span>
                                </div>
                                {currentData.oralInterviewDate && (
                                  <Badge variant="outline" className="bg-white text-amber-900 border-amber-300 font-bold text-[10px]">
                                    {currentData.oralInterviewDate} {currentData.oralInterviewTime || ""}
                                  </Badge>
                                )}
                              </div>

                              {/* Old Score vs New Score Comparison Grid */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {/* Old Score Box */}
                                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                                  <div className={cn("flex items-center justify-between", isRTL && "flex-row-reverse")}>
                                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                                      {isRTL ? "الدرجة السابقة (Old Score)" : "Old Score (1st Attempt)"}
                                    </span>
                                    <Badge className={cn("text-[10px] font-black uppercase px-2 py-0.5 rounded", oldParentOralResult?.toLowerCase().includes("pass") ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800")}>
                                      {oldParentOralResult || "Failed"}
                                    </Badge>
                                  </div>
                                  <div className="flex items-baseline gap-1.5">
                                    <span className="text-3xl font-black text-slate-700">{oldParentOralScoreFormatted || "—"}</span>
                                    <span className="text-xs font-bold text-slate-400">/ 4.00</span>
                                  </div>
                                  <div className="pt-2 border-t border-slate-200/80 text-[10px] text-slate-500 space-y-0.5">
                                    <div className="truncate"><span className="font-bold">{isRTL ? "المقيّم:" : "Evaluator:"}</span> {oldParentOralEvaluator || "—"}</div>
                                    <div><span className="font-bold">{isRTL ? "التاريخ:" : "Date:"}</span> {formatDateSafe(oldParentOralDate, "MMM dd, yyyy")}</div>
                                  </div>
                                </div>

                                {/* New Score Box */}
                                <div className={cn("p-5 rounded-2xl border space-y-3", isNewParentOralScored ? "bg-emerald-50/70 border-emerald-200" : "bg-blue-50/50 border-blue-200")}>
                                  <div className={cn("flex items-center justify-between", isRTL && "flex-row-reverse")}>
                                    <span className={cn("text-[10px] font-black uppercase tracking-wider", isNewParentOralScored ? "text-emerald-700" : "text-blue-700")}>
                                      {isRTL ? "الدرجة الجديدة (New Score)" : "New Score (Re-Exam)"}
                                    </span>
                                    <Badge className={cn("text-[10px] font-black uppercase px-2 py-0.5 rounded", 
                                      isNewParentOralScored ? (newParentOralResult?.toLowerCase().includes("pass") ? "bg-emerald-600 text-white" : "bg-rose-600 text-white") : "bg-blue-100 text-blue-800"
                                    )}>
                                      {isNewParentOralScored ? (newParentOralResult || "Passed") : (isRTL ? "قيد الانتظار" : "Pending")}
                                    </Badge>
                                  </div>

                                  {isNewParentOralScored ? (
                                    <>
                                      <div className="flex items-baseline gap-1.5">
                                        <span className="text-3xl font-black text-slate-900">{newParentOralScoreFormatted}</span>
                                        <span className="text-xs font-bold text-slate-400">/ 4.00</span>
                                      </div>
                                      <div className="pt-2 border-t border-emerald-200/80 text-[10px] text-emerald-900 space-y-0.5">
                                        <div className="truncate"><span className="font-bold">{isRTL ? "المقيّم:" : "Evaluator:"}</span> {newParentOralEvaluator || "—"}</div>
                                        <div><span className="font-bold">{isRTL ? "التاريخ:" : "Date:"}</span> {formatDateSafe(newParentOralDate, "MMM dd, yyyy")}</div>
                                      </div>
                                    </>
                                  ) : (
                                    <div className="py-2 space-y-1">
                                      <p className="text-xs font-bold text-blue-900">{isRTL ? "لم تُرصد الدرجة الجديدة بعد" : "Awaiting New Assessment"}</p>
                                      <p className="text-[11px] text-slate-500 font-medium">
                                        {currentData.oralInterviewDate 
                                          ? (isRTL ? `الموعد: ${currentData.oralInterviewDate} ${currentData.oralInterviewTime || ""}` : `Date: ${currentData.oralInterviewDate} ${currentData.oralInterviewTime || ""}`)
                                          : (isRTL ? "في انتظار موعد المقابلة" : "Scheduled re-exam pending")}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ) : hasParentOralScore ? (
                            <div className="space-y-6">
                              {/* Standard Score Banner */}
                              <div className="p-6 rounded-2xl bg-purple-50/50 border border-purple-100 space-y-4">
                                <div className="flex items-baseline justify-between">
                                  <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-purple-700">
                                      {isRTL ? "درجة مقابلة ولي الأمر مع المدير" : "PRINCIPAL ORAL SCORE"}
                                    </p>
                                    <div className="flex items-baseline gap-2 mt-0.5">
                                      <span className="text-4xl font-black text-slate-900">{parentOralScoreFormatted}</span>
                                      <span className="text-xs font-bold text-slate-400">/ 4.00</span>
                                    </div>
                                    <span className="text-[10px] font-bold text-slate-500 mt-1 block">
                                      {parseFloat(parentOralScoreFormatted || "0") >= 2.5 
                                        ? (isRTL ? "✓ أعلى من حد الاجتياز (≥ 2.50)" : "✓ Meets Benchmark (≥ 2.50)")
                                        : (isRTL ? "✕ دون حد الاجتياز (< 2.50)" : "✕ Below Benchmark (< 2.50)")}
                                    </span>
                                  </div>
                                  <div className="text-right">
                                    <Badge className={cn("font-black text-xs px-3 py-1 rounded-lg border", parentOralResult?.toLowerCase().includes("pass") ? "bg-emerald-600 text-white border-emerald-600" : "bg-rose-600 text-white border-rose-600")}>
                                      {parentOralResult || "Passed"}
                                    </Badge>
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-purple-100/70 text-xs font-bold text-slate-700">
                                  <div>
                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block">
                                      {isRTL ? "مين عمل المقابلة" : "EVALUATED BY"}
                                    </span>
                                    <span className="truncate block font-black text-slate-900 mt-0.5">{parentOralEvaluator}</span>
                                  </div>
                                  <div className="text-right">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block">
                                      {isRTL ? "تاريخ المقابلة" : "INTERVIEW DATE"}
                                    </span>
                                    <span className="block font-black text-slate-900 mt-0.5">{formatDateSafe(parentOralDate, "MMM dd, yyyy")}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="py-12 text-center text-slate-400 space-y-2">
                              <GraduationCap className="h-8 w-8 text-slate-200 mx-auto" />
                              <p className="text-xs font-bold">{isRTL ? "لم تسجل مقابلة ولي الأمر مع المدير بعد." : "Principal oral interview not recorded yet."}</p>
                              <p className="text-[11px] text-slate-500 font-medium">
                                {currentData.oralInterviewDate 
                                  ? (isRTL ? `الموعد المحدد: ${currentData.oralInterviewDate} ${currentData.oralInterviewTime || ""}` : `Scheduled: ${currentData.oralInterviewDate} ${currentData.oralInterviewTime || ""}`)
                                  : (isRTL ? "في انتظار تحديد الموعد بعد اجتياز مرحلة القبول" : "Pending scheduling after admission stage")}
                              </p>
                            </div>
                          )}
                        </div>

                        {parentOralHistory.length > 1 && (
                          <div className="pt-4 border-t border-slate-100 text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center justify-between">
                            <span>{parentOralHistory.length} {isRTL ? "محاولات مقابلة مسجلة" : "Recorded interview attempts"}</span>
                            {isParentOralReExam && (
                              <span className="text-amber-600 font-black">{isRTL ? "يتضمن إعادة اختبار" : "Includes Re-Exam"}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* SECTION 4: STUDENT RESULTS & EVALUATIONS */}
                  <div className="space-y-6">
                    <div className={cn("flex items-center gap-3", isRTL && "flex-row-reverse")}>
                      <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                        <Trophy className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="text-xl font-black text-slate-900 tracking-tight">
                          {isRTL ? "نتائج وتقييمات الطالب الأكاديمية والشفهية" : "Student Results: Academic Assessment & Oral Interview"}
                        </h3>
                        <p className="text-xs text-slate-400 font-medium mt-0.5">
                          {isRTL ? "سكور الطالب بالمواد والتقييم الأكاديمي، ومقابلة المدير الشفهية" : "Student subject-by-subject academic scores and principal oral interview"}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* CARD 4A: STUDENT ACADEMIC ASSESSMENT (BY SUBJECTS) */}
                      <div className="p-8 rounded-[2.5rem] bg-white border border-slate-200 shadow-sm space-y-6 hover:border-blue-300 transition-all flex flex-col justify-between">
                        <div className="space-y-6">
                          <div className={cn("flex items-center justify-between pb-3 border-b border-slate-100", isRTL && "flex-row-reverse")}>
                            <div className={cn("flex items-center gap-2.5", isRTL && "flex-row-reverse")}>
                              <BookOpen className="h-5 w-5 text-blue-600" />
                              <div>
                                <h4 className="font-black text-base text-slate-900 tracking-tight">
                                  {isRTL ? "تقييم الطالب الأكاديمي (سكور المواد)" : "Student Academic Assessment"}
                                </h4>
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                  {isRTL ? "درجات المواد المقررة" : "Subject Breakdown"}
                                </span>
                              </div>
                            </div>
                            <Badge className={cn("font-black text-[10px] px-3 py-1 rounded-full uppercase border", academicResult?.toLowerCase().includes("pass") ? "bg-emerald-50 text-emerald-700 border-emerald-200" : hasScoredSubjects ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-slate-50 text-slate-600 border-slate-200")}>
                              {academicResult || (hasScoredSubjects ? "Completed" : (isRTL ? "قيد الرصد" : "Pending"))}
                            </Badge>
                          </div>

                          {/* Academic Meta Info */}
                          <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-100 grid grid-cols-2 gap-4 text-xs font-bold text-slate-700">
                            <div>
                              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block">
                                {isRTL ? "مين عمل التقييم الأكاديمي" : "EVALUATED BY"}
                              </span>
                              <span className="truncate block font-black text-slate-900 mt-0.5">{academicEvaluator}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block">
                                {isRTL ? "تاريخ تقييم المواد" : "ASSESSMENT DATE"}
                              </span>
                              <span className="block font-black text-slate-900 mt-0.5">{formatDateSafe(academicDate, "MMM dd, yyyy")}</span>
                            </div>
                          </div>

                          {/* Subjects list */}
                          {subjectItems.length > 0 ? (
                            <div className="space-y-3">
                              <div className={cn("flex items-center justify-between", isRTL && "flex-row-reverse")}>
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                  {isRTL ? "سكور الطالب بالمواد" : "SUBJECT-BY-SUBJECT SCORES"}
                                </p>
                                <span className="text-[10px] font-bold text-blue-600">
                                  {subjectItems.filter(s => s.isScored).length} / {subjectItems.length} {isRTL ? "مواد مرصودة" : "Scored"}
                                </span>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {subjectItems.map((s, idx) => (
                                  <div key={idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between text-xs hover:bg-blue-50/30 transition-all">
                                    <div className="space-y-0.5">
                                      <span className="font-black text-slate-800 capitalize block">{s.name}</span>
                                      <span className="text-[10px] text-slate-400 font-medium">
                                        {s.isScored ? (isRTL ? "تم رصد الدرجة" : "Graded") : (isRTL ? "قيد انتظار الرصد" : "Pending Grade")}
                                      </span>
                                    </div>
                                    <div className="text-right">
                                      {s.isScored ? (
                                        <Badge className="font-black text-xs px-2.5 py-1 rounded-xl bg-blue-600 text-white border-blue-600">
                                          {s.score} {s.maxScore && s.maxScore !== "—" ? `/ ${s.maxScore}` : ""}
                                        </Badge>
                                      ) : (
                                        <Badge variant="outline" className="font-bold text-xs text-slate-400 bg-white border-slate-200">
                                          — {s.maxScore && s.maxScore !== "—" ? `/ ${s.maxScore}` : ""}
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <div className="py-8 text-center text-slate-400 space-y-2">
                              <BookOpen className="h-8 w-8 text-slate-200 mx-auto" />
                              <p className="text-xs font-bold">{isRTL ? "لم تسجل نتائج المواد الأكاديمية للطالب بعد." : "Academic subject scores not recorded yet."}</p>
                            </div>
                          )}
                        </div>

                        {assessmentHistory.length > 1 && (
                          <div className="pt-4 border-t border-slate-100 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                            {assessmentHistory.length} {isRTL ? "محاولات تقييم سابقة مسجلة" : "Historical assessment records"}
                          </div>
                        )}
                      </div>

                      {/* CARD 4B: STUDENT ORAL INTERVIEW */}
                      <div className="p-8 rounded-[2.5rem] bg-white border border-slate-200 shadow-sm space-y-6 hover:border-purple-300 transition-all flex flex-col justify-between">
                        <div className="space-y-6">
                          <div className={cn("flex items-center justify-between pb-3 border-b border-slate-100", isRTL && "flex-row-reverse")}>
                            <div className={cn("flex items-center gap-2.5", isRTL && "flex-row-reverse")}>
                              <GraduationCap className="h-5 w-5 text-purple-600" />
                              <h4 className="font-black text-base text-slate-900 tracking-tight">
                                {isRTL ? "مقابلة الطالب الشفهية (مع المدير)" : "Student Oral Interview (Principal)"}
                              </h4>
                            </div>
                            <div className="flex items-center gap-2">
                              {isStudentOralReExam && (
                                <Badge className="bg-amber-100 text-amber-900 border-amber-300 font-black text-[10px] px-2.5 py-0.5 rounded-full uppercase flex items-center gap-1">
                                  <RotateCcw className="h-3 w-3" />
                                  {isRTL ? "إعادة اختبار (Re-Exam)" : "Re-Exam"}
                                </Badge>
                              )}
                              <Badge className={cn("font-black text-[10px] px-3 py-1 rounded-full uppercase border", 
                                studentOralResult?.toLowerCase().includes("pass") ? "bg-emerald-50 text-emerald-700 border-emerald-200" : 
                                studentOralResult?.toLowerCase().includes("sched") ? "bg-amber-50 text-amber-700 border-amber-200" :
                                "bg-purple-50 text-purple-700 border-purple-200"
                              )}>
                                {studentOralResult || (hasStudentOralScore ? "Evaluated" : "Oral Interview")}
                              </Badge>
                            </div>
                          </div>

                          {isStudentOralReExam ? (
                            <div className="space-y-4">
                              {/* Re-Exam Alert Banner */}
                              <div className={cn("p-4 rounded-2xl bg-amber-50/80 border border-amber-200 flex items-center justify-between gap-3 text-xs", isRTL && "flex-row-reverse")}>
                                <div className="flex items-center gap-2 text-amber-900 font-bold">
                                  <RotateCcw className="h-4 w-4 text-amber-600 shrink-0" />
                                  <span>{isRTL ? "تم تفعيل إعادة الاختبار لمقابلة الطالب (Re-Exam Active)" : "Re-Exam Scheduled for Student Oral Interview"}</span>
                                </div>
                                {currentData.oralInterviewDate && (
                                  <Badge variant="outline" className="bg-white text-amber-900 border-amber-300 font-bold text-[10px]">
                                    {currentData.oralInterviewDate} {currentData.oralInterviewTime || ""}
                                  </Badge>
                                )}
                              </div>

                              {/* Old Score vs New Score Comparison Grid */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {/* Old Score Box */}
                                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                                  <div className={cn("flex items-center justify-between", isRTL && "flex-row-reverse")}>
                                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                                      {isRTL ? "الدرجة السابقة (Old Score)" : "Old Score (1st Attempt)"}
                                    </span>
                                    <Badge className={cn("text-[10px] font-black uppercase px-2 py-0.5 rounded", oldOralResult?.toLowerCase().includes("pass") ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800")}>
                                      {oldOralResult || "Failed"}
                                    </Badge>
                                  </div>
                                  <div className="flex items-baseline gap-1.5">
                                    <span className="text-3xl font-black text-slate-700">{oldOralScoreFormatted || "—"}</span>
                                    <span className="text-xs font-bold text-slate-400">/ 4.00</span>
                                  </div>
                                  <div className="pt-2 border-t border-slate-200/80 text-[10px] text-slate-500 space-y-0.5">
                                    <div className="truncate"><span className="font-bold">{isRTL ? "المقيّم:" : "Evaluator:"}</span> {oldOralEvaluator || "—"}</div>
                                    <div><span className="font-bold">{isRTL ? "التاريخ:" : "Date:"}</span> {formatDateSafe(oldOralDate, "MMM dd, yyyy")}</div>
                                  </div>
                                </div>

                                {/* New Score Box */}
                                <div className={cn("p-5 rounded-2xl border space-y-3", isNewOralScored ? "bg-emerald-50/70 border-emerald-200" : "bg-blue-50/50 border-blue-200")}>
                                  <div className={cn("flex items-center justify-between", isRTL && "flex-row-reverse")}>
                                    <span className={cn("text-[10px] font-black uppercase tracking-wider", isNewOralScored ? "text-emerald-700" : "text-blue-700")}>
                                      {isRTL ? "الدرجة الجديدة (New Score)" : "New Score (Re-Exam)"}
                                    </span>
                                    <Badge className={cn("text-[10px] font-black uppercase px-2 py-0.5 rounded", 
                                      isNewOralScored ? (newOralResult?.toLowerCase().includes("pass") ? "bg-emerald-600 text-white" : "bg-rose-600 text-white") : "bg-blue-100 text-blue-800"
                                    )}>
                                      {isNewOralScored ? (newOralResult || "Passed") : (isRTL ? "قيد الانتظار" : "Pending")}
                                    </Badge>
                                  </div>

                                  {isNewOralScored ? (
                                    <>
                                      <div className="flex items-baseline gap-1.5">
                                        <span className="text-3xl font-black text-slate-900">{newOralScoreFormatted}</span>
                                        <span className="text-xs font-bold text-slate-400">/ 4.00</span>
                                      </div>
                                      <div className="pt-2 border-t border-emerald-200/80 text-[10px] text-emerald-900 space-y-0.5">
                                        <div className="truncate"><span className="font-bold">{isRTL ? "المقيّم:" : "Evaluator:"}</span> {newOralEvaluator || "—"}</div>
                                        <div><span className="font-bold">{isRTL ? "التاريخ:" : "Date:"}</span> {formatDateSafe(newOralDate, "MMM dd, yyyy")}</div>
                                      </div>
                                    </>
                                  ) : (
                                    <div className="py-2 space-y-1">
                                      <p className="text-xs font-bold text-blue-900">{isRTL ? "لم تُرصد الدرجة الجديدة بعد" : "Awaiting Principal Evaluation"}</p>
                                      <p className="text-[11px] text-slate-500 font-medium">
                                        {currentData.oralInterviewDate 
                                          ? (isRTL ? `الموعد المحدد: ${currentData.oralInterviewDate} ${currentData.oralInterviewTime || ""}` : `Date: ${currentData.oralInterviewDate} ${currentData.oralInterviewTime || ""}`)
                                          : (isRTL ? "في انتظار موعد المقابلة" : "Scheduled re-exam pending")}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ) : hasStudentOralScore ? (
                            <div className="space-y-6">
                              {/* Student Oral Score Banner */}
                              <div className="p-6 rounded-2xl bg-purple-50/60 border border-purple-100 space-y-4">
                                <div className="flex items-baseline justify-between">
                                  <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-purple-700">
                                      {isRTL ? "درجة مقابلة الطالب الشفهية" : "STUDENT ORAL SCORE"}
                                    </p>
                                    <div className="flex items-baseline gap-2 mt-0.5">
                                      <span className="text-3xl font-black text-slate-900">{studentOralScoreFormatted}</span>
                                      <span className="text-xs font-bold text-slate-400">/ 4.00</span>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <Badge className={cn("font-black text-xs px-3 py-1 rounded-lg border", studentOralResult?.toLowerCase().includes("pass") ? "bg-emerald-600 text-white border-emerald-600" : "bg-rose-600 text-white border-rose-600")}>
                                      {studentOralResult || "Passed"}
                                    </Badge>
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-purple-100/70 text-xs font-bold text-slate-700">
                                  <div>
                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block">
                                      {isRTL ? "مين عمل المقابلة" : "EVALUATED BY"}
                                    </span>
                                    <span className="truncate block font-black text-slate-900 mt-0.5">{studentOralEvaluator}</span>
                                  </div>
                                  <div className="text-right">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block">
                                      {isRTL ? "تاريخ المقابلة" : "ORAL INTERVIEW DATE"}
                                    </span>
                                    <span className="block font-black text-slate-900 mt-0.5">{formatDateSafe(studentOralDate, "MMM dd, yyyy")}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="py-12 text-center text-slate-400 space-y-2">
                              <GraduationCap className="h-8 w-8 text-slate-200 mx-auto" />
                              <p className="text-xs font-bold">{isRTL ? "لم تسجل درجات مقابلة الطالب الشفهية بعد." : "Student oral interview score not recorded yet."}</p>
                            </div>
                          )}
                        </div>

                        {studentOralHistory.length > 0 && (
                          <div className="pt-4 border-t border-slate-100 text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center justify-between">
                            <span>{studentOralHistory.length} {isRTL ? "محاولات مقابلة شفهية مسجلة" : "Historical oral records"}</span>
                            {isStudentOralReExam && (
                              <span className="text-amber-600 font-black">{isRTL ? "يتضمن إعادة اختبار" : "Includes Re-Exam"}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* SECTION 5: RESCHEDULE & RE-EXAM TRACKER */}
                  <div className="space-y-6">
                    <div className={cn("flex flex-wrap items-center justify-between gap-4", isRTL && "flex-row-reverse")}>
                      <div className={cn("flex items-center gap-3", isRTL && "flex-row-reverse")}>
                        <div className="h-10 w-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center border border-orange-100">
                          <RotateCcw className="h-5 w-5" />
                        </div>
                        <div>
                          <h3 className="text-xl font-black text-slate-900 tracking-tight">
                            {isRTL ? "سجل إعادة الجدولة وإعادة الاختبار (Reschedule & Re-Exam History)" : "Reschedule & Re-Exam Tracker"}
                          </h3>
                          <p className="text-xs text-slate-400 font-medium mt-0.5">
                            {isRTL ? "تتبع عمليات إعادة الاختبار والجدولة السابقة ومين اللي عملها ومواعيدها" : "Full audit log of appointment reschedules, re-exam triggers, timestamps, and staff"}
                          </p>
                        </div>
                      </div>

                      {/* Counters Badges */}
                      <div className="flex items-center gap-2">
                        {reExamCount > 0 && (
                          <Badge className="bg-purple-100 text-purple-900 border-purple-300 font-black text-xs px-3.5 py-1.5 rounded-full border shadow-sm uppercase tracking-wider flex items-center gap-1.5">
                            <RotateCcw className="h-3.5 w-3.5" />
                            {isRTL ? `إعادة اختبار: ${reExamCount}` : `Re-Exams: ${reExamCount}`}
                          </Badge>
                        )}
                        <Badge className={cn(
                          "font-black text-xs px-4 py-1.5 rounded-full border shadow-sm uppercase tracking-wider",
                          rescheduleCount === 0 ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                          rescheduleCount === 1 ? "bg-blue-50 text-blue-700 border-blue-200" :
                          rescheduleCount === 2 ? "bg-amber-100 text-amber-900 border-amber-300" :
                          "bg-rose-100 text-rose-800 border-rose-300"
                        )}>
                          {isRTL 
                            ? `إعادة الجدولة: ${rescheduleCount} ${rescheduleCount === 1 ? "مرة" : "مرات"}` 
                            : `Rescheduled: ${rescheduleCount} time${rescheduleCount === 1 ? "" : "s"}`}
                        </Badge>
                      </div>
                    </div>

                    {(rescheduleCount > 0 || reExamCount > 0) ? (
                      <div className="p-8 rounded-[2.5rem] bg-white border border-slate-200 shadow-sm space-y-6">
                        {/* Summary Bar */}
                        <div className={cn("flex flex-wrap items-center justify-between gap-4 p-5 rounded-2xl bg-orange-50/50 border border-orange-100", isRTL && "flex-row-reverse")}>
                          <div className="flex items-center gap-3">
                            <Clock className="h-5 w-5 text-orange-600" />
                            <span className="text-xs font-bold text-slate-700">
                              {isRTL 
                                ? `تم تسجيل ${rescheduleCount} عملية إعادة جدولة و ${reExamCount} عملية إعادة اختبار لهذا الطالب.`
                                : `Audit log has ${rescheduleCount} reschedule(s) and ${reExamCount} re-exam event(s) for this applicant.`}
                            </span>
                          </div>
                          {rescheduleCount >= 2 && (
                            <Badge variant="outline" className="text-[10px] font-black uppercase text-rose-700 border-rose-300 bg-white">
                              {isRTL ? "وصل للحد الأقصى لإعادة الجدولة" : "Max Reschedules Reached"}
                            </Badge>
                          )}
                        </div>

                        {/* Combined Entries: Re-Exams and Reschedules */}
                        <div className="space-y-4">
                          {/* Re-Exam Events */}
                          {reExamList.slice().reverse().map((item: any, idx: number) => (
                            <div key={`reexam-${idx}`} className="p-6 rounded-2xl bg-purple-50/40 hover:bg-purple-50/70 border border-purple-200 transition-all space-y-4">
                              <div className={cn("flex flex-wrap items-center justify-between gap-3", isRTL && "flex-row-reverse")}>
                                <div className="flex items-center gap-3">
                                  <Badge className="bg-purple-700 text-white font-black text-[10px] px-3 py-1 rounded-full uppercase tracking-widest flex items-center gap-1">
                                    <RotateCcw className="h-3 w-3" />
                                    {isRTL ? "إعادة اختبار (Re-Exam)" : "Re-Exam Scheduled"}
                                  </Badge>
                                  <Badge className="text-[10px] font-black uppercase px-2.5 py-1 rounded-md border bg-white text-purple-800 border-purple-200">
                                    {item.type || "Oral Interview Re-Exam"}
                                  </Badge>
                                </div>
                                <span className="text-xs font-bold text-slate-400">
                                  {formatDateSafe(item.changedAt || item.date || item.createdAt)}
                                </span>
                              </div>

                              {/* Details: Old Score & New Schedule */}
                              <div className={cn("flex flex-wrap items-center gap-4 p-4 bg-white rounded-xl border border-purple-100", isRTL && "flex-row-reverse")}>
                                {item.previousScore !== undefined && item.previousScore !== null && (
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{isRTL ? "الدرجة السابقة:" : "Old Score:"}</span>
                                    <Badge variant="outline" className="bg-rose-50 text-rose-700 font-black text-xs border-rose-200">
                                      {item.previousScore} / 4.00
                                    </Badge>
                                  </div>
                                )}

                                <ArrowRight className={cn("h-4 w-4 text-purple-500 shrink-0", isRTL && "rotate-180")} />

                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-black uppercase tracking-widest text-purple-700">{isRTL ? "موعد إعادة الاختبار:" : "New Appointment:"}</span>
                                  <Badge className="bg-purple-50 text-purple-800 border-purple-200 font-black text-xs border">
                                    {item.newDate} {item.newTime ? `• ${item.newTime}` : ""}
                                  </Badge>
                                </div>
                              </div>

                              <div className={cn("flex flex-wrap items-center justify-between gap-4 text-xs font-bold text-slate-600 pt-1", isRTL && "flex-row-reverse")}>
                                <div className="flex items-center gap-2">
                                  <User className="h-4 w-4 text-purple-400" />
                                  <span>{isRTL ? "تم تفعيل إعادة الاختبار بواسطة:" : "Triggered by:"}</span>
                                  <span className="font-black text-slate-900 bg-white px-2.5 py-0.5 rounded-lg border border-purple-200">
                                    {item.changedBy || item.scheduledBy || "Principal"}
                                  </span>
                                </div>
                                {(item.reason || item.notes) && (
                                  <div className="flex items-center gap-2 italic text-slate-500">
                                    <span>{isRTL ? "ملاحظات:" : "Notes:"}</span>
                                    <span>"{item.reason || item.notes}"</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}

                          {/* Reschedule Entries */}
                          {rescheduleList.slice().reverse().map((item: any, idx: number) => {
                            const attemptNum = rescheduleCount - idx;
                            return (
                              <div key={`resched-${idx}`} className="p-6 rounded-2xl bg-slate-50/70 hover:bg-orange-50/30 border border-slate-200 transition-all space-y-4">
                                <div className={cn("flex flex-wrap items-center justify-between gap-3", isRTL && "flex-row-reverse")}>
                                  <div className="flex items-center gap-3">
                                    <Badge className="bg-slate-900 text-white font-black text-[10px] px-3 py-1 rounded-full uppercase tracking-widest">
                                      {isRTL ? `إعادة جدولة #${attemptNum}` : `Reschedule #${attemptNum}`}
                                    </Badge>
                                    <Badge className={cn(
                                      "text-[10px] font-black uppercase px-2.5 py-1 rounded-md border",
                                      item.type === 'Oral Interview' ? "bg-purple-100 text-purple-800 border-purple-200" : "bg-blue-100 text-blue-800 border-blue-200"
                                    )}>
                                      {item.type || "Appointment"}
                                    </Badge>
                                  </div>

                                  <span className="text-xs font-bold text-slate-400">
                                    {formatDateSafe(item.changedAt)}
                                  </span>
                                </div>

                                {/* Shift Details: From Date/Time ➔ To Date/Time */}
                                <div className={cn("flex flex-wrap items-center gap-4 p-4 bg-white rounded-xl border border-slate-100", isRTL && "flex-row-reverse")}>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{isRTL ? "من:" : "From:"}</span>
                                    <Badge variant="outline" className="bg-slate-50 text-slate-500 font-bold text-xs border-slate-200">
                                      {item.previousDate || "None"} • {item.previousTime || "None"}
                                    </Badge>
                                  </div>

                                  <ArrowRight className={cn("h-4 w-4 text-orange-500 shrink-0", isRTL && "rotate-180")} />

                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">{isRTL ? "إلى:" : "To:"}</span>
                                    <Badge className="bg-emerald-50 text-emerald-800 border-emerald-200 font-black text-xs border">
                                      {item.newDate} • {item.newTime}
                                    </Badge>
                                  </div>
                                </div>

                                <div className={cn("flex flex-wrap items-center justify-between gap-4 text-xs font-bold text-slate-600 pt-1", isRTL && "flex-row-reverse")}>
                                  <div className="flex items-center gap-2">
                                    <User className="h-4 w-4 text-slate-400" />
                                    <span>{isRTL ? "تمت إعادة الجدولة بواسطة:" : "Rescheduled by:"}</span>
                                    <span className="font-black text-slate-900 bg-white px-2.5 py-0.5 rounded-lg border border-slate-200">
                                      {item.changedBy || "Staff Member"}
                                    </span>
                                  </div>

                                  {item.reason && (
                                    <div className="flex items-center gap-2 italic text-slate-500">
                                      <span>{isRTL ? "السبب:" : "Reason:"}</span>
                                      <span>"{item.reason}"</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="p-8 rounded-[2.5rem] bg-slate-50/70 border border-dashed border-slate-200 text-center space-y-2">
                        <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto" />
                        <p className="font-bold text-slate-700 text-sm">
                          {isRTL ? "لم يتم إجراء أي إعادة جدولة أو إعادة اختبار لمواعيد هذا الطالب." : "No reschedules or re-exams recorded for this student."}
                        </p>
                        <p className="text-xs text-slate-400">
                          {isRTL ? "حضر الطالب في موعده الأصلي دون تأجيل أو تغيير." : "Student maintained original scheduled appointments."}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

          </CardContent>
        </Card>
      </div>

      <div style={{ position: 'absolute', left: '-9999px', top: '-9999px', overflow: 'hidden' }}>
        <div ref={pdfRef} className="p-6 space-y-6 bg-white text-slate-900" style={{ width: '180mm', minHeight: '260mm', margin: '0 auto' }}>
          <div className="flex justify-between items-center border-b-4 border-blue-900 pb-4">
            <div>
               <h1 className="text-2xl font-black text-blue-900">STUDENT ADMISSION REPORT</h1>
               <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mt-1">Nermien Ismail Schools (NIS)</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black text-slate-800">Generated: {format(new Date(), "PPP p")}</p>
              <p className="text-[10px] text-slate-400 uppercase">Application ID: {student?.id}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-3">
              <h2 className="text-xs font-black border-b-2 border-blue-100 text-blue-900 pb-1 uppercase tracking-widest">Personal Information</h2>
              <div className="grid gap-2 text-[11px] leading-tight">
                <p><strong>Name:</strong> {currentData?.studentName || student?.studentName || '—'}</p>
                <p><strong>Arabic Name:</strong> {currentData?.arabicName || student?.arabicName || '—'}</p>
                <p><strong>DOB:</strong> {currentData?.dateOfBirth || student?.dateOfBirth || '—'}</p>
                <p><strong>Gender:</strong> {currentData?.gender || student?.gender || '—'}</p>
                <p><strong>Governorate / Government:</strong> {currentData?.governorate || currentData?.government || student?.governorate || student?.government || '—'}</p>
                <p><strong>Second Language:</strong> {currentData?.secondLanguage || student?.secondLanguage || '—'}</p>
                <p><strong>Student Type:</strong> {(currentData?.category || student?.category) === 'Internal Transfer' ? 'Internal Transfer' : 'New Commer'}</p>
                <p><strong>Current Status:</strong> {currentData?.status || student?.status || '—'}</p>
              </div>
            </div>
            <div className="space-y-3">
              <h2 className="text-xs font-black border-b-2 border-blue-100 text-blue-900 pb-1 uppercase tracking-widest">Enrollment Details</h2>
              <div className="grid gap-2 text-[11px] leading-tight">
                <p><strong>Applied Grade:</strong> {currentData?.grade || student?.grade || '—'}</p>
                <p><strong>Target School:</strong> {currentData?.school || student?.school || '—'}</p>
                <p><strong>Campus:</strong> {currentData?.campus || student?.campus || '—'}</p>
                <p><strong>Previous Campus:</strong> {currentData?.previousCampus || student?.previousCampus || '—'}</p>
                <p><strong>Previous School:</strong> {currentData?.previousSchool || student?.previousSchool || 'None'}</p>
                <p><strong>Second Language:</strong> {currentData?.secondLanguage || student?.secondLanguage || '—'}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-3">
              <h2 className="text-xs font-black border-b-2 border-blue-100 text-blue-900 pb-1 uppercase tracking-widest">Father's Information</h2>
              <div className="grid gap-2 text-[11px] leading-tight">
                <p><strong>Name:</strong> {currentData?.fatherName || student?.fatherName || '—'}</p>
                <p><strong>Phone:</strong> {currentData?.fatherPhone || student?.fatherPhone || '—'}</p>
                <p><strong>Email:</strong> {currentData?.fatherEmail || student?.fatherEmail || '—'}</p>
                <p><strong>Occupation:</strong> {currentData?.fatherOccupation || student?.fatherOccupation || '—'}</p>
              </div>
            </div>
            <div className="space-y-3">
              <h2 className="text-xs font-black border-b-2 border-blue-100 text-blue-900 pb-1 uppercase tracking-widest">Mother's Information</h2>
              <div className="grid gap-2 text-[11px] leading-tight">
                <p><strong>Name:</strong> {currentData?.motherName || student?.motherName || '—'}</p>
                <p><strong>Phone:</strong> {currentData?.motherPhone || student?.motherPhone || '—'}</p>
                <p><strong>Email:</strong> {currentData?.motherEmail || student?.motherEmail || '—'}</p>
                <p><strong>Occupation:</strong> {currentData?.motherOccupation || student?.motherOccupation || '—'}</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-xs font-black border-b-2 border-blue-100 text-blue-900 pb-1 uppercase tracking-widest">Appointments & Assessment Results</h2>
            <div className="grid grid-cols-2 gap-4 text-[10px]">
               <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="font-black text-blue-800 mb-2 border-b pb-1 uppercase tracking-tighter text-[11px]">Assessment Appointment</p>
                  <div className="space-y-1">
                    <p><strong>Date:</strong> {currentData?.interviewDate || student?.interviewDate || '—'}</p>
                    <p><strong>Time:</strong> {currentData?.interviewTime || student?.interviewTime || '—'}</p>
                    <p><strong>Parent Score:</strong> {parentAdmissionScoreFormatted ? `${parentAdmissionScoreFormatted}/4.0` : 'Not Scored'}</p>
                    <p><strong>Result:</strong> {currentData?.interviewResult || student?.interviewResult || 'Pending'}</p>
                  </div>
               </div>
               <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="font-black text-purple-800 mb-2 border-b pb-1 uppercase tracking-tighter text-[11px]">Oral Appointment (Principal)</p>
                  <div className="space-y-1">
                    <p><strong>Date:</strong> {currentData?.oralInterviewDate || student?.oralInterviewDate || '—'}</p>
                    <p><strong>Time:</strong> {currentData?.oralInterviewTime || student?.oralInterviewTime || '—'}</p>
                    <p><strong>Parent Score:</strong> {(currentData?.oralScoreObtained || student?.oralScoreObtained) ? `${parseFloat(currentData?.oralScoreObtained || student?.oralScoreObtained).toFixed(2)}/4.0` : '—'}</p>
                    <p><strong>Student Score:</strong> {(currentData?.studentInterviewScoreObtained || student?.studentInterviewScoreObtained) ? `${parseFloat(currentData?.studentInterviewScoreObtained || student?.studentInterviewScoreObtained).toFixed(2)}/4.0` : '—'}</p>
                  </div>
               </div>
            </div>
          </div>

          <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100">
            <h2 className="text-xs font-black text-blue-900 mb-2 uppercase tracking-widest">Payment & Administration</h2>
            <div className="grid grid-cols-3 gap-6 text-[11px]">
               <div><p className="text-[9px] text-slate-400 font-bold uppercase">Method</p><p className="font-bold">{currentData?.admissionFeeMethod || student?.admissionFeeMethod || 'Not set'}</p></div>
               <div><p className="text-[9px] text-slate-400 font-bold uppercase">Amount Paid</p><p className="font-bold">{currentData?.admissionFeeAmount || student?.admissionFeeAmount || '0.00'} EGP</p></div>
               <div><p className="text-[9px] text-slate-400 font-bold uppercase">Deferred</p><p className="font-bold">{(currentData?.isDeferredToOrientation || student?.isDeferredToOrientation) === "true" || (currentData?.isDeferredToOrientation || student?.isDeferredToOrientation) === true ? "YES" : "NO"}</p></div>
            </div>
          </div>

          <div className="pt-10 text-center">
             <p className="text-[9px] text-slate-300 italic">This is an automated system report from NIS Admissions Portal. Signature not required.</p>
          </div>
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
              onClick={handleSavePostponeHistory}
              disabled={isSavingPostpone || !postponeComment.trim()}
            >
              {isSavingPostpone ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Confirm
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddAttOpen} onOpenChange={setIsAddAttOpen}>
        <DialogContent className={cn("max-w-[400px] p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl", isRTL && "font-arabic")}>
          <div className="p-10 pb-4 bg-slate-50 border-b">
            <DialogHeader>
              <div className="h-14 w-14 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg mb-4">
                <UploadCloud className="h-7 w-7 text-white" />
              </div>
              <DialogTitle className="text-2xl font-black font-serif">{t('add_attachment')}</DialogTitle>
              <DialogDescription>{t('attachment_setup_desc')}</DialogDescription>
            </DialogHeader>
          </div>
          <div className="p-10 space-y-6">
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest text-slate-400">TITLE</Label>
              <Input 
                placeholder="e.g. Birth Certificate" 
                className="h-12 rounded-xl bg-slate-50 border-slate-100" 
                value={newAtt.title} 
                onChange={e => setNewAtt({...newAtt, title: e.target.value})} 
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest text-slate-400">SELECT FILE FROM LAPTOP</Label>
              <div className="relative h-32 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-2 bg-slate-50 hover:bg-blue-50/30 transition-all group overflow-hidden">
                <input 
                  type="file" 
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20" 
                  onChange={e => { 
                    if (e.target.files && e.target.files[0]) {
                      setNewAtt(prev => ({ ...prev, file: e.target.files![0] }));
                    }
                  }} 
                />
                <div className={cn(
                  "h-10 w-10 rounded-full flex items-center justify-center shadow-sm transition-transform group-hover:scale-110 z-10",
                  newAtt.file ? "bg-emerald-500 text-white" : "bg-white text-slate-400"
                )}>
                  {newAtt.file ? <Check className="h-5 w-5" /> : <Paperclip className="h-5 w-5" />}
                </div>
                <span className={cn(
                  "text-[10px] font-black uppercase truncate px-4 max-w-full text-center z-10",
                  newAtt.file ? newAtt.file.name : t('upload_from_laptop')
                )}>
                  {newAtt.file ? newAtt.file.name : t('upload_from_laptop')}
                </span>
              </div>
            </div>
          </div>
          <div className="p-10 pt-2 flex gap-3 border-t bg-slate-50/50">
            <Button variant="outline" className="flex-1 h-12 rounded-xl font-bold" onClick={() => setIsAddAttOpen(false)}>
              {t('cancel')}
            </Button>
            <Button 
              className="flex-1 h-12 rounded-xl bg-blue-600 text-white font-bold gap-2" 
              onClick={handleAddAttachment} 
              disabled={isUploading || !newAtt.file || !newAtt.title.trim()}
            >
              {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} {t('confirm')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
