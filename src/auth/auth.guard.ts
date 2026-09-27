import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common'
import isEqual from 'lodash/isEqual.js'
import { PrismaService } from '../prisma.service.js'
import { RedisService } from '../redis/redis.service.js'
import { UtilsService } from '../utils.service.js'

@Injectable()
export class AuthGuard implements CanActivate {
    constructor(
        private readonly redisService: RedisService,
        private readonly prismaService: PrismaService,
        private readonly utilsService: UtilsService
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest()

        try {
            const cookie = this.utilsService.getCookieFromRequest(request)

            const redisKey =
                this.utilsService.getRedisSessionNameFromCookie(cookie)

            const redisData = await this.redisService.redis.get(redisKey)

            this.utilsService.isCookieHasExpired(JSON.parse(redisData))

            const userIdCookie = this.utilsService.getUserIdFromCookie(
                JSON.parse(redisData)
            )

            const { id: userIdDatabase }: any =
                await this.prismaService.users.findUniqueOrThrow({
                    where: { id: userIdCookie },
                })

            return isEqual(userIdCookie, userIdDatabase)
        } catch (error) {
            return false
        }
    }
}
