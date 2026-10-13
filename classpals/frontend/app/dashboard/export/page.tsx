'use client';

import type { AxiosResponse } from 'axios';
import { ChangeEvent, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Download, FileUp, History, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useActiveClass } from '@/lib/hooks/use-active-class';
import { dataManagementApi } from '@/lib/api/data-management';
import { cn } from '@/lib/utils';

type ImportPreviewStudent = {
  rowNumber: number;
  name: string;
  gender: 'MALE' | 'FEMALE';
  studentNumber?: string;
  groupName?: string;
  isCadre: boolean;
  cadrePosition?: string;
  customPosition?: string;
  totalPoints: number;
  availablePoints: number;
  parentPhones: Array<{ phone: string; relationship: string }>;
};

type ImportPreviewGroup = {
  rowNumber: number;
  name: string;
  leaderName?: string;
};

type ImportPreviewRule = {
  rowNumber: number;
  name: string;
  points: number;
  type: 'ADD' | 'DEDUCT';
  category?: string;
  isEnabled: boolean;
};

type ImportPreviewShopItem = {
  rowNumber: number;
  name: string;
  price: number;
  stock: number | null;
  description?: string;
  isAvailable: boolean;
};

type ImportPreviewConflictSummary = {
  students: string[];
  rules: string[];
  shopItems: string[];
};

type ImportPreviewAppendPlan = {
  skippedStudents: string[];
  skippedRules: string[];
  skippedShopItems: string[];
  studentsToCreate: string[];
  rulesToCreate: string[];
  shopItemsToCreate: string[];
};

type ImportPreviewData = {
  classId: string;
  className: string;
  mode: 'append' | 'replace';
  importableSheetNames: string[];
  canSubmit: boolean;
  conflicts: ImportPreviewConflictSummary;
  blockingReasons: string[];
  appendPlan?: ImportPreviewAppendPlan;
  summary: {
    groups: number;
    students: number;
    rules: number;
    shopItems: number;
    parentPhoneCount: number;
  };
  toCreateGroups: string[];
  students: ImportPreviewStudent[];
  samples: {
    groups: ImportPreviewGroup[];
    rules: ImportPreviewRule[];
    shopItems: ImportPreviewShopItem[];
  };
};

type ImportResultSummary = {
  fileName: string;
  mode: 'append' | 'replace';
  importedGroups: number;
  importedStudents: number;
  importedRules: number;
  importedShopItems: number;
  createdGroups: number;
  skippedStudents: string[];
  skippedRules: string[];
  skippedShopItems: string[];
  dataTypes: string[];
  className?: string;
  message: string;
};

function getImportModeLabel(mode: 'append' | 'replace') {
  return mode === 'replace' ? '覆盖导入' : '追加导入';
}

function getImportModeDescription(mode: 'append' | 'replace') {
  return mode === 'replace'
    ? '会重建当前班级的小组、学生、积分规则、商品四类初始化数据；这不是恢复系统导出备份文件。'
    : '会补充文件中的小组、学生、积分规则、商品；系统已有的同名学生、规则、商品会自动跳过，同名小组会复用。';
}

function getErrorMessage(error: any, fallback: string) {
  const message = error?.response?.data?.message || error?.message || fallback;
  return Array.isArray(message) ? message.join('\n') : String(message);
}

function getImportErrorGuide(message: string) {
  if (!message) return '';
  if (message.includes('表头不匹配')) {
    return '你现在选择的文件很可能不是“系统导入模板”，而是旧模板、手工改过表头的文件，或系统导出的备份文件。请重新下载模板，并只按“小组 / 学生 / 积分规则 / 商品”四个 sheet 填写。';
  }
  if (message.includes('缺少“小组”工作表') || message.includes('缺少“学生”工作表') || message.includes('缺少“积分规则”工作表') || message.includes('缺少“商品”工作表')) {
    return '当前文件缺少初始化导入所需的 sheet。请确认 Excel 中保留了“小组”“学生”“积分规则”“商品”四个工作表，也不要直接使用系统导出的备份文件。';
  }
  if (message.includes('没有可用的小组数据') || message.includes('没有可用的学生数据') || message.includes('没有可用的积分规则数据') || message.includes('没有可用的商品数据')) {
    return '模板结构虽然存在，但对应 sheet 没有可导入的数据。请至少填写一条小组、学生、积分规则、商品记录，并确保必填列没有留空。';
  }
  if (message.includes('已存在，无法追加导入')) {
    return '当前是“追加导入”，班级里已经有同名学生、规则或商品。若只是补充新数据，请修改重名项；若要整体替换，请改用“覆盖导入”。';
  }
  if (message.includes('不存在于“小组”sheet')) {
    return '学生里填写了新的小组名称。按当前规则，这类小组会自动创建；如果你仍看到这条报错，请刷新页面后重试，或重新下载最新模板。';
  }
  if (message.includes('类型非法') || message.includes('分类非法') || message.includes('性别') || message.includes('非法数字')) {
    return '文件里存在不符合模板约束的值。请重点检查学生性别、规则类型、规则分类、积分/价格等列，确认使用的是模板允许的下拉值或合法数字。';
  }
  return '请优先检查：是否使用系统导入模板、是否保留“小组 / 学生 / 积分规则 / 商品”四个 sheet、表头是否被改动，以及追加导入时是否有同名学生/规则/商品。';
}

const snapshotTypeLabel: Record<string, string> = {
  CLEAR_CLASS_POINTS: '清空班级积分',
  DELETE_STUDENT: '删除学生',
};

const snapshotStatusLabel: Record<string, string> = {
  ACTIVE: '可恢复',
  RESTORED: '已恢复',
};

function formatSnapshotTime(value?: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleString('zh-CN');
}

function parseDownloadFileName(contentDisposition?: string) {
  if (!contentDisposition) {
    return `class-data-export-${Date.now()}.xlsx`;
  }

  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1]);
  }

  const plainMatch = contentDisposition.match(/filename="?([^";]+)"?/i);
  if (plainMatch?.[1]) {
    return plainMatch[1];
  }

  return `class-data-export-${Date.now()}.xlsx`;
}

function downloadWorkbook(response: AxiosResponse<Blob>) {
  const fileName = parseDownloadFileName(response.headers['content-disposition']);
  const blob = new Blob([response.data], {
    type:
      response.headers['content-type'] ||
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export default function DataManagementPage() {
  const queryClient = useQueryClient();
  const { activeClassId, currentClass, isLoading: classLoading } = useActiveClass();
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append');
  const [selectedImportFile, setSelectedImportFile] = useState<File | null>(null);
  const [importPreviewOpen, setImportPreviewOpen] = useState(false);
  const [importResultOpen, setImportResultOpen] = useState(false);
  const [replaceConfirmOpen, setReplaceConfirmOpen] = useState(false);
  const [importPreview, setImportPreview] = useState<ImportPreviewData | null>(null);
  const [lastImportResult, setLastImportResult] = useState<ImportResultSummary | null>(null);
  const [importError, setImportError] = useState('');

  const { data: snapshotsData, isLoading: snapshotsLoading } = useQuery({
    queryKey: ['operation-snapshots', activeClassId],
    queryFn: () => dataManagementApi.listSnapshots(activeClassId!),
    enabled: !!activeClassId,
  });

  const snapshots: any[] = (snapshotsData as any)?.data?.snapshots || [];

  const invalidateAfterMutation = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['operation-snapshots'] }),
      queryClient.invalidateQueries({ queryKey: ['students'] }),
      queryClient.invalidateQueries({ queryKey: ['groups'] }),
      queryClient.invalidateQueries({ queryKey: ['class-records'] }),
      queryClient.invalidateQueries({ queryKey: ['student-ranking'] }),
      queryClient.invalidateQueries({ queryKey: ['group-ranking'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard-overview'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard-ranking'] }),
      queryClient.invalidateQueries({ queryKey: ['shop-exchanges'] }),
      queryClient.invalidateQueries({ queryKey: ['student-exchanges'] }),
      queryClient.invalidateQueries({ queryKey: ['shop-items'] }),
      queryClient.invalidateQueries({ queryKey: ['class-pets'] }),
    ]);
  };

  const templateMutation = useMutation({
    mutationFn: () => dataManagementApi.downloadImportTemplate(activeClassId!),
    onSuccess: (response) => {
      downloadWorkbook(response);
      toast.success('模板下载成功');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || error?.message || '模板下载失败');
    },
  });

  const exportImportableMutation = useMutation<AxiosResponse<Blob>, any>({
    mutationFn: () => dataManagementApi.exportImportableClassData(activeClassId!),
    onSuccess: (response) => {
      downloadWorkbook(response);
      toast.success('可再次导入数据导出成功');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || error?.message || '可再次导入数据导出失败');
    },
  });

  const exportMutation = useMutation({
    mutationFn: () => dataManagementApi.exportClassData(activeClassId!),
    onSuccess: (response) => {
      downloadWorkbook(response);
      toast.success('导出成功');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || error?.message || '导出失败');
    },
  });

  const importPreviewMutation = useMutation({
    mutationFn: async ({ file, mode }: { file: File; mode: 'append' | 'replace' }) => {
      const result = await dataManagementApi.importClassPreview(activeClassId!, file, mode);
      return { result, file };
    },
    onSuccess: ({ result, file }) => {
      setImportError('');
      setSelectedImportFile(file);
      setImportPreview(result as unknown as ImportPreviewData);
      setImportPreviewOpen(true);
    },
    onError: (error: any) => {
      const message = getErrorMessage(error, '导入预览失败');
      setImportError(message);
      setLastImportResult(null);
      setImportResultOpen(false);
      toast.error(message);
      clearImportState();
      setImportPreviewOpen(false);
    },
  });

  const importMutation = useMutation({
    mutationFn: ({ file, mode }: { file: File; mode: 'append' | 'replace' }) =>
      dataManagementApi.importClassData(activeClassId!, file, mode),
    onSuccess: async (result) => {
      await invalidateAfterMutation();
      const summary = result as any;
      const importedGroups = typeof summary?.importedGroups === 'number' ? summary.importedGroups : importPreview?.summary.groups || 0;
      const importedStudents = typeof summary?.importedStudents === 'number' ? summary.importedStudents : importPreview?.summary.students || 0;
      const importedRules = typeof summary?.importedRules === 'number' ? summary.importedRules : importPreview?.summary.rules || 0;
      const importedShopItems = typeof summary?.importedShopItems === 'number' ? summary.importedShopItems : importPreview?.summary.shopItems || 0;
      const createdGroups = typeof summary?.createdGroups === 'number' ? summary.createdGroups : importPreview?.toCreateGroups?.length || 0;
      const skippedStudents = Array.isArray(summary?.skippedStudents) ? summary.skippedStudents : [];
      const skippedRules = Array.isArray(summary?.skippedRules) ? summary.skippedRules : [];
      const skippedShopItems = Array.isArray(summary?.skippedShopItems) ? summary.skippedShopItems : [];
      const mode = (summary?.mode || importPreview?.mode || importMode) as 'append' | 'replace';
      const message =
        summary?.message ||
        `已${mode === 'replace' ? '覆盖' : '追加'}导入 ${importedGroups} 个小组、${importedStudents} 名学生、${importedRules} 条规则、${importedShopItems} 个商品`;

      setImportError('');
      setLastImportResult({
        fileName: selectedImportFile?.name || '未命名文件',
        mode,
        importedGroups,
        importedStudents,
        importedRules,
        importedShopItems,
        createdGroups,
        skippedStudents,
        skippedRules,
        skippedShopItems,
        dataTypes: importPreview?.importableSheetNames?.length ? importPreview.importableSheetNames : ['小组', '学生', '积分规则', '商品'],
        className: summary?.className || importPreview?.className,
        message,
      });
      setImportResultOpen(true);
      toast.success(message);
      clearImportState();
      setImportPreviewOpen(false);
      setReplaceConfirmOpen(false);
    },
    onError: (error: any) => {
      const message = getErrorMessage(error, '导入失败');
      setImportError(message);
      setImportResultOpen(false);
      toast.error(message);
      setReplaceConfirmOpen(false);
      setImportPreviewOpen(false);
    },
  });

  const clearPointsMutation = useMutation({
    mutationFn: () => dataManagementApi.clearClassPoints(activeClassId!),
    onSuccess: async (result) => {
      await invalidateAfterMutation();
      const snapshot = (result as any)?.data?.snapshot;
      toast.success(snapshot?.summary || '班级积分已清空，并已生成恢复记录');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || '清空班级积分失败');
    },
  });

  const restoreMutation = useMutation({
    mutationFn: (snapshotId: string) => dataManagementApi.restoreSnapshot(snapshotId),
    onSuccess: async (result) => {
      await invalidateAfterMutation();
      toast.success((result as any)?.data?.message || '恢复成功');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || '恢复失败');
    },
  });

  const latestSnapshots = useMemo(() => snapshots.slice(0, 12), [snapshots]);
  const activeSnapshotCount = useMemo(
    () => snapshots.filter((snapshot) => snapshot.status === 'ACTIVE').length,
    [snapshots]
  );
  const importableSheetNames = importPreview?.importableSheetNames?.length
    ? importPreview.importableSheetNames.join('、')
    : '小组、学生、积分规则、商品';
  const importErrorGuide = getImportErrorGuide(importError);
  const importPreviewConflicts = importPreview?.conflicts || { students: [], rules: [], shopItems: [] };
  const importPreviewBlockingReasons = importPreview?.blockingReasons || [];
  const importPreviewAppendPlan = importPreview?.appendPlan;
  const importPreviewHasBlockingConflicts = !importPreview?.canSubmit;
  const currentImportStep = importPreviewOpen
    ? 3
    : selectedImportFile || importPreviewMutation.isPending || importMutation.isPending
      ? 2
      : 1;
  const importSteps = [
    { id: 1, label: '选择模式' },
    { id: 2, label: '上传文件' },
    { id: 3, label: '确认导入' },
  ] as const;
  const importFlowStatus = importPreviewMutation.isPending
    ? '正在解析文件…'
    : importMutation.isPending
      ? '正在导入数据…'
      : importPreviewOpen
        ? importPreviewHasBlockingConflicts
          ? '预览完成，存在冲突需先处理'
          : '预览完成，等待确认导入'
        : importResultOpen && lastImportResult
          ? '导入成功，可查看结果'
          : importError
            ? '导入失败，请检查错误原因'
            : selectedImportFile
              ? '已选择文件，等待解析'
              : '请选择文件开始导入';

  const clearImportState = () => {
    setSelectedImportFile(null);
    setImportPreview(null);
    setImportError('');
    setReplaceConfirmOpen(false);
    if (importInputRef.current) {
      importInputRef.current.value = '';
    }
  };

  const handleClearPoints = () => {
    if (!activeClassId) return;
    if (!window.confirm('确定要清空当前班级所有学生积分吗？此操作会生成恢复记录。')) {
      return;
    }
    clearPointsMutation.mutate();
  };

  const handleRestore = (snapshotId: string) => {
    if (!window.confirm('确定要恢复这条记录吗？恢复后不能再次恢复同一条记录。')) {
      return;
    }
    restoreMutation.mutate(snapshotId);
  };

  const handleExportImportable = () => {
    if (!activeClassId) return;
    exportImportableMutation.mutate();
  };

  const handleExport = () => {
    if (!activeClassId) return;
    exportMutation.mutate();
  };

  const handleDownloadTemplate = () => {
    if (!activeClassId) return;
    templateMutation.mutate();
  };

  const handleImportTrigger = () => {
    setImportError('');
    importInputRef.current?.click();
  };

  const handleImportFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!activeClassId || !file) {
      if (importInputRef.current) {
        importInputRef.current.value = '';
      }
      return;
    }

    const normalizedName = file.name.toLowerCase();
    const isExcelFile =
      normalizedName.endsWith('.xlsx') ||
      file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

    if (!isExcelFile) {
      setSelectedImportFile(file);
      setImportPreview(null);
      setLastImportResult(null);
      setImportResultOpen(false);
      setImportError('仅支持导入 .xlsx 文件，请先下载系统模板并按模板填写后再导入。');
      if (importInputRef.current) {
        importInputRef.current.value = '';
      }
      return;
    }

    setSelectedImportFile(file);
    setLastImportResult(null);
    setImportResultOpen(false);
    setImportError('');
    importPreviewMutation.mutate({ file, mode: importMode });
  };

  const handleConfirmImport = () => {
    if (!selectedImportFile || !activeClassId) return;
    if (importMode === 'replace') {
      setReplaceConfirmOpen(true);
      return;
    }
    importMutation.mutate({ file: selectedImportFile, mode: importMode });
  };

  const handleConfirmReplaceImport = () => {
    if (!selectedImportFile || !activeClassId) return;
    importMutation.mutate({ file: selectedImportFile, mode: 'replace' });
  };

  const handlePreviewOpenChange = (open: boolean) => {
    setImportPreviewOpen(open);
    if (!open && !importMutation.isPending) {
      clearImportState();
    }
  };

  if (classLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-gray-500">加载中...</p>
      </div>
    );
  }

  if (!activeClassId) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-gray-500">请先选择班级</p>
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
                <Download className="h-7 w-7" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">数据管理</h1>
                <p className="mt-1 text-sm text-muted-foreground">统一管理数据导入、数据导出、危险操作与恢复记录。</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 text-sm">
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">恢复记录 {snapshots.length}</span>
              <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-700">可恢复 {activeSnapshotCount}</span>
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <Card className="overflow-hidden rounded-3xl border bg-card p-6 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-4">
                <div className="rounded-2xl bg-blue-100 p-3">
                  <Download className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">数据导出</h2>
                  <p className="mt-1 text-sm text-muted-foreground">区分三种文件：标准空模板、可再次导入模板数据、完整班级备份。</p>
                </div>
              </div>
              <div className="text-left lg:text-right">
                <p className="text-lg font-semibold text-foreground">{currentClass?.name || '未识别班级'}</p>
                <p className="text-sm text-muted-foreground">
                  {currentClass?.teacherName ? `班主任：${currentClass.teacherName}` : '请先确认当前班级'}
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-4 xl:grid-cols-3">
              <div className="rounded-3xl border border-primary/20 bg-primary/5 p-5">
                <p className="text-sm font-medium text-foreground">下载标准模板</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  系统初始化时使用。只包含“小组 / 学生 / 积分规则 / 商品”四个 sheet 和填写说明。
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-4 gap-2 rounded-xl border-red-200 bg-white text-red-700 hover:bg-red-50 hover:text-red-800"
                  onClick={handleDownloadTemplate}
                  disabled={templateMutation.isPending}
                >
                  <Download className="h-4 w-4" />
                  {templateMutation.isPending ? '下载中...' : '下载模板'}
                </Button>
              </div>

              <div className="rounded-3xl border border-emerald-200 bg-emerald-50/70 p-5">
                <p className="text-sm font-medium text-foreground">导出可再次导入数据</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  导出当前班级四类初始化数据，补充新行后可重新走追加/覆盖导入。
                </p>
                <Button
                  className="mt-4 gap-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700"
                  onClick={handleExportImportable}
                  disabled={exportImportableMutation.isPending}
                >
                  <Download className="h-4 w-4" />
                  {exportImportableMutation.isPending ? '导出中...' : '导出可回导数据'}
                </Button>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-sm font-medium text-foreground">导出完整班级数据</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  含班级信息、积分记录、商品兑换、宠物等扩展 sheet，仅用于查看或备份，不可直接回导。
                </p>
                <Button className="mt-4 gap-2 rounded-xl" onClick={handleExport} disabled={exportMutation.isPending}>
                  <Download className="h-4 w-4" />
                  {exportMutation.isPending ? '导出中...' : '导出完整数据'}
                </Button>
              </div>
            </div>
          </Card>

          <Card className="overflow-hidden rounded-3xl border bg-card p-6 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="rounded-2xl bg-emerald-100 p-3">
                <FileUp className="h-6 w-6 text-emerald-600" />
              </div>
              <div className="flex-1 space-y-5">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">数据导入</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    使用系统模板一次性初始化当前班级的小组、学生、积分规则、商品四类数据。
                  </p>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-slate-50/70 px-5 py-4">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    {importSteps.map((step, index) => {
                      const isActive = currentImportStep === step.id;
                      const isCompleted = currentImportStep > step.id;
                      return (
                        <div key={step.id} className="flex flex-1 items-center gap-3">
                          <div
                            className={cn(
                              'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-colors',
                              isActive || isCompleted
                                ? 'bg-slate-900 text-white'
                                : 'border border-slate-200 bg-white text-slate-400'
                            )}
                          >
                            {step.id}
                          </div>
                          <div className="min-w-0">
                            <p
                              className={cn(
                                'text-sm font-medium transition-colors',
                                isActive || isCompleted ? 'text-slate-900' : 'text-slate-400'
                              )}
                            >
                              {step.label}
                            </p>
                            {isActive ? <p className="mt-1 text-xs text-slate-500">当前进行中</p> : null}
                          </div>
                          {index < importSteps.length - 1 ? (
                            <div className="ml-auto hidden h-px flex-1 bg-slate-200 md:block" />
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-xs font-medium tracking-wide text-slate-500">导入目标班级</p>
                      <p className="mt-2 text-2xl font-semibold text-slate-900">{currentClass?.name || '未识别班级'}</p>
                      <p className="mt-1 text-sm text-slate-600">
                        {currentClass?.teacherName ? `班主任：${currentClass.teacherName}` : '请确认当前激活班级后再导入'}
                      </p>
                    </div>
                    <Badge className="rounded-full bg-slate-900 px-3 py-1 text-white hover:bg-slate-900">
                      当前班级
                    </Badge>
                  </div>
                  <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                    系统不会按 Excel 文件名自动识别班级。若你要导入“三年五班”文件，这里的目标班级也必须是“三年五班”。
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-3xl border border-slate-200 bg-white p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">第 1 步：选择导入模式</p>
                        <p className="mt-1 text-sm text-slate-600">先确定是补充初始化数据，还是用文件重建当前班级的四类初始化数据。</p>
                      </div>
                      <p className="text-xs text-slate-400">Step 1</p>
                    </div>

                    <div className="mt-4 inline-flex w-full rounded-2xl bg-slate-100 p-1">
                      <button
                        type="button"
                        className={cn(
                          'flex-1 rounded-xl px-4 py-3 text-sm font-medium transition-colors',
                          importMode === 'append'
                            ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-300'
                            : 'text-slate-500 hover:text-slate-900'
                        )}
                        onClick={() => setImportMode('append')}
                        disabled={importMutation.isPending || importPreviewMutation.isPending}
                      >
                        追加导入
                      </button>
                      <button
                        type="button"
                        className={cn(
                          'flex-1 rounded-xl px-4 py-3 text-sm font-medium transition-colors',
                          importMode === 'replace'
                            ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-300'
                            : 'text-slate-500 hover:text-slate-900'
                        )}
                        onClick={() => setImportMode('replace')}
                        disabled={importMutation.isPending || importPreviewMutation.isPending}
                      >
                        覆盖导入
                      </button>
                    </div>

                    <div
                      className={cn(
                        'mt-4 rounded-2xl border px-4 py-3 text-sm leading-6',
                        importMode === 'replace'
                          ? 'border-red-200 bg-red-50 text-red-700'
                          : 'border-slate-200 bg-slate-50 text-slate-700'
                      )}
                    >
                      {importMode === 'replace'
                        ? '覆盖导入会重建当前班级的小组、学生、积分规则、商品四类初始化数据。'
                        : '追加导入会补充文件中的小组、学生、积分规则、商品；系统已有的同名学生、规则、商品会自动跳过，同名小组会复用。'}
                    </div>
                  </div>

                  <div className="rounded-3xl border border-slate-200 bg-white p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">第 2 步：下载模板并上传文件</p>
                        <p className="mt-1 text-sm text-slate-600">先下载模板并填写四类数据，再上传 `.xlsx` 文件，系统会先做预览校验。</p>
                      </div>
                      <p className="text-xs text-slate-400">Step 2</p>
                    </div>

                    <input
                      ref={importInputRef}
                      type="file"
                      accept=".xlsx"
                      className="hidden"
                      onChange={handleImportFileChange}
                    />

                    <div className="mt-4 grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
                      <div className="rounded-3xl border border-primary/20 bg-primary/5 p-5">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                          <div className="space-y-1">
                            <p className="text-sm font-medium text-foreground">下载导入模板</p>
                            <p className="text-sm text-muted-foreground">
                              请填写“小组 / 学生 / 积分规则 / 商品”四个 sheet；学生里填写的新小组名称会自动创建。标准模板适合从空白开始录入；若要在当前班级数据基础上继续补充，请使用上方“导出可再次导入数据”。
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            className="gap-2 rounded-xl border-red-200 bg-white text-red-700 hover:bg-red-50 hover:text-red-800"
                            onClick={handleDownloadTemplate}
                            disabled={templateMutation.isPending}
                          >
                            <Download className="h-4 w-4" />
                            {templateMutation.isPending ? '下载中...' : '下载模板'}
                          </Button>
                        </div>
                      </div>

                      <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
                        <p className="font-medium text-slate-900">填写提示</p>
                        <p className="mt-2 leading-6">
                          建议先下载模板再填写。请至少准备“小组 / 学生 / 积分规则 / 商品”四类数据；学生里写到的新小组会自动创建，积分不会填时填 0，没有组长、家长手机号或库存时可按模板说明留空。
                        </p>
                      </div>
                    </div>

                    <Button
                      className="mt-4 h-12 w-full gap-2 rounded-2xl bg-slate-900 text-base text-white hover:bg-slate-800"
                      onClick={handleImportTrigger}
                      disabled={importMutation.isPending || importPreviewMutation.isPending}
                    >
                      <FileUp className="h-5 w-5" />
                      {importPreviewMutation.isPending
                        ? '正在解析文件...'
                        : importMutation.isPending
                          ? '正在导入数据...'
                          : '选择文件上传'}
                    </Button>

                    <div className="mt-4 rounded-2xl border bg-slate-50 px-4 py-4 text-sm text-slate-700">
                      <p className="font-medium text-slate-900">当前文件</p>
                      <p className="mt-2 break-words leading-6">
                        {selectedImportFile ? selectedImportFile.name : '暂未选择文件，请先下载模板并填写后，再点击上方按钮上传 xlsx 文件'}
                      </p>
                      <p className="mt-2 text-xs text-slate-500">当前状态：{importFlowStatus}</p>
                    </div>
                  </div>

                  <div className="rounded-3xl border border-slate-200 bg-white p-5">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">第 3 步：确认导入</p>
                        <p className="mt-1 text-sm text-slate-600">
                          上传后会先弹出预览窗口。确认班级、四类数据摘要和模式无误后，再执行真正导入。
                        </p>
                      </div>
                      <Badge className="rounded-full bg-slate-100 px-3 py-1 text-slate-700 hover:bg-slate-100">
                        预览后确认
                      </Badge>
                    </div>
                    <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                      真正导入动作会在预览弹窗中完成。追加导入和覆盖导入的操作流程一致，都是先预览、再确认、最后写入。
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {lastImportResult ? (
                    <div className="rounded-3xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-800">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium">最近一次导入结果</p>
                          <p className="mt-1 leading-6">{lastImportResult.message}</p>
                        </div>
                        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                          {getImportModeLabel(lastImportResult.mode)}
                        </Badge>
                      </div>
                      <div className="mt-3 grid gap-2 text-sm leading-6 text-emerald-700 sm:grid-cols-2">
                        <p>导入班级：{lastImportResult.className || '当前班级'}</p>
                        <p>导入小组：{lastImportResult.importedGroups} 个</p>
                        <p>导入学生：{lastImportResult.importedStudents} 名</p>
                        <p>导入规则：{lastImportResult.importedRules} 条</p>
                        <p>导入商品：{lastImportResult.importedShopItems} 个</p>
                        <p>新建小组：{lastImportResult.createdGroups} 个</p>
                        <p>文件名：{lastImportResult.fileName}</p>
                        <p>导入数据：{lastImportResult.dataTypes.join('、')}</p>
                      </div>
                    </div>
                  ) : null}

                  {importError ? (
                    <div className="rounded-3xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
                      <p className="font-medium">导入失败</p>
                      <p className="mt-2 whitespace-pre-wrap break-words leading-6">{importError}</p>
                      <div className="mt-3 rounded-2xl border border-red-200 bg-white/70 px-3 py-3 text-xs leading-5 text-red-700">
                        <p className="font-medium">根因分析</p>
                        <p className="mt-2 leading-5">{importErrorGuide}</p>
                        <p className="mt-3 font-medium">优先排查</p>
                        <ul className="mt-2 space-y-1">
                          <li>1. 是否使用“系统导入模板”或“导出可再次导入数据”文件，而不是“完整班级数据导出文件”</li>
                          <li>2. Excel 中是否保留了“小组 / 学生 / 积分规则 / 商品”四个工作表</li>
                          <li>3. 各 sheet 表头是否完全保持模板原样</li>
                          <li>4. 文件里的分值、价格、性别、规则类型、商品分类是否符合模板要求</li>
                          <li>5. 追加导入时，当前班级里是否已存在同名学生、规则或商品</li>
                        </ul>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </Card>

          <Card className="overflow-hidden rounded-3xl border border-red-200 bg-card p-6 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-4">
                <div className="rounded-2xl bg-red-100 p-3">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">危险操作</h2>
                  <p className="mt-1 text-sm text-muted-foreground">清空班级积分会写入真实积分流水，并生成一条可恢复记录。</p>
                </div>
              </div>
              <Button
                className="rounded-xl bg-red-500 text-white hover:bg-red-600"
                onClick={handleClearPoints}
                disabled={clearPointsMutation.isPending}
              >
                {clearPointsMutation.isPending ? '清空中...' : '清空班级积分'}
              </Button>
            </div>
          </Card>

          <Card className="overflow-hidden rounded-3xl border bg-card p-6 shadow-sm">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-amber-100 p-3">
                <History className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">恢复记录</h2>
                <p className="mt-1 text-sm text-gray-600">可恢复“清空班级积分”与“删除学生”产生的快照记录。</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 text-sm">
              <Badge variant="secondary">共 {snapshots.length} 条</Badge>
              <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                可恢复 {activeSnapshotCount} 条
              </Badge>
            </div>
          </div>

          {snapshotsLoading ? (
            <p className="text-sm text-gray-500">加载中...</p>
          ) : latestSnapshots.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-500">
              当前还没有恢复记录。
            </div>
          ) : (
            <div className="space-y-3">
              {latestSnapshots.map((snapshot) => {
                const isRestoring = restoreMutation.isPending && restoreMutation.variables === snapshot.id;
                const isActive = snapshot.status === 'ACTIVE';
                return (
                  <div
                    key={snapshot.id}
                    className="flex flex-col gap-3 rounded-2xl border border-gray-200 px-4 py-4 lg:flex-row lg:items-center lg:justify-between"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-gray-900">
                          {snapshotTypeLabel[snapshot.type] || snapshot.type}
                        </span>
                        <Badge
                          className={cn(
                            isActive
                              ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-100'
                          )}
                        >
                          {snapshotStatusLabel[snapshot.status] || snapshot.status}
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm text-gray-700">
                        {snapshot.targetName || '未命名目标'}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-gray-500">{snapshot.summary || '无摘要'}</p>
                      <div className="mt-2 flex flex-col gap-1 text-xs text-gray-400 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
                        <span>创建时间：{formatSnapshotTime(snapshot.createdAt)}</span>
                        {snapshot.restoredAt ? <span>恢复时间：{formatSnapshotTime(snapshot.restoredAt)}</span> : null}
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      className="gap-2"
                      disabled={!isActive || restoreMutation.isPending}
                      onClick={() => handleRestore(snapshot.id)}
                    >
                      <RotateCcw className="h-4 w-4" />
                      {isRestoring ? '恢复中...' : '恢复'}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      <Dialog open={importPreviewOpen} onOpenChange={handlePreviewOpenChange}>
        <DialogContent className="flex max-h-[92vh] w-[min(96vw,1400px)] max-w-none flex-col overflow-hidden p-0">
          <div className="border-b px-6 py-4">
            <DialogHeader>
              <DialogTitle>导入预览</DialogTitle>
              <DialogDescription>
                已完成第 2 步，请在这里核对目标班级、四类数据摘要和导入模式，再确认是否执行导入。
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            <div className="space-y-4 pr-1">
              <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
                <div className="rounded-3xl border border-blue-200 bg-blue-50 px-5 py-5 text-sm text-blue-800">
                  <p className="text-xs font-medium tracking-[0.18em] text-blue-700">导入目标</p>
                  <p className="mt-2 text-2xl font-semibold text-blue-950">{importPreview?.className || currentClass?.name || '未识别班级'}</p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl bg-white/80 px-4 py-3">
                      <p className="text-xs text-blue-700/80">导入文件</p>
                      <p className="mt-1 break-words font-medium text-blue-950">
                        {selectedImportFile?.name || '当前预览文件'}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-white/80 px-4 py-3">
                      <p className="text-xs text-blue-700/80">导入数据</p>
                      <p className="mt-1 font-medium text-blue-950">{importableSheetNames}</p>
                    </div>
                  </div>
                  <p className="mt-4 leading-6">
                    预览通过后，确认导入的数据只会进入这个班级，不会按 Excel 文件名自动切换班级。
                  </p>
                </div>

                <div className="space-y-4">
                  <div
                    className={cn(
                      'rounded-3xl border px-5 py-5 text-sm',
                      (importPreview?.mode || importMode) === 'replace'
                        ? 'border-red-200 bg-red-50 text-red-700'
                        : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    )}
                  >
                    <p className="text-xs font-medium tracking-[0.18em]">导入模式</p>
                    <p className="mt-2 text-2xl font-semibold text-current">{getImportModeLabel(importPreview?.mode || importMode)}</p>
                    <p className="mt-2 leading-6">{getImportModeDescription(importPreview?.mode || importMode)}</p>
                  </div>

                  <div className="rounded-3xl border border-slate-200 bg-slate-50 px-5 py-5 text-sm text-slate-700">
                    <p className="text-xs font-medium tracking-[0.18em] text-slate-500">导入结论</p>
                    <p className="mt-2 text-lg font-semibold text-slate-900">
                      已识别 {importPreview?.summary.groups || 0} 个小组、{importPreview?.summary.students || 0} 名学生、{importPreview?.summary.rules || 0} 条规则、{importPreview?.summary.shopItems || 0} 个商品，确认后才会真正写入班级数据
                    </p>
                    <p className="mt-2 leading-6">
                      {importPreviewHasBlockingConflicts
                        ? '已完成文件预览，但当前模式下存在阻断性冲突。请先查看下方冲突清单，修正文件或改用覆盖导入后再继续。'
                        : '如果这里的数据无误，再点击底部“确认导入”或“继续覆盖导入”。'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                <Card className="p-4">
                  <p className="text-xs text-gray-500">预览结果</p>
                  <p className={cn('mt-1 font-medium', importPreviewHasBlockingConflicts ? 'text-amber-700' : 'text-emerald-700')}>
                    {importPreviewHasBlockingConflicts ? '存在冲突，暂不可导入' : '校验通过，可继续导入'}
                  </p>
                </Card>
                <Card className="p-4">
                  <p className="text-xs text-gray-500">小组数量</p>
                  <p className="mt-1 font-medium text-gray-900">{importPreview?.summary.groups || 0} 个</p>
                </Card>
                <Card className="p-4">
                  <p className="text-xs text-gray-500">学生数量</p>
                  <p className="mt-1 font-medium text-gray-900">{importPreview?.summary.students || 0} 名</p>
                </Card>
                <Card className="p-4">
                  <p className="text-xs text-gray-500">规则数量</p>
                  <p className="mt-1 font-medium text-gray-900">{importPreview?.summary.rules || 0} 条</p>
                </Card>
                <Card className="p-4">
                  <p className="text-xs text-gray-500">商品数量</p>
                  <p className="mt-1 font-medium text-gray-900">{importPreview?.summary.shopItems || 0} 个</p>
                </Card>
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                <p className="font-medium">导入范围</p>
                <p className="mt-1 leading-6">
                  当前初始化导入会处理 {importableSheetNames}；系统导出的“班级信息 / 积分记录 / 商品兑换 / 宠物”等 sheet 仅用于查看或备份，不参与导入。
                </p>
              </div>

              <div
                className={cn(
                  'rounded-xl border px-4 py-3 text-sm',
                  importPreviewAppendPlan
                    ? 'border-sky-200 bg-sky-50 text-sky-800'
                    : importPreviewHasBlockingConflicts
                      ? 'border-amber-200 bg-amber-50 text-amber-800'
                      : 'border-emerald-200 bg-emerald-50 text-emerald-800'
                )}
              >
                <p className="font-medium">追加处理结果</p>
                <p className="mt-1 leading-6">
                  {importPreviewAppendPlan
                    ? '追加导入会自动跳过系统已有数据，只创建文件里的新增数据。请确认下方“将新增 / 将跳过”清单。'
                    : importPreviewHasBlockingConflicts
                      ? '当前文件已完成预览，但在当前导入模式下存在阻断性冲突；正式导入按钮已禁用。'
                      : '当前文件未发现阻断性冲突，可以继续正式导入。'}
                </p>
                {importPreviewAppendPlan ? (
                  <div className="mt-3 grid gap-3 xl:grid-cols-2">
                    <div className="rounded-lg bg-white/70 px-3 py-3">
                      <p className="text-xs font-medium text-current">将新增</p>
                      <ul className="mt-2 space-y-1 leading-6">
                        <li>小组：{importPreview.toCreateGroups.length} 个</li>
                        <li>学生：{importPreviewAppendPlan.studentsToCreate.length} 名</li>
                        <li>规则：{importPreviewAppendPlan.rulesToCreate.length} 条</li>
                        <li>商品：{importPreviewAppendPlan.shopItemsToCreate.length} 个</li>
                      </ul>
                    </div>
                    <div className="rounded-lg bg-white/70 px-3 py-3">
                      <p className="text-xs font-medium text-current">将跳过（系统已有）</p>
                      <ul className="mt-2 space-y-1 leading-6">
                        <li>学生：{importPreviewAppendPlan.skippedStudents.length} 名</li>
                        <li>规则：{importPreviewAppendPlan.skippedRules.length} 条</li>
                        <li>商品：{importPreviewAppendPlan.skippedShopItems.length} 个</li>
                      </ul>
                    </div>
                    <div className="rounded-lg bg-white/70 px-3 py-3">
                      <p className="text-xs font-medium text-current">将新增的学生/规则/商品</p>
                      <p className="mt-2 break-words leading-6">
                        学生：{importPreviewAppendPlan.studentsToCreate.length ? importPreviewAppendPlan.studentsToCreate.join('、') : '无'}
                      </p>
                      <p className="mt-2 break-words leading-6">
                        规则：{importPreviewAppendPlan.rulesToCreate.length ? importPreviewAppendPlan.rulesToCreate.join('、') : '无'}
                      </p>
                      <p className="mt-2 break-words leading-6">
                        商品：{importPreviewAppendPlan.shopItemsToCreate.length ? importPreviewAppendPlan.shopItemsToCreate.join('、') : '无'}
                      </p>
                    </div>
                    <div className="rounded-lg bg-white/70 px-3 py-3">
                      <p className="text-xs font-medium text-current">将跳过的学生/规则/商品</p>
                      <p className="mt-2 break-words leading-6">
                        学生：{importPreviewAppendPlan.skippedStudents.length ? importPreviewAppendPlan.skippedStudents.join('、') : '无'}
                      </p>
                      <p className="mt-2 break-words leading-6">
                        规则：{importPreviewAppendPlan.skippedRules.length ? importPreviewAppendPlan.skippedRules.join('、') : '无'}
                      </p>
                      <p className="mt-2 break-words leading-6">
                        商品：{importPreviewAppendPlan.skippedShopItems.length ? importPreviewAppendPlan.skippedShopItems.join('、') : '无'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    {importPreviewBlockingReasons.length > 0 ? (
                      <ul className="mt-3 space-y-1 leading-6">
                        {importPreviewBlockingReasons.map((reason) => (
                          <li key={reason}>- {reason}</li>
                        ))}
                      </ul>
                    ) : null}
                    <div className="mt-3 grid gap-3 xl:grid-cols-3">
                      <div className="rounded-lg bg-white/70 px-3 py-3">
                        <p className="text-xs font-medium text-current">重名学生</p>
                        <p className="mt-1 break-words leading-6">{importPreviewConflicts.students.length ? importPreviewConflicts.students.join('、') : '无'}</p>
                      </div>
                      <div className="rounded-lg bg-white/70 px-3 py-3">
                        <p className="text-xs font-medium text-current">重名规则</p>
                        <p className="mt-1 break-words leading-6">{importPreviewConflicts.rules.length ? importPreviewConflicts.rules.join('、') : '无'}</p>
                      </div>
                      <div className="rounded-lg bg-white/70 px-3 py-3">
                        <p className="text-xs font-medium text-current">重名商品</p>
                        <p className="mt-1 break-words leading-6">{importPreviewConflicts.shopItems.length ? importPreviewConflicts.shopItems.join('、') : '无'}</p>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {importPreview?.toCreateGroups?.length ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                  <p className="font-medium">本次将创建的小组</p>
                  <p className="mt-1 leading-6">{importPreview.toCreateGroups.join('、')}</p>
                </div>
              ) : null}

              <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
                <div className="rounded-xl border border-gray-200 bg-white">
                  <div className="border-b border-gray-200 px-4 py-3">
                    <p className="text-sm font-medium text-gray-900">待导入学生</p>
                    <p className="mt-1 text-xs text-gray-500">展示前 12 条，含原始行号，便于定位问题。</p>
                  </div>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>行号</TableHead>
                          <TableHead>姓名</TableHead>
                          <TableHead>性别</TableHead>
                          <TableHead>学号</TableHead>
                          <TableHead>小组</TableHead>
                          <TableHead>累计积分</TableHead>
                          <TableHead>可兑换积分</TableHead>
                          <TableHead>班干部</TableHead>
                          <TableHead>家长手机号</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(importPreview?.students || []).slice(0, 12).map((student) => (
                          <TableRow key={`${student.rowNumber}-${student.name}`}>
                            <TableCell>第 {student.rowNumber} 行</TableCell>
                            <TableCell className="font-medium text-gray-900">{student.name}</TableCell>
                            <TableCell>{student.gender === 'FEMALE' ? '女' : '男'}</TableCell>
                            <TableCell>{student.studentNumber || '—'}</TableCell>
                            <TableCell>{student.groupName || '—'}</TableCell>
                            <TableCell>{student.totalPoints}</TableCell>
                            <TableCell>{student.availablePoints}</TableCell>
                            <TableCell>{student.isCadre ? student.customPosition || student.cadrePosition || '是' : '—'}</TableCell>
                            <TableCell className="max-w-[260px] whitespace-normal leading-6">
                              {student.parentPhones.length
                                ? student.parentPhones.map((item: { phone: string; relationship: string }) => `${item.relationship}：${item.phone}`).join('；')
                                : '—'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-xl border border-gray-200 bg-white">
                    <div className="border-b border-gray-200 px-4 py-3">
                      <p className="text-sm font-medium text-gray-900">小组样例</p>
                      <p className="mt-1 text-xs text-gray-500">展示前 6 条。</p>
                    </div>
                    <div className="space-y-2 px-4 py-3 text-sm text-gray-700">
                      {(importPreview?.samples.groups || []).length > 0 ? (
                        (importPreview?.samples.groups || []).map((group) => (
                          <div key={`${group.rowNumber}-${group.name}`} className="rounded-lg bg-gray-50 px-3 py-2">
                            <p className="font-medium text-gray-900">{group.name}</p>
                            <p className="mt-1 text-xs text-gray-500">组长：{group.leaderName || '未填写'}</p>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-gray-500">暂无小组样例</p>
                      )}
                    </div>
                  </div>

                  <div className="rounded-xl border border-gray-200 bg-white">
                    <div className="border-b border-gray-200 px-4 py-3">
                      <p className="text-sm font-medium text-gray-900">规则与商品样例</p>
                      <p className="mt-1 text-xs text-gray-500">各展示前 6 条，用于快速确认。</p>
                    </div>
                    <div className="space-y-4 px-4 py-3 text-sm text-gray-700">
                      <div>
                        <p className="text-xs font-medium text-gray-500">规则</p>
                        <div className="mt-2 space-y-2">
                          {(importPreview?.samples.rules || []).length > 0 ? (
                            (importPreview?.samples.rules || []).map((rule) => (
                              <div key={`${rule.rowNumber}-${rule.name}`} className="rounded-lg bg-gray-50 px-3 py-2">
                                <p className="font-medium text-gray-900">{rule.name}</p>
                                <p className="mt-1 text-xs text-gray-500">
                                  {rule.type === 'DEDUCT' ? '减分' : '加分'} {rule.points} 分 / {rule.isEnabled ? '启用' : '停用'}
                                </p>
                              </div>
                            ))
                          ) : (
                            <p className="text-xs text-gray-500">暂无规则样例</p>
                          )}
                        </div>
                      </div>

                      <div>
                        <p className="text-xs font-medium text-gray-500">商品</p>
                        <div className="mt-2 space-y-2">
                          {(importPreview?.samples.shopItems || []).length > 0 ? (
                            (importPreview?.samples.shopItems || []).map((item) => (
                              <div key={`${item.rowNumber}-${item.name}`} className="rounded-lg bg-gray-50 px-3 py-2">
                                <p className="font-medium text-gray-900">{item.name}</p>
                                <p className="mt-1 text-xs text-gray-500">
                                  {item.price} 积分 / 库存 {item.stock ?? '不限'} / {item.isAvailable ? '上架' : '下架'}
                                </p>
                              </div>
                            ))
                          ) : (
                            <p className="text-xs text-gray-500">暂无商品样例</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="border-t bg-white px-6 py-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => handlePreviewOpenChange(false)}
              disabled={importMutation.isPending}
            >
              取消
            </Button>
            <Button
              type="button"
              onClick={handleConfirmImport}
              disabled={importMutation.isPending || !selectedImportFile || (importPreviewHasBlockingConflicts && !importPreviewAppendPlan)}
            >
              {importMutation.isPending
                ? '导入中...'
                : importPreviewHasBlockingConflicts && !importPreviewAppendPlan
                  ? '存在冲突，暂不可导入'
                  : (importPreview?.mode || importMode) === 'replace'
                    ? '继续覆盖导入'
                    : '确认导入'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={importResultOpen} onOpenChange={setImportResultOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>导入成功</DialogTitle>
            <DialogDescription>
              本次导入已完成，请核对导入结果。
            </DialogDescription>
          </DialogHeader>

          {lastImportResult ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-800">
                <p className="font-medium">{lastImportResult.message}</p>
                <p className="mt-2 text-xs leading-5 text-emerald-700">
                  错误文件、格式错误、sheet/表头错误、sheet 缺失、非法枚举、导出回导等结构性问题会直接失败；追加模式下系统已有的同名学生、规则、商品会自动跳过，仅导入新增数据。
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <Card className="p-4">
                  <p className="text-xs text-gray-500">目标班级</p>
                  <p className="mt-1 font-medium text-gray-900">{lastImportResult.className || '当前班级'}</p>
                </Card>
                <Card className="p-4">
                  <p className="text-xs text-gray-500">导入模式</p>
                  <p className="mt-1 font-medium text-gray-900">{getImportModeLabel(lastImportResult.mode)}</p>
                </Card>
                <Card className="p-4">
                  <p className="text-xs text-gray-500">导入数据</p>
                  <p className="mt-1 font-medium text-gray-900">{lastImportResult.dataTypes.join('、')}</p>
                </Card>
                <Card className="p-4 lg:col-span-2">
                  <p className="text-xs text-gray-500">文件名</p>
                  <p className="mt-1 break-words font-medium text-gray-900">{lastImportResult.fileName}</p>
                </Card>
                <Card className="p-4">
                  <p className="text-xs text-gray-500">导入小组</p>
                  <p className="mt-1 font-medium text-emerald-700">{lastImportResult.importedGroups} 个</p>
                </Card>
                <Card className="p-4">
                  <p className="text-xs text-gray-500">导入学生</p>
                  <p className="mt-1 font-medium text-emerald-700">{lastImportResult.importedStudents} 名</p>
                </Card>
                <Card className="p-4">
                  <p className="text-xs text-gray-500">导入规则</p>
                  <p className="mt-1 font-medium text-emerald-700">{lastImportResult.importedRules} 条</p>
                </Card>
                <Card className="p-4">
                  <p className="text-xs text-gray-500">导入商品</p>
                  <p className="mt-1 font-medium text-emerald-700">{lastImportResult.importedShopItems} 个</p>
                </Card>
                <Card className="p-4">
                  <p className="text-xs text-gray-500">新建小组</p>
                  <p className="mt-1 font-medium text-emerald-700">{lastImportResult.createdGroups} 个</p>
                </Card>
                <Card className="p-4 lg:col-span-3">
                  <p className="text-xs text-gray-500">跳过的已有数据</p>
                  <div className="mt-2 space-y-2 text-sm text-gray-700">
                    <p>学生：{lastImportResult.skippedStudents.length ? lastImportResult.skippedStudents.join('、') : '无'}</p>
                    <p>规则：{lastImportResult.skippedRules.length ? lastImportResult.skippedRules.join('、') : '无'}</p>
                    <p>商品：{lastImportResult.skippedShopItems.length ? lastImportResult.skippedShopItems.join('、') : '无'}</p>
                  </div>
                </Card>
              </div>

              <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                <p className="font-medium">下一步建议</p>
                <p className="mt-1 leading-6">
                  请关闭本弹窗后，前往“班级管理”“学生管理”“积分规则”或“积分商城”检查 {lastImportResult.className || '当前班级'} 的初始化数据；完整班级数据导出仅用于备份查看，如需继续补充并回导，请使用“导出可再次导入数据”。
                </p>
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <Button type="button" onClick={() => setImportResultOpen(false)}>
              我知道了
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={replaceConfirmOpen} onOpenChange={setReplaceConfirmOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>确认覆盖导入</DialogTitle>
            <DialogDescription>
              这会重建当前班级的小组、学生、积分规则、商品四类初始化数据。
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <p className="font-medium">请再次确认</p>
            <p className="mt-1 leading-6">
              此操作会整体重建当前班级的小组、学生、积分规则、商品。若只是补充新数据，请返回使用“追加导入”。
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setReplaceConfirmOpen(false)} disabled={importMutation.isPending}>
              返回检查
            </Button>
            <Button type="button" className="bg-red-500 text-white hover:bg-red-600" onClick={handleConfirmReplaceImport} disabled={importMutation.isPending || !selectedImportFile}>
              {importMutation.isPending ? '导入中...' : '确认覆盖导入'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  </div>
  );
}
