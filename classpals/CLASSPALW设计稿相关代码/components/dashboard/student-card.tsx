"use client"

import { useState } from "react"
import { Plus, Minus, History, ShoppingCart, Crown, Zap, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import type { Student } from "@/lib/mock-data"
import { getSurname } from "@/lib/mock-data"

interface StudentCardProps {
  student: Student
  onAddPoint?: (student: Student) => void
  onDeductPoint?: (student: Student) => void
  onViewHistory?: (student: Student) => void
  onOpenShop?: (student: Student) => void
  onQuickAddPoint?: (student: Student) => void
  onDelete?: (student: Student) => void
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
  selected,
  onSelect,
  selectable,
  isLeader,
  showDelete,
}: StudentCardProps) {
  const [showQuickAdd, setShowQuickAdd] = useState(false)
  const surname = getSurname(student.name)

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowQuickAdd(true)
    onQuickAddPoint?.(student)
    setTimeout(() => setShowQuickAdd(false), 800)
  }

  return (
    <Card
      className={cn(
        "p-4 transition-all hover:shadow-md relative group",
        selectable && "cursor-pointer",
        selected && "ring-2 ring-primary bg-primary/5"
      )}
      onClick={() => selectable && onSelect?.(student)}
    >
      {/* 删除按钮 - 悬浮显示 */}
      {showDelete && (
        <button
          className="absolute top-2 left-2 w-6 h-6 rounded-full bg-muted/80 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-100 hover:text-red-500 flex items-center justify-center"
          onClick={(e) => {
            e.stopPropagation()
            onDelete?.(student)
          }}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}

      {/* 快速加分按钮 */}
      <button
        className={cn(
          "absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center transition-all",
          showQuickAdd
            ? "bg-amber-400 scale-125"
            : "bg-amber-400 hover:bg-amber-500"
        )}
        onClick={handleQuickAdd}
      >
        <Zap className="w-4 h-4 text-white" />
      </button>

      {/* 快速加分动画 */}
      {showQuickAdd && (
        <div className="absolute top-0 right-0 w-full h-full pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-2xl font-bold text-green-500 animate-bounce">
            +1
          </div>
        </div>
      )}

      {/* 头像 */}
      <div className="flex flex-col items-center">
        <div className="relative">
          <div
            className={cn(
              "w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold transition-transform",
              student.avatarColor,
              showQuickAdd && "scale-110"
            )}
          >
            {surname}
          </div>
          {isLeader && (
            <div className="absolute -top-1 -right-1 w-6 h-6 bg-amber-400 rounded-full flex items-center justify-center shadow-sm">
              <Crown className="w-3.5 h-3.5 text-white" />
            </div>
          )}
        </div>
        <h3 className="font-medium text-foreground mt-2">{student.name}</h3>
      </div>

      {/* 积分信息 */}
      <div className="mt-3 space-y-1">
        <div className="flex items-center justify-between text-sm">
          <span className="text-primary">总分</span>
          <span className={cn(
            "font-semibold text-primary transition-all",
            showQuickAdd && "scale-125 text-green-500"
          )}>
            {student.totalPoints}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-accent">可用</span>
          <span className="font-semibold text-accent">{student.availablePoints}</span>
        </div>
      </div>

      {/* 操作按钮 */}
      {!selectable && (
        <div className="flex items-center justify-center gap-1.5 mt-4">
          <Button
            variant="outline"
            size="icon"
            className="w-8 h-8 rounded-full border-green-200 text-green-600 hover:bg-green-50 hover:text-green-700"
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
            className="w-8 h-8 rounded-full border-red-200 text-red-500 hover:bg-red-50 hover:text-red-600"
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
            className="w-8 h-8 rounded-full text-muted-foreground hover:text-foreground"
            onClick={(e) => {
              e.stopPropagation()
              onViewHistory?.(student)
            }}
          >
            <History className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="w-8 h-8 rounded-full text-muted-foreground hover:text-primary"
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
