import {
  Controller,
  HttpException,
  HttpStatus,
  Post,
  Req,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { getStorageProvider } from '../services/storageProvider';

@Controller('uploads')
export class UploadsController {
  @Post()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  async upload(@Req() req: Request) {
    const file = req.file;
    if (!file) {
      throw new HttpException('Archivo requerido (campo: file)', HttpStatus.BAD_REQUEST);
    }

    const storage = await getStorageProvider();
    const url = await storage.uploadFile(file.buffer, file.originalname, file.mimetype);
    return { url, mode: storage.mode };
  }
}
