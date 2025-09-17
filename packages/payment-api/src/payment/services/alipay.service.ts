import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import AlipaySdk from 'alipay-sdk';

@Injectable()
export class AlipayService {
  private readonly logger = new Logger(AlipayService.name);
  private alipay: AlipaySdk;

  constructor(private configService: ConfigService) {
    this.alipay = new AlipaySdk({
      appId: this.configService.get('ALIPAY_APP_ID'),
      privateKey: this.configService.get('ALIPAY_PRIVATE_KEY'),
      alipayPublicKey: this.configService.get('ALIPAY_PUBLIC_KEY'),
      gateway: this.configService.get('ALIPAY_GATEWAY') || 'https://openapi.alipay.com/gateway.do',
    });
  }

  async createQRCodePayment(params: {
    outTradeNo: string;
    subject: string;
    totalAmount: number;
  }): Promise<string> {
    const { outTradeNo, subject, totalAmount } = params;

    try {
      const result = await this.alipay.exec('alipay.trade.precreate', {
        bizContent: {
          out_trade_no: outTradeNo,
          total_amount: totalAmount.toFixed(2),
          subject,
          timeout_express: '15m',
        },
        notify_url: `${this.configService.get('API_BASE_URL')}/payment/callback/alipay`,
      });

      if (result.code === '10000') {
        this.logger.log(`支付宝预下单成功: ${outTradeNo}`);
        return result.qrCode;
      }

      this.logger.error(`支付宝预下单失败: ${result.msg} - ${outTradeNo}`);
      throw new Error(`支付宝预下单失败: ${result.msg}`);
    } catch (error) {
      this.logger.error(`支付宝预下单异常: ${error.message}`, error.stack);
      throw error;
    }
  }

  async verifyCallback(params: any): Promise<boolean> {
    try {
      return this.alipay.checkNotifySign(params);
    } catch (error) {
      this.logger.error(`支付宝回调验签失败: ${error.message}`, error.stack);
      return false;
    }
  }

  async refund(params: {
    outTradeNo: string;
    outRequestNo: string;
    refundAmount: number;
    refundReason?: string;
  }): Promise<string> {
    const { outTradeNo, outRequestNo, refundAmount, refundReason } = params;

    try {
      const result = await this.alipay.exec('alipay.trade.refund', {
        bizContent: {
          out_trade_no: outTradeNo,
          out_request_no: outRequestNo,
          refund_amount: refundAmount.toFixed(2),
          refund_reason: refundReason || '用户申请退款',
        },
      });

      if (result.code === '10000') {
        this.logger.log(`支付宝退款成功: ${outRequestNo}`);
        return result.outRequestNo;
      }

      this.logger.error(`支付宝退款失败: ${result.msg} - ${outRequestNo}`);
      throw new Error(`支付宝退款失败: ${result.msg}`);
    } catch (error) {
      this.logger.error(`支付宝退款异常: ${error.message}`, error.stack);
      throw error;
    }
  }

  async queryOrder(outTradeNo: string) {
    try {
      const result = await this.alipay.exec('alipay.trade.query', {
        bizContent: {
          out_trade_no: outTradeNo,
        },
      });

      return result;
    } catch (error) {
      this.logger.error(`支付宝查询订单失败: ${error.message}`, error.stack);
      throw error;
    }
  }
}