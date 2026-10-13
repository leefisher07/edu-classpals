"use client"

import { useState } from "react"
import { Search, Zap, Users, FileText } from "lucide-react"
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { ScrollArea } from "@/components/ui/scroll-area"
import { type Student, type Group, getSurname } from "@/lib/mock-data"

interface QuickAssignDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  ungroupedStudents: Student[]
  groups: Group[]
  onConfirm: (assignments: { studentId: string; groupId: string }[]) => void
}

export function QuickAssignDialog({
  open,
  onOpenChange,
  ungroupedStudents,
  groups,
  onConfirm,
}: QuickAssignDialogProps) {
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([])
  const [selectedGroupId, setSelectedGroupId] = useState<string>("")
  const [searchQuery, setSearchQuery] = useState("")

  const filteredStudents = ungroupedStudents.filter(s =>
    s.name.includes(searchQuery) || s.studentNo?.includes(searchQuery)
  )

  const handleToggleStudent = (id: string) => {
    setSelectedStudentIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  const handleSelectAll = () => {
    if (selectedStudentIds.length === filteredStudents.length) {
      setSelectedStudentIds([])
    } else {
      setSelectedStudentIds(filteredStudents.map(s => s.id))
    }
  }

  const handleConfirm = () => {
    if (selectedStudentIds.length > 0 && selectedGroupId) {
      const assignments = selectedStudentIds.map(studentId => ({
        studentId,
        groupId: selectedGroupId,
      }))
      onConfirm(assignments)
      setSelectedStudentIds([])
      setSelectedGroupId("")
      setSearchQuery("")
      onOpenChange(false)
    }
  }

  const handleCancel = () => {
    setSelectedStudentIds([])
    setSelectedGroupId("")
    setSearchQuery("")
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleCancel}>
      <DialogContent className="sm:max-w-3xl p-0 overflow-hidden">
        {/* Header with Gradient */}
        <DialogHeader className="bg-gradient-to-r from-[#6366f1] via-[#a855f7] to-[#ec4899] text-white p-6">
          <DialogTitle className="flex items-center gap-2 text-white text-lg">
            <Zap className="w-5 h-5" />
            快速分配
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
          {/* Left: Ungrouped Students */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileText className="w-4 h-4" />
              未分组学生 ({ungroupedStudents.length}人)
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="搜索姓名/学号..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Select All */}
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={selectedStudentIds.length === filteredStudents.length && filteredStudents.length > 0}
                onCheckedChange={handleSelectAll}
              />
              <span className="text-sm">全选</span>
            </label>

            {/* Student List */}
            <ScrollArea className="h-72 border rounded-lg">
              {filteredStudents.length > 0 ? (
                filteredStudents.map((student) => (
                  <label
                    key={student.id}
                    className="flex items-center gap-3 p-3 hover:bg-muted cursor-pointer border-b last:border-b-0"
                  >
                    <Checkbox
                      checked={selectedStudentIds.includes(student.id)}
                      onCheckedChange={() => handleToggleStudent(student.id)}
                    />
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${student.avatarColor}`}
                    >
                      {getSurname(student.name)}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{student.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {student.studentNo || "无学号"}
                      </p>
                    </div>
                  </label>
                ))
              ) : (
                <div className="p-4 text-center text-muted-foreground">
                  暂无未分组学生
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Right: Target Group */}
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              选择目标小组
            </div>

            <ScrollArea className="h-80">
              <RadioGroup
                value={selectedGroupId}
                onValueChange={setSelectedGroupId}
                className="space-y-2"
              >
                {groups.length > 0 ? (
                  groups.map((group) => (
                    <label
                      key={group.id}
                      className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                        selectedGroupId === group.id
                          ? "border-primary bg-primary/5"
                          : "hover:bg-muted"
                      }`}
                    >
                      <RadioGroupItem value={group.id} />
                      <div>
                        <p className="font-medium">{group.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {group.members?.length || 0}人
                        </p>
                      </div>
                    </label>
                  ))
                ) : (
                  <div className="p-4 text-center text-muted-foreground border rounded-lg">
                    暂无小组，请先创建小组
                  </div>
                )}
              </RadioGroup>
            </ScrollArea>
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between p-6 pt-0">
          <p className="text-sm text-muted-foreground">
            已选 {selectedStudentIds.length} 人
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCancel}>
              取消
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={selectedStudentIds.length === 0 || !selectedGroupId}
              className="bg-gradient-to-r from-[#a855f7] to-[#ec4899] hover:opacity-90"
            >
              确认分配 ({selectedStudentIds.length}人)
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
