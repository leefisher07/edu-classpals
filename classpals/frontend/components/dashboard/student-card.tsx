"use client"

import { useState } from "react"
import { Plus, Minus, History, ShoppingCart, Crown, Zap, Trash2, Pencil } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import type { Student } from "@/lib/mock-data"

const API_ORIGIN = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api").replace(/\/api\/?$/, "")

function resolveAvatarUrl(avatar?: string | null) {
  if (!avatar) return ""
  if (/^https?:\/\//.test(avatar)) return avatar
  if (avatar.startsWith("/")) return `${API_ORIGIN}${avatar}`
  return avatar
}

interface StudentCardProps {
  student: Student & { avatar?: string | null }
  onAddPoint?: (student: Student) => void
  onDeductPoint?: (student: Student) => void
  onViewHistory?: (student: Student) => void
  onOpenShop?: (student: Student) => void
  onQuickAddPoint?: (student: Student) => void
  onDelete?: (student: Student) => void
  onEdit?: (student: Student) => void
  selected?: boolean
  onSelect?: (student: Student) => void
  selectable?: boolean
  isLeader?: boolean
  showDelete?: boolean
}

export function StudentCard({
  student,
  onAddPoint,
  onDeductPoint,
  onViewHistory,
  onOpenShop,
  onQuickAddPoint,
  onDelete,
  onEdit,
  selected,
  onSelect,
  selectable,
  isLeader,
  showDelete,
}: StudentCardProps) {
  const [showQuickAdd, setShowQuickAdd] = useState(false)
  const fallbackText = student.name?.slice(0, 2) || "?"
  const avatarColor = student.avatarColor || 'bg-blue-100 text-blue-700'
  const studentNumber = (student as any).studentNumber
  const groupName = (student as any).groupName || (student as any).group?.name
  const position = (student as any).customPosition || (student as any).cadrePosition

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowQuickAdd(true)
    onQuickAddPoint?.(student)
    setTimeout(() => setShowQuickAdd(false), 800)
  }

  return (
    <Card
      className={cn(
        "relative group flex min-h-[280px] flex-col overflow-hidden px-5 pb-4 pt-4 transition-all hover:-translate-y-0.5 hover:shadow-lg",
        selectable && "cursor-pointer",
        selected && "ring-2 ring-primary bg-primary/5"
      )}
      onClick={() => selectable && onSelect?.(student)}
    >
      <div className="absolute left-3 top-3 z-10 flex gap-1.5">
        {showDelete && (
          <button
            className="flex h-8 w-8 items-center justify-center rounded-full bg-background/90 text-muted-foreground opacity-0 shadow-sm transition-opacity hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
            onClick={(e) => {
              e.stopPropagation()
              onDelete?.(student)
            }}
            aria-label="删除学生"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}

        {onEdit && (
          <button
            className="flex h-8 w-8 items-center justify-center rounded-full bg-background/90 text-muted-foreground opacity-0 shadow-sm transition-opacity hover:bg-blue-50 hover:text-blue-500 group-hover:opacity-100"
            onClick={(e) => {
              e.stopPropagation()
              onEdit(student)
            }}
            aria-label="编辑学生"
          >
            <Pencil className="w-4 h-4" />
          </button>
        )}
      </div>

      {onQuickAddPoint && (
        <button
          className={cn(
            "absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full shadow-sm transition-all",
            showQuickAdd
              ? "scale-125 bg-amber-400"
              : "bg-amber-400 hover:bg-amber-500"
          )}
          onClick={handleQuickAdd}
          aria-label="快捷加分"
        >
          <Zap className="w-4 h-4 text-white" />
        </button>
      )}

      {showQuickAdd && (
        <div className="pointer-events-none absolute inset-0 z-20">
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 animate-bounce text-3xl font-bold text-green-500">
            +1
          </div>
        </div>
      )}

      <div className="flex flex-col items-center text-center">
        <div className="relative">
          <Avatar className={cn("h-28 w-28 border-4 border-background shadow-sm transition-transform", showQuickAdd && "scale-110")}>
            {student.avatar ? <AvatarImage src={resolveAvatarUrl(student.avatar)} alt={student.name} className="object-cover" /> : null}
            <AvatarFallback className={cn("text-[2.5rem] font-bold", avatarColor)}>
              {fallbackText}
            </AvatarFallback>
          </Avatar>
          {isLeader && (
            <div className="absolute -right-1 -top-1 flex h-7 w-7 items-center justify-center rounded-full bg-amber-400 shadow-sm">
              <Crown className="w-4 h-4 text-white" />
            </div>
          )}
        </div>

        <div className="mt-1.5 min-w-0 space-y-1">
          <h3 className="truncate text-base font-semibold text-foreground">{student.name}</h3>
          <div className="flex flex-wrap items-center justify-center gap-1.5 text-xs text-muted-foreground">
            {studentNumber && <span className="rounded-full bg-muted px-2 py-0.5">学号 {studentNumber}</span>}
            {groupName && <span className="rounded-full bg-muted px-2 py-0.5">{groupName}</span>}
            {position && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-primary">{position}</span>}
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-center">
          <p className="text-[11px] font-medium tracking-wide text-emerald-700/80">可兑换积分</p>
          <p className="mt-1 text-2xl font-bold leading-none text-emerald-600">{student.availablePoints}</p>
        </div>
        <div className="rounded-2xl border border-primary/15 bg-primary/5 px-3 py-3 text-center">
          <p className="text-[11px] font-medium tracking-wide text-muted-foreground">累计积分</p>
          <p className={cn("mt-1 text-2xl font-bold leading-none text-primary transition-all", showQuickAdd && "scale-125 text-green-500")}>
            {student.totalPoints}
          </p>
        </div>
      </div>

      {!selectable && (
        <div className="mt-3 flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 rounded-full border-green-200 text-green-600 hover:bg-green-50 hover:text-green-700"
            onClick={(e) => {
              e.stopPropagation()
              onAddPoint?.(student)
            }}
          >
            <Plus className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 rounded-full border-red-200 text-red-500 hover:bg-red-50 hover:text-red-600"
            onClick={(e) => {
              e.stopPropagation()
              onDeductPoint?.(student)
            }}
          >
            <Minus className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full text-muted-foreground hover:text-foreground"
            onClick={(e) => {
              e.stopPropagation()
              onViewHistory?.(student)
            }}
            aria-label="查看积分明细"
          >
            <History className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full text-muted-foreground hover:text-primary"
            onClick={(e) => {
              e.stopPropagation()
              onOpenShop?.(student)
            }}
          >
            <ShoppingCart className="w-4 h-4" />
          </Button>
        </div>
      )}
    </Card>
  )
}
