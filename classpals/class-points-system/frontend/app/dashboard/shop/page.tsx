"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Gift, Pencil, Trash2, Search, Plus, Package, ReceiptText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { shopApi } from "@/lib/api/shop"
import { studentsApi } from "@/lib/api/students"
import { useActiveClass } from "@/lib/hooks/use-active-class"
import { toast } from "sonner"

export default function ShopPage() {
  const queryClient = useQueryClient()
  const { activeClassId, isLoading: classLoading } = useActiveClass()

  const [activeTab, setActiveTab] = useState<"products" | "records" | "manage">("products")

  const [exchangeDialogOpen, setExchangeDialogOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<any>(null)
  const [studentSearch, setStudentSearch] = useState("")
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null)

  const [manageDialogOpen, setManageDialogOpen] = useState(false)
  const [newProductName, setNewProductName] = useState("")
  const [newProductPrice, setNewProductPrice] = useState("")
  const [newProductStock, setNewProductStock] = useState("")

  const { data: itemsData } = useQuery({
    queryKey: ["shop-items", activeClassId],
    queryFn: () => shopApi.listItems(activeClassId!),
    enabled: !!activeClassId,
  })

  const { data: exchangesData } = useQuery({
    queryKey: ["shop-exchanges", activeClassId],
    queryFn: () => shopApi.listExchanges(activeClassId!, { page: 1, limit: 500 }),
    enabled: !!activeClassId,
  })

  const { data: studentsData } = useQuery({
    queryKey: ["students", activeClassId],
    queryFn: () => studentsApi.list(activeClassId!),
    enabled: !!activeClassId && exchangeDialogOpen,
  })

  const createItemMutation = useMutation({
    mutationFn: (data: any) => shopApi.createItem(activeClassId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shop-items"] })
      setNewProductName("")
      setNewProductPrice("")
      setNewProductStock("")
      setManageDialogOpen(false)
    },
    onError: (error: any) => {
      toast.error(error?.message || "添加商品失败")
    },
  })

  const deleteItemMutation = useMutation({
    mutationFn: (id: string) => shopApi.deleteItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shop-items"] })
      toast.success("商品已删除")
    },
    onError: (error: any) => {
      toast.error(error?.message || "删除商品失败")
    },
  })

  const exchangeMutation = useMutation({
    mutationFn: (data: any) => shopApi.exchange(data.studentId, data.itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shop-exchanges"] })
      queryClient.invalidateQueries({ queryKey: ["students"] })
      queryClient.invalidateQueries({ queryKey: ["student-exchanges"] })
      queryClient.invalidateQueries({ queryKey: ["shop-items"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard-overview"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard-ranking"] })
      toast.success("兑换成功")
      setExchangeDialogOpen(false)
      setSelectedStudent(null)
      setStudentSearch("")
    },
    onError: (error: any) => {
      toast.error(error?.message || "兑换失败")
    },
  })

  const revokeExchangeMutation = useMutation({
    mutationFn: (exchangeId: string) => shopApi.updateExchangeStatus(exchangeId, { status: "CANCELLED" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shop-exchanges"] })
      queryClient.invalidateQueries({ queryKey: ["students"] })
      queryClient.invalidateQueries({ queryKey: ["student-exchanges"] })
      queryClient.invalidateQueries({ queryKey: ["shop-items"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard-overview"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard-ranking"] })
      toast.success("兑换记录已撤回")
    },
    onError: (error: any) => {
      toast.error(error?.message || "撤回失败")
    },
  })

  const items = Array.isArray(itemsData)
    ? itemsData
    : Array.isArray((itemsData as any)?.items)
      ? (itemsData as any).items
      : Array.isArray((itemsData as any)?.data)
        ? (itemsData as any).data
        : (itemsData as any)?.data?.items || []
  const exchanges = Array.isArray(exchangesData)
    ? exchangesData
    : Array.isArray((exchangesData as any)?.exchanges)
      ? (exchangesData as any).exchanges
      : Array.isArray((exchangesData as any)?.data)
        ? (exchangesData as any).data
        : Array.isArray((exchangesData as any)?.data?.exchanges)
          ? (exchangesData as any).data.exchanges
          : []
  const students = Array.isArray(studentsData)
    ? studentsData
    : Array.isArray((studentsData as any)?.students)
      ? (studentsData as any).students
      : Array.isArray((studentsData as any)?.data)
        ? (studentsData as any).data
        : Array.isArray((studentsData as any)?.data?.students)
          ? (studentsData as any).data.students
          : []

  const getItemPrice = (item: any) => item?.price ?? item?.pointCost ?? 0

  const handleOpenExchange = (item: any) => {
    setSelectedProduct(item)
    setSelectedStudent(null)
    setStudentSearch("")
    setExchangeDialogOpen(true)
  }

  const handleConfirmExchange = () => {
    if (!selectedProduct) {
      toast.error("请先选择商品")
      return
    }

    if (!selectedStudent) {
      toast.error("请选择学生")
      return
    }

    exchangeMutation.mutate({
      studentId: selectedStudent,
      itemId: selectedProduct.id,
    })
  }

  const handleRevokeExchange = (exchangeId: string) => {
    if (confirm("确定要撤回这条兑换记录吗？撤回后会退回学生积分并恢复商品库存。仅支持5分钟内撤回。")) {
      revokeExchangeMutation.mutate(exchangeId)
    }
  }

  const handleAddProduct = () => {
    if (!newProductName.trim() || !newProductPrice) return

    createItemMutation.mutate({
      name: newProductName,
      price: parseInt(newProductPrice) || 1,
      stock: newProductStock ? parseInt(newProductStock) : undefined,
      description: "暂无描述",
      category: "PHYSICAL",
    })
  }

  const handleDeleteProduct = (itemId: string) => {
    if (confirm("确定要删除这个商品吗？")) {
      deleteItemMutation.mutate(itemId)
    }
  }

  const filteredStudents = students.filter((s: any) =>
    s.name.includes(studentSearch) || s.studentNumber?.includes(studentSearch)
  )

  const selectedStudentData = selectedStudent
    ? students.find((s: any) => s.id === selectedStudent)
    : null

  const selectedProductPrice = getItemPrice(selectedProduct)

  if (!activeClassId) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-muted-foreground mb-2">还没有激活的班级</p>
          <p className="text-sm text-muted-foreground">请前往班级管理创建并激活一个班级</p>
        </div>
      </div>
    )
  }

  if (classLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-muted-foreground">加载中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-full bg-muted/20">
      <div className="mx-auto flex w-full max-w-[1800px] flex-col gap-6 px-4 py-6 lg:px-8">
        <div className="overflow-hidden rounded-3xl border bg-card shadow-sm">
          <div className="flex flex-col gap-5 p-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Gift className="h-7 w-7" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">积分商店</h1>
                <p className="mt-1 text-sm text-muted-foreground">按商品选择学生兑换，自动完成可兑换积分与库存校验</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm text-emerald-700">商品 {items.length}</span>
              <span className="rounded-full bg-purple-50 px-3 py-1 text-sm text-purple-700">记录 {exchanges.length}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap gap-2">
            <Button
              variant={activeTab === "products" ? "default" : "outline"}
              onClick={() => setActiveTab("products")}
              className="h-11 rounded-xl"
            >
              <Package className="mr-2 h-4 w-4" />
              商品列表
            </Button>
            <Button
              variant={activeTab === "records" ? "default" : "outline"}
              onClick={() => setActiveTab("records")}
              className="h-11 rounded-xl"
            >
              <ReceiptText className="mr-2 h-4 w-4" />
              兑换记录
            </Button>
          </div>
          <Button
            size="lg"
            onClick={() => setManageDialogOpen(true)}
            className="h-11 rounded-xl shadow-sm"
          >
            <Plus className="w-5 h-5 mr-2" />
            添加商品
          </Button>
        </div>

        {activeTab === "products" && (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {items.map((item: any) => (
              <Card key={item.id} className="overflow-hidden rounded-3xl border bg-card shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <Gift className="w-6 h-6" />
                    </div>
                    <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                      库存 {item.stock === null ? "无限" : item.stock}
                    </span>
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-foreground">{item.name}</h3>
                  <p className="mt-2 min-h-[44px] text-sm leading-6 text-muted-foreground">{item.description || "暂无描述"}</p>
                  <div className="mt-4 flex items-center justify-between rounded-2xl bg-muted/40 px-4 py-3">
                    <span className="text-sm text-muted-foreground">兑换价格</span>
                    <span className="text-base font-semibold text-primary">{getItemPrice(item)} 积分</span>
                  </div>
                  <Button
                    className="mt-4 h-11 w-full rounded-xl"
                    onClick={() => handleOpenExchange(item)}
                    disabled={item.stock !== null && item.stock <= 0}
                  >
                    兑换
                  </Button>
                </CardContent>
              </Card>
            ))}
            {items.length === 0 && (
              <div className="col-span-full rounded-3xl border border-dashed bg-card px-6 py-14 text-center text-muted-foreground shadow-sm">
                <Gift className="mx-auto mb-4 h-12 w-12 opacity-50" />
                <p>暂无商品</p>
                <p className="mt-1 text-sm">点击“添加商品”开始创建</p>
              </div>
            )}
          </div>
        )}

        {activeTab === "records" && (
          <Card className="overflow-hidden rounded-3xl border bg-card shadow-sm">
            <div className="border-b bg-muted/30 px-5 py-4">
              <h2 className="text-lg font-semibold text-foreground">兑换记录</h2>
              <p className="mt-1 text-sm text-muted-foreground">兑换成功后会立即生效，支持 5 分钟内撤回</p>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>学生姓名</TableHead>
                  <TableHead>商品</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>兑换时间</TableHead>
                  <TableHead>扣除积分</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
              {exchanges.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    暂无兑换记录
                  </TableCell>
                </TableRow>
              ) : (
                exchanges.map((record: any) => {
                  const studentName = record.student?.name || record.studentName || "-"
                  const itemName = record.item?.name || record.itemName || "-"
                  const exchangedAt = record.exchangedAt || record.createdAt
                  const totalPrice = record.totalPrice || record.pointCost || 0
                  const canRevoke = !!record.canRevoke

                  return (
                    <TableRow key={record.id}>
                      <TableCell>{studentName}</TableCell>
                      <TableCell>{itemName}</TableCell>
                      <TableCell>
                        <span className={cn(
                          "inline-flex rounded-full px-3 py-1 text-xs font-medium",
                          canRevoke
                            ? "bg-amber-50 text-amber-700"
                            : "bg-emerald-50 text-emerald-700"
                        )}>
                          {canRevoke ? "5分钟内可撤回" : "已完成"}
                        </span>
                      </TableCell>
                      <TableCell>
                        {exchangedAt ? new Date(exchangedAt).toLocaleString("zh-CN") : "-"}
                      </TableCell>
                      <TableCell className="text-red-500">-{totalPrice}</TableCell>
                      <TableCell className="text-right">
                        {canRevoke ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRevokeExchange(record.id)}
                            disabled={revokeExchangeMutation.isPending}
                          >
                            撤回
                          </Button>
                        ) : (
                          <span className="text-sm text-muted-foreground">已超过5分钟撤回时限</span>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
              </TableBody>
            </Table>
          </Card>
        )}

        <Dialog open={exchangeDialogOpen} onOpenChange={setExchangeDialogOpen}>
        <DialogContent className="max-w-md rounded-3xl border bg-card p-0 shadow-xl">
          <DialogHeader className="border-b px-6 py-5">
            <div>
              <DialogTitle className="text-xl font-semibold">兑换商品：{selectedProduct?.name}</DialogTitle>
              <p className="mt-1 text-sm text-muted-foreground">请选择兑换学生并确认积分校验</p>
            </div>
          </DialogHeader>

          <div className="space-y-4 px-6 py-5">
            <div className="flex items-center justify-between rounded-2xl bg-muted/40 px-4 py-3">
              <span className="text-muted-foreground">商品价格</span>
              <span className="font-semibold text-primary">{selectedProductPrice} 积分</span>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="搜索学生姓名/学号"
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                className="h-11 rounded-xl pl-10"
              />
            </div>

            <ScrollArea className="h-60 rounded-2xl border bg-background">
              {filteredStudents.length === 0 ? (
                <div className="px-4 py-10 text-center text-sm text-muted-foreground">
                  暂无可选学生
                </div>
              ) : (
                filteredStudents.map((student: any) => {
                  const canExchange = student.availablePoints >= selectedProductPrice
                  const isSelected = selectedStudent === student.id
                  return (
                    <div
                      key={student.id}
                      className={cn(
                        "flex cursor-pointer items-center justify-between border-b px-4 py-3 transition-colors hover:bg-muted/50",
                        isSelected && "bg-primary/5",
                        !canExchange && "bg-red-50"
                      )}
                      onClick={() => canExchange && setSelectedStudent(student.id)}
                    >
                      <div>
                        <p className="font-medium text-foreground">{student.name}</p>
                        <p className="text-sm text-muted-foreground">可兑换积分：{student.availablePoints}</p>
                      </div>
                      <span
                        className={cn(
                          "text-sm font-medium",
                          canExchange ? "text-green-600" : "text-red-500"
                        )}
                      >
                        {canExchange ? "可兑换" : "积分不足"}
                      </span>
                    </div>
                  )
                })
              )}
            </ScrollArea>

            {selectedStudentData &&
              selectedStudentData.availablePoints < selectedProductPrice && (
                <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-600">
                  {selectedStudentData.name} 当前可兑换积分 {selectedStudentData.availablePoints}
                  ，不足以兑换该商品。
                </div>
              )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" className="rounded-xl" onClick={() => setExchangeDialogOpen(false)}>
                取消
              </Button>
              <Button
                className="rounded-xl"
                onClick={handleConfirmExchange}
                disabled={
                  exchangeMutation.isPending ||
                  !selectedStudent ||
                  !selectedStudentData ||
                  selectedStudentData.availablePoints < selectedProductPrice
                }
              >
                {exchangeMutation.isPending ? "兑换中..." : "确认兑换"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={manageDialogOpen}
        onOpenChange={(open) => {
          setManageDialogOpen(open)
          if (!open) setActiveTab("products")
        }}
      >
        <DialogContent className="max-w-3xl rounded-3xl border bg-card p-0 shadow-xl">
          <DialogHeader className="border-b px-6 py-5">
            <div>
              <DialogTitle className="text-xl font-semibold">商品管理</DialogTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                模板口径：商品名称 / 所需积分 / 库存（可空=无限），支持拖拽排序自动保存
              </p>
            </div>
          </DialogHeader>

          <div className="space-y-5 px-6 py-5">
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_140px_180px_auto] lg:items-end">
              <Input
                className="h-11 rounded-xl"
                placeholder="商品名称"
                value={newProductName}
                onChange={(e) => setNewProductName(e.target.value)}
              />
              <Input
                className="h-11 rounded-xl"
                placeholder="所需积分"
                type="number"
                value={newProductPrice}
                onChange={(e) => setNewProductPrice(e.target.value)}
              />
              <Input
                className="h-11 rounded-xl"
                placeholder="库存（可空=无限）"
                type="number"
                value={newProductStock}
                onChange={(e) => setNewProductStock(e.target.value)}
              />
              <Button
                className="h-11 rounded-xl"
                onClick={handleAddProduct}
                disabled={!newProductName.trim() || !newProductPrice}
              >
                添加商品
              </Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {items.map((item: any) => (
                <Card key={item.id} className="rounded-3xl border bg-card shadow-sm">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <Gift className="w-6 h-6" />
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl">
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 rounded-xl text-red-500"
                          onClick={() => handleDeleteProduct(item.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <h4 className="mt-4 text-lg font-semibold text-foreground">{item.name}</h4>
                    <div className="mt-3 flex items-center gap-2 text-sm">
                      <span className="font-medium text-primary">{getItemPrice(item)} 分</span>
                      <span className="text-muted-foreground">
                        库存：{item.stock === null ? "无限" : item.stock}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  )
}
