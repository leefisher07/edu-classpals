"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { ImagePlus, Trash2, Type } from "lucide-react"

const API_ORIGIN = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api").replace(/\/api\/?$/, "")

function resolveAvatarUrl(avatar?: string | null) {
  if (!avatar) return ""
  if (/^https?:\/\//.test(avatar)) return avatar
  if (avatar.startsWith("/")) return `${API_ORIGIN}${avatar}`
  return avatar
}

interface AvatarSectionProps {
  avatar: string
  avatarTab: "text" | "upload"
  avatarUploading: boolean
  previewText: string
  previewAlt: string
  fileInputRef: React.RefObject<HTMLInputElement | null>
  onAvatarTabChange: (tab: "text" | "upload") => void
  onFileChange: (file?: File) => void
  onRemoveAvatar: () => void
  uploadHint: string
}

export function StudentAvatarSection({
  avatar,
  avatarTab,
  avatarUploading,
  previewText,
  previewAlt,
  fileInputRef,
  onAvatarTabChange,
  onFileChange,
  onRemoveAvatar,
  uploadHint,
}: AvatarSectionProps) {
  return (
    <section className="rounded-[28px] border bg-background px-6 py-8 shadow-sm">
      <div className="flex flex-col items-center gap-6">
        <div className="flex h-44 w-44 items-center justify-center overflow-hidden rounded-full border-[8px] border-primary/10 bg-muted text-5xl font-semibold text-primary shadow-sm">
          {avatar ? <img src={resolveAvatarUrl(avatar)} alt={previewAlt} className="h-full w-full object-cover" /> : previewText || "未"}
        </div>

        <div className="grid w-full gap-3 sm:grid-cols-2">
          <button
            type="button"
            className={cn(
              "flex h-14 items-center justify-center gap-2 rounded-2xl border text-lg font-medium transition-colors",
              avatarTab === "text"
                ? "border-primary text-primary shadow-sm"
                : "border-border text-muted-foreground hover:bg-muted/40"
            )}
            onClick={() => onAvatarTabChange("text")}
          >
            <Type className="h-5 w-5" />
            修改信息
          </button>
          <button
            type="button"
            className={cn(
              "flex h-14 items-center justify-center gap-2 rounded-2xl border text-lg font-medium transition-colors",
              avatarTab === "upload"
                ? "border-primary text-primary shadow-sm"
                : "border-border text-muted-foreground hover:bg-muted/40"
            )}
            onClick={() => {
              onAvatarTabChange("upload")
              fileInputRef.current?.click()
            }}
          >
            <ImagePlus className="h-5 w-5" />
            上传照片
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => onFileChange(e.target.files?.[0])}
        />

        <p className="text-sm text-muted-foreground">{uploadHint}</p>

        {avatarTab === "upload" && (
          <div className="flex flex-wrap items-center justify-center gap-3 text-sm text-muted-foreground">
            <Button type="button" variant="outline" className="h-11 rounded-xl px-5" onClick={() => fileInputRef.current?.click()} disabled={avatarUploading}>
              {avatarUploading ? "上传中..." : "重新上传"}
            </Button>
            {avatar && (
              <Button type="button" variant="ghost" className="h-11 rounded-xl px-5 text-red-500 hover:text-red-600" onClick={onRemoveAvatar}>
                <Trash2 className="mr-2 h-4 w-4" />移除照片
              </Button>
            )}
          </div>
        )}
      </div>
    </section>
  )
}

interface BaseFieldsProps {
  nameLabel: string
  nameField: React.ReactNode
  studentNumber: string
  onStudentNumberChange: (value: string) => void
  studentNumberHint?: string
  groupId: string
  onGroupChange: (value: string) => void
  groups: { id: string; name: string }[]
  gender: "MALE" | "FEMALE" | "male" | "female"
  onGenderChange: (value: "MALE" | "FEMALE" | "male" | "female") => void
  currentCadreValue: string
  onCadreChange: (value: string) => void
  customPosition: string
  onCustomPositionChange: (value: string) => void
  cadreMode: "preset" | "custom"
  cadrePositions: string[]
  noneCadreOption: string
  customCadreOption: string
}

export function StudentBaseFieldsSection({
  nameLabel,
  nameField,
  studentNumber,
  onStudentNumberChange,
  studentNumberHint,
  groupId,
  onGroupChange,
  groups,
  gender,
  onGenderChange,
  currentCadreValue,
  onCadreChange,
  customPosition,
  onCustomPositionChange,
  cadreMode,
  cadrePositions,
  noneCadreOption,
  customCadreOption,
}: BaseFieldsProps) {
  return (
    <section className="rounded-[28px] border bg-background px-6 py-7 shadow-sm">
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-3 md:col-span-2">
          <Label className="text-[15px] font-semibold">{nameLabel}</Label>
          {nameField}
        </div>

        <div className="space-y-3">
          <Label className="text-[15px] font-semibold">学号</Label>
          <Input
            className="h-16 rounded-2xl px-5 text-base"
            placeholder="可选"
            value={studentNumber}
            onChange={(e) => onStudentNumberChange(e.target.value)}
          />
          {studentNumberHint ? <p className="text-sm text-muted-foreground">{studentNumberHint}</p> : null}
        </div>

        <div className="space-y-3">
          <Label className="text-[15px] font-semibold">分组</Label>
          <Select value={groupId} onValueChange={onGroupChange}>
            <SelectTrigger className="h-16 rounded-2xl px-5 text-base">
              <SelectValue placeholder="未分组" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">未分组</SelectItem>
              {groups.map((group) => (
                <SelectItem key={group.id} value={group.id}>
                  {group.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3">
          <Label className="text-[15px] font-semibold">性别</Label>
          <div className="flex h-16 items-center gap-8 rounded-2xl border px-5 text-base">
            <label className="flex items-center gap-3">
              <input type="radio" checked={gender === "MALE" || gender === "male"} onChange={() => onGenderChange(gender === "MALE" || gender === "FEMALE" ? "MALE" : "male")} className="h-5 w-5" />
              男
            </label>
            <label className="flex items-center gap-3">
              <input type="radio" checked={gender === "FEMALE" || gender === "female"} onChange={() => onGenderChange(gender === "MALE" || gender === "FEMALE" ? "FEMALE" : "female")} className="h-5 w-5" />
              女
            </label>
          </div>
        </div>

        <div className="space-y-3 md:col-span-2">
          <Label className="text-[15px] font-semibold">班干部（选填）</Label>
          <div className="grid gap-4 md:grid-cols-2">
            <Select value={currentCadreValue} onValueChange={onCadreChange}>
              <SelectTrigger className="h-16 rounded-2xl px-5 text-base">
                <SelectValue placeholder="预设职位" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={noneCadreOption}>不是班干部</SelectItem>
                {cadrePositions.map((position) => (
                  <SelectItem key={position} value={position}>{position}</SelectItem>
                ))}
                <SelectItem value={customCadreOption}>自定义职位</SelectItem>
              </SelectContent>
            </Select>

            <Input
              className="h-16 rounded-2xl px-5 text-base"
              placeholder="自定义职位（可输入）"
              value={customPosition}
              onChange={(e) => onCustomPositionChange(e.target.value)}
              disabled={cadreMode !== "custom"}
            />
          </div>
        </div>
      </div>
    </section>
  )
}

interface ParentPhoneItem {
  phone: string
  relationship: string
}

interface ParentPhonesProps {
  parentPhones: ParentPhoneItem[]
  relationships: string[]
  actionText: string
  emptyText: string
  onAdd: () => void
  onUpdate: (index: number, field: "phone" | "relationship", value: string) => void
  onRemove: (index: number) => void
}

export function StudentParentPhonesSection({
  parentPhones,
  relationships,
  actionText,
  emptyText,
  onAdd,
  onUpdate,
  onRemove,
}: ParentPhonesProps) {
  return (
    <section className="rounded-[28px] border bg-background px-6 py-7 shadow-sm">
      <div className="mb-5 flex flex-col gap-2 border-b pb-5 text-sm text-muted-foreground sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[15px] font-semibold text-foreground">家长手机号管理</p>
          <p className="mt-1 text-base text-muted-foreground">最多 2 个手机号；清空后保存即解除绑定</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-base">{actionText}</span>
          {parentPhones.length < 2 && (
            <Button type="button" variant="outline" className="h-10 rounded-xl px-4" onClick={onAdd}>
              添加手机号
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {parentPhones.length === 0 ? (
          <div className="rounded-2xl border border-dashed bg-muted/20 px-5 py-8 text-center text-base text-muted-foreground">
            {emptyText}
          </div>
        ) : (
          parentPhones.map((item, index) => (
            <div key={index} className="rounded-3xl border bg-muted/15 p-4">
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px_52px]">
                <div className="space-y-3">
                  <Label className="text-[15px] font-semibold">槽位{index + 1} 手机号</Label>
                  <Input
                    className="h-16 rounded-2xl px-5 text-xl"
                    placeholder={index === 0 ? "例如 13800001111" : "可留空"}
                    value={item.phone}
                    onChange={(e) => onUpdate(index, "phone", e.target.value)}
                  />
                </div>

                <div className="space-y-3">
                  <Label className="text-[15px] font-semibold">关系</Label>
                  <Select value={item.relationship} onValueChange={(value) => onUpdate(index, "relationship", value)}>
                    <SelectTrigger className="h-16 rounded-2xl px-5 text-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {relationships.map((relationship) => (
                        <SelectItem key={relationship} value={relationship}>{relationship}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-end">
                  <Button type="button" variant="ghost" size="icon" className="h-16 w-12 rounded-2xl text-red-500 hover:text-red-600" onClick={() => onRemove(index)}>
                    <Trash2 className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  )
}
