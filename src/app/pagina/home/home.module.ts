import { NgModule, NO_ERRORS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { HomePageRoutingModule } from './home-routing.module';
import { HomePage } from './home.page';
import { HeaderComponent } from '../../shared/components/header/header.component';
import { BottomNavComponent } from '../../shared/components/bottom-nav/bottom-nav.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    HomePageRoutingModule,
    HeaderComponent,
    BottomNavComponent,
    HomePage
  ],
  schemas: [NO_ERRORS_SCHEMA]
})
export class HomePageModule {}