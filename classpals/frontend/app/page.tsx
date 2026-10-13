"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { AuthHeader } from "@/components/auth/auth-header"
import { LoginForm } from "@/components/auth/login-form"
import { RegisterStep1 } from "@/components/auth/register-step1"
import { RegisterStep2 } from "@/components/auth/register-step2"
import { RegisterStep3 } from "@/components/auth/register-step3"
import { useRouter } from "next/navigation"
import { authApi } from "@/lib/api/auth"
import { useAuthStore } from "@/lib/stores/auth-store"

type RegisterData = {
  phone: string
  password: string
  activationCode: string
}

export default function AuthPage() {
  const router = useRouter()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [activeTab, setActiveTab] = useState<"login" | "register">("login")
  const [registerStep, setRegisterStep] = useState(1)
  const [registerData, setRegisterData] = useState<RegisterData>({
    phone: "",
    password: "",
    activationCode: "",
  })

  const handleStep1Complete = (data: { phone: string; password: string }) => {
    setRegisterData((prev) => ({ ...prev, ...data }))
    setRegisterStep(2)
  }

  const handleStep2Complete = (activationCode: string) => {
    setRegisterData((prev) => ({ ...prev, activationCode }))
    setRegisterStep(3)
  }

  const handleRegisterComplete = async () => {
    try {
      const response = await authApi.register({
        phone: registerData.phone,
        password: registerData.password,
        activationCode: registerData.activationCode,
      })
      setAuth(response.user, response.token, response.refreshToken, response.expiresIn)
      router.push("/dashboard")
    } catch (err: any) {
      alert(err.message || "注册失败，请重试")
    }
  }

  const resetRegister = () => {
    setRegisterStep(1)
    setRegisterData({ phone: "", password: "", activationCode: "" })
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        <Card className="w-full max-w-md overflow-hidden border-0 shadow-xl">
          <AuthHeader />

          <CardContent className="px-6 py-6">
            <Tabs
              value={activeTab}
              onValueChange={(value) => {
                setActiveTab(value as "login" | "register")
                if (value === "register") {
                  resetRegister()
                }
              }}
              className="w-full"
            >
              <TabsList className="w-full grid grid-cols-2 mb-6">
                <TabsTrigger value="login" className="text-base">
                  登录
                </TabsTrigger>
                <TabsTrigger value="register" className="text-base">
                  注册新账号
                </TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="mt-0">
                <LoginForm
                  onForgotPassword={() => alert("TODO: 密码找回流程")}
                  onForgotUsername={() => alert("TODO: 用户名找回流程")}
                />
              </TabsContent>

              <TabsContent value="register" className="mt-0">
                {registerStep === 1 && (
                  <RegisterStep1 onNext={handleStep1Complete} />
                )}
                {registerStep === 2 && (
                  <RegisterStep2
                    onNext={handleStep2Complete}
                    onBack={() => setRegisterStep(1)}
                  />
                )}
                {registerStep === 3 && (
                  <RegisterStep3
                    phone={registerData.phone}
                    activationCode={registerData.activationCode}
                    onConfirm={handleRegisterComplete}
                    onBack={() => setRegisterStep(2)}
                  />
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
        <p className="text-center text-xs text-muted-foreground mt-6">
          &copy; 2026 ClassPals. All rights reserved.
        </p>
      </main>
    </div>
  )
}
