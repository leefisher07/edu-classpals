"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { 
  Shuffle, 
  Play, 
  Pause, 
  RotateCcw, 
  Timer,
  Volume2,
  VolumeX,
  Plus,
  Minus,
  X,
  Mic,
  BookOpen,
  Settings,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { mockStudents, getSurname } from "@/lib/mock-data"

export default function ToolsPage() {
  // Dialog states
  const [randomPickOpen, setRandomPickOpen] = useState(false)
  const [timerOpen, setTimerOpen] = useState(false)
  const [morningReadingOpen, setMorningReadingOpen] = useState(false)
  const [silenceChallengeOpen, setSilenceChallengeOpen] = useState(false)
  const [soundSettingsOpen, setSoundSettingsOpen] = useState(false)

  return (
    <div className="flex-1 p-6 overflow-auto">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">辅助工具</h1>
          <p className="text-muted-foreground mt-1">课堂实用小工具集合</p>
        </div>

        {/* Tool Cards Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <ToolCard
            icon={<Shuffle className="w-8 h-8" />}
            title="随机点名"
            description="气泡可视化随机抽取"
            color="bg-purple-500"
            onClick={() => setRandomPickOpen(true)}
          />
          <ToolCard
            icon={<Timer className="w-8 h-8" />}
            title="课堂计时器"
            description="倒计时/正计时"
            color="bg-violet-500"
            onClick={() => setTimerOpen(true)}
          />
          <ToolCard
            icon={<BookOpen className="w-8 h-8" />}
            title="早读挑战"
            description="音量监测激励朗读"
            color="bg-orange-500"
            onClick={() => setMorningReadingOpen(true)}
          />
          <ToolCard
            icon={<VolumeX className="w-8 h-8" />}
            title="静音挑战"
            description="噪音监测维持安静"
            color="bg-green-500"
            onClick={() => setSilenceChallengeOpen(true)}
          />
          <ToolCard
            icon={<Volume2 className="w-8 h-8" />}
            title="音效设置"
            description="加减分提示音"
            color="bg-blue-500"
            onClick={() => setSoundSettingsOpen(true)}
          />
        </div>

        {/* Dialogs */}
        <RandomPickDialog open={randomPickOpen} onOpenChange={setRandomPickOpen} />
        <TimerDialog open={timerOpen} onOpenChange={setTimerOpen} />
        <MorningReadingDialog open={morningReadingOpen} onOpenChange={setMorningReadingOpen} />
        <SilenceChallengeDialog open={silenceChallengeOpen} onOpenChange={setSilenceChallengeOpen} />
        <SoundSettingsDialog open={soundSettingsOpen} onOpenChange={setSoundSettingsOpen} />
      </div>
    </div>
  )
}

// Tool Card Component
function ToolCard({
  icon,
  title,
  description,
  color,
  onClick,
}: {
  icon: React.ReactNode
  title: string
  description: string
  color: string
  onClick: () => void
}) {
  return (
    <Card 
      className="cursor-pointer hover:shadow-lg transition-shadow"
      onClick={onClick}
    >
      <CardContent className="p-6 flex flex-col items-center text-center">
        <div className={cn("w-16 h-16 rounded-full flex items-center justify-center text-white mb-4", color)}>
          {icon}
        </div>
        <h3 className="font-semibold mb-1">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  )
}

// Random Pick Dialog with Bubble Visualization
function RandomPickDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [dedupeMode, setDedupeMode] = useState(false)
  const [pickCount, setPickCount] = useState(1)
  const [isSpinning, setIsSpinning] = useState(false)
  const [selectedStudents, setSelectedStudents] = useState<typeof mockStudents>([])
  const [pickedHistory, setPickedHistory] = useState<string[]>([])
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>()
  const bubblesRef = useRef<Bubble[]>([])

  interface Bubble {
    x: number
    y: number
    radius: number
    vx: number
    vy: number
    name: string
    surname: string
    color: string
    selected: boolean
  }

  const availableStudents = dedupeMode
    ? mockStudents.filter(s => !pickedHistory.includes(s.id))
    : mockStudents

  // Initialize bubbles
  const initBubbles = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const centerX = canvas.width / 2
    const centerY = canvas.height / 2

    bubblesRef.current = availableStudents.map((student, i) => {
      const angle = (i / availableStudents.length) * Math.PI * 2
      const distance = 80 + Math.random() * 100
      return {
        x: centerX + Math.cos(angle) * distance,
        y: centerY + Math.sin(angle) * distance,
        radius: 20 + Math.random() * 15,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        name: student.name,
        surname: getSurname(student.name),
        color: getColorFromAvatarColor(student.avatarColor),
        selected: false,
      }
    })
  }, [availableStudents])

  const getColorFromAvatarColor = (avatarColor: string) => {
    const colorMap: Record<string, string> = {
      "bg-red-100 text-red-600": "#ef4444",
      "bg-blue-100 text-blue-600": "#3b82f6",
      "bg-green-100 text-green-600": "#22c55e",
      "bg-purple-100 text-purple-600": "#a855f7",
      "bg-orange-100 text-orange-600": "#f97316",
      "bg-pink-100 text-pink-600": "#ec4899",
      "bg-yellow-100 text-yellow-600": "#eab308",
      "bg-cyan-100 text-cyan-600": "#06b6d4",
    }
    return colorMap[avatarColor] || "#6366f1"
  }

  // Animation loop
  const animate = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    const centerX = canvas.width / 2
    const centerY = canvas.height / 2

    bubblesRef.current.forEach((bubble) => {
      // Move towards center slightly
      const dx = centerX - bubble.x
      const dy = centerY - bubble.y
      bubble.vx += dx * 0.0005
      bubble.vy += dy * 0.0005

      // Apply velocity
      bubble.x += bubble.vx
      bubble.y += bubble.vy

      // Damping
      bubble.vx *= 0.99
      bubble.vy *= 0.99

      // Bounce off walls
      if (bubble.x - bubble.radius < 0 || bubble.x + bubble.radius > canvas.width) {
        bubble.vx *= -0.8
        bubble.x = Math.max(bubble.radius, Math.min(canvas.width - bubble.radius, bubble.x))
      }
      if (bubble.y - bubble.radius < 0 || bubble.y + bubble.radius > canvas.height) {
        bubble.vy *= -0.8
        bubble.y = Math.max(bubble.radius, Math.min(canvas.height - bubble.radius, bubble.y))
      }

      // Draw bubble
      ctx.beginPath()
      ctx.arc(bubble.x, bubble.y, bubble.radius, 0, Math.PI * 2)
      ctx.fillStyle = bubble.selected ? "#a855f7" : bubble.color + "20"
      ctx.fill()
      ctx.strokeStyle = bubble.selected ? "#a855f7" : bubble.color
      ctx.lineWidth = bubble.selected ? 3 : 1
      ctx.stroke()

      // Draw text
      ctx.fillStyle = bubble.selected ? "#ffffff" : bubble.color
      ctx.font = `${bubble.selected ? "bold " : ""}${Math.max(10, bubble.radius * 0.6)}px sans-serif`
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"
      ctx.fillText(bubble.surname, bubble.x, bubble.y)

      // Draw full name below if space allows
      if (bubble.radius > 25) {
        ctx.font = `${Math.max(8, bubble.radius * 0.3)}px sans-serif`
        ctx.fillText(bubble.name.slice(1) || "", bubble.x, bubble.y + bubble.radius * 0.5)
      }
    })

    animationRef.current = requestAnimationFrame(animate)
  }, [])

  useEffect(() => {
    if (open) {
      initBubbles()
      animate()
    }
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [open, initBubbles, animate])

  const handlePick = () => {
    if (availableStudents.length === 0) return

    setIsSpinning(true)
    setSelectedStudents([])

    // Reset all bubbles
    bubblesRef.current.forEach(b => b.selected = false)

    // Spinning animation
    let spinCount = 0
    const totalSpins = 30
    const interval = setInterval(() => {
      const randomIndex = Math.floor(Math.random() * bubblesRef.current.length)
      bubblesRef.current.forEach((b, i) => b.selected = i === randomIndex)
      spinCount++

      if (spinCount >= totalSpins) {
        clearInterval(interval)
        
        // Final selection
        const shuffled = [...availableStudents].sort(() => Math.random() - 0.5)
        const picked = shuffled.slice(0, Math.min(pickCount, shuffled.length))
        
        setSelectedStudents(picked)
        
        // Highlight selected bubbles
        const pickedNames = picked.map(p => p.name)
        bubblesRef.current.forEach(b => {
          b.selected = pickedNames.includes(b.name)
        })

        if (dedupeMode) {
          setPickedHistory(prev => [...prev, ...picked.map(p => p.id)])
        }
        
        setIsSpinning(false)
      }
    }, 80)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shuffle className="w-5 h-5 text-purple-500" />
            随机点名
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Controls */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">随机点名</p>
                  <p className="text-sm text-muted-foreground">
                    宠物头像 | {dedupeMode ? "不可重复抽取" : "可重复抽取"}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={dedupeMode}
                      onCheckedChange={setDedupeMode}
                    />
                    <Label className="text-sm">去重模式: {dedupeMode ? "开启" : "关闭"}</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">抽取</span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setPickCount(c => Math.max(1, c - 1))}
                    >
                      <Minus className="w-3 h-3" />
                    </Button>
                    <span className="text-orange-500 font-bold">{pickCount}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setPickCount(c => Math.min(5, c + 1))}
                    >
                      <Plus className="w-3 h-3" />
                    </Button>
                    <span className="text-sm">人</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Canvas Area */}
          <Card>
            <CardContent className="p-4">
              <canvas
                ref={canvasRef}
                width={600}
                height={300}
                className="w-full rounded-lg bg-muted/30"
              />
            </CardContent>
          </Card>

          {/* Selected Display */}
          {selectedStudents.length > 0 && (
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <p className="text-lg font-bold text-purple-600">
                抽中: {selectedStudents.map(s => s.name).join(", ")}
              </p>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              当前模式: <span className="text-purple-500">{dedupeMode ? "不可重复抽取" : "可重复抽取"}</span>
            </p>
            <Button
              onClick={handlePick}
              disabled={isSpinning || availableStudents.length === 0}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            >
              <Shuffle className="w-4 h-4 mr-2" />
              {isSpinning ? "抽取中..." : "一键抽取"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Timer Dialog with Circular Progress
function TimerDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [totalSeconds, setTotalSeconds] = useState(300) // 5 minutes
  const [remainingSeconds, setRemainingSeconds] = useState(300)
  const [isRunning, setIsRunning] = useState(false)
  const [customMinutes, setCustomMinutes] = useState("")
  const intervalRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    if (isRunning && remainingSeconds > 0) {
      intervalRef.current = setInterval(() => {
        setRemainingSeconds(prev => {
          if (prev <= 1) {
            setIsRunning(false)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isRunning, remainingSeconds])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const setTime = (minutes: number) => {
    const seconds = minutes * 60
    setTotalSeconds(seconds)
    setRemainingSeconds(seconds)
    setIsRunning(false)
  }

  const handleReset = () => {
    setRemainingSeconds(totalSeconds)
    setIsRunning(false)
  }

  const progress = totalSeconds > 0 ? (remainingSeconds / totalSeconds) * 100 : 0
  const circumference = 2 * Math.PI * 120

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Timer className="w-5 h-5 text-violet-500" />
            课堂计时器
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center py-8">
          {/* Circular Timer */}
          <div className="relative w-64 h-64">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="128"
                cy="128"
                r="120"
                fill="none"
                stroke="#e5e7eb"
                strokeWidth="8"
              />
              <circle
                cx="128"
                cy="128"
                r="120"
                fill="none"
                stroke="url(#gradient)"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={circumference * (1 - progress / 100)}
                className="transition-all duration-1000"
              />
              <defs>
                <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#8b5cf6" />
                  <stop offset="100%" stopColor="#a855f7" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-sm text-muted-foreground">剩余时间</span>
              <span className="text-5xl font-bold text-violet-600">{formatTime(remainingSeconds)}</span>
              <span className="text-sm text-muted-foreground">{Math.round(progress)}%</span>
              <span className="text-xs text-muted-foreground">总时长: {formatTime(totalSeconds)}</span>
            </div>
          </div>

          {/* Quick Time Buttons */}
          <div className="flex items-center gap-2 mt-6">
            {[1, 3, 5, 10].map((min) => (
              <Button
                key={min}
                variant="outline"
                onClick={() => setTime(min)}
                disabled={isRunning}
              >
                {min} 分钟
              </Button>
            ))}
            <Input
              type="number"
              placeholder="自定义分钟"
              value={customMinutes}
              onChange={(e) => setCustomMinutes(e.target.value)}
              className="w-28"
              disabled={isRunning}
            />
            <Button
              variant="outline"
              onClick={() => {
                const mins = parseInt(customMinutes)
                if (mins > 0) setTime(mins)
              }}
              disabled={isRunning || !customMinutes}
            >
              设置
            </Button>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-4 mt-6">
            <Button
              onClick={() => setIsRunning(!isRunning)}
              className="gap-2 bg-orange-500 hover:bg-orange-600"
              disabled={remainingSeconds === 0}
            >
              {isRunning ? (
                <>
                  <Pause className="w-4 h-4" />
                  暂停
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  开始
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={handleReset}
              className="gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              重置
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Morning Reading Challenge Dialog
function MorningReadingDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [threshold, setThreshold] = useState(40)
  const [rewardEnabled, setRewardEnabled] = useState(true)
  const [duration, setDuration] = useState(5)
  const [pointsPerPerson, setPointsPerPerson] = useState(2)
  const [tolerance, setTolerance] = useState(3)
  const [currentVolume, setCurrentVolume] = useState(0)
  const [peakVolume, setPeakVolume] = useState(0)
  const [isMonitoring, setIsMonitoring] = useState(false)
  const [rewardTime, setRewardTime] = useState(0)
  const [totalRewardTime, setTotalRewardTime] = useState(0)
  const audioContextRef = useRef<AudioContext>()
  const analyserRef = useRef<AnalyserNode>()
  const streamRef = useRef<MediaStream>()
  const animationRef = useRef<number>()
  const intervalRef = useRef<NodeJS.Timeout>()

  const getVolumeStatus = (volume: number) => {
    if (volume < 25) return { label: "太安静", color: "text-gray-500" }
    if (volume < 50) return { label: "正常", color: "text-yellow-500" }
    return { label: "响亮", color: "text-orange-500" }
  }

  const status = getVolumeStatus(currentVolume)

  const startMonitoring = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      audioContextRef.current = new AudioContext()
      analyserRef.current = audioContextRef.current.createAnalyser()
      const source = audioContextRef.current.createMediaStreamSource(stream)
      source.connect(analyserRef.current)

      analyserRef.current.fftSize = 256
      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount)

      const analyze = () => {
        if (!analyserRef.current) return
        
        analyserRef.current.getByteFrequencyData(dataArray)
        const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length
        const normalizedVolume = Math.min(100, (average / 128) * 100)
        
        setCurrentVolume(normalizedVolume)
        setPeakVolume(prev => Math.max(prev, normalizedVolume))

        animationRef.current = requestAnimationFrame(analyze)
      }

      analyze()
      setIsMonitoring(true)
      setTotalRewardTime(duration * 60)

      // Reward timer
      intervalRef.current = setInterval(() => {
        setRewardTime(prev => {
          if (prev >= duration * 60) {
            stopMonitoring()
            return prev
          }
          return prev + 1
        })
      }, 1000)

    } catch {
      alert("无法访问麦克风，请检查权限设置")
    }
  }

  const stopMonitoring = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
    }
    if (audioContextRef.current) {
      audioContextRef.current.close()
    }
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }
    setIsMonitoring(false)
  }

  useEffect(() => {
    return () => {
      stopMonitoring()
    }
  }, [])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) stopMonitoring(); onOpenChange(o) }}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-orange-500" />
            早读挑战
          </DialogTitle>
          <p className="text-sm text-muted-foreground">通过实时音量监测激励朗读参与度</p>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-6">
          {/* Volume Meter */}
          <Card>
            <CardContent className="p-6">
              <h3 className="font-medium mb-4">实时音量</h3>
              <div className="relative h-48">
                {/* Gauge */}
                <svg viewBox="0 0 200 120" className="w-full h-full">
                  {/* Background arc */}
                  <path
                    d="M 20 100 A 80 80 0 0 1 180 100"
                    fill="none"
                    stroke="#e5e7eb"
                    strokeWidth="12"
                    strokeLinecap="round"
                  />
                  {/* Colored sections */}
                  <path
                    d="M 20 100 A 80 80 0 0 1 60 40"
                    fill="none"
                    stroke="#9ca3af"
                    strokeWidth="12"
                    strokeLinecap="round"
                  />
                  <path
                    d="M 60 40 A 80 80 0 0 1 140 40"
                    fill="none"
                    stroke="#f97316"
                    strokeWidth="12"
                    strokeLinecap="round"
                  />
                  <path
                    d="M 140 40 A 80 80 0 0 1 180 100"
                    fill="none"
                    stroke="#ef4444"
                    strokeWidth="12"
                    strokeLinecap="round"
                  />
                  {/* Needle */}
                  <line
                    x1="100"
                    y1="100"
                    x2={100 + 60 * Math.cos((Math.PI * (180 - currentVolume * 1.8)) / 180)}
                    y2={100 - 60 * Math.sin((Math.PI * (180 - currentVolume * 1.8)) / 180)}
                    stroke="#1f2937"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                  <circle cx="100" cy="100" r="6" fill="#1f2937" />
                </svg>
                {/* Value display */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pt-8">
                  <span className="text-4xl font-bold text-orange-500">{Math.round(currentVolume)}</span>
                  <span className={cn("text-sm", status.color)}>{status.label}</span>
                </div>
              </div>
              {/* Scale */}
              <div className="flex justify-between px-4 text-xs text-muted-foreground">
                <span>0</span>
                <span>25</span>
                <span>50</span>
                <span>75</span>
                <span>100</span>
              </div>
              {/* Legend */}
              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center gap-4 text-sm">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-400" /> 太安静</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500" /> 正常</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500" /> 响亮</span>
                </div>
                <span className="text-sm">峰值 <span className="text-orange-500">{Math.round(peakVolume)}</span></span>
              </div>
            </CardContent>
          </Card>

          {/* Reward Timer */}
          <Card>
            <CardContent className="p-6">
              <h3 className="font-medium mb-4">早读奖励</h3>
              <div className="flex flex-col items-center justify-center h-48">
                <div className="relative w-40 h-40">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="80" cy="80" r="70" fill="none" stroke="#e5e7eb" strokeWidth="6" />
                    <circle
                      cx="80"
                      cy="80"
                      r="70"
                      fill="none"
                      stroke="#f97316"
                      strokeWidth="6"
                      strokeLinecap="round"
                      strokeDasharray={2 * Math.PI * 70}
                      strokeDashoffset={2 * Math.PI * 70 * (1 - (totalRewardTime > 0 ? rewardTime / totalRewardTime : 0))}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-4xl font-bold">{formatTime(rewardTime)}</span>
                    <span className="text-sm text-muted-foreground">/ {formatTime(totalRewardTime)}</span>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mt-4">
                  {isMonitoring ? "正在监测中..." : "点击开始监测后进入挑战"}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2">
            <span className="text-sm">阈值</span>
            <div className="w-32">
              <Slider
                value={[threshold]}
                onValueChange={([v]) => setThreshold(v)}
                max={100}
                step={1}
                disabled={isMonitoring}
              />
            </div>
            <span className="text-orange-500 font-bold">{threshold}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm">早读奖励</span>
            <Switch checked={rewardEnabled} onCheckedChange={setRewardEnabled} disabled={isMonitoring} />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm">连续</span>
            <Input type="number" value={duration} onChange={(e) => setDuration(parseInt(e.target.value) || 5)} className="w-16" disabled={isMonitoring} />
            <span className="text-sm">分钟 每人+</span>
            <Input type="number" value={pointsPerPerson} onChange={(e) => setPointsPerPerson(parseInt(e.target.value) || 2)} className="w-16" disabled={isMonitoring} />
            <span className="text-sm">分 宽容</span>
            <Input type="number" value={tolerance} onChange={(e) => setTolerance(parseInt(e.target.value) || 3)} className="w-16" disabled={isMonitoring} />
            <span className="text-sm">秒</span>
          </div>
          <Button
            onClick={isMonitoring ? stopMonitoring : startMonitoring}
            className="ml-auto bg-orange-500 hover:bg-orange-600"
          >
            <Mic className="w-4 h-4 mr-2" />
            {isMonitoring ? "停止监测" : "开始监测"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Silence Challenge Dialog
function SilenceChallengeDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [threshold, setThreshold] = useState(50)
  const [rewardEnabled, setRewardEnabled] = useState(false)
  const [duration, setDuration] = useState(3)
  const [pointsPerPerson, setPointsPerPerson] = useState(1)
  const [currentVolume, setCurrentVolume] = useState(0)
  const [peakVolume, setPeakVolume] = useState(0)
  const [isMonitoring, setIsMonitoring] = useState(false)
  const [rewardTime, setRewardTime] = useState(0)
  const [totalRewardTime, setTotalRewardTime] = useState(0)
  const audioContextRef = useRef<AudioContext>()
  const analyserRef = useRef<AnalyserNode>()
  const streamRef = useRef<MediaStream>()
  const animationRef = useRef<number>()
  const intervalRef = useRef<NodeJS.Timeout>()

  const getVolumeStatus = (volume: number) => {
    if (volume < 30) return { label: "安静", color: "text-green-500" }
    if (volume < 60) return { label: "正常", color: "text-yellow-500" }
    return { label: "吵闹", color: "text-red-500" }
  }

  const status = getVolumeStatus(currentVolume)

  const startMonitoring = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      audioContextRef.current = new AudioContext()
      analyserRef.current = audioContextRef.current.createAnalyser()
      const source = audioContextRef.current.createMediaStreamSource(stream)
      source.connect(analyserRef.current)

      analyserRef.current.fftSize = 256
      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount)

      const analyze = () => {
        if (!analyserRef.current) return
        
        analyserRef.current.getByteFrequencyData(dataArray)
        const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length
        const normalizedVolume = Math.min(100, (average / 128) * 100)
        
        setCurrentVolume(normalizedVolume)
        setPeakVolume(prev => Math.max(prev, normalizedVolume))

        animationRef.current = requestAnimationFrame(analyze)
      }

      analyze()
      setIsMonitoring(true)
      setTotalRewardTime(duration * 60)

      intervalRef.current = setInterval(() => {
        setRewardTime(prev => {
          if (prev >= duration * 60) {
            stopMonitoring()
            return prev
          }
          return prev + 1
        })
      }, 1000)

    } catch {
      alert("无法访问麦克风，请检查权限设置")
    }
  }

  const stopMonitoring = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
    }
    if (audioContextRef.current) {
      audioContextRef.current.close()
    }
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }
    setIsMonitoring(false)
  }

  useEffect(() => {
    return () => {
      stopMonitoring()
    }
  }, [])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) stopMonitoring(); onOpenChange(o) }}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <VolumeX className="w-5 h-5 text-green-500" />
            静音挑战
          </DialogTitle>
          <p className="text-sm text-muted-foreground">通过实时噪音监测维持课堂安静</p>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-6">
          {/* Volume Meter */}
          <Card>
            <CardContent className="p-6">
              <h3 className="font-medium mb-4">实时音量</h3>
              <div className="relative h-48">
                <svg viewBox="0 0 200 120" className="w-full h-full">
                  <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="#e5e7eb" strokeWidth="12" strokeLinecap="round" />
                  <path d="M 20 100 A 80 80 0 0 1 60 40" fill="none" stroke="#22c55e" strokeWidth="12" strokeLinecap="round" />
                  <path d="M 60 40 A 80 80 0 0 1 140 40" fill="none" stroke="#eab308" strokeWidth="12" strokeLinecap="round" />
                  <path d="M 140 40 A 80 80 0 0 1 180 100" fill="none" stroke="#ef4444" strokeWidth="12" strokeLinecap="round" />
                  <line
                    x1="100"
                    y1="100"
                    x2={100 + 60 * Math.cos((Math.PI * (180 - currentVolume * 1.8)) / 180)}
                    y2={100 - 60 * Math.sin((Math.PI * (180 - currentVolume * 1.8)) / 180)}
                    stroke="#1f2937"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                  <circle cx="100" cy="100" r="6" fill="#1f2937" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center pt-8">
                  <span className="text-4xl font-bold text-green-500">{Math.round(currentVolume)}</span>
                  <span className={cn("text-sm", status.color)}>{status.label}</span>
                </div>
              </div>
              <div className="flex justify-between px-4 text-xs text-muted-foreground">
                <span>0</span>
                <span>25</span>
                <span>50</span>
                <span>75</span>
                <span>100</span>
              </div>
              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center gap-4 text-sm">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" /> 安静</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500" /> 正常</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> 吵闹</span>
                </div>
                <span className="text-sm">峰值 <span className="text-green-500">{Math.round(peakVolume)}</span></span>
              </div>
            </CardContent>
          </Card>

          {/* Reward Timer */}
          <Card>
            <CardContent className="p-6">
              <h3 className="font-medium mb-4">安静奖励</h3>
              <div className="flex flex-col items-center justify-center h-48">
                <div className="relative w-40 h-40">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="80" cy="80" r="70" fill="none" stroke="#e5e7eb" strokeWidth="6" />
                    <circle
                      cx="80"
                      cy="80"
                      r="70"
                      fill="none"
                      stroke="#22c55e"
                      strokeWidth="6"
                      strokeLinecap="round"
                      strokeDasharray={2 * Math.PI * 70}
                      strokeDashoffset={2 * Math.PI * 70 * (1 - (totalRewardTime > 0 ? rewardTime / totalRewardTime : 0))}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-4xl font-bold">{formatTime(rewardTime)}</span>
                    <span className="text-sm text-muted-foreground">/ {formatTime(totalRewardTime)}</span>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mt-4">
                  {isMonitoring ? "正在监测中..." : "点击开始监测后进入挑战"}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2">
            <span className="text-sm">阈值</span>
            <div className="w-32">
              <Slider
                value={[threshold]}
                onValueChange={([v]) => setThreshold(v)}
                max={100}
                step={1}
                disabled={isMonitoring}
              />
            </div>
            <span className="text-green-500 font-bold">{threshold}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm">安静奖励</span>
            <Switch checked={rewardEnabled} onCheckedChange={setRewardEnabled} disabled={isMonitoring} />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm">连续</span>
            <Input type="number" value={duration} onChange={(e) => setDuration(parseInt(e.target.value) || 3)} className="w-16" disabled={isMonitoring} />
            <span className="text-sm">分钟 每人+</span>
            <Input type="number" value={pointsPerPerson} onChange={(e) => setPointsPerPerson(parseInt(e.target.value) || 1)} className="w-16" disabled={isMonitoring} />
            <span className="text-sm">分</span>
          </div>
          <Button
            onClick={isMonitoring ? stopMonitoring : startMonitoring}
            className="ml-auto bg-green-500 hover:bg-green-600"
          >
            <Mic className="w-4 h-4 mr-2" />
            {isMonitoring ? "停止监测" : "开始监测"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Sound Settings Dialog
function SoundSettingsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [volume, setVolume] = useState(50)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Volume2 className="w-5 h-5 text-violet-500" />
            音效提示
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">启用音效</h4>
              <p className="text-sm text-muted-foreground">加分/减分/兑换时播放提示音</p>
            </div>
            <Button
              variant={soundEnabled ? "default" : "outline"}
              size="sm"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={soundEnabled ? "bg-green-500 hover:bg-green-600" : ""}
            >
              {soundEnabled ? "已开启" : "已关闭"}
            </Button>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm">音量</span>
              <span className="text-sm text-muted-foreground">{volume}%</span>
            </div>
            <Slider
              value={[volume]}
              onValueChange={([v]) => setVolume(v)}
              max={100}
              step={1}
              disabled={!soundEnabled}
              className="[&_[role=slider]]:bg-violet-500"
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
