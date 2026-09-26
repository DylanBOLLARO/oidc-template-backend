import {
    Body,
    Controller,
    Cookies,
    Delete,
    Get,
    Param,
    Patch,
    Post,
    UseGuards,
} from '@nestjs/common'
import { PrismaPg } from '@prisma/adapter-pg'
import get from 'lodash/get.js'
import isNil from 'lodash/isNil.js'
import { PrismaService } from '../prisma.service.js'
import { RedisService } from '../redis/redis.service.js'
import { PrismaClient } from './../../src/generated/prisma/client.js'
import { AuthGuard } from './../auth/auth.guard.js'
import { CreateUserDto } from './dto/create-user.dto.js'
import { UpdateUserDto } from './dto/update-user.dto.js'
@Controller('users')
export class UsersController {
    constructor(
        private readonly redisService: RedisService,
        private readonly prismaService: PrismaService
    ) {}

    @UseGuards(AuthGuard)
    @Get('me')
    async findAll(@Cookies('connect.sid') cookie: string) {
        if (isNil(cookie)) return null

        const sessionId = cookie?.replace(/^s:/, '')?.split('.')?.[0]

        const redisKey = `sess:${sessionId}`

        const redisData = await this.redisService.redis.get(redisKey)

        const userId = get(JSON.parse(redisData), 'userId.sub')

        const user = await this.prismaService.users.findUnique({
            where: { id: userId },
        })

        return user
    }

    // @Post()
    // create(@Body() createUserDto: CreateUserDto) {
    //     return this.usersService.create(createUserDto)
    // }

    // @Get()
    // findAll() {
    //     return this.usersService.findAll()
    // }

    // @Get(':id')
    // findOne(@Param('id') id: string) {
    //     return this.usersService.findOne(+id)
    // }

    // @Patch(':id')
    // update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    //     return this.usersService.update(+id, updateUserDto)
    // }

    // @Delete(':id')
    // remove(@Param('id') id: string) {
    //     return this.usersService.remove(+id)
    // }
}
