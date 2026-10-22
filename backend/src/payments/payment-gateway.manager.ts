import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PalplussProvider } from './providers/palpluss.provider';
import { GravityPayProvider } from './providers/gravitypay.provider';
import {
  PaymentGatewayProvider,
  StkPushParams,
  StkPushResponse,
  PaymentStatusResponse,
  WebhookResult,
  ResolvedGatewayConfig
} from './interfaces/payment-gateway.interface';

@Injectable()
export class PaymentGatewayManager {
  private readonly logger = new Logger(PaymentGatewayManager.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly palplussProvider: PalplussProvider,
    private readonly gravityPayProvider: GravityPayProvider
  ) {}

  /**
   * Resolves runtime credentials and active gateway choice.
   * Priority: Database (PaymentGatewayConfig singleton) -> process.env fallback.
   */
  async getResolvedConfig(): Promise<ResolvedGatewayConfig> {
    let dbConfig: any = null;
    try {
      dbConfig = await this.prisma.paymentGatewayConfig.findFirst();
    } catch (e: any) {
      this.logger.warn(`Could not read PaymentGatewayConfig from DB: ${e.message}. Using process.env fallback.`);
    }

    const envActive = (process.env.ACTIVE_PAYMENT_GATEWAY || 'PALPLUSS').toUpperCase();
    const activeGateway: 'PALPLUSS' | 'GRAVITYPAY' =
      dbConfig?.activeGateway === 'GRAVITYPAY' || envActive === 'GRAVITYPAY'
        ? 'GRAVITYPAY'
        : 'PALPLUSS';

    const callbackBackendBaseUrl =
      dbConfig?.callbackBackendBaseUrl ||
      process.env.CALLBACK_BACKEND_BASE_URL ||
      process.env.PALPLUSS_CALLBACK_BASE_URL ||
      process.env.RENDER_EXTERNAL_URL ||
      'https://jijenge-loans-backend.onrender.com';

    return {
      activeGateway,
      callbackBackendBaseUrl,
      palpluss: {
        apiKey: dbConfig?.palplussApiKey || process.env.PALPLUSS_API_KEY,
        channelId: dbConfig?.palplussChannelId || process.env.PALPLUSS_CHANNEL_ID || '1',
        webhookSecret: dbConfig?.palplussWebhookSecret || process.env.PALPLUSS_WEBHOOK_SECRET || 'jijenge_secret',
        apiUrl: process.env.PALPLUSS_API_URL,
        callbackBaseUrl: callbackBackendBaseUrl
      },
      gravityPay: {
        publicKey: dbConfig?.gravityPayPublicKey || process.env.GRAVITYPAY_PUBLIC_KEY,
        secretKey: dbConfig?.gravityPaySecretKey || process.env.GRAVITYPAY_SECRET_KEY,
        webhookSecret: dbConfig?.gravityPayWebhookSecret || process.env.GRAVITYPAY_WEBHOOK_SECRET || 'jijenge_gravity_secret',
        apiUrl: process.env.GRAVITYPAY_API_URL,
        callbackBaseUrl: callbackBackendBaseUrl
      }
    };
  }

  /**
   * Resolve a specific provider by name.
   */
  getProvider(name: 'PALPLUSS' | 'GRAVITYPAY'): PaymentGatewayProvider {
    return name === 'GRAVITYPAY' ? this.gravityPayProvider : this.palplussProvider;
  }

  /**
   * Save or update Payment Gateway Settings in DB.
   */
  async updateConfig(data: {
    activeGateway?: string;
    gravityPayPublicKey?: string;
    gravityPaySecretKey?: string;
    gravityPayWebhookSecret?: string;
    palplussApiKey?: string;
    palplussChannelId?: string;
    palplussWebhookSecret?: string;
    callbackBackendBaseUrl?: string;
  }) {
    const existing = await this.prisma.paymentGatewayConfig.findFirst();
    const normalizedActive = data.activeGateway
      ? data.activeGateway.toUpperCase() === 'GRAVITYPAY'
        ? 'GRAVITYPAY'
        : 'PALPLUSS'
      : undefined;

    const payload: any = {
      ...(normalizedActive && { activeGateway: normalizedActive }),
      ...(data.gravityPayPublicKey !== undefined && { gravityPayPublicKey: data.gravityPayPublicKey }),
      ...(data.gravityPaySecretKey !== undefined && { gravityPaySecretKey: data.gravityPaySecretKey }),
      ...(data.gravityPayWebhookSecret !== undefined && { gravityPayWebhookSecret: data.gravityPayWebhookSecret }),
      ...(data.palplussApiKey !== undefined && { palplussApiKey: data.palplussApiKey }),
      ...(data.palplussChannelId !== undefined && { palplussChannelId: data.palplussChannelId }),
      ...(data.palplussWebhookSecret !== undefined && { palplussWebhookSecret: data.palplussWebhookSecret }),
      ...(data.callbackBackendBaseUrl !== undefined && { callbackBackendBaseUrl: data.callbackBackendBaseUrl })
    };

    if (existing) {
      return this.prisma.paymentGatewayConfig.update({
        where: { id: existing.id },
        data: payload
      });
    }

    return this.prisma.paymentGatewayConfig.create({
      data: {
        id: 'default',
        activeGateway: normalizedActive || 'PALPLUSS',
        ...payload
      }
    });
  }

  /**
   * Switch the active gateway quickly between PALPLUSS and GRAVITYPAY.
   */
  async switchGateway(targetGateway: 'PALPLUSS' | 'GRAVITYPAY') {
    return this.updateConfig({ activeGateway: targetGateway });
  }

  /**
   * Initiate STK Push using the active gateway, with optional automatic failover to the secondary gateway.
   */
  async initiateStkPush(params: StkPushParams): Promise<StkPushResponse> {
    const config = await this.getResolvedConfig();
    const primaryName = config.activeGateway;
    const secondaryName: 'PALPLUSS' | 'GRAVITYPAY' = primaryName === 'PALPLUSS' ? 'GRAVITYPAY' : 'PALPLUSS';

    this.logger.log(`🚀 [PAYMENT INITIATION] Selected Active Gateway: ${primaryName} for Ref: ${params.transactionRef}`);

    const primaryProvider = this.getProvider(primaryName);
    const primaryConfig = primaryName === 'PALPLUSS' ? config.palpluss : config.gravityPay;

    try {
      return await primaryProvider.initiateStkPush(params, primaryConfig);
    } catch (primaryErr: any) {
      this.logger.warn(
        `⚠️ [GATEWAY FAILOVER TRIGGERED] Primary gateway ${primaryName} failed: ${primaryErr.message}. Attempting secondary fallback ${secondaryName}...`
      );

      const secondaryProvider = this.getProvider(secondaryName);
      const secondaryConfig = secondaryName === 'PALPLUSS' ? config.palpluss : config.gravityPay;

      // Ensure secondary provider has minimum credentials before attempting failover
      const hasSecondaryCreds =
        secondaryName === 'PALPLUSS'
          ? !!config.palpluss.apiKey
          : !!(config.gravityPay.publicKey || config.gravityPay.secretKey);

      if (!hasSecondaryCreds) {
        this.logger.error(`❌ Secondary gateway ${secondaryName} has no credentials configured. Aborting failover.`);
        throw primaryErr;
      }

      try {
        const secondaryResponse = await secondaryProvider.initiateStkPush(params, secondaryConfig);
        this.logger.log(`✅ [FAILOVER SUCCESS] Secondary gateway ${secondaryName} succeeded for Ref: ${params.transactionRef}`);
        return secondaryResponse;
      } catch (secondaryErr: any) {
        this.logger.error(`❌ [FAILOVER FAILED] Both primary (${primaryName}) and secondary (${secondaryName}) gateways failed.`);
        throw new Error(`Payment gateway error: ${primaryErr.message} | Failover error: ${secondaryErr.message}`);
      }
    }
  }

  /**
   * Query status using a specific provider or the active provider.
   */
  async queryStatus(
    checkoutRequestId: string,
    transactionRef?: string,
    providerName?: 'PALPLUSS' | 'GRAVITYPAY'
  ): Promise<PaymentStatusResponse> {
    const config = await this.getResolvedConfig();
    const name = providerName || config.activeGateway;
    const provider = this.getProvider(name);
    const providerConfig = name === 'PALPLUSS' ? config.palpluss : config.gravityPay;
    return provider.queryStatus(checkoutRequestId, transactionRef, providerConfig);
  }

  /**
   * Parse webhook payload for GravityPay.
   */
  async handleGravityPayWebhook(payload: any, headers?: any, query?: any): Promise<WebhookResult> {
    const config = await this.getResolvedConfig();
    return this.gravityPayProvider.handleWebhook(payload, headers, query, config.gravityPay);
  }

  /**
   * Parse webhook payload for Palplus.
   */
  async handlePalplussWebhook(payload: any, headers?: any, query?: any): Promise<WebhookResult> {
    const config = await this.getResolvedConfig();
    return this.palplussProvider.handleWebhook(payload, headers, query, config.palpluss);
  }

  /**
   * Auto-detect payload format (GravityPay vs Palplus) and parse accordingly.
   */
  async handleUnifiedWebhook(payload: any, headers: any = {}, query: any = {}): Promise<WebhookResult> {
    const config = await this.getResolvedConfig();

    let bodyStr = '';
    try {
      bodyStr = typeof payload === 'string' ? payload : JSON.stringify(payload || {});
    } catch {
      bodyStr = '';
    }

    const headersStr = JSON.stringify(headers || {}).toLowerCase();
    const queryStr = JSON.stringify(query || {}).toLowerCase();

    // Check GravityPay signatures
    const isGravity =
      headersStr.includes('gravity') ||
      queryStr.includes('gravity') ||
      bodyStr.includes('gravitypay') ||
      (payload && (payload.orderId || payload.customerPhone || payload.narrative || payload.referenceId));

    // Check Palplus signatures
    const isPalplus =
      headersStr.includes('palpluss') ||
      queryStr.includes('palpluss') ||
      bodyStr.includes('stkcallback') ||
      bodyStr.includes('stkCallback') ||
      bodyStr.includes('palpluss') ||
      bodyStr.includes('channelid') ||
      bodyStr.includes('channelId');

    if (isGravity && !isPalplus) {
      this.logger.log('🔍 [UNIFIED WEBHOOK] Auto-detected GravityPay payload structure.');
      return this.gravityPayProvider.handleWebhook(payload, headers, query, config.gravityPay);
    }

    if (isPalplus) {
      this.logger.log('🔍 [UNIFIED WEBHOOK] Auto-detected Palplus payload structure.');
      return this.palplussProvider.handleWebhook(payload, headers, query, config.palpluss);
    }

    // Default to currently configured active gateway
    this.logger.log(`🔍 [UNIFIED WEBHOOK] Indeterminate format. Routing to active gateway (${config.activeGateway}).`);
    const activeProvider = this.getProvider(config.activeGateway);
    const activeConfig = config.activeGateway === 'PALPLUSS' ? config.palpluss : config.gravityPay;
    return activeProvider.handleWebhook(payload, headers, query, activeConfig);
  }
}
