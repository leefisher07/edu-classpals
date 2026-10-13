// Mock data for ClassPals

export interface Student {
  id: string
  name: string
  studentNo?: string
  gender: "male" | "female"
  groupId?: string
  totalPoints: number
  availablePoints: number
  avatarColor: string
}

export interface Group {
  id: string
  name: string
  leaderId: string | null
  leaderIds?: string[]
  members: string[]
  totalPoints: number
  availablePoints: number
}

export interface PointRule {
  id: string
  name: string
  value: number
  type: "add" | "deduct"
  category: string
}

export interface ShopItem {
  id: string
  name: string
  description: string
  cost: number
  stock: number
  image?: string
}

// 生成随机颜色
const avatarColors = [
  "bg-red-100 text-red-600",
  "bg-orange-100 text-orange-600",
  "bg-amber-100 text-amber-600",
  "bg-yellow-100 text-yellow-600",
  "bg-lime-100 text-lime-600",
  "bg-green-100 text-green-600",
  "bg-emerald-100 text-emerald-600",
  "bg-teal-100 text-teal-600",
  "bg-cyan-100 text-cyan-600",
  "bg-sky-100 text-sky-600",
  "bg-blue-100 text-blue-600",
  "bg-indigo-100 text-indigo-600",
  "bg-violet-100 text-violet-600",
  "bg-purple-100 text-purple-600",
  "bg-fuchsia-100 text-fuchsia-600",
  "bg-pink-100 text-pink-600",
  "bg-rose-100 text-rose-600",
]

// Mock 学生数据
export const mockStudents: Student[] = [
  { id: "1", name: "张三", gender: "male", groupId: "1", totalPoints: 85, availablePoints: 45, avatarColor: avatarColors[0] },
  { id: "2", name: "李四", gender: "male", groupId: "1", totalPoints: 72, availablePoints: 32, avatarColor: avatarColors[1] },
  { id: "3", name: "王五", gender: "male", groupId: "1", totalPoints: 68, availablePoints: 28, avatarColor: avatarColors[2] },
  { id: "4", name: "张伟", gender: "male", totalPoints: 55, availablePoints: 25, avatarColor: avatarColors[3] },
  { id: "5", name: "王芳", gender: "female", totalPoints: 92, availablePoints: 52, avatarColor: avatarColors[4] },
  { id: "6", name: "李娜", gender: "female", totalPoints: 78, availablePoints: 38, avatarColor: avatarColors[5] },
  { id: "7", name: "刘洋", gender: "male", totalPoints: 63, availablePoints: 23, avatarColor: avatarColors[6] },
  { id: "8", name: "陈静", gender: "female", totalPoints: 88, availablePoints: 48, avatarColor: avatarColors[7] },
  { id: "9", name: "杨阳", gender: "male", totalPoints: 45, availablePoints: 15, avatarColor: avatarColors[8] },
  { id: "10", name: "赵强", gender: "male", totalPoints: 52, availablePoints: 22, avatarColor: avatarColors[9] },
  { id: "11", name: "黄娟", gender: "female", totalPoints: 75, availablePoints: 35, avatarColor: avatarColors[10] },
  { id: "12", name: "周涛", gender: "male", totalPoints: 60, availablePoints: 20, avatarColor: avatarColors[11] },
  { id: "13", name: "吴霞", gender: "female", totalPoints: 82, availablePoints: 42, avatarColor: avatarColors[12] },
  { id: "14", name: "徐敏", gender: "female", totalPoints: 70, availablePoints: 30, avatarColor: avatarColors[13] },
  { id: "15", name: "孙杰", gender: "male", totalPoints: 58, availablePoints: 18, avatarColor: avatarColors[14] },
]

// Mock 小组数据
export const mockGroups: Group[] = [
  { id: "1", name: "小组一", leaderId: "1", members: ["1", "2", "3"], totalPoints: 0, availablePoints: 0 },
]

// Mock 加分规则
export const mockAddRules: PointRule[] = [
  { id: "1", name: "回答问题", value: 2, type: "add", category: "课堂表现" },
  { id: "2", name: "作业优秀", value: 3, type: "add", category: "作业" },
  { id: "3", name: "帮助同学", value: 2, type: "add", category: "品德" },
  { id: "4", name: "课堂纪律好", value: 1, type: "add", category: "课堂表现" },
  { id: "5", name: "考试进步", value: 5, type: "add", category: "考试" },
]

// Mock 减分规则
export const mockDeductRules: PointRule[] = [
  { id: "1", name: "迟到", value: 1, type: "deduct", category: "纪律" },
  { id: "2", name: "作业未交", value: 2, type: "deduct", category: "作业" },
  { id: "3", name: "课堂违纪", value: 2, type: "deduct", category: "纪律" },
  { id: "4", name: "打架", value: 5, type: "deduct", category: "纪律" },
]

// Mock 商店商品
export const mockShopItems: ShopItem[] = [
  { id: "1", name: "免作业卡", description: "可免除一次作业", cost: 20, stock: 10 },
  { id: "2", name: "换座位卡", description: "可换一次座位", cost: 15, stock: 5 },
  { id: "3", name: "加餐券", description: "可获得一次加餐机会", cost: 10, stock: 20 },
  { id: "4", name: "文具礼包", description: "精美文具一套", cost: 50, stock: 3 },
]

// 获取姓氏
export function getSurname(name: string): string {
  const compoundSurnames = ["欧阳", "上官", "司马", "诸葛", "令狐", "皇甫"]
  for (const surname of compoundSurnames) {
    if (name.startsWith(surname)) {
      return surname
    }
  }
  return name.charAt(0)
}

// 根据姓名生成头像颜色
export function getAvatarColor(name: string): string {
  const index = name.charCodeAt(0) % avatarColors.length
  return avatarColors[index]
}
