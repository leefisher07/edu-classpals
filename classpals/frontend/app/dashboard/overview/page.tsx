"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import {
  Users,
  TrendingUp,
  TrendingDown,
  Award,
  UsersRound,
  Calendar,
  ArrowUp,
  ArrowDown,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts"
import { cn } from "@/lib/utils"
import { dashboardApi } from "@/lib/api/dashboard"
import { getAvatarColor } from "@/lib/mock-data"
import { useActiveClass } from "@/lib/hooks/use-active-class"

export default function OverviewPage() {
  const { activeClassId: classId } = useActiveClass()
  const [timeRange, setTimeRange] = useState("7days")

  const { data: overviewData } = useQuery({
    queryKey: ["dashboard-overview", classId],
    queryFn: () => dashboardApi.overview(classId!),
    enabled: !!classId,
  })

  const { data: rankingData } = useQuery({
    queryKey: ["dashboard-ranking", classId],
    queryFn: () => dashboardApi.studentRanking(classId!, { limit: 5 }),
    enabled: !!classId,
  })

  const { data: trendsData } = useQuery({
    queryKey: ["dashboard-trends", classId, timeRange],
    queryFn: () => dashboardApi.trend(classId!, { days: timeRange === "7days" ? 7 : 30 }),
    enabled: !!classId,
  })

  const overview = overviewData as any
  const topStudents: any[] = Array.isArray(rankingData)
    ? (rankingData as any[])
    : Array.isArray((rankingData as any)?.data)
      ? (rankingData as any).data
      : []
  const trends = Array.isArray((trendsData as any)?.trends)
    ? (trendsData as any).trends
    : Array.isArray((trendsData as any)?.data?.trends)
      ? (trendsData as any).data.trends
      : []

  // Transform trends data for chart
  const trendData = trends.map((t: any) => ({
    date: new Date(t.date).toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" }),
    add: t.addPoints || 0,
    deduct: Math.abs(t.deductPoints || 0),
  }))

  // Mock category data (would come from API in real implementation)
  const categoryData = [
    { name: "课堂表现", value: 35 },
    { name: "作业", value: 28 },
    { name: "纪律", value: 15 },
    { name: "互助", value: 12 },
    { name: "其他", value: 10 },
  ]

  if (!classId) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">请先选择班级</p>
      </div>
    )
  }

  return (
    <div className="min-h-full bg-muted/20">
      <div className="mx-auto flex w-full max-w-[1800px] flex-col gap-6 px-4 py-6 lg:px-8">
        <div className="overflow-hidden rounded-3xl border bg-card shadow-sm">
          <div className="flex flex-col gap-5 p-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Award className="h-7 w-7" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">数据概览</h1>
                <p className="mt-1 text-sm text-muted-foreground">班级积分数据统计和分析</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 text-sm">
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">今日 +{overview?.today?.add || 0}</span>
              <span className="rounded-full bg-red-50 px-3 py-1 text-red-700">今日 -{Math.abs(overview?.today?.deduct || 0)}</span>
              <span className="rounded-full bg-purple-50 px-3 py-1 text-purple-700">学生 {overview?.studentCount || 0}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
          <Card className="overflow-hidden rounded-3xl border bg-card shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                  <Award className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{overview?.totalPoints || 0}</p>
                  <p className="text-sm text-muted-foreground">班级累计积分</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden rounded-3xl border bg-card shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100">
                  <TrendingUp className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-emerald-600">
                    +{overview?.today?.add || 0}
                  </p>
                  <p className="text-sm text-muted-foreground">今日加分</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden rounded-3xl border bg-card shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100">
                  <TrendingDown className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-red-600">
                    -{Math.abs(overview?.today?.deduct || 0)}
                  </p>
                  <p className="text-sm text-muted-foreground">今日扣分</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden rounded-3xl border bg-card shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100">
                  <Calendar className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">+{overview?.week?.add || 0}</p>
                  <p className="text-sm text-muted-foreground">本周加分</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden rounded-3xl border bg-card shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-100">
                  <Users className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{overview?.studentCount || 0}</p>
                  <p className="text-sm text-muted-foreground">学生总数</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden rounded-3xl border bg-card shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100">
                  <UsersRound className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{overview?.groupCount || 0}</p>
                  <p className="text-sm text-muted-foreground">小组总数</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="overflow-hidden rounded-3xl border bg-card shadow-sm lg:col-span-2">
            <CardHeader className="border-b bg-muted/30 pb-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="text-lg">积分趋势</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">查看加分与扣分的时间变化</p>
                </div>
                <Tabs value={timeRange} onValueChange={setTimeRange}>
                  <TabsList className="h-10 rounded-xl">
                    <TabsTrigger value="7days" className="h-8 rounded-lg px-3 text-xs">
                      近7天
                    </TabsTrigger>
                    <TabsTrigger value="30days" className="h-8 rounded-lg px-3 text-xs">
                      近30天
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </CardHeader>
            <CardContent className="p-5">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="add"
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={false}
                      name="加分"
                    />
                    <Line
                      type="monotone"
                      dataKey="deduct"
                      stroke="#ef4444"
                      strokeWidth={2}
                      dot={false}
                      name="扣分"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center justify-center gap-6 mt-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span className="text-sm text-muted-foreground">加分</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <span className="text-sm text-muted-foreground">扣分</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden rounded-3xl border bg-card shadow-sm">
            <CardHeader className="border-b bg-muted/30 pb-5">
              <CardTitle className="text-lg">加分分类统计</CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryData} layout="vertical">
                    <XAxis type="number" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      width={60}
                    />
                    <Tooltip />
                    <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card className="overflow-hidden rounded-3xl border bg-card shadow-sm">
            <CardHeader className="border-b bg-muted/30 pb-5">
              <CardTitle className="text-lg">积分排行榜 TOP 5</CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <div className="space-y-3">
                {topStudents.map((student: any, index: number) => (
                  <div
                    key={student.id}
                    className="flex items-center gap-4 rounded-2xl border bg-muted/20 p-4"
                  >
                    <div
                      className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm",
                        index === 0
                          ? "bg-amber-100 text-amber-600"
                          : index === 1
                          ? "bg-gray-200 text-gray-600"
                          : index === 2
                          ? "bg-orange-100 text-orange-600"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {index + 1}
                    </div>
                    <div
                      className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center font-bold",
                        getAvatarColor(index)
                      )}
                    >
                      {student.name.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{student.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-primary">{student.totalPoints}</p>
                      <div className="flex items-center gap-1 text-xs text-emerald-600">
                        <ArrowUp className="w-3 h-3" />
                        <span>+{student.recentGrowth || 0}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden rounded-3xl border bg-card shadow-sm">
            <CardHeader className="border-b bg-muted/30 pb-5">
              <CardTitle className="text-lg">最近积分变动</CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <div className="space-y-3">
                {(overview?.recentActivities || []).slice(0, 5).map((activity: any, index: number) => (
                  <div key={index} className="flex items-center gap-4 p-3 rounded-lg bg-muted/30">
                    <div
                      className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center",
                        activity.type === "ADD" ? "bg-emerald-100" : "bg-red-100"
                      )}
                    >
                      {activity.type === "ADD" ? (
                        <ArrowUp className="w-5 h-5 text-emerald-600" />
                      ) : (
                        <ArrowDown className="w-5 h-5 text-red-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{activity.studentName}</p>
                      <p className="text-sm text-muted-foreground truncate">{activity.reason}</p>
                    </div>
                    <div className="text-right">
                      <p
                        className={cn(
                          "font-bold",
                          activity.type === "ADD" ? "text-emerald-600" : "text-red-600"
                        )}
                      >
                        {activity.type === "ADD" ? "+" : "-"}
                        {activity.value}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(activity.createdAt).toLocaleTimeString("zh-CN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
