'use client';

import Link from 'next/link';
import { useState } from 'react';
import { BellOff, BookOpenText, Clock3, ShieldAlert, Sparkles, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { RandomPickDialog } from '@/components/dashboard/random-pick-dialog';
import { ClassTimerDialog } from '@/components/dashboard/class-timer-dialog';
import { QuietChallengeDialog } from '@/components/dashboard/quiet-challenge-dialog';
import { ReadingChallengeDialog } from '@/components/dashboard/reading-challenge-dialog';
import { useAuthStore } from '@/lib/stores/auth-store';

const TOOL_CARDS = [
  {
    title: '随机点名',
    description: '使用弹窗式随机点名进行课堂互动，支持抽取人数控制、去重模式和答对加分。',
    buttonText: '打开随机点名',
    icon: Sparkles,
    badge: '课堂互动',
    actionType: 'dialog',
  },
  {
    title: '课堂计时器',
    description: '提供倒计时圆环、快捷时长、自定义分钟和开始暂停重置，适合课堂节奏控制。',
    buttonText: '打开课堂计时器',
    icon: Clock3,
    badge: '节奏控制',
    actionType: 'dialog',
  },
  {
    title: '静音挑战',
    description: '通过实时麦克风音量监测发起静音挑战，保持课堂安静达标后可为全班统一加分。',
    buttonText: '打开静音挑战',
    icon: BellOff,
    badge: '课堂纪律',
    actionType: 'dialog',
  },
  {
    title: '朗读挑战',
    description: '通过实时麦克风音量监测激励朗读参与度，支持宽容秒数与挑战成功后全班奖励。',
    buttonText: '打开朗读挑战',
    icon: BookOpenText,
    badge: '朗读练习',
    actionType: 'dialog',
  },
] as const;

const ADMIN_TOOL_CARD = {
  title: '生产激活码生成',
  description: '仅管理员可用，直接写入生产授权码库并下载 Excel / CSV / TXT 文件。',
  buttonText: '进入生产后台',
  href: '/dashboard/tools/activation-codes',
  icon: ShieldAlert,
  badge: '管理员',
} as const;

export default function ToolsPage() {
  const { user } = useAuthStore();
  const [randomPickOpen, setRandomPickOpen] = useState(false);
  const [timerOpen, setTimerOpen] = useState(false);
  const [quietChallengeOpen, setQuietChallengeOpen] = useState(false);
  const [readingChallengeOpen, setReadingChallengeOpen] = useState(false);
  const visibleToolCount = TOOL_CARDS.length + (user?.role === 'ADMIN' ? 1 : 0);

  const toolActions = [
    () => setRandomPickOpen(true),
    () => setTimerOpen(true),
    () => setQuietChallengeOpen(true),
    () => setReadingChallengeOpen(true),
  ];

  return (
    <div className="h-full overflow-y-auto bg-muted/20">
      <div className="mx-auto flex w-full max-w-[1800px] flex-col gap-6 px-4 py-6 lg:px-8">
        <div className="overflow-hidden rounded-3xl border bg-card shadow-sm">
          <div className="flex flex-col gap-5 p-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Wand2 className="h-7 w-7" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">课堂工具</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  随机点名、课堂计时器、静音挑战、朗读挑战等课堂辅助工具
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">共 {visibleToolCount} 个工具</span>
              <span className="rounded-full bg-purple-50 px-3 py-1 text-purple-700">保持原有业务能力</span>
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          {user?.role === 'ADMIN' && (() => {
            const AdminIcon = ADMIN_TOOL_CARD.icon;
            return (
              <Card key={ADMIN_TOOL_CARD.title} className="overflow-hidden rounded-3xl border border-destructive/20 bg-card shadow-sm">
                <div className="flex h-full flex-col gap-6 p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
                        <AdminIcon className="h-6 w-6" />
                      </div>
                      <div>
                        <span className="inline-flex rounded-full bg-destructive/10 px-3 py-1 text-xs font-medium text-destructive">
                          {ADMIN_TOOL_CARD.badge}
                        </span>
                        <h2 className="mt-3 text-2xl font-semibold text-foreground">{ADMIN_TOOL_CARD.title}</h2>
                      </div>
                    </div>
                    <span className="rounded-full bg-destructive/10 px-3 py-1 text-xs font-semibold text-destructive">
                      生产工具
                    </span>
                  </div>

                  <p className="text-sm leading-7 text-muted-foreground">{ADMIN_TOOL_CARD.description}</p>

                  <div className="mt-auto flex items-center justify-between gap-3 border-t pt-5">
                    <div className="text-sm text-muted-foreground">仅管理员可见，进入后可直接生成并下载生产可用激活码。</div>
                    <Button asChild type="button" size="lg" className="h-11 rounded-xl px-6">
                      <Link href={ADMIN_TOOL_CARD.href}>{ADMIN_TOOL_CARD.buttonText}</Link>
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })()}

          {TOOL_CARDS.map((tool, index) => {
            const Icon = tool.icon;

            return (
              <Card key={tool.title} className="overflow-hidden rounded-3xl border bg-card shadow-sm">
                <div className="flex h-full flex-col gap-6 p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <Icon className="h-6 w-6" />
                      </div>
                      <div>
                        <span className="inline-flex rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                          {tool.badge}
                        </span>
                        <h2 className="mt-3 text-2xl font-semibold text-foreground">{tool.title}</h2>
                      </div>
                    </div>
                    <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                      工具 {index + 1}
                    </span>
                  </div>

                  <p className="text-sm leading-7 text-muted-foreground">{tool.description}</p>

                  <div className="mt-auto flex items-center justify-between gap-3 border-t pt-5">
                    <div className="text-sm text-muted-foreground">点击后在弹窗中使用，不改动当前页面业务数据。</div>
                    <Button
                      type="button"
                      size="lg"
                      className="h-11 rounded-xl px-6"
                      onClick={toolActions[index]}
                    >
                      {tool.buttonText}
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      <RandomPickDialog open={randomPickOpen} onOpenChange={setRandomPickOpen} />
      <ClassTimerDialog open={timerOpen} onOpenChange={setTimerOpen} />
      <QuietChallengeDialog open={quietChallengeOpen} onOpenChange={setQuietChallengeOpen} />
      <ReadingChallengeDialog open={readingChallengeOpen} onOpenChange={setReadingChallengeOpen} />
    </div>
  );
}
