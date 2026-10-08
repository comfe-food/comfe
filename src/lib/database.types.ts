import type {
  Allergen,
  Category,
  Dish,
  NotePreset,
  Option,
  OptionGroup,
  Order,
  OrderItem,
  OrderStatus,
  OrderStatusHistory,
  PaymentStatus,
  Profile,
  SiteSetting,
} from "@/lib/types";

type Table<Row, Insert = Row, Update = Partial<Row>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

/** Tipos da base de dados (equivalente ao `database.types.ts` do Supabase CLI). */
export interface Database {
  public: {
    Tables: {
      profiles: Table<
        Profile,
        { id: string; role?: "admin"; created_at?: string },
        { role?: "admin" }
      >;
      allergens: Table<
        Allergen,
        { code: string; name_pt: string; sort_order?: number },
        Partial<Allergen>
      >;
      categories: Table<
        Category,
        {
          id?: string;
          name: string;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
        },
        Partial<Omit<Category, "id">>
      >;
      dishes: Table<
        Dish,
        Omit<Dish, "id" | "created_at" | "updated_at"> & { id?: string },
        Partial<Omit<Dish, "id" | "created_at">>
      >;
      option_groups: Table<
        OptionGroup,
        Omit<OptionGroup, "id" | "created_at" | "options"> & { id?: string },
        Partial<Omit<OptionGroup, "id" | "dish_id" | "options">>
      >;
      options: Table<
        Option,
        Omit<Option, "id" | "created_at"> & { id?: string },
        Partial<Omit<Option, "id" | "group_id">>
      >;
      note_presets: Table<
        NotePreset,
        { id?: string; label: string; sort_order?: number; is_active?: boolean },
        Partial<Omit<NotePreset, "id">>
      >;
      orders: Table<
        Order,
        Omit<
          Order,
          | "id"
          | "public_token"
          | "order_number"
          | "created_at"
          | "updated_at"
          | "payment_reference"
          | "paid_at"
          | "ip_hash"
        > & {
          id?: string;
          public_token?: string;
          payment_reference?: string | null;
          paid_at?: string | null;
          ip_hash?: string | null;
        },
        Partial<Omit<Order, "id" | "public_token" | "order_number">>
      >;
      order_items: Table<
        OrderItem,
        Omit<OrderItem, "id"> & { id?: string },
        Partial<Omit<OrderItem, "id" | "order_id">>
      >;
      order_status_history: Table<
        OrderStatusHistory,
        Omit<OrderStatusHistory, "id" | "created_at"> & { id?: string },
        Partial<Omit<OrderStatusHistory, "id">>
      >;
      site_settings: Table<
        SiteSetting,
        {
          key: string;
          value: unknown;
          description?: string | null;
          is_public?: boolean;
          updated_at?: string;
        },
        { value: unknown; description?: string | null; is_public?: boolean }
      >;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      order_status: OrderStatus;
      payment_status: PaymentStatus;
    };
    CompositeTypes: Record<string, never>;
  };
}
