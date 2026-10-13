"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { BookOpenText, CheckCircle2, Mic, Pause, Users } from "lucide-react"
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

type ReadingChallengeDialogProps = {
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

type ChallengeStatus = "idle" | "running" | "success" | "failed" | "tolerance" | "blocked"

const defaultThreshold = 40
const defaultDurationMinutes = 5
const defaultRewardPoints = 2
const defaultToleranceSeconds = 3
const maxDurationMinutes = 60
const maxRewardPoints = 100
const maxToleranceSeconds = 30
const ringRadius = 112
const ringLength = 2 * Math.PI * ringRadius
const initialRingOffset = ringLength
const meterSegments = [
  {
    id: "quiet",
    color: "#cbd5e1",
    path: "M 96 150 A 132 132 0 0 1 175 34",
  },
  {
    id: "loud",
    color: "#fb923c",
    path: "M 245 34 A 132 132 0 0 1 324 150",
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

function getReadingStatus(volume: number, threshold: number) {
  if (volume < threshold) {
    return {
      label: "太安静",
      tone: "text-slate-400",
      badge: "border-slate-200 bg-slate-50 text-slate-500",
    }
  }
  if (volume <= Math.min(100, threshold + 20)) {
    return {
      label: "正常",
      tone: "text-amber-500",
      badge: "border-amber-200 bg-amber-50 text-amber-600",
    }
  }
  return {
    label: "响亮",
    tone: "text-orange-500",
    badge: "border-orange-200 bg-orange-50 text-orange-500",
  }
}

function getPermissionMessage(permissionState: ReturnType<typeof useAudioMonitor>["permissionState"]) {
  if (permissionState === "unsupported") return "当前浏览器或设备不支持麦克风监测，请更换浏览器后重试。"
  if (permissionState === "denied") return "麦克风权限被拒绝，请在浏览器地址栏或系统设置中重新开启后再试。"
  if (permissionState === "error") return "麦克风启动失败，请检查设备输入源后重试。"
  if (permissionState === "requesting") return "正在请求麦克风权限，请在浏览器弹窗中允许访问。"
  if (permissionState === "granted") return "监测已就绪，点击开始监测即可进入早读挑战。"
  return "开始监测时将请求浏览器麦克风权限，未授权前无法开始挑战。"
}

function getStatusMessage(
  status: ChallengeStatus,
  permissionState: ReturnType<typeof useAudioMonitor>["permissionState"],
  toleranceRemainingMs: number
) {
  if (permissionState !== "granted") return getPermissionMessage(permissionState)
  if (status === "success") return "早读挑战成功，课堂朗读参与度达标。"
  if (status === "failed") return "低于阈值超过宽容时间，本次早读挑战已中断。"
  if (status === "tolerance") return `宽容中 ${(toleranceRemainingMs / 1000).toFixed(1)} 秒`
  if (status === "running") return "早读挑战进行中，请保持声音达到目标阈值。"
  if (status === "blocked") return "请先完成麦克风授权后再开始监测。"
  return "点击开始监测后进入挑战，持续朗读达到目标时长即可成功。"
}

export function ReadingChallengeDialog({ open, onOpenChange }: ReadingChallengeDialogProps) {
  const queryClient = useQueryClient()
  const { activeClassId } = useActiveClass()
  const { permissionState, volume, peakVolume, startMonitoring, stopMonitoring, resetPeak } = useAudioMonitor()

  const [threshold, setThreshold] = useState(defaultThreshold)
  const [rewardEnabled, setRewardEnabled] = useState(true)
  const [durationMinutes, setDurationMinutes] = useState(defaultDurationMinutes)
  const [rewardPoints, setRewardPoints] = useState(defaultRewardPoints)
  const [toleranceSeconds, setToleranceSeconds] = useState(defaultToleranceSeconds)
  const [toleranceRemainingMs, setToleranceRemainingMs] = useState(defaultToleranceSeconds * 1000)
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
    queryKey: ["students", activeClassId, "reading-challenge"],
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
        reason: "早读挑战成功",
      }),
    onSuccess: () => {
      toast.success("早读挑战奖励已发放")
      setRewardCompleted(true)
      setShowRewardSelector(false)
      queryClient.invalidateQueries({ queryKey: ["students"] })
      queryClient.invalidateQueries({ queryKey: ["groups"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard-overview", activeClassId] })
      queryClient.invalidateQueries({ queryKey: ["dashboard-ranking", activeClassId] })
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || error?.message || "早读挑战奖励发放失败")
    },
  })

  const hasCountdownStarted = hasStarted || challengeStatus === "success" || challengeStatus === "failed" || challengeStatus === "tolerance"
  const progress = hasCountdownStarted && activeDurationSeconds > 0 ? displayRemainingSeconds / activeDurationSeconds : 0
  const ringOffset = hasCountdownStarted ? ringLength * (1 - progress) : initialRingOffset
  const currentStatus = getReadingStatus(volume, threshold)
  const shouldConfirmClose = hasStarted && (challengeStatus === "running" || challengeStatus === "tolerance")
  const isTimingLocked = challengeStatus === "running" || challengeStatus === "tolerance"

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
    setToleranceRemainingMs(toleranceSeconds * 1000)
    setChallengeStatus("idle")
    setHasStarted(false)
    setRewardCompleted(false)
    setShowRewardSelector(false)
    setSelectedRewardIds(new Set())
    setShowCloseConfirm(false)
  }, [durationMinutes, stopMonitoring, toleranceSeconds])

  const handleChallengeSuccess = useCallback(() => {
    if (countdownAnimationFrameRef.current !== null) {
      window.cancelAnimationFrame(countdownAnimationFrameRef.current)
      countdownAnimationFrameRef.current = null
    }
    countdownDeadlineRef.current = null
    stopMonitoring()
    setChallengeStatus("success")
    setDisplayRemainingSeconds(0)
    setToleranceRemainingMs(toleranceSeconds * 1000)

    if (!rewardEnabled || rewardCompleted) {
      setShowRewardSelector(false)
      toast.success("早读挑战成功")
      return
    }

    if (studentCount === 0) {
      setShowRewardSelector(false)
      toast.success("早读挑战成功，当前班级暂无学生可奖励")
      setRewardCompleted(true)
      return
    }

    setSelectedRewardIds(new Set(students.map((student) => student.id)))
    setShowRewardSelector(true)
    toast.success("早读挑战成功，请选择要加分的学生")
  }, [rewardCompleted, rewardEnabled, stopMonitoring, studentCount, students, toleranceSeconds])

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
      setToleranceSeconds(defaultToleranceSeconds)
      setToleranceRemainingMs(defaultToleranceSeconds * 1000)
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
    if (challengeStatus === "running" || challengeStatus === "tolerance") return
    const nextDurationSeconds = durationMinutes * 60
    setActiveDurationSeconds(nextDurationSeconds)
    setDisplayRemainingSeconds(nextDurationSeconds)
    setToleranceRemainingMs(toleranceSeconds * 1000)
  }, [durationMinutes, challengeStatus, toleranceSeconds])

  useEffect(() => {
    if (challengeStatus !== "running" && challengeStatus !== "tolerance") return

    if (volume >= threshold) {
      if (challengeStatus === "tolerance") {
        setChallengeStatus("running")
      }
      setToleranceRemainingMs(toleranceSeconds * 1000)
      return
    }

    if (challengeStatus !== "tolerance") {
      setChallengeStatus("tolerance")
    }
  }, [challengeStatus, threshold, toleranceSeconds, volume])

  useEffect(() => {
    if (challengeStatus !== "tolerance") return

    const intervalId = window.setInterval(() => {
      setToleranceRemainingMs((current) => {
        if (current <= 100) {
          window.clearInterval(intervalId)
          if (countdownAnimationFrameRef.current !== null) {
            window.cancelAnimationFrame(countdownAnimationFrameRef.current)
            countdownAnimationFrameRef.current = null
          }
          countdownDeadlineRef.current = null
          stopMonitoring()
          setChallengeStatus("failed")
          setDisplayRemainingSeconds(activeDurationSeconds)
          toast.error("早读声音低于阈值过久，挑战中断")
          return 0
        }
        return current - 100
      })
    }, 100)

    return () => window.clearInterval(intervalId)
  }, [activeDurationSeconds, challengeStatus, stopMonitoring])

  useEffect(() => {
    if (challengeStatus !== "running" && challengeStatus !== "tolerance") return

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

    if (durationMinutes <= 0 || rewardPoints <= 0 || toleranceSeconds <= 0) {
      toast.error("请填写正确的挑战参数")
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
    setToleranceRemainingMs(toleranceSeconds * 1000)
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
    setToleranceRemainingMs(toleranceSeconds * 1000)
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
                <BookOpenText className="h-7 w-7 text-primary" />
                早读挑战
              </DialogTitle>
              <DialogDescription className="text-base text-slate-500">
                通过实时音量监测激励朗读参与度
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
                                d={segment.path}
                                fill="none"
                                stroke={segment.color}
                                strokeWidth="18"
                                strokeLinecap="round"
                              />
                            ))}
                            <line x1="96" y1="150" x2="122" y2="150" stroke="#94a3b8" strokeWidth="8" strokeLinecap="round" />
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
                              <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />太安静
                            </div>
                            <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5">
                              <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />正常
                            </div>
                            <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5">
                              <span className="h-2.5 w-2.5 rounded-full bg-orange-400" />响亮
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
                    <h3 className="text-xl font-semibold text-slate-800">早读奖励</h3>
                    <div className="mt-4 flex min-h-[300px] flex-col items-center justify-center rounded-[24px] bg-slate-50/60 px-5 text-center">
                      <div className="relative h-[220px] w-[220px]">
                        <svg className="h-full w-full -rotate-90" viewBox="0 0 280 280">
                          <circle cx="140" cy="140" r={ringRadius} fill="none" stroke="#edf2f7" strokeWidth="14" />
                          <circle
                            cx="140"
                            cy="140"
                            r={ringRadius}
                            fill="none"
                            stroke="url(#readingChallengeGradient)"
                            strokeLinecap="round"
                            strokeWidth="14"
                            strokeDasharray={ringLength}
                            strokeDashoffset={ringOffset}
                            className="transition-all duration-500"
                          />
                          <defs>
                            <linearGradient id="readingChallengeGradient" x1="0" x2="1" y1="0" y2="1">
                              <stop offset="0%" stopColor="#f59e0b" />
                              <stop offset="100%" stopColor="hsl(var(--primary))" />
                            </linearGradient>
                          </defs>
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <p className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">{formatTimer(displayRemainingSeconds)}</p>
                          <p className="mt-2 text-lg text-slate-300 sm:text-xl">/ {formatDuration(activeDurationSeconds)}</p>
                        </div>
                      </div>
                      <p className="mt-5 max-w-[360px] text-base leading-7 text-slate-400 sm:text-lg">{getStatusMessage(challengeStatus, permissionState, toleranceRemainingMs)}</p>
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
                      阈值表示朗读时需要达到的最低音量，数值越高要求越响亮；早读挑战中音量低于该阈值会进入宽容计时，超过宽容秒数仍未恢复则挑战失败。
                    </p>
                    {isTimingLocked ? <p className="text-xs text-amber-500 xl:col-span-2">挑战进行中，需停止后才能修改时长和宽容秒数。</p> : null}

                    <div className="flex flex-wrap items-center gap-3 xl:justify-end">
                      <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">
                        <span className="text-sm font-medium text-slate-700">早读奖励</span>
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
                          disabled={isTimingLocked}
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

                      <div className="flex items-center gap-1.5">
                        <span className="text-sm text-slate-700">宽容</span>
                        <Input
                          type="number"
                          min="1"
                          max={maxToleranceSeconds}
                          value={toleranceSeconds}
                          onChange={(event) => setToleranceSeconds(Math.max(1, Math.min(maxToleranceSeconds, Number(event.target.value) || 1)))}
                          disabled={isTimingLocked}
                          className="h-10 w-20 rounded-xl text-center text-base"
                        />
                        <span className="text-sm text-slate-700">秒</span>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Button
                        type="button"
                        className={cn(
                          "h-11 min-w-[156px] rounded-full px-6 text-base font-semibold shadow-md",
                          challengeStatus === "running" || challengeStatus === "tolerance"
                            ? "bg-slate-800 hover:bg-slate-700"
                            : "bg-orange-500 hover:bg-orange-400"
                        )}
                        onClick={challengeStatus === "running" || challengeStatus === "tolerance" ? handleStop : handleStart}
                        disabled={awardMutation.isPending}
                      >
                        {challengeStatus === "running" || challengeStatus === "tolerance" ? <Pause className="mr-2 h-4 w-4" /> : <Mic className="mr-2 h-4 w-4" />}
                        {challengeStatus === "running" || challengeStatus === "tolerance" ? "停止监测" : "开始监测"}
                      </Button>
                    </div>
                  </div>
                </section>

                {shouldShowRewardPanel ? (
                  <section className="h-[260px] shrink-0 rounded-[28px] border border-amber-100 bg-white px-6 py-5 shadow-sm xl:h-[280px]">
                    <div className="flex h-full flex-col overflow-hidden">
                      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 text-lg font-semibold text-amber-700">
                            <Users className="h-5 w-5" />
                            选择加分学生
                          </div>
                          <p className="mt-1 text-sm text-amber-700/80">已选 {selectedRewardCount}/{studentCount} 人</p>
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

                      <div className="mt-4 min-h-0 flex-1 overflow-y-auto rounded-[24px] border border-amber-100 bg-amber-50/60 p-4">
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
                                    ? "border-amber-300 bg-white text-amber-700 shadow-sm"
                                    : "border-slate-200 bg-white text-slate-600 hover:border-amber-200"
                                )}
                              >
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-semibold">{student.name || "未命名学生"}</p>
                                  <p className="mt-1 truncate text-xs text-slate-400">{student.studentNo || "未设置学号"}</p>
                                </div>
                                <CheckCircle2 className={cn("h-5 w-5 shrink-0", checked ? "text-amber-500" : "text-slate-300")} />
                              </button>
                            )
                          })}
                        </div>
                      </div>

                      <div className="mt-4 flex shrink-0 flex-wrap items-center justify-between gap-3">
                        <p className="text-sm text-slate-500">确认后将为选中学生各加 {rewardPoints} 分，并写入积分记录。</p>
                        <Button
                          type="button"
                          className="rounded-full bg-amber-500 px-6 hover:bg-amber-400"
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
            <DialogTitle>关闭后将停止本次早读挑战，是否继续？</DialogTitle>
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
