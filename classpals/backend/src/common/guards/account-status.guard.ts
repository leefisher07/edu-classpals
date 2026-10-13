import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UserStatus, ActivationCodeType } from '@prisma/client';

@Injectable()
export class AccountStatusGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return true;
    }

    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.id },
    });

    if (!dbUser) {
      throw new ForbiddenException('用户不存在');
    }

    if (dbUser.status === UserStatus.DISABLED) {
      throw new ForbiddenException('账号已被禁用');
    }

    if (dbUser.status === UserStatus.EXPIRED) {
      throw new ForbiddenException('账号已过期，请续费');
    }

    if (
      dbUser.licenseType !== ActivationCodeType.PERMANENT &&
      dbUser.accountExpiresAt &&
      new Date() > dbUser.accountExpiresAt
    ) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { status: UserStatus.EXPIRED },
      });
      throw new ForbiddenException('账号已过期，请续费');
    }

    return true;
  }
}
