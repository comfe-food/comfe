import "server-only";

import type {
  PaymentInitiation,
  PaymentProvider,
  WebhookResult,
} from "./types";

/**
 * Modo manual (defeito): o cliente paga por MB WAY para o número do Comfe e
 * o cozinheiro confirma no painel. Nenhuma credencial é necessária.
 */
export const manualPaymentProvider: PaymentProvider = {
  id: "manual",

  createMbWayPayment(): Promise<PaymentInitiation> {
    return Promise.resolve({
      status: "requires_manual",
      reference: null,
      message: "Paga por MB WAY e confirma o envio da captura no WhatsApp.",
    });
  },

  handleWebhook(): Promise<WebhookResult> {
    return Promise.resolve({ handled: false, paid: false, reason: "manual_mode" });
  },
};