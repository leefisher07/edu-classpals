"use client"

import { useEffect, useMemo, useState } from "react"
import { Clock3, Pause, Play, RotateCcw, Settings2 } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"

type ClassTimerDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const presets = [1, 3, 5, 10]
const defaultDuration = 5 * 60
const maxCustomMinutes = 180
const circleRadius = 116
const circleLength = 2 * Math.PI * circleRadius

function formatTime(seconds: number) {
  const safeSeconds = Math.max(0, seconds)
  const minutes = Math.floor(safeSeconds / 60)
  const secs = safeSeconds % 60
  return `${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
}

function formatDuration(seconds: number) {
  if (seconds % 60 === 0) return `${seconds / 60}:00`
  return formatTime(seconds)
}

export function ClassTimerDialog({ open, onOpenChange }: ClassTimerDialogProps) {
  const [durationSeconds, setDurationSeconds] = useState(defaultDuration)
  const [remainingSeconds, setRemainingSeconds] = useState(defaultDuration)
  const [isRunning, setIsRunning] = useState(false)
  const [hasStarted, setHasStarted] = useState(false)
  const [customMinutes, setCustomMinutes] = useState("")
  const [showCloseConfirm, setShowCloseConfirm] = useState(false)

  const isFinished = hasStarted && remainingSeconds <= 0
  const progress = durationSeconds > 0 ? (remainingSeconds / durationSeconds) * 100 : 0
  const strokeOffset = circleLength * (1 - progress / 100)
  const shouldConfirmClose = hasStarted && !isFinished && remainingSeconds < durationSeconds

  const primaryActionLabel = useMemo(() => {
    if (isRunning) return "暂停"
    if (isFinished) return "重新开始"
    if (hasStarted) return "继续"
    return "开始"
  }, [hasStarted, isFinished, isRunning])

  useEffect(() => {
    if (!isRunning) return

    const intervalId = window.setInterval(() => {
      setRemainingSeconds((current) => {
        if (current <= 1) {
          window.clearInterval(intervalId)
          setIsRunning(false)
          toast.success("计时结束")
          return 0
        }
        return current - 1
      })
    }, 1000)

    return () => window.clearInterval(intervalId)
  }, [isRunning])

  const applyDuration = (minutes: number) => {
    const nextDuration = minutes * 60
    setDurationSeconds(nextDuration)
    setRemainingSeconds(nextDuration)
    setIsRunning(false)
    setHasStarted(false)
  }

  const handleCustomSet = () => {
    const minutes = Number(customMinutes)

    if (!Number.isInteger(minutes) || minutes <= 0) {
      toast.error("请输入大于 0 的整数分钟")
      return
    }

    if (minutes > maxCustomMinutes) {
      toast.error(`自定义分钟不能超过 ${maxCustomMinutes} 分钟`)
      return
    }

    applyDuration(minutes)
    toast.success(`已设置为 ${minutes} 分钟`)
  }

  const handlePrimaryAction = () => {
    if (isFinished) {
      setRemainingSeconds(durationSeconds)
      setHasStarted(true)
      setIsRunning(true)
      return
    }

    if (isRunning) {
      setIsRunning(false)
      return
    }

    setHasStarted(true)
    setIsRunning(true)
  }

  const handleReset = () => {
    setRemainingSeconds(durationSeconds)
    setIsRunning(false)
    setHasStarted(false)
  }

  const resetAndClose = () => {
    setRemainingSeconds(durationSeconds)
    setIsRunning(false)
    setHasStarted(false)
    setShowCloseConfirm(false)
    onOpenChange(false)
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && shouldConfirmClose) {
      setIsRunning(false)
      setShowCloseConfirm(true)
      return
    }

    if (!nextOpen) {
      resetAndClose()
      return
    }

    onOpenChange(true)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="w-[min(92vw,980px)] max-w-none overflow-hidden rounded-[28px] border-0 p-0 shadow-2xl">
          <div className="bg-background">
            <DialogHeader className="border-b px-6 py-5 lg:px-8">
              <DialogTitle className="flex items-center gap-3 pr-10 text-2xl font-semibold">
                <Clock3 className="h-7 w-7 text-primary" />
                课堂计时器
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6 bg-[#fcfbff] px-6 py-6 lg:px-8 lg:py-8">
              <section className="flex flex-col items-center justify-center rounded-[28px] border border-[#ebe5ff] bg-white px-6 py-8 shadow-sm">
                <div className="relative h-[256px] w-[256px] sm:h-[280px] sm:w-[280px]">
                  <svg className="h-full w-full -rotate-90" viewBox="0 0 280 280">
                    <circle
                      cx="140"
                      cy="140"
                      r={circleRadius}
                      fill="none"
                      stroke="hsl(var(--primary) / 0.12)"
                      strokeWidth="14"
                    />
                    <circle
                      cx="140"
                      cy="140"
                      r={circleRadius}
                      fill="none"
                      stroke="url(#timerGradient)"
                      strokeLinecap="round"
                      strokeWidth="14"
                      strokeDasharray={circleLength}
                      strokeDashoffset={strokeOffset}
                      className="transition-all duration-500"
                    />
                    <defs>
                      <linearGradient id="timerGradient" x1="0" x2="1" y1="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--accent))" />
                        <stop offset="100%" stopColor="hsl(var(--primary))" />
                      </linearGradient>
                    </defs>
                  </svg>

                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <p className="text-base text-slate-500">{isFinished ? "计时结束" : "剩余时间"}</p>
                    <p className={cn("mt-3 text-5xl font-bold tracking-tight sm:text-6xl", isFinished ? "text-rose-500" : "text-primary")}>{formatTime(remainingSeconds)}</p>
                    <p className="mt-3 text-sm font-medium text-slate-400">{Math.round(progress)}%</p>
                    <p className="mt-2 text-sm text-slate-400">总时长：{formatDuration(durationSeconds)}</p>
                  </div>
                </div>
              </section>

              <section className="rounded-[28px] border border-[#ebe5ff] bg-white px-6 py-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-center gap-3">
                  {presets.map((minutes) => (
                    <Button
                      key={minutes}
                      type="button"
                      variant="outline"
                      className={cn(
                        "h-12 rounded-2xl border-primary/20 px-6 text-base font-semibold text-primary hover:bg-primary/5",
                        durationSeconds === minutes * 60 && "border-primary bg-primary/5"
                      )}
                      onClick={() => applyDuration(minutes)}
                    >
                      {minutes} 分钟
                    </Button>
                  ))}
                  <Input
                    value={customMinutes}
                    onChange={(event) => setCustomMinutes(event.target.value)}
                    type="number"
                    min="1"
                    max={maxCustomMinutes}
                    placeholder="自定义分钟"
                    className="h-12 w-40 rounded-2xl border-slate-200"
                  />
                  <Button type="button" variant="outline" className="h-12 rounded-2xl px-5 font-semibold" onClick={handleCustomSet}>
                    <Settings2 className="mr-2 h-4 w-4" />
                    设置
                  </Button>
                </div>

                <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                  <Button
                    type="button"
                    className="h-14 min-w-32 rounded-full bg-primary px-8 text-lg shadow-lg hover:bg-primary/90"
                    onClick={handlePrimaryAction}
                  >
                    {isRunning ? <Pause className="mr-2 h-5 w-5" /> : <Play className="mr-2 h-5 w-5" />}
                    {primaryActionLabel}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-14 min-w-32 rounded-full border-slate-200 px-8 text-lg"
                    onClick={handleReset}
                  >
                    <RotateCcw className="mr-2 h-5 w-5" />
                    重置
                  </Button>
                </div>
              </section>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showCloseConfirm} onOpenChange={setShowCloseConfirm}>
        <DialogContent className="max-w-md rounded-[24px]">
          <DialogHeader>
            <DialogTitle>关闭后计时重置，是否继续？</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">当前计时尚未结束，确认关闭后会停止并重置计时器。</p>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowCloseConfirm(false)}>
              取消
            </Button>
            <Button onClick={resetAndClose}>继续关闭</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
