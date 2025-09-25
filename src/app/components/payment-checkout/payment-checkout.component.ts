import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PayosService } from '../../services/payos.service';
import { OrderService } from '../../services/order.service';
import { environment } from '../../environments/environment';
import * as QRCode from 'qrcode';

@Component({
  selector: 'app-payment-checkout',
  templateUrl: './payment-checkout.component.html',
  styleUrls: ['./payment-checkout.component.css', '../../styles/payos-payment.css']
})
export class PaymentCheckoutComponent implements OnInit, OnDestroy {
  
  // Payment info
  checkoutUrl: string = '';
  qrCodeString: string = '';
  qrCodeImageUrl: string = '';
  orderCode: number = 0;
  totalAmount: number = 0;
  isLoading: boolean = true;
  paymentStatus: string = 'pending'; // pending, success, failed
  
  // Order info
  orderInfo: any = null;
  buyerInfo: any = null;
  orderItems: any[] = [];
  
  // Timer
  statusCheckInterval: any;
  paymentTimer: number = 300; // 5 minutes countdown
  timerInterval: any;
  
  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly payosService: PayosService,
    private readonly orderService: OrderService
  ) {}

  ngOnInit(): void {
    // Lấy thông tin từ route params hoặc query params
    this.route.queryParams.subscribe(params => {
      this.checkoutUrl = params['checkoutUrl'] || '';
      this.qrCodeString = params['qrCode'] || '';
      this.orderCode = parseInt(params['orderCode']) || 0;
      this.totalAmount = parseInt(params['amount']) || 0;
      
      if (params['orderInfo']) {
        try {
          this.orderInfo = JSON.parse(decodeURIComponent(params['orderInfo']));
          this.extractOrderDetails();
        } catch (error) {
          console.error('Error parsing order info:', error);
        }
      }
      
      if (this.qrCodeString) {
        this.generateQRCodeImage();
      }
      
      if ((this.checkoutUrl || this.qrCodeString) && this.orderCode) {
        this.isLoading = false;
        this.startPaymentStatusCheck();
        this.startCountdownTimer();
      } else {
        this.router.navigate(['/order']);
      }
    });
  }

  ngOnDestroy(): void {
    this.clearAllIntervals();
  }

  extractOrderDetails(): void {
    if (this.orderInfo) {
      this.buyerInfo = {
        fullname: this.orderInfo.fullname || '',
        email: this.orderInfo.email || '',
        phone_number: this.orderInfo.phone_number || '',
        address: this.orderInfo.address || ''
      };
      
      this.orderItems = this.orderInfo.cart_items || [];
    }
  }

  startPaymentStatusCheck(): void {
    this.statusCheckInterval = setInterval(() => {
      this.payosService.checkPaymentStatus(this.orderCode).subscribe({
        next: (response) => {
          if (response.error === 0 && response.data?.status === 'PAID') {
            this.paymentStatus = 'success';
            this.clearAllIntervals();
            setTimeout(() => {
              this.router.navigate(['/payment-success'], {
                queryParams: { orderCode: this.orderCode }
              });
            }, 2000);
          }
        },
        error: (error) => {
          console.error('Error checking payment status:', error);
        }
      });
    }, 3000); // Check every 3 seconds
  }

  startCountdownTimer(): void {
    this.timerInterval = setInterval(() => {
      this.paymentTimer--;
      if (this.paymentTimer <= 0) {
        this.paymentStatus = 'expired';
        this.clearAllIntervals();
      }
    }, 1000);
  }

  private clearAllIntervals(): void {
    if (this.statusCheckInterval) {
      clearInterval(this.statusCheckInterval);
    }
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }

  formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  }

  async generateQRCodeImage(): Promise<void> {
    if (!this.qrCodeString) {
      console.log('No QR code string available');
      return;
    }
    
    try {
      console.log('Generating QR code from string:', this.qrCodeString);
      this.qrCodeImageUrl = await QRCode.toDataURL(this.qrCodeString, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      console.log('QR code generated successfully');
    } catch (error) {
      console.error('Error generating QR code:', error);
    }
  }

  getProductImageUrl(imagePath: string): string {
    if (!imagePath) return 'assets/images/default-product-image.png';
    return `${environment.apiBaseUrl}/products/images/${imagePath}`;
  }

  openInNewTab(): void {
    window.open(this.checkoutUrl, '_blank');
  }

  goBack(): void {
    this.router.navigate(['/orders']);
  }

  retryPayment(): void {
    this.paymentStatus = 'pending';
    this.paymentTimer = 300;
    this.startPaymentStatusCheck();
    this.startCountdownTimer();
  }
}