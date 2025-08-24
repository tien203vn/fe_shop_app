import { Component, OnInit } from '@angular/core';
import { Product } from '../../models/product';
import { CartService } from '../../services/cart.service';
import { ProductService } from '../../services/product.service';
import { OrderService } from '../../services/order.service';
import { environment } from '../../environments/environment';
import { OrderDTO } from '../../dtos/order/order.dto';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { TokenService } from "../../services/token.service";
import { Router } from "@angular/router";
import { Order } from "../../models/order";
import { CouponService } from '../../services/coupon.service';
import { CouponList } from '../../models/coupon';
import { VnPayService } from '../../services/payment.service';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-order',
  templateUrl: './order.component.html',
  styleUrls: ['./order.component.scss']
})
export class OrderComponent implements OnInit {

  defaultImageUrl: string = `${environment.apiBaseUrl}/products/images/default-product-image.png`;

  handleImageError(event: Event) {
    const imgElement = event.target as HTMLImageElement;
    // Check if the current src is already the default image to prevent loops
    if (imgElement.src !== this.defaultImageUrl) {
      imgElement.src = this.defaultImageUrl;
    } else {
      // Optional: if default image itself fails, remove onerror to stop trying, or set a tiny transparent pixel
      // imgElement.onerror = null;
      // imgElement.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'; // Transparent pixel
    }
  }

  orderForm: FormGroup; // Đối tượng FormGroup để quản lý dữ liệu của form
  cartItems: { product: Product, quantity: number }[] = [];
  couponCode: string = ''; // Mã giảm giá
  totalAmount: number = 0; // Tổng tiền
  cart: Map<number, number> = new Map();
  couponApplied: boolean = false;
  couponDiscount: number = 0;
  coupons: CouponList[] = [];
  orderData: OrderDTO = {
    user_id: 0,
    fullname: '',
    email: '',
    phone_number: '',
    address: '',
    shipping_address: '', // Added shipping_address
    note: '',
    total_money: 0,
    payment_method: 'other',
    shipping_method: 'express',
    cart_items: []
  };

  constructor(
    private cartService: CartService,
    private productService: ProductService,
    private orderService: OrderService,
    private fb: FormBuilder,
    private tokenService: TokenService,
    private router: Router,
    private couponService: CouponService,
    private vnPayService: VnPayService,
    private http: HttpClient,
    private toastr: ToastrService
  ) {
    // Tạo FormGroup và các FormControl tương ứng
    this.orderForm = this.fb.group({
      fullname: ['', Validators.required], // fullname là FormControl bắt buộc
      email: ['', [Validators.email]], // Sử dụng Validators.email cho kiểm tra định dạng email
      phone_number: ['', [Validators.required, Validators.minLength(6)]], // phone_number bắt buộc và ít nhất 6 ký tự
      address: ['', [Validators.required, Validators.minLength(5)]], // address bắt buộc và ít nhất 5 ký tự
      note: [''],
      couponCode: [''],
      shipping_method: ['express'],
      payment_method: ['other']
    });
  }

  ngOnInit(): void {

    this.cart = this.cartService.getCart();
    const productIds = Array.from(this.cart.keys());
    if (productIds.length === 0) {
      return;
    }
    this.productService.getProductsByIds(productIds).subscribe({
      next: (products) => {

        // Lấy thông tin sản phẩm và số lượng từ danh sách sản phẩm và giỏ hàng
        this.cartItems = productIds.map((productId) => {

          const product = products.find((p) => p.id === productId);
          let displayImageUrl = 'assets/images/default-product-image.png'; // Default image, ensure this path is correct or provide one

          if (product && product.product_images && product.product_images.length > 0 && product.product_images[0].image_url) {
            displayImageUrl = `${environment.apiBaseUrl}/products/images/${product.product_images[0].image_url}`;
          } else if (product && product.thumbnail) { 
            displayImageUrl = `${environment.apiBaseUrl}/products/images/${product.thumbnail}`;
          } else {
            // If product exists but has no valid image source from product_images or thumbnail, use default
            displayImageUrl = this.defaultImageUrl;
          }

          if (product) {
            // Assign the determined displayImageUrl to the product object
            (product as any).displayImageUrl = displayImageUrl;
          }

          return {
            product: product!,
            quantity: this.cart.get(productId)!
          };
        });
        console.log('haha');
      },
      complete: () => {
        ;
        this.calculateTotal()
      },
      error: (error: any) => {
        ;
        console.error('Error fetching detail:', error);
      }
    });


    this.loadCoupons();
  }

  loadCoupons() {
    this.couponService.getAllListCoupons().subscribe({
      next: (coupons: CouponList[]) => {
        this.coupons = coupons;
      },
      error: (error: any) => {
        console.error('Error fetching coupons:', error);
      }
    });
  }


  applyCoupon(): void {
    const couponCode = this.orderForm.get('couponCode')!.value;
    if (couponCode) {
      this.calculateTotal();
      this.couponService.calculateCouponValue(couponCode, this.totalAmount)
        .subscribe({
          next: (response: any) => {
            if (response && response.data && response.data.result !== undefined) {
              this.couponDiscount = this.totalAmount - response.data.result; // Calculate the discount
              this.totalAmount = response.data.result; // Update the total amount
              this.couponApplied = true;
            }
          }
        })
    }
  }


  placeOrder() {
    // this.applyCoupon();

    if (this.orderForm.errors == null) {
      // Gán giá trị từ form vào đối tượng orderData
      this.orderData.user_id = this.tokenService.getUserId();
      this.orderData.fullname = this.orderForm.get('fullname')!.value;
      this.orderData.email = this.orderForm.get('email')!.value;
      this.orderData.phone_number = this.orderForm.get('phone_number')!.value;
      this.orderData.address = this.orderForm.get('address')!.value;
      this.orderData.shipping_address = this.orderForm.get('address')!.value; // Default shipping_address to address
      this.orderData.note = this.orderForm.get('note')!.value;
      this.orderData.shipping_method = this.orderForm.get('shipping_method')!.value;
      this.orderData.payment_method = this.orderForm.get('payment_method')!.value;
      this.orderData.cart_items = this.cartItems.map(item => ({
        product_id: item.product.id,
        quantity: item.quantity
      }));
      const couponCode = this.orderForm.get('couponCode')!.value;
      const paymentMethod = this.orderForm.get('payment_method')!.value;
      console.log(paymentMethod);
      if (couponCode) {
        this.calculateTotal();
        this.couponService.calculateCouponValue(couponCode, this.totalAmount)
          .subscribe({
            next: (response: any) => {
              this.totalAmount = response.data.result;
              this.couponApplied = true;
              this.orderData.total_money = this.totalAmount;
              const paymentMethod = this.orderForm.get('payment_method')!.value;
              console.log(paymentMethod);
              if (paymentMethod === 'other') {
                this.sendOrderPayment();
              } else {
                this.sendOrder();
              }
            }
          })
      } else {
        this.orderData.total_money = this.totalAmount;
        console.log(this.orderData.total_money);
        console.log(paymentMethod);
        if (paymentMethod === 'other') {
          this.sendOrderPayment();
        } else {
          this.sendOrder();
        }
      }

    } else {
      // Hiển thị thông báo lỗi hoặc xử lý khác
      alert('Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.');
    }
  }

  sendOrderPayment(){
    if (this.tokenService.isTokenExpired()) {
      this.toastr.error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.', 'Lỗi');
      this.router.navigate(['/login']);
      return;
    }
    this.orderService.placeOrder(this.orderData).subscribe({
      next: (response: Order) => {
        ;
        this.cartService.cleanCart();
        this.processPayment();
      },
      error: (error: any) => {
        ;
        alert(`Lỗi khi đặt hàng vui lòng nhập đầy đủ thông tin`);
      },
    });
  }

  sendOrder() {
      this.orderService.placeOrder(this.orderData).subscribe({
        next: (response: Order) => {
          this.cartService.cleanCart();
          this.toastr.success("Đặt hàng thành công", "Thành công", {
            timeOut: 2000
          });
          this.router.navigate(['/']);
        },
        error: (error: any) => {
          ;
          alert(`Lỗi khi đặt hàng vui lòng nhập đầy đủ thông tin`);
        },
      });

    
  }



  private processPayment() {
    const totalMoney = this.orderData.total_money; // Lấy tổng tiền từ đơn hàng
    if (totalMoney !== undefined && totalMoney > 0) {
      this.initiateVnPayPayment(totalMoney); // Gửi yêu cầu thanh toán qua VnPay
    } else {
      alert('Tiền của bạn không đủ!');
    }
  }

  private initiateVnPayPayment(totalMoney: number) {
    this.vnPayService.initiatePayment(totalMoney).subscribe({
      next: (response: any) => {
        if (response && response.code === 200 && response.data && response.data.paymentUrl) {
          window.location.href = response.data.paymentUrl;
        } else {
          console.error('Invalid API response:', response);
          alert('Đã có lỗi xảy ra khi khởi tạo thanh toán qua VnPay');
        }
      },
      error: (error: any) => {
        console.log(totalMoney);

        alert(`Lỗi khi khởi tạo thanh toán qua VnPay: ${error}`);
      }
    });
  }

  openWebPage(): void {
    // Thực hiện API call để lấy thông tin cần thiết, sau đó mở trang web
    this.http.get<any>('http://localhost:8082/api/v1/payment/payment_infor')
      .subscribe(
        (response: any) => {
          if (response && response.code === '00' && response.data && response.data.paymentUrl) {
            // window.open(response.data.paymentUrl, '_blank'); // Mở trang web trong một tab mới
            window.location.href = response.data.paymentUrl;
          } else {
            console.error('Failed to open web page:', response);
          }
        },
        (error: any) => {
          console.error('Error fetching payment info:', error);
        }
      );
  }



  decreaseQuantity(index: number): void {
    if (this.cartItems[index].quantity > 1) {
      this.cartItems[index].quantity--;
      this.updateCartFromCartItems();
      this.calculateTotal();
    }
  }

  increaseQuantity(index: number): void {
    this.cartItems[index].quantity++;
    this.updateCartFromCartItems();
    this.calculateTotal();
  }

  // Hàm tính tổng tiền
  calculateTotal(): void {
    this.totalAmount = this.cartItems.reduce(
      (total, item) => total + item.product.price * item.quantity,
      0
    );
  }

  confirmDelete(index: number): void {
    if (confirm('Bạn có chắc chắn muốn xóa sản phẩm này?')) {
      this.cartItems.splice(index, 1);
      this.updateCartFromCartItems();
      this.calculateTotal();
    }
  }


  // Hàm xử lý việc áp dụng mã giảm giá



  private updateCartFromCartItems(): void {
    this.cart.clear();
    this.cartItems.forEach((item) => {
      this.cart.set(item.product.id, item.quantity);
    });
    this.cartService.setCart(this.cart);
  }

}
