"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { 
  ShieldCheck, 
  Mail, 
  Lock, 
  ArrowRight,
  Loader2, 
  AlertCircle, 
  Globe, 
  UserPlus,
  Copy,
  Check,
  ExternalLink,
  Sparkles,
  CheckCircle2,
  FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  useAuth, 
  initiateGoogleSignIn,
  useUser, 
  useFirestore
} from "@/firebase";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail,
  signOut 
} from "firebase/auth";
import { collection, query, where, getDocs, getDoc, setDoc, deleteDoc, doc } from "firebase/firestore";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { useLanguage } from "@/context/language-context";

export default function LoginPage() {
  const router = useRouter();
  const auth = useAuth();
  const db = useFirestore();
  const { user, isUserLoading } = useUser();
  const { t, toggleLanguage, language } = useLanguage();
  const isRTL = language === 'ar';
  
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [resetSent, setResetSent] = React.useState(false);
  const [unauthorizedDomain, setUnauthorizedDomain] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);

  // Auto-redirect if already logged in and authorized
  React.useEffect(() => {
    if (!isUserLoading && user && !user.isAnonymous) {
      const checkAuth = async () => {
        try {
          const userEmail = user.email?.toLowerCase().trim();
          const employeesRef = collection(db, "employees");

          // Super Admin bootstrap fallback
          if (userEmail === 'omnia.taalab@nis-egypt.com') {
            await setDoc(doc(db, "employees", user.uid), {
              name: user.displayName || "Omnia Taalab",
              email: userEmail,
              role: "Director",
              campus: "All",
              status: "Active",
              isActive: true,
              uid: user.uid,
              updatedAt: new Date().toISOString()
            }, { merge: true });
            router.push("/applications");
            return;
          }

          // 1. Check if UID-indexed doc exists first
          const uidDocRef = doc(db, "employees", user.uid);
          const uidSnap = await getDoc(uidDocRef);
          
          if (uidSnap.exists() && uidSnap.data()?.isActive !== false) {
            router.push("/applications");
            return;
          }

          // 2. Fallback: Search for invite/employee record by email
          const q = query(employeesRef, where("email", "==", userEmail));
          const snap = await getDocs(q);
          
          // Case-insensitive lookup fallback across employees if not matched directly
          let matchedDoc = !snap.empty ? snap.docs[0] : null;
          if (!matchedDoc) {
            const allEmpSnap = await getDocs(employeesRef);
            matchedDoc = allEmpSnap.docs.find(d => {
              const data = d.data();
              return data.email && data.email.toString().toLowerCase().trim() === userEmail;
            }) || null;
          }

          if (!matchedDoc) {
            setError(isRTL 
              ? `البريد الإلكتروني (${user.email}) غير مسجل في قائمة الموظفين. يرجى من مدير النظام إضافتك أولاً من صفحة الإعدادات.` 
              : `The account (${user.email}) is not registered as an employee. Please ask the administrator to add you first in Settings.`);
            await signOut(auth);
            setIsGoogleLoading(false);
          } else {
            // User is registered/invited: activate and link to user.uid
            const inviteData = matchedDoc.data();
            await setDoc(doc(db, "employees", user.uid), {
              ...inviteData,
              uid: user.uid,
              email: userEmail,
              status: "Active",
              isActive: true,
              authProvider: "google",
              lastLoginAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }, { merge: true });

            // If the matched doc had a temporary generated ID, clean it up to prevent duplicates
            if (matchedDoc.id !== user.uid) {
              try {
                await deleteDoc(doc(db, "employees", matchedDoc.id));
              } catch (e) {
                console.log("Cleaned up temporary invite doc:", e);
              }
            }

            router.push("/applications");
          }
        } catch (err: any) {
          console.error("Auth check error:", err);
          if (err.code !== 'permission-denied') {
            setError(err.message || "Authentication check failed.");
          }
          setIsGoogleLoading(false);
        }
      };
      checkAuth();
    }
  }, [user, isUserLoading, router, db, auth, isRTL]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleGoogleSignIn = () => {
    setIsGoogleLoading(true);
    setError(null);
    initiateGoogleSignIn(
      auth,
      () => { /* Redirection handled by useEffect */ },
      (err: any) => {
        console.error("Google sign-in error:", err);
        const isUnauthorized = 
          err?.code === 'auth/unauthorized-domain' || 
          err?.message?.includes('unauthorized-domain');

        if (isUnauthorized) {
          const currentHost = typeof window !== 'undefined' ? window.location.hostname : 'run.app';
          setUnauthorizedDomain(currentHost);
          setError(null);
        } else {
          setError(isRTL 
            ? "تعذر تسجيل الدخول بحساب Google. يرجى المحاولة مرة أخرى أو استخدام البريد وكلمة المرور." 
            : "Google sign in failed. Please try again or use email and password.");
        }
        setIsGoogleLoading(false);
      }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setResetSent(false);

    const cleanEmail = email.toLowerCase().trim();
    if (!cleanEmail) {
      setError(isRTL ? "يرجى إدخال البريد الإلكتروني" : "Please enter your email");
      setIsLoading(false);
      return;
    }

    if (!password || password.length < 6) {
      setError(isRTL ? "يجب أن تتكون كلمة المرور من 6 أحرف على الأقل" : "Password must be at least 6 characters");
      setIsLoading(false);
      return;
    }

    try {
      const employeesRef = collection(db, "employees");
      const isSuperAdmin = cleanEmail === 'omnia.taalab@nis-egypt.com';

      // 1. Verify that this email is an authorized employee or superadmin
      let authorizedEmployeeData: any = null;
      let matchedDocId: string | null = null;

      if (isSuperAdmin) {
        authorizedEmployeeData = {
          name: "Omnia Taalab",
          email: cleanEmail,
          role: "Director",
          campus: "All",
          status: "Active",
          isActive: true
        };
      } else {
        // Look up by email in Firestore
        const q = query(employeesRef, where("email", "==", cleanEmail));
        const snap = await getDocs(q);
        if (!snap.empty) {
          authorizedEmployeeData = snap.docs[0].data();
          matchedDocId = snap.docs[0].id;
        } else {
          // Case-insensitive fallback across all employees
          const allDocs = await getDocs(employeesRef);
          const found = allDocs.docs.find(d => d.data().email?.toString().toLowerCase().trim() === cleanEmail);
          if (found) {
            authorizedEmployeeData = found.data();
            matchedDocId = found.id;
          }
        }
      }

      if (!authorizedEmployeeData) {
        setError(isRTL
          ? `البريد الإلكتروني (${cleanEmail}) غير مسجل في قائمة الموظفين. يرجى من مدير النظام إضافتك أولاً من صفحة الإعدادات.`
          : `The email (${cleanEmail}) is not registered in the employee directory. Please contact an administrator to add you in Settings.`);
        setIsLoading(false);
        return;
      }

      // 2. Try standard email sign-in first
      try {
        const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, password);
        const signedUser = userCredential.user;
        
        await setDoc(doc(db, "employees", signedUser.uid), {
          ...authorizedEmployeeData,
          uid: signedUser.uid,
          email: cleanEmail,
          status: "Active",
          isActive: true,
          authProvider: "password",
          lastLoginAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }, { merge: true });

        if (matchedDocId && matchedDocId !== signedUser.uid) {
          try { await deleteDoc(doc(db, "employees", matchedDocId)); } catch (_) {}
        }
        router.push("/applications");
      } catch (signInErr: any) {
        // If account doesn't exist in Firebase Auth yet, auto-create it with this password!
        if (signInErr.code === 'auth/user-not-found' || signInErr.code === 'auth/invalid-credential') {
          try {
            const newCred = await createUserWithEmailAndPassword(auth, cleanEmail, password);
            const newUser = newCred.user;
            
            await setDoc(doc(db, "employees", newUser.uid), {
              ...authorizedEmployeeData,
              uid: newUser.uid,
              email: cleanEmail,
              status: "Active",
              isActive: true,
              authProvider: "password",
              lastLoginAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            }, { merge: true });

            if (matchedDocId && matchedDocId !== newUser.uid) {
              try { await deleteDoc(doc(db, "employees", matchedDocId)); } catch (_) {}
            }
            router.push("/applications");
          } catch (createErr: any) {
            if (createErr.code === 'auth/email-already-in-use') {
              setError(isRTL ? "كلمة المرور غير صحيحة. يرجى التحقق من كلمة المرور الخاصة بك." : "Incorrect password. Please verify your password.");
            } else if (createErr.code === 'auth/weak-password') {
              setError(isRTL ? "كلمة المرور ضعيفة، يرجى كتابة 6 خانات على الأقل." : "Password is too weak. Please use at least 6 characters.");
            } else {
              setError(createErr.message || (isRTL ? "فشل إنشاء الحساب" : "Failed to initialize account"));
            }
          }
        } else if (signInErr.code === 'auth/wrong-password') {
          setError(isRTL ? "كلمة المرور غير صحيحة. يرجى التحقق من كلمة المرور الخاصة بك." : "Incorrect password. Please check your credentials.");
        } else {
          setError(signInErr.message || (isRTL ? "فشل تسجيل الدخول" : "Sign in failed"));
        }
      }
    } catch (err: any) {
      console.error("Submit error:", err);
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    const cleanEmail = email.toLowerCase().trim();
    if (!cleanEmail) {
      setError(isRTL ? "يرجى إدخال البريد الإلكتروني في الحقل أعلاه أولاً" : "Please enter your email in the field above first");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, cleanEmail);
      setResetSent(true);
      setError(null);
    } catch (err: any) {
      setError(err.message || (isRTL ? "تعذر إرسال رابط استعادة كلمة المرور" : "Failed to send password reset email"));
    }
  };

  return (
    <div className="min-h-[85vh] flex flex-col items-center justify-center p-4">
      <Button 
        variant="ghost" 
        onClick={toggleLanguage} 
        className="mb-8 rounded-full h-10 px-6 gap-2 font-bold text-slate-600 bg-white shadow-sm border border-slate-100 hover:bg-slate-50"
      >
        <Globe className="h-4 w-4 text-blue-600" />
        {language === 'en' ? 'العربية' : 'English'}
      </Button>

      <div className="w-full max-w-[480px] space-y-6 animate-in fade-in zoom-in duration-500">
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="h-20 w-20 bg-[#0a1a3a] rounded-[2rem] flex items-center justify-center shadow-2xl shadow-blue-900/20 mb-2">
            <ShieldCheck className="h-11 w-11 text-blue-400" />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 font-serif">
             {t('app_title')}
          </h1>
          <p className="text-slate-500 font-medium text-sm">
            {t('authorized_personnel_only')}
          </p>
        </div>

        <Card className="border-none shadow-2xl rounded-[2.5rem] bg-white overflow-hidden">
          <CardHeader className="pt-8 px-8 pb-4 text-center">
            <CardTitle className="text-2xl font-bold text-slate-900 font-serif">
              {t('staff_login')}
            </CardTitle>
            <CardDescription className="font-medium text-slate-400 mt-1">
              {isRTL ? "سجّل الدخول للوصول إلى لوحة الموظفين وإدارة الطلبات" : "Sign in to access staff portal and admission requests"}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-5 px-8 pb-8">
            {error && (
              <Alert variant="destructive" className="rounded-2xl bg-rose-50 border-rose-100 text-rose-700 border shadow-sm">
                <AlertCircle className="h-4 w-4 text-rose-600" />
                <AlertTitle className="font-bold">{t('access_issue')}</AlertTitle>
                <AlertDescription className="text-xs font-medium mt-1 leading-relaxed">{error}</AlertDescription>
              </Alert>
            )}

            {resetSent && (
              <Alert className="rounded-2xl bg-emerald-50 border-emerald-100 text-emerald-800 border shadow-sm">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <AlertTitle className="font-bold">{isRTL ? "تم إرسال الرابط" : "Reset Link Sent"}</AlertTitle>
                <AlertDescription className="text-xs font-medium mt-1">
                  {isRTL ? "تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني بنجاح." : "Password reset email has been sent to your address."}
                </AlertDescription>
              </Alert>
            )}

            {/* Google Sign-In Button */}
            <Button 
              type="button" 
              variant="outline" 
              className="w-full h-14 rounded-2xl border-slate-200 font-bold text-slate-700 gap-3 hover:bg-slate-50 transition-all shadow-sm"
              onClick={handleGoogleSignIn}
              disabled={isGoogleLoading || isLoading}
            >
              {isGoogleLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c1.61-3.32 2.51-7.46 2.51-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 12-4.53z" fill="#EA4335"/>
                </svg>
              )}
              {t('sign_in_gmail')}
            </Button>

            {/* Unauthorized Domain Explanation & Helper */}
            {unauthorizedDomain && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50/95 p-4 text-amber-950 shadow-sm space-y-3 animate-in fade-in duration-300">
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-amber-900">
                      {isRTL ? "مطلوب تصريح النطاق في إعدادات Firebase" : "Domain Authorization Required in Firebase"}
                    </h4>
                    <p className="text-[11px] text-amber-800 leading-relaxed">
                      {isRTL 
                        ? "Google Sign-In يتطلب إضافة نطاق Cloud Run إلى قائمة النطاقات المصرح بها (Authorized Domains) في مشروع Firebase (crmproject-4c6df)." 
                        : "Google Sign-In requires adding the Cloud Run domain to Authorized Domains in Firebase Authentication console (project: crmproject-4c6df)."}
                    </p>
                  </div>
                </div>

                <div className="bg-white/90 border border-amber-200 rounded-xl p-2.5 flex items-center justify-between gap-2">
                  <div className="flex flex-col min-w-0">
                    <span className="text-[9px] font-black text-amber-600 uppercase tracking-wider">
                      {isRTL ? "النطاق الشامل لإضافته" : "Domain to Add"}
                    </span>
                    <code className="text-xs font-mono font-bold text-slate-800 truncate">run.app</code>
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => copyToClipboard("run.app")}
                    className="h-8 text-xs font-bold gap-1 border-amber-300 text-amber-900 hover:bg-amber-100"
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? (isRTL ? "تم النسخ" : "Copied") : (isRTL ? "نسخ النطاق" : "Copy")}
                  </Button>
                </div>

                <div className="text-[10px] text-amber-800 space-y-1 bg-amber-100/50 p-2.5 rounded-lg">
                  <p className="font-bold">{isRTL ? "خطوات التفعيل السريعة (30 ثانية):" : "Quick Steps (30 seconds):"}</p>
                  <ol className="list-decimal list-inside space-y-0.5 text-amber-900 font-medium">
                    <li>{isRTL ? "افتح إعدادات Authentication في لوحة Firebase بالزر أدناه." : "Open Firebase Auth Settings using the button below."}</li>
                    <li>{isRTL ? "في تبويب Settings، انزل إلى Authorized domains واضغط Add domain." : "Under Settings tab, scroll to Authorized domains and click Add domain."}</li>
                    <li>{isRTL ? "الصق run.app واضغط حفظ." : "Paste run.app and click Save."}</li>
                  </ol>
                </div>

                <div className="flex gap-2 pt-1">
                  <Button 
                    asChild 
                    size="sm" 
                    className="bg-amber-600 hover:bg-amber-700 text-white font-bold h-9 text-xs flex-1 gap-1.5 rounded-xl shadow-sm"
                  >
                    <a 
                      href="https://console.firebase.google.com/project/crmproject-4c6df/authentication/settings" 
                      target="_blank" 
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      {isRTL ? "فتح إعدادات Firebase" : "Open Firebase Settings"}
                    </a>
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => setUnauthorizedDomain(null)}
                    className="text-amber-800 hover:bg-amber-100 text-xs font-medium h-9 rounded-xl"
                  >
                    {isRTL ? "إخفاء" : "Dismiss"}
                  </Button>
                </div>

                <div className="border-t border-amber-200/60 pt-2 text-[11px] text-amber-900 flex items-center gap-1.5 font-bold">
                  <Sparkles className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                  <span>
                    {isRTL 
                      ? "حل فوري: يمكنك تسجيل الدخول فوراً بالبريد وكلمة المرور بالأسفل دون انتظار!" 
                      : "Instant Alternative: You can sign in immediately using Email & Password below!"}
                  </span>
                </div>
              </div>
            )}

            <div className="relative my-2">
              <div className="absolute inset-0 flex items-center"><Separator className="w-full" /></div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-4 text-slate-400 font-bold">{t('or_credentials')}</span>
              </div>
            </div>

            {/* Email & Password Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="email" className="text-xs font-bold text-slate-700">{t('email')}</Label>
                  {/* Quick autofill for Director Omnia */}
                  <button
                    type="button"
                    onClick={() => { setEmail("omnia.taalab@nis-egypt.com"); setPassword("123456"); }}
                    className="text-[10px] font-bold text-blue-600 hover:underline"
                  >
                    {isRTL ? "مدير عام (Omnia Taalab)" : "Director (Omnia Taalab)"}
                  </button>
                </div>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300" />
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="name@nis-egypt.com" 
                    className="h-14 pl-12 rounded-2xl bg-slate-50 border-slate-100 font-medium" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    required 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-xs font-bold text-slate-700">{t('password')}</Label>
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="text-[10px] font-bold text-slate-400 hover:text-blue-600"
                  >
                    {isRTL ? "نسيت كلمة المرور؟" : "Forgot password?"}
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300" />
                  <Input 
                    id="password" 
                    type="password" 
                    placeholder="••••••••" 
                    className="h-14 pl-12 rounded-2xl bg-slate-50 border-slate-100" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    required 
                  />
                </div>
                <p className="text-[10px] text-slate-400 font-medium px-1">
                  {isRTL 
                    ? "إذا كانت هذه أول مرة تسجل فيها بالبريد، سيتم اعتماد كلمة المرور هذه لحسابك تلقائياً." 
                    : "If this is your first time signing in with email, this password will be set for your account automatically."}
                </p>
              </div>

              <Button 
                type="submit" 
                className="w-full h-14 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-base shadow-xl shadow-blue-600/20 gap-2 group mt-2" 
                disabled={isLoading || isGoogleLoading}
              >
                {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                  <>
                    {t('sign_in')} 
                    <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Public Application Form Link */}
        <div className="bg-white border border-slate-200/80 rounded-[2rem] p-5 flex items-center justify-between gap-4 shadow-sm hover:border-blue-200 transition-colors">
          <div className="flex items-center gap-3.5">
            <div className="h-11 w-11 rounded-2xl bg-[#0a1a3a] flex items-center justify-center text-white shrink-0 shadow-sm">
              <FileText className="h-5 w-5" />
            </div>
            <div className="text-left">
              <p className="text-xs font-black text-slate-800 tracking-wide">
                {isRTL ? "تقديم طلب التحاق جديد" : "New Student Admission"}
              </p>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                {isRTL ? "استمارة التقديم الإلكترونية وحجز الموعد" : "Fill online admission form & book assessment"}
              </p>
            </div>
          </div>
          <Button
            id="login-open-form-btn"
            variant="outline"
            size="sm"
            onClick={() => router.push('/application-form')}
            className="h-10 px-4 rounded-xl font-bold border-slate-200 text-blue-700 hover:bg-blue-50 shrink-0 gap-1.5"
          >
            <span>{isRTL ? "فتح الاستمارة" : "Open Form"}</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
