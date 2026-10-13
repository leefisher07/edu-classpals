"use client"

import { useState } from "react"
import { UserPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

interface AddStudentDialogProps {
  groups?: { id: string; name: string }[]
  onAdd?: (data: {
    names: string[]
    gender: "male" | "female"
    groupId?: string
    studentNo?: string
  }) => void
  trigger?: React.ReactNode
}

export function AddStudentDialog({ groups = [], onAdd, trigger }: AddStudentDialogProps) {
  const [open, setOpen] = useState(false)
  const [names, setNames] = useState("")
  const [gender, setGender] = useState<"male" | "female">("male")
  const [groupId, setGroupId] = useState<string>("")
  const [studentNo, setStudentNo] = useState("")

  const handleSubmit = () => {
    const nameList = names
      .split(/[,，\n]/)
      .map((n) => n.trim())
      .filter((n) => n.length > 0)

    if (nameList.length === 0) return

    onAdd?.({
      names: nameList,
      gender,
      groupId: groupId || undefined,
      studentNo: studentNo || undefined,
    })

    // Reset form
    setNames("")
    setGender("male")
    setGroupId("")
    setStudentNo("")
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="gap-2">
            <UserPlus className="w-4 h-4" />
            添加学生
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" />
            添加学生
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* 学生姓名 */}
          <div className="space-y-2">
            <Label>学生姓名 (支持批量)</Label>
            <Textarea
              placeholder="输入学生姓名，多个姓名请用回车或逗号分隔"
              value={names}
              onChange={(e) => setNames(e.target.value)}
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              提示：可一次添加多个学生，用回车或逗号分隔
            </p>
          </div>

          {/* 性别和分组 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>性别</Label>
              <ToggleGroup
                type="single"
                value={gender}
                onValueChange={(value) => value && setGender(value as "male" | "female")}
                className="justify-start"
              >
                <ToggleGroupItem
                  value="male"
                  className="flex-1 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                >
                  男生
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="female"
                  className="flex-1 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                >
                  女生
                </ToggleGroupItem>
              </ToggleGroup>
            </div>

            <div className="space-y-2">
              <Label>分组 (可选)</Label>
              <Select value={groupId} onValueChange={setGroupId}>
                <SelectTrigger>
                  <SelectValue placeholder="未分组" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">未分组</SelectItem>
                  {groups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 学号 */}
          <div className="space-y-2">
            <Label>学号 (可选)</Label>
            <Input
              placeholder="输入学号"
              value={studentNo}
              onChange={(e) => setStudentNo(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              批量添加时，学号将自动递增
            </p>
          </div>
        </div>

        <Button onClick={handleSubmit} className="w-full">
          确认添加
        </Button>
      </DialogContent>
    </Dialog>
  )
}
