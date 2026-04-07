export interface Asset {
  id: string;
  assetTag: string;
  name: string;
  type: AssetType;
  category: string;
  subCategory: string;
  status: AssetStatus;
  assignedTo?: string;
  assignedToName?: string;
  department?: string;
  team?: string;
  location: string;
  purchaseDate: string;
  warrantyExpiry: string;
  vendor: string;
  serialNumber: string;
  specifications?: string;
  cost: number;
  condition: AssetCondition;
  notes?: string;
}

export enum AssetType {
  HARDWARE = 'Hardware',
  SOFTWARE = 'Software',
  NETWORK = 'Network',
  PERIPHERAL = 'Peripheral',
  FURNITURE = 'Furniture'
}

export enum AssetStatus {
  AVAILABLE = 'Available',
  ALLOCATED = 'Allocated',
  IN_REPAIR = 'In Repair',
  RETIRED = 'Retired',
  RESERVED = 'Reserved'
}

export enum AssetCondition {
  NEW = 'New',
  GOOD = 'Good',
  FAIR = 'Fair',
  POOR = 'Poor',
  DAMAGED = 'Damaged'
}

export interface AssetCategory {
  id: string;
  name: string;
  type: AssetType;
  subCategories: string[];
  icon: string;
}
