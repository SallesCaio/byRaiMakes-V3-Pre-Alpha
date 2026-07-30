import { NgModule, NO_ERRORS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { AgendePageRoutingModule } from './agende-routing.module';
import { AgendePage } from './agende.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    AgendePageRoutingModule
  ],
  declarations: [AgendePage],
  schemas: [NO_ERRORS_SCHEMA]
})
export class AgendePageModule {}