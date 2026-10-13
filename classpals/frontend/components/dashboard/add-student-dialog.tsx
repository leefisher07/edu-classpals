"use client"

import { useRef, useState } from "react"
import { UserPlus } from "lucide-react"
import { useMutation } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { studentsApi } from "@/lib/api/students"
import { uploadApi } from "@/lib/api/upload"
import { toast } from "sonner"
import {
  CADRE_POSITIONS,
  compressImage,
  PARENT_RELATIONSHIPS,
  PHONE_PATTERN,
} from "@/components/dashboard/student-form-utils"
import {
  StudentAvatarSection,
  StudentBaseFieldsSection,
  StudentParentPhonesSection,
} from "@/components/dashboard/student-dialog-sections"

import {
  CUSTOM_CADRE_OPTION,
  NONE_CADRE_OPTION,
  useStudentCadre,
} from "@/components/dashboard/use-student-cadre"

interface AddStudentDialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  classId?: string
  groups?: { id: string; name: string }[]
  onAdd?: (data: {
    names: string[]
    gender: "male" | "female"
    groupId?: string
    studentNo?: string
  }) => void
  onSuccess?: () => void
  trigger?: React.ReactNode
}

export function AddStudentDialog({
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  classId,
  groups = [],
  onAdd,
  onSuccess,
  trigger
}: AddStudentDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen
  const setOpen = controlledOnOpenChange || setInternalOpen
  const [names, setNames] = useState("")
  const [gender, setGender] = useState<"male" | "female">("male")
  const [groupId, setGroupId] = useState<string>("none")
  const [studentNo, setStudentNo] = useState("")
  const [avatar, setAvatar] = useState("")
  const [avatarUploading, setAvatarUploading] = useState(false)
  const {
    isCadre,
    cadreMode,
    cadrePosition,
    customPosition,
    resetCadre,
    handleCadreChange,
    handleCustomPositionChange,
    currentCadreValue,
  } = useStudentCadre({ defaultCadrePosition: CADRE_POSITIONS[0] })
  const [parentPhones, setParentPhones] = useState<{ phone: string; relationship: string }[]>([])
  const [avatarTab, setAvatarTab] = useState<"text" | "upload">("text")

  const resetForm = () => {
    setNames("")
    setGender("male")
    setGroupId("none")
    setStudentNo("")
    setAvatar("")
    setAvatarUploading(false)
    resetCadre()
    setParentPhones([])
    setAvatarTab("text")
  }

  const createMutation = useMutation({
    mutationFn: (data: any) => studentsApi.create(classId!, data),
    onSuccess: (response) => {
      const result = response as any
      const count = result?.count || 0
      toast.success(`成功添加 ${count} 名学生`)
      onAdd?.(result)
      onSuccess?.()
      resetForm()
      setOpen(false)
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || error?.message || "添加学生失败")
    },
  })

  const handleUploadAvatar = async (file?: File) => {
    if (!file) return

    try {
      setAvatarUploading(true)
      const compressedFile = await compressImage(file)
      const response = await uploadApi.uploadAvatar(compressedFile)
      const url = (response as any)?.url || (response as any)?.data?.url

      if (!url) {
        throw new Error("头像上传失败")
      }

      setAvatar(url)
      setAvatarTab("upload")
      toast.success("头像上传成功")
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || "头像上传失败")
    } finally {
      setAvatarUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const addParentPhone = () => {
    if (parentPhones.length < 2) {
      setParentPhones([...parentPhones, { phone: "", relationship: parentPhones.length === 0 ? "妈妈" : "爸爸" }])
    }
  }

  const updateParentPhone = (index: number, field: "phone" | "relationship", value: string) => {
    setParentPhones((prev) => prev.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item))
  }

  const removeParentPhone = (index: number) => {
    setParentPhones((prev) => prev.filter((_, itemIndex) => itemIndex !== index))
  }

  const validateParentPhones = () => {
    for (const item of parentPhones) {
      const phone = item.phone.trim()
      if (!phone) {
        toast.error("请填写完整的家长手机号")
        return false
      }
      if (!PHONE_PATTERN.test(phone)) {
        toast.error("家长手机号格式不正确")
        return false
      }
    }
    return true
  }

  const handleSubmit = () => {
    const nameList = names
      .split(/[,，\n]/)
      .map((n) => n.trim())
      .filter((n) => n.length > 0)

    if (nameList.length === 0) {
      toast.error("请输入学生姓名")
      return
    }

    if (!classId) {
      toast.error("请先选择班级")
      return
    }

    if (nameList.length > 1 && avatar) {
      toast.error("批量添加学生时不能设置头像")
      return
    }

    if (!validateParentPhones()) {
      return
    }

    createMutation.mutate({
      names: nameList,
      gender: gender.toUpperCase(),
      avatar: avatar || undefined,
      groupId: groupId !== "none" ? groupId : undefined,
      studentNumber: studentNo || undefined,
      isCadre,
      cadrePosition: isCadre ? (cadreMode === "preset" ? cadrePosition || undefined : undefined) : undefined,
      customPosition: isCadre ? (cadreMode === "custom" ? customPosition || undefined : undefined) : undefined,
      parentPhones: parentPhones.map((item) => ({
        phone: item.phone.trim(),
        relationship: item.relationship,
      })),
    })
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => {
      setOpen(nextOpen)
      if (!nextOpen) {
        resetForm()
      }
    }}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="gap-2">
            <UserPlus className="w-4 h-4" />
            添加学生
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="flex h-[88vh] max-h-[88vh] w-[94vw] max-w-4xl flex-col overflow-hidden p-0">
        <DialogHeader className="border-b px-8 py-6">
          <DialogTitle className="flex items-center gap-2 text-[2rem] font-semibold tracking-tight">
            <UserPlus className="h-7 w-7 text-primary" />
            添加学生
          </DialogTitle>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-8 py-6">
          <div className="mx-auto flex max-w-3xl flex-col gap-8">
            <StudentAvatarSection
              avatar={avatar}
              avatarTab={avatarTab}
              avatarUploading={avatarUploading}
              previewText={names.split(/[,，\n]/)[0]?.trim()?.slice(0, 2) || "未"}
              previewAlt="学生头像"
              fileInputRef={fileInputRef}
              onAvatarTabChange={setAvatarTab}
              onFileChange={handleUploadAvatar}
              onRemoveAvatar={() => setAvatar("")}
              uploadHint="上传前会自动压缩。批量添加学生时不支持设置头像。"
            />

            <StudentBaseFieldsSection
              nameLabel="学生姓名*"
              nameField={(
                <>
                  <Textarea
                    placeholder="输入学生姓名，多个姓名请用回车或逗号分隔"
                    value={names}
                    onChange={(e) => setNames(e.target.value)}
                    rows={4}
                    className="min-h-[124px] rounded-2xl px-5 py-4 text-base resize-none"
                  />
                  <p className="text-sm text-muted-foreground">提示：可一次添加多个学生，用回车或逗号分隔</p>
                </>
              )}
              studentNumber={studentNo}
              onStudentNumberChange={setStudentNo}
              studentNumberHint="批量添加时，学号将自动递增"
              groupId={groupId}
              onGroupChange={setGroupId}
              groups={groups}
              gender={gender}
              onGenderChange={(value) => setGender(value as "male" | "female")}
              currentCadreValue={currentCadreValue}
              onCadreChange={handleCadreChange}
              customPosition={customPosition}
              onCustomPositionChange={handleCustomPositionChange}
              cadreMode={cadreMode}
              cadrePositions={CADRE_POSITIONS}
              noneCadreOption={NONE_CADRE_OPTION}
              customCadreOption={CUSTOM_CADRE_OPTION}
            />

            <StudentParentPhonesSection
              parentPhones={parentPhones}
              relationships={PARENT_RELATIONSHIPS}
              actionText="添加后即时生效"
              emptyText="还没有填写家长手机号，点击右上角“添加手机号”开始填写。"
              onAdd={addParentPhone}
              onUpdate={updateParentPhone}
              onRemove={removeParentPhone}
            />
          </div>
        </div>

        <DialogFooter className="border-t px-8 py-5">
          <Button type="button" variant="outline" className="h-14 rounded-2xl px-7 text-lg" onClick={() => setOpen(false)}>取消</Button>
          <Button onClick={handleSubmit} className="h-14 rounded-2xl px-8 text-lg" disabled={createMutation.isPending || avatarUploading}>
            {createMutation.isPending ? "添加中..." : "确认添加"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
