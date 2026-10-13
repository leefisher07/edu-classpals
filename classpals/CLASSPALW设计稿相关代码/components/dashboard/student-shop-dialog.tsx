"use client"

import { useState } from "react"
import { ShoppingCart, Gift, Ticket } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { Student } from "@/lib/mock-data"

// 模拟商品数据
const mockProducts = [
  { id: "1", name: "一支笔", price: 1, stock: 100 },
  { id: "2", name: "一个笔记本", price: 3, stock: 5 },
  { id: "3", name: "小零食", price: 5, stock: 20 },
  { id: "4", name: "免作业券", price: 10, stock: 3 },
]

// 模拟兑换记录
const mockExchangeRecords: {
  id: string
  productName: string
  price: number
  timestamp: string
}[] = []

interface StudentShopDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  student: Student | null
  onExchange?: (productId: string) => void
}

export function StudentShopDialog({
  open,
  onOpenChange,
  student,
  onExchange,
}: StudentShopDialogProps) {
  const [activeTab, setActiveTab] = useState<"products" | "records">("products")

  if (!student) return null

  const canExchange = (price: number) => student.availablePoints >= price

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-primary" />
            {student.name} 的个人商店
          </DialogTitle>
        </DialogHeader>

        {/* 可用积分和标签切换 */}
        <div className="flex items-center justify-between">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-orange-200 bg-orange-50 text-orange-600 text-sm">
            <Ticket className="w-4 h-4" />
            可用积分 {student.availablePoints}
          </div>
          <div className="flex gap-2">
            <button
              className={cn(
                "px-4 py-1.5 rounded-md text-sm font-medium border transition-colors",
                activeTab === "products"
                  ? "border-primary text-primary bg-primary/5"
                  : "border-border hover:bg-muted"
              )}
              onClick={() => setActiveTab("products")}
            >
              商品兑换
            </button>
            <button
              className={cn(
                "px-4 py-1.5 rounded-md text-sm font-medium border transition-colors",
                activeTab === "records"
                  ? "border-primary text-primary bg-primary/5"
                  : "border-border hover:bg-muted"
              )}
              onClick={() => setActiveTab("records")}
            >
              兑换记录
            </button>
          </div>
        </div>

        {/* 内容区域 */}
        <div className="min-h-[280px] max-h-[350px] overflow-auto">
          {activeTab === "products" ? (
            <div className="space-y-3">
              {mockProducts.map((product) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between p-4 rounded-lg border"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Gift className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{product.name}</p>
                      <p className="text-sm text-muted-foreground">
                        库存：{product.stock}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-primary">
                      {product.price}分
                    </span>
                    {canExchange(product.price) ? (
                      <Button
                        size="sm"
                        onClick={() => onExchange?.(product.id)}
                      >
                        兑换
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" disabled>
                        积分不足
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {mockExchangeRecords.length > 0 ? (
                mockExchangeRecords.map((record) => (
                  <div
                    key={record.id}
                    className="flex items-center justify-between p-4 rounded-lg border"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Gift className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{record.productName}</p>
                        <p className="text-sm text-muted-foreground">
                          {record.timestamp}
                        </p>
                      </div>
                    </div>
                    <span className="font-bold text-red-500">
                      -{record.price}分
                    </span>
                  </div>
                ))
              ) : (
                <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                  暂无兑换记录
                </div>
              )}
            </div>
          )}
        </div>

        {/* 底部提示 */}
        <div className="flex items-center justify-between pt-4 border-t">
          <p className="text-sm text-muted-foreground">
            兑换后将自动扣减可用积分并记录流水
          </p>
          <Button onClick={() => onOpenChange(false)}>关闭</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
