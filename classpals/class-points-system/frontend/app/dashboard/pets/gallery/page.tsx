'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { petsApi } from '@/lib/api/pets';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Edit, Trash2, X, Sparkles, PawPrint } from 'lucide-react';

const RARITY_LABELS: Record<string, string> = {
  COMMON: '普通',
  RARE: '稀有',
  EPIC: '史诗',
  LEGENDARY: '传说',
};

const RARITY_COLORS: Record<string, string> = {
  COMMON: 'bg-gray-100 text-gray-700',
  RARE: 'bg-blue-100 text-blue-700',
  EPIC: 'bg-purple-100 text-purple-700',
  LEGENDARY: 'bg-yellow-100 text-yellow-700',
};

export default function PetGalleryPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    rarity: 'COMMON',
    eggImage: '',
    babyImage: '',
    teenImage: '',
    adultImage: '',
    finalImage: '',
  });

  const { data: galleryData, isLoading } = useQuery({
    queryKey: ['pet-gallery'],
    queryFn: () => petsApi.listGallery(),
  });

  const gallery = (galleryData as any)?.gallery || [];

  const createMutation = useMutation({
    mutationFn: (data: any) => petsApi.createGalleryItem(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pet-gallery'] });
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => petsApi.updateGalleryItem(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pet-gallery'] });
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => petsApi.deleteGalleryItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pet-gallery'] });
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      type: '',
      rarity: 'COMMON',
      eggImage: '',
      babyImage: '',
      teenImage: '',
      adultImage: '',
      finalImage: '',
    });
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (item: any) => {
    setFormData({
      name: item.name,
      type: item.type,
      rarity: item.rarity,
      eggImage: item.eggImage || '',
      babyImage: item.babyImage || '',
      teenImage: item.teenImage || '',
      adultImage: item.adultImage || '',
      finalImage: item.finalImage || '',
    });
    setEditingId(item.id);
    setShowForm(true);
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.type) return;

    if (editingId) {
      updateMutation.mutate({ id: editingId, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('确定要删除这个宠物模板吗？')) {
      deleteMutation.mutate(id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
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
                <h1 className="text-2xl font-bold tracking-tight text-foreground">宠物图鉴</h1>
                <p className="mt-1 text-sm text-muted-foreground">管理宠物模板库与各成长阶段图片</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-purple-50 px-3 py-1 text-sm text-purple-700">模板 {gallery.length}</span>
              <Button className="h-11 rounded-xl" onClick={() => setShowForm(true)}>
                <Plus className="mr-2 h-4 w-4" />
                添加宠物
              </Button>
            </div>
          </div>
        </div>

        {showForm && (
          <Card className="overflow-hidden rounded-3xl border bg-card p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-foreground">{editingId ? '编辑宠物' : '添加宠物'}</h2>
                <p className="mt-1 text-sm text-muted-foreground">维护宠物基础信息和 5 个成长阶段的图片。</p>
              </div>
              <Button variant="ghost" size="sm" className="rounded-xl" onClick={resetForm}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <div className="space-y-2">
                <Label>宠物名称 *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="例如：小火龙"
                />
              </div>
              <div className="space-y-2">
                <Label>宠物类型 *</Label>
                <Input
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  placeholder="例如：火系"
                />
              </div>
              <div className="space-y-2">
                <Label>稀有度</Label>
                <select
                  className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none transition focus:border-ring"
                  value={formData.rarity}
                  onChange={(e) => setFormData({ ...formData, rarity: e.target.value })}
                >
                  <option value="COMMON">普通</option>
                  <option value="RARE">稀有</option>
                  <option value="EPIC">史诗</option>
                  <option value="LEGENDARY">传说</option>
                </select>
              </div>
            </div>
            <div className="mt-5 space-y-3">
              <div>
                <p className="text-sm font-medium text-foreground">成长阶段图片</p>
                <p className="mt-1 text-sm text-muted-foreground">支持 emoji 或 URL，保持现有业务逻辑不变。</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                {[
                  { label: '蛋', key: 'eggImage' as const, placeholder: '🥚' },
                  { label: '幼年', key: 'babyImage' as const, placeholder: '🐣' },
                  { label: '少年', key: 'teenImage' as const, placeholder: '🐥' },
                  { label: '成年', key: 'adultImage' as const, placeholder: '🐔' },
                  { label: '终极', key: 'finalImage' as const, placeholder: '🦅' },
                ].map((stage) => (
                  <div key={stage.key} className="rounded-2xl border bg-background p-4">
                    <Label className="text-xs text-muted-foreground">{stage.label}</Label>
                    <Input
                      className="mt-2"
                      value={formData[stage.key]}
                      onChange={(e) => setFormData({ ...formData, [stage.key]: e.target.value })}
                      placeholder={stage.placeholder}
                    />
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              <Button
                onClick={handleSubmit}
                className="rounded-xl"
                disabled={!formData.name || !formData.type || createMutation.isPending || updateMutation.isPending}
              >
                {editingId ? '保存' : '添加'}
              </Button>
              <Button variant="outline" className="rounded-xl" onClick={resetForm}>
                取消
              </Button>
            </div>
          </Card>
        )}

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {gallery.map((item: any) => (
            <Card key={item.id} className="overflow-hidden rounded-3xl border bg-card p-5 shadow-sm">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">{item.name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{item.type}</p>
                </div>
                <Badge className={RARITY_COLORS[item.rarity]}>
                  {RARITY_LABELS[item.rarity]}
                </Badge>
              </div>

              <div className="rounded-2xl border bg-muted/20 p-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
                  <Sparkles className="h-4 w-4 text-primary" />成长阶段
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {[
                    { label: '蛋', img: item.eggImage },
                    { label: '幼', img: item.babyImage },
                    { label: '少', img: item.teenImage },
                    { label: '成', img: item.adultImage },
                    { label: '终', img: item.finalImage },
                  ].map((stage, idx) => (
                    <div key={idx} className="text-center">
                      <div className="flex aspect-square w-full items-center justify-center rounded-xl border bg-background text-2xl">
                        {stage.img || '?'}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{stage.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                <Button variant="outline" size="sm" className="flex-1 rounded-xl" onClick={() => handleEdit(item)}>
                  <Edit className="mr-1 h-3 w-3" />
                  编辑
                </Button>
                <Button variant="outline" size="sm" className="flex-1 rounded-xl" onClick={() => handleDelete(item.id)}>
                  <Trash2 className="mr-1 h-3 w-3" />
                  删除
                </Button>
              </div>
            </Card>
          ))}
        </div>

        {gallery.length === 0 && !showForm && (
          <Card className="overflow-hidden rounded-3xl border bg-card p-12 text-center shadow-sm">
            <p className="text-muted-foreground">暂无宠物模板，点击右上角添加</p>
          </Card>
        )}
      </div>
    </div>
  );
}
