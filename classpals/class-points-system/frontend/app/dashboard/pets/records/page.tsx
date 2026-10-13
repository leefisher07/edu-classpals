'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { Search, ChevronLeft, ChevronRight, PawPrint } from 'lucide-react';
import { petsApi } from '@/lib/api/pets';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useActiveClass } from '@/lib/hooks/use-active-class';
import { cn } from '@/lib/utils';

type RecordType = 'all' | 'add' | 'deduct';

export default function PetRecordsPage() {
  const searchParams = useSearchParams();
  const { activeClassId, isLoading: classLoading } = useActiveClass();
  const [studentName, setStudentName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [recordType, setRecordType] = useState<RecordType>('all');
  const [page, setPage] = useState(1);
  const limit = 50;

  useEffect(() => {
    const studentNameParam = searchParams.get('studentName') || '';
    const typeParam = searchParams.get('type');
    setStudentName(studentNameParam);
    setRecordType(typeParam === 'add' || typeParam === 'deduct' ? typeParam : 'all');
    setPage(1);
  }, [searchParams]);

  const { data: recordsData, isLoading: recordsLoading } = useQuery({
    queryKey: ['class-pet-records', activeClassId, studentName, startDate, endDate, recordType, page],
    queryFn: () =>
      petsApi.getClassPetPointRecords(activeClassId!, {
        studentName: studentName || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        type: recordType,
        page,
        limit,
      }),
    enabled: !!activeClassId,
  });

  const records = (recordsData as any)?.data?.records || (recordsData as any)?.records || [];
  const total = (recordsData as any)?.data?.total || (recordsData as any)?.total || 0;
  const totalPages = (recordsData as any)?.data?.totalPages || (recordsData as any)?.totalPages || 1;
  const addCount = records.filter((record: any) => record.points > 0).length;
  const deductCount = records.filter((record: any) => record.points < 0).length;

  const handleSearch = () => {
    setPage(1);
  };

  const handleReset = () => {
    setStudentName('');
    setStartDate('');
    setEndDate('');
    setRecordType('all');
    setPage(1);
  };

  if (!activeClassId) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-muted-foreground mb-2">还没有激活的班级</p>
          <p className="text-sm text-muted-foreground">请前往班级管理创建并激活一个班级</p>
        </div>
      </div>
    );
  }

  if (classLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-muted-foreground">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full overflow-y-auto bg-muted/20 px-4 py-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6">
        <div className="overflow-hidden rounded-3xl border bg-card shadow-sm">
          <div className="flex flex-col gap-5 p-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <PawPrint className="h-7 w-7" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">宠物积分明细</h1>
                <p className="mt-1 text-sm text-muted-foreground">统一查看班级内每只学生宠物的经验变更记录。</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 text-sm">
              <span className="rounded-full bg-purple-50 px-3 py-1 text-purple-700">总记录 {total}</span>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">加经验 {addCount}</span>
              <span className="rounded-full bg-rose-50 px-3 py-1 text-rose-700">扣经验 {deductCount}</span>
            </div>
          </div>
        </div>

        <Card className="rounded-3xl border bg-card p-5 shadow-sm">
          <div className="grid gap-3 lg:grid-cols-[1.5fr_repeat(3,minmax(0,1fr))_auto] lg:items-end">
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">学生姓名</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="输入学生姓名"
                  className="pl-9 rounded-xl"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">开始日期</label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="rounded-xl" />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">结束日期</label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="rounded-xl" />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">类型</label>
              <div className="flex gap-2">
                {([
                  { value: 'all', label: '全部' },
                  { value: 'add', label: '加经验' },
                  { value: 'deduct', label: '扣经验' },
                ] as const).map((item) => (
                  <Button
                    key={item.value}
                    type="button"
                    variant={recordType === item.value ? 'default' : 'outline'}
                    className="flex-1 rounded-xl"
                    onClick={() => {
                      setRecordType(item.value);
                      setPage(1);
                    }}
                  >
                    {item.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSearch} className="rounded-xl">查询</Button>
              <Button variant="outline" className="rounded-xl" onClick={handleReset}>重置</Button>
            </div>
          </div>
        </Card>

        <Card className="overflow-hidden rounded-3xl border bg-card shadow-sm">
          <div className="border-b bg-muted/30 px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-foreground">经验变更记录</h2>
                <p className="mt-1 text-sm text-muted-foreground">每条记录只影响对应学生当前拥有的宠物经验，不影响学生积分；相关记录请在此页查看，而不是学生“积分明细”。</p>
              </div>
              <Badge variant="secondary" className="rounded-full px-3 py-1 text-sm">共 {total} 条</Badge>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border text-sm">
              <thead className="bg-muted/30 text-left text-muted-foreground">
                <tr>
                  <th className="px-6 py-3 font-medium">学生</th>
                  <th className="px-6 py-3 font-medium">宠物</th>
                  <th className="px-6 py-3 font-medium">变更</th>
                  <th className="px-6 py-3 font-medium">原因</th>
                  <th className="px-6 py-3 font-medium">规则</th>
                  <th className="px-6 py-3 font-medium">操作人</th>
                  <th className="px-6 py-3 font-medium">时间</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border bg-card">
                {recordsLoading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center text-muted-foreground">加载中...</td>
                  </tr>
                ) : records.length > 0 ? (
                  records.map((record: any) => (
                    <tr key={record.id} className="hover:bg-muted/20">
                      <td className="px-6 py-4 align-top">
                        <div className="font-medium text-foreground">{record.student?.name || '-'}</div>
                        <div className="mt-1 text-xs text-muted-foreground">学号：{record.student?.studentNumber || '-'}</div>
                      </td>
                      <td className="px-6 py-4 align-top">
                        <div className="flex items-center gap-2 font-medium text-foreground">
                          <PawPrint className="h-4 w-4 text-orange-500" />
                          {record.pet?.name || '已重置'}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">{record.pet?.category || record.pet?.type || '-'}</div>
                      </td>
                      <td className="px-6 py-4 align-top">
                        <span className={cn(
                          'inline-flex rounded-full px-3 py-1 text-sm font-semibold',
                          record.points > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                        )}>
                          {record.points > 0 ? `+${record.points}` : record.points}
                        </span>
                      </td>
                      <td className="px-6 py-4 align-top text-foreground">{record.reason || '-'}</td>
                      <td className="px-6 py-4 align-top text-foreground">{record.ruleName || '-'}</td>
                      <td className="px-6 py-4 align-top text-foreground">{record.operatorName || '-'}</td>
                      <td className="px-6 py-4 align-top text-muted-foreground">
                        {record.createdAt ? new Date(record.createdAt).toLocaleString('zh-CN') : '-'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center text-muted-foreground">暂无符合条件的宠物积分记录</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t px-6 py-4">
            <p className="text-sm text-muted-foreground">第 {page} / {Math.max(totalPages, 1)} 页</p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl"
                onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                disabled={page <= 1}
              >
                <ChevronLeft className="mr-1 h-4 w-4" />上一页
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl"
                onClick={() => setPage((prev) => Math.min(prev + 1, totalPages || 1))}
                disabled={page >= totalPages}
              >
                下一页<ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
