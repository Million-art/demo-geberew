export type RequestStatus = 'open' | 'contacted' | 'fulfilled';

export interface FarmerRequest {
  id: string;
  farmerName: string;
  phone: string;
  product: string;
  category: string;
  quantity: number;
  unit: string;
  region: string;
  district: string;
  maxPricePerUnit?: number;
  notes: string;
  status: RequestStatus;
  createdAt: string;
}

export interface PublicFarmerRequest {
  id: string;
  product: string;
  category: string;
  quantity: number;
  unit: string;
  region: string;
  district: string;
  maxPricePerUnit?: number;
  notes: string;
  status: RequestStatus;
  createdAt: string;
  matchScore: number;
  leadCostCredits: number;
  unlocked: boolean;
  contact?: {
    farmerName: string;
    phone: string;
  };
}

export type NewFarmerRequest = Omit<
  FarmerRequest,
  'id' | 'status' | 'createdAt'
>;
