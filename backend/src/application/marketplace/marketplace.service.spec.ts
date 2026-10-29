import { InMemoryMarketplaceRepository } from '../../adapters/outbound/in-memory-marketplace.repository';
import { MarketplaceService } from './marketplace.service';

describe('MarketplaceService', () => {
  let service: MarketplaceService;

  beforeEach(() => {
    service = new MarketplaceService(new InMemoryMarketplaceRepository());
  });

  it('only returns requests matching stocked products in the supplier regions', () => {
    const requests = service.getRequests();

    expect(requests.map((request) => request.product)).toEqual([
      'Maize seeds',
      'Urea fertilizer',
      'Wheat seeds',
    ]);
  });

  it('keeps farmer contact details private until the lead is unlocked', () => {
    const [request] = service.getRequests();
    expect(request).toBeDefined();
    expect(request).not.toHaveProperty('contact');

    const unlocked = service.unlockLead(request.id);
    expect(unlocked).toEqual(
      expect.objectContaining({
        farmerName: 'Demo Farmer A',
        phone: '0000000001',
        demoPayment: { status: 'simulated', amountCredits: 5 },
      }),
    );
    expect(service.getRequests()[0]).toHaveProperty('contact');
  });

  it('tracks an unlocked lead through contact and fulfillment', () => {
    const [request] = service.getRequests();
    service.unlockLead(request.id);

    expect(service.updateRequestStatus(request.id, 'contacted').status).toBe(
      'contacted',
    );
    expect(service.updateRequestStatus(request.id, 'fulfilled').status).toBe(
      'fulfilled',
    );
    expect(service.getRequests(undefined, 'leads')[0].status).toBe('fulfilled');
  });

  it('registers new suppliers as unverified', () => {
    const supplier = service.registerSupplier({
      name: 'New Demo Supplier',
      description: 'Demo supplier profile',
      regions: ['Oromia'],
      offers: [
        {
          product: 'Maize seeds',
          category: 'Seeds',
          estimatedPricePerUnit: 400,
        },
      ],
    });

    expect(supplier.verified).toBe(false);
    expect(service.getSuppliers()).toContainEqual(
      expect.objectContaining({ id: supplier.id, verified: false }),
    );
  });
});
