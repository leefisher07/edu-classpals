"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Plus, Zap, LayoutGrid, Crown, Trophy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { groupsApi } from "@/lib/api/groups"
import { studentsApi, pointsApi } from "@/lib/api/students"
import { rulesApi } from "@/lib/api/rules"
import { shopApi } from "@/lib/api/shop"
import { dashboardApi } from "@/lib/api/dashboard"
import { toast } from "sonner"
import type { Student, Group } from "@/lib/mock-data"
import { getAvatarColor } from "@/lib/mock-data"
import { StudentCard } from "@/components/dashboard/student-card"
import { GroupSection } from "@/components/dashboard/group-section"
import { CreateGroupDialog } from "@/components/dashboard/create-group-dialog"
import { QuickAssignDialog } from "@/components/dashboard/quick-assign-dialog"
import { RankingSidebar } from "@/components/dashboard/ranking-sidebar"
import { StudentPointsDialog } from "@/components/dashboard/student-points-dialog"
import { StudentHistoryDialog } from "@/components/dashboard/student-history-dialog"
import { StudentShopDialog } from "@/components/dashboard/student-shop-dialog"
import { useActiveClass } from "@/lib/hooks/use-active-class"

interface ExtendedGroup extends Group {
  leaderIds?: string[]
  count?: number
}

export default function GroupsPage() {
  const queryClient = useQueryClient()
  const { activeClassId, isLoading: classLoading } = useActiveClass()

  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [quickAssignOpen, setQuickAssignOpen] = useState(false)

  // Student dialog states
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [pointsDialogOpen, setPointsDialogOpen] = useState(false)
  const [pointsDialogMode, setPointsDialogMode] = useState<'add' | 'deduct'>('add')
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false)
  const [shopDialogOpen, setShopDialogOpen] = useState(false)

  const { data: studentsData } = useQuery({
    queryKey: ["students", activeClassId],
    queryFn: () => studentsApi.list(activeClassId!),
    enabled: !!activeClassId,
  })

  const { data: groupsData } = useQuery({
    queryKey: ["groups", activeClassId],
    queryFn: () => groupsApi.list(activeClassId!),
    enabled: !!activeClassId,
  })

  const { data: rulesData } = useQuery({
    queryKey: ["rules", activeClassId],
    queryFn: () => rulesApi.list(activeClassId!),
    enabled: !!activeClassId,
  })

  const { data: shopItemsData } = useQuery({
    queryKey: ["shop-items", activeClassId],
    queryFn: () => shopApi.listItems(activeClassId!),
    enabled: !!activeClassId,
  })

  const { data: groupRankingData } = useQuery({
    queryKey: ["group-ranking", activeClassId, "total"],
    queryFn: () => dashboardApi.groupRanking(activeClassId!, { period: "total" }),
    enabled: !!activeClassId,
  })

  const students: Student[] = (Array.isArray(studentsData)
    ? studentsData
    : Array.isArray((studentsData as any)?.students)
      ? (studentsData as any).students
      : Array.isArray((studentsData as any)?.data)
        ? (studentsData as any).data
        : Array.isArray((studentsData as any)?.data?.students)
          ? (studentsData as any).data.students
          : []).map((s: any, index: number) => ({
    ...s,
    avatarColor: s.avatarColor || getAvatarColor(index),
  }))

  const groups: ExtendedGroup[] = (Array.isArray(groupsData)
    ? groupsData
    : Array.isArray((groupsData as any)?.groups)
      ? (groupsData as any).groups
      : Array.isArray((groupsData as any)?.data)
        ? (groupsData as any).data
        : Array.isArray((groupsData as any)?.data?.groups)
          ? (groupsData as any).data.groups
          : []).map((g: any) => ({
    ...g,
    leaderIds: g.leaderIds || (g.leaderId ? [g.leaderId] : []),
    members: g.members || [],
  }))

  const rules = Array.isArray(rulesData)
    ? rulesData
    : Array.isArray((rulesData as any)?.data)
      ? (rulesData as any).data
      : (rulesData as any)?.data?.rules || []

  const shopItems = Array.isArray(shopItemsData)
    ? shopItemsData
    : Array.isArray((shopItemsData as any)?.data)
      ? (shopItemsData as any).data
      : (shopItemsData as any)?.data?.items || []

  const rankedGroups = Array.isArray(groupRankingData)
    ? groupRankingData
    : Array.isArray((groupRankingData as any)?.data)
      ? (groupRankingData as any).data
      : []

  // Get ungrouped students
  const ungroupedStudents = students.filter(s => !s.groupId)

  // Calculate ungrouped stats
  const ungroupedStats = {
    count: ungroupedStudents.length,
    totalPoints: ungroupedStudents.reduce((sum, s) => sum + s.totalPoints, 0),
    availablePoints: ungroupedStudents.reduce((sum, s) => sum + s.availablePoints, 0),
  }

  const createGroupMutation = useMutation({
    mutationFn: (name: string) => groupsApi.create(activeClassId!, { name }),
    onSuccess: () => {
      toast.success('小组创建成功')
      queryClient.invalidateQueries({ queryKey: ["groups"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard-overview"] })
      setCreateDialogOpen(false)
    },
    onError: (error: any) => {
      toast.error(error?.message || '创建小组失败')
    },
  })

  const handleCreateGroup = (name: string) => {
    createGroupMutation.mutate(name)
  }

  const handleQuickAssign = async (assignments: { studentId: string; groupId: string }[]) => {
    try {
      // Batch assign students to groups
      for (const assignment of assignments) {
        await groupsApi.addMembers(assignment.groupId, { studentIds: [assignment.studentId] })
      }
      queryClient.invalidateQueries({ queryKey: ["groups"] })
      queryClient.invalidateQueries({ queryKey: ["students"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard-overview"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard-ranking"] })
      toast.success(`成功分配 ${assignments.length} 名学生`)
      setQuickAssignOpen(false)
    } catch (error) {
      console.error("Quick assign error:", error)
      toast.error("批量分配失败")
    }
  }

  // Get students for each group
  const getGroupStudents = (groupId: string) =>
    students.filter(s => s.groupId === groupId)

  // Calculate group stats
  const getGroupStats = (groupId: string) => {
    const groupStudents = getGroupStudents(groupId)
    return {
      count: groupStudents.length,
      totalPoints: groupStudents.reduce((sum, s) => sum + s.totalPoints, 0),
      availablePoints: groupStudents.reduce((sum, s) => sum + s.availablePoints, 0),
    }
  }

  if (!activeClassId) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-muted-foreground mb-2">还没有激活的班级</p>
          <p className="text-sm text-muted-foreground">请前往班级管理创建并激活一个班级</p>
        </div>
      </div>
    )
  }

  if (classLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-muted-foreground">加载中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-4rem)] overflow-auto bg-muted/20">
      <div className="mx-auto w-full max-w-[1800px] px-4 py-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-6 overflow-hidden rounded-3xl border bg-card shadow-sm">
          <div className="flex flex-col gap-5 p-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <LayoutGrid className="h-7 w-7" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">小组管理</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  共 {groups.length} 个小组 · {students.length} 名学生 · {ungroupedStudents.length} 名未分组
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                className="h-11 gap-2 rounded-xl border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground"
                onClick={() => setQuickAssignOpen(true)}
              >
                <Zap className="w-4 h-4" />
                快速分配 ({ungroupedStudents.length})
              </Button>
              <Button
                size="lg"
                className="h-11 gap-2 rounded-xl shadow-sm"
                onClick={() => setCreateDialogOpen(true)}
              >
                <Plus className="w-5 h-5" />
                创建小组
              </Button>
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <main className="min-w-0">
            {/* Ungrouped Section */}
            <div className="mb-8 overflow-hidden rounded-3xl border bg-card shadow-sm">
              <div className="border-b bg-muted/30 p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <LayoutGrid className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="text-xl font-semibold text-foreground">未分组</h2>
                        <span className="rounded-full bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
                          {ungroupedStats.count} 人
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                        <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">累计积分 {ungroupedStats.totalPoints}</span>
                        <span className="rounded-full bg-purple-50 px-3 py-1 text-purple-700">可兑换积分 {ungroupedStats.availablePoints}</span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-amber-700">
                          <Crown className="w-3 h-3" />
                          未设组长
                        </span>
                      </div>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    className="h-10 rounded-xl"
                    onClick={() => setQuickAssignOpen(true)}
                  >
                    <Zap className="mr-2 h-4 w-4" />
                    快速分配
                  </Button>
                </div>
              </div>
              <div className="p-5">
                {ungroupedStudents.length > 0 ? (
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                    {ungroupedStudents.map((student) => (
                      <StudentCard
                        key={student.id}
                        student={student}
                        onAddPoint={(s) => { setSelectedStudent(s); setPointsDialogMode('add'); setPointsDialogOpen(true); }}
                        onDeductPoint={(s) => { setSelectedStudent(s); setPointsDialogMode('deduct'); setPointsDialogOpen(true); }}
                        onViewHistory={(s) => { setSelectedStudent(s); setHistoryDialogOpen(true); }}
                        onOpenShop={(s) => { setSelectedStudent(s); setShopDialogOpen(true); }}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed bg-muted/20 py-10 text-center text-muted-foreground">
                    暂无未分组学生
                  </div>
                )}
              </div>
            </div>

            {/* Group Sections */}
            {groups.map((group) => {
              const groupStudents = getGroupStudents(group.id)
              const stats = getGroupStats(group.id)
              const leaders = groupStudents.filter(s => group.leaderIds?.includes(s.id))

            return (
              <GroupSection
                key={group.id}
                group={{ ...group, ...stats }}
                students={groupStudents}
                leader={leaders[0]}
                allStudents={students}
                allGroups={groups}
                onDelete={async () => {
                  try {
                    await groupsApi.delete(group.id)
                    queryClient.invalidateQueries({ queryKey: ["groups"] })
                    queryClient.invalidateQueries({ queryKey: ["students"] })
                    queryClient.invalidateQueries({ queryKey: ["group-ranking"] })
                    queryClient.invalidateQueries({ queryKey: ["dashboard-ranking"] })
                  } catch (error) {
                    console.error("Failed to delete group:", error)
                  }
                }}
                onEdit={async (name) => {
                  try {
                    await groupsApi.update(group.id, { name })
                    queryClient.invalidateQueries({ queryKey: ["groups"] })
                    queryClient.invalidateQueries({ queryKey: ["group-ranking"] })
                  } catch (error) {
                    console.error("Failed to edit group:", error)
                  }
                }}
                onSetLeader={async (leaderIds) => {
                  try {
                    // Backend only supports single leader, send the first one
                    const leaderId = leaderIds.length > 0 ? leaderIds[0] : null
                    await groupsApi.update(group.id, { leaderId })
                    queryClient.invalidateQueries({ queryKey: ["groups"] })
                    queryClient.invalidateQueries({ queryKey: ["group-ranking"] })
                    toast.success('组长设置成功')
                  } catch (error: any) {
                    console.error("Failed to set leader:", error)
                    toast.error(error?.message || '设置组长失败')
                  }
                }}
                onAddMembers={async (studentIds) => {
                  try {
                    await groupsApi.addMembers(group.id, { studentIds })
                    queryClient.invalidateQueries({ queryKey: ["groups"] })
                    queryClient.invalidateQueries({ queryKey: ["students"] })
                    queryClient.invalidateQueries({ queryKey: ["group-ranking"] })
                    queryClient.invalidateQueries({ queryKey: ["dashboard-ranking"] })
                    toast.success(`成功添加 ${studentIds.length} 名成员`)
                  } catch (error: any) {
                    console.error("Failed to add members:", error)
                    toast.error(error?.message || '添加成员失败')
                  }
                }}
                onAddNewStudent={async (student) => {
                  const response = await studentsApi.create(activeClassId!, {
                    names: [student.name],
                    gender: student.gender.toUpperCase(),
                    studentNumber: student.studentNo,
                    groupId: group.id,
                  })
                  queryClient.invalidateQueries({ queryKey: ["groups"] })
                  queryClient.invalidateQueries({ queryKey: ["students"] })
                  queryClient.invalidateQueries({ queryKey: ["group-ranking"] })
                  queryClient.invalidateQueries({ queryKey: ["dashboard-ranking"] })
                  toast.success(`成功创建学生 ${student.name}`)
                  return response
                }}
                onRemoveMembers={async (studentIds) => {
                  try {
                    await groupsApi.removeMembers(group.id, { studentIds })
                    queryClient.invalidateQueries({ queryKey: ["groups"] })
                    queryClient.invalidateQueries({ queryKey: ["students"] })
                    queryClient.invalidateQueries({ queryKey: ["group-ranking"] })
                    queryClient.invalidateQueries({ queryKey: ["dashboard-ranking"] })
                    toast.success(`成功删除 ${studentIds.length} 名成员`)
                  } catch (error: any) {
                    console.error("Failed to remove members:", error)
                    toast.error(error?.message || '删除成员失败')
                  }
                }}
                onUpdatePoints={async (studentId, points, mode) => {
                  await pointsApi.add(studentId, {
                    type: mode === "add" ? "ADD" : "DEDUCT",
                    value: points,
                    reason: mode === "add" ? "小组批量加分" : "小组批量减分",
                  })
                  queryClient.invalidateQueries({ queryKey: ["students"] })
                  queryClient.invalidateQueries({ queryKey: ["group-ranking"] })
                  queryClient.invalidateQueries({ queryKey: ["dashboard-ranking"] })
                }}
                onBatchAssign={handleQuickAssign}
                onStudentAddPoint={(s) => { setSelectedStudent(s); setPointsDialogMode('add'); setPointsDialogOpen(true); }}
                onStudentDeductPoint={(s) => { setSelectedStudent(s); setPointsDialogMode('deduct'); setPointsDialogOpen(true); }}
                onStudentViewHistory={(s) => { setSelectedStudent(s); setHistoryDialogOpen(true); }}
                onStudentOpenShop={(s) => { setSelectedStudent(s); setShopDialogOpen(true); }}
              />
            )
          })}

          {groups.length === 0 && (
            <div className="rounded-3xl border border-dashed bg-card px-6 py-14 text-center text-muted-foreground shadow-sm">
              <p className="mb-4 text-base">还没有创建小组</p>
              <Button className="rounded-xl" onClick={() => setCreateDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                创建第一个小组
              </Button>
            </div>
          )}
          </main>

          <aside className="hidden xl:block">
            <div className="sticky top-0 space-y-6">
              <div className="overflow-hidden rounded-3xl border bg-card shadow-sm">
                <div className="border-b bg-muted/30 px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <Trophy className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="font-semibold text-foreground">快捷概览</h2>
                      <p className="text-sm text-muted-foreground">查看当前班级的小组积分排行</p>
                    </div>
                  </div>
                </div>
                <div className="p-2">
                  <RankingSidebar
                    students={students}
                    groups={groups}
                    rankedGroups={rankedGroups}
                    rules={rules}
                    shopItems={shopItems}
                    className="w-full border-0 shadow-none"
                  />
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* Dialogs */}
      <CreateGroupDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onConfirm={handleCreateGroup}
        isPending={createGroupMutation.isPending}
      />

      <QuickAssignDialog
        open={quickAssignOpen}
        onOpenChange={setQuickAssignOpen}
        ungroupedStudents={ungroupedStudents}
        groups={groups}
        onConfirm={handleQuickAssign}
      />

      {/* Student Dialogs */}
      {selectedStudent && (
        <>
          <StudentPointsDialog
            open={pointsDialogOpen}
            onOpenChange={setPointsDialogOpen}
            student={selectedStudent}
            mode={pointsDialogMode}
            rules={rules}
            classId={activeClassId!}
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ["students"] })
              queryClient.invalidateQueries({ queryKey: ["groups"] })
              queryClient.invalidateQueries({ queryKey: ["group-ranking"] })
              queryClient.invalidateQueries({ queryKey: ["dashboard-ranking"] })
            }}
          />

          <StudentHistoryDialog
            open={historyDialogOpen}
            onOpenChange={setHistoryDialogOpen}
            student={selectedStudent}
          />

          <StudentShopDialog
            open={shopDialogOpen}
            onOpenChange={setShopDialogOpen}
            student={selectedStudent}
            classId={activeClassId!}
          />
        </>
      )}
    </div>
  )
}
