export interface SupplierOffer {
  product: string;
  category: string;
  estimatedPricePerUnit: number;
  inStock: boolean;
}

export interface Supplier {
  id: string;
  name: string;
  description: string;
  regions: string[];
  rating: number;
  verified: boolean;
  offers: SupplierOffer[];
}

export interface NewSupplier {
  name: string;
  description: string;
  regions: string[];
  offers: Omit<SupplierOffer, 'inStock'>[];
}
