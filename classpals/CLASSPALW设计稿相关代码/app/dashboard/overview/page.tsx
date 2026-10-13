"use client"

import { useState } from "react"
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
import { mockStudents, mockGroups } from "@/lib/mock-data"
import { cn } from "@/lib/utils"

// Mock trend data
const trendData7Days = [
  { date: "3/12", add: 45, deduct: 12 },
  { date: "3/13", add: 62, deduct: 8 },
  { date: "3/14", add: 38, deduct: 15 },
  { date: "3/15", add: 55, deduct: 10 },
  { date: "3/16", add: 48, deduct: 18 },
  { date: "3/17", add: 70, deduct: 5 },
  { date: "3/18", add: 52, deduct: 9 },
]

const trendData30Days = Array.from({ length: 30 }, (_, i) => ({
  date: `${Math.floor(i / 7 + 1)}周`,
  add: Math.floor(Math.random() * 50) + 30,
  deduct: Math.floor(Math.random() * 20) + 5,
}))

export default function OverviewPage() {
  const [timeRange, setTimeRange] = useState("7days")

  const totalPoints = mockStudents.reduce((sum, s) => sum + s.totalPoints, 0)
  const todayAdd = 52
  const todayDeduct = 9
  const weekAdd = 370
  const weekDeduct = 77

  const trendData = timeRange === "7days" ? trendData7Days : trendData30Days

  // Top students
  const topStudents = [...mockStudents]
    .sort((a, b) => b.totalPoints - a.totalPoints)
    .slice(0, 5)

  // Category distribution (mock)
  const categoryData = [
    { name: "课堂表现", value: 35 },
    { name: "作业", value: 28 },
    { name: "纪律", value: 15 },
    { name: "互助", value: 12 },
    { name: "其他", value: 10 },
  ]

  return (
    <div className="flex-1 p-6 overflow-auto">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">数据概览</h1>
          <p className="text-muted-foreground mt-1">班级积分数据统计和分析</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Award className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalPoints}</p>
                  <p className="text-xs text-muted-foreground">班级总积分</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-emerald-600">+{todayAdd}</p>
                  <p className="text-xs text-muted-foreground">今日加分</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                  <TrendingDown className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-red-600">-{todayDeduct}</p>
                  <p className="text-xs text-muted-foreground">今日扣分</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">+{weekAdd}</p>
                  <p className="text-xs text-muted-foreground">本周加分</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                  <Users className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{mockStudents.length}</p>
                  <p className="text-xs text-muted-foreground">学生总数</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                  <UsersRound className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{mockGroups.length}</p>
                  <p className="text-xs text-muted-foreground">小组总数</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Trend Chart */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">积分趋势</CardTitle>
                <Tabs value={timeRange} onValueChange={setTimeRange}>
                  <TabsList className="h-8">
                    <TabsTrigger value="7days" className="text-xs px-2 h-6">近7天</TabsTrigger>
                    <TabsTrigger value="30days" className="text-xs px-2 h-6">近30天</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </CardHeader>
            <CardContent>
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

          {/* Category Distribution */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">加分分类统计</CardTitle>
            </CardHeader>
            <CardContent>
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

        {/* Bottom Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Students */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">积分排行榜 TOP 5</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topStudents.map((student, index) => (
                  <div
                    key={student.id}
                    className="flex items-center gap-4 p-3 rounded-lg bg-muted/30"
                  >
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm",
                      index === 0 ? "bg-amber-100 text-amber-600" :
                      index === 1 ? "bg-gray-200 text-gray-600" :
                      index === 2 ? "bg-orange-100 text-orange-600" :
                      "bg-muted text-muted-foreground"
                    )}>
                      {index + 1}
                    </div>
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center font-bold",
                      student.avatarColor
                    )}>
                      {student.name.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{student.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-primary">{student.totalPoints}</p>
                      <div className="flex items-center gap-1 text-xs text-emerald-600">
                        <ArrowUp className="w-3 h-3" />
                        <span>+12</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">最近积分变动</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { student: "张三", action: "作业全对", points: 2, type: "add", time: "10分钟前" },
                  { student: "李四", action: "积极发言", points: 1, type: "add", time: "15分钟前" },
                  { student: "王五", action: "课堂违纪", points: 1, type: "deduct", time: "30分钟前" },
                  { student: "张伟", action: "帮助同学", points: 1, type: "add", time: "1小时前" },
                  { student: "王芳", action: "作业优秀", points: 1, type: "add", time: "2小时前" },
                ].map((activity, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-4 p-3 rounded-lg bg-muted/30"
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center",
                      activity.type === "add" ? "bg-emerald-100" : "bg-red-100"
                    )}>
                      {activity.type === "add" ? (
                        <ArrowUp className="w-5 h-5 text-emerald-600" />
                      ) : (
                        <ArrowDown className="w-5 h-5 text-red-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{activity.student}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {activity.action}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={cn(
                        "font-bold",
                        activity.type === "add" ? "text-emerald-600" : "text-red-600"
                      )}>
                        {activity.type === "add" ? "+" : "-"}{activity.points}
                      </p>
                      <p className="text-xs text-muted-foreground">{activity.time}</p>
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
