import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, IonicModule, RouterModule],
  template: `
    <ion-header [translucent]="true">
      <ion-toolbar class="raimake-bar">
        <ion-buttons slot="start">
          <ion-menu-button *ngIf="showMenuButton" auto-hide="false"></ion-menu-button>
        </ion-buttons>
        <ion-title>
          <div class="header-brand">
            <img src="assets/img/logo1.png" class="logo-home" alt="byRaiMakes">
            <div class="header-brand-text">
              <span class="brand-name"><span class="brand-pink">byRai</span><span class="brand-gold">Makes</span></span>
              <span class="header-tagline">SUA BELEZA. SEU GLOW.</span>
            </div>
          </div>
        </ion-title>
        <ion-buttons slot="end">
          <ion-button *ngIf="showAdminButton" fill="clear" (click)="adminClick.emit()" class="admin-btn">
            <ion-icon name="shield-checkmark-outline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
  `,
  styles: [`
    .raimake-bar {
      --background: #ffffff;
      --border-color: #f5f5f5;
      border-bottom: 1px solid var(--border-color);
    }
    .header-brand {
      display: flex;
      flex-direction: row;
      align-items: center;
      gap: 8px;
    }
    .header-brand-text {
      display: flex;
      flex-direction: column;
      gap: 0;
      white-space: nowrap;
    }
    .brand-name {
      font-family: 'Cormorant Garamond', serif;
      font-size: 15px;
      font-weight: 600;
      line-height: 1.1;
    }
    .brand-pink { color: #e884b0; }
    .brand-gold { color: #d4a93f; }
    .header-tagline {
      font-size: 8px;
      letter-spacing: 1px;
      color: #a88698;
      font-weight: 500;
      line-height: 1;
      white-space: nowrap;
    }
    .logo-home { height: 24px; border-radius: 4px; display: block; flex-shrink: 0; }
    .admin-btn { color: #e884b0; }
  `]
})
export class HeaderComponent {
  @Input() showMenuButton = true;
  @Input() showAdminButton = false;
  @Output() adminClick = new EventEmitter<void>();
}