"use client"

import { useState } from "react"
import { History, RotateCcw, Download, Share2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import type { Student } from "@/lib/mock-data"

// 模拟积分记录数据
const mockRecords = [
  {
    id: "1",
    type: "add" as const,
    reason: "主动帮老师收集小组作业",
    points: 1,
    timestamp: "2026/3/15 13:40:35",
    balanceBefore: 0,
    balanceAfter: 1,
  },
]

interface StudentHistoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  student: Student | null
  onRevoke?: (recordId: string) => void
}

type FilterType = "all" | "add" | "deduct" | "exchange"

export function StudentHistoryDialog({
  open,
  onOpenChange,
  student,
  onRevoke,
}: StudentHistoryDialogProps) {
  const [filter, setFilter] = useState<FilterType>("all")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("2026/03/15")

  const filters: { value: FilterType; label: string }[] = [
    { value: "all", label: "全部" },
    { value: "add", label: "加分" },
    { value: "deduct", label: "减分" },
    { value: "exchange", label: "兑换" },
  ]

  const filteredRecords = mockRecords.filter((record) => {
    if (filter === "all") return true
    if (filter === "add") return record.type === "add"
    if (filter === "deduct") return record.type === "deduct"
    if (filter === "exchange") return record.type === "exchange"
    return true
  })

  if (!student) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="w-5 h-5 text-primary" />
            {student.name} 的积分明细
          </DialogTitle>
        </DialogHeader>

        {/* 筛选器 */}
        <div className="flex flex-wrap items-center gap-2">
          {filters.map((f) => (
            <button
              key={f.value}
              className={cn(
                "px-4 py-1.5 rounded-md text-sm font-medium border transition-colors",
                filter === f.value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border hover:bg-muted"
              )}
              onClick={() => setFilter(f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* 日期范围选择器 */}
        <div className="flex items-center gap-2">
          <Input
            type="text"
            placeholder="年 /月/日/"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="flex-1"
          />
          <span className="text-muted-foreground">~</span>
          <Input
            type="text"
            placeholder="2026/03/15/"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="flex-1"
          />
          <Button size="sm" className="bg-primary">
            应用
          </Button>
          <Button size="sm" variant="outline">
            清空
          </Button>
        </div>

        {/* 记录统计 */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>当前共 {filteredRecords.length} 条</span>
          <button className="text-primary hover:underline">重置日期</button>
        </div>

        {/* 记录列表 */}
        <div className="min-h-[250px] max-h-[350px] overflow-auto space-y-3">
          {filteredRecords.length > 0 ? (
            filteredRecords.map((record) => (
              <div
                key={record.id}
                className="flex items-start justify-between p-4 rounded-lg border"
              >
                <div className="flex-1">
                  <p className="font-medium">{record.reason}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {record.timestamp}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    可用余额：{record.balanceBefore} → {record.balanceAfter}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      "font-bold text-lg",
                      record.points > 0 ? "text-green-600" : "text-red-500"
                    )}
                  >
                    {record.points > 0 ? `+${record.points}` : record.points}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onRevoke?.(record.id)}
                  >
                    <RotateCcw className="w-3.5 h-3.5 mr-1" />
                    撤回
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <div className="flex items-center justify-center h-[200px] text-muted-foreground">
              暂无记录
            </div>
          )}
        </div>

        {/* 底部操作 */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-sm">
            <span className="text-primary">总分 {student.totalPoints}</span>
            <span className="mx-2">·</span>
            <span className="text-green-600">可用 {student.availablePoints}</span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-1">
              <Download className="w-4 h-4" />
              导出明细
            </Button>
            <Button variant="outline" size="sm" className="gap-1">
              <Share2 className="w-4 h-4" />
              家长模板
            </Button>
            <Button size="sm" onClick={() => onOpenChange(false)}>
              关闭
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
