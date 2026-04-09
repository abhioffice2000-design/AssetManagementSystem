import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { Asset, AssetType, AssetStatus, AssetCondition, AssetCategory } from '../models/asset.model';
import { HeroService } from './hero.service';

declare var $: any;

@Injectable({ providedIn: 'root' })
export class AssetService {
  private assets: Asset[] = [];
  private assetsLoaded = false;

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

  constructor(private hs: HeroService) {}

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
