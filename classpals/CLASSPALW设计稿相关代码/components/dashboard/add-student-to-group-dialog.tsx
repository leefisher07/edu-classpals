"use client"

import { useState } from "react"
import { UserPlus } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { type Group, type Student } from "@/lib/mock-data"

interface AddStudentToGroupDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  groups: Group[]
  currentGroupId: string
  ungroupedStudents: Student[]
  onAddExisting: (studentIds: string[]) => void
  onAddNew?: (student: { name: string; gender: "male" | "female"; studentNo?: string }) => void
}

export function AddStudentToGroupDialog({
  open,
  onOpenChange,
  groups,
  currentGroupId,
  ungroupedStudents,
  onAddExisting,
  onAddNew,
}: AddStudentToGroupDialogProps) {
  const [names, setNames] = useState("")
  const [gender, setGender] = useState<"male" | "female">("male")
  const [selectedGroupId, setSelectedGroupId] = useState(currentGroupId)
  const [studentNo, setStudentNo] = useState("")

  const handleConfirm = () => {
    // Parse names (支持回车或逗号分隔)
    const nameList = names
      .split(/[,，\n]/)
      .map(n => n.trim())
      .filter(n => n.length > 0)

    if (nameList.length === 0) return

    // Check if any names match existing ungrouped students
    const existingIds: string[] = []
    const newNames: string[] = []

    nameList.forEach(name => {
      const existing = ungroupedStudents.find(s => s.name === name)
      if (existing) {
        existingIds.push(existing.id)
      } else {
        newNames.push(name)
      }
    })

    // Add existing students to group
    if (existingIds.length > 0) {
      onAddExisting(existingIds)
    }

    // Create new students
    if (newNames.length > 0 && onAddNew) {
      newNames.forEach(name => {
        onAddNew({ name, gender, studentNo: studentNo || undefined })
      })
    }

    // Reset and close
    setNames("")
    setGender("male")
    setStudentNo("")
    onOpenChange(false)
  }

  const handleCancel = () => {
    setNames("")
    setGender("male")
    setStudentNo("")
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleCancel}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            添加学生
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Names Input */}
          <div className="space-y-2">
            <Label>学生姓名 (支持批量)</Label>
            <Textarea
              placeholder="输入学生姓名，多个姓名请用回车或逗号分隔"
              value={names}
              onChange={(e) => setNames(e.target.value)}
              className="min-h-[100px] resize-none"
            />
          </div>

          {/* Gender Selection */}
          <div className="space-y-2">
            <div className="flex items-center gap-8">
              <Label>性别</Label>
              <Label className="text-muted-foreground">分组（可选）</Label>
            </div>
            <div className="flex items-center gap-4">
              <RadioGroup
                value={gender}
                onValueChange={(v) => setGender(v as "male" | "female")}
                className="flex items-center gap-4"
              >
                <label className="flex items-center gap-2 cursor-pointer">
                  <RadioGroupItem value="male" />
                  <span className={gender === "male" ? "text-blue-600 font-medium" : ""}>
                    男生
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <RadioGroupItem value="female" />
                  <span className={gender === "female" ? "text-pink-600 font-medium" : ""}>
                    女生
                  </span>
                </label>
              </RadioGroup>

              <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="选择分组" />
                </SelectTrigger>
                <SelectContent>
                  {groups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Student Number */}
          <div className="space-y-2">
            <Label>学号（可选）</Label>
            <Input
              placeholder="输入学号"
              value={studentNo}
              onChange={(e) => setStudentNo(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            className="w-full bg-gradient-to-r from-[#a855f7] to-[#ec4899] hover:opacity-90"
            onClick={handleConfirm}
            disabled={!names.trim()}
          >
            确认添加
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
