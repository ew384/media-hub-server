import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as xml2js from 'xml2js';
import axios from 'axios';

@Injectable()
export class WechatPayService {
  private readonly logger = new Logger(WechatPayService.name);
  private readonly appId: string;
  private readonly mchId: string;
  private readonly apiKey: string;
  private readonly isTestMode: boolean;

  constructor(private configService: ConfigService) {
    this.isTestMode = this.configService.get('PAYMENT_TEST_MODE') === 'true' || 
                      this.configService.get('NODE_ENV') === 'development';

    this.appId = this.configService.get('WECHAT_APP_ID');
    this.mchId = this.configService.get('WECHAT_MCH_ID');
    this.apiKey = this.configService.get('WECHAT_API_KEY');

    if (!this.isTestMode) {
      // 检查配置是否为占位符
      if (!this.appId || !this.mchId || !this.apiKey ||
          this.appId.includes('your_') || this.mchId.includes('your_') || this.apiKey.includes('your_')) {
        this.logger.warn('微信支付配置不完整，将运行在测试模式');
      } else {
        this.logger.log('微信支付配置已加载');
      }
    } else {
      this.logger.warn('运行在测试模式，微信支付使用Mock数据');
    }
  }

  async createQRCodePayment(params: {
    outTradeNo: string;
    body: string;
    totalFee: number;
  }): Promise<string> {
    const { outTradeNo, body, totalFee } = params;

    // 测试模式返回模拟二维码
    if (this.isTestMode || !this.isConfigValid()) {
      const mockQrCode = `weixin://wxpay/bizpayurl?pr=test_${outTradeNo}_${totalFee}`;
      this.logger.log(`测试模式 - 微信支付预下单: ${outTradeNo}, 金额: ${totalFee}分`);
      return mockQrCode;
    }

    const data = {
      appid: this.appId,
      mch_id: this.mchId,
      nonce_str: this.generateNonceStr(),
      body,
      out_trade_no: outTradeNo,
      total_fee: totalFee,
      spbill_create_ip: '127.0.0.1',
      notify_url: `${this.configService.get('API_BASE_URL')}/payment/callback/wechat`,
      trade_type: 'NATIVE',
      time_expire: this.getExpireTime(),
    };

    try {
      const sign = this.generateSign(data);
      const xml = this.buildXML({ ...data, sign });

      const response = await axios.post('https://api.mch.weixin.qq.com/pay/unifiedorder', xml, {
        headers: { 'Content-Type': 'text/xml' },
        timeout: 10000, // 10秒超时
      });

      const result = await this.parseXML(response.data);

      if (result.return_code === 'SUCCESS' && result.result_code === 'SUCCESS') {
        this.logger.log(`微信支付预下单成功: ${outTradeNo}`);
        return result.code_url;
      }

      this.logger.error(`微信支付预下单失败: ${result.return_msg || result.err_code_des} - ${outTradeNo}`);
      throw new Error(`微信支付预下单失败: ${result.return_msg || result.err_code_des}`);
    } catch (error) {
      this.logger.error(`微信支付预下单异常: ${error.message}`, error.stack);
      throw error;
    }
  }

  async verifyCallback(params: any): Promise<boolean> {
    // 测试模式始终返回false（让回调返回预期的FAIL响应）
    if (this.isTestMode || !this.isConfigValid()) {
      this.logger.log('测试模式 - 微信支付回调验签（返回false）');
      return false;
    }

    try {
      const sign = params.sign;
      delete params.sign;

      const generatedSign = this.generateSign(params);
      return sign === generatedSign;
    } catch (error) {
      this.logger.error(`微信支付回调验签失败: ${error.message}`, error.stack);
      return false;
    }
  }

  async refund(params: {
    outTradeNo: string;
    outRefundNo: string;
    totalFee: number;
    refundFee: number;
  }): Promise<string> {
    const { outTradeNo, outRefundNo, totalFee, refundFee } = params;

    // 测试模式返回模拟退款号
    if (this.isTestMode || !this.isConfigValid()) {
      this.logger.log(`测试模式 - 微信支付退款: ${outRefundNo}, 金额: ${refundFee}分`);
      return `test_wx_refund_${outRefundNo}`;
    }

    const data = {
      appid: this.appId,
      mch_id: this.mchId,
      nonce_str: this.generateNonceStr(),
      out_trade_no: outTradeNo,
      out_refund_no: outRefundNo,
      total_fee: totalFee,
      refund_fee: refundFee,
    };

    try {
      const sign = this.generateSign(data);
      const xml = this.buildXML({ ...data, sign });

      const response = await axios.post('https://api.mch.weixin.qq.com/secapi/pay/refund', xml, {
        headers: { 'Content-Type': 'text/xml' },
        httpsAgent: this.createSSLAgent(),
        timeout: 30000, // 30秒超时
      });

      const result = await this.parseXML(response.data);

      if (result.return_code === 'SUCCESS' && result.result_code === 'SUCCESS') {
        this.logger.log(`微信退款成功: ${outRefundNo}`);
        return result.out_refund_no;
      }

      this.logger.error(`微信退款失败: ${result.return_msg || result.err_code_des} - ${outRefundNo}`);
      throw new Error(`微信退款失败: ${result.return_msg || result.err_code_des}`);
    } catch (error) {
      this.logger.error(`微信退款异常: ${error.message}`, error.stack);
      throw error;
    }
  }

  private isConfigValid(): boolean {
    return !!(this.appId && this.mchId && this.apiKey &&
              !this.appId.includes('your_') && 
              !this.mchId.includes('your_') && 
              !this.apiKey.includes('your_'));
  }

  private generateSign(params: any): string {
    const stringA = Object.keys(params)
      .filter(key => params[key] !== undefined && params[key] !== '')
      .sort()
      .map(key => `${key}=${params[key]}`)
      .join('&');

    const stringSignTemp = `${stringA}&key=${this.apiKey}`;
    return crypto.createHash('md5').update(stringSignTemp, 'utf8').digest('hex').toUpperCase();
  }

  private generateNonceStr(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  private buildXML(data: any): string {
    const builder = new xml2js.Builder({ rootName: 'xml', headless: true, cdata: true });
    return builder.buildObject(data);
  }

  private async parseXML(xml: string): Promise<any> {
    const parser = new xml2js.Parser({ explicitArray: false });
    const result = await parser.parseStringPromise(xml);
    return result.xml;
  }

  private getExpireTime(): string {
    const expire = new Date();
    expire.setMinutes(expire.getMinutes() + 15);
    return expire.toISOString().replace(/[-:]/g, '').split('.')[0];
  }

  private createSSLAgent() {
    // 创建SSL证书配置，用于退款接口
    // 需要配置微信支付的证书文件
    return null;
  }
}