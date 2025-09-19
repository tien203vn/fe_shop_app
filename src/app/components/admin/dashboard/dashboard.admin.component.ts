import { Component, OnInit } from '@angular/core';
import { DashBoardService } from '../../../services/dashboard.service';
import { ChartTotalResponse } from '../../../responses/order/chart.order.response';
import Chart from 'chart.js/auto';
import { CategoryAmountResponse } from '../../../responses/category/char.category.response';

@Component({
    selector: 'app-dashboard-admin',
    templateUrl: './dashboard.admin.component.html',
    styleUrls: [
        './dashboard.admin.component.css',
    ],
})
export class DashboardAdminComponent implements OnInit {

    constructor(
        private dashboardService: DashBoardService,
    ) { }
    chartData: ChartTotalResponse[] = [];
    totalProducts: number = 0;
    totalUsers: number = 0;
    totalCategories: number = 0;
    totalMoney: number = 0;
    totalMoneyData: ChartTotalResponse[] = [];
    year: number = 2024;
    chartLabels: string[] = [];
    chartValues: number[] = [];
    totalOrders: number = 0;
    month: number = 0;
    dataUpdated: boolean = false;

    data: any = {
        labels: [],
        datasets: [{
            label: 'Số lượng sản phẩm',
            data: [],
            backgroundColor: [],
            hoverOffset: 4
        }]
    };

    onMonthChange(event: any) {
  // event.value là giá trị vừa chọn
  // Thực hiện xử lý tại đây
  console.log('Tháng được chọn:', event.value);
}
    months = [
        { value: 1, label: 'Tháng 1' },
        { value: 2, label: 'Tháng 2' },
        { value: 3, label: 'Tháng 3' },
        { value: 4, label: 'Tháng 4' },
        { value: 5, label: 'Tháng 5' },
        { value: 6, label: 'Tháng 6' },
        { value: 7, label: 'Tháng 7' },
        { value: 8, label: 'Tháng 8' },
        { value: 9, label: 'Tháng 9' },
        { value: 10, label: 'Tháng 10' },
        { value: 11, label: 'Tháng 11' },
        { value: 12, label: 'Tháng 12' },
    ];

    ngOnInit() {
        this.updateData();
        this.getTotalMoneyByMonth();
        this.getProductAmountByCategory();
        this.getTotalProduct();
        this.getTotalUser();
        this.month = new Date().getMonth() + 1;
        this.year = new Date().getFullYear();
        this.getTotalOrdersByMonth();
        this.getTotalMoney()
    }
    updateData() {
        this.dataUpdated = true;
        this.getTotalOrdersByMonth();
        this.getTotalMoney();
    }





    getTotalProduct() {
        this.dashboardService.getTotalProduct().subscribe((count: number) => {
            this.totalProducts = count;
        })
    }
    getTotalUser() {
        this.dashboardService.getTotalUser().subscribe((count: number) => {
            this.totalUsers = count;
        })
    }
    getTotalCategory() {
        this.dashboardService.getTotalCategory().subscribe((count: number) => {
            this.totalCategories = count;
        })
    }

    getTotalOrdersByMonth() {
        if (this.dataUpdated) {
            this.dashboardService.getTotalOrdersByMonth(this.month, this.year).subscribe(
                (data: number) => {
                    this.totalOrders = data;
                },
                (error) => {
                    console.log('Error fetching total orders data:', error);
                }
            );
        }

    }
    getTotalMoney() {
        if (this.dataUpdated) {
            this.dashboardService.getTotalMoney(this.month, this.year).subscribe(
                (data: number) => {
                    this.totalMoney = data;
                },
                (error) => {
                    console.log('Error fetching total orders data:', error);
                }
            );
        }

    }

    //Chart 1
    getTotalMoneyByMonth() {
        const year = new Date().getFullYear(); // Lấy năm hiện tại
        this.dashboardService.getTotalMoneyByMonth(year).subscribe(
            (data: ChartTotalResponse[]) => {
                this.chartData = data;
                this.prepareChartData();
            },
            (error) => {
                console.log('Error fetching total money data:', error);
            }
        );
    }

    prepareChartData() {
        this.chartLabels = this.chartData.map(item => `Tháng ${item.month}`);
        this.chartValues = this.chartData.map(item => item.totalMoney);
        this.renderChart();
    }

    renderChart() {
        const colors = this.generateRandomColors(this.chartData.length);
        new Chart("myChart", {
            type: 'bar',
            data: {
                labels: this.chartLabels,
                datasets: [{
                    data: this.chartValues,
                    backgroundColor: colors,
                    borderWidth: 1
                }]
            },
            options: {
                scales: {
                    y: {
                        beginAtZero: true
                    }
                },

                plugins: {
                    legend: {
                        display: false // Bỏ hiển thị label
                    }
                }
            }
        });
    }
    generateRandomColors(count: number): string[] {
        const colors = [];
        for (let i = 0; i < count; i++) {
            const randomColor = '#' + Math.floor(Math.random() * 16777215).toString(16);
            colors.push(randomColor);
        }
        return colors;
    }



    //Chart 2
    getProductAmountByCategory() {
        this.dashboardService.getProductAmountByCategory().subscribe(
            (response: CategoryAmountResponse[]) => {
                response.forEach(item => {
                    this.data.labels.push(item.category);
                    this.data.datasets[0].data.push(item.amount);
                    const randomColor = '#' + Math.floor(Math.random() * 16777215).toString(16);
                    this.data.datasets[0].backgroundColor.push(randomColor);
                });
                this.renderChartPie();
            },
            (error) => {
                console.error('Error fetching product amount by category:', error);
            }
        );
    }

    renderChartPie() {
        new Chart('myPieChart', {
            type: 'doughnut',
            data: this.data,
            options: {
                plugins: {
                    legend: {
                        display: true,
                        position: 'bottom'
                    }
                }
            }
        });
    }

}
