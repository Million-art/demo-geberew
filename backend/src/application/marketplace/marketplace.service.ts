import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  FarmerRequest,
  NewFarmerRequest,
  PublicFarmerRequest,
  RequestStatus,
} from '../../domain/marketplace/farmer-request';
import {
  MARKETPLACE_REPOSITORY,
  MarketplaceRepository,
} from '../../domain/marketplace/marketplace.repository';
import { Supplier } from '../../domain/marketplace/supplier';
import { NewSupplier } from '../../domain/marketplace/supplier';

@Injectable()
export class MarketplaceService {
  constructor(
    @Inject(MARKETPLACE_REPOSITORY)
    private readonly repository: MarketplaceRepository,
  ) {}

  getOverview() {
    const requests = this.repository.listRequests();
    const supplier = this.getDemoSupplier();
    const matches = this.getMatchedRequests(requests, supplier);

    return {
      supplier,
      metrics: {
        openRequests: requests.filter((request) => request.status === 'open')
          .length,
        matchedRequests: matches.length,
        unlockedLeads: matches.filter((request) =>
          this.repository.isLeadUnlocked(request.id),
        ).length,
        regionsCovered: supplier.regions.length,
      },
    };
  }

  getRequests(product?: string, view?: string): PublicFarmerRequest[] {
    const requests = this.repository.listRequests();
    const supplier = this.getDemoSupplier();

    return this.getMatchedRequests(requests, supplier)
      .filter((request) =>
        view === 'leads'
          ? this.repository.isLeadUnlocked(request.id)
          : request.status === 'open',
      )
      .filter(
        (request) =>
          !product || request.product.toLowerCase().includes(product.toLowerCase()),
      )
      .map((request) => this.toPublicRequest(request, supplier))
      .sort((left, right) => right.matchScore - left.matchScore);
  }

  getSuppliers(): Supplier[] {
    return this.repository.listSuppliers();
  }

  registerSupplier(supplier: NewSupplier): Supplier {
    return this.repository.registerSupplier(supplier);
  }

  createRequest(request: NewFarmerRequest): PublicFarmerRequest {
    const created = this.repository.createRequest(request);
    return this.toPublicRequest(created, this.getDemoSupplier());
  }

  unlockLead(id: string) {
    const request = this.repository.findRequest(id);
    if (!request || request.status !== 'open') {
      throw new NotFoundException('Open request not found.');
    }

    this.repository.unlockLead(id);
    return {
      requestId: request.id,
      farmerName: request.farmerName,
      phone: request.phone,
      demoPayment: {
        status: 'simulated',
        amountCredits: 5,
      },
    };
  }

  updateRequestStatus(
    id: string,
    status: RequestStatus,
  ): PublicFarmerRequest {
    if (!this.repository.isLeadUnlocked(id)) {
      throw new NotFoundException('Unlocked lead not found.');
    }
    const request = this.repository.updateRequestStatus(id, status);
    if (!request) {
      throw new NotFoundException('Request not found.');
    }
    return this.toPublicRequest(request, this.getDemoSupplier());
  }

  private getDemoSupplier(): Supplier {
    const supplier = this.repository
      .listSuppliers()
      .find((candidate) => candidate.id === 'demo-supplier');
    if (!supplier) {
      throw new NotFoundException('Demo supplier is not configured.');
    }
    return supplier;
  }

  private getMatchedRequests(
    requests: FarmerRequest[],
    supplier: Supplier,
  ): FarmerRequest[] {
    const availableProducts = supplier.offers
      .filter((offer) => offer.inStock)
      .map((offer) => offer.product.toLowerCase());
    const regions = supplier.regions.map((region) => region.toLowerCase());

    return requests.filter(
      (request) =>
        availableProducts.includes(request.product.toLowerCase()) &&
        regions.includes(request.region.toLowerCase()),
    );
  }

  private toPublicRequest(
    request: FarmerRequest,
    supplier: Supplier,
  ): PublicFarmerRequest {
    const offer = supplier.offers.find(
      (candidate) =>
        candidate.inStock &&
        candidate.product.toLowerCase() === request.product.toLowerCase(),
    );
    const locationScore = supplier.regions.some(
      (region) => region.toLowerCase() === request.region.toLowerCase(),
    )
      ? 25
      : 0;
    const priceScore =
      request.maxPricePerUnit === undefined || !offer
        ? 15
        : offer.estimatedPricePerUnit <= request.maxPricePerUnit
          ? 25
          : 10;

    const unlocked = this.repository.isLeadUnlocked(request.id);
    return {
      id: request.id,
      product: request.product,
      category: request.category,
      quantity: request.quantity,
      unit: request.unit,
      region: request.region,
      district: request.district,
      maxPricePerUnit: request.maxPricePerUnit,
      notes: request.notes,
      status: request.status,
      createdAt: request.createdAt,
      matchScore: Math.min(
        100,
        locationScore + priceScore + Math.round(supplier.rating * 10),
      ),
      leadCostCredits: 5,
      unlocked,
      ...(unlocked
        ? {
            contact: {
              farmerName: request.farmerName,
              phone: request.phone,
            },
          }
        : {}),
    };
  }
}
