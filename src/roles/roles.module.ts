import { Module } from '@nestjs/common';
import { RolesService } from './roles.service.js';

@Module({
  providers: [RolesService]
})
export class RolesModule {}
