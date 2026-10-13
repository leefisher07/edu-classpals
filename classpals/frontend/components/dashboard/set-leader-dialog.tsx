"use client"

import { useState, useEffect } from "react"
import { Crown } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
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
  const [selectedId, setSelectedId] = useState<string>(currentLeaderIds[0] || "")

  useEffect(() => {
    setSelectedId(currentLeaderIds[0] || "")
  }, [currentLeaderIds, open])

  const handleConfirm = () => {
    onConfirm(selectedId ? [selectedId] : [])
    onOpenChange(false)
  }

  const handleCancel = () => {
    setSelectedId(currentLeaderIds[0] || "")
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
            提示：选择一名组长
          </p>

          {/* Student List */}
          <ScrollArea className="h-64 border rounded-lg">
            <RadioGroup value={selectedId} onValueChange={setSelectedId}>
              {students.length > 0 ? (
                students.map((student) => (
                  <label
                    key={student.id}
                    className="flex items-center gap-3 p-3 hover:bg-muted cursor-pointer border-b last:border-b-0"
                  >
                    <RadioGroupItem value={student.id} />
                    {currentLeaderIds.includes(student.id) && (
                      <Crown className="w-4 h-4 text-amber-500" />
                    )}
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
            </RadioGroup>
          </ScrollArea>

          <p className="text-sm text-muted-foreground">
            {selectedId ? `已选: ${students.find(s => s.id === selectedId)?.name}` : "未选择组长"}
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            取消
          </Button>
          <Button
            onClick={handleConfirm}
            className="bg-red-500 hover:bg-red-600 text-white"
          >
            确定
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
