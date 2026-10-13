"use client"

import { useState } from "react"
import { Search } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { type Student } from "@/lib/mock-data"

interface GroupBatchPointsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: "add" | "deduct"
  groupName: string
  students: Student[]
  onConfirm: (studentIds: string[], points: number) => void
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

  const handleConfirm = () => {
    // For now, just confirm with selected students
    // TODO: Add points input
    onConfirm(selectedIds, 1)
    setSelectedIds([])
    setSearchQuery("")
    onOpenChange(false)
  }

  const handleCancel = () => {
    setSelectedIds([])
    setSearchQuery("")
    onOpenChange(false)
  }

  const isDeduct = mode === "deduct"
  const title = isDeduct ? `批量减分 - ${groupName}` : `批量加分 - ${groupName}`

  return (
    <Dialog open={open} onOpenChange={handleCancel}>
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
                    总分 {student.totalPoints} · 可用 {student.availablePoints}
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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            取消
          </Button>
          <Button
            variant={isDeduct ? "destructive" : "default"}
            onClick={handleConfirm}
            disabled={selectedIds.length === 0}
          >
            确定
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
