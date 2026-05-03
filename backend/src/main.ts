import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { config } from './config';

async function bootstrap() {
  const log = new Logger('bootstrap');
  const app = await NestFactory.create(AppModule, { logger: ['log', 'warn', 'error'] });

  // CORS: in production, ALLOWED_ORIGINS is a comma-separated allowlist.
  // In dev, allow everything so localhost / ngrok / preview deploys work.
  const allowed = (process.env.ALLOWED_ORIGINS ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  if (process.env.NODE_ENV === 'production' && allowed.length > 0) {
    app.enableCors({ origin: allowed, credentials: false });
    log.log(`CORS allowlist: ${allowed.join(', ')}`);
  } else {
    app.enableCors({ origin: true });
    if (process.env.NODE_ENV === 'production') {
      log.warn('CORS open to all origins — set ALLOWED_ORIGINS for prod');
    }
  }

  await app.listen(config.port, '0.0.0.0');
  log.log(`zerogochi backend up on :${config.port} (chain ${config.chainId})`);
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
