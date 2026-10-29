import { Injectable } from '@nestjs/common';
import { HealthStatus } from '../../domain/health/health-status';

@Injectable()
export class CheckHealthUseCase {
  execute(): HealthStatus {
    return {
      status: 'ok',
      service: 'NestJS API',
      timestamp: new Date().toISOString(),
    };
  }
}
