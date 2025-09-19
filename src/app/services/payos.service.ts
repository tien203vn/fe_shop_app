// src/app/services/payos.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';

// Import PayOS nếu sử dụng trong Angular Universal/SSR
// import PayOS from '@payos/node';

export interface PaymentRequest {
  orderCode: number;
  amount: number;
  description: string;
  items: PaymentItem[];
  returnUrl: string;
  cancelUrl: string;
  buyerName?: string;
  buyerEmail?: string;
  buyerPhone?: string;
  buyerAddress?: string;
  expiredAt?: number;
}

export interface PaymentItem {
  name: string;
  quantity: number;
  price: number;
}

export interface PaymentResponse {
  error: number;
  message: string;
  data: {
    bin: string;
    accountNumber: string;
    accountName: string;
    amount: number;
    description: string;
    orderCode: number;
    currency: string;
    paymentLinkId: string;
    status: string;
    checkoutUrl: string;
    qrCode: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class PayosService {
  private baseUrl = environment.payos.baseUrl;
  private clientId = environment.payos.clientId;
  private apiKey = environment.payos.apiKey;

  constructor(private http: HttpClient) {}

  // Phương thức 1: Sử dụng PayOS Checkout (recommended cho frontend)
  openPaymentPopup(checkoutUrl: string) {
    // Sử dụng @payos/payos-checkout để mở popup
    // Hoặc redirect đến checkoutUrl
    window.open(checkoutUrl, '_blank', 'width=800,height=600');
  }

  // Phương thức 2: Call API trực tiếp (cần backend proxy để bảo mật)
  createPaymentLink(paymentRequest: PaymentRequest): Observable<PaymentResponse> {
    // Gọi qua backend API của bạn thay vì gọi trực tiếp PayOS API
    // Vì không nên expose API key ở frontend
    return this.http.post<PaymentResponse>('/api/payos/create-payment', paymentRequest);
  }

  // Kiểm tra trạng thái thanh toán
  getPaymentStatus(orderCode: number): Observable<any> {
    // Cũng nên gọi qua backend
    return this.http.get(`/api/payos/payment-status/${orderCode}`);
  }

  // Hủy thanh toán
  cancelPayment(orderCode: number, reason?: string): Observable<any> {
    const body = { orderCode, reason };
    return this.http.post('/api/payos/cancel-payment', body);
  }
}