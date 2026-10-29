import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  Patch,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { MarketplaceService } from '../../../application/marketplace/marketplace.service';
import { NewFarmerRequest } from '../../../domain/marketplace/farmer-request';
import { RequestStatus } from '../../../domain/marketplace/farmer-request';
import { NewSupplier } from '../../../domain/marketplace/supplier';

@Controller('api/marketplace')
export class MarketplaceController {
  constructor(
    @Inject(MarketplaceService)
    private readonly marketplace: MarketplaceService,
  ) {}

  @Get('overview')
  getOverview() {
    return this.marketplace.getOverview();
  }

  @Get('requests')
  getRequests(
    @Query('product') product?: string,
    @Query('view') view?: string,
  ) {
    return this.marketplace.getRequests(product, view);
  }

  @Get('suppliers')
  getSuppliers() {
    return this.marketplace.getSuppliers();
  }

  @Post('suppliers')
  registerSupplier(@Body() body: NewSupplier) {
    this.validateSupplier(body);
    return this.marketplace.registerSupplier(body);
  }

  @Post('requests')
  createRequest(@Body() body: NewFarmerRequest) {
    this.validateRequest(body);
    return this.marketplace.createRequest(body);
  }

  @Post('requests/:id/unlock')
  unlockLead(@Param('id') id: string) {
    return this.marketplace.unlockLead(id);
  }

  @Patch('requests/:id/status')
  updateRequestStatus(
    @Param('id') id: string,
    @Body() body: { status: RequestStatus },
  ) {
    if (!body || !['open', 'contacted', 'fulfilled'].includes(body.status)) {
      throw new BadRequestException('Please provide a valid request status.');
    }
    return this.marketplace.updateRequestStatus(id, body.status);
  }

  private validateRequest(body: NewFarmerRequest): void {
    const productCategories: Record<string, string> = {
      'Maize seeds': 'Seeds',
      'Wheat seeds': 'Seeds',
      'Urea fertilizer': 'Fertilizers',
      'NPK fertilizer': 'Fertilizers',
      'Maize pesticide': 'Pesticides',
    };
    const requiredStrings: (keyof NewFarmerRequest)[] = [
      'farmerName',
      'phone',
      'product',
      'category',
      'unit',
      'region',
      'district',
    ];
    if (
      !body ||
      requiredStrings.some(
        (field) => {
          const value = body?.[field];
          return typeof value !== 'string' || value.trim().length === 0;
        },
      ) ||
      typeof body.phone !== 'string' ||
      !/^\+?[0-9\s()-]{7,20}$/.test(body.phone.trim()) ||
      productCategories[body.product] !== body.category ||
      !['kg', 'bags', 'liters', 'units'].includes(body.unit) ||
      (body.notes !== undefined && typeof body.notes !== 'string') ||
      typeof body.quantity !== 'number' ||
      !Number.isFinite(body.quantity) ||
      body.quantity <= 0 ||
      (body.maxPricePerUnit !== undefined &&
        (typeof body.maxPricePerUnit !== 'number' ||
          !Number.isFinite(body.maxPricePerUnit) ||
          body.maxPricePerUnit <= 0))
    ) {
      throw new BadRequestException('Please provide valid request details.');
    }
  }

  private validateSupplier(body: NewSupplier): void {
    const productCategories: Record<string, string> = {
      'Maize seeds': 'Seeds',
      'Wheat seeds': 'Seeds',
      'Urea fertilizer': 'Fertilizers',
      'NPK fertilizer': 'Fertilizers',
      'Maize pesticide': 'Pesticides',
    };
    if (
      !body ||
      typeof body.name !== 'string' ||
      !body.name.trim() ||
      typeof body.description !== 'string' ||
      !body.description.trim() ||
      !Array.isArray(body.regions) ||
      body.regions.length === 0 ||
      body.regions.some((region) => typeof region !== 'string' || !region.trim()) ||
      !Array.isArray(body.offers) ||
      body.offers.length === 0 ||
      body.offers.some(
        (offer) =>
          !offer ||
          productCategories[offer.product] !== offer.category ||
          typeof offer.estimatedPricePerUnit !== 'number' ||
          !Number.isFinite(offer.estimatedPricePerUnit) ||
          offer.estimatedPricePerUnit <= 0,
      )
    ) {
      throw new BadRequestException('Please provide valid supplier details.');
    }
  }
}
