import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  OperationSnapshotStatus,
  OperationSnapshotType,
} from '@prisma/client';
import ExcelJS from 'exceljs';
import { PrismaService } from '../../prisma/prisma.service';

type StudentDeletionSnapshotPayload = {
  student: any;
  parents: any[];
  pointRecords: any[];
  exchanges: any[];
  shareLinks: any[];
  pet: any | null;
  petGrowthRecords: any[];
  petPointRecords: any[];
};

type ClearClassPointsSnapshotPayload = {
  classId: string;
  className: string;
  operatorName: string;
  students: Array<{
    id: string;
    name: string;
    totalPoints: number;
    availablePoints: number;
  }>;
};

type ClearClassPointsRecordChange = {
  points: number;
  reason: string;
};

type ClassDataImportMode = 'append' | 'replace';

type ParsedImportStudent = {
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

type ParsedImportGroup = {
  rowNumber: number;
  name: string;
  leaderName?: string;
};

type ParsedImportRule = {
  rowNumber: number;
  name: string;
  points: number;
  type: 'ADD' | 'DEDUCT';
  category?: string;
  isEnabled: boolean;
};

type ParsedImportShopItem = {
  rowNumber: number;
  name: string;
  price: number;
  stock: number | null;
  description?: string;
  isAvailable: boolean;
};

type PlannedImportGroup = ParsedImportGroup & {
  isImplicit?: boolean;
};

type ParsedImportWorkbook = {
  groups: ParsedImportGroup[];
  students: ParsedImportStudent[];
  rules: ParsedImportRule[];
  shopItems: ParsedImportShopItem[];
};

type ImportConflictSummary = {
  students: string[];
  rules: string[];
  shopItems: string[];
};

type AppendImportPlan = {
  skippedStudents: string[];
  skippedRules: string[];
  skippedShopItems: string[];
  studentsToCreate: ParsedImportStudent[];
  rulesToCreate: ParsedImportRule[];
  shopItemsToCreate: ParsedImportShopItem[];
};

type ImportTemplateStudentRow = {
  name: string;
  studentNumber: string;
  gender: string;
  groupName: string;
  totalPoints: number;
  availablePoints: number;
  isCadre: string;
  cadrePosition: string;
  customPosition: string;
  parentPhones: string;
};

type ImportTemplateGroupRow = {
  name: string;
  leaderName: string;
};

type ImportTemplateRuleRow = {
  name: string;
  points: number;
  type: string;
  category: string;
  isEnabled: string;
};

type ImportTemplateShopRow = {
  name: string;
  price: number;
  stock: number | string;
  description: string;
  isAvailable: string;
};

@Injectable()
export class DataManagementService {
  constructor(private readonly prisma: PrismaService) {}

  private async verifyClassOwnership(userId: string, classId: string) {
    const classItem = await this.prisma.class.findUnique({
      where: { id: classId },
    });
    if (!classItem) throw new NotFoundException('班级不存在');
    if (classItem.userId !== userId)
      throw new ForbiddenException('无权操作此班级');
    return classItem;
  }

  private async verifyStudentOwnership(userId: string, studentId: string) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      include: { class: true },
    });
    if (!student) throw new NotFoundException('学生不存在');
    if (student.class.userId !== userId)
      throw new ForbiddenException('无权操作此学生');
    return student;
  }

  private buildClearClassPointRecordChanges(student: {
    totalPoints: number;
    availablePoints: number;
  }): ClearClassPointsRecordChange[] {
    const changes: ClearClassPointsRecordChange[] = [];

    if (student.totalPoints !== 0) {
      changes.push({
        points: -student.totalPoints,
        reason: '清空班级积分（清零历史总分）',
      });
    }

    const spentPoints = student.totalPoints - student.availablePoints;
    if (spentPoints !== 0) {
      changes.push({
        points: spentPoints,
        reason: '清空班级积分（冲销已兑换占用积分）',
      });
    }

    return changes;
  }

  private mapSnapshot(snapshot: any) {
    return {
      id: snapshot.id,
      classId: snapshot.classId,
      type: snapshot.type,
      status: snapshot.status,
      targetId: snapshot.targetId,
      targetName: snapshot.targetName,
      summary: snapshot.summary,
      restoredAt: snapshot.restoredAt,
      restoredBy: snapshot.restoredBy,
      createdAt: snapshot.createdAt,
      updatedAt: snapshot.updatedAt,
    };
  }

  private formatDateTime(value?: Date | string | null) {
    if (!value) return '—';
    return new Date(value).toLocaleString('zh-CN', { hour12: false });
  }

  private formatGender(value?: string | null) {
    if (value === 'MALE') return '男';
    if (value === 'FEMALE') return '女';
    return value || '—';
  }

  private formatPointType(value?: string | null) {
    if (value === 'ADD') return '加分';
    if (value === 'DEDUCT') return '减分';
    return value || '—';
  }

  private formatBoolean(value?: boolean | null) {
    if (value === true) return '是';
    if (value === false) return '否';
    return '—';
  }

  private formatExchangeStatus(value?: string | null) {
    if (value === 'PENDING') return '待发放';
    if (value === 'DELIVERED') return '已发放';
    if (value === 'CANCELLED') return '已取消';
    return value || '—';
  }

  private sanitizeFileName(name: string) {
    return name.replace(/[\\/:*?"<>|]/g, '-').trim() || '班级';
  }

  private normalizeImportMode(mode?: string): ClassDataImportMode {
    return mode === 'replace' ? 'replace' : 'append';
  }

  private normalizeImportText(value: unknown) {
    return String(value ?? '').trim();
  }

  private parseImportNumber(value: unknown, rowNumber?: number, fieldName = '数字') {
    const normalized = this.normalizeImportText(value);
    if (!normalized) {
      return 0;
    }

    const parsed = Number(normalized);
    if (!Number.isFinite(parsed)) {
      throw new BadRequestException(
        `${rowNumber ? `学生 sheet 第 ${rowNumber} 行` : ''}${fieldName}非法数字：${normalized}`,
      );
    }

    return Math.trunc(parsed);
  }

  private parseImportNumberWithContext(
    sheetName: string,
    value: unknown,
    rowNumber?: number,
    fieldName = '数字',
  ) {
    const normalized = this.normalizeImportText(value);
    if (!normalized) {
      return 0;
    }

    const parsed = Number(normalized);
    if (!Number.isFinite(parsed)) {
      throw new BadRequestException(
        `${rowNumber ? `${sheetName} sheet 第 ${rowNumber} 行` : ''}${fieldName}非法数字：${normalized}`,
      );
    }

    return Math.trunc(parsed);
  }

  private parseImportGender(value: unknown, rowNumber?: number): 'MALE' | 'FEMALE' {
    const normalized = this.normalizeImportText(value);
    if (!normalized || normalized === '男' || normalized.toUpperCase() === 'MALE') {
      return 'MALE';
    }
    if (normalized === '女' || normalized.toUpperCase() === 'FEMALE') {
      return 'FEMALE';
    }
    throw new BadRequestException(
      `${rowNumber ? `学生 sheet 第 ${rowNumber} 行` : ''}性别非法：${normalized || '空值'}`,
    );
  }

  private parseImportBoolean(value: unknown) {
    const normalized = this.normalizeImportText(value);
    return ['是', 'true', 'TRUE', '1', 'yes', 'YES'].includes(normalized);
  }

  private parseParentPhones(value: unknown, rowNumber?: number) {
    const normalized = this.normalizeImportText(value);
    if (!normalized || normalized === '—') {
      return [];
    }

    const phones = normalized
      .split(/[、,，;；\n]+/)
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item, index) => {
        const [relationshipPart, phonePart] = item.includes(':')
          ? item.split(':')
          : item.includes('：')
            ? item.split('：')
            : [`家长${index + 1}`, item];
        const relationship = this.normalizeImportText(relationshipPart) || `家长${index + 1}`;
        const phone = this.normalizeImportText(phonePart);
        if (!/^1[3-9]\d{9}$/.test(phone)) {
          throw new BadRequestException(
            `${rowNumber ? `学生 sheet 第 ${rowNumber} 行` : ''}家长手机号非法：${phone || '空值'}`,
          );
        }
        return { relationship, phone };
      });

    if (phones.length > 2) {
      throw new BadRequestException(
        `${rowNumber ? `学生 sheet 第 ${rowNumber} 行` : ''}每个学生最多导入 2 个家长手机号`,
      );
    }

    const uniquePhones = new Set(phones.map((item) => item.phone));
    if (uniquePhones.size !== phones.length) {
      throw new BadRequestException(
        `${rowNumber ? `学生 sheet 第 ${rowNumber} 行` : ''}同一学生存在重复家长手机号`,
      );
    }

    return phones;
  }

  private parseImportPointType(value: unknown, rowNumber?: number): 'ADD' | 'DEDUCT' {
    const rawValue = String(value ?? '空值');
    const normalized = this.normalizeImportText(value);
    if (normalized === '加分' || normalized.toUpperCase() === 'ADD') {
      return 'ADD';
    }
    if (normalized === '减分' || normalized === '扣分' || normalized.toUpperCase() === 'DEDUCT') {
      return 'DEDUCT';
    }
    throw new BadRequestException(
      `${rowNumber ? `积分规则 sheet 第 ${rowNumber} 行` : ''}类型非法：${rawValue}`,
    );
  }

  private parseGroupsWorksheet(worksheet: ExcelJS.Worksheet) {
    const parsedGroups: ParsedImportGroup[] = [];
    const expectedHeaders = ['小组名称（必填）', '组长姓名（可选）'];
    const actualHeaders = expectedHeaders.map((_, index) =>
      this.normalizeImportText(worksheet.getRow(1).getCell(index + 1).value),
    );
    const headerMatched = expectedHeaders.every(
      (header, index) => actualHeaders[index] === header,
    );

    if (!headerMatched) {
      throw new BadRequestException(
        '导入文件的“小组”工作表表头不匹配，请下载系统导入模板填写后再导入',
      );
    }

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;

      const name = this.normalizeImportText(row.getCell(1).value);
      const leaderName = this.normalizeImportText(row.getCell(2).value);
      const isEmptyRow = !name && !leaderName;

      if (isEmptyRow) return;
      if (!name) {
        throw new BadRequestException(`小组 sheet 第 ${rowNumber} 行缺少小组名称`);
      }

      parsedGroups.push({
        rowNumber,
        name,
        leaderName: leaderName && leaderName !== '—' ? leaderName : undefined,
      });
    });

    return parsedGroups;
  }

  private parseRulesWorksheet(worksheet: ExcelJS.Worksheet) {
    const parsedRules: ParsedImportRule[] = [];
    const expectedHeaders = ['规则名称（必填）', '分值（必填）', '类型（加分/减分）', '分类（可选）', '启用（是/否）'];
    const actualHeaders = expectedHeaders.map((_, index) =>
      this.normalizeImportText(worksheet.getRow(1).getCell(index + 1).value),
    );
    const headerMatched = expectedHeaders.every(
      (header, index) => actualHeaders[index] === header,
    );

    if (!headerMatched) {
      throw new BadRequestException(
        '导入文件的“积分规则”工作表表头不匹配，请下载系统导入模板填写后再导入',
      );
    }

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;

      const name = this.normalizeImportText(row.getCell(1).value);
      const pointsRaw = this.normalizeImportText(row.getCell(2).value);
      const typeRaw = row.getCell(3).value;
      const category = this.normalizeImportText(row.getCell(4).value);
      const isEnabledRaw = row.getCell(5).value;
      const isEmptyRow = !name && !pointsRaw && !this.normalizeImportText(typeRaw) && !category && !this.normalizeImportText(isEnabledRaw);

      if (isEmptyRow) return;
      if (!name) {
        throw new BadRequestException(`积分规则 sheet 第 ${rowNumber} 行缺少规则名称`);
      }

      const points = this.parseImportNumberWithContext('积分规则', pointsRaw, rowNumber, '分值');
      if (points <= 0) {
        throw new BadRequestException(`积分规则 sheet 第 ${rowNumber} 行分值必须大于 0`);
      }

      parsedRules.push({
        rowNumber,
        name,
        points,
        type: this.parseImportPointType(typeRaw, rowNumber),
        category: category && category !== '—' ? category : undefined,
        isEnabled: this.parseImportBoolean(isEnabledRaw),
      });
    });

    return parsedRules;
  }

  private parseShopWorksheet(worksheet: ExcelJS.Worksheet) {
    const parsedItems: ParsedImportShopItem[] = [];
    const expectedHeaders = ['商品名称（必填）', '所需积分（必填）', '库存（留空=不限）', '描述（可选）', '上架（是/否）'];
    const actualHeaders = expectedHeaders.map((_, index) =>
      this.normalizeImportText(worksheet.getRow(1).getCell(index + 1).value),
    );
    const headerMatched = expectedHeaders.every(
      (header, index) => actualHeaders[index] === header,
    );

    if (!headerMatched) {
      throw new BadRequestException(
        '导入文件的“商品”工作表表头不匹配，请下载系统导入模板填写后再导入',
      );
    }

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;

      const name = this.normalizeImportText(row.getCell(1).value);
      const priceRaw = this.normalizeImportText(row.getCell(2).value);
      const stockRaw = this.normalizeImportText(row.getCell(3).value);
      const description = this.normalizeImportText(row.getCell(4).value);
      const isAvailableRaw = row.getCell(5).value;
      const isEmptyRow = !name && !priceRaw && !stockRaw && !description && !this.normalizeImportText(isAvailableRaw);

      if (isEmptyRow) return;
      if (!name) {
        throw new BadRequestException(`商品 sheet 第 ${rowNumber} 行缺少商品名称`);
      }

      const price = this.parseImportNumberWithContext('商品', priceRaw, rowNumber, '所需积分');
      if (price <= 0) {
        throw new BadRequestException(`商品 sheet 第 ${rowNumber} 行所需积分必须大于 0`);
      }

      let stock: number | null = null;
      if (stockRaw && stockRaw !== '—') {
        stock = this.parseImportNumberWithContext('商品', stockRaw, rowNumber, '库存');
        if (stock < 0) {
          throw new BadRequestException(`商品 sheet 第 ${rowNumber} 行库存不能小于 0`);
        }
      }

      parsedItems.push({
        rowNumber,
        name,
        price,
        stock,
        description: description && description !== '—' ? description : undefined,
        isAvailable: this.parseImportBoolean(isAvailableRaw),
      });
    });

    return parsedItems;
  }

  private parseStudentsWorksheet(worksheet: ExcelJS.Worksheet) {
    const parsedStudents: ParsedImportStudent[] = [];
    const expectedHeaders = [
      '姓名（必填）',
      '学号（可选）',
      '性别（男/女，可留空）',
      '所属小组（可留空）',
      '总积分（不会填请填0）',
      '可用积分（可兑换积分）',
      '是否班干部（是/否）',
      '班干部岗位（可留空）',
      '自定义岗位（可留空）',
      '家长手机号（可选，最多2个）',
    ];
    const actualHeaders = expectedHeaders.map((_, index) =>
      this.normalizeImportText(worksheet.getRow(1).getCell(index + 1).value),
    );
    const headerMatched = expectedHeaders.every(
      (header, index) => actualHeaders[index] === header,
    );

    if (!headerMatched) {
      throw new BadRequestException(
        '导入文件的“学生”工作表表头不匹配，请下载系统导入模板填写后再导入；不支持直接导入系统导出的备份文件',
      );
    }

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) {
        return;
      }

      const name = this.normalizeImportText(row.getCell(1).value);
      const studentNumber = this.normalizeImportText(row.getCell(2).value);
      const genderValue = this.normalizeImportText(row.getCell(3).value);
      const groupName = this.normalizeImportText(row.getCell(4).value);
      const totalPointsRaw = this.normalizeImportText(row.getCell(5).value);
      const availablePointsRaw = this.normalizeImportText(row.getCell(6).value);
      const isCadreRaw = this.normalizeImportText(row.getCell(7).value);
      const cadrePosition = this.normalizeImportText(row.getCell(8).value);
      const customPosition = this.normalizeImportText(row.getCell(9).value);
      const parentPhonesRaw = this.normalizeImportText(row.getCell(10).value);

      const isEmptyRow =
        !name &&
        !studentNumber &&
        !genderValue &&
        !groupName &&
        !totalPointsRaw &&
        !availablePointsRaw &&
        !isCadreRaw &&
        !cadrePosition &&
        !customPosition &&
        !parentPhonesRaw;

      if (isEmptyRow) {
        return;
      }

      if (!name) {
        throw new BadRequestException(`学生 sheet 第 ${rowNumber} 行缺少学生姓名`);
      }

      const totalPoints = this.parseImportNumber(totalPointsRaw, rowNumber, '总积分');
      const availablePoints = this.parseImportNumber(
        availablePointsRaw,
        rowNumber,
        '可用积分',
      );
      if (availablePoints > totalPoints) {
        throw new BadRequestException(
          `学生 sheet 第 ${rowNumber} 行可用积分不能大于总积分`,
        );
      }

      parsedStudents.push({
        rowNumber,
        name,
        studentNumber: studentNumber || undefined,
        gender: this.parseImportGender(genderValue, rowNumber),
        groupName: groupName && groupName !== '—' ? groupName : undefined,
        isCadre: this.parseImportBoolean(isCadreRaw),
        cadrePosition: cadrePosition && cadrePosition !== '—' ? cadrePosition : undefined,
        customPosition: customPosition && customPosition !== '—' ? customPosition : undefined,
        totalPoints,
        availablePoints,
        parentPhones: this.parseParentPhones(parentPhonesRaw, rowNumber),
      });
    });

    return parsedStudents;
  }

  private async parseImportWorkbook(file: Express.Multer.File): Promise<ParsedImportWorkbook> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(file.buffer as unknown as ExcelJS.Buffer);

    const groupSheet = workbook.getWorksheet('小组');
    const studentSheet = workbook.getWorksheet('学生');
    const ruleSheet = workbook.getWorksheet('积分规则');
    const shopSheet = workbook.getWorksheet('商品');

    if (!groupSheet) {
      throw new BadRequestException('导入文件缺少“小组”工作表');
    }
    if (!studentSheet) {
      throw new BadRequestException('导入文件缺少“学生”工作表');
    }
    if (!ruleSheet) {
      throw new BadRequestException('导入文件缺少“积分规则”工作表');
    }
    if (!shopSheet) {
      throw new BadRequestException('导入文件缺少“商品”工作表');
    }

    const groups = this.parseGroupsWorksheet(groupSheet);
    const students = this.parseStudentsWorksheet(studentSheet);
    const rules = this.parseRulesWorksheet(ruleSheet);
    const shopItems = this.parseShopWorksheet(shopSheet);

    if (groups.length === 0) {
      throw new BadRequestException('导入文件中没有可用的小组数据');
    }
    if (students.length === 0) {
      throw new BadRequestException('导入文件中没有可用的学生数据');
    }
    if (rules.length === 0) {
      throw new BadRequestException('导入文件中没有可用的积分规则数据');
    }
    if (shopItems.length === 0) {
      throw new BadRequestException('导入文件中没有可用的商品数据');
    }

    return { groups, students, rules, shopItems };
  }

  private ensureUniqueNames(sheetName: string, names: string[], fieldLabel: string) {
    const duplicateNames = new Set<string>();
    const seenNames = new Set<string>();

    for (const name of names) {
      if (seenNames.has(name)) {
        duplicateNames.add(name);
      }
      seenNames.add(name);
    }

    if (duplicateNames.size > 0) {
      throw new BadRequestException(
        `导入文件${sheetName}存在重复${fieldLabel}：${Array.from(duplicateNames).join('、')}`,
      );
    }
  }

  private buildImportConflictSummary(
    importMode: ClassDataImportMode,
    students: ParsedImportStudent[],
    rules: ParsedImportRule[],
    shopItems: ParsedImportShopItem[],
    existingStudentNames: Set<string>,
    existingRuleKeys: Set<string>,
    existingShopNames: Set<string>,
  ): ImportConflictSummary {
    if (importMode !== 'append') {
      return { students: [], rules: [], shopItems: [] };
    }

    return {
      students: students
        .filter((student) => existingStudentNames.has(student.name))
        .map((student) => student.name),
      rules: rules
        .filter((rule) => existingRuleKeys.has(`${rule.name}::${rule.type}`))
        .map((rule) => `${rule.name}（${rule.type === 'ADD' ? '加分' : '减分'}）`),
      shopItems: shopItems
        .filter((item) => existingShopNames.has(item.name))
        .map((item) => item.name),
    };
  }

  private async buildGroupImportPlan(
    classId: string,
    groups: ParsedImportGroup[],
    students: ParsedImportStudent[],
  ) {
    const referencedGroupNames = Array.from(
      new Set(students.map((student) => student.groupName).filter(Boolean) as string[]),
    );
    const explicitGroupMap = new Map(groups.map((group) => [group.name, group]));
    const importGroups: PlannedImportGroup[] = [
      ...groups,
      ...referencedGroupNames
        .filter((groupName) => !explicitGroupMap.has(groupName))
        .map((groupName, index) => ({
          rowNumber: 100000 + index,
          name: groupName,
        })),
    ];
    const importGroupNames = importGroups.map((group) => group.name);

    const existingGroups = await this.prisma.group.findMany({
      where: { classId, name: { in: importGroupNames } },
      select: { id: true, name: true, color: true, sortOrder: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
    const existingGroupMap = new Map(existingGroups.map((group) => [group.name, group]));
    const toCreateGroups = importGroups.filter((group) => !existingGroupMap.has(group.name));

    return {
      existingGroups,
      existingGroupMap,
      toCreateGroups,
      referencedGroupNames,
      importGroups,
    };
  }

  private async loadAppendImportConflicts(
    classId: string,
    importMode: ClassDataImportMode,
    students: ParsedImportStudent[],
    rules: ParsedImportRule[],
    shopItems: ParsedImportShopItem[],
  ) {
    const existingStudentNames =
      importMode === 'append'
        ? new Set(
            (
              await this.prisma.student.findMany({
                where: { classId },
                select: { name: true },
              })
            ).map((student) => student.name),
          )
        : new Set<string>();
    const existingRules =
      importMode === 'append'
        ? await this.prisma.pointRule.findMany({
            where: { classId },
            select: { name: true, type: true },
          })
        : [];
    const existingShopItems =
      importMode === 'append'
        ? await this.prisma.shopItem.findMany({
            where: { classId },
            select: { name: true },
          })
        : [];

    const conflicts = this.buildImportConflictSummary(
      importMode,
      students,
      rules,
      shopItems,
      existingStudentNames,
      new Set(existingRules.map((rule) => `${rule.name}::${rule.type}`)),
      new Set(existingShopItems.map((item) => item.name)),
    );

    return {
      conflicts,
      blockingReasons: [
        conflicts.students.length > 0 ? `同名学生：${conflicts.students.join('、')}` : '',
        conflicts.rules.length > 0 ? `同名积分规则：${conflicts.rules.join('、')}` : '',
        conflicts.shopItems.length > 0 ? `同名商品：${conflicts.shopItems.join('、')}` : '',
      ].filter(Boolean),
    };
  }

  private buildAppendImportPlan(
    students: ParsedImportStudent[],
    rules: ParsedImportRule[],
    shopItems: ParsedImportShopItem[],
    conflicts: ImportConflictSummary,
  ): AppendImportPlan {
    const skippedStudents = new Set(conflicts.students);
    const skippedRules = new Set(conflicts.rules);
    const skippedShopItems = new Set(conflicts.shopItems);

    return {
      skippedStudents: conflicts.students,
      skippedRules: conflicts.rules,
      skippedShopItems: conflicts.shopItems,
      studentsToCreate: students.filter((student) => !skippedStudents.has(student.name)),
      rulesToCreate: rules.filter(
        (rule) => !skippedRules.has(`${rule.name}（${rule.type === 'ADD' ? '加分' : '减分'}）`),
      ),
      shopItemsToCreate: shopItems.filter((item) => !skippedShopItems.has(item.name)),
    };
  }

  private async replaceImportedStudents(
    tx: Prisma.TransactionClient,
    classId: string,
    students: ParsedImportStudent[],
    groupIdMap: Map<string, string>,
  ) {
    await tx.student.deleteMany({ where: { classId } });

    for (const [index, student] of students.entries()) {
      const createdStudent = await tx.student.create({
        data: {
          classId,
          name: student.name,
          gender: student.gender,
          studentNumber: student.studentNumber,
          groupId: student.groupName ? groupIdMap.get(student.groupName) : undefined,
          isCadre: student.isCadre,
          cadrePosition: student.cadrePosition,
          customPosition: student.customPosition,
          avatarBgColor: '#3B82F6',
          totalPoints: student.totalPoints,
          availablePoints: student.availablePoints,
          sortOrder: index,
        },
      });

      if (student.parentPhones.length > 0) {
        await tx.parentPhone.createMany({
          data: student.parentPhones.map((parent) => ({
            studentId: createdStudent.id,
            phone: parent.phone,
            relationship: parent.relationship,
          })),
        });
      }
    }
  }

  private async appendImportedStudents(
    tx: Prisma.TransactionClient,
    classId: string,
    students: ParsedImportStudent[],
    groupIdMap: Map<string, string>,
  ) {
    const existingStudentNames = new Set(
      (
        await tx.student.findMany({
          where: { classId },
          select: { name: true },
        })
      ).map((student) => student.name),
    );

    const existingMaxSort = await tx.student.aggregate({
      where: { classId },
      _max: { sortOrder: true },
    });
    let nextSortOrder = (existingMaxSort._max.sortOrder || 0) + 1;

    for (const student of students) {
      if (existingStudentNames.has(student.name)) {
        throw new BadRequestException(`学生 ${student.name} 已存在，无法追加导入`);
      }

      const createdStudent = await tx.student.create({
        data: {
          classId,
          name: student.name,
          gender: student.gender,
          studentNumber: student.studentNumber,
          groupId: student.groupName ? groupIdMap.get(student.groupName) : undefined,
          isCadre: student.isCadre,
          cadrePosition: student.cadrePosition,
          customPosition: student.customPosition,
          avatarBgColor: '#3B82F6',
          totalPoints: student.totalPoints,
          availablePoints: student.availablePoints,
          sortOrder: nextSortOrder,
        },
      });
      nextSortOrder += 1;
      existingStudentNames.add(student.name);

      if (student.parentPhones.length > 0) {
        await tx.parentPhone.createMany({
          data: student.parentPhones.map((parent) => ({
            studentId: createdStudent.id,
            phone: parent.phone,
            relationship: parent.relationship,
          })),
        });
      }
    }
  }

  private applyWorksheetStyle(worksheet: ExcelJS.Worksheet) {
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFEFF6FF' },
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
        right: { style: 'thin', color: { argb: 'FFD1D5DB' } },
      };
    });
    worksheet.views = [{ state: 'frozen', ySplit: 1 }];
  }

  private addSheet(
    workbook: ExcelJS.Workbook,
    name: string,
    columns: Array<{ header: string; key: string; width?: number }>,
    rows: any[],
  ) {
    const worksheet = workbook.addWorksheet(name);
    worksheet.columns = columns;
    rows.forEach((row) => worksheet.addRow(row));
    this.applyWorksheetStyle(worksheet);
    return worksheet;
  }

  private addTemplateStudentValidations(worksheet: ExcelJS.Worksheet) {
    for (let rowNumber = 2; rowNumber <= 200; rowNumber += 1) {
      worksheet.getCell(`C${rowNumber}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: ['"男,女"'],
      };
      worksheet.getCell(`G${rowNumber}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: ['"否,是"'],
      };
    }
  }

  private addTemplateHeaderNotes(
    worksheet: ExcelJS.Worksheet,
    notes: Record<string, string>,
  ) {
    worksheet.getRow(1).eachCell((cell) => {
      const header = this.normalizeImportText(cell.value);
      const note = notes[header];
      if (note) {
        cell.note = note;
      }
    });
  }

  private addTemplateImportValidations(worksheet: ExcelJS.Worksheet) {
    for (let rowNumber = 2; rowNumber <= 200; rowNumber += 1) {
      if (worksheet.name === '小组') {
        continue;
      }

      if (worksheet.name === '积分规则') {
        worksheet.getCell(`C${rowNumber}`).dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: ['"加分,减分"'],
        };
        worksheet.getCell(`D${rowNumber}`).dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: ['"作业,纪律,卫生,课堂表现,其他"'],
        };
        worksheet.getCell(`E${rowNumber}`).dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: ['"是,否,true,false"'],
        };
      }

      if (worksheet.name === '商品') {
        worksheet.getCell(`E${rowNumber}`).dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: ['"是,否,true,false"'],
        };
      }
    }
  }

  async generateImportTemplate(userId: string, classId: string) {
    const classItem = await this.verifyClassOwnership(userId, classId);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Claude Code';
    workbook.created = new Date();
    workbook.modified = new Date();

    const instructions = this.addSheet(
      workbook,
      '填写说明',
      [
        { header: '项目', key: 'item', width: 22 },
        { header: '说明', key: 'description', width: 80 },
      ],
      [
        {
          item: '填写哪些 sheet',
          description: '本模板用于初始化班级数据，请填写“小组”“学生”“积分规则”“商品”四个 sheet。',
        },
        {
          item: '导入模式',
          description: '追加导入会补充新数据；覆盖导入会重建当前班级的小组、学生、积分规则、商品。',
        },
        {
          item: '学生与小组关系',
          description: '学生 sheet 中填写的小组名称会自动创建/补齐；若“小组”sheet 同时存在该名称，会优先使用其中填写的组长信息。',
        },
        {
          item: '学生必填项',
          description: '学生 sheet 中只有“姓名”必填；积分不会填时填 0，没有家长手机号可留空。',
        },
        {
          item: '小组必填项',
          description: '小组 sheet 中只有“小组名称”必填；组长姓名可留空。',
        },
        {
          item: '规则必填项',
          description: '积分规则 sheet 需要填写规则名称、分值、类型；分值必须大于 0。',
        },
        {
          item: '商品必填项',
          description: '商品 sheet 需要填写商品名称、所需积分；库存留空表示不限库存。',
        },
        {
          item: '模板与导出区别',
          description: '导入模板用于初始化；系统导出文件用于备份/查看，不能直接拿来回导。',
        },
      ],
    );
    instructions.getRow(1).height = 24;

    const groupSheet = this.addSheet(
      workbook,
      '小组',
      [
        { header: '小组名称（必填）', key: 'name', width: 20 },
        { header: '组长姓名（可选）', key: 'leaderName', width: 18 },
      ],
      [
        { name: '第一组', leaderName: '张三' },
        { name: '第二组', leaderName: '' },
      ] satisfies ImportTemplateGroupRow[],
    );
    this.addTemplateHeaderNotes(groupSheet, {
      '小组名称（必填）': '必填。同一个导入文件内小组名称不能重复。',
      '组长姓名（可选）': '可留空。若填写，必须是本次导入学生中的姓名。',
    });

    const studentSheet = this.addSheet(
      workbook,
      '学生',
      [
        { header: '姓名（必填）', key: 'name', width: 16 },
        { header: '学号（可选）', key: 'studentNumber', width: 16 },
        { header: '性别（男/女，可留空）', key: 'gender', width: 18 },
        { header: '所属小组（可留空）', key: 'groupName', width: 18 },
        { header: '总积分（不会填请填0）', key: 'totalPoints', width: 18 },
        { header: '可用积分（可兑换积分）', key: 'availablePoints', width: 20 },
        { header: '是否班干部（是/否）', key: 'isCadre', width: 18 },
        { header: '班干部岗位（可留空）', key: 'cadrePosition', width: 20 },
        { header: '自定义岗位（可留空）', key: 'customPosition', width: 20 },
        { header: '家长手机号（可选，最多2个）', key: 'parentPhones', width: 42 },
      ],
      [
        {
          name: '张三',
          studentNumber: '2024001',
          gender: '男',
          groupName: '第一组',
          totalPoints: 0,
          availablePoints: 0,
          isCadre: '是',
          cadrePosition: '班长',
          customPosition: '',
          parentPhones: '妈妈：13800000000',
        },
        {
          name: '李四',
          studentNumber: '2024002',
          gender: '女',
          groupName: '第二组',
          totalPoints: 100,
          availablePoints: 80,
          isCadre: '否',
          cadrePosition: '',
          customPosition: '',
          parentPhones: '',
        },
      ] satisfies ImportTemplateStudentRow[],
    );
    this.addTemplateStudentValidations(studentSheet);
    this.addTemplateHeaderNotes(studentSheet, {
      '姓名（必填）': '必填。学生姓名不能重复。',
      '学号（可选）': '可留空。学校有统一学号时再填写。',
      '性别（男/女，可留空）': '直接填“男”或“女”。留空默认按男生导入。',
      '所属小组（可留空）': '填写时请与“小组”sheet中的小组名称保持一致。',
      '总积分（不会填请填0）': '历史累计总积分。不会填时请填 0。',
      '可用积分（可兑换积分）': '当前还能兑换奖励的积分，不能大于总积分。',
      '是否班干部（是/否）': '不是班干部就填“否”。',
      '班干部岗位（可留空）': '只有班干部时才填写，例如班长、学习委员。',
      '自定义岗位（可留空）': '系统默认岗位不够用时再填写。',
      '家长手机号（可选，最多2个）': '可留空。格式示例：妈妈：13800000000；爸爸：13900000000。',
    });

    const ruleSheet = this.addSheet(
      workbook,
      '积分规则',
      [
        { header: '规则名称（必填）', key: 'name', width: 20 },
        { header: '分值（必填）', key: 'points', width: 12 },
        { header: '类型（加分/减分）', key: 'type', width: 16 },
        { header: '分类（可选）', key: 'category', width: 18 },
        { header: '启用（是/否）', key: 'isEnabled', width: 12 },
      ],
      [
        { name: '按时交作业', points: 2, type: '加分', category: '作业', isEnabled: '是' },
        { name: '迟到', points: 1, type: '减分', category: '纪律', isEnabled: '是' },
      ] satisfies ImportTemplateRuleRow[],
    );
    this.addTemplateImportValidations(ruleSheet);
    this.addTemplateHeaderNotes(ruleSheet, {
      '规则名称（必填）': '必填。同一个导入文件内规则名称+类型不能重复。',
      '分值（必填）': '必填，必须大于 0。',
      '类型（加分/减分）': '可填写“加分/减分”，也兼容旧文件里的“扣分”和英文 ADD/DEDUCT。',
      '分类（可选）': '可留空，请使用中文分类，例如作业、纪律、卫生、课堂表现、其他。',
      '启用（是/否）': '不填默认按否处理，建议明确填写是或否。',
    });

    const shopSheet = this.addSheet(
      workbook,
      '商品',
      [
        { header: '商品名称（必填）', key: 'name', width: 20 },
        { header: '所需积分（必填）', key: 'price', width: 14 },
        { header: '库存（留空=不限）', key: 'stock', width: 16 },
        { header: '描述（可选）', key: 'description', width: 36 },
        { header: '上架（是/否）', key: 'isAvailable', width: 12 },
      ],
      [
        { name: '免作业卡', price: 50, stock: '', description: '兑换一次免作业机会', isAvailable: '是' },
        { name: '铅笔', price: 10, stock: 100, description: '课堂奖励用品', isAvailable: '是' },
      ] satisfies ImportTemplateShopRow[],
    );
    this.addTemplateImportValidations(shopSheet);
    this.addTemplateHeaderNotes(shopSheet, {
      '商品名称（必填）': '必填。同一个导入文件内商品名称不能重复。',
      '所需积分（必填）': '必填，必须大于 0。',
      '库存（留空=不限）': '留空表示不限库存。',
      '描述（可选）': '可留空。',
      '上架（是/否）': '建议明确填写是或否。',
    });

    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
    const fileName = `${this.sanitizeFileName(classItem.name)}-导入模板.xlsx`;

    return { fileName, buffer };
  }

  async exportImportableClassData(userId: string, classId: string) {
    const classItem = await this.verifyClassOwnership(userId, classId);

    const [groups, students, pointRules, shopItems] = await Promise.all([
      this.prisma.group.findMany({
        where: { classId },
        include: {
          students: {
            select: { id: true, name: true },
            orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
          },
        },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      }),
      this.prisma.student.findMany({
        where: { classId },
        include: {
          parents: true,
          group: true,
        },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      }),
      this.prisma.pointRule.findMany({
        where: { classId },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      }),
      this.prisma.shopItem.findMany({
        where: { classId },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      }),
    ]);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Claude Code';
    workbook.created = new Date();
    workbook.modified = new Date();

    const instructions = this.addSheet(
      workbook,
      '填写说明',
      [
        { header: '项目', key: 'item', width: 22 },
        { header: '说明', key: 'description', width: 80 },
      ],
      [
        {
          item: '文件用途',
          description: '这是基于当前班级导出的可再次导入模板数据，可直接补充后再导入。',
        },
        {
          item: '包含哪些 sheet',
          description: '本文件只包含“小组”“学生”“积分规则”“商品”四类初始化数据，以及填写说明。',
        },
        {
          item: '导入模式',
          description: '追加导入会补充新数据并自动跳过系统已有的同名学生、规则、商品；覆盖导入会重建这四类初始化数据。',
        },
        {
          item: '学生与小组关系',
          description: '学生 sheet 中填写的小组名称会自动创建/补齐；若“小组”sheet 同时存在该名称，会优先使用其中填写的组长信息。',
        },
        {
          item: '不要与完整备份混用',
          description: '完整班级数据导出包含班级信息、积分记录、商品兑换、宠物等额外 sheet，仅用于查看或备份，不能直接回导初始化导入。',
        },
      ],
    );
    instructions.getRow(1).height = 24;

    const groupSheet = this.addSheet(
      workbook,
      '小组',
      [
        { header: '小组名称（必填）', key: 'name', width: 20 },
        { header: '组长姓名（可选）', key: 'leaderName', width: 18 },
      ],
      groups.map((group) => {
        const leader = group.students.find((student) => student.id === group.leaderId);
        return {
          name: group.name,
          leaderName: leader?.name || '',
        };
      }) satisfies ImportTemplateGroupRow[],
    );
    this.addTemplateHeaderNotes(groupSheet, {
      '小组名称（必填）': '必填。同一个导入文件内小组名称不能重复。',
      '组长姓名（可选）': '可留空。若填写，必须是本次导入学生中的姓名。',
    });

    const studentSheet = this.addSheet(
      workbook,
      '学生',
      [
        { header: '姓名（必填）', key: 'name', width: 16 },
        { header: '学号（可选）', key: 'studentNumber', width: 16 },
        { header: '性别（男/女，可留空）', key: 'gender', width: 18 },
        { header: '所属小组（可留空）', key: 'groupName', width: 18 },
        { header: '总积分（不会填请填0）', key: 'totalPoints', width: 18 },
        { header: '可用积分（可兑换积分）', key: 'availablePoints', width: 20 },
        { header: '是否班干部（是/否）', key: 'isCadre', width: 18 },
        { header: '班干部岗位（可留空）', key: 'cadrePosition', width: 20 },
        { header: '自定义岗位（可留空）', key: 'customPosition', width: 20 },
        { header: '家长手机号（可选，最多2个）', key: 'parentPhones', width: 42 },
      ],
      students.map((student) => ({
        name: student.name,
        studentNumber: student.studentNumber || '',
        gender: this.formatGender(student.gender) === '—' ? '' : this.formatGender(student.gender),
        groupName: student.group?.name || '',
        totalPoints: student.totalPoints,
        availablePoints: student.availablePoints,
        isCadre: student.isCadre ? '是' : '否',
        cadrePosition: student.cadrePosition || '',
        customPosition: student.customPosition || '',
        parentPhones: student.parents.length
          ? student.parents
              .map((parent) => `${parent.relationship}：${parent.phone}`)
              .join('；')
          : '',
      })) satisfies ImportTemplateStudentRow[],
    );
    this.addTemplateStudentValidations(studentSheet);
    this.addTemplateHeaderNotes(studentSheet, {
      '姓名（必填）': '必填。学生姓名不能重复。',
      '学号（可选）': '可留空。学校有统一学号时再填写。',
      '性别（男/女，可留空）': '直接填“男”或“女”。留空默认按男生导入。',
      '所属小组（可留空）': '填写时请与“小组”sheet中的小组名称保持一致。',
      '总积分（不会填请填0）': '历史累计总积分。不会填时请填 0。',
      '可用积分（可兑换积分）': '当前还能兑换奖励的积分，不能大于总积分。',
      '是否班干部（是/否）': '不是班干部就填“否”。',
      '班干部岗位（可留空）': '只有班干部时才填写，例如班长、学习委员。',
      '自定义岗位（可留空）': '系统默认岗位不够用时再填写。',
      '家长手机号（可选，最多2个）': '可留空。格式示例：妈妈：13800000000；爸爸：13900000000。',
    });

    const ruleSheet = this.addSheet(
      workbook,
      '积分规则',
      [
        { header: '规则名称（必填）', key: 'name', width: 20 },
        { header: '分值（必填）', key: 'points', width: 12 },
        { header: '类型（加分/减分）', key: 'type', width: 16 },
        { header: '分类（可选）', key: 'category', width: 18 },
        { header: '启用（是/否）', key: 'isEnabled', width: 12 },
      ],
      pointRules.map((rule) => ({
        name: rule.name,
        points: rule.points,
        type: this.formatPointType(rule.type),
        category: rule.category || '',
        isEnabled: rule.isEnabled ? '是' : '否',
      })) satisfies ImportTemplateRuleRow[],
    );
    this.addTemplateImportValidations(ruleSheet);
    this.addTemplateHeaderNotes(ruleSheet, {
      '规则名称（必填）': '必填。同一个导入文件内规则名称+类型不能重复。',
      '分值（必填）': '必填，必须大于 0。',
      '类型（加分/减分）': '可填写“加分/减分”，也兼容旧文件里的“扣分”和英文 ADD/DEDUCT。',
      '分类（可选）': '可留空，请使用中文分类，例如作业、纪律、卫生、课堂表现、其他。',
      '启用（是/否）': '不填默认按否处理，建议明确填写是或否。',
    });

    const shopSheet = this.addSheet(
      workbook,
      '商品',
      [
        { header: '商品名称（必填）', key: 'name', width: 20 },
        { header: '所需积分（必填）', key: 'price', width: 14 },
        { header: '库存（留空=不限）', key: 'stock', width: 16 },
        { header: '描述（可选）', key: 'description', width: 36 },
        { header: '上架（是/否）', key: 'isAvailable', width: 12 },
      ],
      shopItems.map((item) => ({
        name: item.name,
        price: item.price,
        stock: item.stock ?? '',
        description: item.description || '',
        isAvailable: item.isAvailable ? '是' : '否',
      })) satisfies ImportTemplateShopRow[],
    );
    this.addTemplateImportValidations(shopSheet);
    this.addTemplateHeaderNotes(shopSheet, {
      '商品名称（必填）': '必填。同一个导入文件内商品名称不能重复。',
      '所需积分（必填）': '必填，必须大于 0。',
      '库存（留空=不限）': '留空表示不限库存。',
      '描述（可选）': '可留空。',
      '上架（是/否）': '建议明确填写是或否。',
    });

    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
    const timestamp = new Date()
      .toISOString()
      .slice(0, 16)
      .replace('T', '-')
      .replace(':', '');
    const fileName = `${this.sanitizeFileName(classItem.name)}-可导入数据导出-${timestamp}.xlsx`;

    return { fileName, buffer };
  }

  async listSnapshots(userId: string, classId: string) {
    await this.verifyClassOwnership(userId, classId);

    const snapshots = await this.prisma.operationSnapshot.findMany({
      where: { classId },
      orderBy: { createdAt: 'desc' },
    });

    return {
      snapshots: snapshots.map((snapshot) => this.mapSnapshot(snapshot)),
      total: snapshots.length,
    };
  }

  async exportClassData(userId: string, classId: string) {
    const classItem = await this.verifyClassOwnership(userId, classId);

    const [students, pointRecords, exchanges, pointRules, groups] =
      await Promise.all([
        this.prisma.student.findMany({
          where: { classId },
          include: {
            parents: true,
            group: true,
            pet: {
              include: {
                pet: true,
              },
            },
          },
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        }),
        this.prisma.pointRecord.findMany({
          where: { classId },
          include: {
            student: { select: { id: true, name: true, studentNumber: true } },
            rule: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.exchange.findMany({
          where: {
            student: { classId },
          },
          select: {
            id: true,
            quantity: true,
            totalPrice: true,
            status: true,
            canUndo: true,
            exchangedAt: true,
            student: { select: { id: true, name: true, studentNumber: true } },
            item: { select: { id: true, name: true, category: true } },
          },
          orderBy: { exchangedAt: 'desc' },
        }),
        this.prisma.pointRule.findMany({
          where: { classId },
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        }),
        this.prisma.group.findMany({
          where: { classId },
          include: {
            students: {
              select: { id: true, name: true },
              orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
            },
          },
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        }),
      ]);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Claude Code';
    workbook.created = new Date();
    workbook.modified = new Date();

    this.addSheet(
      workbook,
      '班级信息',
      [
        { header: '班级名称', key: 'className', width: 24 },
        { header: '班主任', key: 'teacherName', width: 18 },
        { header: '学生人数', key: 'studentCount', width: 12 },
        { header: '小组数', key: 'groupCount', width: 12 },
        { header: '积分规则数', key: 'ruleCount', width: 12 },
        { header: '创建时间', key: 'createdAt', width: 22 },
        { header: '更新时间', key: 'updatedAt', width: 22 },
      ],
      [
        {
          className: classItem.name,
          teacherName: classItem.teacherName || '—',
          studentCount: students.length,
          groupCount: groups.length,
          ruleCount: pointRules.length,
          createdAt: this.formatDateTime(classItem.createdAt),
          updatedAt: this.formatDateTime(classItem.updatedAt),
        },
      ],
    );

    this.addSheet(
      workbook,
      '学生',
      [
        { header: '姓名', key: 'name', width: 16 },
        { header: '学号', key: 'studentNumber', width: 16 },
        { header: '性别', key: 'gender', width: 10 },
        { header: '所属小组', key: 'groupName', width: 16 },
        { header: '是否班干部', key: 'isCadre', width: 12 },
        { header: '班干部岗位', key: 'cadrePosition', width: 18 },
        { header: '总积分', key: 'totalPoints', width: 12 },
        { header: '可用积分', key: 'availablePoints', width: 12 },
        { header: '家长手机号', key: 'parentPhones', width: 36 },
        { header: '宠物', key: 'petName', width: 18 },
        { header: '宠物阶段', key: 'petStage', width: 14 },
      ],
      students.map((student) => ({
        name: student.name,
        studentNumber: student.studentNumber || '—',
        gender: this.formatGender(student.gender),
        groupName: student.group?.name || '—',
        isCadre: this.formatBoolean(student.isCadre),
        cadrePosition: student.customPosition || student.cadrePosition || '—',
        totalPoints: student.totalPoints,
        availablePoints: student.availablePoints,
        parentPhones: student.parents.length
          ? student.parents
              .map((parent) => `${parent.relationship}：${parent.phone}`)
              .join('；')
          : '—',
        petName: student.pet?.pet?.name || '—',
        petStage: student.pet?.stage || '—',
      })),
    );

    this.addSheet(
      workbook,
      '积分记录',
      [
        { header: '时间', key: 'createdAt', width: 22 },
        { header: '学生姓名', key: 'studentName', width: 16 },
        { header: '学号', key: 'studentNumber', width: 16 },
        { header: '类型', key: 'type', width: 10 },
        { header: '分值', key: 'value', width: 10 },
        { header: '原因', key: 'reason', width: 28 },
        { header: '规则名', key: 'ruleName', width: 18 },
        { header: '操作人', key: 'operatorName', width: 16 },
        { header: '已撤销', key: 'isRevoked', width: 10 },
      ],
      pointRecords.map((record) => ({
        createdAt: this.formatDateTime(record.createdAt),
        studentName: record.student.name,
        studentNumber: record.student.studentNumber || '—',
        type: record.points >= 0 ? '加分' : '减分',
        value: Math.abs(record.points),
        reason: record.reason,
        ruleName: record.rule?.name || '—',
        operatorName: record.operatorName,
        isRevoked: this.formatBoolean(record.isRevoked),
      })),
    );

    this.addSheet(
      workbook,
      '商品兑换',
      [
        { header: '学生姓名', key: 'studentName', width: 16 },
        { header: '学号', key: 'studentNumber', width: 16 },
        { header: '商品名称', key: 'itemName', width: 20 },
        { header: '商品分类', key: 'itemCategory', width: 14 },
        { header: '数量', key: 'quantity', width: 10 },
        { header: '消耗积分', key: 'totalPrice', width: 12 },
        { header: '状态', key: 'status', width: 12 },
        { header: '兑换时间', key: 'exchangedAt', width: 22 },
        { header: '可撤回', key: 'canUndo', width: 12 },
      ],
      exchanges.map((exchange) => ({
        studentName: exchange.student.name,
        studentNumber: exchange.student.studentNumber || '—',
        itemName: exchange.item.name,
        itemCategory: exchange.item.category,
        quantity: exchange.quantity,
        totalPrice: exchange.totalPrice,
        status: this.formatExchangeStatus(exchange.status),
        exchangedAt: this.formatDateTime(exchange.exchangedAt),
        canUndo: this.formatBoolean(exchange.canUndo),
      })),
    );

    this.addSheet(
      workbook,
      '宠物',
      [
        { header: '学生姓名', key: 'studentName', width: 16 },
        { header: '学号', key: 'studentNumber', width: 16 },
        { header: '宠物名称', key: 'petName', width: 18 },
        { header: '类型', key: 'petType', width: 14 },
        { header: '稀有度', key: 'rarity', width: 12 },
        { header: '阶段', key: 'stage', width: 12 },
        { header: '等级', key: 'level', width: 10 },
        { header: '成长值', key: 'experience', width: 12 },
      ],
      students
        .filter((student) => !!student.pet?.pet)
        .map((student) => ({
          studentName: student.name,
          studentNumber: student.studentNumber || '—',
          petName: student.pet?.pet?.name || '—',
          petType: student.pet?.pet?.type || '—',
          rarity: student.pet?.pet?.rarity || '—',
          stage: student.pet?.stage || '—',
          level: student.pet?.level || '—',
          experience: student.pet?.experience || 0,
        })),
    );

    this.addSheet(
      workbook,
      '积分规则',
      [
        { header: '规则名称', key: 'name', width: 18 },
        { header: '类型', key: 'type', width: 10 },
        { header: '分值', key: 'points', width: 10 },
        { header: '分类', key: 'category', width: 16 },
        { header: '图标', key: 'icon', width: 14 },
        { header: '启用', key: 'isEnabled', width: 10 },
        { header: '排序', key: 'sortOrder', width: 10 },
      ],
      pointRules.map((rule) => ({
        name: rule.name,
        type: this.formatPointType(rule.type),
        points: rule.points,
        category: rule.category || '—',
        icon: rule.icon || '—',
        isEnabled: this.formatBoolean(rule.isEnabled),
        sortOrder: rule.sortOrder,
      })),
    );

    this.addSheet(
      workbook,
      '小组',
      [
        { header: '小组名称', key: 'name', width: 18 },
        { header: '颜色', key: 'color', width: 12 },
        { header: '组长', key: 'leaderName', width: 16 },
        { header: '成员数', key: 'memberCount', width: 10 },
        { header: '成员名单', key: 'memberNames', width: 40 },
      ],
      groups.map((group) => {
        const leader = group.students.find(
          (student) => student.id === group.leaderId,
        );
        return {
          name: group.name,
          color: group.color,
          leaderName: leader?.name || '—',
          memberCount: group.students.length,
          memberNames: group.students.length
            ? group.students.map((student) => student.name).join('、')
            : '—',
        };
      }),
    );

    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
    const timestamp = new Date()
      .toISOString()
      .slice(0, 16)
      .replace('T', '-')
      .replace(':', '');
    const fileName = `${this.sanitizeFileName(classItem.name)}-数据导出-${timestamp}.xlsx`;

    return { fileName, buffer };
  }

  async previewImportClassData(
    userId: string,
    classId: string,
    file: Express.Multer.File,
    mode?: string,
  ) {
    const classItem = await this.verifyClassOwnership(userId, classId);
    const importMode = this.normalizeImportMode(mode);
    const { groups, students, rules, shopItems } = await this.parseImportWorkbook(file);

    this.ensureUniqueNames('“小组”sheet', groups.map((group) => group.name), '小组名称');
    this.ensureUniqueNames('“学生”sheet', students.map((student) => student.name), '学生姓名');
    this.ensureUniqueNames(
      '“积分规则”sheet',
      rules.map((rule) => `${rule.name}::${rule.type}`),
      '规则名称/类型组合',
    );
    this.ensureUniqueNames('“商品”sheet', shopItems.map((item) => item.name), '商品名称');

    const groupPlan = await this.buildGroupImportPlan(classId, groups, students);
    const { conflicts } = await this.loadAppendImportConflicts(
      classId,
      importMode,
      students,
      rules,
      shopItems,
    );
    const appendPlan = this.buildAppendImportPlan(students, rules, shopItems, conflicts);

    return {
      classId,
      className: classItem.name,
      mode: importMode,
      importableSheetNames: ['小组', '学生', '积分规则', '商品'],
      canSubmit: true,
      conflicts: { students: [], rules: [], shopItems: [] },
      blockingReasons: [],
      appendPlan: {
        skippedStudents: appendPlan.skippedStudents,
        skippedRules: appendPlan.skippedRules,
        skippedShopItems: appendPlan.skippedShopItems,
        studentsToCreate: appendPlan.studentsToCreate.map((student) => student.name),
        rulesToCreate: appendPlan.rulesToCreate.map((rule) => `${rule.name}（${rule.type === 'ADD' ? '加分' : '减分'}）`),
        shopItemsToCreate: appendPlan.shopItemsToCreate.map((item) => item.name),
      },
      summary: {
        groups: groups.length,
        students: students.length,
        rules: rules.length,
        shopItems: shopItems.length,
        parentPhoneCount: students.reduce((sum, student) => sum + student.parentPhones.length, 0),
      },
      toCreateGroups: groupPlan.toCreateGroups.map((group) => group.name),
      students: students.map((student) => ({
        rowNumber: student.rowNumber,
        name: student.name,
        gender: student.gender,
        studentNumber: student.studentNumber,
        groupName: student.groupName,
        isCadre: student.isCadre,
        cadrePosition: student.cadrePosition,
        customPosition: student.customPosition,
        totalPoints: student.totalPoints,
        availablePoints: student.availablePoints,
        parentPhones: student.parentPhones,
      })),
      samples: {
        groups: groups.slice(0, 6),
        rules: rules.slice(0, 6),
        shopItems: shopItems.slice(0, 6),
      },
    };
  }

  async importClassData(
    userId: string,
    classId: string,
    file: Express.Multer.File,
    mode?: string,
  ) {
    const classItem = await this.verifyClassOwnership(userId, classId);
    const importMode = this.normalizeImportMode(mode);
    const { groups, students, rules, shopItems } = await this.parseImportWorkbook(file);

    this.ensureUniqueNames('“小组”sheet', groups.map((group) => group.name), '小组名称');
    this.ensureUniqueNames('“学生”sheet', students.map((student) => student.name), '学生姓名');
    this.ensureUniqueNames(
      '“积分规则”sheet',
      rules.map((rule) => `${rule.name}::${rule.type}`),
      '规则名称/类型组合',
    );
    this.ensureUniqueNames('“商品”sheet', shopItems.map((item) => item.name), '商品名称');

    const groupPlan = await this.buildGroupImportPlan(classId, groups, students);
    const { conflicts } = await this.loadAppendImportConflicts(
      classId,
      importMode,
      students,
      rules,
      shopItems,
    );
    const appendPlan = this.buildAppendImportPlan(students, rules, shopItems, conflicts);

    const importSummary = await this.prisma.$transaction(async (tx) => {
      if (importMode === 'replace') {
        await tx.exchange.deleteMany({ where: { student: { classId } } });
        await tx.pointRecord.deleteMany({ where: { classId } });
        await tx.parentPhone.deleteMany({ where: { student: { classId } } });
        await tx.student.deleteMany({ where: { classId } });
        await tx.shopItem.deleteMany({ where: { classId } });
        await tx.pointRule.deleteMany({ where: { classId } });
        await tx.group.deleteMany({ where: { classId } });
      }

      const groupIdMap = new Map<string, string>();
      const currentMaxGroupSort = await tx.group.aggregate({
        where: { classId },
        _max: { sortOrder: true },
      });
      let nextGroupSortOrder = (currentMaxGroupSort._max.sortOrder || 0) + 1;

      if (importMode === 'append') {
        for (const group of groupPlan.existingGroups) {
          groupIdMap.set(group.name, group.id);
        }
      }

      for (const group of groupPlan.importGroups) {
        if (groupIdMap.has(group.name)) {
          continue;
        }

        const createdGroup = await tx.group.create({
          data: {
            classId,
            name: group.name,
            color: '#3B82F6',
            sortOrder: nextGroupSortOrder,
          },
        });
        nextGroupSortOrder += 1;
        groupIdMap.set(group.name, createdGroup.id);
      }

      const rulesToImport = importMode === 'append' ? appendPlan.rulesToCreate : rules;
      const shopItemsToImport = importMode === 'append' ? appendPlan.shopItemsToCreate : shopItems;
      const studentsToImport = importMode === 'append' ? appendPlan.studentsToCreate : students;

      const currentMaxRuleSort = await tx.pointRule.aggregate({
        where: { classId },
        _max: { sortOrder: true },
      });
      let nextRuleSortOrder = (currentMaxRuleSort._max.sortOrder || 0) + 1;
      for (const rule of rulesToImport) {
        await tx.pointRule.create({
          data: {
            classId,
            name: rule.name,
            points: rule.points,
            type: rule.type,
            category: rule.category,
            icon: undefined,
            isEnabled: rule.isEnabled,
            sortOrder: nextRuleSortOrder,
          },
        });
        nextRuleSortOrder += 1;
      }

      const currentMaxItemSort = await tx.shopItem.aggregate({
        where: { classId },
        _max: { sortOrder: true },
      });
      let nextItemSortOrder = (currentMaxItemSort._max.sortOrder || 0) + 1;
      for (const item of shopItemsToImport) {
        await tx.shopItem.create({
          data: {
            classId,
            name: item.name,
            description: item.description,
            price: item.price,
            stock: item.stock,
            category: 'PHYSICAL',
            isAvailable: item.isAvailable,
            sortOrder: nextItemSortOrder,
          },
        });
        nextItemSortOrder += 1;
      }

      if (importMode === 'replace') {
        await this.replaceImportedStudents(tx, classId, studentsToImport, groupIdMap);
      } else {
        await this.appendImportedStudents(tx, classId, studentsToImport, groupIdMap);
      }

      for (const group of groups) {
        if (!group.leaderName) continue;
        const leader = await tx.student.findFirst({
          where: { classId, name: group.leaderName },
          select: { id: true },
        });
        if (leader) {
          await tx.group.update({
            where: { id: groupIdMap.get(group.name)! },
            data: { leaderId: leader.id },
          });
        }
      }

      return {
        importedGroups: importMode === 'append' ? groupPlan.toCreateGroups.length : groups.length,
        importedStudents: studentsToImport.length,
        importedRules: rulesToImport.length,
        importedShopItems: shopItemsToImport.length,
        skippedStudents: appendPlan.skippedStudents,
        skippedRules: appendPlan.skippedRules,
        skippedShopItems: appendPlan.skippedShopItems,
      };
    });

    return {
      mode: importMode,
      classId,
      className: classItem.name,
      ...importSummary,
      createdGroups: groupPlan.toCreateGroups.map((group) => group.name),
      message:
        importMode === 'replace'
          ? `已覆盖导入 ${students.length} 名学生、${groups.length} 个小组、${rules.length} 条积分规则、${shopItems.length} 个商品`
          : `已按追加模式处理：新增 ${importSummary.importedStudents} 名学生、${importSummary.importedGroups} 个小组、${importSummary.importedRules} 条积分规则、${importSummary.importedShopItems} 个商品；跳过 ${appendPlan.skippedStudents.length} 名已有学生、${appendPlan.skippedRules.length} 条已有规则、${appendPlan.skippedShopItems.length} 个已有商品`,
    };
  }

  async clearClassPoints(
    userId: string,
    classId: string,
    operatorName: string,
  ) {
    const classItem = await this.verifyClassOwnership(userId, classId);

    const students = await this.prisma.student.findMany({
      where: {
        classId,
        OR: [{ totalPoints: { not: 0 } }, { availablePoints: { not: 0 } }],
      },
      select: {
        id: true,
        name: true,
        totalPoints: true,
        availablePoints: true,
      },
      orderBy: { sortOrder: 'asc' },
    });

    if (students.length === 0) {
      throw new BadRequestException('当前班级没有可清空的积分');
    }

    const payload: ClearClassPointsSnapshotPayload = {
      classId,
      className: classItem.name,
      operatorName,
      students,
    };

    const snapshot = await this.prisma.$transaction(async (tx) => {
      const totalPoints = students.reduce(
        (sum, student) => sum + student.totalPoints,
        0,
      );
      const totalAvailablePoints = students.reduce(
        (sum, student) => sum + student.availablePoints,
        0,
      );
      const createdSnapshot = await tx.operationSnapshot.create({
        data: {
          classId,
          userId,
          type: OperationSnapshotType.CLEAR_CLASS_POINTS,
          targetId: classId,
          targetName: classItem.name,
          summary: `清空 ${students.length} 名学生积分，归零历史总分 ${totalPoints}，可用积分 ${totalAvailablePoints}`,
          payload: payload as Prisma.InputJsonValue,
        },
      });

      for (const student of students) {
        await tx.student.update({
          where: { id: student.id },
          data: {
            totalPoints: 0,
            availablePoints: 0,
          },
        });

        const recordChanges = this.buildClearClassPointRecordChanges(student);
        for (const change of recordChanges) {
          await tx.pointRecord.create({
            data: {
              classId,
              studentId: student.id,
              points: change.points,
              reason: change.reason,
              operatorId: userId,
              operatorName,
              canUndo: false,
            },
          });
        }
      }

      return createdSnapshot;
    });

    return {
      snapshot: this.mapSnapshot(snapshot),
      affectedStudents: students.length,
      restoredType: snapshot.type,
      message: '班级积分已清空',
    };
  }

  async deleteStudentWithSnapshot(
    userId: string,
    studentId: string,
    operatorName: string,
  ) {
    const student = await this.verifyStudentOwnership(userId, studentId);

    const fullStudent = await this.prisma.student.findUnique({
      where: { id: studentId },
      include: {
        parents: true,
        pointRecords: true,
        exchanges: true,
        shareLinks: true,
        pet: {
          include: {
            growthRecords: true,
            pointRecords: true,
          },
        },
      },
    });

    if (!fullStudent) {
      throw new NotFoundException('学生不存在');
    }

    const payload: StudentDeletionSnapshotPayload = {
      student: {
        id: fullStudent.id,
        classId: fullStudent.classId,
        name: fullStudent.name,
        gender: fullStudent.gender,
        studentNumber: fullStudent.studentNumber,
        avatar: fullStudent.avatar,
        avatarBgColor: fullStudent.avatarBgColor,
        isCadre: fullStudent.isCadre,
        cadrePosition: fullStudent.cadrePosition,
        customPosition: fullStudent.customPosition,
        groupId: fullStudent.groupId,
        totalPoints: fullStudent.totalPoints,
        availablePoints: fullStudent.availablePoints,
        sortOrder: fullStudent.sortOrder,
        createdAt: fullStudent.createdAt.toISOString(),
        updatedAt: fullStudent.updatedAt.toISOString(),
      },
      parents: fullStudent.parents.map((item) => ({
        ...item,
        createdAt: item.createdAt.toISOString(),
      })),
      pointRecords: fullStudent.pointRecords.map((item) => ({
        ...item,
        undoExpiresAt: item.undoExpiresAt?.toISOString() ?? null,
        revokedAt: item.revokedAt?.toISOString() ?? null,
        createdAt: item.createdAt.toISOString(),
      })),
      exchanges: fullStudent.exchanges.map((item) => ({
        ...item,
        undoExpiresAt: item.undoExpiresAt?.toISOString() ?? null,
        revokedAt: item.revokedAt?.toISOString() ?? null,
        exchangedAt: item.exchangedAt.toISOString(),
      })),
      shareLinks: fullStudent.shareLinks.map((item) => ({
        ...item,
        expiresAt: item.expiresAt.toISOString(),
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
      })),
      pet: fullStudent.pet
        ? {
            id: fullStudent.pet.id,
            studentId: fullStudent.pet.studentId,
            petId: fullStudent.pet.petId,
            stage: fullStudent.pet.stage,
            experience: fullStudent.pet.experience,
            level: fullStudent.pet.level,
            createdAt: fullStudent.pet.createdAt.toISOString(),
            updatedAt: fullStudent.pet.updatedAt.toISOString(),
          }
        : null,
      petGrowthRecords:
        fullStudent.pet?.growthRecords.map((item) => ({
          ...item,
          createdAt: item.createdAt.toISOString(),
        })) ?? [],
      petPointRecords:
        fullStudent.pet?.pointRecords.map((item) => ({
          ...item,
          createdAt: item.createdAt.toISOString(),
        })) ?? [],
    };

    const snapshot = await this.prisma.$transaction(async (tx) => {
      const createdSnapshot = await tx.operationSnapshot.create({
        data: {
          classId: fullStudent.classId,
          userId,
          type: OperationSnapshotType.DELETE_STUDENT,
          targetId: fullStudent.id,
          targetName: fullStudent.name,
          summary: `删除学生 ${fullStudent.name}，包含 ${fullStudent.pointRecords.length} 条积分流水、${fullStudent.exchanges.length} 条兑换记录、${fullStudent.parents.length} 个家长手机号`,
          payload: payload as Prisma.InputJsonValue,
        },
      });

      await tx.student.delete({ where: { id: fullStudent.id } });

      return createdSnapshot;
    });

    return {
      snapshot: this.mapSnapshot(snapshot),
      restoredType: snapshot.type,
      studentId: fullStudent.id,
      studentName: fullStudent.name,
      message: `学生 ${fullStudent.name} 已删除，可在恢复记录中还原`,
    };
  }

  async restoreSnapshot(
    userId: string,
    snapshotId: string,
    operatorName: string,
  ) {
    const snapshot = await this.prisma.operationSnapshot.findUnique({
      where: { id: snapshotId },
      include: {
        class: true,
      },
    });

    if (!snapshot) {
      throw new NotFoundException('恢复记录不存在');
    }
    if (snapshot.class.userId !== userId) {
      throw new ForbiddenException('无权恢复此记录');
    }
    if (snapshot.status !== OperationSnapshotStatus.ACTIVE) {
      throw new BadRequestException('该记录已恢复，不能重复恢复');
    }

    if (snapshot.type === OperationSnapshotType.CLEAR_CLASS_POINTS) {
      return this.restoreClassPoints(snapshot, operatorName);
    }

    if (snapshot.type === OperationSnapshotType.DELETE_STUDENT) {
      return this.restoreDeletedStudent(snapshot, operatorName);
    }

    throw new BadRequestException('不支持的恢复类型');
  }

  private async restoreClassPoints(snapshot: any, operatorName: string) {
    const payload =
      snapshot.payload as unknown as ClearClassPointsSnapshotPayload;
    const studentIds = payload.students.map((student) => student.id);
    const existingStudents = await this.prisma.student.findMany({
      where: { id: { in: studentIds }, classId: snapshot.classId },
      select: { id: true },
    });

    if (existingStudents.length !== studentIds.length) {
      throw new BadRequestException('部分学生已不存在，无法恢复本次清空积分');
    }

    await this.prisma.$transaction(async (tx) => {
      for (const student of payload.students) {
        await tx.student.update({
          where: { id: student.id },
          data: {
            totalPoints: student.totalPoints,
            availablePoints: student.availablePoints,
          },
        });

        const recordChanges = this.buildClearClassPointRecordChanges(student);
        for (const change of [...recordChanges].reverse()) {
          await tx.pointRecord.create({
            data: {
              classId: snapshot.classId,
              studentId: student.id,
              points: -change.points,
              reason: change.reason.replace('清空班级积分', '恢复清空班级积分'),
              operatorId: snapshot.userId,
              operatorName,
              canUndo: false,
            },
          });
        }
      }

      await tx.operationSnapshot.update({
        where: { id: snapshot.id },
        data: {
          status: OperationSnapshotStatus.RESTORED,
          restoredAt: new Date(),
          restoredBy: snapshot.userId,
        },
      });
    });

    return {
      snapshotId: snapshot.id,
      restoredType: snapshot.type,
      message: '班级积分已恢复',
    };
  }

  private async restoreDeletedStudent(snapshot: any, operatorName: string) {
    const payload =
      snapshot.payload as unknown as StudentDeletionSnapshotPayload;

    const existingStudent = await this.prisma.student.findUnique({
      where: { id: payload.student.id },
      select: { id: true },
    });
    if (existingStudent) {
      throw new BadRequestException('该学生已存在，无法重复恢复');
    }

    if (payload.pet) {
      const relatedPet = await this.prisma.petGallery.findUnique({
        where: { id: payload.pet.petId },
        select: { id: true },
      });
      if (!relatedPet) {
        throw new BadRequestException('关联宠物图鉴已不存在，无法恢复该学生');
      }
    }

    const exchangeItemIds = [
      ...new Set(payload.exchanges.map((item) => item.itemId)),
    ];
    if (exchangeItemIds.length > 0) {
      const items = await this.prisma.shopItem.findMany({
        where: { id: { in: exchangeItemIds } },
        select: { id: true },
      });
      if (items.length !== exchangeItemIds.length) {
        throw new BadRequestException('关联商品已不存在，无法恢复该学生');
      }
    }

    const ruleIds = [
      ...new Set(
        payload.pointRecords.map((item) => item.ruleId).filter(Boolean),
      ),
    ] as string[];
    const petRuleIds = [
      ...new Set(
        payload.petPointRecords.map((item) => item.ruleId).filter(Boolean),
      ),
    ] as string[];
    const allRuleIds = [...new Set([...ruleIds, ...petRuleIds])];
    if (allRuleIds.length > 0) {
      const rules = await this.prisma.pointRule.findMany({
        where: { id: { in: allRuleIds } },
        select: { id: true },
      });
      if (rules.length !== allRuleIds.length) {
        throw new BadRequestException('关联积分规则已不存在，无法恢复该学生');
      }
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.student.create({
        data: {
          id: payload.student.id,
          classId: payload.student.classId,
          name: payload.student.name,
          gender: payload.student.gender,
          studentNumber: payload.student.studentNumber,
          avatar: payload.student.avatar,
          avatarBgColor: payload.student.avatarBgColor,
          isCadre: payload.student.isCadre,
          cadrePosition: payload.student.cadrePosition,
          customPosition: payload.student.customPosition,
          groupId: payload.student.groupId,
          totalPoints: payload.student.totalPoints,
          availablePoints: payload.student.availablePoints,
          sortOrder: payload.student.sortOrder,
          createdAt: new Date(payload.student.createdAt),
          updatedAt: new Date(payload.student.updatedAt),
        },
      });

      if (payload.parents.length > 0) {
        await tx.parentPhone.createMany({
          data: payload.parents.map((item) => ({
            id: item.id,
            studentId: item.studentId,
            phone: item.phone,
            relationship: item.relationship,
            createdAt: new Date(item.createdAt),
          })),
        });
      }

      if (payload.shareLinks.length > 0) {
        await tx.shareLink.createMany({
          data: payload.shareLinks.map((item) => ({
            id: item.id,
            studentId: item.studentId,
            token: item.token,
            expiresAt: new Date(item.expiresAt),
            allowViewRanking: item.allowViewRanking,
            hidePointRecords: item.hidePointRecords,
            hideDeductions: item.hideDeductions,
            isActive: item.isActive,
            createdAt: new Date(item.createdAt),
            updatedAt: new Date(item.updatedAt),
          })),
        });
      }

      if (payload.pointRecords.length > 0) {
        await tx.pointRecord.createMany({
          data: payload.pointRecords.map((item) => ({
            id: item.id,
            classId: item.classId,
            studentId: item.studentId,
            points: item.points,
            reason: item.reason,
            ruleId: item.ruleId,
            operatorId: item.operatorId,
            operatorName: item.operatorName,
            canUndo: item.canUndo,
            undoExpiresAt: item.undoExpiresAt
              ? new Date(item.undoExpiresAt)
              : null,
            isRevoked: item.isRevoked,
            revokedAt: item.revokedAt ? new Date(item.revokedAt) : null,
            revokedBy: item.revokedBy,
            createdAt: new Date(item.createdAt),
          })),
        });
      }

      if (payload.exchanges.length > 0) {
        await tx.exchange.createMany({
          data: payload.exchanges.map((item) => ({
            id: item.id,
            studentId: item.studentId,
            itemId: item.itemId,
            quantity: item.quantity,
            totalPrice: item.totalPrice,
            status: item.status,
            operatorId: item.operatorId,
            operatorName: item.operatorName,
            exchangedAt: new Date(item.exchangedAt),
            deliveredAt: item.deliveredAt ? new Date(item.deliveredAt) : null,
          })),
        });
      }

      if (payload.pet) {
        await tx.studentPet.create({
          data: {
            id: payload.pet.id,
            studentId: payload.pet.studentId,
            petId: payload.pet.petId,
            stage: payload.pet.stage,
            experience: payload.pet.experience,
            level: payload.pet.level,
            createdAt: new Date(payload.pet.createdAt),
            updatedAt: new Date(payload.pet.updatedAt),
          },
        });
      }

      if (payload.petGrowthRecords.length > 0) {
        await tx.petGrowthRecord.createMany({
          data: payload.petGrowthRecords.map((item) => ({
            id: item.id,
            studentPetId: item.studentPetId,
            fromStage: item.fromStage,
            toStage: item.toStage,
            createdAt: new Date(item.createdAt),
          })),
        });
      }

      if (payload.petPointRecords.length > 0) {
        await tx.petPointRecord.createMany({
          data: payload.petPointRecords.map((item) => ({
            id: item.id,
            classId: item.classId,
            studentId: item.studentId,
            studentPetId: item.studentPetId,
            points: item.points,
            reason: item.reason,
            ruleId: item.ruleId,
            operatorId: item.operatorId,
            operatorName: item.operatorName,
            createdAt: new Date(item.createdAt),
          })),
        });
      }

      await tx.operationSnapshot.update({
        where: { id: snapshot.id },
        data: {
          status: OperationSnapshotStatus.RESTORED,
          restoredAt: new Date(),
          restoredBy: snapshot.userId,
        },
      });
    });

    return {
      snapshotId: snapshot.id,
      restoredType: snapshot.type,
      targetId: payload.student.id,
      targetName: payload.student.name,
      message: `学生 ${payload.student.name} 已恢复`,
    };
  }
}
