import { Component, OnInit } from '@angular/core';
import { AssetService } from '../../../core/services/asset.service';
import { Asset } from '../../../core/models/asset.model';

@Component({
  selector: 'app-allocation-inventory',
  templateUrl: './inventory.component.html',
  styleUrls: ['./inventory.component.scss']
})
export class AllocationInventoryComponent implements OnInit {
  assets: Asset[] = [];
  loading = true;

  constructor(private assetService: AssetService) {}

  ngOnInit(): void {
    this.assets = this.assetService.getAssets();
    this.loading = false;
  }
}
