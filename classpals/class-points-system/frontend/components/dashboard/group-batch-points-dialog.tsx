"use client"

import { useState } from "react"
import { Search, Plus, Minus } from "lucide-react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import { type Student } from "@/lib/mock-data"

interface GroupBatchPointsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: "add" | "deduct"
  groupName: string
  students: Student[]
  onConfirm: (studentIds: string[], points: number) => void | Promise<void>
}

export function GroupBatchPointsDialog({
  open,
  onOpenChange,
  mode,
  groupName,
  students,
  onConfirm,
}: GroupBatchPointsDialogProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [points, setPoints] = useState("")
  const [reason, setReason] = useState("")
  const [showConfirm, setShowConfirm] = useState(false)

  const filteredStudents = students.filter(s =>
    s.name.includes(searchQuery) || s.studentNo?.includes(searchQuery)
  )

  const handleToggle = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  const handleSelectAll = () => {
    if (selectedIds.length === filteredStudents.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(filteredStudents.map(s => s.id))
    }
  }

  const handleClear = () => {
    setSelectedIds([])
  }

  const handleNext = () => {
    if (selectedIds.length === 0) {
      return
    }
    if (!points || parseInt(points) <= 0) {
      return
    }
    setShowConfirm(true)
  }

  const handleFinalConfirm = async () => {
    try {
      await Promise.resolve(onConfirm(selectedIds, parseInt(points)))
      toast.success(`成功为 ${selectedIds.length} 名学生${isDeduct ? "减分" : "加分"}`)
      setSelectedIds([])
      setSearchQuery("")
      setPoints("")
      setReason("")
      setShowConfirm(false)
      onOpenChange(false)
    } catch (error: any) {
      toast.error(error?.message || `${isDeduct ? "减分" : "加分"}失败`)
    }
  }

  const handleCancel = () => {
    setSelectedIds([])
    setSearchQuery("")
    setPoints("")
    setReason("")
    setShowConfirm(false)
    onOpenChange(false)
  }

  const isDeduct = mode === "deduct"
  const title = isDeduct ? `批量减分 - ${groupName}` : `批量加分 - ${groupName}`
  const selectedStudentsList = students.filter(s => selectedIds.includes(s.id))

  return (
    <>
      <Dialog open={open && !showConfirm} onOpenChange={handleCancel}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className={isDeduct ? "text-destructive" : ""}>
              {title}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Search and Actions */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="搜索姓名或学号"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button variant="outline" size="sm" onClick={handleSelectAll}>
                {selectedIds.length === filteredStudents.length ? "取消" : "全选"}
              </Button>
              <Button variant="outline" size="sm" onClick={handleClear}>
                清空
              </Button>
            </div>

            {/* Student List */}
            <div className="border rounded-lg max-h-64 overflow-auto">
              {filteredStudents.length > 0 ? (
                filteredStudents.map((student) => (
                  <label
                    key={student.id}
                    className="flex items-center gap-3 p-3 hover:bg-muted cursor-pointer border-b last:border-b-0"
                  >
                    <Checkbox
                      checked={selectedIds.includes(student.id)}
                      onCheckedChange={() => handleToggle(student.id)}
                    />
                    <span className="font-medium">{student.name}</span>
                    <span className="text-sm text-muted-foreground ml-auto">
                      累计积分 {student.totalPoints} · 可兑换积分 {student.availablePoints}
                    </span>
                  </label>
                ))
              ) : (
                <div className="p-4 text-center text-muted-foreground">
                  暂无成员
                </div>
              )}
            </div>

            <p className="text-sm text-muted-foreground">
              已选 {selectedIds.length} 人
            </p>

            {/* Points Input */}
            <div className="space-y-2">
              <Label>{isDeduct ? "减分" : "加分"}分值 *</Label>
              <Input
                type="number"
                placeholder={`输入${isDeduct ? "减分" : "加分"}值`}
                value={points}
                onChange={(e) => setPoints(e.target.value)}
                min={1}
              />
            </div>

            <div className="space-y-2">
              <Label>原因 (可选)</Label>
              <Input
                placeholder={`输入${isDeduct ? "减分" : "加分"}原因`}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCancel}>
              取消
            </Button>
            <Button
              onClick={handleNext}
              disabled={selectedIds.length === 0 || !points || parseInt(points) <= 0}
              className={cn(
                isDeduct
                  ? "bg-red-500 hover:bg-red-600 text-white"
                  : "bg-green-600 hover:bg-green-700 text-white"
              )}
            >
              确定
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {isDeduct ? "批量减分确认" : "批量加分确认"}
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
                  isDeduct ? "text-red-500" : "text-green-600"
                )}>
                  {isDeduct ? "批量减分" : "批量加分"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">小组</span>
                <span className="font-medium">{groupName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">已选学生</span>
                <span className="font-medium">{selectedIds.length} 名学生</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">分值</span>
                <span className={cn(
                  "font-bold text-lg",
                  isDeduct ? "text-red-500" : "text-green-600"
                )}>
                  {isDeduct ? "-" : "+"}{points}
                </span>
              </div>
              {reason && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">原因</span>
                  <span className="font-medium">{reason}</span>
                </div>
              )}
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
            <Button variant="outline" onClick={() => setShowConfirm(false)}>
              取消
            </Button>
            <Button
              onClick={handleFinalConfirm}
              className={cn(
                isDeduct
                  ? "bg-red-500 hover:bg-red-600 text-white"
                  : "bg-green-600 hover:bg-green-700 text-white"
              )}
            >
              确定
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
