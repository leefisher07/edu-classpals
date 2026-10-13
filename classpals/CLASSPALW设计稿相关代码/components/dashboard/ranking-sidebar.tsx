"use client"

import { useState, useEffect } from "react"
import { Users, UsersRound, FileText, ShoppingBag, Trophy, Medal, Award, Pencil, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { Student, Group } from "@/lib/mock-data"
import { getSurname } from "@/lib/mock-data"

interface RankingSidebarProps {
  students: Student[]
  groups: Group[]
  className?: string
}

export function RankingSidebar({ students, groups, className }: RankingSidebarProps) {
  const [mounted, setMounted] = useState(false)
  const sortedStudents = [...students].sort((a, b) => b.totalPoints - a.totalPoints)

  useEffect(() => {
    setMounted(true)
  }, [])

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="w-4 h-4 text-yellow-500" />
    if (rank === 2) return <Medal className="w-4 h-4 text-gray-400" />
    if (rank === 3) return <Award className="w-4 h-4 text-amber-600" />
    return <span className="text-xs text-muted-foreground w-4 text-center">#{rank}</span>
  }

  const getRankBadge = (rank: number) => {
    if (rank === 1) return "积分王者"
    if (rank === 2) return "潜力新星"
    if (rank === 3) return "进取达人"
    return null
  }

  if (!mounted) {
    return (
      <div className={cn("w-80 border-l bg-card flex items-center justify-center", className)}>
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className={cn("w-80 border-l bg-card", className)}>
      <Tabs defaultValue="personal" className="h-full flex flex-col">
        <TabsList className="w-full grid grid-cols-4 rounded-none border-b bg-transparent h-auto p-0">
          <TabsTrigger
            value="personal"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3 gap-1.5"
          >
            <Users className="w-4 h-4" />
            <span className="hidden xl:inline text-xs">个人排行</span>
          </TabsTrigger>
          <TabsTrigger
            value="group"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3 gap-1.5"
          >
            <UsersRound className="w-4 h-4" />
            <span className="hidden xl:inline text-xs">小组排行</span>
          </TabsTrigger>
          <TabsTrigger
            value="rules"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3 gap-1.5"
          >
            <FileText className="w-4 h-4" />
            <span className="hidden xl:inline text-xs">积分规则</span>
          </TabsTrigger>
          <TabsTrigger
            value="shop"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3 gap-1.5"
          >
            <ShoppingBag className="w-4 h-4" />
            <span className="hidden xl:inline text-xs">积分商店</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="personal" className="flex-1 m-0 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-2">
              {sortedStudents.map((student, index) => {
                const rank = index + 1
                const badge = getRankBadge(rank)
                return (
                  <div
                    key={student.id}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg transition-colors",
                      rank <= 3 ? "bg-muted/50" : "hover:bg-muted/30"
                    )}
                  >
                    <div className="flex items-center justify-center w-6">
                      {getRankIcon(rank)}
                    </div>
                    <div
                      className={cn(
                        "w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium",
                        student.avatarColor
                      )}
                    >
                      {getSurname(student.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{student.name}</p>
                      {badge && (
                        <p className="text-xs text-primary flex items-center gap-1">
                          <Trophy className="w-3 h-3" />
                          {badge}
                        </p>
                      )}
                    </div>
                    <span className="text-sm font-semibold text-primary">
                      {student.totalPoints}
                    </span>
                  </div>
                )
              })}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="group" className="flex-1 m-0 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-2">
              {groups.length > 0 ? (
                groups.map((group, index) => {
                  const memberCount = group.members?.length || 0
                  const avgPoints = memberCount > 0 ? Math.round(group.totalPoints / memberCount) : 0
                  return (
                    <div
                      key={group.id}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/30"
                    >
                      <div className="flex items-center justify-center w-6">
                        {getRankIcon(index + 1)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{group.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {memberCount}人 | 平均: {avgPoints}
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-primary">
                        {group.totalPoints}
                      </span>
                    </div>
                  )
                })
              ) : (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  暂无小组
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="rules" className="flex-1 m-0 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium">加分规则</h3>
                <Button variant="ghost" size="sm" className="h-7 gap-1">
                  <Pencil className="w-3 h-3" />
                  编辑
                </Button>
              </div>
              <div className="space-y-2 mb-6">
                <RuleItem name="回答问题" value={2} type="add" />
                <RuleItem name="作业优秀" value={3} type="add" />
                <RuleItem name="帮助同学" value={2} type="add" />
              </div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium">减分规则</h3>
                <Button variant="ghost" size="sm" className="h-7 gap-1">
                  <Pencil className="w-3 h-3" />
                  编辑
                </Button>
              </div>
              <div className="space-y-2">
                <RuleItem name="迟到" value={1} type="deduct" />
                <RuleItem name="作业未交" value={2} type="deduct" />
                <RuleItem name="课堂违纪" value={2} type="deduct" />
              </div>
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="shop" className="flex-1 m-0 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-3">
              <ShopItemCard name="免作业卡" cost={20} stock={10} />
              <ShopItemCard name="换座位卡" cost={15} stock={5} />
              <ShopItemCard name="加餐券" cost={10} stock={20} />
              <ShopItemCard name="文具礼包" cost={50} stock={3} />
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function RuleItem({
  name,
  value,
  type,
}: {
  name: string
  value: number
  type: "add" | "deduct"
}) {
  return (
    <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
      <span className="text-sm">{name}</span>
      <span
        className={cn(
          "text-sm font-medium",
          type === "add" ? "text-green-600" : "text-red-500"
        )}
      >
        {type === "add" ? "+" : "-"}{value}
      </span>
    </div>
  )
}

function ShopItemCard({
  name,
  cost,
  stock,
}: {
  name: string
  cost: number
  stock: number
}) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
      <div>
        <p className="font-medium text-sm">{name}</p>
        <p className="text-xs text-muted-foreground">库存: {stock}</p>
      </div>
      <div className="text-right">
        <p className="text-sm font-semibold text-primary">{cost} 积分</p>
      </div>
    </div>
  )
}
