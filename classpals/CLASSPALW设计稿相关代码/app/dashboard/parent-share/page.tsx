"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { ArrowLeft, RefreshCw, Copy, RotateCcw, Ban, Link2, AlertCircle, Smartphone } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

const mockStudents = [
  { id: "1", name: "张三" },
  { id: "2", name: "李四" },
  { id: "3", name: "王五" },
  { id: "4", name: "赵六" },
  { id: "5", name: "陈静" },
]

interface ShareConfig {
  studentId: string
  status: "generated" | "not_generated" | "disabled"
  expiresAt: string | null
  validityDays: number | "custom"
  customDays: number
  allowClassRanking: boolean
  hideDeductions: boolean
  shareUrl: string | null
  parentPhones: { slot: number; phone: string | null }[]
}

export default function ParentSharePage() {
  const [config, setConfig] = useState<ShareConfig>({
    studentId: "1",
    status: "generated",
    expiresAt: "2026/4/15 23:59:59",
    validityDays: 30,
    customDays: 30,
    allowClassRanking: true,
    hideDeductions: false,
    shareUrl: "https://www.classpoints.top/parent/share/322cdfe30b2e02714dce7a53",
    parentPhones: [
      { slot: 1, phone: null },
      { slot: 2, phone: null },
    ],
  })

  const selectedStudent = mockStudents.find((s) => s.id === config.studentId)

  const handleGenerateLink = () => {
    const randomId = Math.random().toString(36).substring(2, 15)
    const expiryDate = new Date()
    const days = config.validityDays === "custom" ? config.customDays : config.validityDays
    expiryDate.setDate(expiryDate.getDate() + days)

    setConfig({
      ...config,
      status: "generated",
      expiresAt: expiryDate.toLocaleString("zh-CN", {
        year: "numeric",
        month: "numeric",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
      shareUrl: `https://www.classpoints.top/parent/share/${randomId}`,
    })
  }

  const handleCopyLink = () => {
    if (config.shareUrl) {
      navigator.clipboard.writeText(config.shareUrl)
    }
  }

  const handleResetLink = () => {
    handleGenerateLink()
  }

  const handleDisableLink = () => {
    setConfig({
      ...config,
      status: "disabled",
      shareUrl: null,
      expiresAt: null,
    })
  }

  const validityOptions = [
    { value: 7, label: "7天" },
    { value: 30, label: "30天" },
    { value: 90, label: "90天" },
    { value: "custom", label: "自定义" },
  ]

  return (
    <div className="flex-1 overflow-auto bg-muted/30">
      <div className="p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded">v2.0.3 家长分享</span>
            </div>
            <h1 className="text-2xl font-bold text-foreground">分享给家长查看孩子成长</h1>
            <p className="text-muted-foreground mt-1">生成学生专属链接，控制有效期、班级排行和扣分记录展示。</p>
          </div>
          <Link href="/dashboard/pet-settings">
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              返回宠物设置
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Settings */}
          <div className="space-y-6">
            {/* Student Selection & Status */}
            <Card>
              <CardContent className="p-6">
                <div className="grid grid-cols-2 gap-6">
                  {/* Select Student */}
                  <div>
                    <label className="text-sm text-muted-foreground mb-2 block">选择学生</label>
                    <Select
                      value={config.studentId}
                      onValueChange={(value) => setConfig({ ...config, studentId: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {mockStudents.map((student) => (
                          <SelectItem key={student.id} value={student.id}>
                            {student.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Current Status */}
                  <div>
                    <label className="text-sm text-muted-foreground mb-2 block">当前状态</label>
                    <div>
                      <span
                        className={cn(
                          "font-medium",
                          config.status === "generated" && "text-blue-600",
                          config.status === "not_generated" && "text-muted-foreground",
                          config.status === "disabled" && "text-red-600"
                        )}
                      >
                        {config.status === "generated" && "已生成"}
                        {config.status === "not_generated" && "未生成"}
                        {config.status === "disabled" && "已停用"}
                      </span>
                      {config.expiresAt && (
                        <p className="text-sm text-muted-foreground mt-1">有效至 {config.expiresAt}</p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Validity Period */}
            <Card>
              <CardContent className="p-6">
                <label className="text-sm font-medium mb-3 block">分享有效期</label>
                <div className="flex items-center gap-3">
                  {validityOptions.map((option) => (
                    <Button
                      key={option.value}
                      variant={config.validityDays === option.value ? "default" : "outline"}
                      className={cn(
                        "px-4",
                        config.validityDays === option.value && "bg-orange-500 hover:bg-orange-600 text-white"
                      )}
                      onClick={() =>
                        setConfig({ ...config, validityDays: option.value as number | "custom" })
                      }
                    >
                      {option.label}
                    </Button>
                  ))}
                  {config.validityDays === "custom" && (
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={config.customDays}
                        onChange={(e) => setConfig({ ...config, customDays: parseInt(e.target.value) || 1 })}
                        className="w-20"
                        min={1}
                        max={365}
                      />
                      <span className="text-sm text-muted-foreground">天</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Permission Settings */}
            <Card>
              <CardContent className="p-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">允许查看全班排行</span>
                      <Switch
                        checked={config.allowClassRanking}
                        onCheckedChange={(checked) => setConfig({ ...config, allowClassRanking: checked })}
                      />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {config.allowClassRanking ? "已开启" : "已关闭"}
                    </p>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">隐藏扣分记录</span>
                      <Switch
                        checked={config.hideDeductions}
                        onCheckedChange={(checked) => setConfig({ ...config, hideDeductions: checked })}
                      />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {config.hideDeductions ? "家长页隐藏扣分" : "家长页展示完整记录"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3 flex-wrap">
                  <Button
                    className="bg-orange-500 hover:bg-orange-600 text-white"
                    onClick={handleGenerateLink}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    更新链接
                  </Button>
                  <Button variant="outline" onClick={handleCopyLink} disabled={!config.shareUrl}>
                    <Copy className="w-4 h-4 mr-2" />
                    复制链接
                  </Button>
                  <Button variant="outline" onClick={handleResetLink} disabled={!config.shareUrl}>
                    <RotateCcw className="w-4 h-4 mr-2" />
                    重置链接
                  </Button>
                  <Button
                    variant="outline"
                    className="text-red-600 hover:text-red-700"
                    onClick={handleDisableLink}
                    disabled={config.status !== "generated"}
                  >
                    <Ban className="w-4 h-4 mr-2" />
                    停用链接
                  </Button>
                </div>

                {config.status === "generated" && (
                  <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <p className="text-orange-600 text-sm font-medium">分享链接已生成</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Preview & Binding */}
          <div className="space-y-6">
            {/* Link Preview */}
            <Card>
              <CardContent className="p-6">
                <h3 className="font-medium mb-4">链接预览</h3>
                {config.shareUrl ? (
                  <div className="p-3 bg-blue-600 rounded-lg">
                    <p className="text-white text-sm break-all font-mono">{config.shareUrl}</p>
                  </div>
                ) : (
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-muted-foreground text-sm">暂无链接</p>
                  </div>
                )}

                <div className="flex items-center gap-2 mt-4 text-sm text-muted-foreground">
                  <Link2 className="w-4 h-4" />
                  <span>状态：</span>
                  <span
                    className={cn(
                      config.status === "generated" && "text-blue-600",
                      config.status === "not_generated" && "text-muted-foreground",
                      config.status === "disabled" && "text-red-600"
                    )}
                  >
                    {config.status === "generated" && "已生成"}
                    {config.status === "not_generated" && "未生成"}
                    {config.status === "disabled" && "已停用"}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Parent Phone Binding */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Smartphone className="w-5 h-5 text-orange-500" />
                  <h3 className="font-medium">已绑定家长手机号</h3>
                </div>

                <div className="space-y-4">
                  {config.parentPhones.map((slot) => (
                    <div key={slot.slot} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">槽位 {slot.slot}</p>
                          <p className="font-medium mt-1">{slot.phone || "未绑定"}</p>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        家长首次访问时会自动绑定，老师也可在学生编辑中修改
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Notice */}
            <Card className="border-orange-200 bg-orange-50">
              <CardContent className="p-4">
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="text-orange-800 font-medium">
                      公开家长页只读，不会修改积分、宠物成长或兑换记录。
                    </p>
                    <p className="text-orange-600 mt-1">
                      "隐藏扣分记录"只影响家长页展示，不影响老师端数据。
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
