import { Module } from '@nestjs/common';
import { RulesService } from './rules.service';
import { RulesController, RuleController } from './rules.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [RulesController, RuleController],
  providers: [RulesService],
  exports: [RulesService],
})
export class RulesModule {}
