"use client"

import { useState, useEffect, useMemo } from "react"
import { Users, UsersRound, FileText, ShoppingBag, Trophy, Medal, Award, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { Student, Group } from "@/lib/mock-data"
import { getSurname } from "@/lib/mock-data"

interface RankingSidebarProps {
  students: Student[]
  groups: Group[]
  rankedGroups?: any[]
  rules?: any[]
  shopItems?: any[]
  className?: string
}

interface RankedGroupMember {
  id: string
  name: string
  totalPoints: number
  availablePoints: number
  points?: number
  periodPoints?: number
  studentNumber?: string | null
}

interface RankedGroup {
  id: string
  name: string
  totalPoints: number
  points?: number
  periodPoints?: number
  availablePoints?: number
  avgPoints?: number
  memberCount?: number
  members?: RankedGroupMember[]
}

export function RankingSidebar({ students, groups, rankedGroups, rules = [], shopItems = [], className }: RankingSidebarProps) {
  const [mounted, setMounted] = useState(false)

  const sortedStudents = useMemo(
    () => [...students].sort((a, b) => (b.totalPoints || 0) - (a.totalPoints || 0)),
    [students]
  )

  const sortedGroups = useMemo<RankedGroup[]>(
    () => (rankedGroups && rankedGroups.length > 0
      ? [...rankedGroups]
      : [...groups].sort((a, b) => (b.totalPoints || 0) - (a.totalPoints || 0))),
    [groups, rankedGroups]
  )

  const addRules = useMemo(
    () => rules.filter((rule) => getRuleType(rule) === "add"),
    [rules]
  )

  const deductRules = useMemo(
    () => rules.filter((rule) => getRuleType(rule) === "deduct"),
    [rules]
  )

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
      <div className={cn("flex min-h-0 flex-1 items-center justify-center", className)}>
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col bg-background", className)}>
      <Tabs defaultValue="personal" className="flex min-h-0 flex-1 flex-col">
        <TabsList className="grid h-auto w-full grid-cols-2 gap-2 rounded-none border-b bg-transparent p-4">
          <TabsTrigger value="personal" className="gap-2 py-2 text-xs sm:text-sm">
            <Users className="w-4 h-4" />
            <span>个人排行</span>
          </TabsTrigger>
          <TabsTrigger value="group" className="gap-2 py-2 text-xs sm:text-sm">
            <UsersRound className="w-4 h-4" />
            <span>小组排行</span>
          </TabsTrigger>
          <TabsTrigger value="rules" className="gap-2 py-2 text-xs sm:text-sm">
            <FileText className="w-4 h-4" />
            <span>积分规则</span>
          </TabsTrigger>
          <TabsTrigger value="shop" className="gap-2 py-2 text-xs sm:text-sm">
            <ShoppingBag className="w-4 h-4" />
            <span>积分商店</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="personal" className="mt-0 min-h-0 flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="space-y-2 p-4">
              {sortedStudents.length > 0 ? (
                sortedStudents.map((student, index) => {
                  const rank = index + 1
                  const badge = getRankBadge(rank)
                  return (
                    <div
                      key={student.id}
                      className={cn(
                        "flex items-center gap-3 rounded-lg p-3 transition-colors",
                        rank <= 3 ? "bg-muted/50" : "hover:bg-muted/30"
                      )}
                    >
                      <div className="flex w-6 items-center justify-center">
                        {getRankIcon(rank)}
                      </div>
                      <div
                        className={cn(
                          "flex h-9 w-9 items-center justify-center rounded-full text-sm font-medium",
                          student.avatarColor
                        )}
                      >
                        {getSurname(student.name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{student.name}</p>
                        {badge && (
                          <p className="flex items-center gap-1 text-xs text-primary">
                            <Trophy className="w-3 h-3" />
                            {badge}
                          </p>
                        )}
                      </div>
                      <span className="text-sm font-semibold text-primary">
                        {student.totalPoints || 0}
                      </span>
                    </div>
                  )
                })
              ) : (
                <EmptyState text="暂无学生排行数据" />
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="group" className="mt-0 min-h-0 flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="space-y-3 p-4">
              {sortedGroups.length > 0 ? (
                sortedGroups.map((group, index) => {
                  const totalPoints = Number(group.totalPoints || group["points"] || group["periodPoints"] || 0)
                  const availablePoints = Number(group.availablePoints || 0)
                  const memberCount = Number(group.memberCount || group.members?.length || 0)
                  const avgPoints = Number(group.avgPoints ?? (memberCount > 0 ? totalPoints / memberCount : 0))
                  const members = Array.isArray(group.members) ? group.members : []

                  return (
                    <details
                      key={group.id}
                      className="overflow-hidden rounded-xl border bg-card"
                    >
                      <summary className="flex cursor-pointer list-none items-center gap-3 p-3 hover:bg-muted/30">
                        <div className="flex w-6 items-center justify-center">
                          {getRankIcon(index + 1)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-medium">{group.name}</p>
                            <span className="text-xs text-muted-foreground">{memberCount} 人</span>
                          </div>
                          <div className="mt-2 grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
                            <span className="rounded-full bg-emerald-50 px-2 py-1 text-emerald-700">累计积分 {totalPoints}</span>
                            <span className="rounded-full bg-blue-50 px-2 py-1 text-blue-700">人均 {avgPoints}</span>
                            <span className="rounded-full bg-purple-50 px-2 py-1 text-purple-700">可兑换积分 {availablePoints}</span>
                          </div>
                        </div>
                      </summary>

                      <div className="border-t bg-muted/10 px-3 py-2">
                        {members.length > 0 ? (
                          <div className="space-y-1">
                            {members.map((member, memberIndex) => (
                              <div
                                key={member.id}
                                className="flex items-center justify-between gap-3 rounded-lg px-2 py-2 text-sm"
                              >
                                <div className="flex min-w-0 items-center gap-3">
                                  <span className="w-8 text-muted-foreground">#{memberIndex + 1}</span>
                                  <span className="truncate font-medium">{member.name}</span>
                                </div>
                                <div className="shrink-0 text-right">
                                  <span className="text-emerald-600">累计积分 {member.points ?? member.periodPoints ?? member.totalPoints}</span>
                                  <span className="ml-2 text-purple-600">可兑换积分 {member.availablePoints}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <EmptyState text="暂无成员明细" compact />
                        )}
                      </div>
                    </details>
                  )
                })
              ) : (
                <EmptyState text="暂无小组排行数据" />
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="rules" className="mt-0 min-h-0 flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="space-y-6 p-4">
              <section>
                <h3 className="mb-3 text-sm font-medium">加分规则</h3>
                <div className="space-y-2">
                  {addRules.length > 0 ? (
                    addRules.map((rule, index) => (
                      <RuleItem
                        key={rule.id || `${getRuleName(rule)}-${index}`}
                        name={getRuleName(rule)}
                        value={getRuleValue(rule)}
                        type="add"
                      />
                    ))
                  ) : (
                    <EmptyState text="暂无加分规则" compact />
                  )}
                </div>
              </section>

              <section>
                <h3 className="mb-3 text-sm font-medium">减分规则</h3>
                <div className="space-y-2">
                  {deductRules.length > 0 ? (
                    deductRules.map((rule, index) => (
                      <RuleItem
                        key={rule.id || `${getRuleName(rule)}-${index}`}
                        name={getRuleName(rule)}
                        value={getRuleValue(rule)}
                        type="deduct"
                      />
                    ))
                  ) : (
                    <EmptyState text="暂无减分规则" compact />
                  )}
                </div>
              </section>
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="shop" className="mt-0 min-h-0 flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="space-y-3 p-4">
              {shopItems.length > 0 ? (
                shopItems.map((item, index) => (
                  <ShopItemCard
                    key={item.id || `${getShopItemName(item)}-${index}`}
                    name={getShopItemName(item)}
                    cost={getShopItemCost(item)}
                    stock={getShopItemStock(item)}
                  />
                ))
              ) : (
                <EmptyState text="暂无积分商店商品" />
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function getRuleType(rule: any): "add" | "deduct" {
  const rawType = String(rule?.type || rule?.ruleType || "ADD").toUpperCase()
  return rawType.includes("DEDUCT") || rawType.includes("MINUS") ? "deduct" : "add"
}

function getRuleName(rule: any) {
  return rule?.name || rule?.title || rule?.reason || "未命名规则"
}

function getRuleValue(rule: any) {
  return Number(rule?.value ?? rule?.points ?? rule?.score ?? 0)
}

function getShopItemName(item: any) {
  return item?.name || item?.title || "未命名商品"
}

function getShopItemCost(item: any) {
  return Number(item?.pointCost ?? item?.points ?? item?.cost ?? item?.price ?? 0)
}

function getShopItemStock(item: any) {
  if (item?.stock === null || item?.stock === undefined) return "不限"
  return String(item.stock)
}

function EmptyState({ text, compact = false }: { text: string; compact?: boolean }) {
  return (
    <div className={cn("text-center text-sm text-muted-foreground", compact ? "py-3" : "py-8")}>
      {text}
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
    <div className="flex items-center justify-between rounded-lg bg-muted/30 p-2">
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
  stock: string
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border bg-card p-3">
      <div>
        <p className="text-sm font-medium">{name}</p>
        <p className="text-xs text-muted-foreground">库存: {stock}</p>
      </div>
      <div className="text-right">
        <p className="text-sm font-semibold text-primary">{cost} 积分</p>
      </div>
    </div>
  )
}
