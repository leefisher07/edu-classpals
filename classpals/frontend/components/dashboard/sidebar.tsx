'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  Award,
  Settings,
  ShoppingBag,
  PawPrint,
  BarChart3,
  Share2,
  Wrench,
  History,
  BookOpen,
  Download,
} from 'lucide-react';

const menuItems = [
  {
    title: '数据看板',
    href: '/dashboard',
    icon: BarChart3,
  },
  {
    title: '班级管理',
    href: '/dashboard/classes',
    icon: LayoutDashboard,
  },
  {
    title: '学生管理',
    href: '/dashboard/students',
    icon: Users,
  },
  {
    title: '积分规则',
    href: '/dashboard/rules',
    icon: Award,
  },
  {
    title: '小组管理',
    href: '/dashboard/groups',
    icon: Users,
  },
  {
    title: '积分商店',
    href: '/dashboard/shop',
    icon: ShoppingBag,
  },
  {
    title: '班级主页',
    href: '/dashboard/pets',
    icon: PawPrint,
  },
  {
    title: '宠物设置',
    href: '/dashboard/pets/settings',
    icon: Settings,
  },
  {
    title: '宠物图鉴',
    href: '/dashboard/pets/gallery',
    icon: BookOpen,
  },
  {
    title: '积分记录',
    href: '/dashboard/records',
    icon: History,
  },
  {
    title: '家长分享',
    href: '/dashboard/share',
    icon: Share2,
  },
  {
    title: '数据导出',
    href: '/dashboard/export',
    icon: Download,
  },
  {
    title: '辅助工具',
    href: '/dashboard/tools',
    icon: Wrench,
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex w-64 flex-col border-r bg-white">
      <nav className="flex-1 space-y-1 p-4">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-700 hover:bg-gray-100'
              )}
            >
              <Icon className="h-5 w-5" />
              {item.title}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
