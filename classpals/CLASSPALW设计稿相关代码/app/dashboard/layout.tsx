"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Users,
  LayoutGrid,
  PawPrint,
  UsersRound,
  Settings,
  ChevronDown,
  LogOut,
  Menu,
  Loader2,
  ShoppingBag,
  ListChecks,
  Wrench,
  FileText,
  Cog,
  User,
  FileCode,
  HelpCircle,
  Lock,
  Monitor,
  Smartphone,
  Check,
  X,
  ChevronRight,
  Share2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ClientOnly } from "@/components/client-only"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const navItems = [
  { href: "/dashboard", label: "班级管理", icon: LayoutGrid },
  { href: "/dashboard/pets", label: "宠物世界", icon: PawPrint },
  { href: "/dashboard/shop", label: "积分商店", icon: ShoppingBag },
  { href: "/dashboard/records", label: "记录榜单", icon: FileText },
  { href: "/dashboard/parent-share", label: "分享家长", icon: Share2 },
  { href: "/dashboard/pet-settings", label: "宠物设置", icon: Cog },
  { href: "/dashboard/students", label: "学生管理", icon: Users },
  { href: "/dashboard/groups", label: "小组管理", icon: UsersRound },
  { href: "/dashboard/rules", label: "积分规则", icon: ListChecks },
  { href: "/dashboard/tools", label: "辅助工具", icon: Wrench },
]

const classes = [
  { id: "1", name: "初三四班" },
  { id: "2", name: "初三五班" },
]

const changelogData = [
  {
    version: "v2.0.1-auth-logout-hotfix",
    date: "2026-03-12",
    type: "fix" as const,
    title: "退出登录后不再被旧会话重新拉回",
    description: "退出登录链路补上真实 signOut，并拦截登出前旧鉴权请求的回写，避免短暂回到登录页后又自动进入系统。",
    changes: [
      "新增显式 logout server action，退出时真正执行 Supabase signOut 并清理服务端会话",
      "主入口登录校验新增请求代次保护，登出前发出的旧 loadClasses 结果不再允许写回 authed",
      "退出流程改为先进入 checking，再等待 signOut 成功后回到登录页，避免假退出闪回",
      "用户菜单退出回调改为支持异步，继续复用现有确认弹窗交互",
    ],
  },
  {
    version: "v2.0.0",
    date: "2026-03-10",
    type: "feature" as const,
    title: "宠物图腾扩容架构 + 三层喂养/升级/图腾特效",
    description: "宠物系统升级为 V2.0.0 catalog 架构：物种源、资源目录、图鉴/领养/徽章入口统一，并补齐普通喂养、跨阶段升级、满级图腾收集三层演出。",
    changes: [
      "宠物图腾扩容到 66 种：物种 metadata 从 petUtils.ts 抽离为独立 catalog 类型源，统一面向 66 种接入目标",
      "新增 50 个宠物品种接入位：资源目录、species id、随机分配与资源校验脚本全部按新增品种批量上线规范准备完毕",
      "三层喂养/升级/图腾特效：普通喂养轻反馈、跨阶段升级旧图到新图演出、满级图腾觉醒庆典统一接入前端合成动画",
      "图鉴/领养/徽章统一物种源：宠物卡片、图鉴、领养弹窗、徽章收藏、MAX 图腾展示与随机点名宠物头像共用同一路径逻辑",
      "新增 pet-assets 校验脚本目录一致性检查、重复 hash 检查和 66 种目标数校验，资源补齐后可直接验收",
    ],
  },
  {
    version: "v1.10.5-auth-mobile-hotfix",
    date: "2026-03-07",
    type: "fix" as const,
    title: "会话失效中文化 + 手机批量加分姓名完整显示",
    description: "修复移动端批量加分时学生姓名被截断的问题，并将会话失效提示中文化。",
    changes: [
      "移动端批量加分对话框学生姓名现在完整显示，不再被截断",
      "会话失效提示文案已中文化，更友好的用户体验",
    ],
  },
]

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [currentClass, setCurrentClass] = useState(classes[0])
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [displayMode, setDisplayMode] = useState("auto")
  const [userCenterOpen, setUserCenterOpen] = useState(false)
  const [changelogOpen, setChangelogOpen] = useState(false)
  const [editProfileOpen, setEditProfileOpen] = useState(false)
  const [changePasswordOpen, setChangePasswordOpen] = useState(false)
  const [isLocked, setIsLocked] = useState(false)

  const fallback = (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  )

  // 锁定屏幕
  if (isLocked) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <Lock className="w-10 h-10 text-primary" />
          </div>
          <h2 className="text-xl font-semibold">屏幕已锁定</h2>
          <p className="text-muted-foreground">点击下方按钮解锁</p>
          <Button onClick={() => setIsLocked(false)} className="mt-4">
            解锁屏幕
          </Button>
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
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
              <Users className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg font-bold text-foreground">ClassPals</h1>
              <p className="text-xs text-muted-foreground -mt-0.5">让管理更简单</p>
            </div>
          </Link>

          {/* 桌面端导航 */}
          <nav className="hidden lg:flex items-center gap-1 ml-6">
            {navItems.map((item) => {
              const isActive = pathname === item.href || 
                (item.href !== "/dashboard" && pathname.startsWith(item.href))
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Link>
              )
            })}
          </nav>

          {/* 右侧操作区 */}
          <div className="flex items-center gap-2 ml-auto">
            {/* 班级选择器 */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="hidden sm:flex gap-2">
                  <span className="text-sm">班级:</span>
                  <span className="font-medium">{currentClass.name}</span>
                  <ChevronDown className="w-4 h-4 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                {classes.map((cls) => (
                  <DropdownMenuItem
                    key={cls.id}
                    onClick={() => setCurrentClass(cls)}
                    className={cn(
                      currentClass.id === cls.id && "bg-primary/10 text-primary"
                    )}
                  >
                    {cls.name}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Settings className="w-4 h-4 mr-2" />
                  管理班级
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* 用户菜单 */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2 px-2">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-sm font-medium text-primary">用</span>
                  </div>
                  <span className="hidden md:block text-sm">用户5508</span>
                  <ChevronDown className="w-4 h-4 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => setUserCenterOpen(true)}>
                  <User className="w-4 h-4 mr-2" />
                  用户中心
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setChangelogOpen(true)}>
                  <FileCode className="w-4 h-4 mr-2" />
                  更新日志
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <HelpCircle className="w-4 h-4 mr-2" />
                  帮助中心
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsLocked(true)}>
                  <Lock className="w-4 h-4 mr-2" />
                  锁定屏幕
                </DropdownMenuItem>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <Monitor className="w-4 h-4 mr-2" />
                    显示模式
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuRadioGroup value={displayMode} onValueChange={setDisplayMode}>
                      <DropdownMenuRadioItem value="auto">
                        自动 (推荐)
                      </DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="desktop">
                        桌面版
                      </DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="mobile">
                        移动版
                      </DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive">
                  <LogOut className="w-4 h-4 mr-2" />
                  退出登录
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* 移动端菜单按钮 */}
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

                  {/* 班级选择 */}
                  <div className="p-4 border-b">
                    <p className="text-xs text-muted-foreground mb-2">当前班级</p>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="w-full justify-between">
                          {currentClass.name}
                          <ChevronDown className="w-4 h-4 opacity-50" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-56">
                        {classes.map((cls) => (
                          <DropdownMenuItem
                            key={cls.id}
                            onClick={() => setCurrentClass(cls)}
                          >
                            {cls.name}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* 导航菜单 */}
                  <nav className="flex-1 p-4">
                    <ul className="space-y-1">
                      {navItems.map((item) => {
                        const isActive = pathname === item.href ||
                          (item.href !== "/dashboard" && pathname.startsWith(item.href))
                        return (
                          <li key={item.href}>
                            <Link
                              href={item.href}
                              onClick={() => setMobileMenuOpen(false)}
                              className={cn(
                                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                                isActive
                                  ? "bg-primary/10 text-primary"
                                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
                              )}
                            >
                              <item.icon className="w-5 h-5" />
                              {item.label}
                            </Link>
                          </li>
                        )
                      })}
                    </ul>
                  </nav>

                  {/* 底部用户信息 */}
                  <div className="p-4 border-t">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-sm font-medium text-primary">用</span>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">用户5508</p>
                        <p className="text-xs text-muted-foreground">会员有效期: 2027-03-15</p>
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

        {/* 用户中心对话框 */}
        <Dialog open={userCenterOpen} onOpenChange={setUserCenterOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>用户中心</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              {/* 账号信息 */}
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground mb-1">当前账号</p>
                <p className="text-xl font-semibold">用户5508</p>
              </div>

              {/* 激活码状态 */}
              <div className="rounded-lg border p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="font-medium">激活码</span>
                  <Badge className="bg-green-500 hover:bg-green-500">有效</Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-muted-foreground">Code</span>
                  <span className="text-right font-medium">VIP-0776H1</span>
                  <span className="text-muted-foreground">到期日</span>
                  <span className="text-right font-medium">2027/3/15</span>
                  <span className="text-muted-foreground">剩余</span>
                  <span className="text-right font-medium">365 天</span>
                </div>
                <p className="text-xs text-muted-foreground">如需续期请联系管理员</p>
              </div>

              {/* 帮助中心 */}
              <div className="rounded-lg border p-4">
                <div className="flex items-center gap-2 mb-2">
                  <HelpCircle className="w-5 h-5 text-primary" />
                  <span className="font-medium">帮助中心</span>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  查看使用文档与常见问题，快速上手班级积分与宠物功能。
                </p>
                <Button className="w-full" variant="default">
                  <HelpCircle className="w-4 h-4 mr-2" />
                  打开帮助文档
                </Button>
              </div>

              {/* 操作按钮 */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setUserCenterOpen(false)
                    setEditProfileOpen(true)
                  }}
                >
                  编辑资料
                </Button>
                <Button
                  className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                  onClick={() => {
                    setUserCenterOpen(false)
                    setChangePasswordOpen(true)
                  }}
                >
                  修改密码
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* 编辑资料对话框 */}
        <Dialog open={editProfileOpen} onOpenChange={setEditProfileOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>编辑资料</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>用户名</Label>
                <Input defaultValue="用户5508" />
              </div>
              <div className="space-y-2">
                <Label>邮箱</Label>
                <Input type="email" placeholder="请输入邮箱" />
              </div>
              <div className="space-y-2">
                <Label>手机号</Label>
                <Input type="tel" placeholder="请输入手机号" />
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setEditProfileOpen(false)}>
                  取消
                </Button>
                <Button className="flex-1" onClick={() => setEditProfileOpen(false)}>
                  保存
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* 修改密码对话框 */}
        <Dialog open={changePasswordOpen} onOpenChange={setChangePasswordOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>修改密码</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>当前密码</Label>
                <Input type="password" placeholder="请输入当前密码" />
              </div>
              <div className="space-y-2">
                <Label>新密码</Label>
                <Input type="password" placeholder="请输入新密码" />
              </div>
              <div className="space-y-2">
                <Label>确认新密码</Label>
                <Input type="password" placeholder="请再次输入新密码" />
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setChangePasswordOpen(false)}>
                  取消
                </Button>
                <Button className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600" onClick={() => setChangePasswordOpen(false)}>
                  确认修改
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* 更新日志对话框 */}
        <Dialog open={changelogOpen} onOpenChange={setChangelogOpen}>
          <DialogContent className="sm:max-w-2xl max-h-[80vh]">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle>更新日志</DialogTitle>
                <span className="text-sm text-primary">最近更新: 2026-03-12</span>
              </div>
              <p className="text-sm text-muted-foreground">
                记录每一次功能迭代、体验优化与问题修复。
              </p>
            </DialogHeader>
            <ScrollArea className="h-[60vh] pr-4">
              <div className="space-y-6">
                {changelogData.map((log, index) => (
                  <div key={index} className="space-y-3">
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-primary font-medium">{log.date}</span>
                      <span className="text-sm font-mono text-muted-foreground">{log.version}</span>
                      <Badge
                        variant={log.type === "feature" ? "default" : "secondary"}
                        className={cn(
                          log.type === "feature" && "bg-green-500 hover:bg-green-500",
                          log.type === "fix" && "bg-orange-500 hover:bg-orange-500"
                        )}
                      >
                        {log.type === "feature" ? "功能" : "修复"}
                      </Badge>
                    </div>
                    <h3 className="text-lg font-semibold">{log.title}</h3>
                    <p className="text-sm text-muted-foreground">{log.description}</p>
                    <ul className="space-y-2">
                      {log.changes.map((change, i) => (
                        <li key={i} className="flex gap-2 text-sm">
                          <span className="text-primary mt-1">•</span>
                          <span>{change}</span>
                        </li>
                      ))}
                    </ul>
                    {index < changelogData.length - 1 && (
                      <div className="border-b pt-3" />
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>
    </ClientOnly>
  )
}
