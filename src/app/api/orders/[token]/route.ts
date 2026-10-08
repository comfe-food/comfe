import type { NextRequest } from "next/server";
import { getPublicOrderByToken } from "@/lib/data/orders";

/**
 * Consulta pública do estado de um pedido pelo `public_token`.
 * Usado pela página de confirmação e para atualizar o estado do checkout.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const order = await getPublicOrderByToken(token);

  if (!order) {
    return Response.json({ error: "Pedido não encontrado." }, { status: 404 });
  }

  return Response.json(order, {
    headers: { "Cache-Control": "no-store" },
  });
}
