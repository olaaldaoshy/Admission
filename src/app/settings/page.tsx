
"use client";

import * as React from "react";
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
  Users,
  Building2,
  MapPin,
  Plus,
  Search,
  Trash2,
  X,
  UserPlus,
  Layers,
  Lock,
  Pencil,
  FileText,
  ExternalLink,
  Eye,
  EyeOff,
  Loader2,
  BookOpen,
  Stethoscope,
  MessageCircle,
  MessageSquareQuote,
  ClipboardCheck,
  Save,
  ArrowRight,
  AlertTriangle
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, deleteDocumentNonBlocking, updateDocumentNonBlocking, setDocumentNonBlocking, useEmployee, useUser } from "@/firebase";
import { collection, doc, Firestore, query, getDoc, where, getDocs, addDoc, updateDoc, deleteDoc, setDoc } from "firebase/firestore";
import { User as FirebaseAuthUser } from "firebase/auth";
import { format, getDay } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/context/language-context";

const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

interface ManagementCardProps {
  title: string;
  icon: any;
  type: string;
  color: string;
  catId: string;
  db: Firestore;
  user: FirebaseAuthUser | null;
  isDirector: boolean;
  onDeleteCategory: (id: string) => void;
  onDeleteItem: (col: string, id: string) => void;
  onOpenAdd: (title: string, type: string) => void;
  emptyLabel: string;
}

const ManagementCard = ({ title, icon: Icon, type, color, catId, db, user, isDirector, onDeleteCategory, onDeleteItem, onOpenAdd, emptyLabel }: ManagementCardProps) => {
  const safeType = typeof type === "string" ? type.trim() : "";
  const cardCollectionQuery = useMemoFirebase(() => (user && safeType.length > 0) ? collection(db, safeType) : null, [db, safeType, user]);
  const { data: cardItemsData } = useCollection(cardCollectionQuery);
  const items = cardItemsData || [];

  return (
    <Card className="border border-slate-100 shadow-sm rounded-[2rem] bg-white overflow-hidden flex flex-col h-full">
      <CardHeader className="p-6 pb-2 flex flex-row items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center relative group", color.replace('text-', 'bg-').replace('600', '50'))}>
            <Icon className={cn("h-5 w-5", color)} />
            {isDirector && (
              <button 
                onClick={() => onDeleteCategory(catId)}
                className="absolute -top-1 -left-1 h-5 w-5 bg-rose-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
          <CardTitle className="text-lg font-bold font-serif text-[#1a1a1a]">{title}</CardTitle>
        </div>
        {isDirector && (
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 rounded-full bg-slate-50 text-slate-400 hover:text-blue-600"
            onClick={() => onOpenAdd(title, type)}
          >
            <Plus className="h-4 w-4" />
          </Button>
        )}
      </CardHeader>
      <CardContent className="p-6 pt-2 flex-1">
        <ScrollArea className="h-[200px] pr-4">
          <div className="space-y-2">
            {items.length > 0 ? items.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all group">
                <span className="text-sm font-bold text-slate-700">{item.name}</span>
                {isDirector && (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-7 w-7 text-slate-400 hover:text-rose-600"
                      onClick={() => onDeleteItem(type, item.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            )) : (
              <div className="py-8 text-center text-slate-300 text-xs italic">{emptyLabel}</div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default function SettingsPage() {
  const db = useFirestore();
  const { user } = useUser();
  const { isDirector, isLoading: isAuthLoading } = useEmployee();
  const { toast } = useToast();
  const { t, isRTL } = useLanguage();
  
  const [searchTerm, setSearchTerm] = React.useState("");
  const [assessmentDate, setAssessmentDate] = React.useState<Date | undefined>(new Date());
  const [oralDate, setOralDate] = React.useState<Date | undefined>(new Date());

  const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false);
  const [isAddEmployeeDialogOpen, setIsAddEmployeeDialogOpen] = React.useState(false);
  const [isAddCategoryDialogOpen, setIsAddCategoryDialogOpen] = React.useState(false);
  const [isAddQuestionDialogOpen, setIsAddQuestionDialogOpen] = React.useState(false);
  
  const [addingTo, setAddingTo] = React.useState<{ title: string, type: string, subType?: string } | null>(null);
  const [addingQuestionTo, setAddingQuestionTo] = React.useState<{ title: string, category: string } | null>(null);
  const [editingQuestionId, setEditingQuestionId] = React.useState<string | null>(null);
  const [selectedQuestionGrades, setSelectedQuestionGrades] = React.useState<string[]>([]);
  
  const [newItemName, setNewItemName] = React.useState("");
  const [newItemCapacity, setNewItemCapacity] = React.useState("1");
  const [newCategoryName, setNewCategoryName] = React.useState("");
  const [newQuestionText, setNewQuestionText] = React.useState("");
  const [newPositiveIndicator, setNewPositiveIndicator] = React.useState("");
  const [newRedFlag, setNewRedFlag] = React.useState("");

  const [editingEmployeeId, setEditingEmployeeId] = React.useState<string | null>(null);
  const [isCreating, setIsCreating] = React.useState(false);
  const [employeeToDelete, setEmployeeToDelete] = React.useState<any | null>(null);
  const [isDeletingEmployee, setIsDeletingEmployee] = React.useState(false);
  const [newEmployee, setNewEmployee] = React.useState({
    name: "",
    email: "",
    role: "",
    campus: ""
  });

  const [isMappingDialogOpen, setIsMappingDialogOpen] = React.useState(false);
  const [selectedCampusMapping, setSelectedCampusMapping] = React.useState("");
  const [selectedSchoolsForCampus, setSelectedSchoolsForCampus] = React.useState<string[]>([]);
  const [schoolGradeMapping, setSchoolGradeMapping] = React.useState<Record<string, string[]>>({});
  const [gradeSubjectMapping, setGradeSubjectMapping] = React.useState<Record<string, Record<string, { subjectId: string, maxScore: string }[]>>>({});
  const [isSavingMapping, setIsSavingMapping] = React.useState(false);

  // Firestore Queries
  const employeesQuery = useMemoFirebase(() => user ? collection(db, "employees") : null, [db, user]);
  const settingsQuery = useMemoFirebase(() => user ? collection(db, "settings") : null, [db, user]);
  const categoriesQuery = useMemoFirebase(() => user ? collection(db, "categories") : null, [db, user]);
  const rolesQuery = useMemoFirebase(() => user ? collection(db, "role") : null, [db, user]);
  const campusQuery = useMemoFirebase(() => user ? collection(db, "campus") : null, [db, user]);
  const schoolsQuery = useMemoFirebase(() => user ? collection(db, "schools") : null, [db, user]);
  const gradeListQuery = useMemoFirebase(() => user ? collection(db, "grade") : null, [db, user]);
  const subjectListQuery = useMemoFirebase(() => user ? collection(db, "subject") : null, [db, user]);
  const questionsQuery = useMemoFirebase(() => user ? collection(db, "interview_questions") : null, [db, user]);
  const campusMappingsQuery = useMemoFirebase(() => user ? collection(db, "campus_mappings") : null, [db, user]);

  const { data: employeesData } = useCollection(employeesQuery);
  const employees = employeesData || [];
  
  const { data: settingsData } = useCollection(settingsQuery);
  const allSettings = settingsData || [];

  const { data: categoriesData } = useCollection(categoriesQuery);
  const categories = categoriesData || [];

  const { data: rolesData } = useCollection(rolesQuery);
  const roles = rolesData || [];

  const { data: campusesData } = useCollection(campusQuery);
  const campuses = campusesData || [];

  const { data: schoolsListData } = useCollection(schoolsQuery);
  const campusNamesSet = React.useMemo(() => {
    return new Set(campuses.map(c => c.name?.toLowerCase().trim()).filter(Boolean));
  }, [campuses]);
  const schoolsList = React.useMemo(() => {
    return (schoolsListData || []).filter(s => s?.name && !campusNamesSet.has(s.name.toLowerCase().trim()));
  }, [schoolsListData, campusNamesSet]);

  const { data: gradeListData } = useCollection(gradeListQuery);
  const gradeList = gradeListData || [];

  const { data: subjectListData } = useCollection(subjectListQuery);
  const subjectList = subjectListData || [];

  const { data: interviewQuestionsData } = useCollection(questionsQuery);
  const interviewQuestions = interviewQuestionsData || [];

  const { data: campusMappingsData } = useCollection(campusMappingsQuery);
  const campusMappings = campusMappingsData || [];
  
  const dynamicCategories = React.useMemo(() => {
    return (categories || [])
      .map(cat => {
        const colName = (cat.collectionName || (cat.name ? cat.name.trim().toLowerCase().replace(/\s+/g, "_") : "")).trim();
        return {
          type: colName,
          title: cat.name || colName,
          id: cat.id,
          icon: Layers,
          color: "text-slate-600"
        };
      })
      .filter(cat => Boolean(cat.type && cat.type.length > 0));
  }, [categories]);

  const DEFAULT_ROLES = [
    { id: "director", value: "Director", labelEn: "Director", labelAr: "مدير عام" },
    { id: "manager", value: "Manager", labelEn: "Campus Manager", labelAr: "مدير فرع" },
    { id: "employee", value: "Employee", labelEn: "Admissions Officer", labelAr: "مسؤول قبول وتسجيل" },
    { id: "sales_manager", value: "Sales Manager", labelEn: "Sales Manager", labelAr: "مدير مبيعات" },
    { id: "sales", value: "Sales", labelEn: "Sales Specialist", labelAr: "مسؤول مبيعات" },
  ];

  const availableRoles = React.useMemo(() => {
    const list = [...DEFAULT_ROLES];
    (roles || []).forEach(r => {
      const val = r.name || r.title;
      if (val && !list.some(item => item.value.toLowerCase() === val.toLowerCase())) {
        list.push({ id: r.id, value: val, labelEn: val, labelAr: val });
      }
    });
    return list;
  }, [roles]);

  const DEFAULT_CAMPUSES = [
    { id: "first_settlement", name: "First Settlement", labelEn: "First Settlement", labelAr: "التجمع الأول" },
    { id: "sherouk", name: "Sherouk", labelEn: "Sherouk", labelAr: "الشروق" },
    { id: "october", name: "October", labelEn: "October", labelAr: "أكتوبر" }
  ];

  const availableCampuses = React.useMemo(() => {
    if (campuses && campuses.length > 0) return campuses;
    return DEFAULT_CAMPUSES;
  }, [campuses]);

  const getRoleLabel = React.useCallback((roleVal: string) => {
    const match = availableRoles.find(r => r.value.toLowerCase() === (roleVal || "").toLowerCase());
    if (match) return isRTL ? match.labelAr : match.labelEn;
    return roleVal || (isRTL ? "موظف" : "Employee");
  }, [availableRoles, isRTL]);

  const getCampusLabel = React.useCallback((campusVal: string) => {
    const match = availableCampuses.find(c => c.name?.toLowerCase() === (campusVal || "").toLowerCase());
    if (match) return isRTL ? (match.labelAr || match.name) : (match.labelEn || match.name);
    return campusVal;
  }, [availableCampuses, isRTL]);

  const filteredEmployees = React.useMemo(() => {
    return employees.filter(emp => 
      (emp.name || emp.firstName)?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      emp.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [employees, searchTerm]);

  React.useEffect(() => {
    if (!selectedCampusMapping || !db) return;
    const loadMapping = async () => {
      const mappingRef = doc(db, "campus_mappings", selectedCampusMapping);
      const snap = await getDoc(mappingRef);
      if (snap.exists()) {
        const data = snap.data();
        const schools = Object.keys(data.schools || {});
        setSelectedSchoolsForCampus(schools);
        const sgm: Record<string, string[]> = {};
        const gsm: any = {};
        Object.entries(data.schools).forEach(([sid, sData]: [string, any]) => {
          sgm[sid] = Object.keys(sData.grades || {});
          gsm[sid] = {};
          Object.entries(sData.grades).forEach(([gid, gData]: [string, any]) => {
            gsm[sid][gid] = gData.subjects || [];
          });
        });
        setSchoolGradeMapping(sgm);
        setGradeSubjectMapping(gsm);
      } else {
        setSelectedSchoolsForCampus([]);
        setSchoolGradeMapping({});
        setGradeSubjectMapping({});
      }
    };
    loadMapping();
  }, [selectedCampusMapping, db]);

  const handleDeleteCategory = (id: string) => {
    if (!id || !id.trim()) return;
    deleteDocumentNonBlocking(doc(db, "categories", id.trim()));
  };

  const handleDeleteItem = (collectionName: string, id: string) => {
    const col = (collectionName || "").trim();
    const docId = (id || "").trim();
    if (!col || !docId) return;
    deleteDocumentNonBlocking(doc(db, col, docId));
  };

  const handleConfirmDeleteEmployee = async () => {
    if (!employeeToDelete || !db) return;
    setIsDeletingEmployee(true);
    try {
      await deleteDoc(doc(db, "employees", employeeToDelete.id));
      toast({
        title: isRTL ? "تم حذف الموظف بنجاح" : "Employee Deleted Successfully",
        description: isRTL
          ? `تم حذف بيانات الموظف "${employeeToDelete.name || employeeToDelete.firstName || employeeToDelete.email}" من النظام.`
          : `Employee "${employeeToDelete.name || employeeToDelete.firstName || employeeToDelete.email}" has been removed from the system.`,
      });
      setEmployeeToDelete(null);
    } catch (error) {
      console.error("Error deleting employee:", error);
      toast({
        variant: "destructive",
        title: isRTL ? "تعذر حذف الموظف" : "Deletion Error",
        description: isRTL
          ? "حدث خطأ أثناء محاولة حذف الموظف. يرجى المحاولة مرة أخرى."
          : "An error occurred while deleting the employee. Please try again.",
      });
    } finally {
      setIsDeletingEmployee(false);
    }
  };

  const handleOpenAddDialog = (title: string, type: string, subType?: string) => {
    setAddingTo({ title, type, subType });
    setNewItemName(type === "settings" ? "09:00" : "");
    setNewItemCapacity("1");
    setIsAddDialogOpen(true);
  };

  const handleAddItem = () => {
    const safeType = addingTo?.type ? addingTo.type.trim() : "";
    if (!newItemName.trim() || !addingTo || !safeType) return;
    const targetRef = collection(db, safeType);
    let finalValue = newItemName.trim();
    if (addingTo.type === "settings" && addingTo.subType) {
        const currentDate = addingTo.subType === "assessment_time" ? assessmentDate : oralDate;
        if (!currentDate) return;
        const formattedDate = format(currentDate, "yyyy-MM-dd");
        const [hours, minutes] = finalValue.split(':');
        const h = parseInt(hours);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const h12 = h % 12 || 12;
        finalValue = `${h12}:${minutes} ${ampm}`;
        addDocumentNonBlocking(targetRef, { 
          name: finalValue, 
          type: addingTo.subType, 
          date: formattedDate, 
          day: dayNames[getDay(currentDate)], 
          capacity: parseInt(newItemCapacity) || 1, 
          createdAt: new Date().toISOString() 
        });
    } else {
      addDocumentNonBlocking(targetRef, { name: finalValue, createdAt: new Date().toISOString() });
    }
    setIsAddDialogOpen(false);
  };

  const handleOpenAddQuestion = (title: string, category: string, question?: any) => {
    setAddingQuestionTo({ title, category });
    if (question) {
      setEditingQuestionId(question.id);
      setNewQuestionText(question.text);
      setSelectedQuestionGrades(question.grades || []);
      setNewPositiveIndicator(question.positiveIndicator || "");
      setNewRedFlag(question.redFlag || "");
    } else {
      setEditingQuestionId(null);
      setNewQuestionText("");
      setSelectedQuestionGrades([]);
      setNewPositiveIndicator("");
      setNewRedFlag("");
    }
    setIsAddQuestionDialogOpen(true);
  };

  const handleAddQuestion = () => {
    if (!newQuestionText.trim() || !addingQuestionTo) return;
    const questionData = {
      text: newQuestionText.trim(),
      category: addingQuestionTo.category,
      grades: selectedQuestionGrades,
      positiveIndicator: newPositiveIndicator.trim(),
      redFlag: newRedFlag.trim(),
      updatedAt: new Date().toISOString()
    };

    if (editingQuestionId) {
      updateDocumentNonBlocking(doc(db, "interview_questions", editingQuestionId), questionData);
      toast({ title: "Question Updated" });
    } else {
      addDocumentNonBlocking(collection(db, "interview_questions"), { 
        ...questionData,
        createdAt: new Date().toISOString() 
      });
      toast({ title: "Question Added" });
    }
    setIsAddQuestionDialogOpen(false);
  };

  const handleAddEmployee = async () => {
    const cleanEmail = newEmployee.email.toLowerCase().trim();
    const cleanName = newEmployee.name.trim();
    const cleanRole = newEmployee.role.trim();

    if (!cleanName || !cleanEmail || !cleanRole) {
      toast({
        variant: "destructive",
        title: isRTL ? "بيانات ناقصة" : "Missing Information",
        description: t('fill_required_fields')
      });
      return;
    }

    setIsCreating(true);
    try {
      const employeesRef = collection(db, "employees");
      
      // 1. فحص تكرار البريد الإلكتروني
      const emailQuery = query(employeesRef, where("email", "==", cleanEmail));
      const emailSnap = await getDocs(emailQuery);
      const emailExists = emailSnap.docs.some(doc => doc.id !== editingEmployeeId);

      if (emailExists) {
        toast({
          variant: "destructive",
          title: isRTL ? "البريد الإلكتروني مكرر" : "Duplicate Email",
          description: isRTL ? "هذا البريد الإلكتروني مسجل لموظف آخر بالفعل." : "An employee with this email address already exists."
        });
        setIsCreating(false);
        return;
      }

      // 2. فحص تكرار الاسم
      const nameQuery = query(employeesRef, where("name", "==", cleanName));
      const nameSnap = await getDocs(nameQuery);
      const nameExists = nameSnap.docs.some(doc => doc.id !== editingEmployeeId);

      if (nameExists) {
        toast({
          variant: "destructive",
          title: isRTL ? "الاسم مكرر" : "Duplicate Name",
          description: isRTL ? "هذا الاسم مسجل لموظف آخر بالفعل." : "An employee with this name already exists."
        });
        setIsCreating(false);
        return;
      }

      if (editingEmployeeId) {
        await updateDoc(doc(db, "employees", editingEmployeeId), { 
          name: cleanName, 
          email: cleanEmail, 
          role: cleanRole, 
          campus: newEmployee.campus || "",
          updatedAt: new Date().toISOString()
        });
        toast({ 
          title: isRTL ? "تم تحديث البيانات" : "Updated Successfully",
          description: isRTL ? "تم تحديث بيانات الموظف بنجاح" : "Employee details updated successfully"
        });
      } else {
        await addDoc(collection(db, "employees"), { 
          name: cleanName, 
          email: cleanEmail, 
          role: cleanRole, 
          campus: newEmployee.campus || "", 
          status: "Active", 
          isActive: true, 
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        toast({ 
          title: isRTL ? "تم تسجيل الموظف بنجاح" : "Employee Registered",
          description: t('employee_invited_success')
        });
      }
      setIsAddEmployeeDialogOpen(false);
      setNewEmployee({ name: "", email: "", role: "", campus: "" });
      setEditingEmployeeId(null);
    } catch (error: any) { 
      console.error("Error creating/updating employee:", error);
      toast({ 
        variant: "destructive", 
        title: isRTL ? "فشل الحفظ" : "Error", 
        description: error.message || (isRTL ? "تعذر حفظ الموظف في قاعدة البيانات" : "Could not save employee to database") 
      }); 
    } finally { 
      setIsCreating(false); 
    }
  };

  const handleEditEmployee = (emp: any) => {
    setEditingEmployeeId(emp.id);
    setNewEmployee({ 
      name: emp.name || emp.firstName || "", 
      email: emp.email || "", 
      role: emp.role || "", 
      campus: emp.campus || ""
    });
    setIsAddEmployeeDialogOpen(true);
  };

  const handleToggleSchoolInCampus = (schoolId: string) => {
    setSelectedSchoolsForCampus(prev => prev.includes(schoolId) ? prev.filter(id => id !== schoolId) : [...prev, schoolId]);
  };

  const handleToggleGradeInSchool = (schoolId: string, gradeId: string) => {
    setSchoolGradeMapping(prev => {
      const current = prev[schoolId] || [];
      return { ...prev, [schoolId]: current.includes(gradeId) ? current.filter(id => id !== gradeId) : [...current, gradeId] };
    });
  };

  const handleToggleSubjectInGrade = (schoolId: string, gradeId: string, subjectId: string) => {
    setGradeSubjectMapping(prev => {
      const schoolMap = prev[schoolId] || {};
      const gradeSubjects = schoolMap[gradeId] || [];
      const exists = gradeSubjects.find(s => s.subjectId === subjectId);
      const newGradeSubjects = exists 
        ? gradeSubjects.filter(s => s.subjectId !== subjectId)
        : [...gradeSubjects, { subjectId, maxScore: "100" }];
      return { ...prev, [schoolId]: { ...schoolMap, [gradeId]: newGradeSubjects } };
    });
  };

  const handleUpdateMaxScore = (schoolId: string, gradeId: string, subjectId: string, score: string) => {
    setGradeSubjectMapping(prev => {
      const schoolMap = prev[schoolId] || {};
      const gradeSubjects = schoolMap[gradeId] || [];
      const newGradeSubjects = gradeSubjects.map(s => s.subjectId === subjectId ? { ...s, maxScore: score } : s);
      return { ...prev, [schoolId]: { ...schoolMap, [gradeId]: newGradeSubjects } };
    });
  };

  const handleSaveMapping = async () => {
    if (!selectedCampusMapping) return;
    setIsSavingMapping(true);
    try {
      const campus = campuses.find(c => c.id === selectedCampusMapping);
      const schoolsData: Record<string, any> = {};
      selectedSchoolsForCampus.forEach(sid => {
        const school = schoolsList.find(s => s.id === sid);
        const gradesData: Record<string, any> = {};
        (schoolGradeMapping[sid] || []).forEach(gid => {
          const grade = gradeList.find(g => g.id === gid);
          gradesData[gid] = {
            name: grade?.name || "Unknown",
            subjects: (gradeSubjectMapping[sid]?.[gid] || []).map(s => ({
              ...s,
              name: subjectList.find(sub => sub.id === s.subjectId)?.name || "Unknown"
            }))
          };
        });
        schoolsData[sid] = { name: school?.name || "Unknown", grades: gradesData };
      });
      await setDocumentNonBlocking(doc(db, "campus_mappings", selectedCampusMapping), {
        campusId: selectedCampusMapping, 
        campusName: campus?.name || "Unknown", 
        schools: schoolsData, 
        updatedAt: new Date().toISOString()
      }, { merge: true });
      toast({ title: "Mapping Saved" });
      setIsMappingDialogOpen(false);
    } catch (err) { 
      console.error("Error saving campus mapping:", err);
      toast({ variant: "destructive", title: "Error" }); 
    } finally { 
      setIsSavingMapping(false); 
    }
  };

  const getTimesByTypeAndDate = (type: "assessment_time" | "oral_time", date: Date | undefined) => {
    if (!date) return [];
    const fmt = format(date, "yyyy-MM-dd");
    return allSettings.filter(s => s.type === type && s.date === fmt);
  };

  const QuestionCard = ({ title, category, icon: Icon, color }: { title: string, category: string, icon: any, color: string }) => {
    const questions = interviewQuestions.filter(q => q.category === category);
    return (
      <Card className="border border-slate-100 shadow-sm rounded-[2rem] bg-white overflow-hidden flex flex-col h-full">
        <CardHeader className="p-6 pb-2 flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center", color.replace('text-', 'bg-').replace('600', '50'))}>
              <Icon className={cn("h-5 w-5", color)} />
            </div>
            <CardTitle className="text-lg font-bold font-serif text-[#1a1a1a]">{title}</CardTitle>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-slate-50 text-slate-400 hover:text-blue-600" onClick={() => handleOpenAddQuestion(title, category)}>
            <Plus className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="p-6 pt-2 flex-1">
          <ScrollArea className="h-[250px] pr-4">
            <div className="space-y-4">
              {questions.map((q) => (
                <div key={q.id} className="p-4 rounded-2xl bg-slate-50/50 border border-transparent hover:border-slate-100 transition-all group relative">
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-slate-800 leading-relaxed pr-8">{q.text}</p>
                    {q.grades && q.grades.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {q.grades.map((g: string) => (
                          <Badge key={g} variant="outline" className="bg-white text-[8px] px-1.5 py-0 rounded font-black text-slate-400 uppercase">{g}</Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="text-slate-400 hover:text-blue-600" onClick={() => handleOpenAddQuestion(title, category, q)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button className="text-slate-400 hover:text-rose-500" onClick={() => handleDeleteItem("interview_questions", q.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    );
  };

  if (isAuthLoading) {
    return <div className="p-20 text-center text-slate-400 font-bold">{t('syncing')}</div>;
  }

  if (!isDirector) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6 animate-in fade-in zoom-in duration-500">
        <div className="h-24 w-24 bg-rose-50 rounded-[2rem] flex items-center justify-center border border-rose-100 shadow-xl shadow-rose-500/10">
          <Lock className="h-12 w-12 text-rose-500" />
        </div>
        <div className="space-y-2">
          <h2 className="text-3xl font-black text-slate-800 font-serif">{t('access_issue')}</h2>
          <p className="text-slate-500 font-medium max-w-md mx-auto">{t('authorized_personnel_only')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-8 w-full max-w-full pb-12 animate-in fade-in duration-700", isRTL && "font-arabic")}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-4xl font-extrabold tracking-tight text-[#1a1a1a] font-serif">{t('settings_management')}</h1>
          <p className="text-slate-500 text-lg">{t('manage_org_desc')}</p>
        </div>
        <Button className="h-12 px-8 bg-[#0a1a3a] hover:bg-[#1a1a5a] text-white font-bold rounded-2xl gap-2 shadow-xl shadow-blue-900/10" onClick={() => window.open('https://blb-admin-staging.web.app/#/application', '_blank')}>
          <FileText className="h-5 w-5" /> {t('online_form')} <ExternalLink className="h-4 w-4" />
        </Button>
      </div>

      <Tabs defaultValue="employees" className="w-full">
        <TabsList className="bg-slate-100/50 p-1 rounded-full w-fit mb-8 h-auto flex flex-wrap">
          <TabsTrigger value="employees" className="rounded-full px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm text-slate-600 text-xs font-bold transition-all gap-2"><Users className="h-4 w-4" /> {t('employee_management')}</TabsTrigger>
          <TabsTrigger value="org" className="rounded-full px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm text-slate-600 text-xs font-bold transition-all gap-2"><Building2 className="h-4 w-4" /> {t('system_setup')}</TabsTrigger>
          <TabsTrigger value="mapping" className="rounded-full px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm text-slate-600 text-xs font-bold transition-all gap-2"><BookOpen className="h-4 w-4" /> {t('campus_mapping')}</TabsTrigger>
          <TabsTrigger value="interview_setup" className="rounded-full px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm text-slate-600 text-xs font-bold transition-all gap-2"><MessageSquareQuote className="h-4 w-4" /> {t('interview_setup')}</TabsTrigger>
        </TabsList>

        <TabsContent value="employees" className="mt-0 space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className={cn("absolute top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400", isRTL ? "right-3" : "left-3")} />
              <Input placeholder={t('search_employees')} className={cn("h-11 bg-white border-slate-200 rounded-xl", isRTL ? "pr-10" : "pl-10")} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <Button className="h-11 px-6 bg-blue-600 hover:bg-blue-700 text-white font-bold gap-2 rounded-xl shadow-lg shadow-blue-500/20" onClick={() => { setEditingEmployeeId(null); setNewEmployee({ name: "", email: "", role: "", campus: "" }); setIsAddEmployeeDialogOpen(true); }}>
              <Plus className="h-4 w-4" /> {t('add_new_employee')}
            </Button>
          </div>
          <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow className="h-14 border-slate-100">
                  <TableHead className={cn("font-bold text-slate-700 h-14 px-6", isRTL ? "text-right" : "text-left")}>{t('id')}</TableHead>
                  <TableHead className={cn("font-bold text-slate-700 h-14", isRTL ? "text-right" : "text-left")}>{t('employee_name')}</TableHead>
                  <TableHead className={cn("font-bold text-slate-700 h-14", isRTL ? "text-right" : "text-left")}>{t('campus_label')}</TableHead>
                  <TableHead className={cn("font-bold text-slate-700 h-14", isRTL ? "text-right" : "text-left")}>{t('role')}</TableHead>
                  <TableHead className={cn("font-bold text-slate-700 h-14", isRTL ? "text-right" : "text-left")}>{t('status')}</TableHead>
                  <TableHead className="font-bold text-slate-700 h-14 text-center">{t('actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmployees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-slate-400 font-bold">
                      {isRTL ? "لا يوجد موظفون مسجلون حالياً. اضغط على \"دعوة موظف جديد\" للبدء." : "No employees found. Click \"Invite New Employee\" to add staff."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEmployees.map((emp, idx) => (
                    <TableRow key={emp.id} className={cn("border-slate-100 transition-colors h-16", idx % 2 === 1 && "bg-slate-50/30")}>
                      <TableCell className={cn("px-6 font-semibold text-slate-500", isRTL ? "text-right" : "text-left")}>{emp.id?.slice(0, 6)}</TableCell>
                      <TableCell className={isRTL ? "text-right" : "text-left"}>
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-800">{emp.name || emp.firstName}</span>
                          <span className="text-xs text-slate-400">{emp.email}</span>
                        </div>
                      </TableCell>
                      <TableCell className={isRTL ? "text-right" : "text-left"}>
                        <div className="flex items-center gap-1 text-slate-600 font-bold text-xs uppercase">
                          <MapPin className="h-3 w-3 text-blue-400" />
                          {getCampusLabel(emp.campus) || '—'}
                        </div>
                      </TableCell>
                      <TableCell className={isRTL ? "text-right" : "text-left"}><Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-100 px-3 py-1 font-bold rounded-lg text-[10px] uppercase tracking-wider">{getRoleLabel(emp.role)}</Badge></TableCell>
                      <TableCell className={isRTL ? "text-right" : "text-left"}><Badge variant="outline" className={cn("px-3 py-1 font-bold rounded-lg text-[10px] uppercase", emp.status === 'Invited' ? "bg-amber-50 text-amber-600 border-amber-100" : "bg-emerald-50 text-emerald-600 border-emerald-100")}>{emp.status || 'Active'}</Badge></TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-2">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-9 w-9 text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" 
                            title={isRTL ? "تعديل الموظف" : "Edit Employee"}
                            onClick={() => handleEditEmployee(emp)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-9 w-9 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors" 
                            title={isRTL ? "حذف الموظف" : "Delete Employee"}
                            onClick={() => setEmployeeToDelete(emp)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="org" className="mt-0 space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="border-none shadow-sm rounded-[2rem] bg-[#1a1a3a] text-white overflow-hidden">
               <CardHeader className="p-8 pb-2"><div className="flex items-center gap-3"><div className="h-10 w-10 rounded-xl bg-blue-500/20 flex items-center justify-center"><Stethoscope className="h-5 w-5 text-blue-300" /></div><CardTitle className="text-xl font-bold font-serif">{t('assessment_times')}</CardTitle></div></CardHeader>
               <CardContent className="p-8 pt-4 space-y-6">
                  <div className="space-y-2"><label className="text-[10px] font-black text-blue-300/60 uppercase tracking-[0.2em]">{t('pick_date')}</label><Popover><PopoverTrigger asChild><Button variant="outline" className="w-full h-12 bg-white/5 border-white/10 text-white rounded-xl hover:bg-white/10 hover:text-white justify-start text-left font-bold">{assessmentDate ? format(assessmentDate, "PPP") : <span>{t('pick_date')}</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0 rounded-2xl overflow-hidden" align="start"><Calendar mode="single" selected={assessmentDate} onSelect={setAssessmentDate} initialFocus /></PopoverContent></Popover></div>
                  <div className="space-y-3"><div className="flex items-center justify-between"><label className="text-[10px] font-black text-blue-300/60 uppercase tracking-[0.2em]">{t('available_slots')}</label><Button variant="ghost" size="sm" className="h-6 text-[10px] text-blue-400 font-black p-0 uppercase" onClick={() => handleOpenAddDialog("Assessment Slot", "settings", "assessment_time")}><Plus className="h-3 w-3 mr-1" /> {t('add_time')}</Button></div><div className="grid grid-cols-2 gap-2">{getTimesByTypeAndDate("assessment_time", assessmentDate).map((item) => (<div key={item.id} className="flex items-center justify-between bg-white/5 border border-white/10 rounded-lg px-3 py-2 group"><div className="flex flex-col"><span className="text-xs font-bold text-blue-100">{item.name}</span><span className="text-[9px] text-blue-400/60 font-black uppercase">{t('cap')}: {item.capacity || 1}</span></div><button className="text-white/20 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-all" onClick={() => handleDeleteItem("settings", item.id)}><Trash2 className="h-3 w-3" /></button></div>))}</div></div>
               </CardContent>
            </Card>
            <Card className="border-none shadow-sm rounded-[2rem] bg-[#1a1a3a] text-white overflow-hidden">
               <CardHeader className="p-8 pb-2"><div className="flex items-center gap-3"><div className="h-10 w-10 rounded-xl bg-purple-500/20 flex items-center justify-center"><MessageCircle className="h-5 w-5 text-purple-300" /></div><CardTitle className="text-xl font-bold font-serif">{t('oral_interview_times')}</CardTitle></div></CardHeader>
               <CardContent className="p-8 pt-4 space-y-6">
                  <div className="space-y-2"><label className="text-[10px] font-black text-purple-300/60 uppercase tracking-[0.2em]">{t('pick_date')}</label><Popover><PopoverTrigger asChild><Button variant="outline" className="w-full h-12 bg-white/5 border-white/10 text-white rounded-xl hover:bg-white/10 hover:text-white justify-start text-left font-bold">{oralDate ? format(oralDate, "PPP") : <span>{t('pick_date')}</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0 rounded-2xl overflow-hidden" align="start"><Calendar mode="single" selected={oralDate} onSelect={setOralDate} initialFocus /></PopoverContent></Popover></div>
                  <div className="space-y-3"><div className="flex items-center justify-between"><label className="text-[10px] font-black text-purple-300/60 uppercase tracking-[0.2em]">{t('available_slots')}</label><Button variant="ghost" size="sm" className="h-6 text-[10px] text-blue-400 font-black p-0 uppercase" onClick={() => handleOpenAddDialog("Oral Slot", "settings", "oral_time")}><Plus className="h-3 w-3 mr-1" /> {t('add_time')}</Button></div><div className="grid grid-cols-2 gap-2">{getTimesByTypeAndDate("oral_time", oralDate).map((item) => (<div key={item.id} className="flex items-center justify-between bg-white/5 border border-white/10 rounded-lg px-3 py-2 group"><div className="flex flex-col"><span className="text-xs font-bold text-purple-100">{item.name}</span><span className="text-[9px] text-blue-400/60 font-black uppercase">{t('cap')}: {item.capacity || 1}</span></div><button className="text-white/20 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-all" onClick={() => handleDeleteItem("settings", item.id)}><Trash2 className="h-3 w-3" /></button></div>))}</div></div>
               </CardContent>
            </Card>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {(dynamicCategories || []).map(cat => (
              <ManagementCard 
                key={cat.id} 
                title={cat.title} 
                icon={cat.icon} 
                type={cat.type} 
                color={cat.color} 
                catId={cat.id} 
                db={db} 
                user={user} 
                isDirector={isDirector} 
                onDeleteCategory={handleDeleteCategory} 
                onDeleteItem={handleDeleteItem} 
                onOpenAdd={handleOpenAddDialog} 
                emptyLabel={t('syncing')}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="mapping" className="mt-0 space-y-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-2xl font-black text-[#1a1a1a] font-serif">{t('campus_school_mapping')}</h2>
            <Button className="h-11 px-6 bg-blue-600 hover:bg-blue-700 text-white font-bold gap-2 rounded-xl shadow-lg" onClick={() => { setSelectedCampusMapping(""); setSelectedSchoolsForCampus([]); setSchoolGradeMapping({}); setGradeSubjectMapping({}); setIsMappingDialogOpen(true); }}><Plus className="h-4 w-4" /> {t('new_mapping')}</Button>
          </div>
          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
             <Table>
                <TableHeader className="bg-slate-50/50 h-16"><TableRow className="border-slate-100"><TableHead className={cn("font-bold text-slate-700 w-1/4", isRTL ? "pr-10 text-right" : "pl-10 text-left")}>{t('campus_name')}</TableHead><TableHead className={cn("font-bold text-slate-700", isRTL ? "text-right" : "text-left")}>{t('linked_schools_grades')}</TableHead><TableHead className={cn("font-bold text-slate-700 text-center w-32", isRTL ? "pl-10" : "pr-10")}>{t('actions')}</TableHead></TableRow></TableHeader>
                <TableBody>
                   {(campusMappings || []).length > 0 ? campusMappings.map(mapping => (
                     <TableRow key={mapping.id} className="border-slate-50 hover:bg-slate-50/20">
                        <TableCell className={cn("align-top pt-8", isRTL ? "pr-10" : "pl-10")}><div className="flex items-center gap-3 font-black text-slate-700"><Building2 className="h-5 w-5 text-slate-300" /> {mapping.campusName}</div></TableCell>
                        <TableCell className="py-8"><div className="space-y-8">
                           {Object.entries(mapping.schools || {}).map(([sid, sData]: [string, any]) => (
                             <div key={sid} className="space-y-3">
                                <div className="flex items-center gap-2"><div className="h-6 w-6 bg-blue-50 rounded flex items-center justify-center"><Building2 className="h-3 w-3 text-blue-600" /></div><span className="text-sm font-black text-slate-800 uppercase tracking-wider">{sData.name}</span></div>
                                <div className="flex flex-wrap gap-2 pl-8">{Object.entries(sData.grades || {}).map(([gid, gData]: [string, any]) => (<Badge key={gid} variant="outline" className="bg-white text-slate-500 border-slate-200 font-bold px-3 py-1 rounded-lg text-[10px]">{gData.name}</Badge>))}</div>
                             </div>
                           ))}
                        </div></TableCell>
                        <TableCell className={cn("align-top pt-8 text-center", isRTL ? "pl-10" : "pr-10")}><div className="flex items-center justify-center gap-1"><Button variant="ghost" size="icon" className="h-9 w-9 text-slate-400 hover:text-blue-600" onClick={() => { setSelectedCampusMapping(mapping.campusId); setIsMappingDialogOpen(true); }}><Pencil className="h-4 w-4" /></Button><Button variant="ghost" size="icon" className="h-9 w-9 text-slate-400 hover:text-rose-600" onClick={() => handleDeleteItem("campus_mappings", mapping.id)}><Trash2 className="h-4 w-4" /></Button></div></TableCell>
                     </TableRow>
                   )) : <TableRow><TableCell colSpan={3} className="h-40 text-center text-slate-400 italic font-bold">{t('syncing')}</TableCell></TableRow>}
                </TableBody>
             </Table>
          </div>
        </TabsContent>

        <TabsContent value="interview_setup" className="mt-0 space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"><QuestionCard title={t('admissions_score')} category="admissions" icon={ClipboardCheck} color="text-blue-600" /><QuestionCard title={t('principal_student')} category="principal_student" icon={UserPlus} color="text-emerald-600" /><QuestionCard title={t('principal_parent')} category="principal_parent" icon={Users} color="text-purple-600" /><QuestionCard title={t('decision_criteria')} category="decision" icon={Save} color="text-amber-600" /></div>
        </TabsContent>
      </Tabs>

      {/* Add Item Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className={cn("max-w-[400px] p-0 overflow-hidden rounded-[2rem] border-none shadow-2xl", isRTL && "font-arabic")}>
          <div className="p-8 pb-4 bg-slate-50 border-b">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black font-serif">{t('add_new_resource')}</DialogTitle>
              <DialogDescription>{t('resource_setup_desc')}</DialogDescription>
            </DialogHeader>
          </div>
          <div className="p-8 space-y-4">
             <div className="space-y-2"><Label className="text-xs font-black uppercase tracking-widest text-slate-400">{addingTo?.type === "settings" ? t('pick_date') : t('student_name')}</Label>{addingTo?.type === "settings" ? <Input type="time" className="h-12 rounded-xl bg-white border-slate-200" value={newItemName} onChange={e => setNewItemName(e.target.value)} /> : <Input placeholder="..." className="h-12 rounded-xl bg-white border-slate-200" value={newItemName} onChange={e => setNewItemName(e.target.value)} />}</div>
             {addingTo?.type === "settings" && <div className="space-y-2"><Label className="text-xs font-black uppercase tracking-widest text-slate-400">{t('cap')}</Label><Input type="number" min="1" className="h-12 rounded-xl bg-white border-slate-200" value={newItemCapacity} onChange={e => setNewItemCapacity(e.target.value)} /></div>}
          </div>
          <div className="p-8 pt-2 flex gap-3"><Button variant="outline" className="flex-1 h-12 rounded-xl font-bold" onClick={() => setIsAddDialogOpen(false)}>{t('cancel')}</Button><Button className="flex-1 h-12 rounded-xl bg-blue-600 text-white font-bold" onClick={handleAddItem}>{t('confirm')}</Button></div>
        </DialogContent>
      </Dialog>

      {/* Add Category Dialog */}
      <Dialog open={isAddCategoryDialogOpen} onOpenChange={setIsAddCategoryDialogOpen}>
        <DialogContent className={cn("max-w-[400px] p-0 overflow-hidden rounded-[2rem] border-none shadow-2xl", isRTL && "font-arabic")}>
          <div className="p-8 pb-4 bg-slate-50 border-b">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black font-serif">{t('add_category')}</DialogTitle>
              <DialogDescription>{t('category_setup_desc')}</DialogDescription>
            </DialogHeader>
          </div>
          <div className="p-8 space-y-4"><div className="space-y-2"><Label className="text-xs font-black uppercase tracking-widest text-slate-400">{t('category_name')}</Label><Input placeholder="e.g. Nationality" className="h-12 rounded-xl bg-white border-slate-200" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} /></div></div>
          <div className="p-8 pt-2 flex gap-3"><Button variant="outline" className="flex-1 h-12 rounded-xl font-bold" onClick={() => setIsAddCategoryDialogOpen(false)}>{t('cancel')}</Button><Button className="flex-1 h-12 rounded-xl bg-blue-600 text-white font-bold" onClick={() => { if (!newCategoryName.trim()) return; const col = newCategoryName.trim().toLowerCase().replace(/\s+/g, "_"); addDocumentNonBlocking(collection(db, "categories"), { name: newCategoryName.trim(), collectionName: col, createdAt: new Date().toISOString() }); setIsAddCategoryDialogOpen(false); setNewCategoryName(""); }}>{t('confirm')}</Button></div>
        </DialogContent>
      </Dialog>

      {/* Add Employee Dialog */}
      <Dialog open={isAddEmployeeDialogOpen} onOpenChange={setIsAddEmployeeDialogOpen}>
        <DialogContent className={cn("max-w-[450px] p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl", isRTL && "font-arabic")}>
          <div className="p-10 pb-4 bg-slate-50">
            <DialogHeader>
              <div className="h-14 w-14 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg mb-4">
                <UserPlus className="h-7 w-7 text-white" />
              </div>
              <DialogTitle className="text-3xl font-black font-serif">
                {editingEmployeeId ? t('edit_employee') : t('invite_employee')}
              </DialogTitle>
              <DialogDescription className="text-slate-500 font-medium">
                {editingEmployeeId 
                  ? (isRTL ? "تحديث بيانات الموظف والصلاحيات" : "Update employee record and role") 
                  : (isRTL ? "سيتم تسجيل الموظف في قاعدة البيانات وسيتمكن من تسجيل الدخول بحساب Gmail" : "Employee will be registered in database and can log in with Gmail")}
              </DialogDescription>
            </DialogHeader>
          </div>
          
          <ScrollArea className="max-h-[60vh]">
            <div className="p-10 space-y-6">
              <div className="space-y-2">
                <Label className="text-sm font-black text-slate-700">{t('full_name')}</Label>
                <Input 
                  className="h-14 rounded-2xl bg-slate-50 border-slate-100" 
                  value={newEmployee.name} 
                  placeholder={isRTL ? "مثال: أحمد محمد" : "e.g. John Doe"}
                  onChange={e => setNewEmployee({...newEmployee, name: e.target.value})} 
                />
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-black text-slate-700">{t('email_address')}</Label>
                <Input 
                  className="h-14 rounded-2xl bg-slate-50 border-slate-100" 
                  type="email" 
                  value={newEmployee.email} 
                  placeholder="name@gmail.com"
                  onChange={e => setNewEmployee({...newEmployee, email: e.target.value})} 
                />
                <p className="text-xs text-slate-400 font-medium">
                  {isRTL ? "يرجى كتابة بريد Gmail الخاص بالموظف الذي سيسجل الدخول به." : "Please enter the employee's Gmail address used for sign in."}
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-black text-slate-700">{t('role')}</Label>
                <Select value={newEmployee.role} onValueChange={v => setNewEmployee({ ...newEmployee, role: v })}>
                  <SelectTrigger className="h-14 rounded-2xl bg-slate-50 border-slate-100 font-bold">
                    <SelectValue placeholder={t('select_role')} />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    {availableRoles.map(r => (
                      <SelectItem key={r.id} value={r.value} className="font-bold py-3">
                        {isRTL ? r.labelAr : r.labelEn}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {(newEmployee.role === "Employee" || newEmployee.role === "Manager") && (
                <div className="space-y-2">
                  <Label className="text-sm font-black text-slate-700">{t('campus_name')}</Label>
                  <Select value={newEmployee.campus} onValueChange={v => setNewEmployee({ ...newEmployee, campus: v })}>
                    <SelectTrigger className="h-14 rounded-2xl bg-slate-50 border-slate-100 font-bold">
                      <SelectValue placeholder={t('select_campus')} />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl">
                      {availableCampuses.map(c => (
                        <SelectItem key={c.id} value={c.name} className="font-bold py-3">
                          {isRTL ? (c.labelAr || c.name) : c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </ScrollArea>
          
          <div className="p-10 pt-2 flex gap-3">
            <Button variant="outline" className="flex-1 h-14 rounded-2xl font-bold" onClick={() => setIsAddEmployeeDialogOpen(false)}>
              {t('cancel')}
            </Button>
            {editingEmployeeId && (
              <Button
                type="button"
                variant="outline"
                className="h-14 px-5 rounded-2xl font-bold border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300 gap-2 transition-colors"
                onClick={() => {
                  const emp = employees.find(e => e.id === editingEmployeeId);
                  if (emp) {
                    setIsAddEmployeeDialogOpen(false);
                    setEmployeeToDelete(emp);
                  }
                }}
              >
                <Trash2 className="h-4 w-4" />
                {isRTL ? "حذف الموظف" : "Delete"}
              </Button>
            )}
            <Button 
              className="flex-1 h-14 rounded-2xl bg-blue-600 text-white font-bold" 
              onClick={handleAddEmployee} 
              disabled={isCreating}
            >
              {isCreating ? <Loader2 className="h-5 w-5 animate-spin" /> : editingEmployeeId ? t('save') : t('confirm')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Campus Mapping Dialog */}
      <Dialog open={isMappingDialogOpen} onOpenChange={setIsMappingDialogOpen}>
        <DialogContent className={cn("max-w-[900px] p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl", isRTL && "font-arabic")}>
          <div className="p-8 pb-4 bg-slate-50 border-b"><DialogHeader><DialogTitle className="text-2xl font-black font-serif">{t('setup_campus_mapping')}</DialogTitle><DialogDescription>{t('link_schools_grades_desc')}</DialogDescription></DialogHeader></div>
          <ScrollArea className="max-h-[70vh]">
            <div className="p-10 space-y-12">
              <div className="space-y-4">
                <Label className="text-xs font-black uppercase tracking-widest text-slate-400">1. {t('choose_campus')}</Label>
                <Select value={selectedCampusMapping} onValueChange={setSelectedCampusMapping} disabled={!!selectedCampusMapping && (campusMappings || []).some(m => m.campusId === selectedCampusMapping)}>
                  <SelectTrigger className="h-14 rounded-2xl bg-white border-slate-200 text-lg font-bold">
                    <SelectValue placeholder={t('choose_campus')} />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {(campuses || []).map(c => <SelectItem key={c.id} value={c.id} className="font-bold py-3">{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              
              {selectedCampusMapping && (
                <div className="space-y-12">
                  <div className="space-y-4">
                    <Label className="text-xs font-black uppercase tracking-widest text-slate-400">2. {t('select_systems_for_campus')}</Label>
                    <div className="flex flex-wrap gap-2">
                      {(schoolsList || []).map(s => (
                        <div key={s.id} onClick={() => handleToggleSchoolInCampus(s.id)} className={cn("px-5 py-3 rounded-2xl border-2 transition-all cursor-pointer font-bold", selectedSchoolsForCampus.includes(s.id) ? "border-blue-600 bg-blue-50 text-blue-600" : "border-slate-100 bg-slate-50/50 text-slate-400")}>{s.name}</div>
                      ))}
                    </div>
                  </div>
                  
                  {selectedSchoolsForCampus.map(sid => {
                    const school = (schoolsList || []).find(s => s.id === sid);
                    return (
                      <div key={sid} className="p-8 bg-slate-50/50 rounded-[2.5rem] border border-slate-100 space-y-8">
                        <div className="flex items-center gap-3">
                          <Badge className="bg-blue-600 text-white font-black px-4 py-1.5 rounded-full uppercase text-[10px]">{school?.name}</Badge>
                          <span className="text-sm font-bold text-slate-400">{t('grades_mapping')}</span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                          {(gradeList || []).map(g => (
                            <div key={g.id} onClick={() => handleToggleGradeInSchool(sid, g.id)} className={cn("p-3 rounded-xl border-2 transition-all cursor-pointer text-center text-xs font-bold", (schoolGradeMapping[sid] || []).includes(g.id) ? "border-blue-600 bg-white text-blue-600" : "border-transparent bg-white text-slate-400")}>{g.name}</div>
                          ))}
                        </div>
                        
                        <div className="space-y-6">
                          {(schoolGradeMapping[sid] || []).map(gid => {
                            const grade = (gradeList || []).find(g => g.id === gid);
                            return (
                              <div key={gid} className={cn("space-y-4", isRTL ? "pr-6 border-r-4 border-blue-200" : "pl-6 border-l-4 border-blue-200")}>
                                <div className="flex items-center gap-2"><Badge variant="outline" className="bg-white font-black text-[10px]">{grade?.name}</Badge><span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t('select_assessment_subjects')}</span></div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {(subjectList || []).map(sub => {
                                    const mapped = (gradeSubjectMapping[sid]?.[gid] || []).find(s => s.subjectId === sub.id);
                                    return (
                                      <div key={sub.id} className={cn("p-4 rounded-2xl border transition-all flex flex-col gap-3", mapped ? "border-emerald-200 bg-emerald-50/30" : "border-slate-100 bg-white")}>
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center gap-2" onClick={() => handleToggleSubjectInGrade(sid, gid, sub.id)}><Checkbox checked={!!mapped} /><span className="text-xs font-bold text-slate-700">{sub.name}</span></div>
                                          {mapped && <span className="text-[9px] font-black text-emerald-600 uppercase">Linked</span>}
                                        </div>
                                        {mapped && (
                                          <div className="flex items-center gap-2 animate-in slide-in-from-left-2 duration-300">
                                            <Label className="text-[10px] font-bold text-slate-500">{t('max_score')}:</Label>
                                            <Input type="number" className="h-8 w-20 text-xs font-black rounded-lg" value={mapped.maxScore} onChange={e => handleUpdateMaxScore(sid, gid, sub.id, e.target.value)} />
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </ScrollArea>
          <div className="p-8 pt-4 flex gap-3 border-t bg-slate-50/50"><Button variant="outline" className="h-14 rounded-2xl font-bold" onClick={() => setIsMappingDialogOpen(false)}>{t('cancel')}</Button><Button className="flex-1 h-14 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-xl shadow-blue-500/20" onClick={handleSaveMapping} disabled={isSavingMapping}>{isSavingMapping ? <Loader2 className="h-5 w-5 animate-spin" /> : t('save_all_mappings')}</Button></div>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Question Dialog */}
      <Dialog open={isAddQuestionDialogOpen} onOpenChange={setIsAddQuestionDialogOpen}>
        <DialogContent className={cn("max-w-[500px] p-0 overflow-hidden rounded-[2rem] border-none shadow-2xl", isRTL && "font-arabic")}>
          <div className="p-8 pb-4 bg-slate-50 border-b">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black font-serif">
                {editingQuestionId ? t('edit_question') : t('new_question')}
              </DialogTitle>
              <DialogDescription>{t('question_setup_desc')}</DialogDescription>
            </DialogHeader>
          </div>
          
          <ScrollArea className="max-h-[70vh]">
            <div className="p-8 space-y-6">
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase tracking-widest text-slate-400">{t('question_text')}</Label>
                <textarea 
                  placeholder="..." 
                  className={cn("w-full min-h-[100px] rounded-xl bg-slate-50 border-slate-100 p-4 font-medium text-slate-800 focus:outline-none", isRTL && "text-right")} 
                  value={newQuestionText} 
                  onChange={e => setNewQuestionText(e.target.value)} 
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-widest text-emerald-600">{t('positive_indicator')}</Label>
                  <textarea 
                    placeholder="..." 
                    className={cn("w-full min-h-[80px] rounded-xl bg-emerald-50/30 border-emerald-100 p-3 text-xs font-medium text-slate-800 focus:outline-none", isRTL && "text-right")} 
                    value={newPositiveIndicator} 
                    onChange={e => setNewPositiveIndicator(e.target.value)} 
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase tracking-widest text-rose-600">{t('red_flag')}</Label>
                  <textarea 
                    placeholder="..." 
                    className={cn("w-full min-h-[80px] rounded-xl bg-rose-50/30 border-rose-100 p-3 text-xs font-medium text-slate-800 focus:outline-none", isRTL && "text-right")} 
                    value={newRedFlag} 
                    onChange={e => setNewRedFlag(e.target.value)} 
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-xs font-black uppercase tracking-widest text-slate-400">{t('assign_to_grades')}</Label>
                <div className="grid grid-cols-3 gap-2">
                  {(gradeList || []).map(grade => (
                    <div 
                      key={grade.id} 
                      className={cn(
                        "flex items-center gap-2 p-2 rounded-lg border transition-all cursor-pointer",
                        selectedQuestionGrades.includes(grade.name) ? "border-blue-600 bg-blue-50" : "border-slate-100 bg-white hover:border-slate-200"
                      )}
                      onClick={() => {
                        setSelectedQuestionGrades(prev => 
                          prev.includes(grade.name) ? prev.filter(g => g !== grade.name) : [...prev, grade.name]
                        );
                      }}
                    >
                      <Checkbox checked={selectedQuestionGrades.includes(grade.name)} />
                      <span className={cn("text-[10px] font-bold", selectedQuestionGrades.includes(grade.name) ? "text-blue-700" : "text-slate-500")}>
                        {grade.name}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-slate-400 italic">{t('no_grades_note')}</p>
              </div>
            </div>
          </ScrollArea>

          <div className="p-8 pt-4 flex gap-3 border-t bg-slate-50/50">
            <Button variant="outline" className="flex-1 h-12 rounded-xl font-bold" onClick={() => setIsAddQuestionDialogOpen(false)}>{t('cancel')}</Button>
            <Button className="flex-1 h-12 rounded-xl bg-blue-600 text-white font-bold" onClick={handleAddQuestion}>
              {editingQuestionId ? t('update_question') : t('add_question')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Employee Confirmation Alert Dialog */}
      <AlertDialog open={!!employeeToDelete} onOpenChange={(open) => { if (!open && !isDeletingEmployee) setEmployeeToDelete(null); }}>
        <AlertDialogContent className={cn("max-w-[460px] p-6 sm:p-7 rounded-[2rem] border border-slate-100 bg-white shadow-2xl", isRTL && "font-arabic")}>
          <div className="flex flex-col gap-4">
            <div className={cn("flex items-start gap-4", isRTL ? "text-right" : "text-left")}>
              <div className="h-12 w-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center shrink-0 text-rose-600">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div className="space-y-1.5 flex-1">
                <AlertDialogTitle className="text-xl font-black text-slate-900 font-serif">
                  {isRTL ? "تأكيد حذف الموظف" : "Confirm Employee Deletion"}
                </AlertDialogTitle>
                <AlertDialogDescription className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed">
                  {isRTL 
                    ? "هل أنت متأكد من رغبتك في حذف هذا الموظف؟ لا يمكن التراجع عن هذا الإجراء، وسيتم إلغاء وصول الموظف إلى النظام فوراً." 
                    : "Are you sure you want to delete this employee? This action cannot be undone and will permanently revoke all system access."}
                </AlertDialogDescription>
              </div>
            </div>

            {employeeToDelete && (
              <div className="p-4 bg-slate-50/80 border border-slate-200/80 rounded-2xl space-y-2.5 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-400 font-bold shrink-0">{isRTL ? "اسم الموظف:" : "Employee:"}</span>
                  <span className="font-bold text-slate-900 text-sm truncate">{employeeToDelete.name || employeeToDelete.firstName || "—"}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-400 font-bold shrink-0">{isRTL ? "البريد الإلكتروني:" : "Email:"}</span>
                  <span className="font-mono text-slate-700 text-[11px] font-semibold truncate">{employeeToDelete.email}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-400 font-bold shrink-0">{isRTL ? "الدور الوظيفي:" : "Role:"}</span>
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 font-bold text-[10px] px-2 py-0.5">
                    {getRoleLabel(employeeToDelete.role)}
                  </Badge>
                </div>
                {employeeToDelete.campus && (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-400 font-bold shrink-0">{isRTL ? "الفرع المخصص:" : "Campus:"}</span>
                    <span className="font-bold text-slate-700">{getCampusLabel(employeeToDelete.campus)}</span>
                  </div>
                )}
              </div>
            )}

            <div className={cn("flex items-center gap-3 pt-2", isRTL ? "flex-row-reverse" : "flex-row")}>
              <Button
                type="button"
                variant="outline"
                className="flex-1 h-12 rounded-xl font-bold border-slate-200 text-slate-700 hover:bg-slate-100"
                disabled={isDeletingEmployee}
                onClick={() => setEmployeeToDelete(null)}
              >
                {isRTL ? "إلغاء التراجع" : "Cancel"}
              </Button>
              <Button
                type="button"
                variant="destructive"
                className="flex-1 h-12 rounded-xl font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-600/20 gap-2"
                disabled={isDeletingEmployee}
                onClick={handleConfirmDeleteEmployee}
              >
                {isDeletingEmployee ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {isRTL ? "جاري الحذف..." : "Deleting..."}
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    {isRTL ? "نعم، حذف الموظف" : "Yes, Delete"}
                  </>
                )}
              </Button>
            </div>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
