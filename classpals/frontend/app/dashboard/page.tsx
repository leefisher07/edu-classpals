'use client'

import { useEffect, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { dashboardApi } from '@/lib/api/dashboard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  Users,
  PawPrint,
  UsersRound,
  Trophy,
  TrendingUp,
  Calendar,
  ArrowRight,
  Sparkles,
  ShoppingBag,
  FileText,
  Activity,
  Target,
} from 'lucide-react'
import { useActiveClass } from '@/lib/hooks/use-active-class'
import { useAuthStore } from '@/lib/stores/auth-store'

const quickActionTones = {
  blue: 'bg-blue-100 text-blue-600',
  amber: 'bg-amber-100 text-amber-600',
  emerald: 'bg-emerald-100 text-emerald-600',
  purple: 'bg-purple-100 text-purple-600',
  rose: 'bg-rose-100 text-rose-600',
} as const

export default function DashboardPage() {
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const { activeClassId, currentClass, isLoading: classesLoading } = useActiveClass()

  useEffect(() => {
    if (!activeClassId) return
    queryClient.removeQueries({
      queryKey: ['dashboard-overview'],
      predicate: (query) => Array.isArray(query.queryKey)
        && query.queryKey[0] === 'dashboard-overview'
        && query.queryKey[1] !== activeClassId,
    })
    queryClient.removeQueries({
      queryKey: ['dashboard-ranking'],
      predicate: (query) => Array.isArray(query.queryKey)
        && query.queryKey[0] === 'dashboard-ranking'
        && query.queryKey[1] !== activeClassId,
    })
  }, [activeClassId, queryClient])

  const { data: overviewData, isLoading: overviewLoading } = useQuery({
    queryKey: ['dashboard-overview', activeClassId],
    queryFn: () => dashboardApi.overview(activeClassId!),
    enabled: !!activeClassId,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  })

  const { data: rankingData, isLoading: rankingLoading } = useQuery({
    queryKey: ['dashboard-ranking', activeClassId],
    queryFn: () => dashboardApi.studentRanking(activeClassId!, { limit: 10 }),
    enabled: !!activeClassId,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  })

  const overview = overviewData as any
  const rankingSource: any[] = Array.isArray(rankingData)
    ? (rankingData as any[])
    : Array.isArray((rankingData as any)?.data)
      ? (rankingData as any).data
      : []
  const topStudents = useMemo(() => rankingSource.slice(0, 10), [rankingSource])

  const quickActions = [
    {
      href: `/dashboard/students${activeClassId ? `?classId=${encodeURIComponent(activeClassId)}` : ''}`,
      label: '学生管理',
      description: '查看名单与积分状态',
      icon: Users,
      tone: quickActionTones.blue,
    },
    {
      href: `/dashboard/pets${activeClassId ? `?classId=${encodeURIComponent(activeClassId)}` : ''}`,
      label: '宠物世界',
      description: '进入宠物成长互动',
      icon: PawPrint,
      tone: quickActionTones.amber,
    },
    {
      href: `/dashboard/groups${activeClassId ? `?classId=${encodeURIComponent(activeClassId)}` : ''}`,
      label: '小组管理',
      description: '查看分组与成员结构',
      icon: UsersRound,
      tone: quickActionTones.emerald,
    },
    {
      href: `/dashboard/records${activeClassId ? `?classId=${encodeURIComponent(activeClassId)}` : ''}`,
      label: '积分明细',
      description: '筛选记录与排行数据',
      icon: FileText,
      tone: quickActionTones.rose,
    },
    {
      href: `/dashboard/shop${activeClassId ? `?classId=${encodeURIComponent(activeClassId)}` : ''}`,
      label: '积分商店',
      description: '管理奖励兑换内容',
      icon: ShoppingBag,
      tone: quickActionTones.purple,
    },
  ]

  const stats = [
    {
      label: '学生总数',
      value: overview?.studentCount || 0,
      helper: `有积分学生 ${overview?.activeStudents || 0}`,
      detail: '当前班级已加入看板的学生人数',
      icon: Users,
      tone: 'bg-blue-100 text-blue-600',
    },
    {
      label: '累计积分',
      value: overview?.totalPoints || 0,
      helper: `今日净变化 ${formatSignedNumber(overview?.today?.net || 0)}`,
      detail: '班级累计积分总量',
      icon: TrendingUp,
      tone: 'bg-emerald-100 text-emerald-600',
    },
    {
      label: '小组数量',
      value: overview?.groupCount || 0,
      helper: `今日操作 ${overview?.today?.operations || 0}`,
      detail: '已创建并参与协作的小组数量',
      icon: UsersRound,
      tone: 'bg-purple-100 text-purple-600',
    },
    {
      label: '本周净变化',
      value: formatSignedNumber(overview?.week?.net || 0),
      helper: `本周加分 ${overview?.week?.add || 0} · 扣分 ${overview?.week?.deduct || 0}`,
      detail: '用于快速判断班级本周激励走势',
      icon: Calendar,
      tone: 'bg-amber-100 text-amber-600',
    },
  ]

  const recentActivities = useMemo(() => {
    const source = Array.isArray(overview?.recentActivities) ? overview.recentActivities : []
    return source.slice(0, 10)
  }, [overview?.recentActivities])

  if (!activeClassId) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="mb-2 text-muted-foreground">还没有激活的班级</p>
          <p className="text-sm text-muted-foreground">请前往班级管理创建并激活一个班级</p>
        </div>
      </div>
    )
  }

  if (classesLoading || overviewLoading || rankingLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">加载中...</p>
        </div>
      </div>
    )
  }

  const greeting = new Date().getHours() < 12 ? '早上好' : new Date().getHours() < 18 ? '下午好' : '晚上好'

  return (
    <div className="min-h-full overflow-y-auto bg-muted/20 px-4 py-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
        <section className="overflow-hidden rounded-3xl border bg-card shadow-sm">
          <div className="flex flex-col gap-6 p-6 xl:flex-row xl:items-start xl:justify-between">
            <div className="flex flex-1 items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Sparkles className="h-7 w-7" />
              </div>
              <div className="space-y-3">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-foreground">
                    {greeting}
                    {user?.username ? `，${user.username}` : ''}
                  </h1>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    当前班级：{currentClass?.name || '未选择'}。这里汇总了班级积分、学生积分概况和近期动态，方便你快速进入高频操作。
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 text-sm">
                  <Badge className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700 hover:bg-emerald-50">
                    今日加分 +{overview?.today?.add || 0}
                  </Badge>
                  <Badge className="rounded-full bg-rose-50 px-3 py-1 text-rose-700 hover:bg-rose-50">
                    今日扣分 -{overview?.today?.deduct || 0}
                  </Badge>
                  <Badge className="rounded-full bg-blue-50 px-3 py-1 text-blue-700 hover:bg-blue-50">
                    今日净变化 {formatSignedNumber(overview?.today?.net || 0)}
                  </Badge>
                  <Badge className="rounded-full bg-purple-50 px-3 py-1 text-purple-700 hover:bg-purple-50">
                    本周净变化 {formatSignedNumber(overview?.week?.net || 0)}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:min-w-[320px]">
              <SummaryChip label="学生" value={overview?.studentCount || 0} />
              <SummaryChip label="有积分" value={overview?.activeStudents || 0} />
              <SummaryChip label="小组" value={overview?.groupCount || 0} />
              <SummaryChip label="操作" value={overview?.today?.operations || 0} />
            </div>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          {stats.map((item) => (
            <Card key={item.label} className="overflow-hidden rounded-3xl border bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-muted-foreground">{item.label}</p>
                    <p className="mt-2 text-2xl font-bold text-foreground sm:text-3xl">{item.value}</p>
                    <p className="mt-2 text-sm font-medium text-foreground">{item.helper}</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.detail}</p>
                  </div>
                  <div className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl', item.tone)}>
                    <item.icon className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
          <div className="space-y-6">
            <Card className="overflow-hidden rounded-3xl border bg-card shadow-sm">
              <CardHeader className="border-b bg-muted/20 pb-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-lg">快捷操作</CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">将高频入口集中到看板首页，减少页面来回切换。</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-5">
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 2xl:grid-cols-5">
                  {quickActions.map((action) => (
                    <Link
                      key={action.href}
                      href={action.href}
                      className="group rounded-2xl border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:bg-muted/30"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className={cn('flex h-12 w-12 items-center justify-center rounded-2xl', action.tone)}>
                          <action.icon className="h-6 w-6" />
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                      </div>
                      <div className="mt-4">
                        <p className="text-sm font-semibold text-foreground">{action.label}</p>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">{action.description}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden rounded-3xl border bg-card shadow-sm">
              <CardHeader className="border-b bg-muted/20 pb-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-lg">最近动态</CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">关注刚发生的积分变化，快速定位课堂激励动作。</p>
                  </div>
                  <div className="flex items-center gap-2 rounded-full bg-muted/50 px-3 py-1 text-xs text-muted-foreground">
                    <Activity className="h-3.5 w-3.5" />
                    最近 10 条
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-5">
                {recentActivities.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">暂无动态</p>
                ) : (
                  <div className="space-y-3">
                    {recentActivities.map((item: any, index: number) => {
                      const isAdd = item.type === 'ADD'
                      return (
                        <div key={index} className="flex items-start gap-4 rounded-2xl border bg-background px-4 py-3">
                          <div className={cn(
                            'mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl',
                            isAdd ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
                          )}>
                            {isAdd ? <TrendingUp className="h-4 w-4" /> : <Target className="h-4 w-4" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-medium text-foreground">{item.studentName}</p>
                              <Badge className={cn(
                                'rounded-full px-2 py-0.5 text-[11px] hover:bg-transparent',
                                isAdd ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                              )}>
                                {isAdd ? '加分' : '扣分'} {isAdd ? '+' : '-'}{item.value}
                              </Badge>
                            </div>
                            <p className="mt-1 text-sm text-muted-foreground">{item.reason || '积分变动'}</p>
                          </div>
                          <span className="shrink-0 text-xs text-muted-foreground">
                            {new Date(item.createdAt).toLocaleTimeString('zh-CN', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="overflow-hidden rounded-3xl border bg-card shadow-sm">
              <CardHeader className="border-b bg-muted/20 pb-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-lg">积分排行</CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">看板展示前 10 名学生，方便快速识别表现学生。</p>
                  </div>
                  <Link href={activeClassId ? `/dashboard/records?classId=${encodeURIComponent(activeClassId)}` : '/dashboard/records'}>
                    <Button variant="ghost" size="sm" className="h-8 gap-1 rounded-xl">
                      查看全部
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="p-5">
                {topStudents.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">暂无数据</p>
                ) : (
                  <div className="space-y-3">
                    {topStudents.map((student: any, index: number) => (
                      <div key={student.id} className="flex items-center gap-3 rounded-2xl border bg-background px-4 py-3">
                        <div
                          className={cn(
                            'flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold',
                            index === 0
                              ? 'bg-yellow-100 text-yellow-700'
                              : index === 1
                                ? 'bg-gray-100 text-gray-700'
                                : index === 2
                                  ? 'bg-amber-100 text-amber-700'
                                  : 'bg-muted text-muted-foreground'
                          )}
                        >
                          {index + 1}
                        </div>
                        <div
                          className={cn(
                            'flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium',
                            getAvatarColor(index)
                          )}
                        >
                          {getSurname(student.name)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">{student.name}</p>
                          <p className="text-xs text-muted-foreground">当前累计积分表现靠前</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-primary">{student.totalPoints}</p>
                          <p className="text-xs text-muted-foreground">累计积分</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </div>
  )
}

function SummaryChip({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border bg-muted/20 px-4 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold text-foreground">{value}</p>
    </div>
  )
}

function formatSignedNumber(value: number) {
  if (value > 0) return `+${value}`
  return `${value}`
}

function getSurname(name: string) {
  return name?.charAt(0) || '?'
}

function getAvatarColor(index: number) {
  const colors = [
    'bg-blue-100 text-blue-700',
    'bg-green-100 text-green-700',
    'bg-purple-100 text-purple-700',
    'bg-pink-100 text-pink-700',
    'bg-orange-100 text-orange-700',
  ]
  return colors[index % colors.length]
}
