"use client"

import { useState } from "react"
import { Package, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import type { Student } from "@/lib/mock-data"

// 模拟积分规则数据
const mockAddRules = [
  { id: "1", name: "主动打扫卫生", points: 1 },
  { id: "2", name: "帮助同学", points: 2 },
  { id: "3", name: "作业全对", points: 3 },
  { id: "4", name: "课堂表现优秀", points: 1 },
]

const mockDeductRules = [
  { id: "1", name: "课堂上聊天", points: -1 },
  { id: "2", name: "作业未完成", points: -2 },
  { id: "3", name: "迟到", points: -1 },
]

interface StudentPointsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  student: Student | null
  mode: "add" | "deduct"
  onConfirm?: (points: number, reason: string) => void
}

export function StudentPointsDialog({
  open,
  onOpenChange,
  student,
  mode,
  onConfirm,
}: StudentPointsDialogProps) {
  const [activeTab, setActiveTab] = useState<"rules" | "custom">("rules")
  const [selectedRule, setSelectedRule] = useState<string | null>(null)
  const [customPoints, setCustomPoints] = useState("")
  const [notes, setNotes] = useState("")

  const rules = mode === "add" ? mockAddRules : mockDeductRules
  const selectedRuleData = rules.find((r) => r.id === selectedRule)

  const getTotalPoints = () => {
    if (activeTab === "rules" && selectedRuleData) {
      return Math.abs(selectedRuleData.points)
    }
    if (activeTab === "custom" && customPoints) {
      return Math.abs(parseFloat(customPoints) || 0)
    }
    return 0
  }

  const handleConfirm = () => {
    const points = getTotalPoints()
    const reason =
      activeTab === "rules" && selectedRuleData
        ? selectedRuleData.name
        : notes || "自定义"
    onConfirm?.(mode === "add" ? points : -points, reason)
    handleClose()
  }

  const handleClose = () => {
    setActiveTab("rules")
    setSelectedRule(null)
    setCustomPoints("")
    setNotes("")
    onOpenChange(false)
  }

  if (!student) return null

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            为 {student.name} {mode === "add" ? "加分" : "扣分"}
          </DialogTitle>
        </DialogHeader>

        {/* 标签页切换 */}
        <div className="flex rounded-lg bg-muted p-1">
          <button
            className={cn(
              "flex-1 py-2.5 text-sm font-medium rounded-md transition-colors",
              activeTab === "rules"
                ? "bg-foreground text-background shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => setActiveTab("rules")}
          >
            积分规则
          </button>
          <button
            className={cn(
              "flex-1 py-2.5 text-sm font-medium rounded-md transition-colors",
              activeTab === "custom"
                ? "bg-foreground text-background shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => setActiveTab("custom")}
          >
            自定义
          </button>
        </div>

        {/* 模式提示 */}
        <div className="text-sm">
          模式：
          <span className={mode === "add" ? "text-green-600" : "text-red-500"}>
            {mode === "add" ? "+ 加分" : "- 扣分"}
          </span>
        </div>

        {/* 内容区域 */}
        <div className="min-h-[200px]">
          {activeTab === "rules" ? (
            <div className="space-y-2">
              {rules.map((rule) => (
                <div
                  key={rule.id}
                  className={cn(
                    "flex items-center justify-between p-4 rounded-lg border transition-colors cursor-pointer",
                    selectedRule === rule.id
                      ? "border-primary bg-primary/5"
                      : "hover:bg-muted/50"
                  )}
                  onClick={() => setSelectedRule(rule.id)}
                >
                  <span className="font-medium">{rule.name}</span>
                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        "font-semibold",
                        rule.points > 0 ? "text-green-600" : "text-red-500"
                      )}
                    >
                      {rule.points > 0 ? `+${rule.points}` : rule.points}
                    </span>
                    {selectedRule === rule.id ? (
                      <div className="w-16 h-8 bg-primary text-primary-foreground rounded-md flex items-center justify-center text-sm">
                        <Check className="w-4 h-4 mr-1" />
                        已选
                      </div>
                    ) : (
                      <Button variant="outline" size="sm" className="w-16">
                        选择
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4 p-4 rounded-lg border">
              <div>
                <label className="text-sm font-medium">
                  自定义{mode === "add" ? "加" : "扣"}分值
                </label>
                <Input
                  type="number"
                  placeholder={`输入${mode === "add" ? "加" : "扣"}分值，如 ${mode === "add" ? "2" : "1"}`}
                  value={customPoints}
                  onChange={(e) => setCustomPoints(e.target.value)}
                  className="mt-2"
                  min="0"
                  step="0.5"
                />
              </div>
              <div>
                <label className="text-sm font-medium">
                  备注 <span className="text-muted-foreground">(可选)</span>
                </label>
                <Textarea
                  placeholder="输入加减分理由"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="mt-2 resize-none"
                  rows={3}
                />
              </div>
            </div>
          )}
        </div>

        {/* 底部状态栏 */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Package className="w-4 h-4" />
            <span className="text-sm">
              {getTotalPoints() > 0
                ? `已选择规则`
                : "未选择规则"}
            </span>
          </div>
          <span
            className={cn(
              "text-2xl font-bold",
              mode === "add" ? "text-green-600" : "text-red-500"
            )}
          >
            {getTotalPoints()}分
          </span>
        </div>

        {/* 操作按钮 */}
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={handleClose}>
            取消
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={getTotalPoints() === 0}
            className={cn(
              mode === "deduct" &&
                "bg-red-500 hover:bg-red-600 text-white"
            )}
          >
            确认{mode === "add" ? "加分" : "减分"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
