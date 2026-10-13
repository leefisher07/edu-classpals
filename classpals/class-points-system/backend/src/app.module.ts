import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR, APP_FILTER, APP_PIPE } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './common/modules/redis.module';
import { AuthModule } from './modules/auth/auth.module';
import { ClassesModule } from './modules/classes/classes.module';
import { StudentsModule } from './modules/students/students.module';
import { PointsModule } from './modules/points/points.module';
import { RulesModule } from './modules/rules/rules.module';
import { GroupsModule } from './modules/groups/groups.module';
import { ShopModule } from './modules/shop/shop.module';
import { PetsModule } from './modules/pets/pets.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { ShareModule } from './modules/share/share.module';
import { ToolsModule } from './modules/tools/tools.module';
import { PetSettingsModule } from './modules/pet-settings/pet-settings.module';
import { UploadModule } from './modules/upload/upload.module';
import { DataManagementModule } from './modules/data-management/data-management.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { AccountStatusGuard } from './common/guards/account-status.guard';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { validationPipe } from './common/pipes/validation.pipe';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    RedisModule,
    AuthModule,
    ClassesModule,
    StudentsModule,
    PointsModule,
    RulesModule,
    GroupsModule,
    ShopModule,
    PetsModule,
    DashboardModule,
    ShareModule,
    ToolsModule,
    PetSettingsModule,
    UploadModule,
    DataManagementModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_GUARD,
      useClass: AccountStatusGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    {
      provide: APP_PIPE,
      useValue: validationPipe,
    },
  ],
})
export class AppModule {}
