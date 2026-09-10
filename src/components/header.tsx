
"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { 
  Menu, 
  Users, 
  UserRound, 
  CheckCircle2, 
  MessageSquare, 
  BarChart3,
  ShieldCheck,
  ClipboardList,
  Settings,
  LogIn,
  AlertCircle,
  Globe,
  TrendingUp
} from "lucide-react"
import { UserNav } from "@/components/user-nav"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet"
import { useUser, useEmployee } from "@/firebase"
import { Badge } from "@/components/ui/badge"
import { useLanguage } from "@/context/language-context"

const navLinks = [
  { href: "/applications", label: "nav_applications", icon: Users },
  { href: "/sales", label: "nav_sales", icon: TrendingUp },
  { href: "/interview-assessment", label: "nav_assessment", icon: ClipboardList },
  { href: "/oral-interview", label: "nav_oral_interview", icon: UserRound },
  { href: "/final-result", label: "nav_final_result", icon: MessageSquare },
  { href: "/school-enrollment", label: "nav_enrollment", icon: CheckCircle2 },
  { href: "/reports", label: "nav_analytics", icon: BarChart3 },
  { href: "/settings", label: "nav_settings", icon: Settings },
]

export function Header() {
  const pathname = usePathname()
  const [mounted, setMounted] = React.useState(false)
  const { user } = useUser()
  const { employee, isSales, isSalesManager, isDirector, isAuthorized, isLoading } = useEmployee()
  const { t, language, toggleLanguage, isRTL } = useLanguage()

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const isLoginPage = pathname === '/login'
  const isApplicationForm = pathname === '/application-form'
  const isAssessmentPage = pathname === '/blank' || pathname === '/principal-parent-assessment' || pathname === '/principal-student-assessment'

  if (isLoginPage || isApplicationForm) return null
  if (!mounted) return <header className="w-full bg-white shadow-sm h-20 md:h-36" />

  const roleLabel = employee?.role || "Staff"

  const filteredLinks = navLinks.filter(link => {
    if (!isAuthorized) return false;
    
    // SALES TAB: Visible strictly to Sales roles only
    if (link.href === "/sales") {
      return isSales || isSalesManager;
    }

    // If user is a Sales role, they ONLY see the Sales tab
    if (isSales || isSalesManager) {
      return link.href === "/sales";
    }

    // DIRECTOR-ONLY TABS: Reports and Settings
    const directorOnlyTabs = ["/reports", "/settings"];
    if (directorOnlyTabs.includes(link.href)) {
      return isDirector;
    }

    // ADMISSIONS TABS (Applications, Assessment, etc.):
    // Visible to Director, Manager, and Employee (Admissions staff)
    return true;
  });

  return (
    <header className={cn("w-full bg-white shadow-sm print:hidden", isRTL && "font-arabic")}>
      <div className="container flex h-20 items-center justify-between px-4 md:px-10 max-w-full">
        <Link href="/applications" className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#0a1a3a] shadow-md shadow-blue-900/10">
             <ShieldCheck className="h-8 w-8 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-2xl font-black tracking-tight text-[#1a1a1a] font-serif leading-none mb-1">{t('app_title')}</span>
            <span className="text-[10px] text-slate-400 font-black uppercase tracking-0.2em leading-none">{t('admin_portal')}</span>
          </div>
        </Link>
        
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={toggleLanguage} 
            className="rounded-full h-10 px-4 gap-2 font-bold text-slate-600 hover:bg-slate-100"
          >
            <Globe className="h-4 w-4" />
            {language === 'en' ? 'العربية' : 'English'}
          </Button>

          {user && !user.isAnonymous ? (
            <>
              {isAuthorized ? (
                <>
                  <div className="hidden md:flex items-center gap-4 mr-2">
                    <div className={cn("flex flex-col", isRTL ? "items-start text-left" : "items-end text-right")}>
                      <span className="text-sm font-black text-[#1a1a1a] mb-1">{employee?.name || user.email?.split('@')[0]}</span>
                      <Badge variant="outline" className={cn(
                        "h-7 px-4 rounded-lg font-bold border-none shadow-none text-[11px]",
                        roleLabel === "Director" ? "bg-blue-50 text-blue-600" :
                        roleLabel.includes("Sales") ? "bg-orange-50 text-orange-600" :
                        "bg-slate-100 text-slate-600"
                      )}>
                        {roleLabel}
                      </Badge>
                    </div>
                  </div>
                  <UserNav />
                </>
              ) : (
                <div className="flex items-center gap-3 bg-rose-50 px-4 py-2 rounded-xl border border-rose-100">
                  <AlertCircle className="h-4 w-4 text-rose-500" />
                  <span className="text-xs font-bold text-rose-600">{t('unauthorized_account')}</span>
                  <UserNav />
                </div>
              )}
            </>
          ) : (
            <Link href="/login">
              <Button className="rounded-xl bg-blue-600 hover:bg-blue-700 font-bold gap-2">
                <LogIn className="h-4 w-4" /> {t('staff_login')}
              </Button>
            </Link>
          )}
          
          {isAuthorized && (
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side={isRTL ? "right" : "left"}>
                <SheetHeader className="sr-only">
                  <SheetTitle>{t('nav_menu')}</SheetTitle>
                  <SheetDescription>{t('nav_menu_description')}</SheetDescription>
                </SheetHeader>
                <nav className="grid gap-4 py-4 mt-6">
                  {filteredLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md",
                        pathname === link.href ? "bg-primary text-white" : "text-[#1a1a1a] hover:bg-muted"
                      )}
                    >
                      <link.icon className="h-4 w-4" />
                      {t(link.label as any)}
                    </Link>
                  ))}
                </nav>
              </SheetContent>
            </Sheet>
          )}
        </div>
      </div>

      {isAuthorized && !isLoading && !pathname?.startsWith('/students/') && !isAssessmentPage && (
        <div className="bg-[#f4f4f4] border-y border-slate-200 hidden md:block">
          <div className="container px-0 max-w-full">
            <nav className="flex h-16 items-center">
              {filteredLinks.map((link) => {
                const isActive = pathname === link.href
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "flex-1 flex flex-col items-center justify-center gap-1 transition-all h-full px-4",
                      isActive ? "bg-[#2563eb] text-white" : "text-[#1a1a1a] hover:text-blue-600 hover:bg-slate-200/50"
                    )}
                  >
                    <link.icon className={cn("h-5 w-5", isActive ? "text-white" : "text-[#1a1a1a]/60")} />
                    <span className={cn(
                      "text-[10px] font-black uppercase tracking-0.1em text-center leading-tight",
                      isActive ? "text-white" : "text-[#1a1a1a]"
                    )}>
                      {t(link.label as any)}
                    </span>
                  </Link>
                )
              })}
            </nav>
          </div>
        </div>
      )}
    </header>
  )
}
