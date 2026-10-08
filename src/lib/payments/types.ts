export interface OrderPaymentContext {
  orderId: string;
  orderNumber: number;
  total: number;
  customerPhone: string;
  customerName: string;
  description: string;
}

export type PaymentInitiationStatus =
  | "pending"
  | "requires_manual"
  | "failed"
  | "disabled";

export interface PaymentInitiation {
  status: PaymentInitiationStatus;
  /** Identificador da transação no agregador (RequestId da Ifthenpay). */
  reference: string | null;
  message: string;
}

export interface WebhookResult {
  handled: boolean;
  paid: boolean;
  orderId?: string;
  reason?: string;
}

/**
 * Camada de abstração dos meios de pagamento.
 * `manual`  → o cliente paga por MB WAY e a cozinha confirma.
 * `ifthenpay` → pedido automático na app + callback (webhook) validado.
 */
export interface PaymentProvider {
  readonly id: "manual" | "ifthenpay";
  createMbWayPayment(order: OrderPaymentContext): Promise<PaymentInitiation>;
  handleWebhook(req: Request): Promise<WebhookResult>;
}

export class PaymentError extends Error {
  constructor(
    message: string,
    public readonly code: "provider_error" | "invalid_webhook" | "not_configured",
  ) {
    super(message);
    this.name = "PaymentError";
  }
}
