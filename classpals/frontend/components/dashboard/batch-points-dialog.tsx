"use client"

import { useState, useMemo } from "react"
import { Plus, Minus, Search, Users, FileText, Settings2 } from "lucide-react"
import { useMutation } from "@tanstack/react-query"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { pointsApi } from "@/lib/api/students"
import { toast } from "sonner"
import type { Student, PointRule } from "@/lib/mock-data"

interface BatchPointsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  type: "add" | "deduct"
  students: Student[]
  rules: PointRule[]
  classId?: string
  onSuccess?: () => void
  onConfirm?: (data: {
    studentIds: string[]
    value: number
    reason?: string
    ruleId?: string
  }) => void
}

export function BatchPointsDialog({
  open,
  onOpenChange,
  type,
  students,
  rules,
  classId,
  onSuccess,
  onConfirm,
}: BatchPointsDialogProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set())
  const [selectedRule, setSelectedRule] = useState<string | null>(null)
  const [customValue, setCustomValue] = useState("")
  const [customReason, setCustomReason] = useState("")
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)

  // Filter rules by type
  const filteredRules = useMemo(() => {
    return rules.filter((r) =>
      type === "add" ? (r.type as string) === "ADD" : (r.type as string) === "DEDUCT"
    )
  }, [rules, type])

  const batchPointsMutation = useMutation({
    mutationFn: (data: any) => pointsApi.batch(classId!, data),
    onSuccess: (response) => {
      const count = (response as any)?.data?.updated || 0
      toast.success(`成功为 ${count} 名学生${type === "add" ? "加分" : "扣分"}`)
      onSuccess?.()
      handleReset()
      onOpenChange(false)
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || `批量${type === "add" ? "加分" : "扣分"}失败`)
    },
  })

  const filteredStudents = useMemo(() => {
    if (!searchQuery) return students
    return students.filter(
      (s) =>
        s.name.includes(searchQuery) ||
        s.studentNo?.includes(searchQuery)
    )
  }, [students, searchQuery])

  const toggleStudent = (id: string) => {
    const newSelected = new Set(selectedStudents)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedStudents(newSelected)
  }

  const selectAll = () => {
    setSelectedStudents(new Set(filteredStudents.map((s) => s.id)))
  }

  const selectInverse = () => {
    const newSelected = new Set<string>()
    filteredStudents.forEach((s) => {
      if (!selectedStudents.has(s.id)) {
        newSelected.add(s.id)
      }
    })
    setSelectedStudents(newSelected)
  }

  const clearSelection = () => {
    setSelectedStudents(new Set())
  }

  const handleRuleSelect = (ruleId: string) => {
    setSelectedRule(ruleId)
    setCustomValue("")
  }

  const handleCustomValueChange = (value: string) => {
    setCustomValue(value)
    setSelectedRule(null)
  }

  const handleReset = () => {
    setSelectedStudents(new Set())
    setSelectedRule(null)
    setCustomValue("")
    setCustomReason("")
    setSearchQuery("")
    setShowConfirmDialog(false)
  }

  const handleInitialConfirm = () => {
    if (selectedStudents.size === 0) {
      toast.error("请选择学生")
      return
    }

    const rule = filteredRules.find((r) => r.id === selectedRule)
    const value = rule ? Math.abs((rule as any).points || (rule as any).value || 0) : parseInt(customValue) || 0

    if (value <= 0) {
      toast.error("请选择规则或输入分值")
      return
    }

    setShowConfirmDialog(true)
  }

  const handleFinalConfirm = () => {
    if (!classId) {
      toast.error("请先选择班级")
      return
    }

    const rule = filteredRules.find((r) => r.id === selectedRule)
    const value = rule ? Math.abs((rule as any).points || (rule as any).value || 0) : parseInt(customValue) || 0

    batchPointsMutation.mutate({
      studentIds: Array.from(selectedStudents),
      type: type === "add" ? "ADD" : "DEDUCT",
      value,
      reason: customReason || rule?.name,
      ruleId: selectedRule || undefined,
    })
  }

  const isAdd = type === "add"
  const title = isAdd ? "批量加分" : "批量减分"
  const confirmText = isAdd ? "确认加分" : "确认减分"
  const ruleTitle = isAdd ? "选择加分规则" : "选择减分规则"

  const rule = filteredRules.find((r) => r.id === selectedRule)
  const value = rule ? Math.abs((rule as any).points || (rule as any).value || 0) : parseInt(customValue) || 0
  const reason = customReason || rule?.name || "自定义"
  const selectedStudentsList = students.filter(s => selectedStudents.has(s.id))

  return (
    <>
      <Dialog open={open && !showConfirmDialog} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isAdd ? (
              <Plus className="w-5 h-5 text-green-600" />
            ) : (
              <Minus className="w-5 h-5 text-red-500" />
            )}
            {title}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden space-y-4">
          {/* 选择学生区域 */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                <span className="font-medium">选择学生</span>
                <span className="text-sm text-primary">
                  已选: {selectedStudents.size}/{students.length}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={selectAll}>
                  全选
                </Button>
                <Button variant="outline" size="sm" onClick={selectInverse}>
                  反选
                </Button>
                <Button variant="outline" size="sm" onClick={clearSelection}>
                  清空
                </Button>
              </div>
            </div>

            {/* 搜索框 */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="搜索学生姓名或学号..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* 学生列表 */}
            <ScrollArea className="h-40">
              <div className="grid grid-cols-4 gap-2">
                {filteredStudents.map((student) => (
                  <label
                    key={student.id}
                    className={cn(
                      "flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors",
                      selectedStudents.has(student.id)
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <Checkbox
                      checked={selectedStudents.has(student.id)}
                      onCheckedChange={() => toggleStudent(student.id)}
                    />
                    <span className="text-sm truncate">{student.name}</span>
                  </label>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* 选择规则区域 */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-4 h-4 text-primary" />
              <span className="font-medium">{ruleTitle}</span>
              <span className="text-xs text-muted-foreground">(点选规则可快速操作)</span>
            </div>

            {filteredRules.length > 0 ? (
              <div className="flex flex-wrap gap-2 mb-4">
                {filteredRules.map((rule) => (
                  <Button
                    key={rule.id}
                    variant={selectedRule === rule.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleRuleSelect(rule.id)}
                    className="gap-1"
                  >
                    {rule.name}
                    <span
                      className={cn(
                        "text-xs",
                        selectedRule === rule.id
                          ? "text-primary-foreground/80"
                          : isAdd
                          ? "text-green-600"
                          : "text-red-500"
                      )}
                    >
                      {isAdd ? "+" : "-"}{Math.abs((rule as any).points || (rule as any).value || 0)}
                    </span>
                  </Button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground mb-4">
                暂无{isAdd ? "加分" : "减分"}规则，请先在右侧栏添加规则，或使用下方自定义分值
              </p>
            )}
          </div>

          {/* 自定义分值区域 */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Settings2 className="w-4 h-4 text-primary" />
              <span className="font-medium">自定义分值</span>
              <span className="text-xs text-muted-foreground">(输入后规则选择将取消)</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>分值 *</Label>
                <Input
                  type="number"
                  placeholder={`输入${isAdd ? "加分" : "减分"}值`}
                  value={customValue}
                  onChange={(e) => handleCustomValueChange(e.target.value)}
                  min={1}
                />
              </div>
              <div className="space-y-2">
                <Label>原因 (可选)</Label>
                <Input
                  placeholder={`输入${isAdd ? "加分" : "减分"}原因`}
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            onClick={handleInitialConfirm}
            disabled={selectedStudents.size === 0 || (!selectedRule && !customValue)}
            className={cn(
              "gap-1",
              isAdd
                ? "bg-green-600 hover:bg-green-700"
                : "bg-red-500 hover:bg-red-600"
            )}
          >
            {isAdd ? <Plus className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
            {confirmText}
          </Button>
        </div>
      </DialogContent>
    </Dialog>

    {/* 二次确认对话框 */}
    <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isAdd ? "批量加分设置" : "批量减分设置"}
          </DialogTitle>
          <DialogDescription>
            请确认以下信息后提交
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-muted/50 p-4 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">操作类型</span>
              <span className={cn(
                "font-medium",
                isAdd ? "text-green-600" : "text-red-500"
              )}>
                {isAdd ? "批量加分" : "批量减分"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">已选学生</span>
              <span className="font-medium">{selectedStudents.size} 名学生</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">分值</span>
              <span className={cn(
                "font-bold text-lg",
                isAdd ? "text-green-600" : "text-red-500"
              )}>
                {isAdd ? "+" : "-"}{value}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">操作原因</span>
              <span className="font-medium">{reason}</span>
            </div>
          </div>

          <div className="text-sm text-muted-foreground">
            <p className="font-medium mb-2">学生名单：</p>
            <div className="flex flex-wrap gap-2">
              {selectedStudentsList.map(s => (
                <span key={s.id} className="px-2 py-1 bg-muted rounded">
                  {s.name}
                </span>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
            取消
          </Button>
          <Button
            onClick={handleFinalConfirm}
            disabled={batchPointsMutation.isPending}
            className={cn(
              isAdd
                ? "bg-green-600 hover:bg-green-700"
                : "bg-red-500 hover:bg-red-600"
            )}
          >
            {batchPointsMutation.isPending ? "处理中..." : confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  )
}
