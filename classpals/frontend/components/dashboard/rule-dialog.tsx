'use client';

import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { rulesApi } from '@/lib/api/rules';
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
import { toast } from 'sonner';

interface RuleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingRule?: any;
  classId: string;
  onSuccess: () => void;
}

export function RuleDialog({ open, onOpenChange, editingRule, classId, onSuccess }: RuleDialogProps) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [points, setPoints] = useState('1');
  const [type, setType] = useState<'ADD' | 'DEDUCT'>('ADD');

  useEffect(() => {
    if (editingRule) {
      setName(editingRule.name || '');
      setCategory(editingRule.category || '');
      setPoints(String(editingRule.points || 1));
      setType(editingRule.type || 'ADD');
    } else {
      setName('');
      setCategory('');
      setPoints('1');
      setType('ADD');
    }
  }, [editingRule, open]);

  const createMutation = useMutation({
    mutationFn: (data: any) => rulesApi.create(classId, data),
    onSuccess: () => {
      toast.success('规则创建成功')
      onSuccess()
      onOpenChange(false)
    },
    onError: (error: any) => {
      toast.error(error?.message || '创建规则失败')
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => rulesApi.update(editingRule.id, data),
    onSuccess: () => {
      toast.success('规则更新成功')
      onSuccess()
      onOpenChange(false)
    },
    onError: (error: any) => {
      toast.error(error?.message || '更新规则失败')
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      name,
      points: parseInt(points),
      type,
      category: category || undefined,
    };
    if (editingRule) {
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
          <DialogTitle>{editingRule ? '编辑规则' : '添加规则'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">规则名称</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例如：认真听讲"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">分类（可选）</Label>
              <Input
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="例如：课堂表现"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="points">分值</Label>
              <Input
                id="points"
                type="number"
                min="1"
                value={points}
                onChange={(e) => setPoints(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>类型</Label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="type"
                    value="ADD"
                    checked={type === 'ADD'}
                    onChange={(e) => setType(e.target.value as 'ADD')}
                  />
                  <span>加分</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="type"
                    value="DEDUCT"
                    checked={type === 'DEDUCT'}
                    onChange={(e) => setType(e.target.value as 'DEDUCT')}
                  />
                  <span>扣分</span>
                </label>
              </div>
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
