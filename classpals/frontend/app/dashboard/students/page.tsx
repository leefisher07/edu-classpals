'use client';

import { useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, ChevronDown, Plus, Minus, ArrowUpDown, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';
import { StudentCard } from '@/components/dashboard/student-card';
import { RankingSidebar } from '@/components/dashboard/ranking-sidebar';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { AddStudentDialog } from '@/components/dashboard/add-student-dialog';
import { BatchPointsDialog } from '@/components/dashboard/batch-points-dialog';
import { StudentPointsDialog } from '@/components/dashboard/student-points-dialog';
import { StudentHistoryDialog } from '@/components/dashboard/student-history-dialog';
import { StudentShopDialog } from '@/components/dashboard/student-shop-dialog';
import { DeleteStudentDialog } from '@/components/dashboard/delete-student-dialog';
import { EditStudentDialog } from '@/components/dashboard/edit-student-dialog';
import { studentsApi, pointsApi } from '@/lib/api/students';
import { dashboardApi } from '@/lib/api/dashboard';
import { dataManagementApi } from '@/lib/api/data-management';
import { groupsApi } from '@/lib/api/groups';
import { rulesApi } from '@/lib/api/rules';
import { shopApi } from '@/lib/api/shop';
import { useActiveClass } from '@/lib/hooks/use-active-class';

type SortOption = 'totalPoints' | 'availablePoints' | 'studentNumber' | 'name';

export default function StudentsPage() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const requestedClassId = searchParams.get('classId');
  const { activeClassId, isLoading: classLoading, isResolvingCurrentClass } = useActiveClass();
  const effectiveClassId = requestedClassId || activeClassId;

  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('totalPoints');
  const [sortDesc, setSortDesc] = useState(true);

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [batchDialogOpen, setBatchDialogOpen] = useState(false);
  const [batchDialogType, setBatchDialogType] = useState<'add' | 'deduct'>('add');

  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [pointsDialogOpen, setPointsDialogOpen] = useState(false);
  const [pointsDialogMode, setPointsDialogMode] = useState<'add' | 'deduct'>('add');
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [shopDialogOpen, setShopDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [quickPanelOpen, setQuickPanelOpen] = useState(false);

  // Get students
  const { data: studentsData, isLoading } = useQuery({
    queryKey: ['students', effectiveClassId],
    queryFn: () => studentsApi.list(effectiveClassId!),
    enabled: !!effectiveClassId && !isResolvingCurrentClass,
  });
  const students: any[] = Array.isArray(studentsData)
    ? studentsData
    : Array.isArray((studentsData as any)?.students)
      ? (studentsData as any).students
      : Array.isArray((studentsData as any)?.data)
        ? (studentsData as any).data
        : Array.isArray((studentsData as any)?.data?.students)
          ? (studentsData as any).data.students
          : [];

  // Get groups
  const { data: groupsData } = useQuery({
    queryKey: ['groups', effectiveClassId],
    queryFn: () => groupsApi.list(effectiveClassId!),
    enabled: !!effectiveClassId && !isResolvingCurrentClass,
  });
  const groups: any[] = Array.isArray(groupsData)
    ? groupsData
    : Array.isArray((groupsData as any)?.groups)
      ? (groupsData as any).groups
      : Array.isArray((groupsData as any)?.data)
        ? (groupsData as any).data
        : Array.isArray((groupsData as any)?.data?.groups)
          ? (groupsData as any).data.groups
          : [];

  // Get rules
  const { data: rulesData } = useQuery({
    queryKey: ['rules', effectiveClassId],
    queryFn: () => rulesApi.list(effectiveClassId!),
    enabled: !!effectiveClassId && !isResolvingCurrentClass,
  });
  const rules: any[] = Array.isArray(rulesData)
    ? rulesData
    : Array.isArray((rulesData as any)?.data)
      ? (rulesData as any).data
      : (rulesData as any)?.data?.rules || [];

  // Get shop items
  const { data: shopData } = useQuery({
    queryKey: ['shop-items', effectiveClassId],
    queryFn: () => shopApi.listItems(effectiveClassId!),
    enabled: !!effectiveClassId && !isResolvingCurrentClass,
  });
  const shopItems: any[] = Array.isArray(shopData)
    ? shopData
    : Array.isArray((shopData as any)?.items)
      ? (shopData as any).items
      : Array.isArray((shopData as any)?.data)
        ? (shopData as any).data
        : [];

  const { data: groupRankingData } = useQuery({
    queryKey: ['group-ranking', effectiveClassId, 'total'],
    queryFn: () => dashboardApi.groupRanking(effectiveClassId!, { period: 'total' }),
    enabled: !!effectiveClassId && !isResolvingCurrentClass,
  });
  const rankedGroups: any[] = Array.isArray(groupRankingData)
    ? groupRankingData
    : Array.isArray((groupRankingData as any)?.data)
      ? (groupRankingData as any).data
      : [];

  const invalidate = async () => {
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
  };

  // Quick add mutation
  const quickAddMutation = useMutation({
    mutationFn: (studentId: string) => pointsApi.quickAdd(studentId),
    onSuccess: () => invalidate(),
  });

  const deleteStudentMutation = useMutation({
    mutationFn: (studentId: string) => dataManagementApi.deleteStudentWithSnapshot(studentId),
    onSuccess: async () => {
      setDeleteDialogOpen(false);
      setSelectedStudent(null);
      await invalidate();
    },
  });

  const sortOptions: { value: SortOption; label: string }[] = [
    { value: 'totalPoints', label: '按累计积分' },
    { value: 'availablePoints', label: '按可兑换积分' },
    { value: 'studentNumber', label: '按学号' },
    { value: 'name', label: '按姓名' },
  ];

  const filteredAndSortedStudents = useMemo(() => {
    let result = [...students]
    if (searchQuery) {
      result = result.filter(
        (s) => s.name?.includes(searchQuery) || s.studentNumber?.includes(searchQuery)
      )
    }
    result.sort((a, b) => {
      let cmp = 0
      if (sortBy === 'totalPoints') cmp = (a.totalPoints || 0) - (b.totalPoints || 0)
      else if (sortBy === 'availablePoints') cmp = (a.availablePoints || 0) - (b.availablePoints || 0)
      else if (sortBy === 'studentNumber') cmp = (a.studentNumber || '').localeCompare(b.studentNumber || '')
      else if (sortBy === 'name') cmp = (a.name || '').localeCompare(b.name || '')
      return sortDesc ? -cmp : cmp
    })
    return result
  }, [students, searchQuery, sortBy, sortDesc])

  if (!effectiveClassId) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h3 className="text-lg font-medium mb-2">还没有激活的班级</h3>
          <p className="text-muted-foreground">请前往班级管理创建并激活一个班级</p>
        </div>
      </div>
    )
  }

  if (classLoading || isResolvingCurrentClass || isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-muted-foreground">加载中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-full overflow-y-auto bg-muted/20 px-4 py-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-[1800px] flex-col gap-6">
        <div className="overflow-hidden rounded-3xl border bg-card shadow-sm">
          <div className="flex flex-col gap-5 p-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Search className="h-7 w-7" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">学生管理</h1>
                <p className="mt-1 text-sm text-muted-foreground">统一管理学生档案、积分操作与快捷课堂动作。</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm text-emerald-700">学生 {students.length}</span>
              <span className="rounded-full bg-purple-50 px-3 py-1 text-sm text-purple-700">筛选结果 {filteredAndSortedStudents.length}</span>
              <Button onClick={() => setAddDialogOpen(true)} size="lg" className="h-11 rounded-xl shadow-sm whitespace-nowrap">
                <Plus className="w-5 h-5 mr-2" />添加学生
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-11 gap-2 rounded-xl whitespace-nowrap"
                onClick={() => setQuickPanelOpen(true)}
              >
                <Zap className="w-4 h-4" />
                <span className="hidden sm:inline">快捷面板</span>
              </Button>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border bg-card p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <div className="relative flex-1 max-w-md w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="搜索学生姓名/学号..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-11 rounded-xl"
                aria-label="搜索学生"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium text-muted-foreground">
              快速操作：
            </span>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2 rounded-xl">
                  <ArrowUpDown className="w-4 h-4" />批量加减分
                  <ChevronDown className="w-4 h-4 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => { setBatchDialogType('add'); setBatchDialogOpen(true); }}>
                  <Plus className="w-4 h-4 mr-2 text-green-600" />批量加分
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setBatchDialogType('deduct'); setBatchDialogOpen(true); }}>
                  <Minus className="w-4 h-4 mr-2 text-red-500" />批量减分
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2 rounded-xl">
                  <ArrowUpDown className="w-4 h-4" />
                  排序: {sortOptions.find((o) => o.value === sortBy)?.label}
                  <ChevronDown className="w-4 h-4 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {sortOptions.map((option) => (
                  <DropdownMenuCheckboxItem
                    key={option.value}
                    checked={sortBy === option.value}
                    onCheckedChange={() => setSortBy(option.value)}
                  >
                    {option.label}
                  </DropdownMenuCheckboxItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem checked={sortDesc} onCheckedChange={setSortDesc}>
                  降序排列
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="overflow-auto">
          {isLoading ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-[280px] rounded-3xl border bg-card shadow-sm animate-pulse" />
              ))}
            </div>
          ) : filteredAndSortedStudents.length === 0 ? (
            <div className="rounded-3xl border border-dashed bg-card px-6 py-16 text-center shadow-sm">
              <p className="text-lg font-medium mb-2 text-foreground">{searchQuery ? '没有找到匹配的学生' : '还没有学生'}</p>
              <p className="text-muted-foreground">{searchQuery ? '试试调整搜索关键词。' : '创建第一位学生后，即可开始积分和课堂管理。'}</p>
              {!searchQuery && (
                <Button className="mt-4 rounded-xl" onClick={() => setAddDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />添加学生
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
              {filteredAndSortedStudents.map((student) => (
                <StudentCard
                  key={student.id}
                  student={student}
                  onAddPoint={(s) => { setSelectedStudent(s); setPointsDialogMode('add'); setPointsDialogOpen(true); }}
                  onDeductPoint={(s) => { setSelectedStudent(s); setPointsDialogMode('deduct'); setPointsDialogOpen(true); }}
                  onViewHistory={(s) => { setSelectedStudent(s); setHistoryDialogOpen(true); }}
                  onOpenShop={(s) => { setSelectedStudent(s); setShopDialogOpen(true); }}
                  onQuickAddPoint={(s) => quickAddMutation.mutate(s.id)}
                  onDelete={(s) => { setSelectedStudent(s); setDeleteDialogOpen(true); }}
                  onEdit={(s) => { setSelectedStudent(s); setEditDialogOpen(true); }}
                  showDelete
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <Sheet open={quickPanelOpen} onOpenChange={setQuickPanelOpen}>
        <SheetContent side="right" className="w-[340px] sm:max-w-[400px] p-0">
          <SheetHeader className="border-b">
            <SheetTitle>快捷面板</SheetTitle>
            <SheetDescription>查看排行、规则和商店摘要</SheetDescription>
          </SheetHeader>
          <RankingSidebar
            students={students}
            groups={groups}
            rankedGroups={rankedGroups}
            rules={rules}
            shopItems={shopItems}
            className="h-full"
          />
        </SheetContent>
      </Sheet>

      {/* 弹窗 */}
      <AddStudentDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        classId={activeClassId}
        groups={groups}
        onSuccess={() => {
          invalidate();
        }}
      />

      <BatchPointsDialog
        open={batchDialogOpen}
        onOpenChange={setBatchDialogOpen}
        type={batchDialogType}
        students={students}
        rules={rules}
        classId={activeClassId}
        onSuccess={invalidate}
      />

      <StudentPointsDialog
        open={pointsDialogOpen}
        onOpenChange={setPointsDialogOpen}
        student={selectedStudent}
        mode={pointsDialogMode}
        rules={rules}
        classId={activeClassId}
        onSuccess={invalidate}
      />

      <StudentHistoryDialog
        open={historyDialogOpen}
        onOpenChange={setHistoryDialogOpen}
        student={selectedStudent}
      />

      <StudentShopDialog
        open={shopDialogOpen}
        onOpenChange={setShopDialogOpen}
        student={selectedStudent}
        classId={activeClassId}
      />

      <DeleteStudentDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        student={selectedStudent}
        isPending={deleteStudentMutation.isPending}
        onConfirm={() => {
          if (!selectedStudent) return;
          deleteStudentMutation.mutate(selectedStudent.id);
        }}
      />

      <EditStudentDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        student={selectedStudent}
        groups={groups}
        classId={effectiveClassId}
        onSuccess={(updatedStudent) => {
          if (updatedStudent) {
            setSelectedStudent(updatedStudent);
          }
          invalidate();
        }}
      />
    </div>
  );
}
