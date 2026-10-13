'use client'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface ClassSwitchConfirmDialogProps {
  open: boolean
  targetClassName?: string | null
  isPending?: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}

export function ClassSwitchConfirmDialog({
  open,
  targetClassName,
  isPending = false,
  onOpenChange,
  onConfirm,
}: ClassSwitchConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>切换班级</DialogTitle>
          <DialogDescription className="space-y-3 pt-2 text-left">
            <span className="block">
              切换到「{targetClassName || '目标班级'}」后，当前页面的数据会切换到该班级，后续加减分、排行、积分明细、宠物和商店等操作，也都会更新到该班级。
            </span>
            <span className="block rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-amber-700">
              如果你当前还有未完成的工作，请先完成后再切换，避免把后续操作更新到错误班级。
            </span>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            取消
          </Button>
          <Button onClick={onConfirm} disabled={isPending}>
            {isPending ? '切换中...' : '确认切换'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
