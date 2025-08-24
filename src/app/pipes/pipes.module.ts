import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SafeDatePipe } from './safe-date.pipe';

@NgModule({
  imports: [
    CommonModule,
    SafeDatePipe
  ],
  exports: [
    SafeDatePipe
  ]
})
export class PipesModule { }
