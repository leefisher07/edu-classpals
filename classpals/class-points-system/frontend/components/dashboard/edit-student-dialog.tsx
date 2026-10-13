'use client';

import { useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { studentsApi } from '@/lib/api/students';
import { uploadApi } from '@/lib/api/upload';
import {
  CADRE_POSITIONS,
  compressImage,
  PARENT_RELATIONSHIPS,
  PHONE_PATTERN,
} from '@/components/dashboard/student-form-utils';
import {
  StudentAvatarSection,
  StudentBaseFieldsSection,
  StudentParentPhonesSection,
} from '@/components/dashboard/student-dialog-sections';

import {
  CUSTOM_CADRE_OPTION,
  NONE_CADRE_OPTION,
  useStudentCadre,
} from '@/components/dashboard/use-student-cadre';

interface EditStudentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: any | null;
  groups?: any[];
  classId?: string;
  onSuccess?: (updatedStudent?: any) => void;
}

async function invalidateStudentRelatedQueries(queryClient: ReturnType<typeof useQueryClient>) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ['students'] }),
    queryClient.invalidateQueries({ queryKey: ['groups'] }),
    queryClient.invalidateQueries({ queryKey: ['dashboard-overview'] }),
    queryClient.invalidateQueries({ queryKey: ['dashboard-ranking'] }),
    queryClient.invalidateQueries({ queryKey: ['class-records'] }),
    queryClient.invalidateQueries({ queryKey: ['student-ranking'] }),
    queryClient.invalidateQueries({ queryKey: ['shop-exchanges'] }),
    queryClient.invalidateQueries({ queryKey: ['student-exchanges'] }),
    queryClient.invalidateQueries({ queryKey: ['class-pets'] }),
    queryClient.invalidateQueries({ queryKey: ['operation-snapshots'] }),
  ]);
}

export function EditStudentDialog({ open, onOpenChange, student, groups = [], classId, onSuccess }: EditStudentDialogProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [name, setName] = useState('');
  const [gender, setGender] = useState<'MALE' | 'FEMALE'>('MALE');
  const [studentNumber, setStudentNumber] = useState('');
  const [groupId, setGroupId] = useState('none');
  const [avatar, setAvatar] = useState('');
  const [avatarRemoved, setAvatarRemoved] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const {
    isCadre,
    cadreMode,
    cadrePosition,
    customPosition,
    applyCadre,
    handleCadreChange,
    handleCustomPositionChange,
    currentCadreValue,
  } = useStudentCadre({ defaultCadrePosition: CADRE_POSITIONS[0] });
  const [parentPhones, setParentPhones] = useState<{ phone: string; relationship: string }[]>([]);
  const [avatarTab, setAvatarTab] = useState<'text' | 'upload'>('text');

  useEffect(() => {
    if (student && open) {
      setName(student.name || '');
      setGender(student.gender || 'MALE');
      setStudentNumber(student.studentNumber || '');
      setGroupId(student.groupId || 'none');
      setAvatar(student.avatar || '');
      setAvatarRemoved(false);
      applyCadre({
        isCadre: student.isCadre || false,
        cadrePosition: student.cadrePosition || '',
        customPosition: student.customPosition || '',
      });
      setParentPhones(
        student.parents?.map((p: any) => ({ phone: p.phone, relationship: p.relationship })) || []
      );
      setAvatarTab(student.avatar ? 'upload' : 'text');
    }
  }, [student, open]);

  const mutation = useMutation({
    mutationFn: (data: any) => studentsApi.update(student.id, data),
    onSuccess: async (updatedStudent: any) => {
      await invalidateStudentRelatedQueries(queryClient);
      if (updatedStudent && classId) {
        queryClient.setQueryData(['students', classId], (previous: any) => {
          if (!previous) return previous;

          const mergedStudent = {
            ...updatedStudent,
            parents: updatedStudent.parents ?? parentPhones.map((item) => ({
              phone: item.phone.trim(),
              relationship: item.relationship,
            })),
          };

          if (Array.isArray(previous)) {
            return previous.map((item: any) => item.id === mergedStudent.id ? { ...item, ...mergedStudent } : item);
          }

          if (Array.isArray(previous?.students)) {
            return {
              ...previous,
              students: previous.students.map((item: any) => item.id === mergedStudent.id ? { ...item, ...mergedStudent } : item),
            };
          }

          if (Array.isArray(previous?.data)) {
            return {
              ...previous,
              data: previous.data.map((item: any) => item.id === mergedStudent.id ? { ...item, ...mergedStudent } : item),
            };
          }

          if (Array.isArray(previous?.data?.students)) {
            return {
              ...previous,
              data: {
                ...previous.data,
                students: previous.data.students.map((item: any) => item.id === mergedStudent.id ? { ...item, ...mergedStudent } : item),
              },
            };
          }

          return previous;
        });
      }
      toast.success('学生信息已更新');
      onSuccess?.(updatedStudent);
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || '保存失败');
    },
  });

  const handleUploadAvatar = async (file?: File) => {
    if (!file) return;

    try {
      setAvatarUploading(true);
      const compressedFile = await compressImage(file);
      const response = await uploadApi.uploadAvatar(compressedFile);
      const url = (response as any)?.url || (response as any)?.data?.url;

      if (!url) {
        throw new Error('头像上传失败');
      }

      setAvatar(url);
      setAvatarRemoved(false);
      setAvatarTab('upload');
      toast.success('头像上传成功');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || '头像上传失败');
    } finally {
      setAvatarUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    for (const item of parentPhones) {
      const phone = item.phone.trim();
      if (!phone) {
        toast.error('请填写完整的家长手机号');
        return;
      }
      if (!PHONE_PATTERN.test(phone)) {
        toast.error('家长手机号格式不正确');
        return;
      }
    }

    mutation.mutate({
      name,
      gender,
      studentNumber: studentNumber || undefined,
      groupId: groupId === 'none' ? null : groupId,
      avatar: avatarRemoved ? null : avatar || undefined,
      isCadre,
      cadrePosition: isCadre ? (cadreMode === 'preset' ? cadrePosition || undefined : undefined) : undefined,
      customPosition: isCadre ? (cadreMode === 'custom' ? customPosition || undefined : undefined) : undefined,
      parentPhones: parentPhones.map((item) => ({
        phone: item.phone.trim(),
        relationship: item.relationship,
      })),
    });
  };

  const addParentPhone = () => {
    if (parentPhones.length < 2) {
      setParentPhones([...parentPhones, { phone: '', relationship: parentPhones.length === 0 ? '妈妈' : '爸爸' }]);
    }
  };

  const updateParentPhone = (index: number, field: 'phone' | 'relationship', value: string) => {
    setParentPhones((prev) => prev.map((p, i) => i === index ? { ...p, [field]: value } : p));
  };

  const removeParentPhone = (index: number) => {
    setParentPhones((prev) => prev.filter((_, i) => i !== index));
  };

  if (!student) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[88vh] max-h-[88vh] w-[94vw] max-w-4xl flex-col overflow-hidden p-0">
        <DialogHeader className="border-b px-8 py-6">
          <DialogTitle className="text-[2rem] font-semibold tracking-tight">选择头像</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto px-8 py-6">
            <div className="mx-auto flex max-w-3xl flex-col gap-8">
              <StudentAvatarSection
                avatar={avatar}
                avatarTab={avatarTab}
                avatarUploading={avatarUploading}
                previewText={name.trim().slice(0, 2) || '未'}
                previewAlt="学生头像"
                fileInputRef={fileInputRef}
                onAvatarTabChange={setAvatarTab}
                onFileChange={handleUploadAvatar}
                onRemoveAvatar={() => {
                  setAvatar('');
                  setAvatarRemoved(true);
                  setAvatarTab('text');
                }}
                uploadHint="上传前会自动压缩。"
              />

              <StudentBaseFieldsSection
                nameLabel="姓名*"
                nameField={(
                  <Input className="h-16 rounded-2xl px-5 text-2xl" value={name} onChange={(e) => setName(e.target.value)} required />
                )}
                studentNumber={studentNumber}
                onStudentNumberChange={setStudentNumber}
                groupId={groupId}
                onGroupChange={setGroupId}
                groups={groups}
                gender={gender}
                onGenderChange={(value) => setGender(value as 'MALE' | 'FEMALE')}
                currentCadreValue={currentCadreValue}
                onCadreChange={handleCadreChange}
                customPosition={customPosition}
                onCustomPositionChange={handleCustomPositionChange}
                cadreMode={cadreMode}
                cadrePositions={CADRE_POSITIONS}
                noneCadreOption={NONE_CADRE_OPTION}
                customCadreOption={CUSTOM_CADRE_OPTION}
              />

              <StudentParentPhonesSection
                parentPhones={parentPhones}
                relationships={PARENT_RELATIONSHIPS}
                actionText="保存后即时生效"
                emptyText="还没有绑定家长手机号，点击右上角“添加手机号”开始填写。"
                onAdd={addParentPhone}
                onUpdate={updateParentPhone}
                onRemove={removeParentPhone}
              />
            </div>
          </div>

          <DialogFooter className="border-t px-8 py-5">
            <Button type="button" variant="outline" className="h-14 rounded-2xl px-7 text-lg" onClick={() => onOpenChange(false)}>取消</Button>
            <Button type="submit" className="h-14 rounded-2xl px-8 text-lg" disabled={mutation.isPending || avatarUploading}>
              {mutation.isPending ? '保存中...' : '保存修改'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
