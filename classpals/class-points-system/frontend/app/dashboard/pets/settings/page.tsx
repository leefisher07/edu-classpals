'use client';

import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActiveClass } from '@/lib/hooks/use-active-class';
import { petsApi } from '@/lib/api/pets';
import { uploadApi } from '@/lib/api/upload';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Settings, Save, RotateCcw, Info, Search, Upload, Link2, ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type AssignMode = 'STUDENT_CHOOSE' | 'TEACHER_ASSIGN';
type StageField = 'eggImage' | 'babyImage' | 'teenImage' | 'adultImage' | 'finalImage';

const PET_STAGE_FIELDS: Array<{ field: StageField; label: string }> = [
  { field: 'eggImage', label: '蛋' },
  { field: 'babyImage', label: '幼年' },
  { field: 'teenImage', label: '少年' },
  { field: 'adultImage', label: '成年' },
  { field: 'finalImage', label: '终极' },
];

const API_ORIGIN = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api').replace(/\/api\/?$/, '');

const resolvePetImageUrl = (image?: string | null) => {
  if (!image) return '';
  if (/^https?:\/\//.test(image)) return image;
  if (image.startsWith('/')) return `${API_ORIGIN}${image}`;
  return image;
};

export default function PetSettingsPage() {
  const queryClient = useQueryClient();
  const { activeClassId: classId } = useActiveClass();

  const [eggToBaby, setEggToBaby] = useState('10');
  const [babyToTeen, setBabyToTeen] = useState('30');
  const [teenToAdult, setTeenToAdult] = useState('60');
  const [adultToFinal, setAdultToFinal] = useState('100');
  const [assignMode, setAssignMode] = useState<AssignMode>('TEACHER_ASSIGN');
  const [errors, setErrors] = useState<string[]>([]);
  const [gallerySearch, setGallerySearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [editingPetId, setEditingPetId] = useState<string | null>(null);
  const [editingMeta, setEditingMeta] = useState({ category: '', description: '', source: '', isEnabled: true });
  const [stageDrafts, setStageDrafts] = useState<Record<StageField, string>>({
    eggImage: '',
    babyImage: '',
    teenImage: '',
    adultImage: '',
    finalImage: '',
  });

  const { data: settingsData, isLoading } = useQuery({
    queryKey: ['pet-settings', classId],
    queryFn: () => petsApi.getPetSettings(classId!),
    enabled: !!classId,
  });

  const { data: galleryData, isLoading: galleryLoading } = useQuery({
    queryKey: ['pet-gallery-admin'],
    queryFn: () => petsApi.listGallery({ includeDisabled: true }),
  });

  const gallery = (galleryData as any)?.gallery || [];
  const categories = useMemo(
    () => Array.from(new Set(gallery.map((item: any) => item.category).filter(Boolean))) as string[],
    [gallery]
  );

  const filteredGallery = useMemo(
    () => gallery.filter((item: any) => {
      if (categoryFilter !== 'all' && item.category !== categoryFilter) return false;
      if (!gallerySearch.trim()) return true;
      const keyword = gallerySearch.trim().toLowerCase();
      return item.nameZh?.toLowerCase().includes(keyword) || item.nameEn?.toLowerCase().includes(keyword) || item.id?.toLowerCase().includes(keyword);
    }),
    [gallery, categoryFilter, gallerySearch]
  );

  const updateMutation = useMutation({
    mutationFn: (data: any) => petsApi.updatePetSettings(classId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pet-settings'] });
      queryClient.invalidateQueries({ queryKey: ['class-pets'] });
      toast.success('宠物成长设置已保存');
    },
    onError: (error: any) => toast.error(error?.message || '保存设置失败'),
  });

  const updatePetMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => petsApi.updateGalleryItem(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pet-gallery-admin'] });
      queryClient.invalidateQueries({ queryKey: ['pets-gallery'] });
      queryClient.invalidateQueries({ queryKey: ['class-pets'] });
      toast.success('宠物图鉴已更新');
    },
    onError: (error: any) => toast.error(error?.message || '更新宠物图鉴失败'),
  });

  useEffect(() => {
    if (settingsData) {
      const settings = settingsData as any;
      setEggToBaby(String(settings.eggToBaby || 10));
      setBabyToTeen(String(settings.babyToTeen || 30));
      setTeenToAdult(String(settings.teenToAdult || 60));
      setAdultToFinal(String(settings.adultToFinal || 100));
      setAssignMode(settings.assignMode || 'TEACHER_ASSIGN');
    }
  }, [settingsData]);

  const validateThresholds = () => {
    const errors: string[] = [];
    const values = [parseInt(eggToBaby), parseInt(babyToTeen), parseInt(teenToAdult), parseInt(adultToFinal)];

    if (values.some((v) => isNaN(v) || v < 1)) {
      errors.push('所有阈值必须是大于 0 的整数');
    }

    if (values[0] >= values[1]) errors.push('幼年阈值必须大于蛋阶段阈值');
    if (values[1] >= values[2]) errors.push('少年阈值必须大于幼年阈值');
    if (values[2] >= values[3]) errors.push('成年阈值必须大于少年阈值');

    setErrors(errors);
    return errors.length === 0;
  };

  const handleSave = () => {
    if (!validateThresholds()) return;

    updateMutation.mutate({
      eggToBaby: parseInt(eggToBaby),
      babyToTeen: parseInt(babyToTeen),
      teenToAdult: parseInt(teenToAdult),
      adultToFinal: parseInt(adultToFinal),
    });
  };

  const handleReset = () => {
    setEggToBaby('10');
    setBabyToTeen('30');
    setTeenToAdult('60');
    setAdultToFinal('100');
    setAssignMode('TEACHER_ASSIGN');
    setErrors([]);
  };

  const startEditPet = (item: any) => {
    setEditingPetId(item.id);
    setEditingMeta({
      category: item.category || '',
      description: item.description || '',
      source: item.source || '',
      isEnabled: item.isEnabled !== false,
    });
    setStageDrafts({
      eggImage: item.stages?.[0]?.image || '',
      babyImage: item.stages?.[1]?.image || '',
      teenImage: item.stages?.[2]?.image || '',
      adultImage: item.stages?.[3]?.image || '',
      finalImage: item.stages?.[4]?.image || '',
    });
  };

  const savePetStageUrl = (field: StageField) => {
    if (!editingPetId) return;
    updatePetMutation.mutate({
      id: editingPetId,
      data: {
        [field]: stageDrafts[field],
        source: editingMeta.source || 'cloud:url',
      },
    });
  };

  const uploadPetStageImage = async (field: StageField, file?: File) => {
    if (!editingPetId || !file) return;
    try {
      const result = await uploadApi.uploadPetImage(file);
      const url = (result as any)?.url || (result as any)?.data?.url;
      if (!url) {
        toast.error('上传失败：未返回图片地址');
        return;
      }
      setStageDrafts((prev) => ({ ...prev, [field]: url }));
      updatePetMutation.mutate({
        id: editingPetId,
        data: {
          [field]: url,
          source: 'upload:pet-image',
        },
      });
    } catch (error: any) {
      toast.error(error?.message || '上传图片失败');
    }
  };

  const savePetMeta = () => {
    if (!editingPetId) return;
    updatePetMutation.mutate({ id: editingPetId, data: editingMeta });
  };

  if (!classId) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">请先选择班级</p>
      </div>
    );
  }

  if (isLoading || galleryLoading) {
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
                <Settings className="h-7 w-7" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">宠物设置</h1>
                <p className="mt-1 text-sm text-muted-foreground">配置宠物成长阈值和图鉴图片</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 text-sm">
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">图鉴 {gallery.length}</span>
            </div>
          </div>
        </div>

        <Tabs defaultValue="growth" className="space-y-6">
          <TabsList className="h-11 rounded-2xl border bg-card p-1">
            <TabsTrigger value="growth" className="h-9 rounded-xl px-4">成长设置</TabsTrigger>
          </TabsList>

        <TabsContent value="growth" className="mt-0">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
            <div className="space-y-6">
              <Card className="overflow-hidden rounded-3xl border border-blue-200 bg-blue-50 p-5 shadow-sm">
                <div className="flex gap-3">
                  <Info className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600" />
                  <div className="text-sm text-blue-900">
                    <p className="mb-1 font-medium">说明</p>
                    <p className="leading-6">学生每次获得积分时，宠物会同步获得相同数值的成长经验。当经验达到阈值时，宠物会自动进化到下一阶段。</p>
                  </div>
                </div>
              </Card>

              <Card className="overflow-hidden rounded-3xl border bg-card p-6 shadow-sm">
                <div className="mb-5 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">成长经验阈值</h2>
                    <p className="mt-1 text-sm text-muted-foreground">按阶段设置递增经验值，经验达到阈值后自动进入下一阶段。</p>
                  </div>
                  <Badge variant="secondary" className="rounded-full">5 个成长阶段</Badge>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {[
                    { label: '蛋 → 幼年', value: eggToBaby, setter: setEggToBaby, placeholder: '10' },
                    { label: '幼年 → 少年', value: babyToTeen, setter: setBabyToTeen, placeholder: '30' },
                    { label: '少年 → 成年', value: teenToAdult, setter: setTeenToAdult, placeholder: '60' },
                    { label: '成年 → 终极', value: adultToFinal, setter: setAdultToFinal, placeholder: '100' },
                  ].map((item) => (
                    <div key={item.label} className="rounded-2xl border bg-background p-4">
                      <label className="mb-2 block text-sm font-medium text-foreground">{item.label}</label>
                      <div className="flex items-center gap-3">
                        <Input type="number" min="1" value={item.value} onChange={(e) => item.setter(e.target.value)} placeholder={item.placeholder} />
                        <span className="shrink-0 text-sm text-muted-foreground">经验值</span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            <div className="space-y-6">
              <Card className="overflow-hidden rounded-3xl border bg-card p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-foreground">成长路径预览</h2>
                <p className="mt-1 text-sm text-muted-foreground">当前阈值将形成以下成长节点。</p>
                <div className="mt-5 space-y-3">
                  {[
                    { label: '蛋', value: '0' },
                    { label: '幼年', value: eggToBaby },
                    { label: '少年', value: babyToTeen },
                    { label: '成年', value: teenToAdult },
                    { label: '终极', value: adultToFinal },
                  ].map((stage, index, stages) => (
                    <div key={stage.label} className="flex items-center gap-3">
                      <Badge variant="outline" className="w-24 justify-center rounded-full">{stage.label} ({stage.value})</Badge>
                      {index < stages.length - 1 ? <div className="h-px flex-1 bg-border" /> : <div className="flex-1" />}
                    </div>
                  ))}
                </div>
              </Card>


              {errors.length > 0 && (
                <Card className="overflow-hidden rounded-3xl border border-red-200 bg-red-50 p-4 shadow-sm">
                  <div className="space-y-1">
                    {errors.map((error, index) => (
                      <p key={index} className="text-sm text-red-600">• {error}</p>
                    ))}
                  </div>
                </Card>
              )}

              <div className="flex flex-wrap gap-3">
                <Button onClick={handleSave} disabled={updateMutation.isPending} className="rounded-xl">
                  <Save className="mr-2 h-4 w-4" />
                  保存设置
                </Button>
                <Button variant="outline" onClick={handleReset} className="rounded-xl">
                  <RotateCcw className="mr-2 h-4 w-4" />
                  恢复默认
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
      </div>
    </div>
  );
}
