'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { classesApi } from '@/lib/api/classes';
import { Button } from '@/components/ui/button';
import { ClassSwitchConfirmDialog } from '@/components/dashboard/class-switch-confirm-dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Users, CheckCircle, Database } from 'lucide-react';
import { useState } from 'react';
import { ClassDialog } from './class-dialog';
import { useAuthStore } from '@/lib/stores/auth-store';
import { cn } from '@/lib/utils';

export function ClassList() {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const setCurrentClassId = useAuthStore((s) => s.setCurrentClassId);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<any>(null);
  const [pendingClass, setPendingClass] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['classes'],
    queryFn: () => classesApi.list(),
  });

  const activateMutation = useMutation({
    mutationFn: (id: string) => classesApi.activate(id),
    onSuccess: async (_, id) => {
      setCurrentClassId(id);
      router.replace(`/dashboard?classId=${encodeURIComponent(id)}`);
      const latestClasses = await classesApi.list();
      queryClient.setQueryData(['classes'], latestClasses);
      await queryClient.invalidateQueries({ queryKey: ['classes'] });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['students', id] }),
        queryClient.invalidateQueries({ queryKey: ['groups', id] }),
        queryClient.invalidateQueries({ queryKey: ['class-records', id] }),
        queryClient.invalidateQueries({ queryKey: ['student-ranking', id] }),
        queryClient.invalidateQueries({ queryKey: ['group-ranking', id] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard-overview', id] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard-ranking', id] }),
        queryClient.invalidateQueries({ queryKey: ['shop-items', id] }),
        queryClient.invalidateQueries({ queryKey: ['student-exchanges', id] }),
        queryClient.invalidateQueries({ queryKey: ['shop-exchanges', id] }),
        queryClient.invalidateQueries({ queryKey: ['class-pets', id] }),
        queryClient.invalidateQueries({ queryKey: ['pet-settings', id] }),
      ]);
      setPendingClass(null);
    },
  });

  const handleSelectClass = (cls: any) => {
    if (!cls?.id || cls.id === currentClass?.id) return;
    setPendingClass(cls);
  };

  const handleConfirmClassSwitch = () => {
    if (!pendingClass?.id || activateMutation.isPending) return;
    activateMutation.mutate(pendingClass.id);
  };

  const classes = Array.isArray(data) ? data : [];
  const currentClass = classes.find((cls: any) => cls.isActive) || null;

  if (isLoading) {
    return (
      <div className="min-h-full bg-muted/20">
        <div className="mx-auto grid w-full max-w-[1400px] grid-cols-1 gap-5 px-4 py-6 md:grid-cols-2 lg:grid-cols-3 lg:px-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-56 animate-pulse rounded-3xl border bg-card shadow-sm" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-muted/20">
      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6 px-4 py-6 lg:px-8">
        <div className="overflow-hidden rounded-3xl border bg-card shadow-sm">
          <div className="flex flex-col gap-5 p-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Users className="h-7 w-7" />
              </div>
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-foreground">班级管理</h2>
                <p className="mt-1 text-sm text-muted-foreground">管理你的班级，切换当前班级</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm text-emerald-700">共 {classes.length} 个班级</span>
              <Button className="h-11 rounded-xl shadow-sm" onClick={() => { setEditingClass(null); setDialogOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" />
                新建班级
              </Button>
            </div>
          </div>
        </div>

      {classes.length === 0 ? (
        <div className="rounded-3xl border border-dashed bg-card px-6 py-16 text-center shadow-sm">
          <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">还没有班级</h3>
          <p className="text-muted-foreground mb-5">创建你的第一个班级开始使用</p>
          <Button className="rounded-xl" onClick={() => { setEditingClass(null); setDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            新建班级
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {classes.map((cls: any) => (
            <Card
              key={cls.id}
              data-testid={`class-card-${cls.id}`}
              className={cn(
                'overflow-hidden rounded-3xl border bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md',
                cls.isActive && 'border-primary ring-2 ring-primary/20'
              )}
            >
              <CardHeader className="border-b bg-muted/20 pb-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <CardTitle className="truncate text-lg text-foreground">{cls.name}</CardTitle>
                    {cls.description && (
                      <p className="mt-2 text-sm text-muted-foreground">{cls.description}</p>
                    )}
                  </div>
                  {cls.isActive && (
                    <Badge className="rounded-full bg-primary/10 text-primary hover:bg-primary/10">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      当前班级
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-5">
                <div className="space-y-4">
                  <div className="rounded-2xl bg-muted/30 px-4 py-3">
                    <span className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="h-4 w-4" />
                      {cls.studentCount || 0} 名学生
                    </span>
                  </div>

                  <div className="rounded-2xl border bg-background p-4">
                    <p className="text-sm font-medium text-foreground">班级数据管理</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      数据导入、数据导出与清空学生数据统一入口。
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Link href="/dashboard/export">
                        <Button size="sm" variant="outline" className="gap-2 rounded-xl">
                          <Database className="h-4 w-4" />
                          数据导入/导出
                        </Button>
                      </Link>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {!cls.isActive && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 rounded-xl"
                        onClick={() => handleSelectClass(cls)}
                        disabled={activateMutation.isPending}
                      >
                        {activateMutation.isPending && pendingClass?.id === cls.id ? '切换中...' : '切换到此班级'}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="rounded-xl"
                      onClick={() => { setEditingClass(cls); setDialogOpen(true); }}
                    >
                      编辑
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ClassSwitchConfirmDialog
        open={!!pendingClass}
        targetClassName={pendingClass?.name}
        isPending={activateMutation.isPending}
        onOpenChange={(open) => {
          if (!open && !activateMutation.isPending) {
            setPendingClass(null);
          }
        }}
        onConfirm={handleConfirmClassSwitch}
      />

      <ClassDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editingClass={editingClass}
        onSuccess={async () => {
          // 等待数据刷新完成
          await queryClient.invalidateQueries({ queryKey: ['classes'] });
          // 短暂延迟确保UI更新
          setTimeout(() => {
            setDialogOpen(false);
          }, 100);
        }}
      />
      </div>
    </div>
  );
}
