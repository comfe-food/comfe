import { MenuEditor } from "@/components/admin/menu-editor";
import { getAdminMenu } from "@/lib/data/admin-menu";

export const metadata = {
  title: "Menu · Painel · Comfe",
  robots: { index: false, follow: false },
};

export default async function AdminMenuPage() {
  const { categories, dishes, optionGroups, allergens } = await getAdminMenu();
  return (
    <MenuEditor
      categories={categories}
      dishes={dishes}
      optionGroups={optionGroups}
      allergens={allergens}
    />
  );
}
