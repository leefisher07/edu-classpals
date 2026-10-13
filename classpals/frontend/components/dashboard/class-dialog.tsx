'use client';

import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { classesApi } from '@/lib/api/classes';
import { useAuthStore } from '@/lib/stores/auth-store';
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

interface ClassDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingClass?: any;
  onSuccess: () => void;
}

function getErrorMessage(error: any, fallback: string) {
  return error?.message || fallback;
}

export function ClassDialog({ open, onOpenChange, editingClass, onSuccess }: ClassDialogProps) {
  const [name, setName] = useState('');
  const [teacherName, setTeacherName] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const updateUser = useAuthStore((s) => s.updateUser);

  useEffect(() => {
    if (editingClass) {
      setName(editingClass.name || '');
      setTeacherName(editingClass.teacherName || '');
    } else {
      setName('');
      setTeacherName('');
    }
    setErrorMessage('');
  }, [editingClass, open]);

  const createMutation = useMutation({
    mutationFn: (data: { name: string; teacherName?: string }) =>
      classesApi.create(data),
    onSuccess: async (response: any) => {
      const newClass = response?.data ?? response;
      if (newClass?.isActive && newClass?.id) {
        updateUser({ currentClassId: newClass.id });
      }
      setErrorMessage('');
      onSuccess();
    },
    onError: (error: any) => {
      console.error('Create class error:', error);
      setErrorMessage(getErrorMessage(error, '创建班级失败，请重试'));
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: { name: string; teacherName?: string }) =>
      classesApi.update(editingClass.id, data),
    onSuccess: () => {
      setErrorMessage('');
      onSuccess();
    },
    onError: (error: any) => {
      console.error('Update class error:', error);
      setErrorMessage(getErrorMessage(error, '更新班级失败，请重试'));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedName = name.trim();
    const trimmedTeacherName = teacherName.trim();

    if (!trimmedName) {
      setErrorMessage('班级名称不能为空');
      return;
    }

    setErrorMessage('');

    const data = {
      name: trimmedName,
      teacherName: trimmedTeacherName || undefined,
    };

    if (editingClass) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl border bg-card p-0 shadow-xl sm:max-w-lg">
        <DialogHeader className="border-b bg-muted/30 px-6 py-5">
          <DialogTitle>{editingClass ? '编辑班级' : '新建班级'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 px-6 py-6">
            <div className="space-y-2">
              <Label htmlFor="name">班级名称</Label>
              <Input
                id="name"
                className="rounded-xl"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例如：三年级一班"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="teacherName">班主任姓名（可选）</Label>
              <Input
                id="teacherName"
                className="rounded-xl"
                value={teacherName}
                onChange={(e) => setTeacherName(e.target.value)}
                placeholder="请输入班主任姓名"
              />
            </div>
            {errorMessage && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                {errorMessage}
              </div>
            )}
          </div>
          <DialogFooter className="border-t bg-muted/20 px-6 py-4">
            <Button type="button" variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button type="submit" className="rounded-xl" disabled={isPending}>
              {isPending ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
