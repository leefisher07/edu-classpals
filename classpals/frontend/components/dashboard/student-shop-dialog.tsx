"use client"

import { useState } from "react"
import { ShoppingCart, Gift, Ticket } from "lucide-react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { shopApi } from "@/lib/api/shop"
import { toast } from "sonner"
import type { Student } from "@/lib/mock-data"

interface StudentShopDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  student: Student | null
  classId?: string
  onExchange?: (productId: string) => void
}

export function StudentShopDialog({
  open,
  onOpenChange,
  student,
  classId,
}: StudentShopDialogProps) {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<"products" | "records">("products")

  const { data: itemsData } = useQuery({
    queryKey: ['shop-items', classId],
    queryFn: () => shopApi.listItems(classId!),
    enabled: !!classId && open,
  })

  const { data: exchangesData } = useQuery({
    queryKey: ['student-exchanges', student?.id],
    queryFn: () => shopApi.getStudentExchanges(student?.id!, { page: 1, limit: 100 }),
    enabled: !!student?.id && open && activeTab === 'records',
  })

  const exchangeMutation = useMutation({
    mutationFn: (itemId: string) => shopApi.exchange(student?.id!, itemId),
    onSuccess: () => {
      toast.success('兑换成功')
      queryClient.invalidateQueries({ queryKey: ['shop-items'] })
      queryClient.invalidateQueries({ queryKey: ['student-exchanges'] })
      queryClient.invalidateQueries({ queryKey: ['students'] })
      queryClient.invalidateQueries({ queryKey: ['shop-exchanges'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-overview'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-ranking'] })
    },
    onError: (error: any) => {
      toast.error(error?.message || '兑换失败')
    },
  })

  if (!student) return null

  const items = Array.isArray(itemsData)
    ? itemsData
    : Array.isArray((itemsData as any)?.items)
      ? (itemsData as any).items
      : Array.isArray((itemsData as any)?.data)
        ? (itemsData as any).data
        : Array.isArray((itemsData as any)?.data?.items)
          ? (itemsData as any).data.items
          : []
  const exchanges = Array.isArray(exchangesData)
    ? exchangesData
    : Array.isArray((exchangesData as any)?.exchanges)
      ? (exchangesData as any).exchanges
      : Array.isArray((exchangesData as any)?.data)
        ? (exchangesData as any).data
        : Array.isArray((exchangesData as any)?.data?.exchanges)
          ? (exchangesData as any).data.exchanges
          : []

  const getItemPrice = (item: any) => item?.price ?? item?.pointCost ?? item?.cost ?? 0

  const canExchange = (price: number, stock: number | null) => {
    return student.availablePoints >= price && (stock === null || stock > 0)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-primary" />
            {student.name} 的个人商店
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-between">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-orange-200 bg-orange-50 text-orange-600 text-sm">
            <Ticket className="w-4 h-4" />
            可兑换积分 {student.availablePoints}
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

        <div className="min-h-[280px] max-h-[350px] overflow-auto">
          {activeTab === "products" ? (
            <div className="space-y-3">
              {items.length === 0 ? (
                <div className="flex items-center justify-center h-40 text-muted-foreground">
                  暂无商品
                </div>
              ) : (
                items.map((item: any) => {
                  const price = getItemPrice(item)
                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-4 rounded-lg border"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Gift className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{item.name}</p>
                          <p className="text-sm text-muted-foreground">
                            库存: {item.stock === null ? '无限' : item.stock}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold text-primary">
                          {price}分
                        </span>
                        <Button
                          size="sm"
                          variant={canExchange(price, item.stock) ? "default" : "outline"}
                          disabled={!canExchange(price, item.stock) || exchangeMutation.isPending}
                          onClick={() => exchangeMutation.mutate(item.id)}
                          className="bg-primary hover:bg-primary/90"
                        >
                          {exchangeMutation.isPending ? '兑换中...' : '兑换'}
                        </Button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {exchanges.length === 0 ? (
                <div className="flex items-center justify-center h-40 text-muted-foreground">
                  暂无兑换记录
                </div>
              ) : (
                exchanges.map((record: any) => {
                  const canRevoke = !!record.canRevoke

                  return (
                    <div
                      key={record.id}
                      className="flex items-center justify-between p-4 rounded-lg border"
                    >
                      <div>
                        <p className="font-medium">{record.item?.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(record.exchangedAt).toLocaleString('zh-CN')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-primary">-{record.totalPrice}分</p>
                        <p className="text-xs text-muted-foreground">
                          {canRevoke ? '5分钟内可撤回' : '已完成'}
                        </p>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          )}
        </div>

        <div className="text-xs text-muted-foreground text-center pt-2 border-t">
          兑换后将自动扣减可兑换积分并记录到兑换历史
        </div>
      </DialogContent>
    </Dialog>
  )
}
