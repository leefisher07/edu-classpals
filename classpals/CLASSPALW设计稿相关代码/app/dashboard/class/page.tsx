"use client"

import { useState } from "react"
import { Plus, Pencil, Trash2, Users, GraduationCap, MoreHorizontal, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

interface ClassInfo {
  id: string
  name: string
  teacher: string
  studentCount: number
  totalPoints: number
  createdAt: string
  isActive: boolean
}

const mockClasses: ClassInfo[] = [
  { id: "1", name: "初三四班", teacher: "王老师", studentCount: 42, totalPoints: 1580, createdAt: "2026-03-01", isActive: true },
  { id: "2", name: "初三五班", teacher: "王老师", studentCount: 38, totalPoints: 1420, createdAt: "2026-03-01", isActive: false },
]

export default function ClassManagementPage() {
  const [classes, setClasses] = useState<ClassInfo[]>(mockClasses)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingClass, setEditingClass] = useState<ClassInfo | null>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [classToDelete, setClassToDelete] = useState<ClassInfo | null>(null)

  const [formData, setFormData] = useState({
    name: "",
    teacher: "",
  })

  const handleOpenDialog = (classInfo?: ClassInfo) => {
    if (classInfo) {
      setEditingClass(classInfo)
      setFormData({
        name: classInfo.name,
        teacher: classInfo.teacher,
      })
    } else {
      setEditingClass(null)
      setFormData({
        name: "",
        teacher: "",
      })
    }
    setIsDialogOpen(true)
  }

  const handleSaveClass = () => {
    if (!formData.name.trim() || !formData.teacher.trim()) return

    if (editingClass) {
      setClasses(classes.map(c => 
        c.id === editingClass.id
          ? { ...c, name: formData.name, teacher: formData.teacher }
          : c
      ))
    } else {
      const newClass: ClassInfo = {
        id: Date.now().toString(),
        name: formData.name,
        teacher: formData.teacher,
        studentCount: 0,
        totalPoints: 0,
        createdAt: new Date().toISOString().split("T")[0],
        isActive: false,
      }
      setClasses([...classes, newClass])
    }
    setIsDialogOpen(false)
  }

  const handleSetActive = (classId: string) => {
    setClasses(classes.map(c => ({
      ...c,
      isActive: c.id === classId,
    })))
  }

  const handleDeleteClass = () => {
    if (classToDelete) {
      setClasses(classes.filter(c => c.id !== classToDelete.id))
      setDeleteConfirmOpen(false)
      setClassToDelete(null)
    }
  }

  const activeClass = classes.find(c => c.isActive)

  return (
    <div className="flex-1 p-6 overflow-auto">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">班级管理</h1>
            <p className="text-muted-foreground mt-1">管理您的班级信息</p>
          </div>
          <Button onClick={() => handleOpenDialog()} className="gap-2">
            <Plus className="w-4 h-4" />
            创建班级
          </Button>
        </div>

        {/* Active Class Info */}
        {activeClass && (
          <Card className="border-primary/50 bg-primary/5">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-primary" />
                  当前班级
                </CardTitle>
                <Badge className="bg-primary">使用中</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-6">
                <div>
                  <p className="text-2xl font-bold">{activeClass.name}</p>
                  <p className="text-muted-foreground">班主任: {activeClass.teacher}</p>
                </div>
                <div className="flex gap-8 ml-auto">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-primary">{activeClass.studentCount}</p>
                    <p className="text-sm text-muted-foreground">学生数</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-emerald-600">{activeClass.totalPoints}</p>
                    <p className="text-sm text-muted-foreground">总积分</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Class List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">全部班级</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {classes.map((classInfo) => (
                <div
                  key={classInfo.id}
                  className={cn(
                    "flex items-center gap-4 p-4 rounded-lg border transition-colors",
                    classInfo.isActive ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                  )}
                >
                  <div className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center",
                    classInfo.isActive ? "bg-primary text-primary-foreground" : "bg-muted"
                  )}>
                    <GraduationCap className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{classInfo.name}</p>
                      {classInfo.isActive && (
                        <Badge variant="secondary" className="text-xs">当前</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      班主任: {classInfo.teacher} · 创建于 {classInfo.createdAt}
                    </p>
                  </div>
                  <div className="flex items-center gap-6 text-sm">
                    <div className="text-center">
                      <p className="font-semibold">{classInfo.studentCount}</p>
                      <p className="text-muted-foreground">学生</p>
                    </div>
                    <div className="text-center">
                      <p className="font-semibold text-emerald-600">{classInfo.totalPoints}</p>
                      <p className="text-muted-foreground">积分</p>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {!classInfo.isActive && (
                        <DropdownMenuItem onClick={() => handleSetActive(classInfo.id)}>
                          <Settings className="w-4 h-4 mr-2" />
                          切换到此班级
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => handleOpenDialog(classInfo)}>
                        <Pencil className="w-4 h-4 mr-2" />
                        编辑
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => {
                          setClassToDelete(classInfo)
                          setDeleteConfirmOpen(true)
                        }}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        删除
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
              {classes.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <GraduationCap className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>暂无班级</p>
                  <p className="text-sm mt-1">点击上方按钮创建班级</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add/Edit Class Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingClass ? "编辑班级" : "创建班级"}</DialogTitle>
            <DialogDescription>
              {editingClass ? "修改班级的基本信息" : "创建一个新的班级"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>班级名称</Label>
              <Input
                placeholder="例如：初三四班"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>班主任</Label>
              <Input
                placeholder="例如：王老师"
                value={formData.teacher}
                onChange={(e) => setFormData({ ...formData, teacher: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              取消
            </Button>
            <Button 
              onClick={handleSaveClass} 
              disabled={!formData.name.trim() || !formData.teacher.trim()}
            >
              {editingClass ? "保存修改" : "确认创建"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>删除班级确认</DialogTitle>
            <DialogDescription>
              确定要删除班级「{classToDelete?.name}」吗？删除后所有相关数据将被归档。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
              取消
            </Button>
            <Button variant="destructive" onClick={handleDeleteClass}>
              确定删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
