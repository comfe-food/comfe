import { getAdminOrders } from "@/lib/data/admin-orders";
import { OrdersBoard } from "@/components/admin/orders-board";

export default async function AdminPage() {
  const orders = await getAdminOrders();
  return <OrdersBoard initialOrders={orders} />;
}