'use client';

import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { shareApi, type ShareLinkItem, type ShareLinksResponse } from '@/lib/api/share';
import { studentsApi } from '@/lib/api/students';
import { useActiveClass } from '@/lib/hooks/use-active-class';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Link,
  Copy,
  Trash2,
  Plus,
  PencilLine,
  Power,
  PowerOff,
  CalendarDays,
  ShieldCheck,
  Eye,
  EyeOff,
  UserRound,
  Clock3,
  Sparkles,
  History,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';


type StudentOption = {
  id: string;
  name: string;
};

type StudentsListResponse = {
  students: StudentOption[];
};

type ShareConfigForm = {
  expiresAt: string;
  allowViewRanking: boolean;
  hidePointRecords: boolean;
  hideDeductions: boolean;
  isActive: boolean;
};

const getLocalDateTimeValue = (dateString?: string) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
};

const formatDateTime = (dateString?: string) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleString('zh-CN');
};

const getLinkStatus = (link: ShareLinkItem) => {
  if (!link.isActive) {
    return { label: '已停用', tone: 'muted' as const, hint: '家长访问会直接看到停用提示' };
  }
  if (new Date(link.expiresAt).getTime() < Date.now()) {
    return { label: '已过期', tone: 'danger' as const, hint: '需要重新设置有效期或创建新链接' };
  }
  return { label: '生效中', tone: 'success' as const, hint: '家长可正常访问当前分享内容' };
};

const getConfigSummary = (link: ShareLinkItem) => {
  if (link.hidePointRecords) {
    return '展示积分概览与宠物信息，隐藏全部积分记录';
  }
  if (link.hideDeductions) {
    return '展示积分记录，但仅显示加分内容';
  }
  return '展示完整积分记录与当前可见模块';
};

const getRemainingDaysLabel = (expiresAt: string) => {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return '已过期';
  const days = Math.ceil(diff / (24 * 60 * 60 * 1000));
  if (days === 1) return '1 天后到期';
  return `${days} 天后到期`;
};

const getSelectionHint = (selectedStudent: StudentOption | undefined, totalCount: number) => {
  if (!selectedStudent) return '请选择学生后创建或管理当前家长查看链接';
  if (totalCount === 0) return '当前学生还没有分享链接，建议先创建 1 条常用链接';
  return `当前学生已有 1 条当前链接，另保留 ${Math.max(totalCount - 1, 0)} 条历史链接`;
};

export default function SharePage() {
  const queryClient = useQueryClient();
  const { activeClassId: classId } = useActiveClass();
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [expiresInDays, setExpiresInDays] = useState('30');
  const [editingLink, setEditingLink] = useState<ShareLinkItem | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [form, setForm] = useState<ShareConfigForm>({
    expiresAt: '',
    allowViewRanking: true,
    hidePointRecords: false,
    hideDeductions: false,
    isActive: true,
  });

  const { data: studentsData } = useQuery({
    queryKey: ['students', classId],
    queryFn: () => studentsApi.list(classId!),
    enabled: !!classId,
  });

  const studentsEnvelope = studentsData as StudentsListResponse | { data?: StudentsListResponse } | undefined;
  const studentsSource = 'data' in (studentsEnvelope || {})
    ? (studentsEnvelope as { data?: StudentsListResponse }).data
    : (studentsEnvelope as StudentsListResponse | undefined);
  const students = (studentsSource?.students ?? []) as StudentOption[];
  const selectedStudent = useMemo(
    () => students.find((student) => student.id === selectedStudentId),
    [selectedStudentId, students]
  );

  const { data: shareLinksData, isLoading: shareLinksLoading } = useQuery({
    queryKey: ['share', selectedStudentId],
    queryFn: () => shareApi.get(selectedStudentId),
    enabled: !!selectedStudentId,
  });

  const shareLinksEnvelope = shareLinksData as ShareLinksResponse | { data?: ShareLinksResponse } | undefined;
  const shareLinksResponse = 'data' in (shareLinksEnvelope || {})
    ? (shareLinksEnvelope as { data?: ShareLinksResponse }).data
    : (shareLinksEnvelope as ShareLinksResponse | undefined);
  const currentLink = shareLinksResponse?.currentLink ?? null;
  const historyLinks = shareLinksResponse?.historyLinks ?? [];
  const totalCount = shareLinksResponse?.totalCount ?? (currentLink ? 1 : 0);
  const historyCount = shareLinksResponse?.historyCount ?? historyLinks.length;
  const activeCount = currentLink && getLinkStatus(currentLink).label === '生效中' ? 1 : 0;
  const disabledCount = currentLink && !currentLink.isActive ? 1 : 0;

  const createShareMutation = useMutation({
    mutationFn: ({ studentId, days }: { studentId: string; days: number }) => {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + days);
      return shareApi.create(studentId, { expiresAt: expiresAt.toISOString() });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['share', selectedStudentId] });
      toast.success('当前分享链接已更新');
    },
    onError: (error: any) => toast.error(error?.message || '生成分享链接失败'),
  });

  const updateShareMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => shareApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['share', selectedStudentId] });
      setEditingLink(null);
      toast.success('分享配置已更新');
    },
    onError: (error: any) => toast.error(error?.message || '更新分享配置失败'),
  });

  const deleteShareMutation = useMutation({
    mutationFn: (id: string) => shareApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['share', selectedStudentId] });
      toast.success('分享链接已删除');
    },
    onError: (error: any) => toast.error(error?.message || '删除分享链接失败'),
  });

  const handleCreate = () => {
    if (!selectedStudentId) return;

    const days = parseInt(expiresInDays, 10);
    if (Number.isNaN(days) || days < 1 || days > 365) {
      toast.error('有效天数需为 1 到 365 之间的整数');
      return;
    }

    createShareMutation.mutate({
      studentId: selectedStudentId,
      days,
    });
  };

  const copyLink = async (token: string) => {
    const url = `${window.location.origin}/parent/${token}`;
    await navigator.clipboard.writeText(url);
    toast.success('链接已复制');
  };

  const openEditDialog = (link: ShareLinkItem) => {
    setEditingLink(link);
    setForm({
      expiresAt: getLocalDateTimeValue(link.expiresAt),
      allowViewRanking: link.allowViewRanking,
      hidePointRecords: link.hidePointRecords,
      hideDeductions: link.hideDeductions,
      isActive: link.isActive,
    });
  };

  const handleSaveConfig = () => {
    if (!editingLink) return;
    if (!form.expiresAt) {
      toast.error('请设置有效期');
      return;
    }

    updateShareMutation.mutate({
      id: editingLink.id,
      data: {
        expiresAt: new Date(form.expiresAt).toISOString(),
        allowViewRanking: form.allowViewRanking,
        hidePointRecords: form.hidePointRecords,
        hideDeductions: form.hidePointRecords ? false : form.hideDeductions,
        isActive: form.isActive,
      },
    });
  };

  const handleToggleActive = (link: ShareLinkItem) => {
    updateShareMutation.mutate({
      id: link.id,
      data: { isActive: !link.isActive },
    });
  };

  if (!classId) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">请先选择班级</p>
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
                <Link className="h-7 w-7" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">家长分享</h1>
                <p className="mt-1 text-sm text-muted-foreground">生成并管理家长查看链接，控制排名、积分记录与扣分内容展示。</p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Card className="overflow-hidden rounded-2xl border bg-card px-4 py-3 shadow-none">
                <p className="text-sm text-muted-foreground">已选学生</p>
                <p className="mt-1 text-lg font-semibold text-foreground">{selectedStudent?.name || '未选择'}</p>
              </Card>
              <Card className="overflow-hidden rounded-2xl border bg-emerald-50 px-4 py-3 shadow-none">
                <p className="text-sm text-emerald-700">生效中链接</p>
                <p className="mt-1 text-2xl font-semibold text-emerald-600">{activeCount}</p>
              </Card>
              <Card className="overflow-hidden rounded-2xl border bg-muted/40 px-4 py-3 shadow-none">
                <p className="text-sm text-muted-foreground">历史链接</p>
                <p className="mt-1 text-2xl font-semibold text-foreground">{historyCount}</p>
              </Card>
            </div>
          </div>
        </div>

        <Card className="overflow-hidden rounded-3xl border bg-card p-5 shadow-sm sm:p-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">创建或更新当前链接</h2>
              <p className="mt-1 text-sm text-muted-foreground">先选择学生，再设置链接有效天数。若已存在当前链接，将直接更新它的有效期与展示配置。</p>
            </div>
            <div className="rounded-2xl bg-muted/30 px-4 py-3 text-sm text-muted-foreground sm:max-w-xs">
              {getSelectionHint(selectedStudent, totalCount)}
            </div>
          </div>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_180px_auto] lg:items-end">
            <div className="space-y-2">
              <Label>选择学生</Label>
              <select
                className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none transition focus:border-ring"
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
              >
                <option value="">请选择学生</option>
                {students.map((student: any) => (
                  <option key={student.id} value={student.id}>
                    {student.name} {student.studentNumber ? `(${student.studentNumber})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>有效天数</Label>
              <Input
                type="number"
                min="1"
                max="365"
                value={expiresInDays}
                onChange={(e) => setExpiresInDays(e.target.value)}
              />
            </div>
            <Button
              onClick={handleCreate}
              disabled={!selectedStudentId || createShareMutation.isPending}
              className="h-11 rounded-xl"
            >
              <Plus className="mr-2 h-4 w-4" />
              {createShareMutation.isPending ? '更新中...' : currentLink ? '更新当前链接' : '创建链接'}
            </Button>
          </div>
        </Card>

        {selectedStudentId && (
          <div className="space-y-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-foreground">{selectedStudent?.name} 的分享链接</h2>
                <p className="mt-1 text-sm text-muted-foreground">链接仅用于家长只读查看，不会修改学生积分、宠物或记录。</p>
              </div>
              {currentLink ? (
                <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[420px]">
                  <Card className="overflow-hidden rounded-2xl border bg-card px-4 py-3 shadow-none">
                    <p className="text-xs text-muted-foreground">当前链接创建于</p>
                    <p className="mt-1 text-sm font-medium text-foreground">{formatDateTime(currentLink.createdAt)}</p>
                  </Card>
                  <Card className="overflow-hidden rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 shadow-none">
                    <p className="text-xs text-amber-600">当前状态</p>
                    <p className="mt-1 text-xl font-semibold text-amber-700">{getLinkStatus(currentLink).label}</p>
                  </Card>
                  <Card className="overflow-hidden rounded-2xl border bg-muted/40 px-4 py-3 shadow-none">
                    <p className="text-xs text-muted-foreground">历史保留</p>
                    <p className="mt-1 text-sm font-medium text-foreground">{historyCount} 条</p>
                  </Card>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed bg-card px-4 py-4 text-sm text-muted-foreground lg:min-w-[320px]">
                  当前还没有可管理的分享链接，先创建 1 条即可。
                </div>
              )}
            </div>

            {shareLinksLoading ? (
              <Card className="overflow-hidden rounded-3xl border bg-card p-10 text-center text-muted-foreground shadow-sm">加载中...</Card>
            ) : !currentLink ? (
              <Card className="overflow-hidden rounded-3xl border bg-card p-10 text-center shadow-sm">
                <p className="text-muted-foreground">暂无分享链接</p>
              </Card>
            ) : (() => {
              const status = getLinkStatus(currentLink);
              return (
                <div className="space-y-4">
                  <Card className="overflow-hidden rounded-3xl border bg-card p-5 shadow-sm sm:p-6">
                    <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                      <div className="min-w-0 flex-1 space-y-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge
                            variant="secondary"
                            className={cn(
                              'rounded-full px-3 py-1 text-sm',
                              status.tone === 'success' && 'bg-emerald-50 text-emerald-700',
                              status.tone === 'danger' && 'bg-rose-50 text-rose-700',
                              status.tone === 'muted' && 'bg-muted text-muted-foreground'
                            )}
                          >
                            当前链接 · {status.label}
                          </Badge>
                          <Badge variant="outline" className="rounded-full px-3 py-1 text-sm text-muted-foreground">
                            <CalendarDays className="mr-1 h-3.5 w-3.5" />
                            {formatDateTime(currentLink.expiresAt)}
                          </Badge>
                          <Badge variant="outline" className="rounded-full px-3 py-1 text-sm text-muted-foreground">
                            <Clock3 className="mr-1 h-3.5 w-3.5" />
                            {getRemainingDaysLabel(currentLink.expiresAt)}
                          </Badge>
                        </div>

                        <div className="rounded-2xl border border-border bg-muted/30 px-4 py-3">
                          <div className="flex items-start gap-3">
                            <Link className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                            <div className="min-w-0">
                              <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">当前分享地址</p>
                              <p className="mt-1 break-all font-mono text-sm text-foreground">/parent/{currentLink.token}</p>
                              <p className="mt-2 text-sm text-muted-foreground">{status.hint}</p>
                            </div>
                          </div>
                        </div>

                        <div className="rounded-2xl border border-border bg-muted/30 px-4 py-3">
                          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                            <Sparkles className="h-4 w-4 text-muted-foreground" />当前配置摘要
                          </div>
                          <p className="mt-2 text-sm text-muted-foreground">{getConfigSummary(currentLink)}</p>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                          <div className="rounded-2xl border border-border bg-muted/30 px-4 py-3">
                            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                              <ShieldCheck className="h-4 w-4 text-muted-foreground" />排名权限
                            </div>
                            <p className="mt-2 text-sm text-muted-foreground">{currentLink.allowViewRanking ? '家长可查看班级排名' : '已关闭排名展示'}</p>
                          </div>
                          <div className="rounded-2xl border border-border bg-muted/30 px-4 py-3">
                            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                              {currentLink.hidePointRecords ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}积分记录
                            </div>
                            <p className="mt-2 text-sm text-muted-foreground">{currentLink.hidePointRecords ? '已隐藏全部积分记录' : '显示最近积分记录'}</p>
                          </div>
                          <div className="rounded-2xl border border-border bg-muted/30 px-4 py-3">
                            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                              <EyeOff className="h-4 w-4 text-muted-foreground" />扣分记录
                            </div>
                            <p className="mt-2 text-sm text-muted-foreground">
                              {currentLink.hidePointRecords ? '已随积分记录一并隐藏' : currentLink.hideDeductions ? '仅显示加分记录' : '显示加分和扣分记录'}
                            </p>
                          </div>
                          <div className="rounded-2xl border border-border bg-muted/30 px-4 py-3">
                            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                              <UserRound className="h-4 w-4 text-muted-foreground" />创建时间
                            </div>
                            <p className="mt-2 text-sm text-muted-foreground">{formatDateTime(currentLink.createdAt)}</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 xl:w-[220px] xl:flex-col">
                        <Button variant="outline" className="flex-1 rounded-xl xl:w-full" onClick={() => copyLink(currentLink.token)}>
                          <Copy className="mr-2 h-4 w-4" />复制完整链接
                        </Button>
                        <Button variant="outline" className="flex-1 rounded-xl xl:w-full" onClick={() => openEditDialog(currentLink)}>
                          <PencilLine className="mr-2 h-4 w-4" />编辑配置
                        </Button>
                        <Button
                          variant="outline"
                          className="flex-1 rounded-xl xl:w-full"
                          onClick={() => handleToggleActive(currentLink)}
                          disabled={updateShareMutation.isPending}
                        >
                          {currentLink.isActive ? <PowerOff className="mr-2 h-4 w-4" /> : <Power className="mr-2 h-4 w-4" />}
                          {currentLink.isActive ? '停用链接' : '启用链接'}
                        </Button>
                        <Button
                          variant="outline"
                          className="flex-1 rounded-xl text-rose-600 hover:text-rose-700 xl:w-full"
                          onClick={() => {
                            if (confirm('确定要删除当前分享链接吗？删除后家长将无法继续通过该链接访问。')) {
                              deleteShareMutation.mutate(currentLink.id);
                            }
                          }}
                          disabled={deleteShareMutation.isPending}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />删除链接
                        </Button>
                      </div>
                    </div>
                  </Card>

                  {historyCount > 0 && (
                    <Card className="rounded-3xl border bg-card p-5 shadow-sm sm:p-6">
                      <button
                        type="button"
                        className="flex w-full items-center justify-between gap-3 text-left"
                        onClick={() => setShowHistory((prev) => !prev)}
                      >
                        <div className="flex items-center gap-3">
                          <History className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium text-slate-900">历史链接</p>
                            <p className="mt-1 text-sm text-muted-foreground">保留 {historyCount} 条旧链接，默认不作为当前管理入口。</p>
                          </div>
                        </div>
                        <Badge variant="outline" className="rounded-full px-3 py-1 text-sm text-muted-foreground">
                          {showHistory ? '收起' : '展开'}
                        </Badge>
                      </button>

                      {showHistory && (
                        <div className="mt-4 space-y-3 border-t border-border pt-4">
                          {historyLinks.map((link) => {
                            const historyStatus = getLinkStatus(link);
                            return (
                              <div key={link.id} className="rounded-2xl border border-border bg-muted/30 px-4 py-3">
                                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                  <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <Badge variant="outline" className="rounded-full px-3 py-1 text-sm text-muted-foreground">
                                        {historyStatus.label}
                                      </Badge>
                                      <span className="text-sm text-muted-foreground">创建于 {formatDateTime(link.createdAt)}</span>
                                    </div>
                                    <p className="mt-2 break-all font-mono text-sm text-muted-foreground">/parent/{link.token}</p>
                                  </div>
                                  <Button variant="outline" size="sm" className="rounded-xl" onClick={() => copyLink(link.token)}>
                                    <Copy className="mr-2 h-4 w-4" />复制
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </Card>
                  )}
                </div>
              );
            })()}
          </div>
        )}
      </div>

      <Dialog open={!!editingLink} onOpenChange={(open) => !open && setEditingLink(null)}>
        <DialogContent className="rounded-3xl border bg-card p-0 shadow-xl sm:max-w-xl">
          <DialogHeader className="border-b bg-muted/30 px-6 py-5">
            <DialogTitle>编辑分享配置</DialogTitle>
            <DialogDescription>修改家长端可见范围、有效期与链接状态。不会影响学生积分、宠物或规则数据。</DialogDescription>
          </DialogHeader>

          <div className="space-y-5 px-6 py-6">
            <div className="rounded-2xl bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
              当前修改会直接影响家长端展示内容，建议保存后重新打开一次分享链接，确认移动端页面显示正常。
            </div>

            <div className="space-y-2">
              <Label>有效期</Label>
              <Input
                type="datetime-local"
                value={form.expiresAt}
                onChange={(e) => setForm((prev) => ({ ...prev, expiresAt: e.target.value }))}
              />
            </div>

            <div className="space-y-4 rounded-2xl border bg-card p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium text-foreground">启用链接</p>
                  <p className="text-sm text-muted-foreground">关闭后，家长访问会直接看到停用状态。</p>
                </div>
                <Switch checked={form.isActive} onCheckedChange={(checked) => setForm((prev) => ({ ...prev, isActive: checked }))} />
              </div>

              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium text-foreground">允许查看排名</p>
                  <p className="text-sm text-muted-foreground">关闭后家长端不展示班级排名模块。</p>
                </div>
                <Switch
                  checked={form.allowViewRanking}
                  onCheckedChange={(checked) => setForm((prev) => ({ ...prev, allowViewRanking: checked }))}
                />
              </div>

              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium text-foreground">显示积分记录</p>
                  <p className="text-sm text-muted-foreground">关闭后，最近积分记录整体隐藏。</p>
                </div>
                <Switch
                  checked={!form.hidePointRecords}
                  onCheckedChange={(checked) =>
                    setForm((prev) => ({
                      ...prev,
                      hidePointRecords: !checked,
                      hideDeductions: checked ? prev.hideDeductions : false,
                    }))
                  }
                />
              </div>

              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium text-foreground">隐藏扣分记录</p>
                  <p className="text-sm text-muted-foreground">开启后，家长端只显示加分记录。</p>
                </div>
                <Switch
                  checked={form.hideDeductions}
                  disabled={form.hidePointRecords}
                  onCheckedChange={(checked) => setForm((prev) => ({ ...prev, hideDeductions: checked }))}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="border-t bg-muted/20 px-6 py-4">
            <Button variant="outline" className="rounded-xl" onClick={() => setEditingLink(null)}>取消</Button>
            <Button onClick={handleSaveConfig} disabled={updateShareMutation.isPending} className="rounded-xl">
              保存配置
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
