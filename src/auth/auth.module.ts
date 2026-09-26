import { Module } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { PrismaService } from '../prisma.service.js'
import { RedisService } from '../redis/redis.service.js'
import { AuthController } from './auth.controller.js'
import { AuthService } from './auth.service.js'

@Module({
    controllers: [AuthController],
    providers: [AuthService, RedisService, JwtService, PrismaService],
})
export class AuthModule {}
