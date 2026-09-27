import { Injectable, OnModuleInit } from '@nestjs/common'
import { Redis } from 'ioredis'
import { readSecret } from '../utils.service.js'

@Injectable()
export class RedisService implements OnModuleInit {
    redis: any = null

    async onModuleInit() {
        this.redis = new Redis({
            port: 6379, // Redis port
            host: '127.0.0.1', // Redis host
            username: 'default', // needs Redis >= 6
            password: readSecret('redis_password') as string,
            db: 0, // Defaults to 0
        })
    }
}
