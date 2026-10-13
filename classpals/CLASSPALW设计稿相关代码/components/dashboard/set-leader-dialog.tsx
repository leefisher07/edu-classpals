"use client"

import { useState, useEffect } from "react"
import { Crown, Search } from "lucide-react"
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
import { ScrollArea } from "@/components/ui/scroll-area"
import { type Student } from "@/lib/mock-data"

interface SetLeaderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  groupName: string
  students: Student[]
  currentLeaderIds: string[]
  onConfirm: (leaderIds: string[]) => void
}

export function SetLeaderDialog({
  open,
  onOpenChange,
  groupName,
  students,
  currentLeaderIds,
  onConfirm,
}: SetLeaderDialogProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>(currentLeaderIds)
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    setSelectedIds(currentLeaderIds)
  }, [currentLeaderIds])

  const filteredStudents = students.filter(s =>
    s.name.includes(searchQuery) || s.studentNo?.includes(searchQuery)
  )

  const handleToggle = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  const handleConfirm = () => {
    onConfirm(selectedIds)
    onOpenChange(false)
  }

  const handleCancelLeaders = () => {
    onConfirm([])
    setSelectedIds([])
    onOpenChange(false)
  }

  const handleCancel = () => {
    setSelectedIds(currentLeaderIds)
    setSearchQuery("")
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleCancel}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>设立组长（{groupName}）</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
            提示：可选择多个组长
          </p>

          {/* Student List */}
          <ScrollArea className="h-64 border rounded-lg">
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
                  {currentLeaderIds.includes(student.id) && (
                    <Crown className="w-4 h-4 text-amber-500" />
                  )}
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
          </ScrollArea>

          <p className="text-sm text-muted-foreground">
            已选 {selectedIds.length} 人为组长
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            取消
          </Button>
          <Button
            variant="destructive"
            onClick={handleCancelLeaders}
            disabled={selectedIds.length === 0}
          >
            取消组长
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
