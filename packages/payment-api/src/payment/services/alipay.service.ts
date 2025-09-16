// src/payment/services/alipay.service.ts
import { Injectable } from '@nestjs/common';
import * as AlipaySdk from 'alipay-sdk';
import * as crypto from 'crypto';

@Injectable()
export class AlipayService {
  private alipay: AlipaySdk;

  constructor() {
    this.alipay = new AlipaySdk({
      appId: process.env.ALIPAY_APP_ID,
      privateKey: process.env.ALIPAY_PRIVATE_KEY,
      alipayPublicKey: process.env.ALIPAY_PUBLIC_KEY,
      gateway: process.env.ALIPAY_GATEWAY || 'https://openapi.alipay.com/gateway.do',
    });
  }

  async createQRCodePayment(params: {
    outTradeNo: string;
    subject: string;
    totalAmount: number;
  }): Promise<string> {
    const { outTradeNo, subject, totalAmount } = params;

    const result = await this.alipay.exec('alipay.trade.precreate', {
      bizContent: {
        out_trade_no: outTradeNo,
        total_amount: totalAmount.toFixed(2),
        subject,
        timeout_express: '15m',
      },
      notify_url: `${process.env.API_BASE_URL}/payment/callback/alipay`,
    });

    if (result.code === '10000') {
      return result.qrCode;
    }

    throw new Error(`支付宝预下单失败: ${result.msg}`);
  }

  async verifyCallback(params: any): Promise<boolean> {
    return this.alipay.checkNotifySign(params);
  }

  async refund(params: {
    outTradeNo: string;
    outRequestNo: string;
    refundAmount: number;
    refundReason?: string;
  }): Promise<string> {
    const { outTradeNo, outRequestNo, refundAmount, refundReason } = params;

    const result = await this.alipay.exec('alipay.trade.refund', {
      bizContent: {
        out_trade_no: outTradeNo,
        out_request_no: outRequestNo,
        refund_amount: refundAmount.toFixed(2),
        refund_reason: refundReason || '用户申请退款',
      },
    });

    if (result.code === '10000') {
      return result.outRequestNo;
    }

    throw new Error(`支付宝退款失败: ${result.msg}`);
  }

  async queryOrder(outTradeNo: string) {
    const result = await this.alipay.exec('alipay.trade.query', {
      bizContent: {
        out_trade_no: outTradeNo,
      },
    });

    return result;
  }
}
