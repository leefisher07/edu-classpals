'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { shareApi } from '@/lib/api/share';
import { PHONE_PATTERN } from '@/components/dashboard/student-form-utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  TrendingUp,
  TrendingDown,
  Trophy,
  Star,
  ShieldCheck,
  PawPrint,
  Sparkles,
  CalendarDays,
  Phone,
  CircleAlert,
  RefreshCw,
  EyeOff,
  Link2,
  HeartHandshake,
  ChevronRight,
} from 'lucide-react';

const STAGE_LABEL: Record<string, string> = {
  EGG: '蛋',
  BABY: '幼年',
  TEEN: '少年',
  ADULT: '成年',
  FINAL: '终极',
};

const maskPhone = (phone?: string) => {
  if (!phone || phone.length < 7) return phone || '';
  return `${phone.slice(0, 3)}****${phone.slice(-4)}`;
};

const formatDateTime = (date?: string) => {
  if (!date) return '-';
  return new Date(date).toLocaleString('zh-CN');
};

const getErrorMessage = (error: any) => {
  const message = error?.message || error?.response?.data?.message || '';
  if (Array.isArray(message)) return message[0] || '加载失败';
  return message || '加载失败，请稍后重试';
};

const getErrorState = (message: string) => {
  if (message.includes('不存在')) {
    return {
      title: '链接不存在',
      description: '该分享链接可能已被删除，或复制时不完整，请联系老师重新发送。',
    };
  }
  if (message.includes('过期')) {
    return {
      title: '链接已过期',
      description: '这个分享链接已经超过有效期，请联系老师重新生成新的链接。',
    };
  }
  if (message.includes('停用')) {
    return {
      title: '链接已停用',
      description: '老师已暂停该链接访问，如需继续查看请联系老师重新启用。',
    };
  }
  if (message.includes('手机号') || message.includes('未授权')) {
    return {
      title: '验证未通过',
      description: '请输入学生绑定的家长手机号，验证通过后才可查看分享内容。',
    };
  }
  return {
    title: '暂时无法查看',
    description: '当前数据加载失败，请稍后重试，或联系老师确认分享链接状态。',
  };
};

const getRecordSummaryText = (link: any, count: number) => {
  if (link?.hidePointRecords) return '老师已关闭积分记录展示';
  if (count === 0 && link?.hideDeductions) return '当前链接仅显示加分记录';
  if (count === 0) return '暂无可展示的积分记录';
  if (link?.hideDeductions) return '当前仅显示加分记录';
  return '包含最近的加分与扣分记录';
};

const getFriendlyGreeting = (relationship?: string) => {
  if (!relationship) return '欢迎查看';
  return `欢迎你，${relationship}`;
};

export default function ParentViewPage() {
  const params = useParams();
  const token = params.token as string;

  const [phone, setPhone] = useState('');
  const [verifiedPhone, setVerifiedPhone] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState('');

  useEffect(() => {
    const cachedPhone = window.sessionStorage.getItem(`parent-share-phone:${token}`);
    if (cachedPhone) {
      setPhone(cachedPhone);
      setVerifiedPhone(cachedPhone);
    }
  }, [token]);

  const {
    data: viewData,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['parent-view', token, verifiedPhone],
    queryFn: () => shareApi.getByToken(token, verifiedPhone),
    enabled: !!verifiedPhone,
    retry: false,
  });

  useEffect(() => {
    if (!error) return;
    const message = getErrorMessage(error);
    if (message.includes('手机号') || message.includes('未授权')) {
      setVerifiedPhone('');
      window.sessionStorage.removeItem(`parent-share-phone:${token}`);
      setVerifyError(message);
    }
  }, [error, token]);

  const handleVerify = async () => {
    const normalizedPhone = phone.trim();

    if (!normalizedPhone) {
      setVerifyError('请输入手机号');
      return;
    }

    if (!PHONE_PATTERN.test(normalizedPhone)) {
      setVerifyError('手机号格式不正确，请输入 11 位大陆手机号');
      return;
    }

    setVerifying(true);
    setVerifyError('');
    try {
      await shareApi.verifyToken(token, { phone: normalizedPhone });
      setVerifiedPhone(normalizedPhone);
      window.sessionStorage.setItem(`parent-share-phone:${token}`, normalizedPhone);
    } catch (err: any) {
      setVerifyError(getErrorMessage(err) || '验证失败，请检查手机号');
    } finally {
      setVerifying(false);
    }
  };

  const resetVerification = () => {
    setVerifiedPhone('');
    setVerifyError('');
    window.sessionStorage.removeItem(`parent-share-phone:${token}`);
  };

  const viewEnvelope = viewData as any;
  const data = viewEnvelope?.student ? viewEnvelope : viewEnvelope?.data;
  const student = data?.student;
  const ranking = data?.ranking;
  const records = data?.pointRecords || [];
  const pet = data?.pet;
  const parent = data?.parent;
  const link = data?.link;

  const recordSummary = useMemo(() => {
    const addCount = records.filter((record: any) => record.type === 'ADD').length;
    const deductCount = records.filter((record: any) => record.type === 'DEDUCT').length;
    return { addCount, deductCount };
  }, [records]);

  if (!verifiedPhone) {
    const verifyErrorState = verifyError ? getErrorState(verifyError) : null;

    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-100 via-white to-slate-100 px-4 py-6 sm:px-6">
        <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-md items-center">
          <Card className="w-full rounded-3xl border-0 bg-white p-6 shadow-xl shadow-slate-200/70 sm:p-7">
            <div className="mb-6 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-sm">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900">家长查看</h1>
              <p className="mt-2 text-sm leading-6 text-slate-500">请输入学生绑定的家长手机号，验证通过后即可查看积分、排名和宠物成长信息。</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">手机号</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    type="tel"
                    placeholder="请输入绑定手机号"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      if (verifyError) {
                        setVerifyError('');
                      }
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
                    className="h-12 rounded-2xl border-slate-200 pl-10"
                  />
                </div>
              </div>

              {verifyError && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3">
                  <div className="flex gap-3">
                    <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
                    <div>
                      <p className="text-sm font-medium text-rose-700">{verifyErrorState?.title || '验证失败'}</p>
                      <p className="mt-1 text-sm text-rose-600">{verifyErrorState?.description || verifyError}</p>
                    </div>
                  </div>
                </div>
              )}

              <Button className="h-12 w-full rounded-2xl bg-slate-900 text-base hover:bg-slate-800" onClick={handleVerify} disabled={verifying || !phone.trim()}>
                {verifying ? '验证中...' : '验证并查看'}
              </Button>
            </div>

            <div className="mt-6 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
              本页面仅供查看，不会修改学生积分、宠物经验或班级数据。
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-100 via-white to-slate-100 px-4 py-6">
        <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-md items-center justify-center">
          <div className="flex flex-col items-center gap-4 text-slate-500">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-300 border-t-slate-900" />
            <p className="text-sm">正在加载分享内容...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    const message = getErrorMessage(error);
    const errorState = getErrorState(message);

    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-100 via-white to-slate-100 px-4 py-6 sm:px-6">
        <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-md items-center">
          <Card className="w-full rounded-3xl border-0 bg-white p-6 shadow-xl shadow-slate-200/70 sm:p-7">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-500">
                <Link2 className="h-6 w-6" />
              </div>
              <h1 className="text-2xl font-semibold text-slate-900">{errorState.title}</h1>
              <p className="mt-3 text-sm leading-6 text-slate-500">{errorState.description}</p>
              <p className="mt-3 text-xs text-slate-400">{message}</p>
            </div>

            <div className="mt-6 grid gap-3">
              <Button className="h-11 rounded-2xl bg-slate-900 hover:bg-slate-800" onClick={() => refetch()} disabled={isFetching}>
                <RefreshCw className="mr-2 h-4 w-4" />重新加载
              </Button>
              <Button variant="outline" className="h-11 rounded-2xl" onClick={resetVerification}>
                重新输入手机号
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-white to-slate-100 px-4 py-4 pb-8 sm:px-6">
      <div className="mx-auto max-w-3xl space-y-4">
        <Card className="overflow-hidden rounded-3xl border-0 bg-slate-900 text-white shadow-lg shadow-slate-300/60">
          <div className="px-5 py-5 sm:px-6 sm:py-6">
            <div className="flex items-start gap-4">
              <div
                className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-2xl font-bold text-white shadow-inner"
                style={{ backgroundColor: student?.avatarBgColor || '#3B82F6' }}
              >
                {student?.name?.charAt(0) || '?'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-white/70">{getFriendlyGreeting(parent?.relationship)}</p>
                <h1 className="mt-1 truncate text-2xl font-semibold tracking-tight">{student?.name}</h1>
                <p className="mt-1 text-sm text-white/70">{student?.className}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-white/80">
                  <span className="rounded-full bg-white/10 px-3 py-1">已验证：{parent?.relationship || '家长'} · {maskPhone(parent?.phone || verifiedPhone)}</span>
                  <span className="rounded-full bg-white/10 px-3 py-1">链接有效至：{formatDateTime(link?.expiresAt)}</span>
                </div>
              </div>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <Card className="rounded-3xl border-0 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-blue-50 p-2.5">
                <Star className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">累计积分</p>
                <p className="text-2xl font-semibold text-slate-900">{student?.totalPoints || 0}</p>
              </div>
            </div>
          </Card>
          <Card className="rounded-3xl border-0 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-emerald-50 p-2.5">
                <Trophy className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">可兑换积分</p>
                <p className="text-2xl font-semibold text-emerald-600">{student?.availablePoints || 0}</p>
              </div>
            </div>
          </Card>
        </div>

        <Card className="rounded-3xl border-0 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
            <div>
              <p className="font-medium text-slate-900">查看说明</p>
              <p className="mt-1 text-sm text-slate-500">此页面只展示老师允许公开的内容，若某些模块未出现，通常是老师已关闭该项展示。</p>
            </div>
          </div>
        </Card>

        {ranking ? (
          <Card className="rounded-3xl border-0 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-slate-500">班级排名</p>
                <p className="mt-2 text-3xl font-semibold text-slate-900">第 {ranking.rank} 名</p>
                <p className="mt-1 text-sm text-slate-500">共 {ranking.total} 名学生</p>
              </div>
              <div className="rounded-3xl bg-amber-50 p-4 text-amber-500">
                <Trophy className="h-8 w-8" />
              </div>
            </div>
          </Card>
        ) : (
          <Card className="rounded-3xl border-0 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-start gap-3">
              <EyeOff className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
              <div>
                <p className="font-medium text-slate-900">老师已关闭排名展示</p>
                <p className="mt-1 text-sm text-slate-500">当前分享链接不展示班级排名信息。</p>
              </div>
            </div>
          </Card>
        )}

        {pet ? (
          <Card className="overflow-hidden rounded-3xl border-0 bg-white shadow-sm">
            <div className="bg-gradient-to-r from-orange-50 via-amber-50 to-white px-5 py-4 sm:px-6">
              <div className="flex items-center gap-2 text-sm font-medium text-orange-700">
                <HeartHandshake className="h-4 w-4" />宠物成长
              </div>
            </div>
            <div className="p-5 sm:p-6">
              <div className="flex items-start gap-4">
                <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-3xl bg-orange-50 shadow-inner">
                  {pet.currentImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={pet.currentImage} alt={pet.name} className="h-full w-full object-cover" />
                  ) : (
                    <PawPrint className="h-8 w-8 text-orange-400" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold text-slate-900">{pet.name}</h2>
                    <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs">
                      {STAGE_LABEL[pet.stage] || pet.stage}
                    </Badge>
                    {pet.rarity && (
                      <Badge variant="outline" className="rounded-full px-3 py-1 text-xs text-orange-600">
                        {pet.rarity}
                      </Badge>
                    )}
                  </div>
                  <p className="mt-2 text-sm text-slate-500">{pet.category || '宠物成长'} · 当前经验 {pet.experience}</p>
                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl bg-slate-50 px-3 py-3">
                      <p className="text-xs text-slate-400">当前阶段</p>
                      <p className="mt-1 font-medium text-slate-900">{STAGE_LABEL[pet.stage] || pet.stage}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 px-3 py-3">
                      <p className="text-xs text-slate-400">成长经验</p>
                      <p className="mt-1 font-medium text-slate-900">{pet.experience}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 px-3 py-3 col-span-2 sm:col-span-1">
                      <p className="text-xs text-slate-400">成长状态</p>
                      <p className="mt-1 font-medium text-slate-900">持续成长中</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        ) : (
          <Card className="rounded-3xl border-0 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-start gap-3">
              <PawPrint className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
              <div>
                <p className="font-medium text-slate-900">暂未领养宠物</p>
                <p className="mt-1 text-sm text-slate-500">当前还没有可展示的宠物信息，后续领养后会在这里看到成长状态。</p>
              </div>
            </div>
          </Card>
        )}

        <Card className="rounded-3xl border-0 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">最近积分记录</h2>
              <p className="mt-1 text-sm text-slate-500">{getRecordSummaryText(link, records.length)}</p>
            </div>
            {records.length > 0 && (
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-2xl bg-emerald-50 px-3 py-2 text-emerald-700">加分 {recordSummary.addCount}</div>
                <div className="rounded-2xl bg-rose-50 px-3 py-2 text-rose-700">扣分 {recordSummary.deductCount}</div>
              </div>
            )}
          </div>

          {records.length > 0 ? (
            <div className="mt-4 space-y-3">
              {records.map((record: any, index: number) => (
                <div key={`${record.createdAt}-${index}`} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4">
                  <div className="flex items-start gap-3">
                    <div
                      className={
                        record.type === 'ADD'
                          ? 'mt-0.5 shrink-0 rounded-2xl bg-emerald-100 p-2.5 text-emerald-600'
                          : 'mt-0.5 shrink-0 rounded-2xl bg-rose-100 p-2.5 text-rose-600'
                      }
                    >
                      {record.type === 'ADD' ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-slate-900">{record.reason || '积分变动'}</p>
                          <p className="mt-1 text-sm text-slate-500">{record.operatorName || '老师'} · {formatDateTime(record.createdAt)}</p>
                        </div>
                        <Badge
                          variant="secondary"
                          className={
                            record.type === 'ADD'
                              ? 'rounded-full bg-emerald-50 px-3 py-1 text-emerald-700'
                              : 'rounded-full bg-rose-50 px-3 py-1 text-rose-700'
                          }
                        >
                          {record.type === 'ADD' ? '+' : '-'}{record.value}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : link?.hidePointRecords ? (
            <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-6 text-sm text-slate-500">
              老师已关闭积分记录展示，当前分享链接不显示最近记录。
            </div>
          ) : (
            <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-6 text-sm text-slate-500">
              暂无可展示的积分记录。
              {link?.hideDeductions && ' 当前链接已隐藏扣分记录，因此这里只会显示加分内容。'}
            </div>
          )}
        </Card>

        <Card className="rounded-3xl border-0 bg-white p-5 shadow-sm sm:p-6">
          <div className="grid gap-3 text-sm text-slate-500 sm:grid-cols-2">
            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              <p className="flex items-center gap-2 font-medium text-slate-700"><CalendarDays className="h-4 w-4 text-slate-400" />链接有效期</p>
              <p className="mt-2">{formatDateTime(link?.expiresAt)}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              <p className="flex items-center gap-2 font-medium text-slate-700"><Sparkles className="h-4 w-4 text-slate-400" />分享说明</p>
              <p className="mt-2">本页面仅支持查看，老师可随时调整展示范围或停用链接。</p>
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Button variant="outline" className="h-11 flex-1 rounded-2xl" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className="mr-2 h-4 w-4" />刷新数据
            </Button>
            <Button variant="outline" className="h-11 flex-1 rounded-2xl" onClick={resetVerification}>
              更换手机号
            </Button>
          </div>
          <div className="mt-4 flex items-center justify-center gap-1 text-xs text-slate-400">
            班级积分管理系统 · 家长查看 <ChevronRight className="h-3 w-3" /> 安全只读分享
          </div>
        </Card>
      </div>
    </div>
  );
}
