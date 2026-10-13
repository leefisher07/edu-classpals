"use client"

import { useState } from "react"
import {
  Crown,
  Plus,
  UserPlus,
  UserMinus,
  Pencil,
  Trash2,
  Users,
  Zap,
  ArrowDownToLine,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { type Student, type Group } from "@/lib/mock-data"
import { StudentCard } from "./student-card"
import { EditGroupDialog } from "./edit-group-dialog"
import { DeleteGroupDialog } from "./delete-group-dialog"
import { SetLeaderDialog } from "./set-leader-dialog"
import { GroupMembersDialog } from "./group-members-dialog"
import { GroupBatchPointsDialog } from "./group-batch-points-dialog"
import { AddStudentToGroupDialog } from "./add-student-to-group-dialog"
import { BatchAssignDialog } from "./batch-assign-dialog"

interface GroupSectionProps {
  group: Group & { count: number }
  students: Student[]
  leader?: Student
  allStudents: Student[]
  allGroups: Group[]
  onDelete: () => void
  onEdit: (name: string) => void
  onSetLeader: (leaderIds: string[]) => void
  onAddMembers: (studentIds: string[]) => void
  onRemoveMembers: (studentIds: string[]) => void
  onAddNewStudent?: (student: { name: string; gender: "male" | "female"; studentNo?: string }) => void
  onBatchAssign?: (assignments: { studentId: string; groupId: string }[]) => void
  onUpdatePoints?: (studentId: string, points: number, mode: "add" | "deduct") => void
  onStudentAddPoint?: (student: Student) => void
  onStudentDeductPoint?: (student: Student) => void
  onStudentViewHistory?: (student: Student) => void
  onStudentOpenShop?: (student: Student) => void
}

export function GroupSection({
  group,
  students,
  leader,
  allStudents,
  allGroups,
  onDelete,
  onEdit,
  onSetLeader,
  onAddMembers,
  onRemoveMembers,
  onAddNewStudent,
  onBatchAssign,
  onUpdatePoints,
  onStudentAddPoint,
  onStudentDeductPoint,
  onStudentViewHistory,
  onStudentOpenShop,
}: GroupSectionProps) {
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [leaderOpen, setLeaderOpen] = useState(false)
  const [addMembersOpen, setAddMembersOpen] = useState(false)
  const [removeMembersOpen, setRemoveMembersOpen] = useState(false)
  const [batchAddOpen, setBatchAddOpen] = useState(false)
  const [batchDeductOpen, setBatchDeductOpen] = useState(false)
  const [addStudentOpen, setAddStudentOpen] = useState(false)
  const [batchAssignOpen, setBatchAssignOpen] = useState(false)

  // Get ungrouped students for adding
  const ungroupedStudents = allStudents.filter(s => !s.groupId)

  // Get leaders (support multiple)
  const leaders = students.filter(s => group.leaderIds?.includes(s.id) || s.id === group.leaderId)

  return (
    <div className="mb-8 overflow-hidden rounded-3xl border bg-card shadow-sm">
      {/* Group Header */}
      <div className="border-b bg-muted/30 p-5">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h3 className="text-xl font-semibold text-foreground">{group.name}</h3>
                <span className="rounded-full bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
                  {group.count} 人
                </span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">累计积分 {group.totalPoints}</span>
                <span className="rounded-full bg-purple-50 px-3 py-1 text-purple-700">可兑换积分 {group.availablePoints}</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-amber-700">
                  <Crown className="w-3 h-3" />
                  {leaders.length > 0 ? `组长 ${leaders.map(l => l.name).join(", ")}` : "未设组长"}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-10 rounded-xl"
              onClick={() => setLeaderOpen(true)}
            >
              <Crown className="w-4 h-4 mr-1" />
              设立组长
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-10 rounded-xl"
              onClick={() => setBatchAddOpen(true)}
            >
              <Zap className="w-4 h-4 mr-1" />
              批量加分
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-10 rounded-xl"
              onClick={() => setBatchDeductOpen(true)}
            >
              <Zap className="w-4 h-4 mr-1" />
              批量减分
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-10 rounded-xl"
              onClick={() => setBatchAssignOpen(true)}
            >
              <ArrowDownToLine className="w-4 h-4 mr-1" />
              批量分组
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-10 rounded-xl"
              onClick={() => setAddStudentOpen(true)}
            >
              <UserPlus className="w-4 h-4 mr-1" />
              添加成员
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-10 rounded-xl"
              onClick={() => setRemoveMembersOpen(true)}
            >
              <UserMinus className="w-4 h-4 mr-1" />
              删除成员
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-10 rounded-xl"
              onClick={() => setEditOpen(true)}
            >
              <Pencil className="w-4 h-4 mr-1" />
              编辑
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-10 rounded-xl"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="w-4 h-4 mr-1" />
              删除
            </Button>
          </div>
        </div>
      </div>

      {/* Students Grid */}
      <div className="p-5">
        {students.length > 0 ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {students.map((student) => (
              <StudentCard
                key={student.id}
                student={student}
                isLeader={group.leaderIds?.includes(student.id) || student.id === group.leaderId}
                onAddPoint={onStudentAddPoint}
                onDeductPoint={onStudentDeductPoint}
                onViewHistory={onStudentViewHistory}
                onOpenShop={onStudentOpenShop}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed bg-muted/20 py-10 text-center text-muted-foreground">
            <p>暂无成员</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3 rounded-xl"
              onClick={() => setAddStudentOpen(true)}
            >
              <Plus className="w-4 h-4 mr-1" />
              添加成员
            </Button>
          </div>
        )}
      </div>

      {/* Dialogs */}
      <EditGroupDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        groupName={group.name}
        onConfirm={onEdit}
      />

      <DeleteGroupDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        groupName={group.name}
        onConfirm={onDelete}
      />

      <SetLeaderDialog
        open={leaderOpen}
        onOpenChange={setLeaderOpen}
        groupName={group.name}
        students={students}
        currentLeaderIds={group.leaderIds || (group.leaderId ? [group.leaderId] : [])}
        onConfirm={onSetLeader}
      />

      <GroupMembersDialog
        open={addMembersOpen}
        onOpenChange={setAddMembersOpen}
        mode="add"
        groupName={group.name}
        students={ungroupedStudents}
        onConfirm={onAddMembers}
      />

      <GroupMembersDialog
        open={removeMembersOpen}
        onOpenChange={setRemoveMembersOpen}
        mode="remove"
        groupName={group.name}
        students={students}
        onConfirm={onRemoveMembers}
      />

      <GroupBatchPointsDialog
        open={batchAddOpen}
        onOpenChange={setBatchAddOpen}
        mode="add"
        groupName={group.name}
        students={students}
        onConfirm={async (studentIds, points) => {
          if (!onUpdatePoints) return
          for (const id of studentIds) {
            await onUpdatePoints(id, points, "add")
          }
        }}
      />

      <GroupBatchPointsDialog
        open={batchDeductOpen}
        onOpenChange={setBatchDeductOpen}
        mode="deduct"
        groupName={group.name}
        students={students}
        onConfirm={async (studentIds, points) => {
          if (!onUpdatePoints) return
          for (const id of studentIds) {
            await onUpdatePoints(id, points, "deduct")
          }
        }}
      />

      <AddStudentToGroupDialog
        open={addStudentOpen}
        onOpenChange={setAddStudentOpen}
        groups={allGroups}
        currentGroupId={group.id}
        ungroupedStudents={ungroupedStudents}
        onAddExisting={onAddMembers}
        onAddNew={onAddNewStudent}
      />

      {onBatchAssign && (
        <BatchAssignDialog
          open={batchAssignOpen}
          onOpenChange={setBatchAssignOpen}
          students={students}
          groups={allGroups.filter(g => g.id !== group.id)}
          currentGroupName={group.name}
          onConfirm={onBatchAssign}
        />
      )}
    </div>
  )
}
