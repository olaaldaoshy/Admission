"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  ChevronLeft, 
  Loader2, 
  CheckCircle2,
  Minus,
  Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { 
  useFirestore, 
  useDoc, 
  useCollection, 
  useMemoFirebase,
  useUser,
  useEmployee
} from "@/firebase";
import { doc, collection, query, where, updateDoc, arrayUnion } from "firebase/firestore";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/context/language-context";

function PrincipalParentAssessmentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const studentId = searchParams.get("id");
  const db = useFirestore();
  const { user } = useUser();
  const { employee } = useEmployee();
  const { toast } = useToast();
  const { t, isRTL } = useLanguage();

  const [scores, setScores] = React.useState<Record<string, number>>({});
  const [comments, setComments] = React.useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = React.useState(false);
  const [isInitialized, setIsInitialized] = React.useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = React.useState<'saved' | 'saving' | 'idle'>('idle');

  const latestDataRef = React.useRef<{ scores: Record<string, number>; comments: Record<string, string> }>({ scores: {}, comments: {} });
  const saveTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const studentRef = useMemoFirebase(() => studentId ? doc(db, "applications", studentId) : null, [db, studentId]);
  const { data: student, isLoading: isStudentLoading } = useDoc(studentRef);

  const questionsQuery = useMemoFirebase(() => query(collection(db, "interview_questions"), where("category", "==", "principal_parent")), [db]);
  const { data: rawQuestions = [], isLoading: isQuestionsLoading } = useCollection(questionsQuery);
  
  const questions = React.useMemo(() => {
    if (!student || !rawQuestions) return [];
    return rawQuestions.filter(q => !q.grades || q.grades.length === 0 || q.grades.includes(student.grade));
  }, [rawQuestions, student]);

  // Keep latestDataRef in sync with state
  React.useEffect(() => {
    latestDataRef.current = { scores, comments };
  }, [scores, comments]);

  // Load initial scores & comments from Firestore and merge with localStorage
  React.useEffect(() => {
    if (student && studentId && !isInitialized) {
      let loadedScores: Record<string, number> = { ...(student.oralScores || {}), ...(student.oralDraftScores || {}) };
      let loadedComments: Record<string, string> = { ...(student.oralItemComments || {}), ...(student.oralDraftComments || {}) };

      try {
        const localScoresStr = localStorage.getItem(`assessment_scores_${studentId}_principal_parent`);
        if (localScoresStr) {
          const localScores = JSON.parse(localScoresStr);
          loadedScores = { ...localScores, ...loadedScores };
        }
        const localCommentsStr = localStorage.getItem(`assessment_comments_${studentId}_principal_parent`);
        if (localCommentsStr) {
          const localComments = JSON.parse(localCommentsStr);
          loadedComments = { ...localComments, ...loadedComments };
        }
      } catch (e) {
        console.error("Failed to read local cache:", e);
      }

      setScores(loadedScores);
      setComments(loadedComments);
      latestDataRef.current = { scores: loadedScores, comments: loadedComments };
      setIsInitialized(true);
      if (Object.keys(loadedScores).length > 0) {
        setAutoSaveStatus('saved');
      }
    }
  }, [student, studentId, isInitialized]);

  // Direct Firestore flush
  const flushToFirestore = React.useCallback(async (scoresToSave: Record<string, number>, commentsToSave: Record<string, string>) => {
    if (!studentId || !studentRef) return;
    try {
      const values = Object.values(scoresToSave);
      const avg = values.length > 0 ? values.reduce((a, b) => a + (Number(b) || 0), 0) / values.length : 0;
      await updateDoc(studentRef, {
        oralScores: scoresToSave,
        oralDraftScores: scoresToSave,
        oralItemComments: commentsToSave,
        oralDraftComments: commentsToSave,
        ...(values.length > 0 ? { oralScoreObtained: avg } : {}),
        updatedAt: new Date().toISOString()
      });
      setAutoSaveStatus('saved');
    } catch (err) {
      console.error("Auto-save to Firestore failed:", err);
    }
  }, [studentId, studentRef]);

  // Auto-persist changes immediately to localStorage and debounced to Firestore
  const persistData = React.useCallback((newScores: Record<string, number>, newComments: Record<string, string>) => {
    if (!studentId) return;

    try {
      localStorage.setItem(`assessment_scores_${studentId}_principal_parent`, JSON.stringify(newScores));
      localStorage.setItem(`assessment_comments_${studentId}_principal_parent`, JSON.stringify(newComments));
    } catch (e) {
      console.error("Local storage error:", e);
    }

    setAutoSaveStatus('saving');

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      flushToFirestore(newScores, newComments);
    }, 300);
  }, [studentId, flushToFirestore]);

  // Flush on unmount and beforeunload
  React.useEffect(() => {
    const handleBeforeUnload = () => {
      if (studentId && studentRef && latestDataRef.current) {
        flushToFirestore(latestDataRef.current.scores, latestDataRef.current.comments);
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      if (studentId && studentRef && latestDataRef.current) {
        flushToFirestore(latestDataRef.current.scores, latestDataRef.current.comments);
      }
    };
  }, [studentId, studentRef, flushToFirestore]);

  const handleScoreChange = (qId: string, val: number) => {
    setScores(prev => {
      const updated = { ...prev, [qId]: val };
      persistData(updated, comments);
      return updated;
    });
  };

  const clearScore = (qId: string) => {
    setScores(prev => {
      const updated = { ...prev };
      delete updated[qId];
      persistData(updated, comments);
      return updated;
    });
  };

  const handleCommentChange = (qId: string, val: string) => {
    setComments(prev => {
      const updated = { ...prev, [qId]: val };
      persistData(scores, updated);
      return updated;
    });
  };

  const handleSaveFinal = async () => {
    if (!studentId || !studentRef) return;
    setIsSaving(true);
    try {
      const values = Object.values(scores);
      const avg = values.length > 0 ? values.reduce((a, b) => a + (Number(b) || 0), 0) / values.length : 0;
      const passed = avg >= 2.5;
      const nowIso = new Date().toISOString();
      const loggedUserName = employee?.name || user?.email?.split('@')[0] || "Principal";

      const historyEntry = {
        type: "Parent Oral Interview",
        scores: scores,
        comments: comments,
        scoreObtained: avg,
        result: passed ? "Passed" : "Failed",
        status: passed ? "Passed Parent Interview" : "Failed Parent Interview",
        savedBy: loggedUserName,
        createdAt: nowIso,
        date: format(new Date(), "yyyy-MM-dd"),
        time: format(new Date(), "HH:mm")
      };

      await updateDoc(studentRef, {
        oralScores: scores,
        oralItemComments: comments,
        oralScoreObtained: avg,
        oralResult: passed ? "Passed" : "Failed",
        status: passed ? "Passed Parent Interview" : "Failed Parent Interview",
        parentOralHistory: arrayUnion(historyEntry),
        updatedAt: nowIso
      });

      toast({ title: passed ? (isRTL ? "اجتاز مقابلة ولي الأمر" : "Parent Interview Passed") : (isRTL ? "لم يجتز مقابلة ولي الأمر" : "Parent Interview Failed") });
      setTimeout(() => router.push("/oral-interview"), 1000);
    } catch (err) {
      console.error("Error finalizing parent assessment:", err);
      toast({ variant: "destructive", title: isRTL ? "فشل الحفظ" : "Failed" });
    }
    finally { setIsSaving(false); }
  };

  // Calculations for bottom floating bar
  const totalQuestions = questions.length;
  const scoredCount = Object.keys(scores).length;
  const totalSum = Object.values(scores).reduce((a, b) => a + (Number(b) || 0), 0);
  const maxTotal = totalQuestions * 4;
  const sectionAverage = scoredCount > 0 ? totalSum / scoredCount : 0;
  const allAnswered = scoredCount === totalQuestions && totalQuestions > 0;

  // Position on the 1.0 to 4.0 scale (range 3.0)
  const markerPercentage = scoredCount > 0 
    ? Math.min(100, Math.max(0, ((sectionAverage - 1.0) / 3.0) * 100))
    : 0;

  const getScoreStatus = (avg: number) => {
    if (scoredCount === 0) return { label: t('not_scored'), color: "bg-slate-100 text-slate-500 border-slate-200" };
    if (avg < 2.0) return { label: t('red_flag'), color: "bg-rose-50 text-rose-700 border-rose-200" };
    if (avg < 2.5) return { label: t('below'), color: "bg-amber-50 text-amber-700 border-amber-200" };
    if (avg < 3.5) return { label: t('accept'), color: "bg-emerald-50 text-emerald-700 border-emerald-200" };
    return { label: t('strong'), color: "bg-green-50 text-green-700 border-green-200" };
  };

  const getScoreColor = (avg: number) => {
    if (scoredCount === 0) return "text-slate-400";
    if (avg < 2.0) return "text-rose-500";
    if (avg < 2.5) return "text-amber-500";
    if (avg < 3.5) return "text-emerald-600";
    return "text-green-700";
  };

  const scrollToFirstUnscored = () => {
    const firstUnscored = questions.find(q => scores[q.id] === undefined || scores[q.id] === null);
    if (firstUnscored) {
      const el = document.getElementById(`question-${firstUnscored.id}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('ring-2', 'ring-purple-500');
        setTimeout(() => el.classList.remove('ring-2', 'ring-purple-500'), 1500);
      }
    }
  };

  if (!studentId) return <div className="p-20 text-center text-slate-400 font-bold">No Student Selected</div>;
  if (isStudentLoading || isQuestionsLoading) return <div className="p-20 text-center text-slate-400 font-bold"><Loader2 className="animate-spin inline" /> Loading...</div>;

  const statusInfo = getScoreStatus(sectionAverage);

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-40 pt-6">
      {/* Student Info Header */}
      <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <Button variant="ghost" size="icon" className="h-12 w-12 rounded-2xl bg-slate-50 hover:bg-slate-100" onClick={() => router.back()}>
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <div>
            <h1 className="text-4xl font-black text-slate-900 font-serif mb-1">{student?.studentName}</h1>
            <p className="text-slate-400 font-bold uppercase tracking-tight text-xs">
              Grade {student?.grade} • {student?.campus ? `${student.campus} • ` : ''}{student?.school || 'N/A'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-100 px-4 py-1.5 rounded-full font-bold text-xs flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /> Oral: {student?.oralResult || 'PENDING'}
          </Badge>
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-100 px-4 py-1.5 rounded-full font-bold text-xs flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-blue-500" /> Status: {student?.status}
          </Badge>
        </div>
      </div>

      <div className="space-y-2 pt-4">
         <h2 className="text-2xl font-black text-slate-900 font-serif">Principal → Parent Interview</h2>
         <p className="text-sm text-slate-500 font-medium">Conducted by School Principal • {questions.length} questions • Assessing parental alignment and expectations. Slide or type a score from 1.0 to 4.0.</p>
      </div>

      {/* Questions list */}
      <div className="space-y-6">
        {questions.map((q, idx) => (
          <Card key={q.id} id={`question-${q.id}`} className="border border-slate-100 shadow-sm rounded-3xl bg-white overflow-hidden p-8 space-y-6 transition-all duration-300">
            <div className="flex items-start gap-4">
              <span className="text-slate-300 font-black text-xl leading-none mt-1">{(idx + 1).toString().padStart(2, '0')}</span>
              <h3 className="text-lg font-bold text-slate-900 leading-tight">
                {q.text}
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-xl space-y-1">
                  <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">{t('positive_indicator')}</p>
                  <p className="text-xs font-medium text-slate-700">{q.positiveIndicator || "No positive indicators specified."}</p>
               </div>
               <div className="p-4 bg-rose-50/50 border border-rose-100 rounded-xl space-y-1">
                  <p className="text-[10px] font-black text-rose-700 uppercase tracking-widest">{t('red_flag')}</p>
                  <p className="text-xs font-medium text-slate-700">{q.redFlag || "No red flags specified."}</p>
               </div>
            </div>

            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-6">
                <div className="flex-1 space-y-4">
                  <Slider 
                    value={[scores[q.id] || 1.0]} 
                    min={1.0} 
                    max={4.0} 
                    step={0.1} 
                    onValueChange={(vals) => handleScoreChange(q.id, vals[0])}
                    className="py-4 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                     <span>1 Red Flag</span>
                     <span>2 Below</span>
                     <span>3 Acceptable</span>
                     <span>4 Strong</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                   <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl bg-slate-50 border-slate-200 hover:bg-slate-100" onClick={() => clearScore(q.id)} title="Clear score">
                      <Minus className="h-4 w-4 text-slate-400" />
                   </Button>
                   <Badge variant="outline" className={cn(
                     "h-10 px-4 flex items-center justify-center rounded-xl font-bold border transition-colors",
                     scores[q.id] ? "bg-blue-50 text-blue-600 border-blue-200" : "bg-slate-50 text-slate-300 border-slate-100"
                   )}>
                     {scores[q.id] ? `${scores[q.id].toFixed(1)}` : t('not_scored')}
                   </Badge>
                </div>
              </div>

              <Textarea 
                placeholder="Add notes about parent response..." 
                value={comments[q.id] || ""} 
                onChange={(e) => handleCommentChange(q.id, e.target.value)} 
                className="rounded-xl bg-slate-50/30 border-slate-100 min-h-[80px] p-4 text-sm font-medium focus-visible:ring-blue-500/20" 
              />
            </div>
          </Card>
        ))}
      </div>

      {/* Floating Bottom Bar Matching the exact requirements */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-4xl px-4 z-50">
        <div className="bg-white/95 backdrop-blur-md border border-slate-200/90 p-4 sm:p-5 rounded-3xl shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex-1 w-full space-y-2.5">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-bold text-slate-600 text-sm">{t('section_average')}</span>
              <span className={cn("font-black text-xl tracking-tight ml-0.5", getScoreColor(sectionAverage))}>
                {scoredCount > 0 ? sectionAverage.toFixed(2) : "0.00"}
              </span>
              <Badge variant="outline" className={cn("font-bold text-[11px] px-2.5 py-0.5 rounded-md border", statusInfo.color)}>
                {statusInfo.label}
              </Badge>
              <span className="text-slate-400 font-semibold text-xs ml-1">
                {t('total_label')} {totalSum.toFixed(1)} / {maxTotal} · {scoredCount}/{totalQuestions} {t('scored_count_suffix')}
              </span>

              {/* Auto-save live indicator */}
              <div className="hidden md:flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 bg-slate-50 px-2.5 py-0.5 rounded-md border border-slate-200/60 ml-auto">
                {autoSaveStatus === 'saving' ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin text-amber-500" />
                    <span className="text-amber-600">{t('saving_changes')}</span>
                  </>
                ) : (
                  <>
                    <Check className="h-3 w-3 text-emerald-500" />
                    <span className="text-emerald-700">{t('saved_automatically')}</span>
                  </>
                )}
              </div>
            </div>

            {/* 4-segment colored progress bar with indicator line marker */}
            <div className="relative w-full h-2.5 rounded-full overflow-hidden flex bg-slate-100">
              {/* Red (1.0 - 2.0) */}
              <div className="h-full bg-rose-500 w-1/4" title="1.0 - 2.0 Red Flag" />
              {/* Orange/Amber (2.0 - 2.5) */}
              <div className="h-full bg-amber-500 w-1/4" title="2.0 - 2.5 Below" />
              {/* Teal/Light Green (2.5 - 3.5) */}
              <div className="h-full bg-emerald-500 w-1/4" title="2.5 - 3.5 Acceptable" />
              {/* Dark Green (3.5 - 4.0) */}
              <div className="h-full bg-emerald-700 w-1/4" title="3.5 - 4.0 Strong" />

              {/* Marker pin indicator */}
              {scoredCount > 0 && (
                <div 
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-1.5 h-4 bg-slate-900 rounded-full shadow-md z-10 transition-all duration-300"
                  style={{ left: `${markerPercentage}%` }}
                />
              )}
            </div>
          </div>

          {/* Action Button */}
          <div className="shrink-0 flex items-center gap-2 w-full sm:w-auto justify-end">
            {allAnswered ? (
              <Button 
                className="h-11 px-7 rounded-2xl font-black text-xs uppercase tracking-wider bg-slate-900 text-white hover:bg-slate-800 shadow-lg shadow-slate-900/10 gap-2 transition-all w-full sm:w-auto"
                onClick={handleSaveFinal} 
                disabled={isSaving}
              >
                {isSaving ? <Loader2 className="animate-spin h-4 w-4" /> : <><CheckCircle2 className="h-4 w-4" /> {t('finalize_results')}</>} 
              </Button>
            ) : (
              <Button 
                variant="outline"
                className="h-11 px-6 rounded-2xl font-black text-xs uppercase tracking-wider bg-slate-200/90 hover:bg-slate-300/90 text-slate-700 border-slate-300/60 shadow-sm transition-all w-full sm:w-auto"
                onClick={scrollToFirstUnscored}
              >
                {t('score_all')} {totalQuestions}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PrincipalParentAssessmentPage() {
  return (
    <React.Suspense fallback={<div className="p-20 text-center"><Loader2 className="animate-spin inline" /></div>}>
      <PrincipalParentAssessmentContent />
    </React.Suspense>
  );
}
