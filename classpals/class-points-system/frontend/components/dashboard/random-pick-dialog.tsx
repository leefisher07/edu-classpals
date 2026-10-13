"use client"

import { useEffect, useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Dice5, RefreshCcw, Sparkles, Target, Users } from "lucide-react"
import { toast } from "sonner"
import { studentsApi, pointsApi } from "@/lib/api/students"
import { toolsApi } from "@/lib/api/tools"
import { useActiveClass } from "@/lib/hooks/use-active-class"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"

type StudentListResponse = {
  students: StudentItem[]
}

type StudentItem = {
  id: string
  name: string
  avatar?: string | null
  avatarBgColor?: string | null
  studentNumber?: string | null
}

type RandomPickResponse = {
  picked: StudentItem[]
  remaining: number
  total: number
}

type PickHistoryRecord = {
  id: string
  operatorName: string
  students: PickedStudent[]
  count: number
  createdAt: string
}

type PickedStudent = {
  id: string
  name: string
}

type BubbleLayout = {
  left: string
  top: string
  size: number
  delay: string
}

type RandomPickDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const bubblePalette = [
  "#F3E8FF",
  "#E0F2FE",
  "#DCFCE7",
  "#FEF3C7",
  "#FCE7F3",
  "#EDE9FE",
]

function getNameFallback(name: string) {
  return name?.charAt(0) || "?"
}

function buildBubbleLayout(studentId: string, index: number): BubbleLayout {
  const seed = studentId.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) + index * 17
  return {
    left: `${10 + (seed * 13) % 78}%`,
    top: `${14 + (seed * 7) % 62}%`,
    size: 60 + (seed % 24),
    delay: `${(seed % 8) * 0.12}s`,
  }
}

export function RandomPickDialog({ open, onOpenChange }: RandomPickDialogProps) {
  const queryClient = useQueryClient()
  const { activeClassId } = useActiveClass()

  const [count, setCount] = useState(1)
  const [dedupeEnabled, setDedupeEnabled] = useState(false)
  const [excludedIds, setExcludedIds] = useState<string[]>([])
  const [pickedStudents, setPickedStudents] = useState<StudentItem[]>([])
  const [awardOpen, setAwardOpen] = useState(false)
  const [selectedAwardIds, setSelectedAwardIds] = useState<string[]>([])
  const [awardValue, setAwardValue] = useState("1")
  const [awardReason, setAwardReason] = useState("随机点名答对加分")
  const [awardCompleted, setAwardCompleted] = useState(false)

  const { data: studentsData } = useQuery({
    queryKey: ["students", activeClassId, "random-pick-dialog"],
    queryFn: () => studentsApi.list(activeClassId!),
    enabled: open && !!activeClassId,
  })

  const { data: historyData } = useQuery({
    queryKey: ["pick-history", activeClassId],
    queryFn: () => toolsApi.pickHistory(activeClassId!, { limit: 5 }),
    enabled: open && !!activeClassId,
  })

  const students = useMemo(() => {
    const response = studentsData as StudentListResponse | { data?: StudentListResponse } | StudentItem[] | undefined
    if (Array.isArray(response)) return response
    if (Array.isArray((response as any)?.students)) return (response as any).students
    if (Array.isArray((response as any)?.data?.students)) return (response as any).data.students
    return []
  }, [studentsData])

  const history = useMemo(() => {
    const response = historyData as PickHistoryRecord[] | { data?: PickHistoryRecord[] } | undefined
    if (Array.isArray(response)) return response
    if (Array.isArray((response as any)?.data)) return (response as any).data
    return []
  }, [historyData])

  const remainingStudents = useMemo(() => {
    if (!dedupeEnabled) return students
    return students.filter((student: StudentItem) => !excludedIds.includes(student.id))
  }, [dedupeEnabled, excludedIds, students])

  const bubbleLayouts = useMemo(() => {
    return new Map<string, BubbleLayout>(students.map((student: StudentItem, index: number) => [student.id, buildBubbleLayout(student.id, index)]))
  }, [students])

  useEffect(() => {
    if (!open) {
      setCount(1)
      setDedupeEnabled(false)
      setExcludedIds([])
      setPickedStudents([])
      setAwardOpen(false)
      setSelectedAwardIds([])
      setAwardValue("1")
      setAwardReason("随机点名答对加分")
      setAwardCompleted(false)
    }
  }, [open])

  const randomPickMutation = useMutation({
    mutationFn: () =>
      toolsApi.randomPick(activeClassId!, {
        count,
        excludeIds: dedupeEnabled ? excludedIds : undefined,
      }),
    onSuccess: (data) => {
      const response = data as RandomPickResponse | { data?: RandomPickResponse } | undefined
      const nextPicked = Array.isArray((response as any)?.picked)
        ? (response as any).picked
        : Array.isArray((response as any)?.data?.picked)
          ? (response as any).data.picked
          : []
      setPickedStudents(nextPicked)
      setSelectedAwardIds(nextPicked.map((student: StudentItem) => student.id))
      setAwardOpen(false)
      setAwardCompleted(false)

      if (dedupeEnabled) {
        setExcludedIds((prev) => Array.from(new Set([...prev, ...nextPicked.map((student: StudentItem) => student.id)])))
      }

      queryClient.invalidateQueries({ queryKey: ["pick-history", activeClassId] })
    },
    onError: (error: any) => {
      toast.error(error?.message || "随机点名失败")
    },
  })

  const awardMutation = useMutation({
    mutationFn: () =>
      pointsApi.batch(activeClassId!, {
        studentIds: selectedAwardIds,
        type: "ADD",
        value: Number(awardValue),
        reason: awardReason.trim() || "随机点名答对加分",
      }),
    onSuccess: () => {
      toast.success("答对加分已记录")
      setAwardCompleted(true)
      setAwardOpen(false)
      queryClient.invalidateQueries({ queryKey: ["students"] })
      queryClient.invalidateQueries({ queryKey: ["groups"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard-overview", activeClassId] })
      queryClient.invalidateQueries({ queryKey: ["dashboard-ranking", activeClassId] })
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || error?.message || "答对加分失败")
    },
  })

  const handlePick = () => {
    if (!activeClassId) {
      toast.error("请先激活一个班级")
      return
    }

    if (students.length === 0) {
      toast.error("当前班级暂无学生")
      return
    }

    if (dedupeEnabled && remainingStudents.length < count) {
      toast.error("剩余可抽学生不足，请重置后继续")
      return
    }

    if (!dedupeEnabled && students.length < count) {
      toast.error("抽取人数不能超过班级学生数量")
      return
    }

    randomPickMutation.mutate()
  }

  const toggleAwardStudent = (studentId: string) => {
    setSelectedAwardIds((prev) =>
      prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId]
    )
  }

  const handleAward = () => {
    const numericValue = Number(awardValue)

    if (selectedAwardIds.length === 0) {
      toast.error("请至少选择一名学生")
      return
    }

    if (!numericValue || numericValue <= 0) {
      toast.error("请输入大于 0 的分值")
      return
    }

    awardMutation.mutate()
  }

  const currentModeLabel = dedupeEnabled ? "去重抽取" : "可重复抽取"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(96vw,1200px)] max-w-none h-[92vh] overflow-hidden rounded-[28px] border-0 p-0 shadow-2xl">
        <div className="flex h-[92vh] flex-col bg-background">
          <DialogHeader className="border-b px-4 py-4 sm:px-6 sm:py-5 lg:px-8 lg:py-6">
            <DialogTitle className="flex items-center gap-3 pr-10 text-2xl font-semibold sm:text-3xl">
              <Sparkles className="h-8 w-8 text-primary" />
              随机点名
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 space-y-4 overflow-y-auto bg-[#fcfbff] px-4 py-4 sm:space-y-5 sm:px-6 sm:py-5 lg:space-y-6 lg:px-8 lg:py-6">
            <section className="rounded-[24px] border border-[#ebe5ff] bg-white px-4 py-4 shadow-sm sm:rounded-[28px] sm:px-5 sm:py-5 lg:px-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-4">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900 sm:text-2xl">随机点名</h2>
                    <p className="mt-1.5 text-sm text-slate-500">
                      班级头像 | {currentModeLabel}
                    </p>
                  </div>
                  <div className="inline-flex items-center gap-3 rounded-full border border-slate-200 bg-white px-4 py-2 shadow-sm">
                    <Switch checked={dedupeEnabled} onCheckedChange={setDedupeEnabled} />
                    <span className="text-sm font-medium text-slate-700">
                      去重模式：{dedupeEnabled ? "开启" : "关闭"}
                    </span>
                  </div>
                </div>

                <div className="inline-flex items-center gap-3 rounded-full border border-slate-200 bg-white px-4 py-2 shadow-sm sm:gap-5 sm:px-5 sm:py-3">
                  <button
                    type="button"
                    className="text-2xl text-slate-400 transition-colors hover:text-slate-700"
                    onClick={() => setCount((value) => Math.max(1, value - 1))}
                  >
                    -
                  </button>
                  <span className="text-base font-medium text-slate-700 sm:text-lg">
                    抽取 <span className="text-2xl font-semibold text-primary sm:text-3xl">{count}</span> 人
                  </span>
                  <button
                    type="button"
                    className="text-2xl text-slate-400 transition-colors hover:text-slate-700"
                    onClick={() => setCount((value) => value + 1)}
                  >
                    +
                  </button>
                </div>
              </div>
            </section>

            <section className="relative min-h-[220px] overflow-hidden rounded-[24px] border border-[#ebe5ff] bg-white px-3 py-3 shadow-sm sm:min-h-[240px] sm:rounded-[28px] sm:px-4 sm:py-4 lg:min-h-[280px]">
              <div className="absolute inset-x-[10%] top-[12%] h-[76%] rounded-[999px] border border-primary/10" />
              <div className="absolute inset-x-[22%] top-[24%] h-[52%] rounded-[999px] border border-primary/10" />

              {students.length === 0 ? (
                <div className="flex h-[210px] items-center justify-center text-slate-400 sm:h-[220px] lg:h-[260px]">
                  当前班级暂无学生
                </div>
              ) : (
                <div className="relative h-[210px] sm:h-[220px] lg:h-[260px]">
                  {students.map((student: StudentItem, index: number) => {
                    const layout = bubbleLayouts.get(student.id)!
                    const isExcluded = dedupeEnabled && excludedIds.includes(student.id)
                    const isPicked = pickedStudents.some((item: StudentItem) => item.id === student.id)
                    const backgroundColor = student.avatarBgColor || bubblePalette[index % bubblePalette.length]

                    return (
                      <div
                        key={student.id}
                        className={cn(
                          "absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-500",
                          randomPickMutation.isPending && "animate-pulse",
                          isExcluded && "opacity-25 grayscale",
                          isPicked && "z-20 scale-125"
                        )}
                        style={{
                          left: layout.left,
                          top: layout.top,
                          animationDelay: layout.delay,
                        }}
                      >
                        <div
                          className={cn(
                            "flex items-center justify-center rounded-full border-2 border-primary/20 bg-white shadow-sm",
                            isPicked && "border-primary shadow-lg ring-4 ring-primary/10"
                          )}
                          style={{
                            width: `clamp(40px, ${layout.size * 0.82}px, 64px)`,
                            height: `clamp(40px, ${layout.size * 0.82}px, 64px)`,
                            backgroundColor: student.avatar ? undefined : backgroundColor,
                          }}
                        >
                          {student.avatar ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={student.avatar}
                              alt={student.name}
                              className="h-full w-full rounded-full object-cover"
                            />
                          ) : (
                            <span className="text-base font-semibold text-slate-700 sm:text-xl">
                              {getNameFallback(student.name)}
                            </span>
                          )}
                        </div>
                        <div className="mt-1 text-center text-[11px] font-medium leading-tight text-slate-700 sm:mt-1.5 sm:text-xs">
                          {student.name}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </section>

            {(pickedStudents.length > 0 || history.length > 0) && (
              <section className="grid gap-4 2xl:grid-cols-[1.6fr_1fr]">
                <div className="rounded-[24px] border border-[#ebe5ff] bg-white px-4 py-4 shadow-sm sm:rounded-[28px] sm:px-6 sm:py-5">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="flex items-center gap-2 text-xl font-semibold text-primary">
                      <Target className="h-5 w-5" />
                      本轮结果
                    </h3>
                    {pickedStudents.length > 0 && (
                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-full border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                        onClick={() => setAwardOpen((value) => !value)}
                        disabled={awardCompleted}
                      >
                        答对加分
                      </Button>
                    )}
                  </div>

                  {pickedStudents.length > 0 ? (
                    <>
                      <div className="mt-5 flex flex-wrap gap-3">
                        {pickedStudents.map((student: StudentItem) => (
                          <div
                            key={student.id}
                            className="rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-base font-medium text-primary"
                          >
                            {student.name}
                          </div>
                        ))}
                      </div>

                      {awardOpen && !awardCompleted && (
                        <div className="mt-5 rounded-3xl border border-emerald-200 bg-emerald-50/60 p-4">
                          <p className="mb-4 text-sm font-medium text-emerald-800">选择答对学生并自定义加分：</p>
                          <div className="mb-4 flex flex-wrap gap-2">
                            {pickedStudents.map((student: StudentItem) => {
                              const selected = selectedAwardIds.includes(student.id)
                              return (
                                <button
                                  key={student.id}
                                  type="button"
                                  className={cn(
                                    "rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                                    selected
                                      ? "border-emerald-400 bg-white text-emerald-700"
                                      : "border-emerald-100 bg-transparent text-emerald-500"
                                  )}
                                  onClick={() => toggleAwardStudent(student.id)}
                                >
                                  {selected ? "✓ " : ""}
                                  {student.name}
                                </button>
                              )
                            })}
                          </div>

                          <div className="grid gap-3 md:grid-cols-[120px_1fr_auto]">
                            <Input
                              type="number"
                              min="1"
                              value={awardValue}
                              onChange={(event) => setAwardValue(event.target.value)}
                              placeholder="分值"
                              className="h-11 rounded-2xl bg-white"
                            />
                            <Input
                              value={awardReason}
                              onChange={(event) => setAwardReason(event.target.value)}
                              placeholder="随机点名答对加分"
                              className="h-11 rounded-2xl bg-white"
                            />
                            <Button
                              type="button"
                              className="h-11 rounded-2xl bg-emerald-600 px-5 hover:bg-emerald-700"
                              onClick={handleAward}
                              disabled={awardMutation.isPending}
                            >
                              {awardMutation.isPending ? "提交中..." : "确认加分"}
                            </Button>
                          </div>
                        </div>
                      )}

                      {awardCompleted && (
                        <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                          本轮答对加分已写入学生积分与积分记录。
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="mt-5 text-sm text-slate-400">还没有进行本轮抽取</p>
                  )}
                </div>

                <div className="rounded-[24px] border border-[#ebe5ff] bg-white px-4 py-4 shadow-sm sm:rounded-[28px] sm:px-6 sm:py-5">
                  <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-800">
                    <Users className="h-5 w-5 text-primary" />
                    最近点名
                  </h3>
                  {history.length === 0 ? (
                    <p className="mt-4 text-sm text-slate-400">暂无点名记录</p>
                  ) : (
                    <div className="mt-4 space-y-3">
                      {history.map((record: PickHistoryRecord) => (
                        <div key={record.id} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                          <div className="flex flex-wrap gap-2 text-sm font-medium text-slate-700">
                            {record.students.map((student: PickedStudent) => (
                              <span key={student.id}>{student.name}</span>
                            ))}
                          </div>
                          <div className="mt-2 text-xs text-slate-400">
                            {new Date(record.createdAt).toLocaleString("zh-CN")}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            )}

            <section className="flex flex-col gap-3 rounded-[24px] border border-[#ebe5ff] bg-white px-4 py-4 shadow-sm sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:rounded-[28px] sm:px-6 sm:py-5">
              <div className="text-sm text-slate-500">
                当前模式：<span className="font-semibold text-primary">{currentModeLabel}</span>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {dedupeEnabled && (
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-full"
                    onClick={() => {
                      setExcludedIds([])
                      toast.success("已重置去重记录")
                    }}
                  >
                    <RefreshCcw className="mr-2 h-4 w-4" />
                    重置去重记录
                  </Button>
                )}
                <Button
                  type="button"
                  className="rounded-full bg-primary px-6 py-5 text-base shadow-lg hover:bg-primary/90 sm:px-8 sm:py-6"
                  onClick={handlePick}
                  disabled={randomPickMutation.isPending}
                >
                  <Dice5 className="mr-2 h-5 w-5" />
                  {randomPickMutation.isPending ? "抽取中..." : pickedStudents.length > 0 ? "再抽一次" : "一键抽取"}
                </Button>
              </div>
            </section>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
