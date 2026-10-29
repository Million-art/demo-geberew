import { Injectable } from '@nestjs/common';
import {
  FarmerRequest,
  NewFarmerRequest,
  RequestStatus,
} from '../../domain/marketplace/farmer-request';
import { MarketplaceRepository } from '../../domain/marketplace/marketplace.repository';
import { NewSupplier, Supplier } from '../../domain/marketplace/supplier';

@Injectable()
export class InMemoryMarketplaceRepository implements MarketplaceRepository {
  private readonly requests: FarmerRequest[] = [
    {
      id: 'request-001',
      farmerName: 'Demo Farmer A',
      phone: '0000000001',
      product: 'Maize seeds',
      category: 'Seeds',
      quantity: 20,
      unit: 'kg',
      region: 'Oromia',
      district: 'Bishoftu',
      maxPricePerUnit: 450,
      notes: 'Early-maturing variety preferred.',
      status: 'open',
      createdAt: '2026-10-28T08:30:00.000Z',
    },
    {
      id: 'request-002',
      farmerName: 'Demo Farmer B',
      phone: '0000000002',
      product: 'Urea fertilizer',
      category: 'Fertilizers',
      quantity: 10,
      unit: 'bags',
      region: 'Amhara',
      district: 'Bahir Dar',
      maxPricePerUnit: 3200,
      notes: 'Looking for delivery before the next rainfall.',
      status: 'open',
      createdAt: '2026-10-28T06:10:00.000Z',
    },
    {
      id: 'request-003',
      farmerName: 'Demo Farmer C',
      phone: '0000000003',
      product: 'Wheat seeds',
      category: 'Seeds',
      quantity: 50,
      unit: 'kg',
      region: 'Oromia',
      district: 'Adama',
      maxPricePerUnit: 500,
      notes: 'Certified seed, please.',
      status: 'open',
      createdAt: '2026-10-27T14:45:00.000Z',
    },
    {
      id: 'request-004',
      farmerName: 'Demo Farmer D',
      phone: '0000000004',
      product: 'NPK fertilizer',
      category: 'Fertilizers',
      quantity: 8,
      unit: 'bags',
      region: 'Tigray',
      district: 'Mekelle',
      maxPricePerUnit: 3500,
      notes: 'Requesting a quality certificate.',
      status: 'open',
      createdAt: '2026-10-27T11:00:00.000Z',
    },
  ];

  private readonly unlockedLeadIds = new Set<string>();

  private readonly suppliers: Supplier[] = [
    {
      id: 'demo-supplier',
      name: 'GreenGrow Agricultural Supply',
      description: 'Certified farm inputs with regional delivery.',
      regions: ['Oromia', 'Amhara'],
      rating: 4.7,
      verified: true,
      offers: [
        {
          product: 'Maize seeds',
          category: 'Seeds',
          estimatedPricePerUnit: 420,
          inStock: true,
        },
        {
          product: 'Wheat seeds',
          category: 'Seeds',
          estimatedPricePerUnit: 510,
          inStock: true,
        },
        {
          product: 'Urea fertilizer',
          category: 'Fertilizers',
          estimatedPricePerUnit: 3100,
          inStock: true,
        },
        {
          product: 'NPK fertilizer',
          category: 'Fertilizers',
          estimatedPricePerUnit: 3400,
          inStock: false,
        },
        {
          product: 'Maize pesticide',
          category: 'Pesticides',
          estimatedPricePerUnit: 800,
          inStock: true,
        },
      ],
    },
  ];

  listRequests(): FarmerRequest[] {
    return this.requests.map((request) => ({ ...request }));
  }

  findRequest(id: string): FarmerRequest | undefined {
    const request = this.requests.find((item) => item.id === id);
    return request ? { ...request } : undefined;
  }

  createRequest(request: NewFarmerRequest): FarmerRequest {
    const created: FarmerRequest = {
      ...request,
      id: `request-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      status: 'open',
      createdAt: new Date().toISOString(),
    };
    this.requests.unshift(created);
    return { ...created };
  }

  updateRequestStatus(
    id: string,
    status: RequestStatus,
  ): FarmerRequest | undefined {
    const request = this.requests.find((item) => item.id === id);
    if (!request) {
      return undefined;
    }
    request.status = status;
    return { ...request };
  }

  listSuppliers(): Supplier[] {
    return this.suppliers.map((supplier) => ({
      ...supplier,
      regions: [...supplier.regions],
      offers: supplier.offers.map((offer) => ({ ...offer })),
    }));
  }

  registerSupplier(input: NewSupplier): Supplier {
    const supplier: Supplier = {
      ...input,
      id: `supplier-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      rating: 0,
      verified: false,
      offers: input.offers.map((offer) => ({ ...offer, inStock: true })),
    };
    this.suppliers.push(supplier);
    return { ...supplier, regions: [...supplier.regions], offers: [...supplier.offers] };
  }

  isLeadUnlocked(requestId: string): boolean {
    return this.unlockedLeadIds.has(requestId);
  }

  unlockLead(requestId: string): void {
    this.unlockedLeadIds.add(requestId);
  }
}
