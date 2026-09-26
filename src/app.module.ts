import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { AppController } from './app.controller.js'
import { AppService } from './app.service.js'
import { AuthModule } from './auth/auth.module.js'
import { LoggerMiddleware } from './logger.middleware.js'
import { UsersModule } from './users/users.module.js'
import { RedisService } from './redis/redis.service.js'

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: '.env',
        }),
        AuthModule,
        UsersModule,
    ],
    controllers: [AppController],
    providers: [AppService, RedisService],
})
export class AppModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
        consumer.apply(LoggerMiddleware).forRoutes('*')
    }
}
