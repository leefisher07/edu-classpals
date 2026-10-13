"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { BellOff, CheckCircle2, Mic, Pause, Users } from "lucide-react"
import { toast } from "sonner"
import { studentsApi, pointsApi } from "@/lib/api/students"
import { useActiveClass } from "@/lib/hooks/use-active-class"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { useAudioMonitor } from "@/components/dashboard/use-audio-monitor"

type QuietChallengeDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type ApiEnvelope<T> = {
  data: T
}

type StudentItem = {
  id: string
  name?: string
  studentNo?: string
}

type ChallengeStatus = "idle" | "running" | "success" | "failed" | "blocked"

const defaultThreshold = 50
const defaultDurationMinutes = 3
const defaultRewardPoints = 1
const maxDurationMinutes = 60
const maxRewardPoints = 100
const ringRadius = 112
const ringLength = 2 * Math.PI * ringRadius
const initialRingOffset = ringLength
const meterSegments = [
  {
    id: "quiet",
    color: "#22c55e",
    path: "M 96 236 A 132 132 0 0 1 175 120",
  },
  {
    id: "noisy",
    color: "#fb7185",
    path: "M 245 120 A 132 132 0 0 1 324 236",
  },
]

function formatTimer(seconds: number) {
  const safeSeconds = Math.max(0, seconds)
  const minutes = Math.floor(safeSeconds / 60)
  const secs = safeSeconds % 60
  return `${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
}

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  return `${minutes}:00`
}

function getQuietStatus(volume: number, threshold: number) {
  if (volume <= Math.max(0, threshold - 15)) {
    return {
      label: "安静",
      tone: "text-emerald-500",
      badge: "border-emerald-200 bg-emerald-50 text-emerald-600",
    }
  }
  if (volume <= threshold) {
    return {
      label: "正常",
      tone: "text-amber-500",
      badge: "border-amber-200 bg-amber-50 text-amber-600",
    }
  }
  return {
    label: "吵闹",
    tone: "text-rose-500",
    badge: "border-rose-200 bg-rose-50 text-rose-600",
  }
}

function getPermissionMessage(permissionState: ReturnType<typeof useAudioMonitor>["permissionState"]) {
  if (permissionState === "unsupported") return "当前浏览器或设备不支持麦克风监测，请更换浏览器后重试。"
  if (permissionState === "denied") return "麦克风权限被拒绝，请在浏览器地址栏或系统设置中重新开启后再试。"
  if (permissionState === "error") return "麦克风启动失败，请检查设备输入源后重试。"
  if (permissionState === "requesting") return "正在请求麦克风权限，请在浏览器弹窗中允许访问。"
  if (permissionState === "granted") return "监测已就绪，点击开始监测即可进入静音挑战。"
  return "开始监测时将请求浏览器麦克风权限，未授权前无法开始挑战。"
}

function getStatusMessage(status: ChallengeStatus, permissionState: ReturnType<typeof useAudioMonitor>["permissionState"]) {
  if (permissionState !== "granted") return getPermissionMessage(permissionState)
  if (status === "success") return "静音挑战成功，课堂安静保持达标。"
  if (status === "failed") return "检测到音量超过阈值，本次静音挑战已中断。"
  if (status === "running") return "静音挑战进行中，请保持当前课堂安静状态。"
  if (status === "blocked") return "请先完成麦克风授权后再开始监测。"
  return "点击开始监测后进入挑战，持续安静达到目标时长即可成功。"
}

export function QuietChallengeDialog({ open, onOpenChange }: QuietChallengeDialogProps) {
  const queryClient = useQueryClient()
  const { activeClassId } = useActiveClass()
  const { permissionState, volume, peakVolume, startMonitoring, stopMonitoring, resetPeak } = useAudioMonitor()

  const [threshold, setThreshold] = useState(defaultThreshold)
  const [rewardEnabled, setRewardEnabled] = useState(true)
  const [durationMinutes, setDurationMinutes] = useState(defaultDurationMinutes)
  const [rewardPoints, setRewardPoints] = useState(defaultRewardPoints)
  const [activeDurationSeconds, setActiveDurationSeconds] = useState(defaultDurationMinutes * 60)
  const [displayRemainingSeconds, setDisplayRemainingSeconds] = useState(defaultDurationMinutes * 60)
  const [challengeStatus, setChallengeStatus] = useState<ChallengeStatus>("idle")
  const [hasStarted, setHasStarted] = useState(false)
  const [showCloseConfirm, setShowCloseConfirm] = useState(false)
  const [rewardCompleted, setRewardCompleted] = useState(false)
  const [showRewardSelector, setShowRewardSelector] = useState(false)
  const [selectedRewardIds, setSelectedRewardIds] = useState<Set<string>>(new Set())
  const countdownDeadlineRef = useRef<number | null>(null)
  const countdownAnimationFrameRef = useRef<number | null>(null)

  const { data: studentsData } = useQuery({
    queryKey: ["students", activeClassId, "quiet-challenge"],
    queryFn: () => studentsApi.list(activeClassId!),
    enabled: open && !!activeClassId,
  })

  const students = useMemo(() => {
    const response = (studentsData as ApiEnvelope<{ students: StudentItem[] }> | undefined)?.data
    return response?.students ?? []
  }, [studentsData])

  const studentCount = students.length
  const selectedRewardCount = selectedRewardIds.size
  const shouldShowRewardPanel = showRewardSelector && rewardEnabled && challengeStatus === "success" && studentCount > 0

  const toggleRewardStudent = useCallback((studentId: string) => {
    setSelectedRewardIds((current) => {
      const next = new Set(current)
      if (next.has(studentId)) {
        next.delete(studentId)
      } else {
        next.add(studentId)
      }
      return next
    })
  }, [])

  const selectAllRewardStudents = useCallback(() => {
    setSelectedRewardIds(new Set(students.map((student) => student.id)))
  }, [students])

  const clearRewardSelection = useCallback(() => {
    setSelectedRewardIds(new Set())
  }, [])

  const awardMutation = useMutation({
    mutationFn: (studentIds: string[]) =>
      pointsApi.batch(activeClassId!, {
        studentIds,
        type: "ADD",
        value: rewardPoints,
        reason: "静音挑战成功",
      }),
    onSuccess: () => {
      toast.success("静音挑战奖励已发放")
      setRewardCompleted(true)
      setShowRewardSelector(false)
      queryClient.invalidateQueries({ queryKey: ["students"] })
      queryClient.invalidateQueries({ queryKey: ["groups"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard-overview", activeClassId] })
      queryClient.invalidateQueries({ queryKey: ["dashboard-ranking", activeClassId] })
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || error?.message || "静音挑战奖励发放失败")
    },
  })

  const hasCountdownStarted = hasStarted || challengeStatus === "success" || challengeStatus === "failed"
  const progress = hasCountdownStarted && activeDurationSeconds > 0 ? displayRemainingSeconds / activeDurationSeconds : 0
  const ringOffset = hasCountdownStarted ? ringLength * (1 - progress) : initialRingOffset
  const currentStatus = getQuietStatus(volume, threshold)
  const shouldConfirmClose = hasStarted && challengeStatus === "running"
  const isDurationLocked = challengeStatus === "running"

  const resetChallenge = useCallback(() => {
    if (countdownAnimationFrameRef.current !== null) {
      window.cancelAnimationFrame(countdownAnimationFrameRef.current)
      countdownAnimationFrameRef.current = null
    }
    countdownDeadlineRef.current = null
    stopMonitoring()
    const nextDurationSeconds = durationMinutes * 60
    setActiveDurationSeconds(nextDurationSeconds)
    setDisplayRemainingSeconds(nextDurationSeconds)
    setChallengeStatus("idle")
    setHasStarted(false)
    setRewardCompleted(false)
    setShowRewardSelector(false)
    setSelectedRewardIds(new Set())
    setShowCloseConfirm(false)
  }, [durationMinutes, stopMonitoring])

  const handleChallengeSuccess = useCallback(() => {
    if (countdownAnimationFrameRef.current !== null) {
      window.cancelAnimationFrame(countdownAnimationFrameRef.current)
      countdownAnimationFrameRef.current = null
    }
    countdownDeadlineRef.current = null
    stopMonitoring()
    setChallengeStatus("success")
    setDisplayRemainingSeconds(0)

    if (!rewardEnabled || rewardCompleted) {
      setShowRewardSelector(false)
      toast.success("静音挑战成功")
      return
    }

    if (studentCount === 0) {
      setShowRewardSelector(false)
      toast.success("静音挑战成功，当前班级暂无学生可奖励")
      setRewardCompleted(true)
      return
    }

    setSelectedRewardIds(new Set(students.map((student) => student.id)))
    setShowRewardSelector(true)
    toast.success("静音挑战成功，请选择要加分的学生")
  }, [rewardCompleted, rewardEnabled, stopMonitoring, studentCount, students])

  const handleSubmitReward = useCallback(() => {
    const studentIds = Array.from(selectedRewardIds)
    if (studentIds.length === 0) {
      toast.error("请至少选择一名学生")
      return
    }

    awardMutation.mutate(studentIds)
  }, [awardMutation, selectedRewardIds])

  useEffect(() => {
    if (!open) {
      stopMonitoring()
      setThreshold(defaultThreshold)
      setRewardEnabled(true)
      setDurationMinutes(defaultDurationMinutes)
      setRewardPoints(defaultRewardPoints)
      setActiveDurationSeconds(defaultDurationMinutes * 60)
      setDisplayRemainingSeconds(defaultDurationMinutes * 60)
      setChallengeStatus("idle")
      setHasStarted(false)
      setShowCloseConfirm(false)
      setRewardCompleted(false)
      setShowRewardSelector(false)
      setSelectedRewardIds(new Set())
    }
  }, [open, stopMonitoring])

  useEffect(() => {
    if (challengeStatus === "running") return
    const nextDurationSeconds = durationMinutes * 60
    setActiveDurationSeconds(nextDurationSeconds)
    setDisplayRemainingSeconds(nextDurationSeconds)
  }, [durationMinutes, challengeStatus])

  useEffect(() => {
    if (challengeStatus !== "running") return
    if (volume > threshold) {
      if (countdownAnimationFrameRef.current !== null) {
        window.cancelAnimationFrame(countdownAnimationFrameRef.current)
        countdownAnimationFrameRef.current = null
      }
      countdownDeadlineRef.current = null
      stopMonitoring()
      setChallengeStatus("failed")
      setDisplayRemainingSeconds(activeDurationSeconds)
      toast.error("检测到课堂音量超过阈值，静音挑战中断")
    }
  }, [activeDurationSeconds, challengeStatus, stopMonitoring, threshold, volume])

  useEffect(() => {
    if (challengeStatus !== "running") return

    const updateCountdown = () => {
      const deadline = countdownDeadlineRef.current
      if (deadline === null) return

      const now = Date.now()
      const nextDisplayRemainingSeconds = Math.max(0, Math.ceil((deadline - now) / 1000))
      setDisplayRemainingSeconds((current) => (current === nextDisplayRemainingSeconds ? current : nextDisplayRemainingSeconds))

      if (deadline <= now) {
        countdownAnimationFrameRef.current = null
        handleChallengeSuccess()
        return
      }

      countdownAnimationFrameRef.current = window.requestAnimationFrame(updateCountdown)
    }

    countdownAnimationFrameRef.current = window.requestAnimationFrame(updateCountdown)

    return () => {
      if (countdownAnimationFrameRef.current !== null) {
        window.cancelAnimationFrame(countdownAnimationFrameRef.current)
        countdownAnimationFrameRef.current = null
      }
    }
  }, [challengeStatus, handleChallengeSuccess])

  const handleStart = async () => {
    if (!activeClassId) {
      toast.error("请先激活一个班级")
      return
    }

    if (durationMinutes <= 0 || rewardPoints <= 0) {
      toast.error("请填写正确的挑战时长和奖励分值")
      return
    }

    const granted = await startMonitoring()
    if (!granted) {
      setChallengeStatus("blocked")
      toast.error("请先开启浏览器麦克风权限")
      return
    }

    const nextDurationSeconds = durationMinutes * 60
    resetPeak()
    countdownDeadlineRef.current = Date.now() + nextDurationSeconds * 1000
    setActiveDurationSeconds(nextDurationSeconds)
    setDisplayRemainingSeconds(nextDurationSeconds)
    setHasStarted(true)
    setChallengeStatus("running")
    setRewardCompleted(false)
    setShowRewardSelector(false)
    setSelectedRewardIds(new Set())
  }

  const handleStop = () => {
    if (countdownAnimationFrameRef.current !== null) {
      window.cancelAnimationFrame(countdownAnimationFrameRef.current)
      countdownAnimationFrameRef.current = null
    }
    countdownDeadlineRef.current = null
    stopMonitoring()
    const nextDurationSeconds = durationMinutes * 60
    setActiveDurationSeconds(nextDurationSeconds)
    setDisplayRemainingSeconds(nextDurationSeconds)
    setChallengeStatus("idle")
    setHasStarted(false)
    setShowRewardSelector(false)
    setSelectedRewardIds(new Set())
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && shouldConfirmClose) {
      setShowCloseConfirm(true)
      return
    }

    if (!nextOpen) {
      resetChallenge()
      onOpenChange(false)
      return
    }

    onOpenChange(true)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="h-[min(90vh,860px)] w-[min(98vw,1440px)] max-w-none overflow-hidden rounded-[28px] border-0 p-0 shadow-2xl">
          <div className="flex h-full min-h-0 flex-col bg-background">
            <DialogHeader className="shrink-0 border-b px-6 py-5 lg:px-8">
              <DialogTitle className="flex items-center gap-3 pr-10 text-2xl font-semibold">
                <BellOff className="h-7 w-7 text-primary" />
                静音挑战
              </DialogTitle>
              <DialogDescription className="text-base text-slate-500">
                通过实时噪音监测维持课堂安静
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto bg-[#fcfbff] px-5 py-5 lg:px-6 lg:py-6">
              <div className="flex min-h-full flex-col gap-4 pb-4">
                <div className="grid shrink-0 gap-4 lg:grid-cols-[1.08fr_0.92fr]">
                  <section className="rounded-[28px] border border-[#ebe5ff] bg-white px-5 py-5 shadow-sm">
                    <h3 className="text-xl font-semibold text-slate-800">实时音量</h3>
                    <div className="mt-4 rounded-[24px] bg-slate-50/70 px-4 py-4">
                      <div className="mx-auto flex w-full max-w-[500px] flex-col items-center text-center">
                        <div className="mb-3 flex flex-col items-center gap-2.5">
                          <p className={cn("text-6xl font-bold leading-none sm:text-7xl", currentStatus.tone)}>{volume}</p>
                          <div className={cn("rounded-full border px-4 py-1.5 text-base font-medium", currentStatus.badge)}>
                            {currentStatus.label}
                          </div>
                        </div>

                        <div className="relative h-[132px] w-full max-w-[340px]">
                          <svg className="h-full w-full" viewBox="0 0 420 170">
                            <path
                              d="M 96 150 A 132 132 0 0 1 324 150"
                              fill="none"
                              stroke="#e7edf5"
                              strokeWidth="18"
                              strokeLinecap="round"
                            />
                            {meterSegments.map((segment) => (
                              <path
                                key={segment.id}
                                d={segment.path.replaceAll("236", "150").replaceAll("120", "34")}
                                fill="none"
                                stroke={segment.color}
                                strokeWidth="18"
                                strokeLinecap="round"
                              />
                            ))}
                            <line x1="96" y1="150" x2="122" y2="150" stroke="#22c55e" strokeWidth="8" strokeLinecap="round" />
                          </svg>
                        </div>

                        <div className="mt-2 flex w-full max-w-[380px] items-center justify-between px-2 text-lg text-slate-400 sm:text-[22px]">
                          <span>0</span>
                          <span>25</span>
                          <span>50</span>
                          <span>75</span>
                          <span>100</span>
                        </div>

                        <div className="mt-4 flex w-full flex-wrap items-center justify-between gap-3">
                          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600 sm:text-base">
                            <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5">
                              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />安静
                            </div>
                            <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5">
                              <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />正常
                            </div>
                            <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5">
                              <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />吵闹
                            </div>
                          </div>

                          <div className="text-base text-slate-500 sm:text-lg">
                            峰值 <span className="font-semibold text-orange-500">{peakVolume}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </section>

                  <section className="rounded-[28px] border border-[#ebe5ff] bg-white px-5 py-5 shadow-sm">
                    <h3 className="text-xl font-semibold text-slate-800">安静奖励</h3>
                    <div className="mt-4 flex min-h-[300px] flex-col items-center justify-center rounded-[24px] bg-slate-50/60 px-5 text-center">
                      <div className="relative h-[220px] w-[220px]">
                        <svg className="h-full w-full -rotate-90" viewBox="0 0 280 280">
                          <circle cx="140" cy="140" r={ringRadius} fill="none" stroke="#edf2f7" strokeWidth="14" />
                          <circle
                            cx="140"
                            cy="140"
                            r={ringRadius}
                            fill="none"
                            stroke="url(#quietChallengeGradient)"
                            strokeLinecap="round"
                            strokeWidth="14"
                            strokeDasharray={ringLength}
                            strokeDashoffset={ringOffset}
                            className="transition-all duration-500"
                          />
                          <defs>
                            <linearGradient id="quietChallengeGradient" x1="0" x2="1" y1="0" y2="1">
                              <stop offset="0%" stopColor="hsl(var(--accent))" />
                              <stop offset="100%" stopColor="hsl(var(--primary))" />
                            </linearGradient>
                          </defs>
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <p className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">{formatTimer(displayRemainingSeconds)}</p>
                          <p className="mt-2 text-lg text-slate-300 sm:text-xl">/ {formatDuration(activeDurationSeconds)}</p>
                        </div>
                      </div>
                      <p className="mt-5 max-w-[360px] text-base leading-7 text-slate-400 sm:text-lg">{getStatusMessage(challengeStatus, permissionState)}</p>
                    </div>
                  </section>
                </div>

                <section className="shrink-0 rounded-[28px] border border-[#ebe5ff] bg-white px-4 py-4 shadow-sm">
                  <div className="grid gap-3 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.95fr)_auto] xl:items-center">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="shrink-0 text-base font-medium text-slate-700">阈值</span>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={threshold}
                        onChange={(event) => setThreshold(Number(event.target.value))}
                        className="h-2 flex-1 cursor-pointer accent-orange-500"
                      />
                      <span className="w-11 shrink-0 text-center text-xl font-semibold text-orange-500">{threshold}</span>
                    </div>
                    <p className="text-sm leading-6 text-slate-500 xl:col-span-2">
                      阈值表示允许的最大环境音量，数值越低要求越安静；静音挑战中一旦实时音量高于该阈值，就会立即判定挑战失败。
                    </p>
                    {isDurationLocked ? <p className="text-xs text-amber-500 xl:col-span-2">挑战进行中，需停止后才能修改时长。</p> : null}

                    <div className="flex flex-wrap items-center gap-3 xl:justify-end">
                      <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">
                        <span className="text-sm font-medium text-slate-700">安静奖励</span>
                        <Switch checked={rewardEnabled} onCheckedChange={setRewardEnabled} />
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="text-sm text-slate-700">连续</span>
                        <Input
                          type="number"
                          min="1"
                          max={maxDurationMinutes}
                          value={durationMinutes}
                          onChange={(event) => setDurationMinutes(Math.max(1, Math.min(maxDurationMinutes, Number(event.target.value) || 1)))}
                          disabled={isDurationLocked}
                          className="h-10 w-20 rounded-xl text-center text-base"
                        />
                        <span className="text-sm text-slate-700">分钟</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="text-sm text-slate-700">每人 +</span>
                        <Input
                          type="number"
                          min="1"
                          max={maxRewardPoints}
                          value={rewardPoints}
                          onChange={(event) => setRewardPoints(Math.max(1, Math.min(maxRewardPoints, Number(event.target.value) || 1)))}
                          className="h-10 w-20 rounded-xl text-center text-base"
                        />
                        <span className="text-sm text-slate-700">分</span>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Button
                        type="button"
                        className={cn(
                          "h-11 min-w-[156px] rounded-full px-6 text-base font-semibold shadow-md",
                          challengeStatus === "running" ? "bg-slate-800 hover:bg-slate-700" : "bg-orange-500 hover:bg-orange-400"
                        )}
                        onClick={challengeStatus === "running" ? handleStop : handleStart}
                        disabled={awardMutation.isPending}
                      >
                        {challengeStatus === "running" ? <Pause className="mr-2 h-4 w-4" /> : <Mic className="mr-2 h-4 w-4" />}
                        {challengeStatus === "running" ? "停止监测" : "开始监测"}
                      </Button>
                    </div>
                  </div>
                </section>

                {shouldShowRewardPanel ? (
                  <section className="h-[260px] shrink-0 rounded-[28px] border border-emerald-100 bg-white px-6 py-5 shadow-sm xl:h-[280px]">
                    <div className="flex h-full flex-col overflow-hidden">
                      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 text-lg font-semibold text-emerald-700">
                            <Users className="h-5 w-5" />
                            选择加分学生
                          </div>
                          <p className="mt-1 text-sm text-emerald-700/80">已选 {selectedRewardCount}/{studentCount} 人</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button type="button" variant="outline" className="rounded-full" onClick={selectAllRewardStudents}>
                            全部勾选
                          </Button>
                          <Button type="button" variant="outline" className="rounded-full" onClick={clearRewardSelection}>
                            取消全部
                          </Button>
                        </div>
                      </div>

                      <div className="mt-4 min-h-0 flex-1 overflow-y-auto rounded-[24px] border border-emerald-100 bg-emerald-50/60 p-4">
                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                          {students.map((student) => {
                            const checked = selectedRewardIds.has(student.id)
                            return (
                              <button
                                key={student.id}
                                type="button"
                                onClick={() => toggleRewardStudent(student.id)}
                                className={cn(
                                  "flex items-center justify-between rounded-2xl border px-4 py-3 text-left transition",
                                  checked
                                    ? "border-emerald-300 bg-white text-emerald-700 shadow-sm"
                                    : "border-slate-200 bg-white text-slate-600 hover:border-emerald-200"
                                )}
                              >
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-semibold">{student.name || "未命名学生"}</p>
                                  <p className="mt-1 truncate text-xs text-slate-400">{student.studentNo || "未设置学号"}</p>
                                </div>
                                <CheckCircle2 className={cn("h-5 w-5 shrink-0", checked ? "text-emerald-500" : "text-slate-300")} />
                              </button>
                            )
                          })}
                        </div>
                      </div>

                      <div className="mt-4 flex shrink-0 flex-wrap items-center justify-between gap-3">
                        <p className="text-sm text-slate-500">确认后将为选中学生各加 {rewardPoints} 分，并写入积分记录。</p>
                        <Button
                          type="button"
                          className="rounded-full bg-emerald-500 px-6 hover:bg-emerald-400"
                          onClick={handleSubmitReward}
                          disabled={awardMutation.isPending || rewardCompleted}
                        >
                          {awardMutation.isPending ? "发放中..." : rewardCompleted ? "已发放" : "确认加分"}
                        </Button>
                      </div>
                    </div>
                  </section>
                ) : null}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showCloseConfirm} onOpenChange={setShowCloseConfirm}>
        <DialogContent className="max-w-md rounded-[24px]">
          <DialogHeader>
            <DialogTitle>关闭后将停止本次静音挑战，是否继续？</DialogTitle>
            <DialogDescription>确认关闭后会停止监测并重置当前挑战进度。</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowCloseConfirm(false)}>
              取消
            </Button>
            <Button
              onClick={() => {
                resetChallenge()
                onOpenChange(false)
              }}
            >
              继续关闭
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
