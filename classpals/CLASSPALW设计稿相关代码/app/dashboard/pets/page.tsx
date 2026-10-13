"use client"

import { useState, useEffect } from "react"
import {
  Search,
  ChevronDown,
  CheckSquare,
  Users,
  Pencil,
  AlertTriangle,
  Gift,
  Plus,
  Minus
} from "lucide-react"
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
import { mockStudents, getSurname } from "@/lib/mock-data"
import { petImageData } from "@/lib/pet-image-data"

interface PetSpecies {
  id: string
  nameZh: string
  nameEn: string
  category: string
  image: string
  stages: Array<{ image: string }>
}

const petSpecies: PetSpecies[] = petImageData.map((pet) => ({
  id: pet.id,
  nameZh: pet.name,
  nameEn: pet.category,
  category: pet.category,
  image: pet.stages[0]?.image || "",
  stages: pet.stages,
}))

const speciesCategories = Array.from(new Set(petSpecies.map((species) => species.category)))

// Mock student pet data
interface StudentPet {
  speciesId: string | null
  stage: number // 1-5, null means no pet
  growthValue: number
  badges: number
}

const initialStudentPets: Record<string, StudentPet> = {
  "1": { speciesId: "01", stage: 1, growthValue: 3, badges: 0 },
}

// Mock rules
const mockRules = [
  { id: "1", name: "主动打扫卫生", points: 1, type: "add" },
  { id: "2", name: "主动帮老师收集小组作业", points: 1, type: "add" },
  { id: "3", name: "课堂上聊天", points: -1, type: "deduct" },
] as const


type SortOption = "name" | "totalPoints" | "availablePoints" | "level"
type PointMode = "add" | "deduct" | "custom"

export default function PetsPage() {
  const [mounted, setMounted] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState<SortOption>("name")
  const [batchMode, setBatchMode] = useState(false)
  const [selectedStudents, setSelectedStudents] = useState<string[]>([])
  const [studentNameInput, setStudentNameInput] = useState("")
  const [studentPets, setStudentPets] = useState(initialStudentPets)
  
  // Dialogs
  const [adoptDialogOpen, setAdoptDialogOpen] = useState(false)
  const [feedDialogOpen, setFeedDialogOpen] = useState(false)
  const [resetDialogOpen, setResetDialogOpen] = useState(false)
  const [customPointsDialogOpen, setCustomPointsDialogOpen] = useState(false)
  
  // Dialog state
  const [targetStudentId, setTargetStudentId] = useState<string | null>(null)
  const [pointMode, setPointMode] = useState<PointMode>("add")
  const [selectedSpecies, setSelectedSpecies] = useState<string | null>(null)
  const [speciesFilter, setSpeciesFilter] = useState<string>("all")
  const [speciesSearch, setSpeciesSearch] = useState("")
  const [selectedRules, setSelectedRules] = useState<string[]>([])
  const [customPointValue, setCustomPointValue] = useState("")
  const [customNote, setCustomNote] = useState("")
  const [batchCustomPoints, setBatchCustomPoints] = useState<Record<string, { points: string; note: string }>>({})

  useEffect(() => {
    setMounted(true)
  }, [])

  // Filter and sort students
  const filteredStudents = mockStudents
    .filter(s => s.name.includes(searchQuery) || s.studentNo?.includes(searchQuery))
    .sort((a, b) => {
      switch (sortBy) {
        case "name": return a.name.localeCompare(b.name, "zh")
        case "totalPoints": return b.totalPoints - a.totalPoints
        case "availablePoints": return b.availablePoints - a.availablePoints
        case "level": {
          const aPet = studentPets[a.id]
          const bPet = studentPets[b.id]
          return (bPet?.stage || 0) - (aPet?.stage || 0)
        }
        default: return 0
      }
    })

  const petsInGrowth = Object.values(studentPets as Record<string, StudentPet>).filter((pet) => pet.speciesId).length

  const handleToggleStudent = (studentId: string) => {
    setSelectedStudents(prev => 
      prev.includes(studentId) 
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    )
  }

  const handleSelectByName = () => {
    const names = studentNameInput.split(/\s+/).filter(Boolean)
    const matchedIds = mockStudents
      .filter(s => names.some(n => s.name.includes(n)))
      .map(s => s.id)
    setSelectedStudents(matchedIds)
  }

  const handleAdoptPet = () => {
    if (targetStudentId && selectedSpecies) {
      setStudentPets(prev => ({
        ...prev,
        [targetStudentId]: {
          speciesId: selectedSpecies,
          stage: 1,
          growthValue: 0,
          badges: 0,
        }
      }))
      setAdoptDialogOpen(false)
      setSelectedSpecies(null)
      setTargetStudentId(null)
    }
  }

  const handleFeed = () => {
    const totalPoints = selectedRules.reduce((sum, ruleId) => {
      const rule = mockRules.find(r => r.id === ruleId)
      return sum + (rule?.points || 0)
    }, 0)
    
    // Apply points to selected students or target student
    const targets = feedDialogOpen && selectedStudents.length > 0 
      ? selectedStudents 
      : targetStudentId ? [targetStudentId] : []
    
    targets.forEach(studentId => {
      const pet = studentPets[studentId]
      if (pet) {
        setStudentPets(prev => ({
          ...prev,
          [studentId]: {
            ...pet,
            growthValue: pet.growthValue + Math.abs(totalPoints),
          }
        }))
      }
    })
    
    setFeedDialogOpen(false)
    setSelectedRules([])
    setTargetStudentId(null)
  }

  const handleCustomFeed = () => {
    const points = parseFloat(customPointValue) || 0
    const targets = targetStudentId ? [targetStudentId] : selectedStudents
    
    targets.forEach(studentId => {
      const pet = studentPets[studentId]
      if (pet) {
        setStudentPets(prev => ({
          ...prev,
          [studentId]: {
            ...pet,
            growthValue: pet.growthValue + Math.abs(points),
          }
        }))
      }
    })
    
    setFeedDialogOpen(false)
    setCustomPointValue("")
    setCustomNote("")
    setTargetStudentId(null)
  }

  const handleResetToEgg = () => {
    if (targetStudentId) {
      setStudentPets(prev => ({
        ...prev,
        [targetStudentId]: {
          speciesId: null,
          stage: 0,
          growthValue: 0,
          badges: prev[targetStudentId]?.badges || 0,
        }
      }))
      setResetDialogOpen(false)
      setTargetStudentId(null)
    }
  }

  const handleBatchCustomSubmit = () => {
    Object.entries(batchCustomPoints).forEach(([studentId, { points }]) => {
      const pointValue = parseFloat(points) || 0
      if (pointValue !== 0) {
        const pet = studentPets[studentId]
        if (pet) {
          setStudentPets(prev => ({
            ...prev,
            [studentId]: {
              ...pet,
              growthValue: pet.growthValue + Math.abs(pointValue),
            }
          }))
        }
      }
    })
    setCustomPointsDialogOpen(false)
    setBatchCustomPoints({})
  }

  const getTotalSelectedPoints = () => {
    if (pointMode === "custom") {
      return parseFloat(customPointValue) || 0
    }
    return selectedRules.reduce((sum, ruleId) => {
      const rule = mockRules.find(r => r.id === ruleId)
      return sum + (rule?.points || 0)
    }, 0)
  }

  const filteredSpecies = petSpecies.filter((species) => {
    if (speciesFilter !== "all" && species.category !== speciesFilter) return false
    if (
      speciesSearch &&
      !species.nameZh.includes(speciesSearch) &&
      !species.nameEn.toLowerCase().includes(speciesSearch.toLowerCase()) &&
      !species.id.includes(speciesSearch)
    ) return false
    return true
  })

  const getSpeciesStageImage = (species: PetSpecies | null, stage: number) => {
    if (!species) return ""
    const stageIndex = Math.max(0, Math.min(species.stages.length - 1, stage - 1))
    return species.stages[stageIndex]?.image || species.image
  }

  if (!mounted) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-background">
      {/* Header */}
      <div className="p-4 md:p-6 border-b bg-card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">班级主页</h1>
            <p className="text-sm text-muted-foreground">管理学生宠物成长与喂养</p>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span>全班 <strong>{mockStudents.length}</strong></span>
            <span className="text-orange-500"><strong>{petsInGrowth}</strong> 只宠物正在成长中</span>
            <Button variant="link" className="text-primary p-0 h-auto">
              批量模式中
            </Button>
          </div>
        </div>

        {/* Search and filters */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="搜索学生姓名/学号"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <span>按{sortBy === "name" ? "姓名" : sortBy === "totalPoints" ? "累计积分" : sortBy === "availablePoints" ? "可用积分" : "等级"}</span>
                <ChevronDown className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setSortBy("name")}>按姓名</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy("totalPoints")}>按累计积分</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy("availablePoints")}>按可用积分</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy("level")}>按等级</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button 
            variant={batchMode ? "default" : "outline"} 
            className={cn("gap-2", batchMode && "bg-orange-500 hover:bg-orange-600")}
            onClick={() => {
              setBatchMode(!batchMode)
              if (batchMode) setSelectedStudents([])
            }}
          >
            <CheckSquare className="w-4 h-4" />
            批量模式
          </Button>
          
          <Button 
            variant="outline" 
            className="gap-2"
            onClick={() => {
              setSelectedStudents(mockStudents.map(s => s.id))
              setFeedDialogOpen(true)
            }}
          >
            <Users className="w-4 h-4" />
            全班操作
          </Button>
          
          <Button 
            variant="outline" 
            className="gap-2"
            onClick={() => setCustomPointsDialogOpen(true)}
          >
            <Pencil className="w-4 h-4" />
            自定义加分
          </Button>
        </div>

        {/* Batch name input */}
        {batchMode && (
          <div className="mt-3 flex gap-2">
            <Input
              placeholder="杜宇 詹姆斯"
              value={studentNameInput}
              onChange={(e) => setStudentNameInput(e.target.value)}
              className="flex-1 border-orange-300 focus-visible:ring-orange-500"
            />
            <Button 
              className="bg-orange-500 hover:bg-orange-600"
              onClick={handleSelectByName}
            >
              选中
            </Button>
          </div>
        )}
      </div>

      {/* Pet cards grid */}
      <div className="flex-1 overflow-auto p-4 md:p-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredStudents.map((student) => {
            const pet = studentPets[student.id]
            const species = pet?.speciesId ? petSpecies.find(s => s.id === pet.speciesId) : null
            const surname = getSurname(student.name)
            const isSelected = selectedStudents.includes(student.id)
            
            return (
              <div
                key={student.id}
                className={cn(
                  "bg-card rounded-xl border-2 overflow-hidden transition-all",
                  isSelected ? "border-orange-500 ring-2 ring-orange-200" : "border-transparent",
                  batchMode && "cursor-pointer"
                )}
                onClick={() => batchMode && handleToggleStudent(student.id)}
              >
                {/* Card header with name and level */}
                <div className="flex items-center justify-between p-3 pb-0">
                  <div className="flex items-center gap-2">
                    {batchMode && (
                      <Checkbox 
                        checked={isSelected}
                        onCheckedChange={() => handleToggleStudent(student.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    )}
                    <span className="font-medium text-sm">{surname}</span>
                  </div>
                  {pet?.stage ? (
                    <Badge className="bg-orange-500 text-white text-xs">Lv.{pet.stage}</Badge>
                  ) : (
                    <span className="text-orange-500 text-xs">待领养</span>
                  )}
                </div>

                {/* Pet image area */}
                <div className="relative aspect-square mx-3 my-2 rounded-lg bg-gradient-to-b from-amber-50 to-orange-50 flex items-center justify-center overflow-hidden">
                  {species ? (
                    <img
                      src={getSpeciesStageImage(species, pet?.stage || 1)}
                      alt={species.nameZh}
                      className="h-full w-full object-contain p-4"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-gradient-to-b from-amber-100 to-orange-100 flex items-center justify-center">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-b from-amber-50 to-white flex items-center justify-center">
                        <span className="text-3xl">✨</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Pet info */}
                <div className="px-3 pb-2">
                  <div className="flex items-center justify-between mb-1">
                    <div>
                      <p className="font-medium text-sm">{species?.nameZh || "暂无宠物"}</p>
                      <p className="text-xs text-muted-foreground">形态 {pet?.stage || "-"} / 5</p>
                    </div>
                    {species ? (
                      <div className="flex gap-1">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-7 text-xs"
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
                          className="h-7 text-xs"
                          onClick={(e) => {
                            e.stopPropagation()
                            setTargetStudentId(student.id)
                            setSelectedSpecies(null)
                            setAdoptDialogOpen(true)
                          }}
                        >
                          更换
                        </Button>
                      </div>
                    ) : (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-7 text-xs"
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

                  {/* Growth progress bar */}
                  {pet?.stage && (
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-2">
                      <div 
                        className="h-full bg-gradient-to-r from-orange-400 to-orange-500 rounded-full transition-all"
                        style={{ width: `${Math.min(100, (pet.growthValue / 10) * 100)}%` }}
                      />
                    </div>
                  )}

                  {/* Stats */}
                  <div className="grid grid-cols-4 gap-1 text-center text-xs border-t pt-2">
                    <div>
                      <p className="text-muted-foreground">累计</p>
                      <p className="font-medium text-orange-500">{student.totalPoints}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">可用</p>
                      <p className="font-medium text-green-500">{student.availablePoints}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">成长值</p>
                      <p className="font-medium text-purple-500">{pet?.growthValue || "--"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">徽章</p>
                      <p className="font-medium text-red-500 flex items-center justify-center gap-0.5">
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

      {/* Batch action bar */}
      {batchMode && selectedStudents.length > 0 && (
        <div className="border-t bg-card p-3 flex items-center justify-center gap-4">
          <div className="flex items-center gap-2 text-sm">
            <CheckSquare className="w-4 h-4 text-orange-500" />
            已选 <strong className="text-orange-500">{selectedStudents.length}</strong> 人
          </div>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setSelectedStudents([])}
          >
            清空
          </Button>
          <Button 
            size="sm"
            className="bg-orange-500 hover:bg-orange-600"
            onClick={() => setFeedDialogOpen(true)}
          >
            批量喂养
          </Button>
        </div>
      )}

      {/* Adopt Pet Dialog */}
      <Dialog open={adoptDialogOpen} onOpenChange={setAdoptDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>领养宠物</DialogTitle>
            <DialogDescription>
              图鉴、领养和徽章共用同一物种源，确认后会绑定给 <strong>{mockStudents.find(s => s.id === targetStudentId)?.name}</strong>。
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-hidden flex flex-col">
            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="搜索中文名 / 英文名 / species id"
                value={speciesSearch}
                onChange={(e) => setSpeciesSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Category tabs */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant={speciesFilter === "all" ? "default" : "ghost"}
                  size="sm"
                  className={speciesFilter === "all" ? "bg-orange-500 hover:bg-orange-600" : "text-orange-500"}
                  onClick={() => setSpeciesFilter("all")}
                >
                  全部
                </Button>
                {speciesCategories.map((category) => (
                  <Button
                    key={category}
                    variant={speciesFilter === category ? "default" : "ghost"}
                    size="sm"
                    className={speciesFilter === category ? "bg-orange-500 hover:bg-orange-600" : "text-orange-500"}
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
                {filteredSpecies.map((species) => (
                  <div
                    key={species.id}
                    className={cn(
                      "relative border-2 rounded-lg p-3 cursor-pointer transition-all hover:border-orange-300",
                      selectedSpecies === species.id ? "border-orange-500 bg-orange-50" : "border-gray-200"
                    )}
                    onClick={() => setSelectedSpecies(species.id)}
                  >
                    {selectedSpecies === species.id && (
                      <div className="absolute -top-2 -right-2 w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs">✓</span>
                      </div>
                    )}
                    <div className="aspect-square bg-gray-50 rounded-lg mb-2 overflow-hidden">
                      <img
                        src={species.image}
                        alt={species.nameZh}
                        className="h-full w-full object-contain p-2"
                      />
                    </div>
                    <p className="text-sm font-medium text-center">{species.nameZh}</p>
                    <p className="text-xs text-muted-foreground text-center">{species.nameEn}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="border-t pt-4 mt-4">
            <p className="text-xs text-muted-foreground flex-1">
              确认后会复用统一 catalog id，不改数据库 schema。
            </p>
            <Button 
              className="bg-orange-500 hover:bg-orange-600"
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
                ? `批量喂养 · 已选 ${selectedStudents.length} 人`
                : selectedStudents.length === mockStudents.length
                  ? `全班操作 · ${mockStudents.length} 人`
                  : `加分喂养 · ${mockStudents.find(s => s.id === targetStudentId)?.name || ""}`
              }
            </DialogTitle>
            <DialogDescription>
              选择规则后{selectedStudents.length > 1 ? "，系统将为已选学生统一加分或扣分" : "立即生效"}
            </DialogDescription>
          </DialogHeader>

          {/* Mode tabs */}
          <div className="flex gap-2 mb-4">
            <Button
              variant={pointMode === "add" ? "default" : "outline"}
              size="sm"
              className={cn(pointMode === "add" && "bg-green-500 hover:bg-green-600")}
              onClick={() => setPointMode("add")}
            >
              <Plus className="w-4 h-4 mr-1" />
              加分
            </Button>
            <Button
              variant={pointMode === "deduct" ? "default" : "outline"}
              size="sm"
              className={cn(pointMode === "deduct" && "bg-red-500 hover:bg-red-600")}
              onClick={() => setPointMode("deduct")}
            >
              <Minus className="w-4 h-4 mr-1" />
              扣分
            </Button>
            <Button
              variant={pointMode === "custom" ? "default" : "outline"}
              size="sm"
              onClick={() => setPointMode("custom")}
            >
              自定义
            </Button>
          </div>

          <p className="text-sm mb-2">
            模式：<span className={pointMode === "add" ? "text-green-500" : pointMode === "deduct" ? "text-red-500" : "text-foreground"}>
              {pointMode === "add" ? "+ 加分" : pointMode === "deduct" ? "- 扣分" : "自定义"}
            </span>
          </p>

          {pointMode === "custom" ? (
            <div className="space-y-4 border rounded-lg p-4">
              <div>
                <Label>自定义{pointMode === "deduct" ? "扣" : "加"}分值</Label>
                <Input
                  type="number"
                  placeholder="输入分值，如 2 或 1.5"
                  value={customPointValue}
                  onChange={(e) => setCustomPointValue(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>备注 <span className="text-muted-foreground">(可选)</span></Label>
                <Textarea
                  placeholder="输入加减分理由"
                  value={customNote}
                  onChange={(e) => setCustomNote(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
          ) : (
            <div className="border rounded-lg p-4 min-h-[200px]">
              {mockRules.filter(r => pointMode === "add" ? r.points > 0 : r.points < 0).length > 0 ? (
                <div className="space-y-2">
                  {mockRules
                    .filter(r => pointMode === "add" ? r.points > 0 : r.points < 0)
                    .map((rule) => (
                      <div
                        key={rule.id}
                        className={cn(
                          "flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors",
                          selectedRules.includes(rule.id) ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                        )}
                        onClick={() => {
                          setSelectedRules(prev => 
                            prev.includes(rule.id)
                              ? prev.filter(id => id !== rule.id)
                              : [...prev, rule.id]
                          )
                        }}
                      >
                        <span>{rule.name}</span>
                        <div className="flex items-center gap-2">
                          <span className={rule.points > 0 ? "text-green-500" : "text-red-500"}>
                            {rule.points > 0 ? `+${rule.points}` : rule.points}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-6 text-xs"
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedRules(prev => 
                                prev.includes(rule.id)
                                  ? prev.filter(id => id !== rule.id)
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
            <span className={cn(
              "text-2xl font-bold",
              getTotalSelectedPoints() > 0 ? "text-green-500" : getTotalSelectedPoints() < 0 ? "text-red-500" : "text-muted-foreground"
            )}>
              {getTotalSelectedPoints()}分
            </span>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFeedDialogOpen(false)}>
              取消
            </Button>
            <Button 
              className={cn(
                pointMode === "add" ? "bg-green-500 hover:bg-green-600" : 
                pointMode === "deduct" ? "bg-red-500 hover:bg-red-600" : ""
              )}
              onClick={pointMode === "custom" ? handleCustomFeed : handleFeed}
              disabled={getTotalSelectedPoints() === 0}
            >
              确认{pointMode === "add" ? "加分" : pointMode === "deduct" ? "扣分" : "提交"}
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
              确认将「{mockStudents.find(s => s.id === targetStudentId)?.name}」的宠物回退到蛋态吗？将清空当前物种并重置成长值，需要重新领养。已收集徽章会保留。
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setResetDialogOpen(false)} className="flex-1">
              取消
            </Button>
            <Button variant="destructive" onClick={handleResetToEgg} className="flex-1">
              确认执行
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Custom Points Dialog (per student) */}
      <Dialog open={customPointsDialogOpen} onOpenChange={setCustomPointsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>自定义加分</DialogTitle>
            <DialogDescription>
              支持逐人填写不同分值，正数加分，负数扣分，空值跳过
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-2 mb-4">
            <Input 
              placeholder="自定义加分" 
              className="flex-1"
              disabled
            />
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              已填写 {Object.values(batchCustomPoints).filter(v => v.points).length} 人
            </span>
          </div>

          <div className="flex-1 overflow-auto">
            <div className="grid grid-cols-[1fr_120px_1fr] gap-2 mb-2 text-sm font-medium text-muted-foreground px-1">
              <span>学生</span>
              <span>分值 (+/-)</span>
              <span>备注（可选）</span>
            </div>
            <div className="space-y-2">
              {mockStudents.map((student) => (
                <div key={student.id} className="grid grid-cols-[1fr_120px_1fr] gap-2 items-center">
                  <span className="font-medium">{student.name}</span>
                  <Input
                    placeholder="如: +3 / -2"
                    value={batchCustomPoints[student.id]?.points || ""}
                    onChange={(e) => setBatchCustomPoints(prev => ({
                      ...prev,
                      [student.id]: { ...prev[student.id], points: e.target.value, note: prev[student.id]?.note || "" }
                    }))}
                  />
                  <Input
                    placeholder="留空使用默认备注"
                    value={batchCustomPoints[student.id]?.note || ""}
                    onChange={(e) => setBatchCustomPoints(prev => ({
                      ...prev,
                      [student.id]: { ...prev[student.id], note: e.target.value, points: prev[student.id]?.points || "" }
                    }))}
                  />
                </div>
              ))}
            </div>
          </div>

          <DialogFooter className="border-t pt-4">
            <Button variant="outline" onClick={() => setCustomPointsDialogOpen(false)}>
              取消
            </Button>
            <Button 
              className="bg-orange-500 hover:bg-orange-600"
              onClick={handleBatchCustomSubmit}
            >
              一次性提交
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
