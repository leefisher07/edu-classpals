'use client';

import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { studentsApi } from '@/lib/api/students';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface StudentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingStudent?: any;
  classId: string;
  onSuccess: () => void;
}

export function StudentDialog({ open, onOpenChange, editingStudent, classId, onSuccess }: StudentDialogProps) {
  const [name, setName] = useState('');
  const [studentNumber, setStudentNumber] = useState('');
  const [gender, setGender] = useState<'MALE' | 'FEMALE'>('MALE');

  useEffect(() => {
    if (editingStudent) {
      setName(editingStudent.name || '');
      setStudentNumber(editingStudent.studentNumber || '');
      setGender(editingStudent.gender || 'MALE');
    } else {
      setName('');
      setStudentNumber('');
      setGender('MALE');
    }
  }, [editingStudent, open]);

  const createMutation = useMutation({
    mutationFn: (data: any) => studentsApi.create(classId, data),
    onSuccess,
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => studentsApi.update(editingStudent.id, data),
    onSuccess,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingStudent) {
      updateMutation.mutate({
        name,
        gender,
        studentNumber: studentNumber || undefined,
      });
    } else {
      createMutation.mutate({
        names: [name],
        gender,
        studentNumber: studentNumber || undefined,
      });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editingStudent ? '编辑学生' : '添加学生'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">姓名</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="请输入学生姓名"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>性别</Label>
              <Select value={gender} onValueChange={(v) => setGender(v as 'MALE' | 'FEMALE')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MALE">男</SelectItem>
                  <SelectItem value="FEMALE">女</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="studentNumber">学号（可选）</Label>
              <Input
                id="studentNumber"
                value={studentNumber}
                onChange={(e) => setStudentNumber(e.target.value)}
                placeholder="请输入学号"
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
