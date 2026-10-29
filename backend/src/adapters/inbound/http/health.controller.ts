import { Controller, Get } from '@nestjs/common';
import { CheckHealthUseCase } from '../../../application/health/check-health.use-case';
import { HealthStatus } from '../../../domain/health/health-status';

@Controller('api/health')
export class HealthController {
  constructor(private readonly checkHealth: CheckHealthUseCase) {}

  @Get()
  getHealth(): HealthStatus {
    return this.checkHealth.execute();
  }
}
