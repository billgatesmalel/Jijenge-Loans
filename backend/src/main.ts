import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import helmet from 'helmet';

async function bootstrap() {
  const logger = new Logger('JijengeBackend');
  const app = await NestFactory.create(AppModule);

  app.use(helmet());
  app.enableCors({
    origin: process.env.ALLOWED_ORIGIN || '*',
    credentials: true
  });

  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false
    })
  );

  const config = new DocumentBuilder()
    .setTitle('Jijenge Loans API')
    .setDescription('Enterprise Loan Application, STK Push Payment & Management Engine for Jijenge Loans Kenya')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 5000;
  await app.listen(port);
  logger.log(`🚀 Jijenge Loans Backend Service running on port ${port}`);
  logger.log(`📚 Swagger Documentation active at http://localhost:${port}/api/docs`);
}
bootstrap();
