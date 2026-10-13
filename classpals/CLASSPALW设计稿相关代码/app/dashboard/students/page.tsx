"use client"

import { useState, useMemo } from "react"
import { Search, ChevronDown, Plus, Minus, ArrowUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu"
import { StudentCard } from "@/components/dashboard/student-card"
import { RankingSidebar } from "@/components/dashboard/ranking-sidebar"
import { AddStudentDialog } from "@/components/dashboard/add-student-dialog"
import { BatchPointsDialog } from "@/components/dashboard/batch-points-dialog"
import { StudentPointsDialog } from "@/components/dashboard/student-points-dialog"
import { StudentHistoryDialog } from "@/components/dashboard/student-history-dialog"
import { StudentShopDialog } from "@/components/dashboard/student-shop-dialog"
import { DeleteStudentDialog } from "@/components/dashboard/delete-student-dialog"
import {
  mockStudents,
  mockGroups,
  mockAddRules,
  mockDeductRules,
  type Student,
} from "@/lib/mock-data"

type SortOption = "totalPoints" | "availablePoints" | "studentNo" | "name"

export default function StudentsPage() {
  const [students, setStudents] = useState(mockStudents)
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState<SortOption>("totalPoints")
  const [sortDesc, setSortDesc] = useState(true)
  const [batchDialogOpen, setBatchDialogOpen] = useState(false)
  const [batchDialogType, setBatchDialogType] = useState<"add" | "deduct">("add")

  // 单个学生操作相关状态
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [pointsDialogOpen, setPointsDialogOpen] = useState(false)
  const [pointsDialogMode, setPointsDialogMode] = useState<"add" | "deduct">("add")
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false)
  const [shopDialogOpen, setShopDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  const sortOptions: { value: SortOption; label: string }[] = [
    { value: "totalPoints", label: "按总分" },
    { value: "availablePoints", label: "按可用" },
    { value: "studentNo", label: "按学号" },
    { value: "name", label: "按姓名" },
  ]

  const filteredAndSortedStudents = useMemo(() => {
    let result = [...students]

    // 搜索过滤
    if (searchQuery) {
      result = result.filter(
        (s) =>
          s.name.includes(searchQuery) ||
          s.studentNo?.includes(searchQuery)
      )
    }

    // 排序
    result.sort((a, b) => {
      let comparison = 0
      switch (sortBy) {
        case "totalPoints":
          comparison = a.totalPoints - b.totalPoints
          break
        case "availablePoints":
          comparison = a.availablePoints - b.availablePoints
          break
        case "studentNo":
          comparison = (a.studentNo || "").localeCompare(b.studentNo || "")
          break
        case "name":
          comparison = a.name.localeCompare(b.name)
          break
      }
      return sortDesc ? -comparison : comparison
    })

    return result
  }, [students, searchQuery, sortBy, sortDesc])

  const handleAddStudent = (data: {
    names: string[]
    gender: "male" | "female"
    groupId?: string
    studentNo?: string
  }) => {
    console.log("[v0] Adding students:", data)
    // TODO: 实际添加学生逻辑
  }

  const handleBatchPoints = (data: {
    studentIds: string[]
    value: number
    reason?: string
    ruleId?: string
  }) => {
    console.log("[v0] Batch points:", batchDialogType, data)
    setStudents((prev) =>
      prev.map((s) => {
        if (data.studentIds.includes(s.id)) {
          const delta = batchDialogType === "add" ? data.value : -data.value
          return {
            ...s,
            totalPoints: Math.max(0, s.totalPoints + delta),
            availablePoints: Math.max(0, s.availablePoints + delta),
          }
        }
        return s
      })
    )
  }

  // 打开加分对话框
  const handleAddPoint = (student: Student) => {
    setSelectedStudent(student)
    setPointsDialogMode("add")
    setPointsDialogOpen(true)
  }

  // 打开扣分对话框
  const handleDeductPoint = (student: Student) => {
    setSelectedStudent(student)
    setPointsDialogMode("deduct")
    setPointsDialogOpen(true)
  }

  // 确认加减分
  const handlePointsConfirm = (points: number, reason: string) => {
    if (!selectedStudent) return
    console.log("[v0] Points change:", selectedStudent.name, points, reason)
    setStudents((prev) =>
      prev.map((s) =>
        s.id === selectedStudent.id
          ? {
              ...s,
              totalPoints: Math.max(0, s.totalPoints + points),
              availablePoints: Math.max(0, s.availablePoints + points),
            }
          : s
      )
    )
  }

  // 快速加分
  const handleQuickAddPoint = (student: Student) => {
    console.log("[v0] Quick add point:", student.name)
    setStudents((prev) =>
      prev.map((s) =>
        s.id === student.id
          ? { ...s, totalPoints: s.totalPoints + 1, availablePoints: s.availablePoints + 1 }
          : s
      )
    )
  }

  // 查看积分明细
  const handleViewHistory = (student: Student) => {
    setSelectedStudent(student)
    setHistoryDialogOpen(true)
  }

  // 打开个人商店
  const handleOpenShop = (student: Student) => {
    setSelectedStudent(student)
    setShopDialogOpen(true)
  }

  // 删除学生
  const handleDeleteStudent = (student: Student) => {
    setSelectedStudent(student)
    setDeleteDialogOpen(true)
  }

  const handleConfirmDelete = () => {
    if (!selectedStudent) return
    console.log("[v0] Delete student:", selectedStudent.name)
    setStudents((prev) => prev.filter((s) => s.id !== selectedStudent.id))
  }

  const openBatchDialog = (type: "add" | "deduct") => {
    setBatchDialogType(type)
    setBatchDialogOpen(true)
  }

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* 主内容区 */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* 搜索和操作栏 */}
        <div className="p-4 lg:p-6 border-b bg-card space-y-4">
          {/* 搜索框 */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="搜索学生姓名/学号..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* 操作按钮 */}
          <div className="flex flex-wrap items-center gap-3">
            <AddStudentDialog
              groups={mockGroups}
              onAdd={handleAddStudent}
            />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <ArrowUpDown className="w-4 h-4" />
                  批量加减分
                  <ChevronDown className="w-4 h-4 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => openBatchDialog("add")}>
                  <Plus className="w-4 h-4 mr-2 text-green-600" />
                  批量加分
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => openBatchDialog("deduct")}>
                  <Minus className="w-4 h-4 mr-2 text-red-500" />
                  批量减分
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <ArrowUpDown className="w-4 h-4" />
                  排序: {sortOptions.find((o) => o.value === sortBy)?.label}
                  <ChevronDown className="w-4 h-4 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {sortOptions.map((option) => (
                  <DropdownMenuCheckboxItem
                    key={option.value}
                    checked={sortBy === option.value}
                    onCheckedChange={() => setSortBy(option.value)}
                  >
                    {option.label}
                  </DropdownMenuCheckboxItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem
                  checked={sortDesc}
                  onCheckedChange={setSortDesc}
                >
                  降序排列
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <span className="text-sm text-muted-foreground ml-auto">
              共 {filteredAndSortedStudents.length} 名学生
            </span>
          </div>
        </div>

        {/* 学生卡片网格 */}
        <div className="flex-1 overflow-auto p-4 lg:p-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {filteredAndSortedStudents.map((student) => (
              <StudentCard
                key={student.id}
                student={student}
                onAddPoint={handleAddPoint}
                onDeductPoint={handleDeductPoint}
                onViewHistory={handleViewHistory}
                onOpenShop={handleOpenShop}
                onQuickAddPoint={handleQuickAddPoint}
                onDelete={handleDeleteStudent}
                showDelete
              />
            ))}
          </div>
        </div>
      </div>

      {/* 右侧边栏 */}
      <RankingSidebar
        students={students}
        groups={mockGroups}
        className="hidden lg:flex flex-col"
      />

      {/* 批量加减分弹窗 */}
      <BatchPointsDialog
        open={batchDialogOpen}
        onOpenChange={setBatchDialogOpen}
        type={batchDialogType}
        students={students}
        rules={batchDialogType === "add" ? mockAddRules : mockDeductRules}
        onConfirm={handleBatchPoints}
      />

      {/* 单个学生加减分对话框 */}
      <StudentPointsDialog
        open={pointsDialogOpen}
        onOpenChange={setPointsDialogOpen}
        student={selectedStudent}
        mode={pointsDialogMode}
        onConfirm={handlePointsConfirm}
      />

      {/* 积分明细对话框 */}
      <StudentHistoryDialog
        open={historyDialogOpen}
        onOpenChange={setHistoryDialogOpen}
        student={selectedStudent}
        onRevoke={(recordId) => console.log("[v0] Revoke record:", recordId)}
      />

      {/* 个人商店对话框 */}
      <StudentShopDialog
        open={shopDialogOpen}
        onOpenChange={setShopDialogOpen}
        student={selectedStudent}
        onExchange={(productId) => console.log("[v0] Exchange product:", productId)}
      />

      {/* 删除学生对话框 */}
      <DeleteStudentDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        student={selectedStudent}
        onConfirm={handleConfirmDelete}
      />
    </div>
  )
}
