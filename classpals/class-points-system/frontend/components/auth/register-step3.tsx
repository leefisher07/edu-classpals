"use client"

import { useState } from "react"
import { ArrowLeft, CheckCircle2, Phone, KeyRound, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"

interface RegisterStep3Props {
  phone: string
  activationCode: string
  onConfirm: () => void
  onBack: () => void
}

export function RegisterStep3({
  phone,
  activationCode,
  onConfirm,
  onBack,
}: RegisterStep3Props) {
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async () => {
    setIsLoading(true)
    // TODO: 实现注册逻辑
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setIsLoading(false)
    onConfirm()
  }

  return (
    <div>
      {/* 进度条样式的步骤指示器 */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
          <span className="text-primary font-medium">第 3 步，共 3 步</span>
          <span>确认并完成</span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div className="h-full w-full bg-primary rounded-full transition-all" />
        </div>
      </div>

      {/* 成功图标 */}
      <div className="text-center mb-5">
        <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-3">
          <CheckCircle2 className="w-8 h-8 text-green-600" />
        </div>
        <h3 className="text-lg font-semibold text-foreground">信息已就绪</h3>
        <p className="text-sm text-muted-foreground mt-1">请确认以下信息无误</p>
      </div>

      {/* 信息列表 */}
      <div className="space-y-3 mb-6">
        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
          <div className="w-8 h-8 rounded-lg bg-background flex items-center justify-center">
            <Phone className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground">手机号</p>
            <p className="font-medium text-foreground truncate">{phone}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
          <div className="w-8 h-8 rounded-lg bg-background flex items-center justify-center">
            <KeyRound className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground">激活码</p>
            <p className="font-medium text-primary truncate">{activationCode}</p>
          </div>
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="space-y-3">
        <Button
          type="button"
          className="w-full h-12 text-base font-medium"
          onClick={handleSubmit}
          disabled={isLoading}
        >
          {isLoading ? (
            "注册中..."
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-1" />
              完成注册
            </>
          )}
        </Button>
        
        <Button
          type="button"
          variant="ghost"
          className="w-full h-10 text-sm text-muted-foreground"
          onClick={onBack}
          disabled={isLoading}
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          返回修改
        </Button>
      </div>
    </div>
  )
}
