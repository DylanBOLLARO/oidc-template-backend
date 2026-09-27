// Read secret from file
import { Injectable, UnauthorizedException } from '@nestjs/common'
import { Request } from 'express'
import * as fs from 'fs'
import get from 'lodash/get.js'
import isEmpty from 'lodash/isEmpty.js'
import isNil from 'lodash/isNil.js'

export function readSecret(name: string) {
    const secretPath = `/run/secrets/${name}`
    try {
        return fs.readFileSync(secretPath, 'utf8').trim()
    } catch (error) {
        const secretPathLocalDev = `secrets/${name}`

        try {
            return fs.readFileSync(secretPathLocalDev, 'utf8').trim()
        } catch (error) {
            // Fallback to environment variable for development
            return process.env[name.toUpperCase()]
        }
    }
}

@Injectable()
export class UtilsService {
    getCookieFromRequest(req: Request) {
        const cookie = get(req.cookies, 'connect.sid')

        if (isNil(cookie) || isEmpty(cookie)) {
            throw new UnauthorizedException('Session cookie not found')
        }

        return cookie
    }

    getRedisSessionNameFromCookie(cookie: any) {
        const sessionId = cookie?.replace(/^s:/, '')?.split('.')?.[0]

        if (isNil(sessionId) || isEmpty(sessionId)) {
            throw new UnauthorizedException('Session name not found')
        }

        return `sess:${sessionId}`
    }

    isCookieHasExpired(redisData: any) {
        if (isNil(redisData) || isEmpty(redisData)) {
            throw new UnauthorizedException('no redis data')
        }

        const expires = get(redisData, 'cookie.expires')

        if (expires && new Date(expires) < new Date()) {
            throw new UnauthorizedException('Session has expired')
        }
    }

    getUserIdFromCookie(redisData: any) {
        const userId = get(redisData, 'userId.sub')

        if (isNil(userId) || isEmpty(userId)) {
            throw new UnauthorizedException('no user id in redisData found')
        }

        return userId
    }
}
