# Reativar pagamentos online (Ifthenpay / MB WAY)

Estado atual: o pagamento é feito **apenas na recolha**. O pedido entra logo
como `new` (aparece na cozinha) e não há indicadores de "pago / por pagar" na
interface do cliente nem no painel. **O código do agregador ficou intacto** —
só a UI e o estado inicial mudaram.

Este documento diz o que foi alterado e o que restaurar para voltar a cobrar
online quando a Comfe estiver registada na Ifthenpay.

---

## 1. Pré-requisitos (nenhum código necessário)

1. Criar conta na Ifthenpay e obter as chaves.
2. Preencher no `.env.local` (ver `.env.example`, linhas 20-29):
   - `IFTHENPAY_API_KEY`
   - `IFTHENPAY_WEBHOOK_SECRET`
   - (opcional) `IFTHENPAY_API_URL`, `IFTHENPAY_MBWAY_ENTITY`
3. Configurar no painel da Ifthenpay o URL do webhook:
   `https://<dominio>/api/payments/mbway/webhook`
4. **Pôr `payment_mode = 'mbway_api'`.** Como o campo está escondido no
   formulário (ver secção 4), atualizar diretamente em `site_settings`:

   ```sql
   update public.site_settings set value = '"mbway_api"' where key = 'payment_mode';
   ```

> Assim que `payment_mode = 'mbway_api'` **e** as chaves estiverem preenchidas,
> `getPaymentProvider()` (`src/lib/payments/index.ts:23`) devolve o provider
> `ifthenpay` e a criação de pedidos volta ao fluxo automático sozinha
> (por causa do flag `automated` em `src/lib/data/orders.ts:70`).

Ficheiros do agregador que **não** foram tocados:
`src/lib/payments/ifthenpay.ts`, `src/lib/payments/manual.ts`,
`src/lib/payments/index.ts`, `src/lib/payments/types.ts`,
`src/lib/data/order-payment.ts` e
`src/app/api/payments/mbway/webhook/route.ts`.

---

## 2. `src/lib/data/orders.ts`

Mudança central do estado inicial do pedido.

- **Linhas 69-70** — passou a resolver o provider antes do `insert`:
  ```ts
  const provider = getPaymentProvider(settings.payment_mode);
  const automated = provider.id === "ifthenpay";
  ```
- **Linha 81** — antes era sempre `status: "pending_payment"`. Agora:
  ```ts
  status: automated ? "pending_payment" : "new",
  ```
- **Linha 144** — o `status` devolvido pela função espelha o mesmo ternário.

Com o Ifthenpay ativo (`automated === true`) o pedido volta a nascer em
`pending_payment` e o webhook (`src/lib/data/order-payment.ts`) marca
`payment_status = 'paid'` + `status = 'new'`. **Não é preciso mexer aqui para
reativar** — o ternário já cobre os dois modos. Só simplificar se quiseres
forçar sempre `pending_payment`.

---

## 3. Painel: `src/components/admin/orders-board.tsx`

Removida a divisão "a aguardar pagamento vs em curso" e o botão "Marcar como
pago".

- Import de `confirmManualPaymentAdmin` removido (era a linha 7).
- **Linha 18** — `pending_payment` passou de `"A aguardar pagamento"` para
  `"Por confirmar"`.
- **Linhas 42-49** — em vez de `pending`/`active` (filtrados por
  `paymentStatus`), agora há `incoming` (`status === "new"`) e `inProgress`
  (`status !== "new"`).
- Lista única de pedidos (uma só `<section>`); foram removidos:
  - o botão **"Marcar como pago"** (`confirmManualPaymentAdmin`);
  - a secção **"A aguardar pagamento"** e a mensagem "Sem pedidos por pagar.";
  - a etiqueta **"Pago" / "Por pagar"** no rodapé do cartão, substituída por
    **"Total"**.

A server action `confirmManualPaymentAdmin()` **continua em
`src/app/admin/actions.ts:51`** (ficou sem uso). Para reativar o modo manual:
voltar a importá-la no board e repor o botão/apção "Marcar como pago". Para o
modo Ifthenpay não é necessária (a confirmação é automática pelo webhook).

---

## 4. Painel: `src/components/admin/settings-form.tsx`

A secção **"Pagamento"** foi substituída por inputs escondidos nas
**linhas 236-242**:

```tsx
<input type="hidden" name="payment_mode" defaultValue={settings.payment_mode} />
<input type="hidden" name="mbway_payee" defaultValue={settings.mbway_payee ?? ""} />
```

Isto mantém o `saveSiteSettings` a funcionar (a validação em
`src/lib/validation/admin.ts:59` exige `payment_mode`). Para voltar a mostrar
os campos no painel, substituir os dois inputs por um `<section>` "Pagamento"
com:
- um `<select name="payment_mode">` com as opções `manual` e `mbway_api`;
- um `<input name="mbway_payee">`.

---

## 5. Página do cliente: `src/app/pedido/[token]/page.tsx`

- Removido o componente `PaymentCard` ("Como pagar" com instruções MB WAY e
  "Pagamento confirmado").
- Removidas as etiquetas **"Pago" / "Por pagar"** no cabeçalho.
- **Linha 17** — `pending_payment` passou a `"Pedido confirmado"`.
- **Linha 47** — o `OrderStatusPoller` passou a receber `status` em vez de
  `paid`.
- O link de WhatsApp passou a estar sempre visível.
- O rodapé do resumo diz agora "Pagamento na recolha.".

Para reativar: repor o `PaymentCard` e os rótulos de pagamento, e voltar a
passar `paid={order.paymentStatus === "paid"}` ao poller. Os dados
(`paymentStatus`, `paymentMode`, `mbwayPayee`) continuam a ser devolvidos por
`getPublicOrderByToken()` (`src/lib/data/orders.ts:199`), por isso não é preciso
mexer na camada de dados.

---

## 6. `src/components/checkout/order-status-poller.tsx`

- Antes: esperava `data.paymentStatus === "paid"` e mostrava o texto
  **"A verificar pagamento…"** (com spinner).
- Agora (**linhas 28-47**): verifica mudanças de `status`, faz `router.refresh()`
  e **devolve `null`** (não mostra nada no ecrã).

Para reativar o indicador de pagamento: repor o `interface StatusResponse`
com `paymentStatus`, a condição `data.paymentStatus === "paid"` e o
`<p>A verificar pagamento…</p>`.

---

## 7. Textos: `src/config/static.json`

- **Linha 37** `payMbWay`: `"Pagamento por MB WAY"` → `"Pagamento na recolha"`.
- **Linha 38** `checkoutNotice`: `"...Pagamento por MB WAY."` →
  `"...Pagamento na recolha."`.
- **Linha 39** `confirmAndPay`: `"Confirmar e pagar com MB WAY"` →
  `"Confirmar pedido"`.
- **Linha 59** `customerPhone`: `"Telemóvel (MB WAY)"` → `"Telemóvel"`.
- **Linhas 91-92** passos "Como funciona" → "Encomenda" / "Recolhe e paga".
- **Linha 97** `defaultDescription` e **linha 98** `keywords`: removida a
  referência a MB WAY.

---

## 8. Política de Privacidade: `src/app/politica-privacidade/page.tsx`

- Recolha de dados: removida a referência ao "pedido de pagamento MB WAY".
- Secção **"Pagamentos"**: agora diz que o pagamento é feito na recolha e que
  a Comfe não guarda dados de cartão/conta.

Se reativares a cobrança online, atualiza estes textos para voltar a mencionar
o agregador de pagamentos.

---

## Checklist rápido para reativar

1. [ ] `.env.local` com `IFTHENPAY_API_KEY` + `IFTHENPAY_WEBHOOK_SECRET`.
2. [ ] `payment_mode = 'mbway_api'` em `site_settings` (ou repor o `<select>`).
3. [ ] Webhook configurado no painel da Ifthenpay.
4. [ ] (UI) repor `PaymentCard` e etiquetas de pagamento em `pedido/[token]`.
5. [ ] (UI) repor o poller de `paymentStatus` e o texto "A verificar pagamento…".
6. [ ] (UI) repor a secção "Pagamento" em `settings-form.tsx`.
7. [ ] (UI) repor o botão "Marcar como pago" se quiseres o modo manual.
8. [ ] Atualizar textos de `static.json` e da Política de Privacidade.
