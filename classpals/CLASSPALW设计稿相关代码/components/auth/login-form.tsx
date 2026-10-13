"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Phone, Lock, ArrowRight, HelpCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface LoginFormProps {
  onForgotPassword?: () => void
  onForgotUsername?: () => void
}

// 测试账号
const TEST_PHONE = "1234567"
const TEST_PASSWORD = "123456"

export function LoginForm({ onForgotPassword, onForgotUsername }: LoginFormProps) {
  const router = useRouter()
  const [phone, setPhone] = useState(TEST_PHONE)
  const [password, setPassword] = useState(TEST_PASSWORD)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)
    
    // 模拟登录验证
    await new Promise((resolve) => setTimeout(resolve, 800))
    
    if (phone === TEST_PHONE && password === TEST_PASSWORD) {
      router.push("/dashboard/students")
    } else {
      setError("手机号或密码错误，请使用测试账号：1234567 / 123456")
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <FieldGroup>
        {error && (
          <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-lg">
            {error}
          </div>
        )}
        <Field>
          <FieldLabel className="sr-only">手机号</FieldLabel>
          <InputGroup>
            <InputGroupAddon>
              <Phone className="w-4 h-4" />
            </InputGroupAddon>
            <InputGroupInput
              type="tel"
              placeholder="请输入手机号"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              maxLength={11}
            />
          </InputGroup>
        </Field>

        <Field>
          <FieldLabel className="sr-only">密码</FieldLabel>
          <InputGroup>
            <InputGroupAddon>
              <Lock className="w-4 h-4" />
            </InputGroupAddon>
            <InputGroupInput
              type="password"
              placeholder="请输入密码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </InputGroup>
        </Field>

        <Button
          type="submit"
          className="w-full h-12 text-base font-medium"
          disabled={isLoading}
        >
          {isLoading ? "登录中..." : "立即登录"}
          {!isLoading && <ArrowRight className="w-4 h-4 ml-1" />}
        </Button>

        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                遇到问题？
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={onForgotPassword}>
                找回密码
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onForgotUsername}>
                找回用户名
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </FieldGroup>
    </form>
  )
}
