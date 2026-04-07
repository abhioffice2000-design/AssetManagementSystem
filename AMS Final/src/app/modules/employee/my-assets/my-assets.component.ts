import { Component, OnInit } from '@angular/core';
import { AssetService } from '../../../core/services/asset.service';
import { AuthService } from '../../../core/services/auth.service';
import { Asset } from '../../../core/models/asset.model';

@Component({
  selector: 'app-my-assets',
  templateUrl: './my-assets.component.html',
  styleUrls: ['./my-assets.component.scss']
})
export class MyAssetsComponent implements OnInit {
  myAssets: Asset[] = [];

  constructor(
    private authService: AuthService,
    private assetService: AssetService
  ) {}

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    this.myAssets = this.assetService.getAssetsByUser(user.id);
  }

  isExpiringSoon(dateStr: string): boolean {
    const expiry = new Date(dateStr);
    const now = new Date();
    const diff = expiry.getTime() - now.getTime();
    return diff > 0 && diff < 90 * 24 * 60 * 60 * 1000;
  }
}
