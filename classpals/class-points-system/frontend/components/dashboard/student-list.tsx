'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { studentsApi, pointsApi } from '@/lib/api/students';
import { classesApi } from '@/lib/api/classes';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Plus, Award, Minus, TrendingUp, TrendingDown } from 'lucide-react';
import { useState } from 'react';
import { StudentDialog } from './student-dialog';
import { PointDialog } from './point-dialog';
import { useAuthStore } from '@/lib/stores/auth-store';

const API_ORIGIN = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api').replace(/\/api\/?$/, '');

function resolveAvatarUrl(avatar?: string | null) {
  if (!avatar) return '';
  if (/^https?:\/\//.test(avatar)) return avatar;
  if (avatar.startsWith('/')) return `${API_ORIGIN}${avatar}`;
  return avatar;
}

export function StudentList() {
  const queryClient = useQueryClient();
  const currentClassId = useAuthStore((s) => s.user?.currentClassId);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pointDialogOpen, setPointDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<any>(null);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [pointType, setPointType] = useState<'ADD' | 'DEDUCT'>('ADD');

  // Get active class
  const { data: classesData } = useQuery({
    queryKey: ['classes'],
    queryFn: () => classesApi.list(),
  });

  const activeClass = Array.isArray(classesData)
    ? classesData.find((c: any) => c.id === currentClassId) || classesData.find((c: any) => c.isActive)
    : (classesData as any)?.data?.find?.((c: any) => c.id === currentClassId) || (classesData as any)?.data?.find?.((c: any) => c.isActive);

  // Get students
  const { data: studentsData, isLoading } = useQuery({
    queryKey: ['students', activeClass?.id],
    queryFn: () => studentsApi.list(activeClass.id),
    enabled: !!activeClass,
  });

  const students = (studentsData as any)?.data?.students || [];

  const quickAddMutation = useMutation({
    mutationFn: (studentId: string) => pointsApi.quickAdd(studentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
    },
  });

  const handleQuickAdd = (student: any) => {
    quickAddMutation.mutate(student.id);
  };

  const handleAddPoints = (student: any) => {
    setSelectedStudent(student);
    setPointType('ADD');
    setPointDialogOpen(true);
  };

  const handleDeductPoints = (student: any) => {
    setSelectedStudent(student);
    setPointType('DEDUCT');
    setPointDialogOpen(true);
  };

  const getAvatarColor = (name: string) => {
    const colors = [
      'bg-red-100 text-red-600',
      'bg-blue-100 text-blue-600',
      'bg-green-100 text-green-600',
      'bg-yellow-100 text-yellow-600',
      'bg-purple-100 text-purple-600',
      'bg-pink-100 text-pink-600',
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  if (!activeClass) {
    return (
      <div className="text-center py-16">
        <h3 className="text-lg font-medium text-gray-900 mb-2">请先创建班级</h3>
        <p className="text-gray-500">在开始管理学生之前，请先创建一个班级</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-48 rounded-lg bg-gray-200 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">学生管理</h2>
          <p className="text-gray-500 mt-1">
            当前班级：{activeClass.name} · {students.length} 名学生
          </p>
        </div>
        <Button onClick={() => { setEditingStudent(null); setDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          添加学生
        </Button>
      </div>

      {students.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-lg border border-dashed border-gray-300">
          <Award className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">还没有学生</h3>
          <p className="text-gray-500 mb-4">添加学生开始使用积分系统</p>
          <Button onClick={() => { setEditingStudent(null); setDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            添加学生
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {students.map((student: any) => (
            <Card key={student.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start gap-3 mb-4">
                  <Avatar className="h-12 w-12">
                    {student.avatar ? <AvatarImage src={resolveAvatarUrl(student.avatar)} alt={student.name} className="object-cover" /> : null}
                    <AvatarFallback className={getAvatarColor(student.name)}>
                      {student.name.slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 truncate">{student.name}</h3>
                    <p className="text-sm text-gray-500">学号：{student.studentNumber}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-2xl font-bold text-blue-600">{student.totalPoints}</p>
                    <p className="text-xs text-gray-500">累计积分</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      排名 #{student.ranking || '-'}
                    </p>
                    {student.weekPoints !== undefined && (
                      <p className="text-xs text-gray-500">
                        本周 {student.weekPoints}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleQuickAdd(student)}
                    disabled={quickAddMutation.isPending}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    快速+1
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-green-600 hover:text-green-700 hover:bg-green-50"
                    onClick={() => handleAddPoints(student)}
                  >
                    <TrendingUp className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => handleDeductPoints(student)}
                  >
                    <TrendingDown className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <StudentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editingStudent={editingStudent}
        classId={activeClass.id}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['students'] });
          setDialogOpen(false);
        }}
      />

      <PointDialog
        open={pointDialogOpen}
        onOpenChange={setPointDialogOpen}
        student={selectedStudent}
        type={pointType}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['students'] });
          setPointDialogOpen(false);
        }}
      />
    </div>
  );
}
