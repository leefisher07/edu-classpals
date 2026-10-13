import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { BcryptUtil } from '../../common/utils/bcrypt.util';
import { DateUtil } from '../../common/utils/date.util';
import {
  UserStatus,
  ActivationCodeStatus,
  ActivationCodeType,
  Prisma,
} from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  private buildUserPayload(
    user: {
      id: string;
      phone: string;
      username: string | null;
      role: string;
      licenseType: ActivationCodeType | null;
      licenseName: string | null;
      accountExpiresAt: Date | null;
      lastLoginAt: Date | null;
    },
    currentClassId: string | null,
  ) {
    return {
      id: user.id,
      phone: user.phone,
      username: user.username,
      role: user.role,
      licenseType: user.licenseType,
      licenseName: user.licenseName,
      accountExpiresAt: user.accountExpiresAt,
      lastLoginAt: user.lastLoginAt,
      currentClassId,
    };
  }

  private ensureAccountIsUsable(user: {
    status: UserStatus;
    accountExpiresAt: Date | null;
    licenseType: ActivationCodeType | null;
  }) {
    if (user.status === UserStatus.DISABLED) {
      throw new UnauthorizedException('账号已被禁用');
    }

    if (user.status === UserStatus.EXPIRED) {
      throw new UnauthorizedException('账号已过期，请续费');
    }

    if (
      user.licenseType === ActivationCodeType.PERMANENT ||
      !user.accountExpiresAt
    ) {
      return;
    }

    if (DateUtil.isExpired(user.accountExpiresAt)) {
      throw new UnauthorizedException('账号已过期，请续费');
    }
  }

  private getActivationPlanName(code: {
    type: ActivationCodeType;
    planName: string | null;
    days: number | null;
  }) {
    if (code.planName) return code.planName;
    if (code.type === ActivationCodeType.PERMANENT) return '永久版';
    if (code.days === 90) return '三个月版';
    if (code.days === 180) return '半年版';
    if (code.days === 365) return '一年版';
    return '期限版';
  }

  private calculateTimeLimitedExpiry(baseDate: Date | null, days: number) {
    const startDate = baseDate && baseDate > new Date() ? baseDate : new Date();
    return DateUtil.addDays(startDate, days);
  }

  private async applyActivationCode(
    tx: Prisma.TransactionClient,
    user: {
      id: string;
      phone: string;
      username: string | null;
      role: string;
      status: UserStatus;
      licenseType: ActivationCodeType | null;
      licenseName: string | null;
      accountExpiresAt: Date | null;
      lastLoginAt: Date | null;
      currentClassId: string | null;
    },
    rawCode: string,
    options?: { allowPermanentUserRedeem?: boolean },
  ) {
    const codeValue = rawCode.trim().toUpperCase();
    const code = await tx.activationCode.findUnique({
      where: { code: codeValue },
    });

    if (!code) {
      throw new BadRequestException('使用授权码不存在');
    }

    if (code.status !== ActivationCodeStatus.UNUSED) {
      throw new BadRequestException('该使用授权码已被使用');
    }

    if (
      user.licenseType === ActivationCodeType.PERMANENT &&
      !options?.allowPermanentUserRedeem
    ) {
      throw new BadRequestException(
        '当前账号已是永久有效，无需再次输入使用授权码',
      );
    }

    if (
      code.type === ActivationCodeType.TIME_LIMITED &&
      (!code.days || code.days <= 0)
    ) {
      throw new BadRequestException('该使用授权码配置无效');
    }

    const licenseName = this.getActivationPlanName(code);
    const nextAccountExpiresAt =
      code.type === ActivationCodeType.PERMANENT
        ? null
        : this.calculateTimeLimitedExpiry(user.accountExpiresAt, code.days!);

    const updatedUser = await tx.user.update({
      where: { id: user.id },
      data: {
        status: UserStatus.ACTIVE,
        licenseType: code.type,
        licenseName,
        accountExpiresAt: nextAccountExpiresAt,
      },
    });

    await tx.activationCode.update({
      where: { id: code.id },
      data: {
        status: ActivationCodeStatus.ACTIVATED,
        firstActivatedAt: code.firstActivatedAt ?? new Date(),
      },
    });

    await tx.userActivationCode.create({
      data: {
        userId: user.id,
        activationCodeId: code.id,
        expiresAt: nextAccountExpiresAt,
      },
    });

    return updatedUser;
  }

  /**
   * 用户注册（手机号 + 使用授权码）
   */
  async register(registerDto: RegisterDto) {
    const { phone, password, activationCode } = registerDto;

    const existingUser = await this.prisma.user.findUnique({
      where: { phone },
    });
    if (existingUser) {
      throw new ConflictException('该手机号已注册');
    }

    const hashedPassword = await BcryptUtil.hash(password);

    const user = await this.prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          phone,
          password: hashedPassword,
          status: UserStatus.ACTIVE,
        },
      });

      return this.applyActivationCode(
        tx,
        {
          id: newUser.id,
          phone: newUser.phone,
          username: newUser.username,
          role: newUser.role,
          status: newUser.status,
          licenseType: newUser.licenseType,
          licenseName: newUser.licenseName,
          accountExpiresAt: newUser.accountExpiresAt,
          lastLoginAt: newUser.lastLoginAt,
          currentClassId: newUser.currentClassId,
        },
        activationCode,
        { allowPermanentUserRedeem: true },
      );
    });

    const token = this.generateToken(user.id, user.phone, user.role);
    const refreshToken = this.generateRefreshToken(user.id);

    return {
      user: this.buildUserPayload(user, null),
      token,
      refreshToken,
      expiresIn: 900,
    };
  }

  /**
   * 用户登录
   */
  async login(loginDto: LoginDto) {
    const { phone, password } = loginDto;

    const user = await this.prisma.user.findUnique({
      where: { phone },
      include: {
        classes: {
          select: { id: true, isArchived: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('手机号或密码错误');
    }

    const isPasswordValid = await BcryptUtil.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('手机号或密码错误');
    }

    try {
      this.ensureAccountIsUsable(user);
    } catch (error) {
      if (
        error instanceof UnauthorizedException &&
        user.accountExpiresAt &&
        user.licenseType !== ActivationCodeType.PERMANENT
      ) {
        await this.prisma.user.update({
          where: { id: user.id },
          data: { status: UserStatus.EXPIRED },
        });
      }
      throw error;
    }

    let currentClassId = user.currentClassId;
    if (!currentClassId && user.classes.length > 0) {
      const activeClass =
        user.classes.find((c) => !c.isArchived) || user.classes[0];
      currentClassId = activeClass.id;

      await this.prisma.user.update({
        where: { id: user.id },
        data: { currentClassId },
      });
    }

    const lastLoginAt = new Date();
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt },
    });

    const token = this.generateToken(user.id, user.phone, user.role);
    const refreshToken = this.generateRefreshToken(user.id);

    return {
      user: this.buildUserPayload(
        {
          ...user,
          lastLoginAt,
        },
        currentClassId,
      ),
      token,
      refreshToken,
      expiresIn: 900,
    };
  }

  async redeemActivationCode(userId: string, activationCode: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }

    this.ensureAccountIsUsable({
      status: user.status,
      accountExpiresAt: user.accountExpiresAt,
      licenseType: user.licenseType,
    });

    const updatedUser = await this.prisma.$transaction(async (tx) => {
      return this.applyActivationCode(
        tx,
        {
          id: user.id,
          phone: user.phone,
          username: user.username,
          role: user.role,
          status: user.status,
          licenseType: user.licenseType,
          licenseName: user.licenseName,
          accountExpiresAt: user.accountExpiresAt,
          lastLoginAt: user.lastLoginAt,
          currentClassId: user.currentClassId,
        },
        activationCode,
      );
    });

    return {
      message:
        updatedUser.licenseType === ActivationCodeType.PERMANENT
          ? '已升级为永久有效'
          : '续费成功',
      user: this.buildUserPayload(updatedUser, updatedUser.currentClassId),
    };
  }

  private generateToken(userId: string, phone: string, role: string): string {
    const payload = { sub: userId, phone, role };
    return this.jwtService.sign(payload, { expiresIn: '15m' });
  }

  private generateRefreshToken(userId: string): string {
    const payload = { sub: userId, type: 'refresh' };
    return this.jwtService.sign(payload, { expiresIn: '7d' });
  }

  async refreshToken(dto: RefreshTokenDto) {
    try {
      const payload = this.jwtService.verify(dto.refreshToken);

      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('无效的刷新令牌');
      }

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user) {
        throw new UnauthorizedException('用户不存在');
      }

      try {
        this.ensureAccountIsUsable(user);
      } catch (error) {
        if (
          error instanceof UnauthorizedException &&
          user.accountExpiresAt &&
          user.licenseType !== ActivationCodeType.PERMANENT
        ) {
          await this.prisma.user.update({
            where: { id: user.id },
            data: { status: UserStatus.EXPIRED },
          });
        }
        throw error;
      }

      const accessToken = this.generateToken(user.id, user.phone, user.role);
      const refreshToken = this.generateRefreshToken(user.id);

      return {
        accessToken,
        refreshToken,
        expiresIn: 900,
      };
    } catch (error) {
      throw new UnauthorizedException('刷新令牌无效或已过期');
    }
  }
}
