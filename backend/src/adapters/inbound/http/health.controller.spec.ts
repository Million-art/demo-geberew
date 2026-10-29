import { Test } from '@nestjs/testing';
import { CheckHealthUseCase } from '../../../application/health/check-health.use-case';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: CheckHealthUseCase,
          useValue: {
            execute: () => ({
              status: 'ok',
              service: 'NestJS API',
              timestamp: '2026-01-01T00:00:00.000Z',
            }),
          },
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('returns the health status from the use case', () => {
    expect(controller.getHealth()).toEqual({
      status: 'ok',
      service: 'NestJS API',
      timestamp: '2026-01-01T00:00:00.000Z',
    });
  });
});
