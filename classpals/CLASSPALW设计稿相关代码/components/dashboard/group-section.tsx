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
    <div className="mb-6">
      {/* Group Header with Gradient - Purple to Pink */}
      <div className="bg-gradient-to-r from-[#6366f1] via-[#a855f7] to-[#ec4899] rounded-t-lg p-4 text-white">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">{group.name}</h3>
              <p className="text-sm text-white/80">
                共 {group.count} 人 · 总分: {group.totalPoints} · 可用: {group.availablePoints}
              </p>
              <p className="text-xs text-white/70 flex items-center gap-1">
                <Crown className="w-3 h-3" />
                {leaders.length > 0 ? (
                  <span>组长: {leaders.map(l => l.name).join(", ")}</span>
                ) : (
                  "未设组长"
                )}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              className="bg-white/20 hover:bg-white/30 text-white border-0"
              onClick={() => setLeaderOpen(true)}
            >
              <Crown className="w-4 h-4 mr-1" />
              设立组长
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="bg-white/20 hover:bg-white/30 text-white border-0"
              onClick={() => setBatchAddOpen(true)}
            >
              <Zap className="w-4 h-4 mr-1" />
              批量加分
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="bg-white/20 hover:bg-white/30 text-white border-0"
              onClick={() => setBatchDeductOpen(true)}
            >
              <Zap className="w-4 h-4 mr-1" />
              批量减分
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="bg-white/20 hover:bg-white/30 text-white border-0"
              onClick={() => setBatchAssignOpen(true)}
            >
              <ArrowDownToLine className="w-4 h-4 mr-1" />
              批量分组
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="bg-white/20 hover:bg-white/30 text-white border-0"
              onClick={() => setAddStudentOpen(true)}
            >
              <UserPlus className="w-4 h-4 mr-1" />
              添加成员
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="bg-white/20 hover:bg-white/30 text-white border-0"
              onClick={() => setRemoveMembersOpen(true)}
            >
              <UserMinus className="w-4 h-4 mr-1" />
              删除成员
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="bg-white/20 hover:bg-white/30 text-white border-0"
              onClick={() => setEditOpen(true)}
            >
              <Pencil className="w-4 h-4 mr-1" />
              编辑
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="bg-white/20 hover:bg-white/30 text-white border-0"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="w-4 h-4 mr-1" />
              删除
            </Button>
          </div>
        </div>
      </div>

      {/* Students Grid */}
      <div className="border border-t-0 rounded-b-lg p-4 bg-card">
        {students.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {students.map((student) => (
              <StudentCard
                key={student.id}
                student={student}
                isLeader={group.leaderIds?.includes(student.id) || student.id === group.leaderId}
                onAddPoint={() => onUpdatePoints?.(student.id, 1, "add")}
                onDeductPoint={() => onUpdatePoints?.(student.id, 1, "deduct")}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <p>暂无成员</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
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
        onConfirm={(studentIds, points) => {
          studentIds.forEach(id => onUpdatePoints?.(id, points, "add"))
        }}
      />

      <GroupBatchPointsDialog
        open={batchDeductOpen}
        onOpenChange={setBatchDeductOpen}
        mode="deduct"
        groupName={group.name}
        students={students}
        onConfirm={(studentIds, points) => {
          studentIds.forEach(id => onUpdatePoints?.(id, points, "deduct"))
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
