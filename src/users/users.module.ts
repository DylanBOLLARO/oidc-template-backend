import { Module } from '@nestjs/common'
import { PrismaService } from '../prisma.service.js'
import { RedisService } from '../redis/redis.service.js'
import { UtilsService } from '../utils.service.js'
import { UsersController } from './users.controller.js'
import { UsersService } from './users.service.js'

@Module({
    controllers: [UsersController],
    providers: [UsersService, RedisService, PrismaService, UtilsService],
})
export class UsersModule {}
