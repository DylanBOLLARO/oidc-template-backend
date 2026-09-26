import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common'
import get from 'lodash/get.js'
import isEmpty from 'lodash/isEmpty.js'
import isEqual from 'lodash/isEqual.js'
import isNil from 'lodash/isNil.js'
import { Observable } from 'rxjs'
import { PrismaService } from '../prisma.service.js'
import { RedisService } from '../redis/redis.service.js'

@Injectable()
export class AuthGuard implements CanActivate {
    constructor(
        private readonly redisService: RedisService,
        private readonly prismaService: PrismaService
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest()

        if (isNil(request.cookies) || isEmpty(request.cookies)) return false

        const cookie = get(request.cookies, `connect.sid`)

        if (isNil(cookie) || isEmpty(cookie)) return false

        const sessionId = cookie?.replace(/^s:/, '')?.split('.')?.[0]

        if (isNil(sessionId) || isEmpty(sessionId)) return false

        const redisKey = `sess:${sessionId}`

        const redisData = await this.redisService.redis.get(redisKey)

        if (isNil(redisData) || isEmpty(redisData)) return false

        const expires = get(JSON.parse(redisData), 'cookie.expires')

        if (expires && new Date(expires) < new Date()) return false

        const userIdCookie = get(JSON.parse(redisData), 'userId.sub')

        if (isNil(userIdCookie) || isEmpty(userIdCookie)) return false

        const { id: userIdDatabase }: any =
            await this.prismaService.users.findUnique({
                where: { id: userIdCookie },
            })

        if (isNil(userIdDatabase) || isEmpty(userIdDatabase)) return false

        return isEqual(userIdCookie, userIdDatabase)
    }
}
