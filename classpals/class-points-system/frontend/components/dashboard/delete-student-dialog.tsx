"use client"

import { useEffect, useState } from "react"
import { AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { Student } from "@/lib/mock-data"

interface DeleteStudentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  student: Student | null
  onSuccess?: () => void
  onConfirm?: () => void
  isPending?: boolean
}

const IMPACT_ITEMS = [
  "积分流水",
  "小组关系",
  "商品兑换记录",
  "宠物数据",
  "家长绑定关系",
  "学生基础资料",
]

export function DeleteStudentDialog({
  open,
  onOpenChange,
  student,
  onConfirm,
  isPending = false,
}: DeleteStudentDialogProps) {
  const [confirmName, setConfirmName] = useState("")

  useEffect(() => {
    if (!open) {
      setConfirmName("")
    }
  }, [open])

  if (!student) return null

  const canConfirm = confirmName.trim() === student.name

  const handleConfirm = () => {
    if (!canConfirm || isPending) return
    onConfirm?.()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-500">
            <AlertTriangle className="w-5 h-5" />
            删除学生
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="flex flex-col items-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
            <h3 className="mb-2 text-lg font-semibold">删除「{student.name}」</h3>
            <p className="text-center text-sm text-muted-foreground">
              这会删除该学生及其完整关联数据，但系统会生成一条恢复记录，后续可在数据管理中恢复。
            </p>
          </div>

          <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-4">
            <p className="text-sm font-medium text-red-700">本次删除将影响：</p>
            <ul className="mt-3 grid gap-2 text-sm text-red-700 sm:grid-cols-2">
              {IMPACT_ITEMS.map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">
              请输入学生姓名 <span className="text-red-500">{student.name}</span> 以确认删除
            </p>
            <Input
              value={confirmName}
              onChange={(event) => setConfirmName(event.target.value)}
              placeholder="请输入学生姓名"
            />
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            取消
          </Button>
          <Button
            className="flex-1 bg-red-500 text-white hover:bg-red-600"
            onClick={handleConfirm}
            disabled={!canConfirm || isPending}
          >
            {isPending ? '删除中...' : '确认删除'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
