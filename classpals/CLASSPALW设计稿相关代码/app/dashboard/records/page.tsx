"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Download, CalendarIcon, RotateCcw, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { format, subDays, startOfWeek, startOfMonth } from "date-fns"
import { zhCN } from "date-fns/locale"
import { mockStudents } from "@/lib/mock-data"

type RankingPeriod = "total" | "month" | "week" | "custom"
type RecordType = "honor" | "growth"

export default function RecordsPage() {
  const [recordType, setRecordType] = useState<RecordType>("honor")
  const [rankingTab, setRankingTab] = useState<"personal" | "group">("personal")
  const [period, setPeriod] = useState<RankingPeriod>("total")
  const [startDate, setStartDate] = useState<Date>(startOfMonth(new Date()))
  const [endDate, setEndDate] = useState<Date>(new Date())
  const [searchQuery, setSearchQuery] = useState("")
  const [recordFilter, setRecordFilter] = useState("all")

  // Calculate date range based on period
  const getDateRange = () => {
    const now = new Date()
    switch (period) {
      case "month":
        return { start: startOfMonth(now), end: now }
      case "week":
        return { start: startOfWeek(now, { weekStartsOn: 1 }), end: now }
      case "custom":
        return { start: startDate, end: endDate }
      default:
        return null
    }
  }

  const dateRange = getDateRange()

  // Sort students by total points for ranking
  const rankedStudents = [...mockStudents].sort((a, b) => b.totalPoints - a.totalPoints)

  // Mock growth records
  const growthRecords = [
    { id: 1, studentName: "陈静", ruleName: "主动帮老师收集小组作业", points: 1, time: "2026/3/15 13:40:35", operator: "当前教师" },
    { id: 2, studentName: "张三", ruleName: "课堂积极发言", points: 2, time: "2026/3/15 10:22:15", operator: "当前教师" },
    { id: 3, studentName: "李四", ruleName: "作业完成优秀", points: 3, time: "2026/3/14 16:30:00", operator: "当前教师" },
  ]

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">记录榜单</h1>
          <p className="text-muted-foreground">覆盖光荣榜与成长记录，支持总榜/月榜/周榜/自定义区间与统计分析</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={recordType === "honor" ? "default" : "outline"}
            onClick={() => setRecordType("honor")}
            className={recordType === "honor" ? "bg-[#f97316] hover:bg-[#ea580c]" : ""}
          >
            光荣榜
          </Button>
          <Button
            variant={recordType === "growth" ? "default" : "outline"}
            onClick={() => setRecordType("growth")}
            className={recordType === "growth" ? "bg-[#f97316] hover:bg-[#ea580c]" : ""}
          >
            成长记录
          </Button>
        </div>
      </div>

      {recordType === "honor" && (
        <Card>
          <CardContent className="p-6 space-y-4">
            {/* Ranking tabs */}
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(rankingTab === "personal" && "border-[#f97316] bg-[#f97316] text-white")}
                  onClick={() => setRankingTab("personal")}
                >
                  个人榜
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(rankingTab === "group" && "border-[#f97316] bg-[#f97316] text-white")}
                  onClick={() => setRankingTab("group")}
                >
                  小组 PK 榜
                </Button>
              </div>
              <div className="flex gap-2">
                {(["total", "month", "week", "custom"] as RankingPeriod[]).map((p) => (
                  <Button
                    key={p}
                    variant="outline"
                    size="sm"
                    className={cn(period === p && "border-[#f97316] bg-[#f97316] text-white")}
                    onClick={() => setPeriod(p)}
                  >
                    {p === "total" ? "总榜" : p === "month" ? "月榜" : p === "week" ? "周榜" : "自定义"}
                  </Button>
                ))}
              </div>
            </div>

            {/* Custom date range */}
            {period === "custom" && (
              <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-40">
                      <CalendarIcon className="w-4 h-4 mr-2" />
                      {format(startDate, "yyyy/MM/dd")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={(date) => date && setStartDate(date)}
                      locale={zhCN}
                    />
                  </PopoverContent>
                </Popover>
                <span>~</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-40">
                      <CalendarIcon className="w-4 h-4 mr-2" />
                      {format(endDate, "yyyy/MM/dd")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={(date) => date && setEndDate(date)}
                      locale={zhCN}
                    />
                  </PopoverContent>
                </Popover>
                <Button className="bg-[#f97316] hover:bg-[#ea580c]">应用</Button>
                <Button variant="outline">清空</Button>
              </div>
            )}

            {/* Date range display */}
            {dateRange && (
              <div className="text-sm text-muted-foreground">
                区间: {format(dateRange.start, "yyyy-MM-dd")} ~ {format(dateRange.end, "yyyy-MM-dd")}
              </div>
            )}

            {/* Explanation */}
            {period === "custom" && (
              <p className="text-sm text-muted-foreground">
                口径: 区间净得分 = 加分 - 扣分（不影响累计总分/可用分）
              </p>
            )}

            {/* Ranking table */}
            <div className="flex justify-end text-sm text-muted-foreground">
              {period !== "total" ? "区间净得分口径" : ""}
            </div>

            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-16">排名</TableHead>
                  <TableHead>学生</TableHead>
                  <TableHead>等级</TableHead>
                  <TableHead>徽章</TableHead>
                  <TableHead>累计积分</TableHead>
                  <TableHead>可用积分</TableHead>
                  <TableHead>{period === "total" ? "净得分(总)" : "净得分"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rankedStudents.map((student, index) => {
                  const netPoints = student.totalPoints - (student.totalPoints - student.availablePoints)
                  return (
                    <TableRow 
                      key={student.id}
                      className={cn(index === 0 && "bg-[#fff7ed]")}
                    >
                      <TableCell className="font-semibold text-[#f97316]">#{index + 1}</TableCell>
                      <TableCell className="font-medium">{student.name}</TableCell>
                      <TableCell>Lv.1</TableCell>
                      <TableCell className="text-[#f97316]">0</TableCell>
                      <TableCell className="text-[#f97316]">{student.totalPoints}</TableCell>
                      <TableCell className="text-[#f97316]">{student.availablePoints}</TableCell>
                      <TableCell className={cn(
                        "font-medium",
                        netPoints > 0 ? "text-green-600" : netPoints < 0 ? "text-red-500" : "text-[#f97316]"
                      )}>
                        {netPoints > 0 ? `+${netPoints}` : netPoints}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {recordType === "growth" && (
        <Card>
          <CardContent className="p-6 space-y-4">
            {/* Tabs for growth records */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="border-[#f97316] bg-[#f97316] text-white"
              >
                明细记录
              </Button>
              <Button variant="outline" size="sm">
                概览统计
              </Button>
            </div>

            {/* Export button */}
            <div className="flex justify-end">
              <Button variant="outline" className="text-[#3b82f6]">
                <Download className="w-4 h-4 mr-2" />
                导出 CSV
              </Button>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="按学生姓名搜索"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="justify-start">
                    <CalendarIcon className="w-4 h-4 mr-2" />
                    年 /月/日/
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" locale={zhCN} />
                </PopoverContent>
              </Popover>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="justify-start">
                    <CalendarIcon className="w-4 h-4 mr-2" />
                    年 /月/日/
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" locale={zhCN} />
                </PopoverContent>
              </Popover>
              <Select value={recordFilter} onValueChange={setRecordFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="全部类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部类型</SelectItem>
                  <SelectItem value="add">加分</SelectItem>
                  <SelectItem value="deduct">扣分</SelectItem>
                  <SelectItem value="exchange">兑换</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Records table */}
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>学生姓名</TableHead>
                  <TableHead>规则名称</TableHead>
                  <TableHead>分值</TableHead>
                  <TableHead>操作时间</TableHead>
                  <TableHead>操作人</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {growthRecords.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">{record.studentName}</TableCell>
                    <TableCell className="text-[#3b82f6]">{record.ruleName}</TableCell>
                    <TableCell className={cn(
                      "font-medium",
                      record.points > 0 ? "text-green-600" : "text-red-500"
                    )}>
                      {record.points > 0 ? `+${record.points}` : record.points}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{record.time}</TableCell>
                    <TableCell>{record.operator}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600">
                        <RotateCcw className="w-4 h-4 mr-1" />
                        撤回
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
