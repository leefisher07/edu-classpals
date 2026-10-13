"use client"

import { useState } from "react"
import { Search, Trash2 } from "lucide-react"
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

interface GroupMembersDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: "add" | "remove"
  groupName: string
  students: Student[]
  onConfirm: (studentIds: string[]) => void
}

export function GroupMembersDialog({
  open,
  onOpenChange,
  mode,
  groupName,
  students,
  onConfirm,
}: GroupMembersDialogProps) {
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

  const handleConfirm = () => {
    onConfirm(selectedIds)
    setSelectedIds([])
    setSearchQuery("")
    onOpenChange(false)
  }

  const handleCancel = () => {
    setSelectedIds([])
    setSearchQuery("")
    onOpenChange(false)
  }

  const isRemoveMode = mode === "remove"
  const title = isRemoveMode ? `删除成员（${groupName}）` : `添加成员到 ${groupName}`

  return (
    <Dialog open={open} onOpenChange={handleCancel}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="flex flex-row items-center justify-between pr-8">
          <DialogTitle className={isRemoveMode ? "text-blue-600" : ""}>
            {title}
          </DialogTitle>
          {isRemoveMode && (
            <Button variant="ghost" size="icon" className="text-muted-foreground h-8 w-8">
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
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
            <Checkbox
              checked={selectedIds.length === filteredStudents.length && filteredStudents.length > 0}
              onCheckedChange={handleSelectAll}
            />
            <span className="text-sm text-muted-foreground whitespace-nowrap">全选</span>
          </div>

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
                  <span className="font-medium">{student.name}</span>
                  <span className="text-sm text-muted-foreground ml-auto">
                    {groupName}
                  </span>
                </label>
              ))
            ) : (
              <div className="p-4 text-center text-muted-foreground">
                {isRemoveMode ? "暂无成员" : "暂无可添加的学生"}
              </div>
            )}
          </ScrollArea>

          <p className="text-sm text-muted-foreground">
            已选 {selectedIds.length} 人
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            取消
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={selectedIds.length === 0}
            className={isRemoveMode ? "bg-red-500 hover:bg-red-600 text-white" : ""}
          >
            {isRemoveMode ? "确定" : "确定"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
