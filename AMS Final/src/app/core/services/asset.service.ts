import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { Asset, AssetType, AssetStatus, AssetCondition, AssetCategory } from '../models/asset.model';
import { HeroService } from './hero.service';
declare var $: any;
@Injectable({ providedIn: 'root' })
export class AssetService {
  constructor(private hs: HeroService) { }
  private assetsLoaded = false;
  private assets: Asset[] = [
    {
      id: 'AST001', assetTag: 'HW-LAP-001', name: 'Dell Latitude 5540', type: AssetType.HARDWARE,
      category: 'Laptop', subCategory: 'Business', status: AssetStatus.ALLOCATED,
      assignedTo: 'USR005', assignedToName: 'Ananya Desai', department: 'Engineering', team: 'Frontend',
      location: 'Hyderabad - Floor 3', purchaseDate: '2024-03-15', warrantyExpiry: '2027-03-15',
      vendor: 'Dell Technologies', serialNumber: 'DL5540-HYD-001', cost: 85000,
      condition: AssetCondition.GOOD, specifications: 'i7-1365U, 16GB RAM, 512GB SSD'
    },
    {
      id: 'AST002', assetTag: 'HW-LAP-002', name: 'MacBook Pro 14"', type: AssetType.HARDWARE,
      category: 'Laptop', subCategory: 'Premium', status: AssetStatus.ALLOCATED,
      assignedTo: 'USR004', assignedToName: 'Suresh Patel', department: 'Engineering', team: 'Frontend',
      location: 'Hyderabad - Floor 3', purchaseDate: '2024-01-10', warrantyExpiry: '2027-01-10',
      vendor: 'Apple Inc.', serialNumber: 'MBP14-HYD-002', cost: 195000,
      condition: AssetCondition.GOOD, specifications: 'M3 Pro, 18GB RAM, 512GB SSD'
    },
    {
      id: 'AST003', assetTag: 'HW-MON-001', name: 'Dell UltraSharp U2723QE', type: AssetType.HARDWARE,
      category: 'Monitor', subCategory: '4K', status: AssetStatus.AVAILABLE,
      location: 'Hyderabad - Store', purchaseDate: '2024-06-20', warrantyExpiry: '2027-06-20',
      vendor: 'Dell Technologies', serialNumber: 'DU27-HYD-001', cost: 45000,
      condition: AssetCondition.NEW
    },
    {
      id: 'AST004', assetTag: 'SW-LIC-001', name: 'Microsoft 365 Business', type: AssetType.SOFTWARE,
      category: 'Productivity Suite', subCategory: 'License', status: AssetStatus.ALLOCATED,
      assignedTo: 'USR005', assignedToName: 'Ananya Desai', department: 'Engineering', team: 'Frontend',
      location: 'Cloud', purchaseDate: '2024-01-01', warrantyExpiry: '2025-12-31',
      vendor: 'Microsoft', serialNumber: 'MS365-BUS-001', cost: 12000,
      condition: AssetCondition.GOOD
    },
    {
      id: 'AST005', assetTag: 'HW-LAP-003', name: 'HP EliteBook 840', type: AssetType.HARDWARE,
      category: 'Laptop', subCategory: 'Business', status: AssetStatus.AVAILABLE,
      location: 'Bangalore - Store', purchaseDate: '2024-08-10', warrantyExpiry: '2027-08-10',
      vendor: 'HP Inc.', serialNumber: 'HPE840-BLR-001', cost: 78000,
      condition: AssetCondition.NEW, specifications: 'i5-1345U, 16GB RAM, 256GB SSD'
    },
    {
      id: 'AST006', assetTag: 'NW-RTR-001', name: 'Cisco Catalyst 9200', type: AssetType.NETWORK,
      category: 'Router', subCategory: 'Enterprise', status: AssetStatus.ALLOCATED,
      assignedTo: 'USR003', assignedToName: 'IT Infrastructure', department: 'IT', team: 'Network',
      location: 'Hyderabad - Server Room', purchaseDate: '2023-11-01', warrantyExpiry: '2026-11-01',
      vendor: 'Cisco Systems', serialNumber: 'CC9200-HYD-001', cost: 320000,
      condition: AssetCondition.GOOD
    },
    {
      id: 'AST007', assetTag: 'HW-LAP-004', name: 'Lenovo ThinkPad X1 Carbon', type: AssetType.HARDWARE,
      category: 'Laptop', subCategory: 'Ultra-Premium', status: AssetStatus.IN_REPAIR,
      location: 'Hyderabad - Service Center', purchaseDate: '2023-06-15', warrantyExpiry: '2026-06-15',
      vendor: 'Lenovo', serialNumber: 'LTP-X1C-HYD-001', cost: 165000,
      condition: AssetCondition.FAIR, specifications: 'i7-1365U, 32GB RAM, 1TB SSD'
    },
    {
      id: 'AST008', assetTag: 'PR-KBD-001', name: 'Logitech MX Keys', type: AssetType.PERIPHERAL,
      category: 'Keyboard', subCategory: 'Wireless', status: AssetStatus.AVAILABLE,
      location: 'Hyderabad - Store', purchaseDate: '2024-09-01', warrantyExpiry: '2026-09-01',
      vendor: 'Logitech', serialNumber: 'LMX-KBD-001', cost: 8500,
      condition: AssetCondition.NEW
    },
    {
      id: 'AST009', assetTag: 'SW-LIC-002', name: 'JetBrains IntelliJ IDEA', type: AssetType.SOFTWARE,
      category: 'Development Tools', subCategory: 'IDE License', status: AssetStatus.ALLOCATED,
      assignedTo: 'USR004', assignedToName: 'Suresh Patel', department: 'Engineering', team: 'Frontend',
      location: 'Cloud', purchaseDate: '2024-04-01', warrantyExpiry: '2025-03-31',
      vendor: 'JetBrains', serialNumber: 'JB-IDEA-001', cost: 15000,
      condition: AssetCondition.GOOD
    },
    {
      id: 'AST010', assetTag: 'HW-MON-002', name: 'LG 27UK850-W', type: AssetType.HARDWARE,
      category: 'Monitor', subCategory: '4K', status: AssetStatus.ALLOCATED,
      assignedTo: 'USR005', assignedToName: 'Ananya Desai', department: 'Engineering', team: 'Frontend',
      location: 'Hyderabad - Floor 3', purchaseDate: '2024-05-10', warrantyExpiry: '2027-05-10',
      vendor: 'LG Electronics', serialNumber: 'LG27-HYD-002', cost: 38000,
      condition: AssetCondition.GOOD
    },
    {
      id: 'AST011', assetTag: 'HW-LAP-005', name: 'Dell Inspiron 15', type: AssetType.HARDWARE,
      category: 'Laptop', subCategory: 'Standard', status: AssetStatus.AVAILABLE,
      location: 'Chennai - Store', purchaseDate: '2024-10-01', warrantyExpiry: '2027-10-01',
      vendor: 'Dell Technologies', serialNumber: 'DI15-CHN-001', cost: 55000,
      condition: AssetCondition.NEW, specifications: 'i5-1235U, 8GB RAM, 256GB SSD'
    },
    {
      id: 'AST012', assetTag: 'FR-DSK-001', name: 'Standing Desk Motorized', type: AssetType.FURNITURE,
      category: 'Desk', subCategory: 'Motorized', status: AssetStatus.AVAILABLE,
      location: 'Hyderabad - Store', purchaseDate: '2024-07-15', warrantyExpiry: '2029-07-15',
      vendor: 'Featherlite', serialNumber: 'FL-DSK-HYD-001', cost: 28000,
      condition: AssetCondition.NEW
    },
    {
      id: 'AST013', assetTag: 'PR-MSE-001', name: 'Logitech MX Master 3S', type: AssetType.PERIPHERAL,
      category: 'Mouse', subCategory: 'Wireless', status: AssetStatus.ALLOCATED,
      assignedTo: 'USR005', assignedToName: 'Ananya Desai', department: 'Engineering', team: 'Frontend',
      location: 'Hyderabad - Floor 3', purchaseDate: '2024-03-15', warrantyExpiry: '2026-03-15',
      vendor: 'Logitech', serialNumber: 'LMX-MSE-001', cost: 7500,
      condition: AssetCondition.GOOD
    },
    {
      id: 'AST014', assetTag: 'SW-LIC-003', name: 'Adobe Creative Cloud', type: AssetType.SOFTWARE,
      category: 'Design Tools', subCategory: 'License', status: AssetStatus.AVAILABLE,
      location: 'Cloud', purchaseDate: '2024-01-01', warrantyExpiry: '2025-12-31',
      vendor: 'Adobe', serialNumber: 'ACC-LIC-003', cost: 35000,
      condition: AssetCondition.GOOD
    },
    {
      id: 'AST015', assetTag: 'HW-LAP-006', name: 'MacBook Air M2', type: AssetType.HARDWARE,
      category: 'Laptop', subCategory: 'Standard', status: AssetStatus.RETIRED,
      location: 'Hyderabad - Store', purchaseDate: '2022-01-10', warrantyExpiry: '2025-01-10',
      vendor: 'Apple Inc.', serialNumber: 'MBA-M2-HYD-001', cost: 125000,
      condition: AssetCondition.POOR
    }
  ];

  private categories: AssetCategory[] = [
    { id: 'CAT001', name: 'Laptop', type: AssetType.HARDWARE, subCategories: ['Standard', 'Business', 'Premium', 'Ultra-Premium'], icon: 'laptop_mac' },
    { id: 'CAT002', name: 'Monitor', type: AssetType.HARDWARE, subCategories: ['FHD', '4K', 'Ultra-wide'], icon: 'desktop_windows' },
    { id: 'CAT003', name: 'Desktop', type: AssetType.HARDWARE, subCategories: ['Workstation', 'Standard'], icon: 'computer' },
    { id: 'CAT004', name: 'Productivity Suite', type: AssetType.SOFTWARE, subCategories: ['License', 'Subscription'], icon: 'apps' },
    { id: 'CAT005', name: 'Development Tools', type: AssetType.SOFTWARE, subCategories: ['IDE License', 'Platform License'], icon: 'code' },
    { id: 'CAT006', name: 'Design Tools', type: AssetType.SOFTWARE, subCategories: ['License', 'Subscription'], icon: 'brush' },
    { id: 'CAT007', name: 'Router', type: AssetType.NETWORK, subCategories: ['Enterprise', 'Standard'], icon: 'router' },
    { id: 'CAT008', name: 'Switch', type: AssetType.NETWORK, subCategories: ['Managed', 'Unmanaged'], icon: 'device_hub' },
    { id: 'CAT009', name: 'Keyboard', type: AssetType.PERIPHERAL, subCategories: ['Wired', 'Wireless', 'Mechanical'], icon: 'keyboard' },
    { id: 'CAT010', name: 'Mouse', type: AssetType.PERIPHERAL, subCategories: ['Wired', 'Wireless'], icon: 'mouse' },
    { id: 'CAT011', name: 'Desk', type: AssetType.FURNITURE, subCategories: ['Standard', 'Motorized', 'Standing'], icon: 'table_restaurant' },
    { id: 'CAT012', name: 'Chair', type: AssetType.FURNITURE, subCategories: ['Standard', 'Ergonomic', 'Executive'], icon: 'chair' }
  ];

  // constructor(private hs: HeroService) {}

  // Stores raw asset detail records from Getassetdetails (for "Provide Asset" dropdown)
  private assetDetailRecords: any[] = [];

  /**
   * Fetches asset details from the Cordys SOAP service (Getassetdetails).
   * Used for the "Provide Asset" dropdown — returns lightweight asset records.
   */
  async fetchAssetDetailsFromService(): Promise<any[]> {
    const soapRequest = `
<SOAP:Envelope xmlns:SOAP="http://schemas.xmlsoap.org/soap/envelope/">
  <SOAP:Body>
    <Getassetdetails xmlns="http://schemas.cordys.com/AMS_Database_Metadata" preserveSpace="no" qAccess="0" qValues="" />
  </SOAP:Body>
</SOAP:Envelope>`.trim();

    try {
      const response = await this.hs.ajax(null, null, {}, soapRequest);
      const tuples = this.hs.xmltojson(response, 'tuple');

      if (!tuples) {
        console.warn('No tuples found in Getassetdetails response');
        this.assetDetailRecords = [];
        return [];
      }

      const tupleArray = Array.isArray(tuples) ? tuples : [tuples];

      this.assetDetailRecords = tupleArray.map((tuple: any) => {
        const data = tuple?.old?.m_assets || tuple?.m_assets || tuple;
        return {
          asset_id: data?.asset_id || '',
          asset_name: data?.asset_name || '',
          type_id: data?.type_id || '',
          sub_category_id: data?.sub_category_id || '',
          serial_number: this.getNullableValue(data?.serial_number) || '',
          purchase_date: data?.purchase_date || '',
          warranty_expiry: data?.warranty_expiry || '',
          status: data?.status || ''
        };
      });

      console.log(`Fetched ${this.assetDetailRecords.length} asset details from Getassetdetails`);
      return [...this.assetDetailRecords];
    } catch (err) {
      console.error('Failed to fetch asset details from Getassetdetails:', err);
      throw err;
    }
  }

  /**
   * Returns the stored asset detail records from the last Getassetdetails call.
   */
  getAssetDetailRecords(): any[] {
    return [...this.assetDetailRecords];
  }

  /**
   * Finds a specific asset detail record by asset_id.
   */
  getAssetDetailById(assetId: string): any | undefined {
    return this.assetDetailRecords.find(a => a.asset_id === assetId);
  }

   /**
    * Fetches allocated asset details from the Cordys SOAP service (Getallocatedasset).
    */
   async fetchAllocatedAssetsFromService(): Promise<any[]> {
     const soapRequest = `
 <SOAP:Envelope xmlns:SOAP="http://schemas.xmlsoap.org/soap/envelope/">
   <SOAP:Body>
     <Getallocatedasset xmlns="http://schemas.cordys.com/AMS_Database_Metadata" preserveSpace="no" qAccess="0" qValues="" />
   </SOAP:Body>
 </SOAP:Envelope>`.trim();
 
     try {
       const response = await this.hs.ajax(null, null, {}, soapRequest);
       const tuples = this.hs.xmltojson(response, 'tuple');
 
       if (!tuples) {
         console.warn('No tuples found in Getallocatedasset response');
         return [];
       }
 
       const tupleArray = Array.isArray(tuples) ? tuples : [tuples];
 
       const allocatedAssets = tupleArray.map((tuple: any) => {
         const data = tuple?.old?.m_assets || tuple?.m_assets || tuple;
         return {
           asset_id: data?.asset_id || '',
           asset_name: data?.asset_name || '',
           type_id: data?.type_id || '',
           sub_category_id: data?.sub_category_id || '',
           serial_number: this.getNullableValue(data?.serial_number) || '',
           purchase_date: data?.purchase_date || '',
           warranty_expiry: data?.warranty_expiry || '',
           status: data?.status || ''
         };
       });
 
       console.log(`Fetched ${allocatedAssets.length} allocated assets from Getallocatedasset`);
       return allocatedAssets;
     } catch (err) {
       console.error('Failed to fetch allocated assets from Getallocatedasset:', err);
       throw err;
     }
   }
 
   /**
    * Fetches asset counts grouped by type from the Cordys SOAP service (GetAssetTypeWiseCount).
    * Returns: [{ type_id, type_name, asset_count }]
   */
  async fetchAssetTypeWiseCount(): Promise<any[]> {
    const soapRequest = `
<SOAP:Envelope xmlns:SOAP="http://schemas.xmlsoap.org/soap/envelope/">
  <SOAP:Body>
    <GetAssetTypeWiseCount xmlns="http://schemas.cordys.com/AMS_Database_Metadata" preserveSpace="no" qAccess="0" qValues="" />
  </SOAP:Body>
</SOAP:Envelope>`.trim();

    try {
      const response = await this.hs.ajax(null, null, {}, soapRequest);
      const tuples = this.hs.xmltojson(response, 'tuple');

      if (!tuples) {
        console.warn('No tuples found in GetAssetTypeWiseCount response');
        return [];
      }

      const tupleArray = Array.isArray(tuples) ? tuples : [tuples];

      const result = tupleArray.map((tuple: any) => {
        const data = tuple?.old?.m_asset_types || tuple?.m_asset_types || tuple;
        return {
          type_id: data?.type_id || '',
          type_name: data?.type_name || '',
          asset_count: parseInt(data?.asset_count, 10) || 0
        };
      });

      console.log(`Fetched ${result.length} type-wise counts from GetAssetTypeWiseCount`);
      return result;
    } catch (err) {
      console.error('Failed to fetch asset type-wise count:', err);
      throw err;
    }
  }

  /**
   * Fetches dashboard data from the Cordys SOAP service (GetDashboardData).
   * Returns sub-category counts: [{ name, asset_count }]
   * The caller can aggregate by type on the frontend.
   */
  async fetchDashboardData(): Promise<{ name: string; asset_count: number }[]> {
    const soapRequest = `
<SOAP:Envelope xmlns:SOAP="http://schemas.xmlsoap.org/soap/envelope/">
  <SOAP:Body>
    <GetDashboardData xmlns="http://schemas.cordys.com/AMS_Database_Metadata" preserveSpace="no" qAccess="0" qValues="" />
  </SOAP:Body>
</SOAP:Envelope>`.trim();

    try {
      const response = await this.hs.ajax(null, null, {}, soapRequest);
      const tuples = this.hs.xmltojson(response, 'tuple');

      if (!tuples) {
        console.warn('No tuples found in GetDashboardData response');
        return [];
      }

      const tupleArray = Array.isArray(tuples) ? tuples : [tuples];

      const result = tupleArray.map((tuple: any) => {
        const data = tuple?.old?.m_asset_subcategories || tuple?.m_asset_subcategories || tuple;
        return {
          name: data?.name || '',
          asset_count: parseInt(data?.asset_count, 10) || 0
        };
      });

      console.log(`Fetched ${result.length} subcategory counts from GetDashboardData`, result);
      return result;
    } catch (err) {
      console.error('Failed to fetch dashboard data from GetDashboardData:', err);
      throw err;
    }
  }

  /**
   * Fetches software subcategory counts from the Cordys SOAP service (GetSoftwareTypeData).
   * Returns: [{ name, asset_count }]
   */
  async fetchSoftwareTypeData(): Promise<{ name: string; asset_count: number }[]> {
    const soapRequest = `
<SOAP:Envelope xmlns:SOAP="http://schemas.xmlsoap.org/soap/envelope/">
  <SOAP:Body>
    <GetSoftwareTypeData xmlns="http://schemas.cordys.com/AMS_Database_Metadata" preserveSpace="no" qAccess="0" qValues="" />
  </SOAP:Body>
</SOAP:Envelope>`.trim();

    try {
      const response = await this.hs.ajax(null, null, {}, soapRequest);
      const tuples = this.hs.xmltojson(response, 'tuple');

      if (!tuples) {
        console.warn('No tuples found in GetSoftwareTypeData response');
        return [];
      }

      const tupleArray = Array.isArray(tuples) ? tuples : [tuples];

      const result = tupleArray.map((tuple: any) => {
        const data = tuple?.old?.m_asset_subcategories || tuple?.m_asset_subcategories || tuple;
        return {
          name: data?.name || '',
          asset_count: parseInt(data?.asset_count, 10) || 0
        };
      });

      console.log(`Fetched ${result.length} software subcategory counts from GetSoftwareTypeData`, result);
      return result;
    } catch (err) {
      console.error('Failed to fetch software type data from GetSoftwareTypeData:', err);
      throw err;
    }
  }

  /**
   * Fetches all asset details from the Cordys SOAP service (Getallassetdetails).
   * Parses the XML/JSON response and maps each tuple into the Asset model.
   */
  async fetchAssetsFromService(): Promise<Asset[]> {
    const soapRequest = `
<SOAP:Envelope xmlns:SOAP="http://schemas.xmlsoap.org/soap/envelope/">
  <SOAP:Body>
    <Getallassetdetails xmlns="http://schemas.cordys.com/AMS_Database_Metadata" preserveSpace="no" qAccess="0" qValues="" />
  </SOAP:Body>
</SOAP:Envelope>`.trim();

    try {
      const response = await this.hs.ajax(null, null, {}, soapRequest);
      const tuples = this.hs.xmltojson(response, 'tuple');

      if (!tuples) {
        console.warn('No tuples found in Getallassetdetails response');
        this.assets = [];
        this.assetsLoaded = true;
        return [];
      }

      // Ensure tuples is always an array (single result comes as object)
      const tupleArray = Array.isArray(tuples) ? tuples : [tuples];

      this.assets = tupleArray.map((tuple: any) => this.mapTupleToAsset(tuple));
      this.assetsLoaded = true;

      console.log(`Fetched ${this.assets.length} assets from service`);
      return [...this.assets];
    } catch (err) {
      console.error('Failed to fetch assets from Getallassetdetails:', err);
      throw err;
    }
  }

  /**
   * Maps a single tuple from the SOAP response to the Asset interface.
   * The response structure is: tuple > old > m_assets
   */
  private mapTupleToAsset(tuple: any): Asset {
    const assetData = tuple?.old?.m_assets || tuple?.m_assets || tuple;

    // Extract nested type info
    const typeInfo = assetData?.m_asset_types || {};
    const subCatInfo = assetData?.m_asset_subcategories || {};

    // Map type_name to AssetType enum
    const typeName = typeInfo?.type_name || '';
    const assetType = this.mapToAssetType(typeName);

    // Map status string to AssetStatus enum
    const statusStr = assetData?.status || '';
    const assetStatus = this.mapToAssetStatus(statusStr);

    return {
      id: assetData?.asset_id || '',
      assetTag: assetData?.asset_id || '',
      name: assetData?.asset_name || '',
      type: assetType,
      category: subCatInfo?.name || '',
      subCategory: subCatInfo?.name || '',
      status: assetStatus,
      assignedTo: this.getNullableValue(assetData?.assigned_to),
      assignedToName: this.getNullableValue(assetData?.assigned_to_name),
      department: this.getNullableValue(assetData?.department),
      team: this.getNullableValue(assetData?.team),
      location: this.getNullableValue(assetData?.location) || '',
      purchaseDate: assetData?.purchase_date || '',
      warrantyExpiry: assetData?.warranty_expiry || '',
      vendor: this.getNullableValue(assetData?.vendor) || '',
      serialNumber: this.getNullableValue(assetData?.serial_number) || '',
      specifications: this.getNullableValue(assetData?.specifications),
      cost: parseFloat(assetData?.cost) || 0,
      condition: this.mapToAssetCondition(this.getNullableValue(assetData?.condition) || 'Good'),
      notes: this.getNullableValue(assetData?.notes)
    };
  }

  /**
   * Handles null/xsi:nil values from the SOAP response.
   * Returns undefined if the value is null/nil/empty object.
   */
  private getNullableValue(value: any): string | undefined {
    if (value === null || value === undefined) return undefined;
    if (typeof value === 'object' && value !== null) {
      // xsi:nil="true" values come as objects with null attribute
      if (value['@nil'] === 'true' || value['@null'] === 'true') return undefined;
      return undefined;
    }
    if (typeof value === 'string' && value.trim() === '') return undefined;
    return String(value);
  }

  private mapToAssetType(typeName: string): AssetType {
    const normalized = typeName.toLowerCase();
    if (normalized.includes('hardware')) return AssetType.HARDWARE;
    if (normalized.includes('software')) return AssetType.SOFTWARE;
    if (normalized.includes('network')) return AssetType.NETWORK;
    if (normalized.includes('peripheral')) return AssetType.PERIPHERAL;
    if (normalized.includes('furniture')) return AssetType.FURNITURE;
    return AssetType.HARDWARE; // default fallback
  }

  private mapToAssetStatus(status: string): AssetStatus {
    const normalized = status.toLowerCase();
    if (normalized.includes('available')) return AssetStatus.AVAILABLE;
    if (normalized.includes('allocated')) return AssetStatus.ALLOCATED;
    if (normalized.includes('repair')) return AssetStatus.IN_REPAIR;
    if (normalized.includes('retired')) return AssetStatus.RETIRED;
    if (normalized.includes('reserved')) return AssetStatus.RESERVED;
    return AssetStatus.AVAILABLE; // default fallback
  }

  private mapToAssetCondition(condition: string): AssetCondition {
    const normalized = condition.toLowerCase();
    if (normalized.includes('new')) return AssetCondition.NEW;
    if (normalized.includes('good')) return AssetCondition.GOOD;
    if (normalized.includes('fair')) return AssetCondition.FAIR;
    if (normalized.includes('poor')) return AssetCondition.POOR;
    if (normalized.includes('damaged')) return AssetCondition.DAMAGED;
    return AssetCondition.GOOD; // default fallback
  }

  getAssets(): Asset[] {
    return [...this.assets];
  }

  isLoaded(): boolean {
    return this.assetsLoaded;
  }

  getAssetById(id: string): Asset | undefined {
    return this.assets.find(a => a.id === id);
  }

  getAssetsByUser(userId: string): Asset[] {
    return this.assets.filter(a => a.assignedTo === userId);
  }

  async getAssetsByUserIdFromCordys(userId: string): Promise<Asset[]> {
    const soapRequest = `
<SOAP:Envelope xmlns:SOAP="http://schemas.xmlsoap.org/soap/envelope/">
  <SOAP:Body>
    <GetAllocationBasedOnUser xmlns="http://schemas.cordys.com/AMS_Database_Metadata" preserveSpace="no" qAccess="0" qValues="">
      <userId>${userId}</userId>
    </GetAllocationBasedOnUser>
  </SOAP:Body>
</SOAP:Envelope>`.trim();

    try {
      const resp = await this.hs.ajax(null, null, {}, soapRequest);

      // We look for multiple possible tags based on common Cordys patterns
      let data = this.hs.xmltojson(resp, 'ts_asset_allocation') ||
        this.hs.xmltojson(resp, 'GetAllocationBasedOnUser') ||
        this.hs.xmltojson(resp, 'tuple') ||
        this.hs.xmltojson(resp, 'm_assets') ||
        this.hs.xmltojson(resp, 'objects');

      if (!data) return [];

      if (!Array.isArray(data)) data = [data];

      const assetPromises = data.map(async (item: any) => {
        // Deep extract if nested in tuple/new/old (Cordys DB metadata pattern)
        const row = item.new ? item.new : (item.old ? item.old : item);
        const actualItem = row.ts_asset_allocation || row.t_asset_allocations || row.GetAllocationBasedOnUser || row;

        // Try all common variations of ID
        const assetId = actualItem.Asset_id || actualItem.asset_id || actualItem.id || actualItem.AssetId;

        // Extract the allocation date from the allocation table (ts_asset_allocations)
        const allocationDate = actualItem.assigned_date || actualItem.Assigned_date || actualItem.Assign_date || actualItem.assign_date;

        console.log('[AssetService Debug] Processing allocation item:', actualItem);

        // If the allocation entry is missing basic details, fetch the full asset object from m_assets
        if ((!actualItem.Asset_name && !actualItem.asset_name && !actualItem.name) && assetId) {
          console.log(`[AssetService Debug] Fetching details for Asset ID: ${assetId}`);
          const detailedAsset = await this.getAssetDetails(assetId);
          if (detailedAsset) {
            console.log('[AssetService Debug] Detailed asset fetched:', detailedAsset);
            // Merge allocation info with asset details, ensuring allocation date wins
            return {
              ...detailedAsset,
              assignedTo: actualItem.User_id || actualItem.user_id || actualItem.assignedTo || userId,
              purchaseDate: allocationDate || detailedAsset.purchaseDate
            };
          }
        }

        return {
          id: assetId || `AST-${Math.random().toString(36).substring(2, 11)}`,
          assetTag: actualItem.Asset_tag || actualItem.asset_tag || actualItem.assetTag || 'N/A',
          name: actualItem.Asset_name || actualItem.asset_name || actualItem.name || 'Unknown Asset',
          type: (actualItem.Asset_type || actualItem.asset_type || actualItem.type) as AssetType || AssetType.HARDWARE,
          category: actualItem.Category || actualItem.category || 'N/A',
          subCategory: actualItem.Sub_category || actualItem.sub_category || actualItem.subCategory || 'N/A',
          status: AssetStatus.ALLOCATED,
          assignedTo: actualItem.User_id || actualItem.user_id || actualItem.assignedTo || userId,
          assignedToName: actualItem.User_name || actualItem.user_name || actualItem.assignedToName || '',
          location: actualItem.Location || actualItem.location || 'N/A',
          purchaseDate: allocationDate || actualItem.Purchase_date || actualItem.purchase_date || actualItem.purchaseDate || '',
          warrantyExpiry: actualItem.Warranty_expiry || actualItem.warranty_expiry || actualItem.warrantyExpiry || '',
          vendor: actualItem.Vendor || actualItem.vendor || actualItem.vendor || 'N/A',
          serialNumber: actualItem.Serial_number || actualItem.serial_number || actualItem.serialNumber || 'N/A',
          cost: Number(actualItem.Cost || actualItem.cost || 0),
          condition: (actualItem.Condition || actualItem.condition) as AssetCondition || AssetCondition.GOOD,
          specifications: actualItem.Specifications || actualItem.specifications || ''
        };
      });

      return Promise.all(assetPromises);
    } catch (error) {
      console.error('Error fetching assets from Cordys:', error);
      return [];
    }
  }

  async getAssetDetails(assetId: string): Promise<Asset | null> {
    const soapRequest = `
<SOAP:Envelope xmlns:SOAP="http://schemas.xmlsoap.org/soap/envelope/">
  <SOAP:Body>
    <GetM_assetsObject xmlns="http://schemas.cordys.com/AMS_Database_Metadata" preserveSpace="no" qAccess="0" qValues="">
      <Asset_id>${assetId}</Asset_id>
    </GetM_assetsObject>
  </SOAP:Body>
</SOAP:Envelope>`.trim();

    try {
      const resp = await this.hs.ajax(null, null, {}, soapRequest);
      const data = this.hs.xmltojson(resp, 'm_assets') || this.hs.xmltojson(resp, 'GetM_assetsObject');
      if (!data) return null;

      const row = data.new ? data.new : (data.old ? data.old : data);
      const item = row.m_assets || row;

      let typeName = item.Asset_type || item.asset_type || item.type || 'Hardware';

      return {
        id: item.Asset_id || item.asset_id || item.id,
        assetTag: item.Asset_tag || item.asset_tag || item.assetTag || 'N/A',
        name: item.Asset_name || item.asset_name || item.name || 'Unknown Asset',
        type: typeName as AssetType,
        category: item.Category || item.category || 'N/A',
        subCategory: item.Sub_category || item.sub_category || item.subCategory || 'N/A',
        status: (item.Status || item.status) as AssetStatus || AssetStatus.ALLOCATED,
        location: item.Location || item.location || 'N/A',
        purchaseDate: item.Purchase_date || item.purchase_date || item.purchaseDate || '',
        warrantyExpiry: item.Warranty_expiry || item.warranty_expiry || item.warrantyExpiry || '',
        vendor: item.Vendor || item.vendor || 'N/A',
        serialNumber: item.Serial_number || item.serial_number || item.serialNumber || 'N/A',
        cost: Number(item.Cost || item.cost || 0),
        condition: (item.Condition || item.condition) as AssetCondition || AssetCondition.GOOD,
        specifications: item.Specifications || item.specifications || ''
      };
    } catch (error) {
      console.error('Error fetching asset details:', error);
      return null;
    }
  }

  async getAssetTypeDetails(typeId: string): Promise<string> {
    const soapRequest = `
<SOAP:Envelope xmlns:SOAP="http://schemas.xmlsoap.org/soap/envelope/">
  <SOAP:Body>
    <GetM_asset_typesObject xmlns="http://schemas.cordys.com/AMS_Database_Metadata" preserveSpace="no" qAccess="0" qValues="">
      <Type_id>${typeId}</Type_id>
    </GetM_asset_typesObject>
  </SOAP:Body>
</SOAP:Envelope>`.trim();

    try {
      const resp = await this.hs.ajax(null, null, {}, soapRequest);
      const data = this.hs.xmltojson(resp, 'm_asset_types') || this.hs.xmltojson(resp, 'GetM_asset_typesObject');
      if (!data) return typeId;

      const row = data.new ? data.new : (data.old ? data.old : data);
      const item = row.m_asset_types || row;
      return item.type_name || item.name || typeId;
    } catch (error) {
      console.error('Error fetching asset type details:', error);
      return typeId;
    }
  }

  async getAllAssetTypesCordys(): Promise<any[]> {
    const soapRequest = `
<SOAP:Envelope xmlns:SOAP="http://schemas.xmlsoap.org/soap/envelope/">
  <SOAP:Body>
    <GetAllAssetTypes xmlns="http://schemas.cordys.com/AMS_Database_Metadata" preserveSpace="no" qAccess="0" qValues="" />
  </SOAP:Body>
</SOAP:Envelope>`.trim();

    try {
      const resp = await this.hs.ajax(null, null, {}, soapRequest);
      console.log('[AssetService Debug] Raw Types response:', resp);
      let data = this.hs.xmltojson(resp, 'm_asset_types') ||
        this.hs.xmltojson(resp, 'GetAllAssetTypes') ||
        this.hs.xmltojson(resp, 'tuple') ||
        this.hs.xmltojson(resp, 'Type') ||
        this.hs.xmltojson(resp, 'm_asset_type');
      if (!data) return [];
      if (!Array.isArray(data)) data = [data];
      return data.map((item: any) => {
        const row = item.new ? item.new : (item.old ? item.old : item);
        // Extract inner table object if present
        const tableObj = row.m_asset_types || row.m_asset_type || row.Type || row;
        return tableObj;
      });
    } catch (error) {
      console.error('Error fetching asset types from Cordys:', error);
      return [];
    }
  }

  async getAllCategoriesCordys(): Promise<any[]> {
    const soapRequest = `
<SOAP:Envelope xmlns:SOAP="http://schemas.xmlsoap.org/soap/envelope/">
  <SOAP:Body>
    <GetAllAssets xmlns="http://schemas.cordys.com/AMS_Database_Metadata" preserveSpace="no" qAccess="0" qValues="" />
  </SOAP:Body>
</SOAP:Envelope>`.trim();

    try {
      const resp = await this.hs.ajax(null, null, {}, soapRequest);
      console.log('[AssetService Debug] Raw Categories/Assets response:', resp);
      let data = this.hs.xmltojson(resp, 'm_assets') ||
        this.hs.xmltojson(resp, 'GetAllAssets') ||
        this.hs.xmltojson(resp, 'tuple') ||
        this.hs.xmltojson(resp, 'Asset') ||
        this.hs.xmltojson(resp, 'm_asset');
      if (!data) return [];
      if (!Array.isArray(data)) data = [data];
      return data.map((item: any) => {
        const row = item.new ? item.new : (item.old ? item.old : item);
        const tableObj = row.m_assets || row.m_asset || row.Asset || row;
        return tableObj;
      });
    } catch (error) {
      console.error('Error fetching categories from Cordys:', error);
      return [];
    }
  }

  async getAllSubcategoriesCordys(): Promise<any[]> {
    const soapRequest = `
<SOAP:Envelope xmlns:SOAP="http://schemas.xmlsoap.org/soap/envelope/">
  <SOAP:Body>
    <GetAllAssetSubcategories xmlns="http://schemas.cordys.com/AMS_Database_Metadata" preserveSpace="no" qAccess="0" qValues="" />
  </SOAP:Body>
</SOAP:Envelope>`.trim();

    try {
      const resp = await this.hs.ajax(null, null, {}, soapRequest);
      console.log('[AssetService Debug] Raw Subcategories response:', resp);
      let data = this.hs.xmltojson(resp, 'm_asset_subcategories') ||
        this.hs.xmltojson(resp, 'm_asset_subcategory') ||
        this.hs.xmltojson(resp, 'GetAllAssetSubcategories') ||
        this.hs.xmltojson(resp, 'tuple') ||
        this.hs.xmltojson(resp, 'Subcategory');
      if (!data) return [];
      if (!Array.isArray(data)) data = [data];
      return data.map((item: any) => {
        const row = item.new ? item.new : (item.old ? item.old : item);
        const tableObj = row.m_asset_subcategories || row.m_asset_subcategory || row.Subcategory || row.Sub_category || row;
        return tableObj;
      });
    } catch (error) {
      console.error('Error fetching sub-categories from Cordys:', error);
      return [];
    }
  }

  getAssetsByType(type: AssetType): Asset[] {
    return this.assets.filter(a => a.type === type);
  }

  getAssetsByStatus(status: AssetStatus): Asset[] {
    return this.assets.filter(a => a.status === status);
  }

  getAssetsByDepartment(department: string): Asset[] {
    return this.assets.filter(a => a.department === department);
  }

  getAssetsByTeam(team: string): Asset[] {
    return this.assets.filter(a => a.team === team);
  }

  getCategories(): AssetCategory[] {
    return [...this.categories];
  }

  getCategoriesByType(type: AssetType): AssetCategory[] {
    return this.categories.filter(c => c.type === type);
  }

  addAsset(asset: Asset): void {
    this.assets.push(asset);
  }

  updateAsset(updated: Asset): void {
    const idx = this.assets.findIndex(a => a.id === updated.id);
    if (idx >= 0) this.assets[idx] = updated;
  }

  deleteAsset(id: string): void {
    this.assets = this.assets.filter(a => a.id !== id);
  }

  getAssetStats() {
    return {
      total: this.assets.length,
      available: this.assets.filter(a => a.status === AssetStatus.AVAILABLE).length,
      allocated: this.assets.filter(a => a.status === AssetStatus.ALLOCATED).length,
      inRepair: this.assets.filter(a => a.status === AssetStatus.IN_REPAIR).length,
      retired: this.assets.filter(a => a.status === AssetStatus.RETIRED).length,
      totalValue: this.assets.reduce((sum, a) => sum + a.cost, 0),
      byType: Object.values(AssetType).map(type => ({
        type,
        count: this.assets.filter(a => a.type === type).length,
        value: this.assets.filter(a => a.type === type).reduce((s, a) => s + a.cost, 0)
      })),
      byCategory: this.categories.map(cat => ({
        category: cat.name,
        type: cat.type,
        count: this.assets.filter(a => a.category === cat.name).length
      })),
      warrantyExpiringSoon: this.assets.filter(a => {
        const expiry = new Date(a.warrantyExpiry);
        const now = new Date();
        const diff = expiry.getTime() - now.getTime();
        return diff > 0 && diff < 90 * 24 * 60 * 60 * 1000;
      }).length
    };
  }

  getTeamWiseHolding() {
    const teamMap = new Map<string, { department: string; team: string; count: number; value: number }>();
    this.assets.filter(a => a.team).forEach(a => {
      const key = `${a.department}-${a.team}`;
      if (!teamMap.has(key)) {
        teamMap.set(key, { department: a.department!, team: a.team!, count: 0, value: 0 });
      }
      const entry = teamMap.get(key)!;
      entry.count++;
      entry.value += a.cost;
    });
    return Array.from(teamMap.values());
  }
}
