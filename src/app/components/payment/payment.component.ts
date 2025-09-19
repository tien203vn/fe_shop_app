// src/app/components/payment/payment.component.ts
import { Component } from '@angular/core';
import { PayosService, PaymentRequest } from '../../services/payos.service';
import { Router } from '@angular/router';
import { CommonModule,CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
@Component({
  selector: 'app-payment',
  templateUrl: './payment.component.html',
  styleUrls: ['./payment.component.css'],
  providers: [CurrencyPipe]
})
export class PaymentComponent {
  loading = false;
  paymentForm = {
    amount: 50000,
    description: 'Thanh toán đơn hàng',
    customerName: '',
    customerEmail: '',
    items: [
      {
        name: 'Sản phẩm demo',
        quantity: 1,
        price: 50000
      }
    ]
  };

  constructor(
    private payosService: PayosService,
    private router: Router
  ) {}

  createPayment() {
    this.loading = true;
    
    const orderCode = Date.now(); // Tạo mã đơn hàng unique
    
    const paymentRequest: PaymentRequest = {
      orderCode: orderCode,
      amount: this.paymentForm.amount,
      description: this.paymentForm.description,
      items: this.paymentForm.items,
      returnUrl: `${window.location.origin}/payment/success`,
      cancelUrl: `${window.location.origin}/payment/cancel`,
      buyerName: this.paymentForm.customerName,
      buyerEmail: this.paymentForm.customerEmail
    };

    // Gọi backend API thay vì gọi trực tiếp PayOS
    this.payosService.createPaymentLink(paymentRequest).subscribe({
      next: (response) => {
        this.loading = false;
        if (response.error === 0) {
          // Phương thức 1: Redirect đến checkout URL
          window.location.href = response.data.checkoutUrl;
          
          // Phương thức 2: Mở popup (nếu dùng @payos/payos-checkout)
          // this.payosService.openPaymentPopup(response.data.checkoutUrl);
        } else {
          alert('Có lỗi xảy ra: ' + response.message);
        }
      },
      error: (error) => {
        this.loading = false;
        console.error('Payment error:', error);
        alert('Có lỗi xảy ra khi tạo thanh toán');
      }
    });
  }

  updateAmount() {
    this.paymentForm.items[0].price = this.paymentForm.amount;
  }
}