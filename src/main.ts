import { Logger } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { RedisStore } from 'connect-redis'
import cookieParser from 'cookie-parser'
import session from 'express-session'
import { createClient } from 'redis'
import { AppModule } from './app.module.js'
import { readSecret } from './utils.service.js'

async function bootstrap() {
    const app = await NestFactory.create(AppModule)

    app.use(cookieParser())

    app.enableCors({
        origin: '*',
        credentials: true,
        methods: '*',
    })

    // Initialize client.
    let redisClient = createClient({
        url: `redis://default:${readSecret('redis_password')}@127.0.0.1:6379/0`,
    })

    redisClient.connect().catch(console.error)

    app.use(
        session({
            store: new RedisStore({
                client: redisClient,
                prefix: 'sess:',
            }),
            secret: readSecret('session_secret') as string,
            resave: false,
            saveUninitialized: false,
            rolling: true,
            cookie: {
                maxAge: 30 * 60 * 1000,
                httpOnly: true,
            },
        })
    )

    await app.listen(process.env.PORT ?? 3050)
}

await bootstrap()

new Logger().verbose(`Application is running on : ${process.env.PORT} port`)
