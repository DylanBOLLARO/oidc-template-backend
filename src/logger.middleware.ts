import { Injectable, Logger, NestMiddleware } from '@nestjs/common'
import { NextFunction, Request, Response } from 'express'

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
    private readonly logger = new Logger('Middleware')

    use(req: Request, res: Response, next: NextFunction) {
        const start = Date.now()

        res.on('finish', () => {
            const duration = Date.now() - start

            this.logger.log(
                `${req.method} ${req.originalUrl} ` +
                    `${res.statusCode} ` +
                    `${duration}ms ` +
                    `ip=${req.ip} ` +
                    `user-agent="${req.get('user-agent')}"`
            )
        })

        next()
    }
}
