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
import { authApi } from "@/lib/api/auth"
import { useAuthStore } from "@/lib/stores/auth-store"

interface LoginFormProps {
  onForgotPassword?: () => void
  onForgotUsername?: () => void
}

export function LoginForm({ onForgotPassword, onForgotUsername }: LoginFormProps) {
  const router = useRouter()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [phone, setPhone] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)
    try {
      const response = await authApi.login({ phone, password })
      setAuth(response.user, response.token, response.refreshToken, response.expiresIn)
      router.push("/dashboard")
    } catch (err: any) {
      setError(err.message || "手机号或密码错误")
    } finally {
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
