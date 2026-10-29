import { Module } from '@nestjs/common';
import { HealthController } from './adapters/inbound/http/health.controller';
import { MarketplaceController } from './adapters/inbound/http/marketplace.controller';
import { InMemoryMarketplaceRepository } from './adapters/outbound/in-memory-marketplace.repository';
import { CheckHealthUseCase } from './application/health/check-health.use-case';
import { MarketplaceService } from './application/marketplace/marketplace.service';
import { MARKETPLACE_REPOSITORY } from './domain/marketplace/marketplace.repository';

@Module({
  controllers: [HealthController, MarketplaceController],
  providers: [
    CheckHealthUseCase,
    MarketplaceService,
    InMemoryMarketplaceRepository,
    {
      provide: MARKETPLACE_REPOSITORY,
      useExisting: InMemoryMarketplaceRepository,
    },
  ],
})
export class AppModule {}
