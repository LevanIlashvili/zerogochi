import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PetController } from './pet.controller';

@Module({
  imports: [AuthModule],
  controllers: [PetController],
})
export class PetModule {}
