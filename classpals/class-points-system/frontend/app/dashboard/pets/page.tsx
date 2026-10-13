"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  Search,
  ChevronDown,
  CheckSquare,
  Users,
  Gift,
  Plus,
  Minus,
  AlertTriangle,
  History,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { petsApi } from "@/lib/api/pets"
import { studentsApi } from "@/lib/api/students"
import { rulesApi } from "@/lib/api/rules"
import { getSurname } from "@/lib/mock-data"
import { useActiveClass } from "@/lib/hooks/use-active-class"

type SortOption = "name" | "totalPoints" | "availablePoints" | "level"
type PointMode = "add" | "deduct"
type FeedMode = PointMode | "custom"

const API_ORIGIN = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api").replace(/\/api\/?$/, "")

const resolvePetImageUrl = (image?: string | null) => {
  if (!image) return ""
  if (/^https?:\/\//.test(image)) return image
  if (image.startsWith("/")) return `${API_ORIGIN}${image}`
  return image
}

export default function PetsPage() {
  const queryClient = useQueryClient()
  const { activeClassId, isLoading: classLoading } = useActiveClass()

  const [mounted, setMounted] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState<SortOption>("name")
  const [batchMode, setBatchMode] = useState(false)
  const [selectedStudents, setSelectedStudents] = useState<string[]>([])
  const [studentNameInput, setStudentNameInput] = useState("")

  // Dialogs
  const [adoptDialogOpen, setAdoptDialogOpen] = useState(false)
  const [feedDialogOpen, setFeedDialogOpen] = useState(false)
  const [resetDialogOpen, setResetDialogOpen] = useState(false)

  // Dialog state
  const [targetStudentId, setTargetStudentId] = useState<string | null>(null)
  const [pointMode, setPointMode] = useState<PointMode>("add")
  const [feedMode, setFeedMode] = useState<FeedMode>("add")
  const [selectedSpecies, setSelectedSpecies] = useState<string | null>(null)
  const [speciesFilter, setSpeciesFilter] = useState<string>("all")
  const [speciesSearch, setSpeciesSearch] = useState("")
  const [selectedRules, setSelectedRules] = useState<string[]>([])
  const [customPointValue, setCustomPointValue] = useState("")
  const [customNote, setCustomNote] = useState("")

  useEffect(() => {
    setMounted(true)
  }, [])

  // Fetch data
  const { data: studentsData } = useQuery({
    queryKey: ["students", activeClassId],
    queryFn: () => studentsApi.list(activeClassId!),
    enabled: !!activeClassId,
  })

  const { data: petsData } = useQuery({
    queryKey: ["class-pets", activeClassId],
    queryFn: () => petsApi.getClassPets(activeClassId!),
    enabled: !!activeClassId,
  })

  const { data: galleryData } = useQuery({
    queryKey: ["pets-gallery"],
    queryFn: () => petsApi.listGallery(),
  })

  const { data: rulesData } = useQuery({
    queryKey: ["rules", activeClassId],
    queryFn: () => rulesApi.list(activeClassId!),
    enabled: !!activeClassId && feedDialogOpen,
  })

  const students = Array.isArray(studentsData)
    ? studentsData
    : Array.isArray((studentsData as any)?.students)
      ? (studentsData as any).students
      : Array.isArray((studentsData as any)?.data?.students)
        ? (studentsData as any).data.students
        : []
  const classPets = Array.isArray((petsData as any)?.pets)
    ? (petsData as any).pets
    : Array.isArray((petsData as any)?.data?.pets)
      ? (petsData as any).data.pets
      : []
  const gallery = Array.isArray((galleryData as any)?.gallery)
    ? (galleryData as any).gallery
    : Array.isArray((galleryData as any)?.data?.gallery)
      ? (galleryData as any).data.gallery
      : []
  const rules = Array.isArray(rulesData)
    ? rulesData
    : Array.isArray((rulesData as any)?.data)
      ? (rulesData as any).data
      : (rulesData as any)?.data?.rules || []
  const filteredRules = rules.filter((r: any) => {
    const ruleType = (r.type as string)?.toUpperCase()
    const targetType = pointMode === "add" ? "ADD" : "DEDUCT"
    const isEnabled = r.isEnabled !== false
    return ruleType === targetType && isEnabled
  })

  const galleryCategories: string[] = Array.from(
    new Set(gallery.map((pet: any) => pet.category).filter(Boolean))
  )

  const selectPetMutation = useMutation({
    mutationFn: ({ studentId, petId }: { studentId: string; petId: string }) =>
      petsApi.selectPet(studentId, { petId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["class-pets"] })
      setAdoptDialogOpen(false)
      setSelectedSpecies(null)
      setTargetStudentId(null)
    },
  })

  const resetPetMutation = useMutation({
    mutationFn: (studentId: string) => petsApi.resetStudentPet(studentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["class-pets"] })
      setResetDialogOpen(false)
      setTargetStudentId(null)
    },
  })

  const changePetPointsMutation = useMutation({
    mutationFn: ({ studentId, requestBody }: { studentId: string; requestBody: any }) => petsApi.changePetPoints(studentId, requestBody),
    onSuccess: async (_, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["class-pets", activeClassId] }),
        queryClient.invalidateQueries({ queryKey: ["class-pet-records", activeClassId] }),
      ])
      toast.success(`已更新${students.find((student: any) => student.id === variables.studentId)?.name || "学生"}的宠物经验，请前往“宠物积分明细”查看记录`)
      setFeedDialogOpen(false)
      setSelectedRules([])
      setCustomPointValue("")
      setCustomNote("")
      setSelectedStudents([])
      setTargetStudentId(null)
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || error?.message || "宠物经验调整失败")
    },
  })

  // Filter and sort students
  const filteredStudents = students
    .filter((s: any) => s.name.includes(searchQuery) || s.studentNumber?.includes(searchQuery))
    .sort((a: any, b: any) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name, "zh")
        case "totalPoints":
          return b.totalPoints - a.totalPoints
        case "availablePoints":
          return b.availablePoints - a.availablePoints
        case "level": {
          const aPet = classPets.find((p: any) => p.studentId === a.id)
          const bPet = classPets.find((p: any) => p.studentId === b.id)
          return (bPet?.stageNum || 0) - (aPet?.stageNum || 0)
        }
        default:
          return 0
      }
    })

  const petsInGrowth = classPets.filter((p: any) => p.petId).length
  const selectedStudentNames = students
    .filter((student: any) => selectedStudents.includes(student.id))
    .map((student: any) => student.name)

  const handleToggleStudent = (studentId: string) => {
    setSelectedStudents((prev) =>
      prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId]
    )
  }

  useEffect(() => {
    if (!batchMode) {
      setStudentNameInput("")
      return
    }

    const names = students
      .filter((student: any) => selectedStudents.includes(student.id))
      .map((student: any) => student.name)

    setStudentNameInput(names.join(" "))
  }, [batchMode, selectedStudents, students])

  const handleSelectByName = () => {
    const names = studentNameInput.split(/[\s、,，]+/).filter(Boolean)
    const matchedIds = students
      .filter((s: any) => names.some((n) => s.name.includes(n)))
      .map((s: any) => s.id)
    setSelectedStudents(matchedIds)
  }

  const handleAdoptPet = () => {
    if (targetStudentId && selectedSpecies) {
      selectPetMutation.mutate({
        studentId: targetStudentId,
        petId: selectedSpecies,
      })
    }
  }

  const selectedStudent = students.find((s: any) => s.id === targetStudentId)

  const submitPetPointsChange = (studentId: string, payload: any) => {
    const { studentId: _ignoredStudentId, ...requestBody } = payload
    changePetPointsMutation.mutate({
      studentId,
      requestBody,
    })
  }

  const openBatchFeedDialog = () => {
    if (selectedStudents.length === 0) return
    setPointMode("add")
    setFeedMode("add")
    setSelectedRules([])
    setCustomPointValue("")
    setCustomNote("")
    setTargetStudentId(null)
    setFeedDialogOpen(true)
  }

  const handleFeed = () => {
    const totalPoints = selectedRules.reduce((sum, ruleId) => {
      const rule = rules.find((r: any) => r.id === ruleId)
      return sum + (rule?.points || 0)
    }, 0)

    const targets = feedDialogOpen && selectedStudents.length > 0 ? selectedStudents : targetStudentId ? [targetStudentId] : []

    if (targets.length === 0 || totalPoints === 0) return

    targets.forEach((studentId) => {
      const rule = rules.find((r: any) => r.id === selectedRules[0])
      submitPetPointsChange(studentId, {
        studentId,
        value: Math.abs(totalPoints),
        type: pointMode === "add" ? "ADD" : "DEDUCT",
        reason: rule?.name || "宠物经验调整",
        ruleId: selectedRules[0],
      })
    })
  }

  const handleCustomFeed = () => {
    const points = parseFloat(customPointValue) || 0
    const targets = targetStudentId ? [targetStudentId] : selectedStudents

    if (targets.length === 0 || points === 0) return

    targets.forEach((studentId) => {
      submitPetPointsChange(studentId, {
        studentId,
        value: Math.abs(points),
        type: pointMode === "add" ? "ADD" : "DEDUCT",
        reason: customNote || "自定义经验调整",
      })
    })
  }

  const handleFeedModeChange = (mode: FeedMode) => {
    setFeedMode(mode)
    if (mode !== "custom") {
      setPointMode(mode)
    }
  }

  const getCurrentCustomType = () => (pointMode === "add" ? "ADD" : "DEDUCT")

  const handleSubmitFeed = () => {
    if (feedMode === "custom") {
      handleCustomFeed()
      return
    }

    handleFeed()
  }

  const handleResetToEgg = () => {
    if (targetStudentId) {
      resetPetMutation.mutate(targetStudentId)
    }
  }

  const getTotalSelectedPoints = () => {
    if (feedMode === "custom") {
      return parseFloat(customPointValue) || 0
    }
    return selectedRules.reduce((sum, ruleId) => {
      const rule = rules.find((r: any) => r.id === ruleId)
      return sum + (rule?.points || 0)
    }, 0)
  }

  const filteredSpecies = gallery.filter((species: any) => {
    if (speciesFilter !== "all" && species.category !== speciesFilter) return false
    if (
      speciesSearch &&
      !species.nameZh?.includes(speciesSearch) &&
      !species.nameEn?.toLowerCase().includes(speciesSearch.toLowerCase()) &&
      !species.id?.includes(speciesSearch)
    ) {
      return false
    }
    return true
  })

  if (!mounted) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!activeClassId) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-muted-foreground mb-2">还没有激活的班级</p>
          <p className="text-sm text-muted-foreground">请前往班级管理创建并激活一个班级</p>
        </div>
      </div>
    )
  }

  if (classLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-muted-foreground">加载中...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="min-h-full overflow-y-auto bg-muted/20 px-4 py-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-[1800px] flex-col gap-6">
        <div className="overflow-hidden rounded-3xl border bg-card shadow-sm">
          <div className="flex flex-col gap-5 p-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Gift className="h-7 w-7" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">宠物世界</h1>
                <p className="mt-1 text-sm text-muted-foreground">管理学生宠物成长与经验调整</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-700">
                {petsInGrowth} 只宠物正在成长中
              </span>
              {batchMode && (
                <span className="rounded-full bg-primary/10 px-3 py-1 text-primary">批量模式中</span>
              )}
              <Button asChild variant="outline" size="sm" className="h-10 rounded-xl">
                <Link href="/dashboard/pets/records">宠物积分明细</Link>
              </Button>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl border bg-card shadow-sm">
          <div className="flex flex-col gap-3 p-5 md:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="搜索学生姓名/学号"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-11 rounded-xl pl-9"
                />
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="h-11 gap-2 rounded-xl">
                    <span>
                      按
                      {sortBy === "name"
                        ? "姓名"
                        : sortBy === "totalPoints"
                        ? "累计积分"
                        : sortBy === "availablePoints"
                        ? "可兑换积分"
                        : "等级"}
                    </span>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setSortBy("name")}>按姓名</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortBy("totalPoints")}>
                    按累计积分
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortBy("availablePoints")}>
                    按可兑换积分
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortBy("level")}>按等级</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                variant={batchMode ? "default" : "outline"}
                className={cn("h-11 gap-2 rounded-xl", batchMode && "bg-orange-500 hover:bg-orange-600")}
                onClick={() => {
                  setBatchMode(!batchMode)
                  if (batchMode) setSelectedStudents([])
                }}
              >
                <CheckSquare className="h-4 w-4" />
                批量模式
              </Button>
            </div>

            {batchMode && (
              <div className="border-t px-5 py-4">
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    placeholder="输入学生姓名后快速选中"
                    value={studentNameInput}
                    onChange={(e) => setStudentNameInput(e.target.value)}
                    className="h-11 flex-1 rounded-xl border-orange-300 focus-visible:ring-orange-500"
                  />
                  <Button className="h-11 rounded-xl bg-orange-500 hover:bg-orange-600" onClick={handleSelectByName}>
                    选中
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mx-auto w-full max-w-[1800px] flex-1 overflow-auto">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {filteredStudents.map((student: any) => {
              const pet = classPets.find((p: any) => p.studentId === student.id)
              const species = pet?.petId ? gallery.find((s: any) => s.id === pet.petId) : null
              const surname = getSurname(student.name)
              const isSelected = selectedStudents.includes(student.id)
              const petStageText = pet?.stageNum ? `形态 ${pet.stageNum} / 5` : "形态 - / 5"
              const petLevelText = pet?.stageNum ? `Lv.${pet.level}` : "待领养"

              return (
                <div
                  key={student.id}
                  className={cn(
                    "overflow-hidden rounded-[28px] border bg-card p-4 shadow-sm transition-all",
                    isSelected ? "border-orange-500 ring-2 ring-orange-200" : "hover:-translate-y-0.5 hover:shadow-md",
                    batchMode && "cursor-pointer"
                  )}
                  onClick={() => {
                    if (!batchMode) return
                    handleToggleStudent(student.id)
                  }}
                >
                  <div className="flex h-full flex-col gap-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2">
                        {batchMode && (
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => handleToggleStudent(student.id)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        )}
                        <div className="min-w-0">
                          <p className="truncate text-lg font-semibold leading-none text-foreground">{student.name}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{surname || "未识别姓氏"}</p>
                        </div>
                      </div>
                      <Badge
                        className={cn(
                          "shrink-0 rounded-full px-3 py-1 text-xs font-semibold",
                          pet?.stageNum ? "bg-orange-500 text-white" : "bg-amber-100 text-amber-700"
                        )}
                      >
                        {petLevelText}
                      </Badge>
                    </div>

                    <div className="relative aspect-square overflow-hidden rounded-[24px] border border-amber-100 bg-gradient-to-b from-amber-50 to-orange-50">
                      {species ? (
                        <div className="flex h-full w-full items-center justify-center p-6">
                          {pet?.currentImage ? (
                            <img src={resolvePetImageUrl(pet.currentImage)} alt={species.nameZh} className="h-full w-full object-contain" />
                          ) : species.image ? (
                            <img src={resolvePetImageUrl(species.image)} alt={species.nameZh} className="h-full w-full object-contain" />
                          ) : null}
                        </div>
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <div className="flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-b from-amber-100 to-orange-100">
                            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-b from-amber-50 to-white">
                              <span className="text-4xl">✨</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="space-y-3">
                      <div>
                        <p className="text-2xl font-semibold leading-tight text-foreground">{species?.nameZh || "暂无宠物"}</p>
                        <p className="text-sm text-muted-foreground">{petStageText}</p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {species ? (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 rounded-full text-xs"
                              onClick={(e) => {
                                e.stopPropagation()
                                setTargetStudentId(student.id)
                                setPointMode("add")
                                setFeedMode("add")
                                setSelectedRules([])
                                setCustomPointValue("")
                                setCustomNote("")
                                setFeedDialogOpen(true)
                              }}
                            >
                              调整经验
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 rounded-full text-xs"
                              onClick={(e) => {
                                e.stopPropagation()
                                setTargetStudentId(student.id)
                                setResetDialogOpen(true)
                              }}
                            >
                              回到蛋态
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 rounded-full text-xs"
                              onClick={(e) => {
                                e.stopPropagation()
                                setTargetStudentId(student.id)
                                setSelectedSpecies(null)
                                setAdoptDialogOpen(true)
                              }}
                            >
                              更换
                            </Button>
                          </>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 rounded-full text-xs"
                            onClick={(e) => {
                              e.stopPropagation()
                              setTargetStudentId(student.id)
                              setSelectedSpecies(null)
                              setAdoptDialogOpen(true)
                            }}
                          >
                            立即领养
                          </Button>
                        )}
                      </div>
                    </div>

                    {pet?.stage && (
                      <div className="space-y-2">
                        <div className="h-2 overflow-hidden rounded-full bg-amber-100">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-orange-400 to-orange-500 transition-all"
                            style={{ width: `${Math.min(100, ((pet.growthValue || 0) / (pet?.nextStageThreshold?.threshold || 10)) * 100)}%` }}
                          />
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2 border-t pt-3 text-center sm:grid-cols-4">
                      <div className="rounded-2xl bg-muted/30 px-2 py-3">
                        <p className="text-xs text-muted-foreground">累计积分</p>
                        <p className="font-semibold text-orange-500">{student.totalPoints}</p>
                      </div>
                      <div className="rounded-2xl bg-muted/30 px-2 py-3">
                        <p className="text-xs text-muted-foreground">可兑换积分</p>
                        <p className="font-semibold text-green-500">{student.availablePoints}</p>
                      </div>
                      <div className="rounded-2xl bg-muted/30 px-2 py-3">
                        <p className="text-xs text-muted-foreground">成长经验</p>
                        <p className="font-semibold text-purple-500">{Math.max(0, pet?.growthValue ?? 0)}</p>
                      </div>
                      <div className="rounded-2xl bg-muted/30 px-2 py-3">
                        <p className="text-xs text-muted-foreground">徽章</p>
                        <p className="flex items-center justify-center gap-0.5 font-semibold text-red-500">
                          {pet?.badges || 0}
                          <Gift className="w-3 h-3" />
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Batch action bar */}
      {batchMode && selectedStudents.length > 0 && (
        <div className="fixed bottom-6 left-1/2 z-40 w-[min(760px,calc(100vw-32px))] -translate-x-1/2 rounded-3xl border bg-card/95 px-5 py-4 shadow-xl backdrop-blur">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-sm text-foreground">
                <CheckSquare className="h-4 w-4 shrink-0 text-orange-500" />
                <span className="shrink-0">已选</span>
                <strong className="shrink-0 text-lg text-orange-500">{selectedStudents.length}</strong>
                <span className="shrink-0">人</span>
              </div>
              <p className="mt-1 truncate text-sm text-muted-foreground">{selectedStudentNames.join("、")}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button variant="outline" size="sm" className="rounded-xl" onClick={() => setSelectedStudents([])}>
                清空
              </Button>
              <Button
                size="sm"
                className="rounded-xl bg-orange-500 hover:bg-orange-600"
                onClick={openBatchFeedDialog}
              >
                批量操作
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Adopt Pet Dialog - Will continue in next part */}

      {/* Adopt Pet Dialog */}
      <Dialog open={adoptDialogOpen} onOpenChange={setAdoptDialogOpen}>
        <DialogContent className="flex max-h-[82vh] max-w-4xl flex-col overflow-hidden rounded-3xl border bg-card p-0 shadow-xl">
          <DialogHeader className="border-b px-6 py-5">
            <DialogTitle className="text-xl font-semibold">领养宠物</DialogTitle>
            <DialogDescription className="pt-1">
              图鉴、领养和徽章共用同一物种源，确认后会绑定给{" "}
              <strong>{students.find((s: any) => s.id === targetStudentId)?.name}</strong>。
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-1 flex-col overflow-hidden px-6 py-5">
            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="搜索中文名 / 英文名"
                value={speciesSearch}
                onChange={(e) => setSpeciesSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Category tabs */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex gap-2">
                <Button
                  variant={speciesFilter === "all" ? "default" : "ghost"}
                  size="sm"
                  className={
                    speciesFilter === "all"
                      ? "bg-orange-500 hover:bg-orange-600"
                      : "text-orange-500"
                  }
                  onClick={() => setSpeciesFilter("all")}
                >
                  全部
                </Button>
                {galleryCategories.map((category) => (
                  <Button
                    key={category}
                    variant={speciesFilter === category ? "default" : "ghost"}
                    size="sm"
                    className={
                      speciesFilter === category
                        ? "bg-orange-500 hover:bg-orange-600"
                        : "text-orange-500"
                    }
                    onClick={() => setSpeciesFilter(category)}
                  >
                    {category}
                  </Button>
                ))}
              </div>
              <span className="text-sm text-muted-foreground">共 {filteredSpecies.length} 种可选</span>
            </div>

            {/* Species grid */}
            <div className="flex-1 overflow-auto">
              <div className="grid grid-cols-4 md:grid-cols-6 gap-3">
                {filteredSpecies.map((species: any) => (
                  <div
                    key={species.id}
                    className={cn(
                      "relative border-2 rounded-lg p-3 cursor-pointer transition-all hover:border-orange-300",
                      selectedSpecies === species.id
                        ? "border-orange-500 bg-orange-50"
                        : "border-gray-200"
                    )}
                    onClick={() => setSelectedSpecies(species.id)}
                  >
                    {selectedSpecies === species.id && (
                      <div className="absolute -top-2 -right-2 w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs">✓</span>
                      </div>
                    )}
                    <div className="aspect-square bg-gray-50 rounded-lg mb-2 flex items-center justify-center text-3xl">
                      {species.image ? (
                        <img src={resolvePetImageUrl(species.image)} alt={species.nameZh} className="w-full h-full object-contain" />
                      ) : (
                        <span>{species.category === "cat" ? "🐱" : "🐶"}</span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-center">{species.nameZh}</p>
                    <p className="text-xs text-muted-foreground text-center">{species.nameEn}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="mt-4 border-t px-0 pt-4">
            <p className="flex-1 text-xs text-muted-foreground">
              确认后会复用统一 catalog id，不改数据库 schema。
            </p>
            <Button
              className="rounded-xl bg-orange-500 hover:bg-orange-600"
              onClick={handleAdoptPet}
              disabled={!selectedSpecies}
            >
              确认领养
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Feed Dialog */}
      <Dialog open={feedDialogOpen} onOpenChange={setFeedDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {selectedStudents.length > 1
                ? `批量宠物经验操作 · 已选 ${selectedStudents.length} 人`
                : selectedStudents.length === students.length
                ? `全班宠物经验操作 · ${students.length} 人`
                : `${selectedStudent?.name || ""}学生的宠物`}
            </DialogTitle>
            <DialogDescription>
              选择规则后{selectedStudents.length > 1 ? "，系统将为已选宠物统一增加或扣减经验" : "立即生效"}。宠物经验记录会写入“宠物积分明细”，不会写入学生“积分明细”。
            </DialogDescription>
          </DialogHeader>

          {/* Mode tabs */}
          <div className="flex gap-2 mb-4">
            <Button
              variant={feedMode === "add" ? "default" : "outline"}
              size="sm"
              className={cn(feedMode === "add" && "bg-green-500 hover:bg-green-600")}
              onClick={() => handleFeedModeChange("add")}
            >
              <Plus className="w-4 h-4 mr-1" />
              加经验
            </Button>
            <Button
              variant={feedMode === "deduct" ? "default" : "outline"}
              size="sm"
              className={cn(feedMode === "deduct" && "bg-red-500 hover:bg-red-600")}
              onClick={() => handleFeedModeChange("deduct")}
            >
              <Minus className="w-4 h-4 mr-1" />
              扣经验
            </Button>
            <Button
              variant={feedMode === "custom" ? "default" : "outline"}
              size="sm"
              onClick={() => handleFeedModeChange("custom")}
            >
              自定义
            </Button>
          </div>

          <p className="text-sm mb-2">
            模式：
            <span
              className={
                pointMode === "add"
                  ? "text-green-500"
                  : pointMode === "deduct"
                  ? "text-red-500"
                  : "text-foreground"
              }
            >
              {feedMode === "custom"
                ? `自定义${getCurrentCustomType() === "ADD" ? "加经验" : "扣经验"}`
                : pointMode === "add"
                ? "+ 加经验"
                : "- 扣经验"}
            </span>
          </p>

          {feedMode === "custom" ? (
            <div className="space-y-4 border rounded-lg p-4">
              <div>
                <Label>自定义经验值</Label>
                <Input
                  type="number"
                  placeholder="输入经验值，如 2 或 1.5"
                  value={customPointValue}
                  onChange={(e) => setCustomPointValue(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>
                  备注 <span className="text-muted-foreground">(可选)</span>
                </Label>
                <Textarea
                  placeholder="输入经验增减理由"
                  value={customNote}
                  onChange={(e) => setCustomNote(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
          ) : (
            <div className="border rounded-lg p-4 min-h-[200px]">
              {filteredRules.length > 0 ? (
                <div className="space-y-2">
                  {filteredRules.map((rule: any) => (
                      <div
                        key={rule.id}
                        className={cn(
                          "flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors",
                          selectedRules.includes(rule.id)
                            ? "border-primary bg-primary/5"
                            : "hover:bg-muted/50"
                        )}
                        onClick={() => {
                          setSelectedRules((prev) =>
                            prev.includes(rule.id)
                              ? prev.filter((id) => id !== rule.id)
                              : [...prev, rule.id]
                          )
                        }}
                      >
                        <span>{rule.name}</span>
                        <div className="flex items-center gap-2">
                          <span className={rule.type === "ADD" ? "text-green-500" : "text-red-500"}>
                            {rule.type === "ADD" ? `+${rule.points}` : `-${rule.points}`}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-6 text-xs"
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedRules((prev) =>
                                prev.includes(rule.id)
                                  ? prev.filter((id) => id !== rule.id)
                                  : [...prev, rule.id]
                              )
                            }}
                          >
                            选择
                          </Button>
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  暂无可用规则，请先在班级管理里配置规则
                </div>
              )}
            </div>
          )}

          {/* Summary */}
          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
            <div className="flex items-center gap-2 text-sm">
              {getTotalSelectedPoints() === 0 ? (
                <>
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  <span>未选择规则</span>
                </>
              ) : (
                <span>已选择规则</span>
              )}
            </div>
            <span
              className={cn(
                "text-2xl font-bold",
                getTotalSelectedPoints() > 0
                  ? "text-green-500"
                  : getTotalSelectedPoints() < 0
                  ? "text-red-500"
                  : "text-muted-foreground"
              )}
            >
              {getTotalSelectedPoints()}经验
            </span>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFeedDialogOpen(false)}>
              取消
            </Button>
            <Button
              className={cn(
                pointMode === "add"
                  ? "bg-green-500 hover:bg-green-600"
                  : pointMode === "deduct"
                  ? "bg-red-500 hover:bg-red-600"
                  : ""
              )}
              onClick={handleSubmitFeed}
              disabled={getTotalSelectedPoints() === 0}
            >
              {feedMode === "custom"
                ? `确认自定义${getCurrentCustomType() === "ADD" ? "加经验" : "扣经验"}`
                : `确认${pointMode === "add" ? "加经验" : "扣经验"}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset to Egg Dialog */}
      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              回到蛋态
            </DialogTitle>
          </DialogHeader>

          <div className="text-center py-6">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-50 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="text-lg font-semibold mb-2">回到蛋态</h3>
            <p className="text-muted-foreground text-sm">
              确认将「{students.find((s: any) => s.id === targetStudentId)?.name}
              」的宠物回退到蛋态吗？这会保留当前宠物归属，但会重置为第一阶段并清空成长经验。
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setResetDialogOpen(false)} className="flex-1">
              取消
            </Button>
            <Button
              onClick={handleResetToEgg}
              className="flex-1 bg-red-500 hover:bg-red-600 text-white"
            >
              确认执行
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
