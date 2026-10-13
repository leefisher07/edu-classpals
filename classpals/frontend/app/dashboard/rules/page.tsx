"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  Plus,
  Pencil,
  Trash2,
  GripVertical,
  Star,
  BookOpen,
  HandHelping,
  Sparkles,
  AlertTriangle,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { rulesApi } from "@/lib/api/rules"
import { useActiveClass } from "@/lib/hooks/use-active-class"

const categories = [
  { value: "homework", label: "作业", icon: BookOpen },
  { value: "discipline", label: "纪律", icon: AlertTriangle },
  { value: "classroom", label: "课堂表现", icon: Star },
  { value: "helping", label: "互助", icon: HandHelping },
  { value: "other", label: "其他", icon: Sparkles },
]

export default function PointRulesPage() {
  const queryClient = useQueryClient()
  const { activeClassId, isLoading: classLoading } = useActiveClass()

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<any>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [ruleToDelete, setRuleToDelete] = useState<any>(null)

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    points: 1,
    type: "ADD" as "ADD" | "DEDUCT",
    category: "other",
  })

  const { data: rulesData } = useQuery({
    queryKey: ["rules", activeClassId],
    queryFn: () => rulesApi.list(activeClassId!),
    enabled: !!activeClassId,
  })

  const createMutation = useMutation({
    mutationFn: (data: any) => rulesApi.create(activeClassId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rules"] })
      setIsDialogOpen(false)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => rulesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rules"] })
      setIsDialogOpen(false)
    },
  })

  const toggleMutation = useMutation({
    mutationFn: (id: string) => rulesApi.toggle(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rules"] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => rulesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rules"] })
      setDeleteConfirmOpen(false)
      setRuleToDelete(null)
    },
  })

  const rules = Array.isArray(rulesData)
    ? rulesData
    : Array.isArray((rulesData as any)?.data)
      ? (rulesData as any).data
      : (rulesData as any)?.data?.rules || []
  const addRules = rules.filter((r: any) => r.type === "ADD")
  const deductRules = rules.filter((r: any) => r.type === "DEDUCT")

  const handleOpenDialog = (rule?: any) => {
    if (rule) {
      setEditingRule(rule)
      setFormData({
        name: rule.name,
        points: rule.points,
        type: rule.type,
        category: rule.category || "other",
      })
    } else {
      setEditingRule(null)
      setFormData({
        name: "",
        points: 1,
        type: "ADD",
        category: "other",
      })
    }
    setIsDialogOpen(true)
  }

  const handleSaveRule = () => {
    if (!formData.name.trim()) return

    if (editingRule) {
      updateMutation.mutate({
        id: editingRule.id,
        data: formData,
      })
    } else {
      createMutation.mutate(formData)
    }
  }

  const handleToggleRule = (ruleId: string) => {
    toggleMutation.mutate(ruleId)
  }

  const handleDeleteRule = () => {
    if (ruleToDelete) {
      deleteMutation.mutate(ruleToDelete.id)
    }
  }

  const getCategoryIcon = (category: string) => {
    const cat = categories.find((c) => c.value === category)
    if (cat) {
      const Icon = cat.icon
      return <Icon className="w-4 h-4" />
    }
    return <Sparkles className="w-4 h-4" />
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
    <div className="min-h-full bg-muted/20">
      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6 px-4 py-6 lg:px-8">
        <div className="overflow-hidden rounded-3xl border bg-card shadow-sm">
          <div className="flex flex-col gap-5 p-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Star className="h-7 w-7" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">积分规则设置</h1>
                <p className="mt-1 text-sm text-muted-foreground">管理班级的加分和扣分规则</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm text-emerald-700">加分 {addRules.length}</span>
              <span className="rounded-full bg-red-50 px-3 py-1 text-sm text-red-700">扣分 {deductRules.length}</span>
              <Button
                onClick={() => handleOpenDialog()}
                size="lg"
                className="h-11 rounded-xl shadow-sm"
              >
                <Plus className="w-5 h-5 mr-2" />
                添加规则
              </Button>
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <Card className="overflow-hidden rounded-3xl border bg-card shadow-sm">
            <CardHeader className="border-b bg-muted/30 pb-5">
              <CardTitle className="flex items-center gap-3 text-lg">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <p>加分规则</p>
                  <p className="mt-1 text-sm font-normal text-muted-foreground">课堂表现、作业、互助等正向激励</p>
                </div>
                <Badge variant="secondary" className="ml-auto rounded-full">
                  {addRules.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <div className="space-y-3">
                {addRules.map((rule: any) => (
                <div
                  key={rule.id}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl border p-4 transition-colors",
                    rule.isEnabled ? "bg-card" : "bg-muted/50 opacity-60"
                  )}
                >
                  <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                    {getCategoryIcon(rule.category)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground">{rule.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {categories.find((c) => c.value === rule.category)?.label || "其他"}
                    </p>
                  </div>
                  <Badge className="rounded-full bg-emerald-500 px-3 py-1 hover:bg-emerald-600">+{rule.points}</Badge>
                  <Switch checked={rule.isEnabled} onCheckedChange={() => handleToggleRule(rule.id)} />
                  <Button variant="ghost" size="icon" className="rounded-xl" onClick={() => handleOpenDialog(rule)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-xl"
                    onClick={() => {
                      setRuleToDelete(rule)
                      setDeleteConfirmOpen(true)
                    }}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              ))}
              {addRules.length === 0 && (
                <div className="rounded-2xl border border-dashed bg-muted/20 px-6 py-10 text-center text-muted-foreground">
                  暂无加分规则，点击上方按钮添加
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden rounded-3xl border bg-card shadow-sm">
          <CardHeader className="border-b bg-muted/30 pb-5">
            <CardTitle className="flex items-center gap-3 text-lg">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-50 text-red-600">
                <X className="w-5 h-5" />
              </div>
              <div>
                <p>扣分规则</p>
                <p className="mt-1 text-sm font-normal text-muted-foreground">纪律、课堂行为等负向约束</p>
              </div>
              <Badge variant="secondary" className="ml-auto rounded-full">
                {deductRules.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5">
            <div className="space-y-3">
              {deductRules.map((rule: any) => (
                <div
                  key={rule.id}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl border p-4 transition-colors",
                    rule.isEnabled ? "bg-card" : "bg-muted/50 opacity-60"
                  )}
                >
                  <GripVertical className="w-4 h-4 cursor-grab text-muted-foreground" />
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
                    {getCategoryIcon(rule.category)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground">{rule.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {categories.find((c) => c.value === rule.category)?.label || "其他"}
                    </p>
                  </div>
                  <Badge className="rounded-full bg-red-500 px-3 py-1 text-white hover:bg-red-600">-{rule.points}</Badge>
                  <Switch checked={rule.isEnabled} onCheckedChange={() => handleToggleRule(rule.id)} />
                  <Button variant="ghost" size="icon" className="rounded-xl" onClick={() => handleOpenDialog(rule)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-xl"
                    onClick={() => {
                      setRuleToDelete(rule)
                      setDeleteConfirmOpen(true)
                    }}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              ))}
              {deductRules.length === 0 && (
                <div className="rounded-2xl border border-dashed bg-muted/20 px-6 py-10 text-center text-muted-foreground">
                  暂无扣分规则，点击上方按钮添加
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="rounded-3xl border bg-card p-0 shadow-xl sm:max-w-lg">
          <DialogHeader className="border-b px-6 py-5">
            <DialogTitle className="text-xl font-semibold">{editingRule ? "编辑规则" : "添加规则"}</DialogTitle>
            <DialogDescription className="pt-1">
              {editingRule ? "修改积分规则的详细信息" : "创建一个新的积分规则"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 px-6 py-5">
            <div className="space-y-3">
              <Label>规则名称</Label>
              <Input
                className="h-11 rounded-xl"
                placeholder="例如：作业全对"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-3">
                <Label>规则类型</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: "ADD" | "DEDUCT") => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger className="h-11 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ADD">加分</SelectItem>
                    <SelectItem value="DEDUCT">扣分</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-3">
                <Label>分值</Label>
                <Input
                  className="h-11 rounded-xl"
                  type="number"
                  min={1}
                  value={formData.points}
                  onChange={(e) => setFormData({ ...formData, points: parseInt(e.target.value) || 1 })}
                />
              </div>
            </div>
            <div className="space-y-3">
              <Label>分类</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      <div className="flex items-center gap-2">
                        <cat.icon className="w-4 h-4" />
                        {cat.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="border-t px-6 py-5">
            <Button variant="outline" className="rounded-xl" onClick={() => setIsDialogOpen(false)}>
              取消
            </Button>
            <Button className="rounded-xl" onClick={handleSaveRule} disabled={!formData.name.trim()}>
              {editingRule ? "保存修改" : "确认添加"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="rounded-3xl border bg-card p-0 shadow-xl sm:max-w-md">
          <DialogHeader className="border-b px-6 py-5">
            <DialogTitle className="text-xl font-semibold">删除规则确认</DialogTitle>
            <DialogDescription className="pt-1">确定要删除规则「{ruleToDelete?.name}」吗？此操作无法撤销。</DialogDescription>
          </DialogHeader>
          <DialogFooter className="px-6 py-5">
            <Button variant="outline" className="rounded-xl" onClick={() => setDeleteConfirmOpen(false)}>
              取消
            </Button>
            <Button
              onClick={handleDeleteRule}
              className="rounded-xl bg-red-500 text-white hover:bg-red-600"
            >
              确定
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  )
}
