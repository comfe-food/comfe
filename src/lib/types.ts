export type OrderStatus =
  | "pending_payment"
  | "new"
  | "preparing"
  | "ready"
  | "completed"
  | "cancelled";

export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";

export type PaymentMode = "mbway_api" | "manual";

export type Profile = {
  id: string;
  role: "admin";
  created_at: string;
}

export type Allergen = {
  code: string;
  name_pt: string;
  sort_order: number;
}

export type Category = {
  id: string;
  name: string;
  sort_order: number;
  is_active: boolean;
}

export type Dish = {
  id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  price: string;
  image_url: string | null;
  allergens: string[];
  is_active: boolean;
  is_sold_out: boolean;
  available_from: string | null;
  available_until: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export type OptionGroup = {
  id: string;
  dish_id: string;
  name: string;
  is_required: boolean;
  min_select: number;
  max_select: number;
  sort_order: number;
  options?: Option[];
}

export type Option = {
  id: string;
  group_id: string;
  name: string;
  extra_price: string;
  is_active: boolean;
  sort_order: number;
}

export type NotePreset = {
  id: string;
  label: string;
  sort_order: number;
  is_active: boolean;
}

export type Order = {
  id: string;
  public_token: string;
  order_number: number;
  customer_name: string;
  customer_phone: string;
  pickup_time: string | null;
  notes: string | null;
  subtotal: string;
  total: string;
  status: OrderStatus;
  payment_status: PaymentStatus;
  payment_method: string;
  payment_reference: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}

export type OrderItem = {
  id: string;
  order_id: string;
  dish_id: string | null;
  dish_name: string;
  unit_price: string;
  quantity: number;
  selected_options: SelectedOption[];
  item_notes: string | null;
  line_total: string;
}

export type SelectedOption = {
  group: string;
  option: string;
  extra_price: number | string;
}

export type OrderStatusHistory = {
  id: string;
  order_id: string;
  status: OrderStatus;
  changed_by: string | null;
  created_at: string;
}

export type SiteSetting = {
  key: string;
  value: unknown;
  description: string | null;
  updated_at: string;
}

export type OpeningHours = {
  open: string;
  close: string;
  days: number[];
}

export type SiteSettingsMap = {
  brand_name: string;
  phone: string;
  whatsapp_number: string;
  instagram_url: string | null;
  opening_hours: OpeningHours;
  accepting_orders: boolean;
  pickup_only_notice: string;
  hero_title: string;
  hero_subtitle: string;
  story_title: string;
  story_text: string;
  banner_message: string | null;
  payment_mode: PaymentMode;
  pickup_slot_minutes: number;
  min_lead_time_minutes: number;
  mbway_payee: string | null;
}

export type DishWithGroups = Dish & {
  category_name?: string | null;
  option_groups: OptionGroup[];
};
