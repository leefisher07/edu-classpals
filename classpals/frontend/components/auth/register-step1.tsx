"use client"

import { useState } from "react"
import { Phone, Lock, ArrowRight, Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"

interface RegisterStep1Props {
  onNext: (data: { phone: string; password: string }) => void
}

export function RegisterStep1({ onNext }: RegisterStep1Props) {
  const [phone, setPhone] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [errors, setErrors] = useState<{
    phone?: string
    password?: string
    confirmPassword?: string
  }>({})

  // 密码强度检查
  const passwordChecks = {
    length: password.length >= 6,
    hasLetter: /[a-zA-Z]/.test(password),
    hasNumber: /\d/.test(password),
  }

  const validate = () => {
    const newErrors: typeof errors = {}

    if (!phone) {
      newErrors.phone = "请输入手机号"
    } else if (!/^1\d{10}$/.test(phone)) {
      newErrors.phone = "请输入有效的手机号"
    }

    if (!password) {
      newErrors.password = "请输入密码"
    } else if (password.length < 6) {
      newErrors.password = "密码至少6位字符"
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = "请再次输入密码"
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = "两次密码输入不一致"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (validate()) {
      onNext({ phone, password })
    }
  }

  return (
    <div>
      {/* 进度条样式的步骤指示器 */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
          <span className="text-primary font-medium">第 1 步，共 3 步</span>
          <span>填写账号信息</span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div className="h-full w-1/3 bg-primary rounded-full transition-all" />
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <FieldGroup>
          {/* 手机号输入 - 简洁样式 */}
          <Field>
            <FieldLabel className="text-sm font-medium text-foreground">手机号</FieldLabel>
            <InputGroup>
              <InputGroupAddon>
                <Phone className="w-4 h-4" />
              </InputGroupAddon>
              <InputGroupInput
                type="tel"
                placeholder="请输入11位手机号"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                maxLength={11}
                aria-invalid={!!errors.phone}
              />
            </InputGroup>
            {errors.phone && (
              <p className="text-sm text-destructive">{errors.phone}</p>
            )}
          </Field>

          {/* 密码输入 */}
          <Field>
            <FieldLabel className="text-sm font-medium text-foreground">设置密码</FieldLabel>
            <InputGroup>
              <InputGroupAddon>
                <Lock className="w-4 h-4" />
              </InputGroupAddon>
              <InputGroupInput
                type="password"
                placeholder="请输入密码"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                aria-invalid={!!errors.password}
              />
            </InputGroup>
            {errors.password ? (
              <p className="text-sm text-destructive">{errors.password}</p>
            ) : password.length > 0 && (
              <div className="flex flex-wrap gap-3 mt-2">
                <PasswordCheck passed={passwordChecks.length} label="至少6位" />
                <PasswordCheck passed={passwordChecks.hasLetter} label="包含字母" />
                <PasswordCheck passed={passwordChecks.hasNumber} label="包含数字" />
              </div>
            )}
          </Field>

          {/* 确认密码 */}
          <Field>
            <FieldLabel className="text-sm font-medium text-foreground">确认密码</FieldLabel>
            <InputGroup>
              <InputGroupAddon>
                <Lock className="w-4 h-4" />
              </InputGroupAddon>
              <InputGroupInput
                type="password"
                placeholder="请再次输入密码"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                aria-invalid={!!errors.confirmPassword}
              />
            </InputGroup>
            {errors.confirmPassword ? (
              <p className="text-sm text-destructive">{errors.confirmPassword}</p>
            ) : confirmPassword.length > 0 && password === confirmPassword && (
              <p className="text-sm text-green-600 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />
                密码匹配
              </p>
            )}
          </Field>

          <Button type="submit" className="w-full h-12 text-base font-medium mt-2">
            继续
            <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </FieldGroup>
      </form>
    </div>
  )
}

function PasswordCheck({ passed, label }: { passed: boolean; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1 text-xs ${passed ? 'text-green-600' : 'text-muted-foreground'}`}>
      {passed ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
      {label}
    </span>
  )
}
