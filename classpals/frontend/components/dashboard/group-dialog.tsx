'use client';

import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { groupsApi } from '@/lib/api/groups';
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

interface GroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingGroup?: any;
  classId: string;
  students: any[];
  onSuccess: () => void;
}

export function GroupDialog({ open, onOpenChange, editingGroup, classId, students, onSuccess }: GroupDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);

  useEffect(() => {
    if (editingGroup) {
      setName(editingGroup.name || '');
      setDescription(editingGroup.description || '');
      setSelectedStudents(editingGroup.members?.map((m: any) => m.id) || []);
    } else {
      setName('');
      setDescription('');
      setSelectedStudents([]);
    }
  }, [editingGroup, open]);

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const result = await groupsApi.create(classId, data);
      if (selectedStudents.length > 0) {
        await groupsApi.addMembers(result.data.id, { studentIds: selectedStudents });
      }
      return result;
    },
    onSuccess,
  });

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      await groupsApi.update(editingGroup.id, data);
      const currentMemberIds = editingGroup.members?.map((m: any) => m.id) || [];
      const toAdd = selectedStudents.filter(id => !currentMemberIds.includes(id));
      const toRemove = currentMemberIds.filter((id: string) => !selectedStudents.includes(id));

      if (toAdd.length > 0) {
        await groupsApi.addMembers(editingGroup.id, { studentIds: toAdd });
      }
      if (toRemove.length > 0) {
        await groupsApi.removeMembers(editingGroup.id, { studentIds: toRemove });
      }
    },
    onSuccess,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = { name };
    if (editingGroup) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl border bg-card p-0 shadow-xl sm:max-w-2xl">
        <DialogHeader className="border-b bg-muted/30 px-6 py-5">
          <DialogTitle>{editingGroup ? '编辑小组' : '添加小组'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-5 px-6 py-6">
            <div className="space-y-2">
              <Label htmlFor="name">小组名称</Label>
              <Input
                id="name"
                className="rounded-xl"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例如：第一小组"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">描述（可选）</Label>
              <Input
                id="description"
                className="rounded-xl"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="小组说明"
              />
            </div>
            <div className="space-y-2">
              <Label>选择成员</Label>
              <div className="max-h-60 overflow-y-auto rounded-2xl border bg-muted/20 p-4">
                {students.length === 0 ? (
                  <p className="text-sm text-muted-foreground">暂无学生</p>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {students.map((student: any) => (
                      <label key={student.id} className="flex cursor-pointer items-center gap-2 rounded-xl px-2 py-2 text-sm hover:bg-background/80">
                        <input
                          type="checkbox"
                          checked={selectedStudents.includes(student.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedStudents([...selectedStudents, student.id]);
                            } else {
                              setSelectedStudents(selectedStudents.filter(id => id !== student.id));
                            }
                          }}
                        />
                        <span>{student.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
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
