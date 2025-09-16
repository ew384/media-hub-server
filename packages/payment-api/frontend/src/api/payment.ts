// frontend/src/api/payment.ts
export class PaymentAPI {
  private baseURL = process.env.REACT_APP_API_URL;

  async createOrder(data: CreateOrderDto) {
    const response = await fetch(`${this.baseURL}/payment/create-order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify(data),
    });
    return response.json();
  }

  async getOrderStatus(orderNo: string) {
    const response = await fetch(`${this.baseURL}/payment/order/${orderNo}`);
    return response.json();
  }

  // 支付状态轮询
  startPaymentPolling(orderNo: string, callback: (status: any) => void) {
    const pollInterval = setInterval(async () => {
      try {
        const result = await this.getOrderStatus(orderNo);
        if (result.code === 200) {
          callback(result.data);
          
          // 支付完成或失败时停止轮询
          if ([1, 2, 3, 4].includes(result.data.paymentStatus)) {
            clearInterval(pollInterval);
          }
        }
      } catch (error) {
        console.error('轮询失败:', error);
      }
    }, 3000);

    return pollInterval;
  }
}
