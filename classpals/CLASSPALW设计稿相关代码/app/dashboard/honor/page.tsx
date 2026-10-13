"use client"

import { useState, useMemo } from "react"
import { Users, UsersRound, Trophy, Medal, Award, TrendingUp, TrendingDown, Minus, Share2, Printer } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { mockStudents, mockGroups, getSurname } from "@/lib/mock-data"

type RankingType = "personal" | "group"
type TimeRange = "total" | "month" | "week" | "custom"

export default function HonorPage() {
  const [rankingType, setRankingType] = useState<RankingType>("personal")
  const [timeRange, setTimeRange] = useState<TimeRange>("total")

  // Mock 数据 - 实际应用中会根据 timeRange 从后端获取
  const getTimeRangeLabel = () => {
    switch (timeRange) {
      case "total":
        return "累计总榜"
      case "month":
        return "2026-03-01 ~ 2026-03-15"
      case "week":
        return "2026-03-09 ~ 2026-03-15"
      case "custom":
        return "自定义时间"
    }
  }

  const sortedStudents = useMemo(() => {
    return [...mockStudents].sort((a, b) => b.totalPoints - a.totalPoints)
  }, [])

  const sortedGroups = useMemo(() => {
    return [...mockGroups].sort((a, b) => b.totalPoints - a.totalPoints)
  }, [])

  // Mock 周变化数据
  const getWeekChange = (index: number) => {
    const changes = [1, 0, -1, 2, 0, -2, 1, 0, 0, -1, 2, 1, 0, -1, 0]
    return changes[index] || 0
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* 页面标题 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">光荣榜</h1>
          <p className="text-sm text-muted-foreground mt-1">
            个人排行 / 小组排行，支持总榜、月榜、周榜、自定义时间区间
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Share2 className="w-4 h-4" />
            分享海报
          </Button>
          <Button variant="outline" size="sm" className="gap-2">
            <Printer className="w-4 h-4" />
            打印
          </Button>
        </div>
      </div>

      {/* 排行类型和时间选择 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            {/* 排行类型切换 */}
            <ToggleGroup
              type="single"
              value={rankingType}
              onValueChange={(value) => value && setRankingType(value as RankingType)}
              className="justify-start"
            >
              <ToggleGroupItem
                value="personal"
                className="gap-2 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
              >
                <Users className="w-4 h-4" />
                个人排行
              </ToggleGroupItem>
              <ToggleGroupItem
                value="group"
                className="gap-2 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
              >
                <UsersRound className="w-4 h-4" />
                小组排行
              </ToggleGroupItem>
            </ToggleGroup>

            {/* 时间范围选择 */}
            <ToggleGroup
              type="single"
              value={timeRange}
              onValueChange={(value) => value && setTimeRange(value as TimeRange)}
              className="justify-start"
            >
              <ToggleGroupItem value="total" className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                总榜
              </ToggleGroupItem>
              <ToggleGroupItem value="month" className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                月榜
              </ToggleGroupItem>
              <ToggleGroupItem value="week" className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                周榜
              </ToggleGroupItem>
              <ToggleGroupItem value="custom" className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                自定义
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          <p className="text-sm text-muted-foreground mt-3">
            区间: {getTimeRangeLabel()}
          </p>
        </CardContent>
      </Card>

      {/* 排行榜内容 */}
      {rankingType === "personal" ? (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">个人积分排行</CardTitle>
              <span className="text-sm text-muted-foreground">
                区间净增分口径
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {/* 表头 */}
            <div className="grid grid-cols-12 gap-4 px-6 py-3 border-b bg-muted/30 text-sm font-medium text-muted-foreground">
              <div className="col-span-1">排名</div>
              <div className="col-span-4">姓名</div>
              <div className="col-span-2 text-center">累计</div>
              <div className="col-span-2 text-center">可用</div>
              <div className="col-span-3 text-right">变化</div>
            </div>

            {/* 排行列表 */}
            <div className="divide-y">
              {sortedStudents.map((student, index) => {
                const rank = index + 1
                const weekChange = getWeekChange(index)
                return (
                  <div
                    key={student.id}
                    className={cn(
                      "grid grid-cols-12 gap-4 px-6 py-4 items-center transition-colors hover:bg-muted/30",
                      rank === 1 && "bg-yellow-50/50",
                      rank === 2 && "bg-gray-50/50",
                      rank === 3 && "bg-amber-50/50"
                    )}
                  >
                    {/* 排名 */}
                    <div className="col-span-1 flex items-center">
                      {rank === 1 ? (
                        <Trophy className="w-5 h-5 text-yellow-500" />
                      ) : rank === 2 ? (
                        <Medal className="w-5 h-5 text-gray-400" />
                      ) : rank === 3 ? (
                        <Award className="w-5 h-5 text-amber-600" />
                      ) : (
                        <span className="text-sm font-medium text-muted-foreground">
                          #{rank}
                        </span>
                      )}
                    </div>

                    {/* 姓名 */}
                    <div className="col-span-4 flex items-center gap-3">
                      <div
                        className={cn(
                          "w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium",
                          student.avatarColor
                        )}
                      >
                        {getSurname(student.name)}
                      </div>
                      <span className="font-medium">{student.name}</span>
                    </div>

                    {/* 累计 */}
                    <div className="col-span-2 text-center">
                      <span className="text-primary font-semibold">
                        累计 {student.totalPoints}
                      </span>
                    </div>

                    {/* 可用 */}
                    <div className="col-span-2 text-center">
                      <span className="text-green-600 font-semibold">
                        可用 {student.availablePoints}
                      </span>
                    </div>

                    {/* 变化 */}
                    <div className="col-span-3 text-right">
                      {weekChange > 0 ? (
                        <span className="inline-flex items-center gap-1 text-green-600 font-semibold">
                          <TrendingUp className="w-4 h-4" />
                          +{weekChange}
                        </span>
                      ) : weekChange < 0 ? (
                        <span className="inline-flex items-center gap-1 text-red-500 font-semibold">
                          <TrendingDown className="w-4 h-4" />
                          {weekChange}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-muted-foreground">
                          <Minus className="w-4 h-4" />
                          0
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">小组积分排行</CardTitle>
              <span className="text-sm text-muted-foreground">
                区间净增分口径
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {/* 表头 */}
            <div className="grid grid-cols-12 gap-4 px-6 py-3 border-b bg-muted/30 text-sm font-medium text-muted-foreground">
              <div className="col-span-1">排名</div>
              <div className="col-span-4">小组名称</div>
              <div className="col-span-2 text-center">人数</div>
              <div className="col-span-2 text-center">总分</div>
              <div className="col-span-3 text-right">平均分</div>
            </div>

            {/* 排行列表 */}
            <div className="divide-y">
              {sortedGroups.map((group, index) => {
                const rank = index + 1
                return (
                  <div
                    key={group.id}
                    className={cn(
                      "grid grid-cols-12 gap-4 px-6 py-4 items-center transition-colors hover:bg-muted/30",
                      rank === 1 && "bg-yellow-50/50",
                      rank === 2 && "bg-gray-50/50",
                      rank === 3 && "bg-amber-50/50"
                    )}
                  >
                    {/* 排名 */}
                    <div className="col-span-1 flex items-center">
                      {rank === 1 ? (
                        <Trophy className="w-5 h-5 text-yellow-500" />
                      ) : rank === 2 ? (
                        <Medal className="w-5 h-5 text-gray-400" />
                      ) : rank === 3 ? (
                        <Award className="w-5 h-5 text-amber-600" />
                      ) : (
                        <span className="text-sm font-medium text-muted-foreground">
                          #{rank}
                        </span>
                      )}
                    </div>

                    {/* 小组名称 */}
                    <div className="col-span-4 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                        <UsersRound className="w-5 h-5 text-primary" />
                      </div>
                      <span className="font-medium">{group.name}</span>
                    </div>

                    {/* 人数 */}
                    <div className="col-span-2 text-center">
                      <span className="text-muted-foreground">
                        {group.memberCount} 人
                      </span>
                    </div>

                    {/* 总分 */}
                    <div className="col-span-2 text-center">
                      <span className="text-primary font-semibold">
                        {group.totalPoints}
                      </span>
                    </div>

                    {/* 平均分 */}
                    <div className="col-span-3 text-right">
                      <span className="text-green-600 font-semibold">
                        {group.averagePoints}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
