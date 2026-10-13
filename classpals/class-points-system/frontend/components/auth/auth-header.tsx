import { Users } from "lucide-react"

export function AuthHeader() {
  return (
    <div className="w-full bg-gradient-to-br from-primary via-primary to-accent px-6 py-10 text-center relative overflow-hidden">
      {/* 装饰元素 */}
      <div className="absolute top-4 right-4 w-20 h-20 border-2 border-white/20 rounded-full" />
      <div className="absolute bottom-4 left-4 w-12 h-12 border-2 border-white/20 rounded-full" />
      <div className="absolute top-1/2 right-8 w-3 h-3 bg-white/30 rounded-full" />
      <div className="absolute bottom-8 right-1/4 w-2 h-2 bg-white/20 rounded-full" />
      
      {/* Logo 占位符 */}
      <div className="relative w-14 h-14 mx-auto mb-3 bg-white rounded-xl shadow-lg flex items-center justify-center">
        <Users className="w-7 h-7 text-primary" />
      </div>

      {/* 产品名称 */}
      <h1 className="relative text-2xl font-bold text-white mb-3 tracking-tight">ClassPals</h1>
      <div className="relative text-white/95 text-sm leading-relaxed">
        <p>老师的朋友，让管理更简单</p>
        <p>学生的伙伴，让学习更快乐</p>
      </div>
    </div>
  )
}
