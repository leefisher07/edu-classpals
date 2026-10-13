'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/lib/stores/auth-store'
import { classesApi } from '@/lib/api/classes'
import { authApi } from '@/lib/api/auth'
import { refreshAccessToken } from '@/lib/api-client'
import { useActiveClass } from '@/lib/hooks/use-active-class'
import { ClientOnly } from '@/components/client-only'
import { ClassSwitchConfirmDialog } from '@/components/dashboard/class-switch-confirm-dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import {
  Users, LayoutGrid, PawPrint, UsersRound, ChevronDown, LogOut,
  Menu, Loader2, ShoppingBag, ListChecks, Wrench, FileText, Cog,
  User, HelpCircle, Lock, Share2, FolderKanban,
} from 'lucide-react'

type NavItem = {
  href: string
  label: string
  description: string
  icon: any
  featured?: boolean
  matchPaths?: string[]
}

type NavGroup = {
  key: string
  label: string
  icon: any
  items: NavItem[]
}

const navGroups: NavGroup[] = [
  {
    key: 'class-management',
    label: '班级管理',
    icon: FolderKanban,
    items: [
      { href: '/dashboard', label: '班级看板', description: '班级总览与关键数据看板入口', icon: LayoutGrid, featured: true },
      { href: '/dashboard/students', label: '学生管理', description: '维护学生名单与积分状态', icon: Users, featured: true },
      { href: '/dashboard/groups', label: '小组管理', description: '管理分组与组内成员', icon: UsersRound },
      { href: '/dashboard/records', label: '积分明细', description: '查看学生积分记录与筛选', icon: FileText, featured: true },
      { href: '/dashboard/rules', label: '积分规则', description: '配置班级积分增减规则', icon: ListChecks },
    ],
  },
  {
    key: 'pet-management',
    label: '宠物管理',
    icon: PawPrint,
    items: [
      { href: '/dashboard/pets', label: '宠物世界', description: '日常领养与经验操作入口', icon: PawPrint, featured: true, matchPaths: ['/dashboard/pets', '/dashboard/pets/gallery'] },
      { href: '/dashboard/pets/settings', label: '宠物设置', description: '配置成长阈值与宠物规则', icon: Cog },
      { href: '/dashboard/pets/records', label: '经验明细', description: '查看宠物经验变更记录', icon: FileText, featured: true },
      { href: '/dashboard/share', label: '分享家长', description: '管理家长端展示与分享', icon: Share2 },
      { href: '/dashboard/shop', label: '积分商店', description: '管理奖励兑换与商店配置', icon: ShoppingBag, featured: true },
    ],
  },
  {
    key: 'tools',
    label: '便捷工具',
    icon: Wrench,
    items: [
      { href: '/dashboard/tools', label: '辅助工具', description: '集中使用各类课堂便捷工具', icon: Wrench },
    ],
  },
]

const helpCenterUrl = process.env.NEXT_PUBLIC_HELP_CENTER_URL

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const queryClient = useQueryClient()
  const { isAuthenticated, hasHydrated, user, refreshToken, tokenExpiresAt, clearAuth, updateUser, setCurrentClassId } = useAuthStore()
  const { classes, currentClass, activeClassId } = useActiveClass()
  const currentClassId = activeClassId ?? user?.currentClassId ?? null

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [openDesktopNavGroup, setOpenDesktopNavGroup] = useState<string | null>(null)
  const [userCenterOpen, setUserCenterOpen] = useState(false)
  const [editProfileOpen, setEditProfileOpen] = useState(false)
  const [changePasswordOpen, setChangePasswordOpen] = useState(false)
  const [isLocked, setIsLocked] = useState(false)
  const [editUsername, setEditUsername] = useState(user?.username || '')
  const [redeemCode, setRedeemCode] = useState('')
  const [redeemError, setRedeemError] = useState('')
  const [redeemSuccess, setRedeemSuccess] = useState('')
  const [redeeming, setRedeeming] = useState(false)
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pendingClass, setPendingClass] = useState<any>(null)
  const [classSwitching, setClassSwitching] = useState(false)

  useEffect(() => {
    if (!hasHydrated) return
    if (!isAuthenticated) router.push('/')
  }, [hasHydrated, isAuthenticated, router])
  useEffect(() => {
    if (!hasHydrated || !isAuthenticated || !refreshToken || !tokenExpiresAt) {
      return
    }

    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | null = null
    const refreshBufferMs = 2 * 60 * 1000

    const scheduleRefresh = async () => {
      const delay = Math.max(tokenExpiresAt - Date.now() - refreshBufferMs, 0)

      timer = setTimeout(async () => {
        if (cancelled) return

        const refreshed = await refreshAccessToken()
        if (!refreshed && !cancelled) {
          router.push('/')
        }
      }, delay)
    }

    scheduleRefresh()

    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [hasHydrated, isAuthenticated, refreshToken, tokenExpiresAt, router])

  const isPermanentLicense = user?.licenseType === 'PERMANENT'
  const licenseLabel = user?.licenseName || (isPermanentLicense ? '永久版' : user?.licenseType === 'TIME_LIMITED' ? '期限版' : '未激活')
  const licenseExpiryLabel = isPermanentLicense ? '永久有效' : (user?.accountExpiresAt ? new Date(user.accountExpiresAt).toLocaleString('zh-CN') : '未设置')
  const remainingDaysLabel = useMemo(() => {
    if (isPermanentLicense || !user?.accountExpiresAt) return ''
    const diff = new Date(user.accountExpiresAt).getTime() - Date.now()
    if (diff <= 0) return '已过期'
    const days = Math.ceil(diff / (24 * 60 * 60 * 1000))
    return days === 1 ? '剩余 1 天' : `剩余 ${days} 天`
  }, [isPermanentLicense, user?.accountExpiresAt])
  const isNavItemActive = (item: NavItem) => {
    const matchPaths = item.matchPaths || [item.href]
    return matchPaths.some((path) => pathname === path)
  }

  const findActiveGroup = () => {
    return navGroups.find((group) =>
      group.items.some((item) => isNavItemActive(item))
    )
  }
  const activeGroup = findActiveGroup()

  const handleClassSwitch = async (cls: any) => {
    const nextClassId = cls.id
    if (!nextClassId || nextClassId === currentClassId) return
    setPendingClass(cls)
  }

  const confirmClassSwitch = async () => {
    if (!pendingClass?.id || pendingClass.id === currentClassId || classSwitching) return

    const nextClassId = pendingClass.id
    setClassSwitching(true)

    try {
      setCurrentClassId(nextClassId)
      const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '')
      params.set('classId', nextClassId)
      const nextUrl = `${pathname}?${params.toString()}`
      router.replace(nextUrl)

      await classesApi.activate(nextClassId)
      const latestClasses = await classesApi.list()
      queryClient.setQueryData(['classes'], latestClasses)
      await queryClient.invalidateQueries({ queryKey: ['classes'] })
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['students', nextClassId] }),
        queryClient.invalidateQueries({ queryKey: ['groups', nextClassId] }),
        queryClient.invalidateQueries({ queryKey: ['class-records', nextClassId] }),
        queryClient.invalidateQueries({ queryKey: ['student-ranking', nextClassId] }),
        queryClient.invalidateQueries({ queryKey: ['group-ranking', nextClassId] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard-overview', nextClassId] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard-ranking', nextClassId] }),
        queryClient.invalidateQueries({ queryKey: ['shop-items', nextClassId] }),
        queryClient.invalidateQueries({ queryKey: ['student-exchanges', nextClassId] }),
        queryClient.invalidateQueries({ queryKey: ['shop-exchanges', nextClassId] }),
        queryClient.invalidateQueries({ queryKey: ['class-pets', nextClassId] }),
        queryClient.invalidateQueries({ queryKey: ['pet-settings', nextClassId] }),
      ])
      setPendingClass(null)
      setMobileMenuOpen(false)
    } catch (error) {
      console.error('Switch class error:', error)
    } finally {
      setClassSwitching(false)
    }
  }

  const appendClassId = (href: string) => {
    if (!currentClassId || !href.startsWith('/dashboard')) return href
    if (href.includes('classId=')) return href
    const separator = href.includes('?') ? '&' : '?'
    return `${href}${separator}classId=${encodeURIComponent(currentClassId)}`
  }

  const handleLogout = () => {
    clearAuth()
    router.push('/')
  }

  const handleRedeemCode = async () => {
    if (!redeemCode.trim()) {
      setRedeemError('请输入使用授权码')
      setRedeemSuccess('')
      return
    }

    setRedeeming(true)
    setRedeemError('')
    setRedeemSuccess('')
    try {
      const response = await authApi.redeemCode(redeemCode.trim().toUpperCase())
      updateUser(response.user)
      setRedeemCode('')
      setRedeemSuccess(response.message)
    } catch (error: any) {
      setRedeemError(error?.message || '续费失败，请稍后重试')
    } finally {
      setRedeeming(false)
    }
  }

  if (!hasHydrated || !isAuthenticated) return null

  const fallback = (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  )

  if (isLocked) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <Lock className="w-10 h-10 text-primary" />
          </div>
          <h2 className="text-xl font-semibold">屏幕已锁定</h2>
          <p className="text-muted-foreground">点击下方按钮解锁</p>
          <Button onClick={() => setIsLocked(false)} className="mt-4">解锁屏幕</Button>
        </div>
      </div>
    )
  }

  return (
    <ClientOnly fallback={fallback}>
      <div className="min-h-screen bg-background">
        {/* 顶部导航栏 */}
        <header className="sticky top-0 z-50 border-b bg-card shadow-sm">
          <div className="flex h-16 items-center gap-4 px-4 lg:px-6">
            {/* Logo */}
            <Link href="/dashboard" className="flex items-center gap-2 shrink-0">
              <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
                <Users className="w-5 h-5 text-primary-foreground" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-lg font-bold text-foreground leading-tight">ClassPals</h1>
                <p className="text-xs text-muted-foreground">让管理更简单</p>
              </div>
            </Link>

            {/* 桌面端导航 */}
            <nav className="hidden lg:flex items-center gap-2 ml-4 flex-1 overflow-x-auto">
              {navGroups.map((group) => {
                const isGroupActive = activeGroup?.key === group.key
                const featuredItems = group.items.filter((item) => item.featured)
                const regularItems = group.items.filter((item) => !item.featured)
                return (
                  <DropdownMenu
                    key={group.key}
                    open={openDesktopNavGroup === group.key}
                    onOpenChange={(open) => setOpenDesktopNavGroup(open ? group.key : null)}
                  >
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        className={cn(
                          'group h-11 rounded-2xl px-4 gap-2 text-sm font-medium whitespace-nowrap border transition-all shadow-sm',
                          isGroupActive
                            ? 'border-primary/30 bg-gradient-to-r from-primary/15 to-primary/5 text-primary shadow-primary/10'
                            : 'border-slate-200/80 bg-white text-muted-foreground hover:text-foreground hover:border-slate-300 hover:bg-slate-50'
                        )}
                      >
                        <group.icon className={cn('w-4 h-4', isGroupActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground')} />
                        {group.label}
                        <ChevronDown className="w-4 h-4 opacity-60" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-[620px] rounded-3xl border border-slate-200 p-0 shadow-xl overflow-hidden">
                      <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            'flex h-10 w-10 items-center justify-center rounded-2xl',
                            isGroupActive ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-600'
                          )}>
                            <group.icon className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-base font-semibold text-slate-900">{group.label}</p>
                            <p className="text-xs text-slate-500">按功能聚合入口，提升操作便捷性与理解性</p>
                          </div>
                        </div>
                      </div>

                      <div className="p-4 space-y-4 bg-white">
                        {featuredItems.length > 0 && (
                          <div>
                            <div className="mb-2 flex items-center justify-between px-1">
                              <p className="text-xs font-semibold tracking-wide text-slate-500">常用入口</p>
                              <Badge variant="secondary" className="rounded-full px-2 py-0.5 text-[11px]">推荐</Badge>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              {featuredItems.map((item) => {
                                const isItemActive = isNavItemActive(item)
                                return (
                                  <Link
                                    key={item.href}
                                    href={appendClassId(item.href)}
                                    onClick={() => setOpenDesktopNavGroup(null)}
                                    className={cn(
                                      'flex items-start gap-3 rounded-2xl border p-3 transition-colors',
                                      isItemActive
                                        ? 'border-primary/20 bg-primary/5'
                                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/80'
                                    )}
                                  >
                                    <div className={cn(
                                      'mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl',
                                      isItemActive ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-600'
                                    )}>
                                      <item.icon className="w-4 h-4" />
                                    </div>
                                    <div className="min-w-0">
                                      <p className={cn('text-sm font-medium', isItemActive ? 'text-primary' : 'text-slate-900')}>
                                        {item.label}
                                      </p>
                                      <p className="mt-1 text-xs text-slate-500 leading-5">
                                        {item.description}
                                      </p>
                                    </div>
                                  </Link>
                                )
                              })}
                            </div>
                          </div>
                        )}

                        {regularItems.length > 0 && (
                          <div>
                            <p className="mb-2 px-1 text-xs font-semibold tracking-wide text-slate-500">更多入口</p>
                            <div className="grid grid-cols-2 gap-2">
                              {regularItems.map((item) => {
                                const isItemActive = isNavItemActive(item)
                                return (
                                  <Link
                                    key={item.href}
                                    href={appendClassId(item.href)}
                                    onClick={() => setOpenDesktopNavGroup(null)}
                                    className={cn(
                                      'flex items-start gap-3 rounded-2xl border p-3 transition-colors',
                                      isItemActive
                                        ? 'border-primary/20 bg-primary/5'
                                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/80'
                                    )}
                                  >
                                    <div className={cn(
                                      'mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl',
                                      isItemActive ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-600'
                                    )}>
                                      <item.icon className="w-4 h-4" />
                                    </div>
                                    <div className="min-w-0">
                                      <p className={cn('text-sm font-medium', isItemActive ? 'text-primary' : 'text-slate-900')}>
                                        {item.label}
                                      </p>
                                      <p className="mt-1 text-xs text-slate-500 leading-5">
                                        {item.description}
                                      </p>
                                    </div>
                                  </Link>
                                )
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )
              })}
            </nav>

            {/* 右侧操作区 */}
            <div className="flex items-center gap-2 ml-auto shrink-0">
              {/* 班级选择器 */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="hidden sm:flex gap-2 max-w-[160px]">
                    <span className="text-sm text-muted-foreground">班级:</span>
                    <span className="font-medium truncate">{currentClass?.name || '未选择'}</span>
                    <ChevronDown className="w-4 h-4 opacity-50 shrink-0" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  {classes.map((cls: any) => (
                    <DropdownMenuItem
                      key={cls.id}
                      onClick={() => handleClassSwitch(cls)}
                      disabled={classSwitching}
                      className={cn(currentClass?.id === cls.id && 'bg-primary/10 text-primary')}
                    >
                      {cls.name}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => router.push('/dashboard/classes')}>
                    管理班级
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* 用户菜单 */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="gap-2 px-2">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-medium text-primary">
                        {(user?.username || user?.phone || '用')?.charAt(0)}
                      </span>
                    </div>
                    <span className="hidden md:block text-sm max-w-[80px] truncate">
                      {user?.username || user?.phone || '用户'}
                    </span>
                    <ChevronDown className="w-4 h-4 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => setUserCenterOpen(true)}>
                    <User className="w-4 h-4 mr-2" />用户中心
                  </DropdownMenuItem>
                  {helpCenterUrl && (
                    <DropdownMenuItem asChild>
                      <a href={helpCenterUrl} target="_blank" rel="noopener noreferrer">
                        <HelpCircle className="w-4 h-4 mr-2" />帮助中心
                      </a>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => setIsLocked(true)}>
                    <Lock className="w-4 h-4 mr-2" />锁定屏幕
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive" onClick={handleLogout}>
                    <LogOut className="w-4 h-4 mr-2" />退出登录
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* 移动端菜单 */}
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="lg:hidden">
                    <Menu className="w-5 h-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-72 p-0">
                  <div className="flex flex-col h-full">
                    <div className="flex items-center gap-2 p-4 border-b">
                      <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
                        <Users className="w-5 h-5 text-primary-foreground" />
                      </div>
                      <div>
                        <h1 className="text-lg font-bold">ClassPals</h1>
                        <p className="text-xs text-muted-foreground">让管理更简单</p>
                      </div>
                    </div>
                    <div className="p-4 border-b">
                      <p className="text-xs text-muted-foreground mb-2">当前班级</p>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" className="w-full justify-between">
                            {currentClass?.name || '未选择'}
                            <ChevronDown className="w-4 h-4 opacity-50" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-56">
                          {classes.map((cls: any) => (
                            <DropdownMenuItem
                              key={cls.id}
                              onClick={() => handleClassSwitch(cls)}
                              disabled={classSwitching}
                            >
                              {cls.name}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <nav className="flex-1 p-4 overflow-auto">
                      <div className="space-y-4">
                        {navGroups.map((group) => {
                          const isGroupActive = activeGroup?.key === group.key
                          return (
                            <div key={group.key} className="space-y-2">
                              <div className={cn(
                                'flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold',
                                isGroupActive ? 'bg-primary/10 text-primary' : 'text-foreground'
                              )}>
                                <group.icon className="w-4 h-4" />
                                {group.label}
                              </div>
                              <ul className="space-y-1">
                                {group.items.map((item) => {
                                  const isActive = isNavItemActive(item)
                                  return (
                                    <li key={item.href}>
                                      <Link
                                        href={appendClassId(item.href)}
                                        onClick={() => setMobileMenuOpen(false)}
                                        className={cn(
                                          'flex items-start gap-3 rounded-xl px-3 py-3 text-sm transition-colors',
                                          isActive
                                            ? 'bg-primary/10 text-primary'
                                            : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                                        )}
                                      >
                                        <item.icon className="w-5 h-5 mt-0.5 shrink-0" />
                                        <div className="min-w-0">
                                          <p className="font-medium">{item.label}</p>
                                          <p className="text-xs text-muted-foreground mt-1 leading-5">{item.description}</p>
                                        </div>
                                      </Link>
                                    </li>
                                  )
                                })}
                              </ul>
                            </div>
                          )
                        })}
                      </div>
                    </nav>
                    <div className="p-4 border-t">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-medium text-primary">
                            {(user?.username || user?.phone || '用')?.charAt(0)}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{user?.username || user?.phone}</p>
                          <p className="text-xs text-muted-foreground">已登录</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </header>

        {/* 主内容区 */}
        <main className="flex-1">
          {children}
        </main>

        <ClassSwitchConfirmDialog
          open={!!pendingClass}
          targetClassName={pendingClass?.name}
          isPending={classSwitching}
          onOpenChange={(open) => {
            if (!open && !classSwitching) {
              setPendingClass(null)
            }
          }}
          onConfirm={confirmClassSwitch}
        />

        {/* 用户中心 */}
        <Dialog open={userCenterOpen} onOpenChange={(open) => {
          setUserCenterOpen(open)
          if (open) {
            setRedeemError('')
            setRedeemSuccess('')
          }
        }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>用户中心</DialogTitle></DialogHeader>
            <div className="space-y-6">
              <div className="rounded-lg border p-4 space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">当前账号</p>
                  <p className="text-xl font-semibold">{user?.username || user?.phone}</p>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-md bg-muted/50 p-3">
                    <p className="text-muted-foreground mb-1">许可证类型</p>
                    <p className="font-medium">{licenseLabel}</p>
                  </div>
                  <div className="rounded-md bg-muted/50 p-3">
                    <p className="text-muted-foreground mb-1">到期时间</p>
                    <p className="font-medium">{licenseExpiryLabel}</p>
                  </div>
                </div>
                {!isPermanentLicense && remainingDaysLabel && (
                  <p className="text-sm text-amber-600">{remainingDaysLabel}</p>
                )}
                {user?.lastLoginAt && (
                  <p className="text-sm text-muted-foreground">最近登录：{new Date(user.lastLoginAt).toLocaleString('zh-CN')}</p>
                )}
              </div>

              <div className="rounded-lg border p-4 space-y-3">
                <div>
                  <p className="text-sm font-medium">输入使用授权码</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    可在此完成续费或升级；永久有效账号不可再次输入使用授权码。
                  </p>
                </div>
                <Input
                  value={redeemCode}
                  onChange={(e) => setRedeemCode(e.target.value.toUpperCase())}
                  placeholder={isPermanentLicense ? '当前账号已永久有效' : '请输入新的使用授权码'}
                  disabled={isPermanentLicense || redeeming}
                />
                {redeemError && <p className="text-sm text-destructive">{redeemError}</p>}
                {redeemSuccess && <p className="text-sm text-emerald-600">{redeemSuccess}</p>}
                <Button className="w-full" disabled={isPermanentLicense || redeeming} onClick={handleRedeemCode}>
                  {redeeming ? '提交中...' : '确认续费'}
                </Button>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => {
                  setEditUsername(user?.username || '')
                  setUserCenterOpen(false)
                  setEditProfileOpen(true)
                }}>
                  编辑资料
                </Button>
                <Button className="flex-1" onClick={() => {
                  setUserCenterOpen(false)
                  setChangePasswordOpen(true)
                }}>
                  修改密码
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* 编辑资料 */}
        <Dialog open={editProfileOpen} onOpenChange={setEditProfileOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>编辑资料</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>用户名</Label>
                <Input value={editUsername} onChange={(e) => setEditUsername(e.target.value)} />
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setEditProfileOpen(false)}>取消</Button>
                <Button className="flex-1" onClick={() => {
                  updateUser({ username: editUsername })
                  setEditProfileOpen(false)
                }}>保存</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* 修改密码 */}
        <Dialog open={changePasswordOpen} onOpenChange={setChangePasswordOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>修改密码</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>当前密码</Label>
                <Input type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} placeholder="请输入当前密码" />
              </div>
              <div className="space-y-2">
                <Label>新密码</Label>
                <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="请输入新密码" />
              </div>
              <div className="space-y-2">
                <Label>确认新密码</Label>
                <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="请再次输入新密码" />
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setChangePasswordOpen(false)}>取消</Button>
                <Button className="flex-1" onClick={() => setChangePasswordOpen(false)}>确认修改</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </ClientOnly>
  )
}
