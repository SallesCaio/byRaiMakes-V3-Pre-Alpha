import { NgModule, NO_ERRORS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { AgendePageRoutingModule } from './agende-routing.module';
import { AgendePage } from './agende.page';
import { HeaderComponent } from '../../shared/components/header/header.component';
import { BottomNavComponent } from '../../shared/components/bottom-nav/bottom-nav.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    AgendePageRoutingModule,
    HeaderComponent,
    BottomNavComponent,
    AgendePage
  ],
  schemas: [NO_ERRORS_SCHEMA]
})
export class AgendePageModule {}