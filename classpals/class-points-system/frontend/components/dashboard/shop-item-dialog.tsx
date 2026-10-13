'use client';

import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { shopApi } from '@/lib/api/shop';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

interface ShopItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingItem?: any;
  classId: string;
  onSuccess: () => void;
}

export function ShopItemDialog({ open, onOpenChange, editingItem, classId, onSuccess }: ShopItemDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('10');
  const [stock, setStock] = useState('10');
  const [category, setCategory] = useState<'PHYSICAL' | 'PRIVILEGE' | 'VIRTUAL'>('PHYSICAL');

  useEffect(() => {
    if (editingItem) {
      setName(editingItem.name || '');
      setDescription(editingItem.description || '');
      setPrice(String(editingItem.price || 10));
      setStock(String(editingItem.stock || 10));
      setCategory(editingItem.category || 'PHYSICAL');
    } else {
      setName('');
      setDescription('');
      setPrice('10');
      setStock('10');
      setCategory('PHYSICAL');
    }
  }, [editingItem, open]);

  const createMutation = useMutation({
    mutationFn: (data: any) => shopApi.createItem(classId, data),
    onSuccess,
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => shopApi.updateItem(editingItem.id, data),
    onSuccess,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      name,
      description: description || undefined,
      price: parseInt(price),
      stock: parseInt(stock),
      category,
    };
    if (editingItem) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editingItem ? '编辑商品' : '添加商品'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">商品名称</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例如：免作业卡"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">描述（可选）</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="商品说明"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">分类</Label>
              <select
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value as 'PHYSICAL' | 'PRIVILEGE' | 'VIRTUAL')}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                required
              >
                <option value="PHYSICAL">实物奖励</option>
                <option value="PRIVILEGE">特权奖励</option>
                <option value="VIRTUAL">虚拟奖励</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="price">价格（积分）</Label>
              <Input
                id="price"
                type="number"
                min="1"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stock">库存</Label>
              <Input
                id="stock"
                type="number"
                min="0"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
