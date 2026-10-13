'use client';

import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { pointsApi } from '@/lib/api/students';
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
import { TrendingUp, TrendingDown } from 'lucide-react';

interface PointDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: any;
  type: 'ADD' | 'DEDUCT';
  onSuccess: () => void;
}

export function PointDialog({ open, onOpenChange, student, type, onSuccess }: PointDialogProps) {
  const [value, setValue] = useState('1');
  const [reason, setReason] = useState('');

  const addMutation = useMutation({
    mutationFn: (data: { value: number; reason?: string; type: string }) =>
      pointsApi.add(student.id, data),
    onSuccess,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addMutation.mutate({
      value: parseInt(value),
      reason: reason || undefined,
      type,
    });
  };

  const isAdd = type === 'ADD';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl border bg-card p-0 shadow-xl sm:max-w-md">
        <DialogHeader className="border-b bg-muted/30 px-6 py-5">
          <DialogTitle className="flex items-center gap-2">
            {isAdd ? (
              <TrendingUp className="h-5 w-5 text-green-600" />
            ) : (
              <TrendingDown className="h-5 w-5 text-red-600" />
            )}
            {isAdd ? '加分' : '扣分'} - {student?.name}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 px-6 py-6">
            <div className="space-y-2">
              <Label htmlFor="value">分值</Label>
              <Input
                id="value"
                className="rounded-xl"
                type="number"
                min="1"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reason">原因（可选）</Label>
              <Input
                id="reason"
                className="rounded-xl"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="请输入加减分原因"
              />
            </div>
          </div>
          <DialogFooter className="border-t bg-muted/20 px-6 py-4">
            <Button type="button" variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button
              type="submit"
              className={isAdd ? 'rounded-xl bg-green-600 hover:bg-green-700' : 'rounded-xl bg-red-600 hover:bg-red-700'}
              disabled={addMutation.isPending}
            >
              {addMutation.isPending ? '处理中...' : isAdd ? '确认加分' : '确认扣分'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
