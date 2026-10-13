"use client"

import { useState } from "react"
import { Gift, Pencil, Trash2, Search, Plus, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { mockStudents } from "@/lib/mock-data"

interface ShopItem {
  id: string
  name: string
  description: string
  price: number
  stock: number | null
}

interface ExchangeRecord {
  id: string
  studentName: string
  productName: string
  exchangeTime: string
  deductedPoints: number
}

const defaultItems: ShopItem[] = [
  { id: "1", name: "一支笔", description: "暂无描述", price: 1, stock: 100 },
  { id: "2", name: "一个笔记本", description: "暂无描述", price: 3, stock: 5 },
]

export default function ShopPage() {
  const [items, setItems] = useState<ShopItem[]>(defaultItems)
  const [activeTab, setActiveTab] = useState<"products" | "records" | "manage">("products")
  const [exchangeRecords, setExchangeRecords] = useState<ExchangeRecord[]>([])
  
  // Exchange dialog state
  const [exchangeDialogOpen, setExchangeDialogOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<ShopItem | null>(null)
  const [studentSearch, setStudentSearch] = useState("")
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null)
  
  // Manage dialog state
  const [manageDialogOpen, setManageDialogOpen] = useState(false)
  const [newProductName, setNewProductName] = useState("")
  const [newProductPrice, setNewProductPrice] = useState("")
  const [newProductStock, setNewProductStock] = useState("")

  const handleOpenExchange = (item: ShopItem) => {
    setSelectedProduct(item)
    setSelectedStudent(null)
    setStudentSearch("")
    setExchangeDialogOpen(true)
  }

  const handleConfirmExchange = () => {
    if (!selectedProduct || !selectedStudent) return
    
    const student = mockStudents.find(s => s.id === selectedStudent)
    if (!student || student.availablePoints < selectedProduct.price) return

    const newRecord: ExchangeRecord = {
      id: Date.now().toString(),
      studentName: student.name,
      productName: selectedProduct.name,
      exchangeTime: new Date().toLocaleString("zh-CN"),
      deductedPoints: selectedProduct.price,
    }
    setExchangeRecords([newRecord, ...exchangeRecords])
    
    // Update stock
    if (selectedProduct.stock !== null) {
      setItems(items.map(i => 
        i.id === selectedProduct.id ? { ...i, stock: (i.stock || 0) - 1 } : i
      ))
    }
    
    setExchangeDialogOpen(false)
  }

  const handleAddProduct = () => {
    if (!newProductName.trim() || !newProductPrice) return
    
    const newItem: ShopItem = {
      id: Date.now().toString(),
      name: newProductName,
      description: "暂无描述",
      price: parseInt(newProductPrice) || 1,
      stock: newProductStock ? parseInt(newProductStock) : null,
    }
    setItems([...items, newItem])
    setNewProductName("")
    setNewProductPrice("")
    setNewProductStock("")
  }

  const handleDeleteProduct = (itemId: string) => {
    setItems(items.filter(i => i.id !== itemId))
  }

  const filteredStudents = mockStudents.filter(s => 
    s.name.includes(studentSearch) || s.studentId?.includes(studentSearch)
  )

  const selectedStudentData = selectedStudent 
    ? mockStudents.find(s => s.id === selectedStudent) 
    : null

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">积分商店</h1>
          <p className="text-muted-foreground">按商品选择学生兑换，自动完成可用积分与库存校验</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={activeTab === "products" ? "default" : "outline"}
            onClick={() => setActiveTab("products")}
            className={activeTab === "products" ? "bg-[#f97316] hover:bg-[#ea580c]" : ""}
          >
            商品列表
          </Button>
          <Button
            variant={activeTab === "records" ? "default" : "outline"}
            onClick={() => setActiveTab("records")}
            className={activeTab === "records" ? "bg-[#f97316] hover:bg-[#ea580c]" : ""}
          >
            兑换记录
          </Button>
          <Button
            variant={activeTab === "manage" ? "default" : "outline"}
            onClick={() => {
              setActiveTab("manage")
              setManageDialogOpen(true)
            }}
            className={activeTab === "manage" ? "bg-[#f97316] hover:bg-[#ea580c]" : ""}
          >
            管理商品
          </Button>
        </div>
      </div>

      {/* Products Tab */}
      {activeTab === "products" && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map((item) => (
            <Card key={item.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                    <Gift className="w-5 h-5 text-purple-600" />
                  </div>
                  <span className="text-sm text-muted-foreground">
                    库存 {item.stock === null ? "无限" : item.stock}
                  </span>
                </div>
                <h3 className="font-semibold mb-1">{item.name}</h3>
                <p className="text-sm text-muted-foreground mb-2">{item.description}</p>
                <p className="text-[#7c3aed] font-medium mb-4">价格：{item.price} 积分</p>
                <Button 
                  className="w-full bg-[#f97316] hover:bg-[#ea580c]"
                  onClick={() => handleOpenExchange(item)}
                  disabled={item.stock !== null && item.stock <= 0}
                >
                  兑换
                </Button>
              </CardContent>
            </Card>
          ))}
          {items.length === 0 && (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              <Gift className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>暂无商品</p>
              <p className="text-sm mt-1">点击管理商品添加商品</p>
            </div>
          )}
        </div>
      )}

      {/* Records Tab */}
      {activeTab === "records" && (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>学生姓名</TableHead>
                <TableHead>商品</TableHead>
                <TableHead>兑换时间</TableHead>
                <TableHead>扣除积分</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {exchangeRecords.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                    暂无兑换记录
                  </TableCell>
                </TableRow>
              ) : (
                exchangeRecords.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>{record.studentName}</TableCell>
                    <TableCell>{record.productName}</TableCell>
                    <TableCell>{record.exchangeTime}</TableCell>
                    <TableCell className="text-red-500">-{record.deductedPoints}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" className="text-red-500">
                        撤回
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Exchange Dialog */}
      <Dialog open={exchangeDialogOpen} onOpenChange={setExchangeDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader className="flex flex-row items-center justify-between">
            <div>
              <DialogTitle>兑换商品：{selectedProduct?.name}</DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">请选择兑换学生并确认积分校验</p>
            </div>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Price display */}
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-muted-foreground">商品价格</span>
              <span className="text-[#f97316] font-semibold">{selectedProduct?.price} 积分</span>
            </div>

            {/* Student search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="搜索学生姓名/学号"
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Student list */}
            <ScrollArea className="h-60 border rounded-lg">
              {filteredStudents.map((student) => {
                const canExchange = student.availablePoints >= (selectedProduct?.price || 0)
                const isSelected = selectedStudent === student.id
                return (
                  <div
                    key={student.id}
                    className={cn(
                      "flex items-center justify-between p-3 border-b cursor-pointer hover:bg-muted/50",
                      isSelected && "bg-[#fff7ed]",
                      !canExchange && "bg-red-50"
                    )}
                    onClick={() => canExchange && setSelectedStudent(student.id)}
                  >
                    <div>
                      <p className="font-medium">{student.name}</p>
                      <p className="text-sm text-muted-foreground">可用积分：{student.availablePoints}</p>
                    </div>
                    <span className={cn(
                      "text-sm font-medium",
                      canExchange ? "text-green-600" : "text-red-500"
                    )}>
                      {canExchange ? "可兑换" : "积分不足"}
                    </span>
                  </div>
                )
              })}
            </ScrollArea>

            {/* Warning for insufficient points */}
            {selectedStudentData && selectedStudentData.availablePoints < (selectedProduct?.price || 0) && (
              <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">
                {selectedStudentData.name} 当前可用积分 {selectedStudentData.availablePoints}，不足以兑换该商品。
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setExchangeDialogOpen(false)}>
                取消
              </Button>
              <Button 
                onClick={handleConfirmExchange}
                disabled={!selectedStudent || !selectedStudentData || selectedStudentData.availablePoints < (selectedProduct?.price || 0)}
              >
                确认兑换
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Manage Products Dialog */}
      <Dialog open={manageDialogOpen} onOpenChange={(open) => {
        setManageDialogOpen(open)
        if (!open) setActiveTab("products")
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader className="flex flex-row items-center justify-between">
            <div>
              <DialogTitle>商品管理</DialogTitle>
              <p className="text-sm text-muted-foreground">
                模板口径：商品名称 / 所需积分 / 库存（可空=无限），支持拖拽排序自动保存
              </p>
            </div>
            <Button variant="ghost" onClick={() => setManageDialogOpen(false)}>关闭</Button>
          </DialogHeader>

          <div className="space-y-4">
            {/* Add product form */}
            <div className="grid grid-cols-[1fr,120px,120px,auto] gap-2 items-end">
              <Input
                placeholder="商品名称"
                value={newProductName}
                onChange={(e) => setNewProductName(e.target.value)}
              />
              <Input
                placeholder="所需积分"
                type="number"
                value={newProductPrice}
                onChange={(e) => setNewProductPrice(e.target.value)}
              />
              <Input
                placeholder="库存（可空=无限）"
                type="number"
                value={newProductStock}
                onChange={(e) => setNewProductStock(e.target.value)}
              />
              <Button 
                className="bg-[#f97316] hover:bg-[#ea580c]"
                onClick={handleAddProduct}
                disabled={!newProductName.trim() || !newProductPrice}
              >
                添加商品
              </Button>
            </div>

            {/* Product list */}
            <div className="grid grid-cols-2 gap-4">
              {items.map((item) => (
                <Card key={item.id} className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                      <Gift className="w-5 h-5 text-purple-600" />
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-red-500"
                        onClick={() => handleDeleteProduct(item.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <h4 className="font-semibold">{item.name}</h4>
                  <div className="flex items-center gap-2 mt-2 text-sm">
                    <span className="text-[#7c3aed] font-medium">{item.price} 分</span>
                    <span className="text-muted-foreground">
                      库存：{item.stock === null ? "无限" : item.stock}
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
