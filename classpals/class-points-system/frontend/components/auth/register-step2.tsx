"use client"

import { useState } from "react"
import { KeyRound, ArrowRight, ArrowLeft, Gift } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"

interface RegisterStep2Props {
  onNext: (activationCode: string) => void
  onBack: () => void
}

export function RegisterStep2({ onNext, onBack }: RegisterStep2Props) {
  const [activationCode, setActivationCode] = useState("")
  const [error, setError] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!activationCode.trim()) {
      setError("请输入使用授权码")
      return
    }

    if (activationCode.length < 8) {
      setError("使用授权码格式不正确")
      return
    }

    setError("")
    onNext(activationCode)
  }

  return (
    <div>
      {/* 进度条样式的步骤指示器 */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
          <span className="text-primary font-medium">第 2 步，共 3 步</span>
          <span>输入使用授权码</span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div className="h-full w-2/3 bg-primary rounded-full transition-all" />
        </div>
      </div>

      {/* 使用授权码说明卡片 */}
      <div className="bg-secondary/50 rounded-xl p-4 mb-5 flex gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Gift className="w-5 h-5 text-primary" />
        </div>
        <div className="text-sm">
          <p className="font-medium text-foreground mb-1">什么是使用授权码？</p>
          <p className="text-muted-foreground leading-relaxed">
            使用授权码用于开通您的 ClassPals 使用许可，每个授权码仅可使用一次。
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <FieldGroup>
          <Field>
            <FieldLabel className="text-sm font-medium text-foreground">使用授权码</FieldLabel>
            <InputGroup>
              <InputGroupAddon>
                <KeyRound className="w-4 h-4" />
              </InputGroupAddon>
              <InputGroupInput
                type="text"
                placeholder="请输入使用授权码"
                value={activationCode}
                onChange={(e) => setActivationCode(e.target.value.toUpperCase())}
                aria-invalid={!!error}
                className="tracking-wider"
              />
            </InputGroup>
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </Field>

          <div className="grid grid-cols-2 gap-3 mt-2">
            <Button
              type="button"
              variant="outline"
              className="h-12 text-base font-medium"
              onClick={onBack}
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              返回
            </Button>
            <Button type="submit" className="h-12 text-base font-medium">
              继续
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </FieldGroup>
      </form>
    </div>
  )
}
