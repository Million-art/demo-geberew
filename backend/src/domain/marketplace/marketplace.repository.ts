import {
  FarmerRequest,
  NewFarmerRequest,
  RequestStatus,
} from './farmer-request';
import { NewSupplier, Supplier } from './supplier';

export const MARKETPLACE_REPOSITORY = Symbol('MARKETPLACE_REPOSITORY');

export interface MarketplaceRepository {
  listRequests(): FarmerRequest[];
  findRequest(id: string): FarmerRequest | undefined;
  createRequest(request: NewFarmerRequest): FarmerRequest;
  updateRequestStatus(id: string, status: RequestStatus): FarmerRequest | undefined;
  listSuppliers(): Supplier[];
  registerSupplier(supplier: NewSupplier): Supplier;
  isLeadUnlocked(requestId: string): boolean;
  unlockLead(requestId: string): void;
}
