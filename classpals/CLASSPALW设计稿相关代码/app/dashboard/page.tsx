"use client"

import { useState } from "react"
import Link from "next/link"
import {
  Users,
  PawPrint,
  UsersRound,
  BarChart3,
  Trophy,
  Plus,
  TrendingUp,
  Calendar,
  ArrowRight,
  Sparkles,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { mockStudents, mockGroups } from "@/lib/mock-data"
import { getSurname } from "@/lib/mock-data"
import { cn } from "@/lib/utils"

export default function DashboardPage() {
  const totalStudents = mockStudents.length
  const totalPoints = mockStudents.reduce((sum, s) => sum + s.totalPoints, 0)
  const todayPoints = 25 // Mock
  const topStudents = [...mockStudents]
    .sort((a, b) => b.totalPoints - a.totalPoints)
    .slice(0, 5)

  const quickActions = [
    { href: "/dashboard/students", label: "学生管理", icon: Users, color: "bg-blue-500" },
    { href: "/dashboard/pets", label: "宠物世界", icon: PawPrint, color: "bg-amber-500" },
    { href: "/dashboard/groups", label: "小组管理", icon: UsersRound, color: "bg-green-500" },
    { href: "/dashboard/overview", label: "数据概览", icon: BarChart3, color: "bg-purple-500" },
    { href: "/dashboard/honor", label: "光荣榜", icon: Trophy, color: "bg-red-500" },
  ]

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* 欢迎横幅 */}
      <Card className="bg-gradient-to-r from-primary to-accent text-white border-0 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-1/2 w-32 h-32 bg-white/10 rounded-full translate-y-1/2" />
        <CardContent className="p-6 relative">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-1">早上好，王老师</h2>
              <p className="text-white/90">今天是个充满活力的一天，继续激励你的学生吧！</p>
            </div>
            <div className="hidden md:flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm text-white/80">今日已加分</p>
                <p className="text-3xl font-bold">{todayPoints}</p>
              </div>
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
                <Sparkles className="w-8 h-8" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 数据概览卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">学生总数</p>
                <p className="text-2xl font-bold">{totalStudents}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">累计积分</p>
                <p className="text-2xl font-bold">{totalPoints}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <UsersRound className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">小组数量</p>
                <p className="text-2xl font-bold">{mockGroups.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">会员到期</p>
                <p className="text-lg font-bold">2026-12-31</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* 快捷操作 */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">快捷操作</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {quickActions.map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl border bg-card hover:bg-muted/50 transition-colors group"
                >
                  <div
                    className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center text-white",
                      action.color
                    )}
                  >
                    <action.icon className="w-6 h-6" />
                  </div>
                  <span className="text-sm font-medium">{action.label}</span>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 积分排行 Top 5 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">积分排行 Top 5</CardTitle>
            <Link href="/dashboard/honor">
              <Button variant="ghost" size="sm" className="gap-1">
                查看全部
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topStudents.map((student, index) => (
                <div key={student.id} className="flex items-center gap-3">
                  <div
                    className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                      index === 0
                        ? "bg-yellow-100 text-yellow-700"
                        : index === 1
                        ? "bg-gray-100 text-gray-700"
                        : index === 2
                        ? "bg-amber-100 text-amber-700"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {index + 1}
                  </div>
                  <div
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                      student.avatarColor
                    )}
                  >
                    {getSurname(student.name)}
                  </div>
                  <span className="flex-1 text-sm font-medium">{student.name}</span>
                  <span className="text-sm font-semibold text-primary">
                    {student.totalPoints}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 最近动态 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">最近动态</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { time: "10:30", action: "张三 回答问题 +2", type: "add" },
              { time: "10:25", action: "李四 作业优秀 +3", type: "add" },
              { time: "10:20", action: "王五 迟到 -1", type: "deduct" },
              { time: "09:50", action: "小组一 集体表现优秀 +5", type: "add" },
              { time: "09:30", action: "陈静 帮助同学 +2", type: "add" },
            ].map((item, index) => (
              <div key={index} className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground w-12">{item.time}</span>
                <div
                  className={cn(
                    "w-2 h-2 rounded-full",
                    item.type === "add" ? "bg-green-500" : "bg-red-500"
                  )}
                />
                <span className="text-sm">{item.action}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
