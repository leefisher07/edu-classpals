"use client"

import { useState } from "react"
import { Plus, Zap, LayoutGrid, Crown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { mockStudents, mockGroups, type Student, type Group } from "@/lib/mock-data"
import { StudentCard } from "@/components/dashboard/student-card"
import { GroupSection } from "@/components/dashboard/group-section"
import { CreateGroupDialog } from "@/components/dashboard/create-group-dialog"
import { QuickAssignDialog } from "@/components/dashboard/quick-assign-dialog"
import { RankingSidebar } from "@/components/dashboard/ranking-sidebar"

// Add leaderIds to Group type for multiple leaders support
interface ExtendedGroup extends Group {
  leaderIds?: string[]
}

export default function GroupsPage() {
  const [students, setStudents] = useState<Student[]>(mockStudents)
  const [groups, setGroups] = useState<ExtendedGroup[]>(mockGroups.map(g => ({
    ...g,
    leaderIds: g.leaderId ? [g.leaderId] : []
  })))
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [quickAssignOpen, setQuickAssignOpen] = useState(false)

  // Get ungrouped students
  const ungroupedStudents = students.filter(s => !s.groupId)

  // Calculate ungrouped stats
  const ungroupedStats = {
    count: ungroupedStudents.length,
    totalPoints: ungroupedStudents.reduce((sum, s) => sum + s.totalPoints, 0),
    availablePoints: ungroupedStudents.reduce((sum, s) => sum + s.availablePoints, 0),
  }

  const handleCreateGroup = (name: string) => {
    const newGroup: ExtendedGroup = {
      id: `group-${Date.now()}`,
      name,
      members: [],
      leaderId: null,
      leaderIds: [],
      totalPoints: 0,
      availablePoints: 0,
    }
    setGroups([...groups, newGroup])
  }

  const handleDeleteGroup = (groupId: string) => {
    // Move members back to ungrouped
    setStudents(students.map(s => 
      s.groupId === groupId ? { ...s, groupId: undefined } : s
    ))
    setGroups(groups.filter(g => g.id !== groupId))
  }

  const handleEditGroup = (groupId: string, newName: string) => {
    setGroups(groups.map(g => 
      g.id === groupId ? { ...g, name: newName } : g
    ))
  }

  const handleSetLeaders = (groupId: string, leaderIds: string[]) => {
    setGroups(groups.map(g => 
      g.id === groupId ? { ...g, leaderIds, leaderId: leaderIds[0] || null } : g
    ))
  }

  const handleAddMembers = (groupId: string, studentIds: string[]) => {
    setStudents(students.map(s => 
      studentIds.includes(s.id) ? { ...s, groupId } : s
    ))
  }

  const handleRemoveMembers = (groupId: string, studentIds: string[]) => {
    setStudents(students.map(s => 
      studentIds.includes(s.id) ? { ...s, groupId: undefined } : s
    ))
  }

  const handleQuickAssign = (assignments: { studentId: string; groupId: string }[]) => {
    setStudents(students.map(s => {
      const assignment = assignments.find(a => a.studentId === s.id)
      return assignment ? { ...s, groupId: assignment.groupId } : s
    }))
  }

  const handleAddNewStudent = (groupId: string, student: { name: string; gender: "male" | "female"; studentNo?: string }) => {
    const colors = [
      "bg-blue-100 text-blue-600",
      "bg-green-100 text-green-600",
      "bg-amber-100 text-amber-600",
      "bg-pink-100 text-pink-600",
      "bg-purple-100 text-purple-600",
      "bg-red-100 text-red-600",
    ]
    const newStudent: Student = {
      id: `student-${Date.now()}`,
      name: student.name,
      gender: student.gender,
      studentNo: student.studentNo,
      groupId,
      totalPoints: 0,
      availablePoints: 0,
      avatarColor: colors[Math.floor(Math.random() * colors.length)],
    }
    setStudents([...students, newStudent])
  }

  const handleUpdatePoints = (studentId: string, points: number, mode: "add" | "deduct") => {
    setStudents(students.map(s => {
      if (s.id === studentId) {
        const delta = mode === "add" ? points : -points
        return {
          ...s,
          totalPoints: Math.max(0, s.totalPoints + delta),
          availablePoints: Math.max(0, s.availablePoints + delta),
        }
      }
      return s
    }))
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

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-4 lg:p-6">
          {/* Page Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-foreground">小组管理</h1>
              <span className="text-sm text-muted-foreground">
                共 {groups.length} 个小组
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                className="gap-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                onClick={() => setQuickAssignOpen(true)}
              >
                <Zap className="w-4 h-4" />
                快速分配 ({ungroupedStudents.length})
              </Button>
              <Button className="gap-2" onClick={() => setCreateDialogOpen(true)}>
                <Plus className="w-4 h-4" />
                创建小组
              </Button>
            </div>
          </div>

          {/* Ungrouped Section */}
          <div className="mb-6">
            <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-t-lg border border-b-0">
              <LayoutGrid className="w-5 h-5 text-muted-foreground" />
              <div>
                <h2 className="font-semibold text-foreground">未分组</h2>
                <p className="text-sm text-muted-foreground">
                  共 {ungroupedStats.count} 人 · 总分: {ungroupedStats.totalPoints} · 可用: {ungroupedStats.availablePoints}
                </p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Crown className="w-3 h-3" />
                  未设组长
                </p>
              </div>
            </div>
            <div className="border rounded-b-lg p-4 bg-card">
              {/* Student Grid */}
              {ungroupedStudents.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {ungroupedStudents.map((student) => (
                    <StudentCard
                      key={student.id}
                      student={student}
                      onAddPoint={() => handleUpdatePoints(student.id, 1, "add")}
                      onDeductPoint={() => handleUpdatePoints(student.id, 1, "deduct")}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
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
                onDelete={() => handleDeleteGroup(group.id)}
                onEdit={(name) => handleEditGroup(group.id, name)}
                onSetLeader={(leaderIds) => handleSetLeaders(group.id, leaderIds)}
                onAddMembers={(ids) => handleAddMembers(group.id, ids)}
                onRemoveMembers={(ids) => handleRemoveMembers(group.id, ids)}
                onAddNewStudent={(student) => handleAddNewStudent(group.id, student)}
                onBatchAssign={handleQuickAssign}
                onUpdatePoints={handleUpdatePoints}
              />
            )
          })}

          {groups.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <p className="mb-4">还没有创建小组</p>
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                创建第一个小组
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Right Sidebar */}
      <RankingSidebar students={students} groups={groups} className="hidden lg:flex flex-col" />

      {/* Dialogs */}
      <CreateGroupDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onConfirm={handleCreateGroup}
      />

      <QuickAssignDialog
        open={quickAssignOpen}
        onOpenChange={setQuickAssignOpen}
        ungroupedStudents={ungroupedStudents}
        groups={groups}
        onConfirm={handleQuickAssign}
      />
    </div>
  )
}
