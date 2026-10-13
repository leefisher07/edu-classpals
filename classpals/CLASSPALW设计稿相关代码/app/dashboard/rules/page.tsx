"use client"

import { useState } from "react"
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
  Check,
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

interface PointRule {
  id: string
  name: string
  points: number
  type: "add" | "deduct"
  category: string
  icon: string
  enabled: boolean
}

const categories = [
  { value: "homework", label: "作业", icon: BookOpen },
  { value: "discipline", label: "纪律", icon: AlertTriangle },
  { value: "classroom", label: "课堂表现", icon: Star },
  { value: "helping", label: "互助", icon: HandHelping },
  { value: "other", label: "其他", icon: Sparkles },
]

const defaultRules: PointRule[] = [
  { id: "1", name: "作业全对", points: 2, type: "add", category: "homework", icon: "BookOpen", enabled: true },
  { id: "2", name: "作业优秀", points: 1, type: "add", category: "homework", icon: "BookOpen", enabled: true },
  { id: "3", name: "作业未完成", points: 1, type: "deduct", category: "homework", icon: "BookOpen", enabled: true },
  { id: "4", name: "积极发言", points: 1, type: "add", category: "classroom", icon: "Star", enabled: true },
  { id: "5", name: "回答正确", points: 2, type: "add", category: "classroom", icon: "Star", enabled: true },
  { id: "6", name: "课堂违纪", points: 1, type: "deduct", category: "discipline", icon: "AlertTriangle", enabled: true },
  { id: "7", name: "迟到", points: 1, type: "deduct", category: "discipline", icon: "AlertTriangle", enabled: true },
  { id: "8", name: "帮助同学", points: 1, type: "add", category: "helping", icon: "HandHelping", enabled: true },
  { id: "9", name: "值日认真", points: 1, type: "add", category: "other", icon: "Sparkles", enabled: true },
]

export default function PointRulesPage() {
  const [rules, setRules] = useState<PointRule[]>(defaultRules)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<PointRule | null>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [ruleToDelete, setRuleToDelete] = useState<PointRule | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    points: 1,
    type: "add" as "add" | "deduct",
    category: "other",
  })

  const handleOpenDialog = (rule?: PointRule) => {
    if (rule) {
      setEditingRule(rule)
      setFormData({
        name: rule.name,
        points: rule.points,
        type: rule.type,
        category: rule.category,
      })
    } else {
      setEditingRule(null)
      setFormData({
        name: "",
        points: 1,
        type: "add",
        category: "other",
      })
    }
    setIsDialogOpen(true)
  }

  const handleSaveRule = () => {
    if (!formData.name.trim()) return

    if (editingRule) {
      setRules(rules.map(r => 
        r.id === editingRule.id
          ? { ...r, ...formData, icon: categories.find(c => c.value === formData.category)?.icon.name || "Sparkles" }
          : r
      ))
    } else {
      const newRule: PointRule = {
        id: Date.now().toString(),
        ...formData,
        icon: categories.find(c => c.value === formData.category)?.icon.name || "Sparkles",
        enabled: true,
      }
      setRules([...rules, newRule])
    }
    setIsDialogOpen(false)
  }

  const handleToggleRule = (ruleId: string) => {
    setRules(rules.map(r => 
      r.id === ruleId ? { ...r, enabled: !r.enabled } : r
    ))
  }

  const handleDeleteRule = () => {
    if (ruleToDelete) {
      setRules(rules.filter(r => r.id !== ruleToDelete.id))
      setDeleteConfirmOpen(false)
      setRuleToDelete(null)
    }
  }

  const addRules = rules.filter(r => r.type === "add")
  const deductRules = rules.filter(r => r.type === "deduct")

  const getCategoryIcon = (category: string) => {
    const cat = categories.find(c => c.value === category)
    if (cat) {
      const Icon = cat.icon
      return <Icon className="w-4 h-4" />
    }
    return <Sparkles className="w-4 h-4" />
  }

  return (
    <div className="flex-1 p-6 overflow-auto">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">积分规则设置</h1>
            <p className="text-muted-foreground mt-1">管理班级的加分和扣分规则</p>
          </div>
          <Button onClick={() => handleOpenDialog()} className="gap-2">
            <Plus className="w-4 h-4" />
            添加规则
          </Button>
        </div>

        {/* Add Rules */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                <Plus className="w-4 h-4 text-emerald-600" />
              </div>
              加分规则
              <Badge variant="secondary" className="ml-2">{addRules.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {addRules.map((rule) => (
                <div
                  key={rule.id}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border transition-colors",
                    rule.enabled ? "bg-card" : "bg-muted/50 opacity-60"
                  )}
                >
                  <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center",
                    "bg-emerald-100 text-emerald-600"
                  )}>
                    {getCategoryIcon(rule.category)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{rule.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {categories.find(c => c.value === rule.category)?.label}
                    </p>
                  </div>
                  <Badge className="bg-emerald-500 hover:bg-emerald-600">
                    +{rule.points}
                  </Badge>
                  <Switch
                    checked={rule.enabled}
                    onCheckedChange={() => handleToggleRule(rule.id)}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleOpenDialog(rule)}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
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
                <div className="text-center py-8 text-muted-foreground">
                  暂无加分规则，点击上方按钮添加
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Deduct Rules */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                <X className="w-4 h-4 text-red-600" />
              </div>
              扣分规则
              <Badge variant="secondary" className="ml-2">{deductRules.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {deductRules.map((rule) => (
                <div
                  key={rule.id}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border transition-colors",
                    rule.enabled ? "bg-card" : "bg-muted/50 opacity-60"
                  )}
                >
                  <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center",
                    "bg-red-100 text-red-600"
                  )}>
                    {getCategoryIcon(rule.category)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{rule.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {categories.find(c => c.value === rule.category)?.label}
                    </p>
                  </div>
                  <Badge variant="destructive">
                    -{rule.points}
                  </Badge>
                  <Switch
                    checked={rule.enabled}
                    onCheckedChange={() => handleToggleRule(rule.id)}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleOpenDialog(rule)}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
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
                <div className="text-center py-8 text-muted-foreground">
                  暂无扣分规则，点击上方按钮添加
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add/Edit Rule Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingRule ? "编辑规则" : "添加规则"}</DialogTitle>
            <DialogDescription>
              {editingRule ? "修改积分规则的详细信息" : "创建一个新的积分规则"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>规则名称</Label>
              <Input
                placeholder="例如：作业全对"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>规则类型</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: "add" | "deduct") => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="add">加分</SelectItem>
                    <SelectItem value="deduct">扣分</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>分值</Label>
                <Input
                  type="number"
                  min={1}
                  value={formData.points}
                  onChange={(e) => setFormData({ ...formData, points: parseInt(e.target.value) || 1 })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>分类</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger>
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSaveRule} disabled={!formData.name.trim()}>
              {editingRule ? "保存修改" : "确认添加"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>删除规则确认</DialogTitle>
            <DialogDescription>
              确定要删除规则「{ruleToDelete?.name}」吗？此操作无法撤销。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
              取消
            </Button>
            <Button variant="destructive" onClick={handleDeleteRule}>
              确定删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
