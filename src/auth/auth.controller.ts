import {
    Controller,
    Get,
    OnModuleInit,
    Redirect,
    Req,
    Res,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import type { Request as RequestExpress } from 'express'
import get from 'lodash/get.js'
import isEmpty from 'lodash/isEmpty.js'
import isNil from 'lodash/isNil.js'
import * as client from 'openid-client'
import { PrismaService } from '../prisma.service.js'
import { RedisService } from '../redis/redis.service.js'
import { readSecret, UtilsService } from '../utils.service.js'
import { CreateAuthDto } from './dto/create-auth.dto.js'
import { UpdateAuthDto } from './dto/update-auth.dto.js'

@Controller('auth')
export class AuthController implements OnModuleInit {
    oidcClient: client.Configuration | null = null
    code_verifier: any

    constructor(
        private readonly redisService: RedisService,
        private readonly jwtService: JwtService,
        private readonly prismaService: PrismaService,
        private readonly utilsService: UtilsService,
        private readonly configService: ConfigService
    ) {}

    async initOIDC() {
        let server: URL = new URL(
            `${this.configService.get<string>('KEYCLOAK_URL')}/realms/${this.configService.get<string>('KEYCLOAK_REALMS')}`
        ) // Authorization Server's Issuer Identifier

        let clientId: string = this.configService.get<string>(
            'KEYCLOAK_CLIENT_ID'
        ) as string
        // Client identifier at the Authorization Server

        let clientSecret: string = readSecret('keycloak_secret') as string
        // Client Secret

        this.oidcClient = await client.discovery(
            server,
            clientId,
            clientSecret,
            undefined,
            {
                execute: [client.allowInsecureRequests],
            }
        )

        this.code_verifier = client.randomPKCECodeVerifier()

        return this
    }

    async onModuleInit() {
        await this.initOIDC()
    }

    @Get('login')
    @Redirect()
    async login(@Req() req: RequestExpress) {
        // https://www.npmjs.com/package/openid-client

        if (isNil(this.oidcClient)) return

        /**
         * Value used in the authorization request as the redirect_uri parameter, this
         * is typically pre-registered at the Authorization Server.
         */

        let redirect_uri: string = `${this.configService.get<string>('BACKEND_URL') as string}/auth/callback`
        let scope: string = this.configService.get<string>(
            'KEYCLOAK_SCOPE'
        ) as string // Scope of the access request
        /**
         * PKCE: The following MUST be generated for every redirect to the
         * authorization_endpoint. You must store the code_verifier and state in the
         * end-user session such that it can be recovered as the user gets redirected
         * from the authorization server back to your application.
         */
        let code_challenge: string = await client.calculatePKCECodeChallenge(
            this.code_verifier
        )

        let state!: string

        let parameters: Record<string, string> = {
            redirect_uri,
            scope,
            code_challenge,
            code_challenge_method: 'S256',
        }

        if (!this.oidcClient.serverMetadata().supportsPKCE()) {
            /**
             * We cannot be sure the server supports PKCE so we're going to use state too.
             * Use of PKCE is backwards compatible even if the AS doesn't support it which
             * is why we're using it regardless. Like PKCE, random state must be generated
             * for every redirect to the authorization_endpoint.
             */
            state = client.randomState()
            parameters.state = state
        }

        let redirectTo: URL = client.buildAuthorizationUrl(
            this.oidcClient,
            parameters
        )

        return {
            url: redirectTo.href,
        }
    }

    @Get('callback')
    @Redirect()
    async callback(@Req() req: any) {
        // https://www.npmjs.com/package/openid-client

        if (isNil(this.oidcClient)) return

        const currentUrl = new URL(
            `${req.protocol}://${req.get('host')}${req.originalUrl}`
        )

        let tokens: client.TokenEndpointResponse =
            await client.authorizationCodeGrant(this.oidcClient, currentUrl, {
                pkceCodeVerifier: this.code_verifier,
                idTokenExpected: true,
            })

        const { access_token, id_token } = tokens ?? {}

        const { sub } = await this.jwtService.decode(access_token)

        let userInfo = await client.fetchUserInfo(
            this.oidcClient,
            access_token,
            sub
        )

        if (!isNil(userInfo) && !isEmpty(userInfo)) {
            const { sub: id, name, email } = userInfo
            if (!isNil(id) && !isNil(email) && !isNil(name)) {
                await this.prismaService.users.upsert({
                    where: { id },
                    create: { id, email, name },
                    update: { id, email, name },
                })
            }
        }

        req.session.userId = userInfo
        req.session.idToken = id_token

        return {
            url: this.configService.get<string>('FRONTEND_URL'),
        }
    }

    @Get('logout')
    @Redirect()
    async logout(@Req() req: any, @Res() res: any) {
        const idToken = req.session.idToken

        if (!idToken) {
            return {
                url: this.configService.get<string>('FRONTEND_URL'),
            }
        }

        const logoutUrl = new URL(
            `${this.configService.get<string>('KEYCLOAK_URL')}/realms/${this.configService.get<string>('KEYCLOAK_REALMS')}/protocol/openid-connect/logout`
        )

        logoutUrl.searchParams.set('id_token_hint', idToken)
        logoutUrl.searchParams.set(
            'post_logout_redirect_uri',
            this.configService.get<string>('FRONTEND_URL') as string
        )

        await new Promise<void>((resolve, reject) => {
            req.session.destroy((err: any) => {
                if (err) return reject(err)
                resolve()
            })
        })

        try {
            const cookie = this.utilsService.getCookieFromRequest(req)

            if (cookie) {
                const redisKey =
                    this.utilsService.getRedisSessionNameFromCookie(cookie)

                await this.redisService.redis.del(redisKey)

                res.clearCookie('connect.sid', {
                    path: '/',
                })
            }
        } catch (error) {
            console.warn('no cookie to delete')
        }

        return {
            url: logoutUrl.href,
        }
    }
}
