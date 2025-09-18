import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import AlipaySdk from 'alipay-sdk';

@Injectable()
export class AlipayService {
  private readonly logger = new Logger(AlipayService.name);
  private alipay: AlipaySdk | null = null;
  private readonly isTestMode: boolean;

  constructor(private configService: ConfigService) {
    this.isTestMode = this.configService.get('PAYMENT_TEST_MODE') === 'true' || 
                      this.configService.get('NODE_ENV') === 'development';

    // 只在非测试模式或有真实配置时初始化支付宝SDK
    const appId = this.configService.get('ALIPAY_APP_ID');
    const privateKey = this.configService.get('ALIPAY_PRIVATE_KEY');
    const publicKey = this.configService.get('ALIPAY_PUBLIC_KEY');

    if (!this.isTestMode && appId && privateKey && publicKey && 
        !appId.includes('your_') && !privateKey.includes('your_') && !publicKey.includes('your_')) {
      try {
        this.alipay = new AlipaySdk({
          appId,
          privateKey,
          alipayPublicKey: publicKey,
          gateway: this.configService.get('ALIPAY_GATEWAY') || 'https://openapi.alipay.com/gateway.do',
        });
        this.logger.log('支付宝SDK初始化成功');
      } catch (error) {
        this.logger.error('支付宝SDK初始化失败', error.stack);
        this.alipay = null;
      }
    } else {
      this.logger.warn('运行在测试模式，支付宝SDK未初始化');
    }
  }

  async createQRCodePayment(params: {
    outTradeNo: string;
    subject: string;
    totalAmount: number;
  }): Promise<string> {
    const { outTradeNo, subject, totalAmount } = params;

    // 测试模式返回模拟二维码
    if (this.isTestMode || !this.alipay) {
      const mockQrCode = `alipay://test_payment?orderNo=${outTradeNo}&amount=${totalAmount}&subject=${encodeURIComponent(subject)}`;
      this.logger.log(`测试模式 - 支付宝预下单: ${outTradeNo}, 金额: ${totalAmount}`);
      return mockQrCode;
    }

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
    // 测试模式始终返回false（让回调返回预期的fail响应）
    if (this.isTestMode || !this.alipay) {
      this.logger.log('测试模式 - 支付宝回调验签（返回false）');
      return false;
    }

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

    // 测试模式返回模拟退款号
    if (this.isTestMode || !this.alipay) {
      this.logger.log(`测试模式 - 支付宝退款: ${outRequestNo}, 金额: ${refundAmount}`);
      return `test_refund_${outRequestNo}`;
    }

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
    // 测试模式返回模拟查询结果
    if (this.isTestMode || !this.alipay) {
      this.logger.log(`测试模式 - 支付宝查询订单: ${outTradeNo}`);
      return {
        code: '10000',
        msg: 'Success',
        trade_status: 'WAIT_BUYER_PAY',
        out_trade_no: outTradeNo,
      };
    }

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