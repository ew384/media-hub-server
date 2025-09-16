// src/payment/services/wechat-pay.service.ts
import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import * as xml2js from 'xml2js';
import axios from 'axios';

@Injectable()
export class WechatPayService {
  private readonly appId = process.env.WECHAT_APP_ID;
  private readonly mchId = process.env.WECHAT_MCH_ID;
  private readonly apiKey = process.env.WECHAT_API_KEY;

  async createQRCodePayment(params: {
    outTradeNo: string;
    body: string;
    totalFee: number;
  }): Promise<string> {
    const { outTradeNo, body, totalFee } = params;

    const data = {
      appid: this.appId,
      mch_id: this.mchId,
      nonce_str: this.generateNonceStr(),
      body,
      out_trade_no: outTradeNo,
      total_fee: totalFee,
      spbill_create_ip: '127.0.0.1',
      notify_url: `${process.env.API_BASE_URL}/payment/callback/wechat`,
      trade_type: 'NATIVE',
      time_expire: this.getExpireTime(),
    };

    const sign = this.generateSign(data);
    const xml = this.buildXML({ ...data, sign });

    const response = await axios.post('https://api.mch.weixin.qq.com/pay/unifiedorder', xml, {
      headers: { 'Content-Type': 'text/xml' },
    });

    const result = await this.parseXML(response.data);

    if (result.return_code === 'SUCCESS' && result.result_code === 'SUCCESS') {
      return result.code_url;
    }

    throw new Error(`微信支付预下单失败: ${result.return_msg || result.err_code_des}`);
  }

  async verifyCallback(params: any): Promise<boolean> {
    const sign = params.sign;
    delete params.sign;

    const generatedSign = this.generateSign(params);
    return sign === generatedSign;
  }

  async refund(params: {
    outTradeNo: string;
    outRefundNo: string;
    totalFee: number;
    refundFee: number;
  }): Promise<string> {
    const { outTradeNo, outRefundNo, totalFee, refundFee } = params;

    const data = {
      appid: this.appId,
      mch_id: this.mchId,
      nonce_str: this.generateNonceStr(),
      out_trade_no: outTradeNo,
      out_refund_no: outRefundNo,
      total_fee: totalFee,
      refund_fee: refundFee,
    };

    const sign = this.generateSign(data);
    const xml = this.buildXML({ ...data, sign });

    const response = await axios.post('https://api.mch.weixin.qq.com/secapi/pay/refund', xml, {
      headers: { 'Content-Type': 'text/xml' },
      httpsAgent: this.createSSLAgent(),
    });

    const result = await this.parseXML(response.data);

    if (result.return_code === 'SUCCESS' && result.result_code === 'SUCCESS') {
      return result.out_refund_no;
    }

    throw new Error(`微信退款失败: ${result.return_msg || result.err_code_des}`);
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
