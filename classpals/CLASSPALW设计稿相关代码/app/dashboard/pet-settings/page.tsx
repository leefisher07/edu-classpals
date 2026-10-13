"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Gift, Save, Search, Copy } from "lucide-react"
import { cn } from "@/lib/utils"
import { petImageData } from "@/lib/pet-image-data"

const petCatalog = petImageData.map((pet) => ({
  id: pet.id,
  name: pet.name,
  nameEn: pet.category,
  category: pet.category,
  image: pet.stages[0]?.image || "",
  stages: pet.stages,
}))

const catalogCategories = ["全部", ...Array.from(new Set(petCatalog.map((pet) => pet.category)))]

const presetThresholds = {
  fast: [0, 6, 14, 24, 36, 50, 66, 84, 104, 126],
  balanced: [0, 12, 28, 48, 72, 100, 132, 168, 208, 252],
  slow: [0, 20, 45, 75, 110, 150, 195, 245, 300, 360],
}

export default function PetSettingsPage() {
  const [activeTab, setActiveTab] = useState("settings")
  const [selectedPreset, setSelectedPreset] = useState<"fast" | "balanced" | "slow">("balanced")
  const [thresholds, setThresholds] = useState(presetThresholds.balanced)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [catalogFilter, setCatalogFilter] = useState("全部")
  const [catalogSearch, setCatalogSearch] = useState("")
  const [selectedPet, setSelectedPet] = useState<string | null>(null)

  const handlePresetChange = (preset: "fast" | "balanced" | "slow") => {
    setSelectedPreset(preset)
    setThresholds([...presetThresholds[preset]])
  }

  const handleThresholdChange = (index: number, value: string) => {
    const newThresholds = [...thresholds]
    newThresholds[index] = parseInt(value) || 0
    setThresholds(newThresholds)
  }

  const filteredPets = petCatalog.filter(pet => {
    const matchesCategory = catalogFilter === "全部" || pet.category === catalogFilter
    const matchesSearch = pet.name.includes(catalogSearch) ||
                         pet.nameEn.toLowerCase().includes(catalogSearch.toLowerCase()) ||
                         pet.id.includes(catalogSearch)
    return matchesCategory && matchesSearch
  })

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">宠物设置</h1>
          <p className="text-muted-foreground">老师设置与宠物图鉴统一管理</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={activeTab === "settings" ? "default" : "outline"}
            onClick={() => setActiveTab("settings")}
            className={activeTab === "settings" ? "bg-[#f97316] hover:bg-[#ea580c]" : ""}
          >
            老师设置
          </Button>
          <Button
            variant={activeTab === "catalog" ? "default" : "outline"}
            onClick={() => setActiveTab("catalog")}
            className={activeTab === "catalog" ? "bg-[#f97316] hover:bg-[#ea580c]" : ""}
          >
            宠物图鉴
          </Button>
        </div>
      </div>

      {activeTab === "settings" && (
        <div className="space-y-6">
          {/* Referral Card */}
          <Card className="border-[#f97316]/30 bg-[#fff7ed]">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Gift className="w-5 h-5 text-[#f97316]" />
                <div>
                  <h3 className="font-semibold text-[#f97316]">推荐有奖</h3>
                  <p className="text-sm text-muted-foreground">邀请同事注册并购买会员，双方各获得 15 天会员时长</p>
                </div>
              </div>
              <Button className="bg-[#f97316] hover:bg-[#ea580c]">
                <Copy className="w-4 h-4 mr-2" />
                复制邀请链接
              </Button>
            </CardContent>
          </Card>

          {/* Growth Thresholds */}
          <Card>
            <CardHeader>
              <CardTitle className="text-[#f97316]">成长阈值</CardTitle>
              <CardDescription>每个等级需要的累计成长值（仅影响后续新增成长）</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Preset buttons */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">预设档位</span>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(selectedPreset === "fast" && "border-[#f97316] text-[#f97316]")}
                  onClick={() => handlePresetChange("fast")}
                >
                  快速
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(selectedPreset === "balanced" && "border-[#f97316] bg-[#f97316] text-white")}
                  onClick={() => handlePresetChange("balanced")}
                >
                  平衡（默认）
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(selectedPreset === "slow" && "border-[#f97316] text-[#f97316]")}
                  onClick={() => handlePresetChange("slow")}
                >
                  耐玩
                </Button>
              </div>

              {/* Threshold inputs */}
              <div className="grid grid-cols-5 gap-4">
                {thresholds.map((value, index) => (
                  <div key={index}>
                    <label className="text-sm text-muted-foreground">Lv.{index + 1}</label>
                    <Input
                      type="number"
                      value={value}
                      onChange={(e) => handleThresholdChange(index, e.target.value)}
                      className="mt-1"
                    />
                  </div>
                ))}
              </div>

              {/* Sound toggle */}
              <div className="flex items-center justify-between pt-4 border-t">
                <span className="text-[#3b82f6]">加分/扣分音效</span>
                <Switch checked={soundEnabled} onCheckedChange={setSoundEnabled} />
              </div>

              {/* Save button */}
              <div className="flex justify-end">
                <Button className="bg-[#f97316] hover:bg-[#ea580c]">
                  <Save className="w-4 h-4 mr-2" />
                  保存设置
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "catalog" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-[#f97316]">宠物图鉴</CardTitle>
            <CardDescription>点击宠物幼崽查看完整 5 形态进化轨迹</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Catalog header */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-[#f97316]">宠物图鉴目录</h3>
                <p className="text-sm text-muted-foreground">
                  当前 catalog 已录入 {petCatalog.length} 种物种。
                </p>
              </div>
              <div className="relative w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="搜索中文名 / 英文名 / species id"
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Category filter */}
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                {catalogCategories.map((cat) => (
                  <Button
                    key={cat}
                    variant="outline"
                    size="sm"
                    className={cn(
                      catalogFilter === cat && "border-[#f97316] text-[#f97316]"
                    )}
                    onClick={() => setCatalogFilter(cat)}
                  >
                    {cat}
                  </Button>
                ))}
              </div>
              <span className="text-sm text-muted-foreground">显示 {filteredPets.length} 种</span>
            </div>

            {/* Pet grid */}
            <div className="grid grid-cols-5 gap-4">
              {filteredPets.map((pet) => (
                <Card
                  key={pet.id}
                  className={cn(
                    "cursor-pointer transition-all hover:shadow-md",
                    selectedPet === pet.id && "ring-2 ring-[#f97316]"
                  )}
                  onClick={() => setSelectedPet(pet.id)}
                >
                  <CardContent className="p-4">
                    <div className="aspect-square bg-gradient-to-b from-gray-50 to-gray-100 rounded-lg overflow-hidden mb-3">
                      <img
                        src={pet.image}
                        alt={pet.name}
                        className="h-full w-full object-contain p-3"
                      />
                    </div>
                    <h4 className="font-semibold">{pet.name}</h4>
                    <p className="text-sm text-muted-foreground">{pet.nameEn}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
