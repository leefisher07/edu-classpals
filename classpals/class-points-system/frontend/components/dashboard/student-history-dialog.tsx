"use client"

import { useState } from "react"
import { History, RotateCcw, Download } from "lucide-react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { pointsApi } from "@/lib/api/students"
import { toast } from "sonner"
import type { Student } from "@/lib/mock-data"

interface StudentHistoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  student: Student | null
  onRevoke?: (recordId: string) => void
}

type FilterType = "all" | "add" | "deduct"

export function StudentHistoryDialog({
  open,
  onOpenChange,
  student,
}: StudentHistoryDialogProps) {
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState<FilterType>("all")
  const [page, setPage] = useState(1)

  const { data: historyData, isLoading } = useQuery({
    queryKey: ['student-history', student?.id, page],
    queryFn: () => pointsApi.history(student?.id!, { page, limit: 20 }),
    enabled: !!student?.id && open,
  })

  const revokeMutation = useMutation({
    mutationFn: (recordId: string) => pointsApi.revoke(recordId),
    onSuccess: () => {
      toast.success("撤回成功")
      queryClient.invalidateQueries({ queryKey: ['student-history'] })
      queryClient.invalidateQueries({ queryKey: ['students'] })
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "撤回失败")
    },
  })

  const records = Array.isArray(historyData)
    ? historyData
    : Array.isArray((historyData as any)?.records)
      ? (historyData as any).records
      : Array.isArray((historyData as any)?.data?.records)
        ? (historyData as any).data.records
        : []
  const total = (historyData as any)?.total || (historyData as any)?.data?.total || 0

  const filters: { value: FilterType; label: string }[] = [
    { value: "all", label: "全部" },
    { value: "add", label: "加分" },
    { value: "deduct", label: "减分" },
  ]

  const filteredRecords = records.filter((record: any) => {
    if (filter === "all") return true
    if (filter === "add") return record.points > 0
    if (filter === "deduct") return record.points < 0
    return true
  })

  const handleExport = () => {
    if (!student) return

    if (records.length === 0) {
      toast.error("暂无可导出的积分明细")
      return
    }

    const lines = [
      ['学生姓名', '分值', '原因', '操作人', '时间', '状态'].join(','),
      ...records.map((record: any) => [
        `"${student.name}"`,
        record.points,
        `"${String(record.reason || '').replace(/"/g, '""')}"`,
        `"${String(record.operatorName || '').replace(/"/g, '""')}"`,
        `"${new Date(record.createdAt).toLocaleString('zh-CN')}"`,
        `"${record.isRevoked ? '已撤回' : '正常'}"`,
      ].join(',')),
    ]

    const blob = new Blob([`\uFEFF${lines.join('\n')}`], { type: 'text/csv;charset=utf-8;' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${student.name}-积分明细.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
    toast.success("积分明细已导出")
  }

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

        {/* 记录统计 */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>当前共 {filteredRecords.length} 条</span>
        </div>

        {/* 记录列表 */}
        <div className="min-h-[250px] max-h-[350px] overflow-auto space-y-3">
          {isLoading ? (
            <div className="flex items-center justify-center h-[200px] text-muted-foreground">
              加载中...
            </div>
          ) : filteredRecords.length > 0 ? (
            filteredRecords.map((record: any) => (
              <div
                key={record.id}
                className="flex items-start justify-between p-4 rounded-lg border"
              >
                <div className="flex-1">
                  <p className="font-medium">{record.reason}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {new Date(record.createdAt).toLocaleString('zh-CN')}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    操作人：{record.operatorName}
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
                  {record.canRevoke && !record.isRevoked && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => revokeMutation.mutate(record.id)}
                      disabled={revokeMutation.isPending}
                    >
                      <RotateCcw className="w-3.5 h-3.5 mr-1" />
                      撤回
                    </Button>
                  )}
                  {record.isRevoked && (
                    <span className="text-xs text-muted-foreground">已撤回</span>
                  )}
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
            <span className="text-primary">累计积分 {student.totalPoints}</span>
            <span className="mx-2">·</span>
            <span className="text-green-600">可兑换积分 {student.availablePoints}</span>
            <span className="mx-2">·</span>
            <span className="text-muted-foreground">总记录 {total}</span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-1" onClick={handleExport}>
              <Download className="w-4 h-4" />
              导出明细
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
