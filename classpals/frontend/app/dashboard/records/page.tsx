'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dashboardApi } from '@/lib/api/dashboard';
import { pointsApi } from '@/lib/api/students';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, TrendingUp, TrendingDown, Undo2, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useActiveClass } from '@/lib/hooks/use-active-class';

type PeriodType = 'total' | 'week' | 'month' | 'custom';
type RecordType = 'all' | 'add' | 'deduct';
type RankingMode = 'student' | 'group';

const periodLabels: Record<PeriodType, string> = {
  total: '总榜',
  week: '周榜',
  month: '月榜',
  custom: '自定义',
};

const rankingModeLabels: Record<RankingMode, string> = {
  student: '个人排行',
  group: '小组排行',
};

export default function RecordsPage() {
  const queryClient = useQueryClient();
  const { activeClassId, isLoading: classLoading } = useActiveClass();

  const [rankingMode, setRankingMode] = useState<RankingMode>('student');
  const [period, setPeriod] = useState<PeriodType>('total');
  const [draftRankingStartDate, setDraftRankingStartDate] = useState('');
  const [draftRankingEndDate, setDraftRankingEndDate] = useState('');
  const [appliedRankingStartDate, setAppliedRankingStartDate] = useState('');
  const [appliedRankingEndDate, setAppliedRankingEndDate] = useState('');
  const [groupPeriod, setGroupPeriod] = useState<PeriodType>('total');
  const [draftGroupStartDate, setDraftGroupStartDate] = useState('');
  const [draftGroupEndDate, setDraftGroupEndDate] = useState('');
  const [appliedGroupStartDate, setAppliedGroupStartDate] = useState('');
  const [appliedGroupEndDate, setAppliedGroupEndDate] = useState('');

  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);
  const [studentName, setStudentName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [recordType, setRecordType] = useState<RecordType>('all');
  const [page, setPage] = useState(1);
  const limit = 50;

  const isCustomRangeReady = period !== 'custom' || (!!appliedRankingStartDate && !!appliedRankingEndDate);
  const isCustomDraftReady = !!draftRankingStartDate && !!draftRankingEndDate;
  const isGroupCustomRangeReady = groupPeriod !== 'custom' || (!!appliedGroupStartDate && !!appliedGroupEndDate);
  const isGroupCustomDraftReady = !!draftGroupStartDate && !!draftGroupEndDate;

  const activePeriod = rankingMode === 'student' ? period : groupPeriod;
  const activeDraftStartDate = rankingMode === 'student' ? draftRankingStartDate : draftGroupStartDate;
  const activeDraftEndDate = rankingMode === 'student' ? draftRankingEndDate : draftGroupEndDate;
  const activeAppliedStartDate = rankingMode === 'student' ? appliedRankingStartDate : appliedGroupStartDate;
  const activeAppliedEndDate = rankingMode === 'student' ? appliedRankingEndDate : appliedGroupEndDate;
  const isActiveCustomRangeReady = rankingMode === 'student' ? isCustomRangeReady : isGroupCustomRangeReady;
  const isActiveCustomDraftReady = rankingMode === 'student' ? isCustomDraftReady : isGroupCustomDraftReady;

  const { data: studentRankingData } = useQuery({
    queryKey: ['student-ranking', activeClassId, period, appliedRankingStartDate, appliedRankingEndDate],
    queryFn: () => dashboardApi.studentRanking(activeClassId!, {
      period,
      startDate: period === 'custom' ? appliedRankingStartDate : undefined,
      endDate: period === 'custom' ? appliedRankingEndDate : undefined,
    }),
    enabled: !!activeClassId && isCustomRangeReady,
  });

  const { data: groupRankingData } = useQuery({
    queryKey: ['group-ranking', activeClassId, groupPeriod, appliedGroupStartDate, appliedGroupEndDate],
    queryFn: () => dashboardApi.groupRanking(activeClassId!, {
      period: groupPeriod,
      startDate: groupPeriod === 'custom' ? appliedGroupStartDate : undefined,
      endDate: groupPeriod === 'custom' ? appliedGroupEndDate : undefined,
    }),
    enabled: !!activeClassId && isGroupCustomRangeReady,
  });

  const { data: recordsData, isLoading: recordsLoading } = useQuery({
    queryKey: ['class-records', activeClassId, studentName, startDate, endDate, recordType, page],
    queryFn: () =>
      dashboardApi.getClassRecords(activeClassId!, {
        studentName: studentName || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        type: recordType,
        page,
        limit,
      }),
    enabled: !!activeClassId,
  });

  const revokeMutation = useMutation({
    mutationFn: (recordId: string) => pointsApi.revoke(recordId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['class-records'] });
      queryClient.invalidateQueries({ queryKey: ['student-ranking'] });
      queryClient.invalidateQueries({ queryKey: ['group-ranking'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-overview'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-ranking'] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
    },
  });

  const studentRanking: any[] = Array.isArray(studentRankingData)
    ? studentRankingData as any[]
    : Array.isArray((studentRankingData as any)?.data)
      ? (studentRankingData as any).data
      : [];
  const groupRanking: any[] = Array.isArray(groupRankingData)
    ? groupRankingData as any[]
    : Array.isArray((groupRankingData as any)?.data)
      ? (groupRankingData as any).data
      : [];
  const records = Array.isArray((recordsData as any)?.records)
    ? (recordsData as any).records
    : Array.isArray((recordsData as any)?.data?.records)
      ? (recordsData as any).data.records
      : [];
  const total = (recordsData as any)?.total || (recordsData as any)?.data?.total || 0;
  const totalPages = (recordsData as any)?.totalPages || (recordsData as any)?.data?.totalPages || 1;
  const activeRankingList = rankingMode === 'student' ? studentRanking : groupRanking;

  const handleRevoke = (recordId: string) => {
    if (confirm('确定要撤销这条记录吗？')) {
      revokeMutation.mutate(recordId);
    }
  };

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

  const handlePeriodChange = (nextPeriod: PeriodType) => {
    setPeriod(nextPeriod);
    if (nextPeriod !== 'custom') {
      setDraftRankingStartDate('');
      setDraftRankingEndDate('');
      setAppliedRankingStartDate('');
      setAppliedRankingEndDate('');
    }
  };

  const handleApplyCustomRange = () => {
    if (!isCustomDraftReady) return;
    setAppliedRankingStartDate(draftRankingStartDate);
    setAppliedRankingEndDate(draftRankingEndDate);
  };

  const handleClearCustomRange = () => {
    setDraftRankingStartDate('');
    setDraftRankingEndDate('');
    setAppliedRankingStartDate('');
    setAppliedRankingEndDate('');
  };

  const handleGroupPeriodChange = (nextPeriod: PeriodType) => {
    setGroupPeriod(nextPeriod);
    if (nextPeriod !== 'custom') {
      setDraftGroupStartDate('');
      setDraftGroupEndDate('');
      setAppliedGroupStartDate('');
      setAppliedGroupEndDate('');
    }
  };

  const handleApplyGroupCustomRange = () => {
    if (!isGroupCustomDraftReady) return;
    setAppliedGroupStartDate(draftGroupStartDate);
    setAppliedGroupEndDate(draftGroupEndDate);
  };

  const handleClearGroupCustomRange = () => {
    setDraftGroupStartDate('');
    setDraftGroupEndDate('');
    setAppliedGroupStartDate('');
    setAppliedGroupEndDate('');
  };

  const handleActivePeriodChange = (nextPeriod: PeriodType) => {
    if (rankingMode === 'student') {
      handlePeriodChange(nextPeriod);
      return;
    }

    handleGroupPeriodChange(nextPeriod);
  };

  const handleActiveDraftStartDateChange = (value: string) => {
    if (rankingMode === 'student') {
      setDraftRankingStartDate(value);
      return;
    }

    setDraftGroupStartDate(value);
  };

  const handleActiveDraftEndDateChange = (value: string) => {
    if (rankingMode === 'student') {
      setDraftRankingEndDate(value);
      return;
    }

    setDraftGroupEndDate(value);
  };

  const handleApplyActiveCustomRange = () => {
    if (rankingMode === 'student') {
      handleApplyCustomRange();
      return;
    }

    handleApplyGroupCustomRange();
  };

  const handleClearActiveCustomRange = () => {
    if (rankingMode === 'student') {
      handleClearCustomRange();
      return;
    }

    handleClearGroupCustomRange();
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
                <TrendingUp className="h-7 w-7" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">积分明细</h1>
                <p className="mt-1 text-sm text-muted-foreground">统一查看班级排行表现与积分变动明细</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 text-sm">
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">记录 {total}</span>
              <span className="rounded-full bg-purple-50 px-3 py-1 text-purple-700">当前模式 {rankingModeLabels[rankingMode]}</span>
            </div>
          </div>
        </div>

        <Tabs defaultValue="ranking" className="space-y-6">
          <TabsList className="grid w-full max-w-sm grid-cols-2 rounded-2xl border bg-card p-1 shadow-sm">
            <TabsTrigger value="ranking" className="rounded-xl">排行榜</TabsTrigger>
            <TabsTrigger value="records" className="rounded-xl">积分明细</TabsTrigger>
          </TabsList>

        <TabsContent value="ranking" className="mt-0">
          <Card className="overflow-hidden rounded-3xl border bg-card shadow-sm">
            <div className="border-b bg-muted/30 px-6 py-6">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">班级积分排行</p>
                  <h2 className="mt-2 text-2xl font-semibold">{rankingModeLabels[rankingMode]}</h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    按当前维度展示班级内{rankingMode === 'student' ? '学生' : '小组'}积分排名
                  </p>
                </div>

                <div className="flex flex-col gap-3 xl:items-end">
                  <div className="inline-flex w-fit rounded-2xl bg-muted p-1">
                    {(['student', 'group'] as RankingMode[]).map((mode) => (
                      <button
                        key={mode}
                        onClick={() => setRankingMode(mode)}
                        className={cn(
                          'rounded-xl px-4 py-2 text-sm font-medium transition-colors',
                          rankingMode === mode ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                        )}
                      >
                        {rankingModeLabels[mode]}
                      </button>
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-2 xl:justify-end">
                    {(['total', 'month', 'week', 'custom'] as PeriodType[]).map((item) => (
                      <button
                        key={item}
                        onClick={() => handleActivePeriodChange(item)}
                        className={cn(
                          'rounded-xl border px-4 py-2 text-sm font-medium transition-colors',
                          activePeriod === item
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-border bg-card text-muted-foreground hover:bg-muted/40 hover:text-foreground'
                        )}
                      >
                        {periodLabels[item]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6">
              {activePeriod === 'custom' && (
                <div className="mb-6 rounded-2xl border border bg-muted/30 p-4">
                  <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                    <div className="grid gap-3 md:grid-cols-[1fr_auto_1fr] xl:min-w-[420px]">
                      <Input
                        type="date"
                        value={activeDraftStartDate}
                        onChange={(e) => handleActiveDraftStartDateChange(e.target.value)}
                        className="bg-card"
                      />
                      <div className="flex items-center justify-center text-sm text-muted-foreground">至</div>
                      <Input
                        type="date"
                        value={activeDraftEndDate}
                        onChange={(e) => handleActiveDraftEndDateChange(e.target.value)}
                        className="bg-card"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleApplyActiveCustomRange} disabled={!isActiveCustomDraftReady}>应用</Button>
                      <Button variant="outline" onClick={handleClearActiveCustomRange}>清空</Button>
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">
                    {activeAppliedStartDate && activeAppliedEndDate
                      ? `当前范围：${activeAppliedStartDate} ~ ${activeAppliedEndDate}`
                      : '请选择时间范围后点击“应用”'}
                  </p>
                </div>
              )}

              {activePeriod === 'custom' && !isActiveCustomRangeReady ? (
                <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-dashed border bg-muted/30">
                  <p className="text-sm text-muted-foreground">请选择开始和结束日期</p>
                </div>
              ) : activeRankingList.length === 0 ? (
                <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-dashed border bg-muted/30">
                  <p className="text-sm text-muted-foreground">暂无数据</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {activeRankingList.map((item: any, index: number) => {
                    const points = item.points ?? item.periodPoints ?? item.totalPoints ?? 0;
                    const memberCount = item.memberCount ?? 0;
                    const averagePoints = item.avgPoints ?? (
                      memberCount > 0 ? Number(((points || 0) / memberCount).toFixed(1)) : 0
                    );
                    const isGroupMode = rankingMode === 'group';
                    const isTopRow = index === 0;
                    const isExpanded = expandedGroupId === item.id;
                    const groupMembers = Array.isArray(item.members) ? item.members : [];
                    const sortedGroupMembers = [...groupMembers].sort((a: any, b: any) => {
                      const aPoints = a.points ?? a.periodPoints ?? a.totalPoints ?? 0;
                      const bPoints = b.points ?? b.periodPoints ?? b.totalPoints ?? 0;
                      if (bPoints !== aPoints) return bPoints - aPoints;
                      const aAvailable = a.availablePoints ?? 0;
                      const bAvailable = b.availablePoints ?? 0;
                      if (bAvailable !== aAvailable) return bAvailable - aAvailable;
                      return a.name.localeCompare(b.name, 'zh-CN', { sensitivity: 'base' });
                    });

                    return (
                      <div
                        key={item.id}
                        className={cn(
                          'rounded-2xl border bg-card transition-colors hover:border-primary/40',
                          isGroupMode && isTopRow ? 'border-amber-300' : 'border-border'
                        )}
                      >
                        {isGroupMode ? (
                          <>
                            <button
                              type="button"
                              onClick={() => setExpandedGroupId((current) => (current === item.id ? null : item.id))}
                              className="grid w-full gap-4 px-5 py-5 text-left text-sm text-muted-foreground md:grid-cols-[120px_1fr_1fr_1fr_auto] md:items-center"
                            >
                              <div className="flex items-center gap-3">
                                <div className="text-3xl font-semibold text-foreground">
                                  {index + 1}
                                </div>
                                <div>
                                  <div className="text-2xl font-semibold text-foreground">{item.name}</div>
                                </div>
                              </div>
                              <div>
                                <div className="text-xs text-muted-foreground">人数</div>
                                <div className="mt-1 text-3xl font-semibold text-foreground">{memberCount}</div>
                              </div>
                              <div>
                                <div className="text-xs text-muted-foreground">累计积分</div>
                                <div className="mt-1 text-3xl font-semibold text-emerald-500">{points}</div>
                              </div>
                              <div>
                                <div className="text-xs text-muted-foreground">人均</div>
                                <div className="mt-1 text-3xl font-semibold text-blue-600">{averagePoints}</div>
                              </div>
                              <div className="text-right text-base text-muted-foreground">{isExpanded ? '收起' : '展开'}</div>
                            </button>

                            {isExpanded && (
                              <div className="border-t border bg-muted/30/70 px-5 py-3">
                                <div className="space-y-0 overflow-hidden rounded-2xl border border-amber-200 bg-card">
                                  {sortedGroupMembers.length === 0 ? (
                                    <div className="px-5 py-4 text-sm text-muted-foreground">暂无组员</div>
                                  ) : (
                                    sortedGroupMembers.map((member: any, memberIndex: number) => (
                                      <div
                                        key={member.id}
                                        className={cn(
                                          'grid gap-3 px-5 py-4 text-sm md:grid-cols-[80px_minmax(0,1fr)_auto_auto] md:items-center',
                                          memberIndex !== sortedGroupMembers.length - 1 && 'border-b border-border'
                                        )}
                                      >
                                        <div className="text-3xl font-medium text-muted-foreground">#{memberIndex + 1}</div>
                                        <div className="min-w-0">
                                          <div className="truncate text-xl font-semibold text-foreground">{member.name}</div>
                                        </div>
                                        <div className="text-right text-lg font-semibold text-emerald-500">
                                          累计积分 {member.points ?? member.periodPoints ?? member.totalPoints ?? 0}
                                        </div>
                                        <div className="text-right text-lg font-semibold text-fuchsia-500">
                                          可兑换积分 {member.availablePoints ?? 0}
                                        </div>
                                      </div>
                                    ))
                                  )}
                                </div>
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="flex flex-col gap-4 px-5 py-5 md:flex-row md:items-center">
                            <div className="flex items-center gap-4 md:min-w-[220px]">
                              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-base font-semibold text-muted-foreground">
                                {index + 1}
                              </div>
                              <div>
                                <div className="text-base font-semibold text-foreground">{item.name}</div>
                                <div className="mt-1 text-sm text-muted-foreground">{item.studentNumber || '未设置学号'}</div>
                              </div>
                            </div>

                            <div className="grid flex-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                              <div className="rounded-2xl bg-muted/30 px-4 py-3">
                                <div className="text-xs text-muted-foreground">排行维度</div>
                                <div className="mt-1 text-sm font-medium text-foreground">{periodLabels[activePeriod]}</div>
                              </div>
                              <div className="rounded-2xl bg-muted/30 px-4 py-3">
                                <div className="text-xs text-muted-foreground">当前对象</div>
                                <div className="mt-1 text-sm font-medium text-foreground">学生个人</div>
                              </div>
                              <div className="rounded-2xl bg-primary/10 px-4 py-3 text-primary sm:col-span-2 xl:col-span-1">
                                <div className="text-xs text-muted-foreground">积分</div>
                                <div className="mt-1 flex items-center gap-2">
                                  <span className="text-2xl font-semibold">{points}</span>
                                  <Badge variant="secondary" className="bg-card/15 text-white hover:bg-card/15">
                                    分
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="records" className="mt-0 space-y-4">
          <Card className="rounded-3xl border bg-card p-4 shadow-sm">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-foreground">积分历史</h2>
              <p className="mt-1 text-sm text-muted-foreground">按学生、时间与类型筛选积分变动记录</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="搜索学生姓名"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                />
              </div>
              <Input
                type="date"
                placeholder="开始日期"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
              <Input
                type="date"
                placeholder="结束日期"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
              <select
                className="rounded-lg border px-3 py-2 text-sm"
                value={recordType}
                onChange={(e) => setRecordType(e.target.value as RecordType)}
              >
                <option value="all">全部类型</option>
                <option value="add">仅加分</option>
                <option value="deduct">仅扣分</option>
              </select>
              <div className="flex gap-2">
                <Button onClick={handleSearch} className="flex-1">搜索</Button>
                <Button variant="outline" onClick={handleReset}>重置</Button>
              </div>
            </div>
          </Card>

          <Card className="rounded-3xl border bg-card p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">积分变动记录</h2>
              <span className="text-sm text-muted-foreground">共 {total} 条记录</span>
            </div>

            {recordsLoading ? (
              <div className="py-12 text-center">
                <p className="text-muted-foreground">加载中...</p>
              </div>
            ) : records.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-muted-foreground">暂无记录</p>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {records.map((record: any) => (
                    <div
                      key={record.id}
                      className="rounded-2xl border border-border p-5 transition-colors hover:bg-muted/30"
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="flex min-w-0 gap-4">
                          <div className="flex-shrink-0">
                            {record.type === 'ADD' ? (
                              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100">
                                <TrendingUp className="h-5 w-5 text-emerald-600" />
                              </div>
                            ) : (
                              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-100">
                                <TrendingDown className="h-5 w-5 text-rose-600" />
                              </div>
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-3">
                              <span className="text-xl font-semibold text-foreground">{record.student.name}</span>
                              {record.student.studentNumber && (
                                <span className="rounded-full border border-border bg-card px-2.5 py-1 text-xs text-muted-foreground">
                                  学号：{record.student.studentNumber}
                                </span>
                              )}
                            </div>

                            <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,220px)_minmax(0,1fr)_minmax(0,180px)]">
                              <div>
                                <div className="text-xs text-muted-foreground">规则</div>
                                <div className="mt-1 text-sm text-foreground">{record.ruleName || '—'}</div>
                              </div>
                              <div>
                                <div className="text-xs text-muted-foreground">原因</div>
                                <div className="mt-1 text-sm text-foreground break-all">{record.reason}</div>
                              </div>
                              <div>
                                <div className="text-xs text-muted-foreground">操作人</div>
                                <div className="mt-1 text-sm text-foreground">{record.operatorName}</div>
                              </div>
                            </div>

                            <div className="mt-3 text-sm text-muted-foreground">
                              {new Date(record.createdAt).toLocaleString('zh-CN')}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-3 lg:flex-col lg:items-end">
                          <span
                            className={cn(
                              'inline-flex items-center rounded-full px-4 py-1.5 text-base font-semibold',
                              record.type === 'ADD'
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-rose-100 text-rose-700'
                            )}
                          >
                            {record.type === 'ADD' ? '+' : '-'}{record.value} 分
                          </span>

                          {record.canRevoke && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRevoke(record.id)}
                              disabled={revokeMutation.isPending}
                            >
                              <Undo2 className="mr-1 h-4 w-4" />
                              撤销
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {totalPages > 1 && (
                  <div className="mt-6 flex items-center justify-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      第 {page} / {totalPages} 页
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  </div>
  );
}
