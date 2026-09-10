
"use client"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAuth, useUser, useEmployee } from "@/firebase"
import { signOut } from "firebase/auth"
import { useRouter } from "next/navigation"
import { useLanguage } from "@/context/language-context"
import { User, Settings as SettingsIcon, LogOut } from "lucide-react"

export function UserNav() {
  const auth = useAuth()
  const { user } = useUser()
  const { employee, isDirector } = useEmployee()
  const router = useRouter()
  const { t, isRTL } = useLanguage()

  const handleLogout = async () => {
    try {
      await signOut(auth)
      router.push("/login")
    } catch (error) {
      console.error("Logout failed", error)
    }
  }

  if (!user || user.isAnonymous) return null

  const displayName = employee?.name || user.displayName || user.email?.split('@')[0] || "Staff"
  const initials = displayName.slice(0, 2).toUpperCase()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-12 w-12 rounded-full p-0">
          <Avatar className="h-12 w-12 border-2 border-orange-500 shadow-sm">
            <AvatarFallback className="bg-orange-500 text-white font-bold text-lg">{initials}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-60 rounded-2xl p-2 shadow-xl border-slate-100" align={isRTL ? "start" : "end"} forceMount>
        <DropdownMenuLabel className="font-normal p-3">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-black leading-none text-slate-900">{displayName}</p>
            <p className="text-xs leading-none text-slate-400 font-mono mt-1">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-slate-100 my-1" />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => router.push("/profile")} className="cursor-pointer rounded-xl font-bold py-2.5 px-3 flex items-center gap-2">
            <User className="h-4 w-4 text-slate-500" />
            {t('profile')}
          </DropdownMenuItem>
          {isDirector && (
            <DropdownMenuItem onClick={() => router.push("/settings")} className="cursor-pointer rounded-xl font-bold py-2.5 px-3 flex items-center gap-2">
              <SettingsIcon className="h-4 w-4 text-slate-500" />
              {t('settings')}
            </DropdownMenuItem>
          )}
        </DropdownMenuGroup>
        <DropdownMenuSeparator className="bg-slate-100 my-1" />
        <DropdownMenuItem onClick={handleLogout} className="text-rose-600 focus:text-rose-600 focus:bg-rose-50 cursor-pointer rounded-xl font-bold py-2.5 px-3 flex items-center gap-2">
          <LogOut className="h-4 w-4" />
          {t('logout')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
