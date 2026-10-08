"use server";

import "server-only";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionResult } from "@/app/admin/actions";
import { getServiceClient } from "@/lib/supabase/admin";
import { createSessionClient, requireAdmin } from "@/lib/supabase/server";
import type { FormState } from "@/lib/types";
import {
  allergenSchema,
  categorySchema,
  dishSchema,
  optionGroupSchema,
  optionSchema,
} from "@/lib/validation/admin";

const IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

async function requireSession() {
  const session = await requireAdmin();
  if (!session) redirect("/admin/login");
  return createSessionClient();
}

function firstError(error: { message: string } | null): string | null {
  return error ? error.message : null;
}

/**
 * Envia a foto do prato para o bucket `dish-images` e devolve a URL pública.
 * Cria o bucket se ainda não existir (a política de escrita exige admin).
 */
async function uploadDishPhoto(
  photo: File,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const ext = IMAGE_TYPES[photo.type];
  if (!ext) {
    return { ok: false, error: "Formato não suportado (JPG, PNG, WebP ou AVIF)." };
  }
  if (photo.size > MAX_IMAGE_BYTES) {
    return { ok: false, error: "A imagem não pode passar dos 4 MB." };
  }

  const supabase = await createSessionClient();
  if (!supabase) return { ok: false, error: "Base de dados não configurada." };

  const path = `dishes/${crypto.randomUUID()}.${ext}`;
  const options = { contentType: photo.type, upsert: false };

  let { error } = await supabase.storage.from("dish-images").upload(path, photo, options);
  if (error) {
    const service = getServiceClient();
    if (service) {
      const { error: bucketError } = await service.storage.createBucket("dish-images", {
        public: true,
      });
      if (bucketError && !/exists|duplicate/i.test(bucketError.message)) {
        return { ok: false, error: `Bucket: ${bucketError.message}` };
      }
      ({ error } = await supabase.storage.from("dish-images").upload(path, photo, options));
    }
    if (error) return { ok: false, error: `Erro no upload: ${error.message}` };
  }

  const { data } = supabase.storage.from("dish-images").getPublicUrl(path);
  return { ok: true, url: data.publicUrl };
}

/** Cria ou atualiza uma categoria. */
export async function saveCategory(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const supabase = await requireSession();
  if (!supabase) return { ok: false, error: "Base de dados não configurada." };

  const idRaw = String(formData.get("id") ?? "");
  const parsed = categorySchema.safeParse({
    id: idRaw || undefined,
    name: formData.get("name"),
    sort_order: formData.get("sort_order") ?? 0,
    is_active: formData.get("is_active") === "on",
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { id, ...row } = parsed.data;
  const { error } = id
    ? await supabase.from("categories").update(row).eq("id", id)
    : await supabase.from("categories").insert(row);
  const dbError = firstError(error);
  if (dbError) return { ok: false, error: dbError };

  updateTag("menu");
  revalidatePath("/admin/menu");
  return { ok: true, message: "Categoria guardada.", done: true };
}

/** Remove uma categoria (os pratos ficam sem categoria). */
export async function deleteCategory(id: string): Promise<ActionResult> {
  const supabase = await requireSession();
  if (!supabase) return { ok: false, error: "Base de dados não configurada." };

  const { error } = await supabase.from("categories").delete().eq("id", id);
  const dbError = firstError(error);
  if (dbError) return { ok: false, error: dbError };

  updateTag("menu");
  revalidatePath("/admin/menu");
  return { ok: true };
}

/** Cria ou atualiza um prato, com upload opcional de foto. */
export async function saveDish(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const supabase = await requireSession();
  if (!supabase) return { ok: false, error: "Base de dados não configurada." };

  const idRaw = String(formData.get("id") ?? "");
  const categoryId = String(formData.get("category_id") ?? "").trim();

  const parsed = dishSchema.safeParse({
    id: idRaw || undefined,
    name: formData.get("name"),
    description: formData.get("description") ?? "",
    price: formData.get("price"),
    category_id: categoryId === "" ? null : categoryId,
    image_url: formData.get("image_url") ?? "",
    allergens: formData.getAll("allergens").map(String),
    is_active: formData.get("is_active") === "on",
    is_sold_out: formData.get("is_sold_out") === "on",
    sort_order: formData.get("sort_order") ?? 0,
    available_from: formData.get("available_from") ?? "",
    available_until: formData.get("available_until") ?? "",
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return {
      ok: false,
      error: issue ? `${issue.path.join(".")}: ${issue.message}` : "Dados inválidos.",
    };
  }

  const v = parsed.data;
  let image_url: string | null = v.image_url || null;

  const photo = formData.get("photo");
  if (photo instanceof File && photo.size > 0) {
    const upload = await uploadDishPhoto(photo);
    if (!upload.ok) return { ok: false, error: upload.error };
    image_url = upload.url;
  }

  const row = {
    name: v.name,
    description: v.description || null,
    price: v.price.toFixed(2),
    category_id: v.category_id,
    image_url,
    allergens: v.allergens,
    is_active: v.is_active,
    is_sold_out: v.is_sold_out,
    sort_order: v.sort_order,
    available_from: v.available_from || null,
    available_until: v.available_until || null,
  };

  const { error } = v.id
    ? await supabase.from("dishes").update(row).eq("id", v.id)
    : await supabase.from("dishes").insert(row);
  const dbError = firstError(error);
  if (dbError) return { ok: false, error: dbError };

  updateTag("menu");
  revalidatePath("/admin/menu");
  return { ok: true, message: "Prato guardado.", done: true };
}

/** Atalhos de estado do prato (esgotado/visível) a partir da lista. */
export async function setDishFlags(
  id: string,
  flags: { is_active?: boolean; is_sold_out?: boolean },
): Promise<ActionResult> {
  const supabase = await requireSession();
  if (!supabase) return { ok: false, error: "Base de dados não configurada." };

  const patch: { is_active?: boolean; is_sold_out?: boolean } = {};
  if (typeof flags.is_active === "boolean") patch.is_active = flags.is_active;
  if (typeof flags.is_sold_out === "boolean") patch.is_sold_out = flags.is_sold_out;
  if (Object.keys(patch).length === 0) return { ok: true };

  const { error } = await supabase.from("dishes").update(patch).eq("id", id);
  const dbError = firstError(error);
  if (dbError) return { ok: false, error: dbError };

  updateTag("menu");
  revalidatePath("/admin/menu");
  return { ok: true };
}

/** Remove um prato (grupos de opções são apagados em cascata). */
export async function deleteDish(id: string): Promise<ActionResult> {
  const supabase = await requireSession();
  if (!supabase) return { ok: false, error: "Base de dados não configurada." };

  const { error } = await supabase.from("dishes").delete().eq("id", id);
  const dbError = firstError(error);
  if (dbError) return { ok: false, error: dbError };

  updateTag("menu");
  revalidatePath("/admin/menu");
  return { ok: true };
}

/** Cria ou atualiza um grupo de opções (ex.: "Acompanhamento") de um prato. */
export async function saveOptionGroup(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const supabase = await requireSession();
  if (!supabase) return { ok: false, error: "Base de dados não configurada." };

  const idRaw = String(formData.get("id") ?? "");
  const parsed = optionGroupSchema.safeParse({
    id: idRaw || undefined,
    dish_id: formData.get("dish_id"),
    name: formData.get("name"),
    is_required: formData.get("is_required") === "on",
    min_select: formData.get("min_select") ?? 0,
    max_select: formData.get("max_select") ?? 1,
    sort_order: formData.get("sort_order") ?? 0,
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return {
      ok: false,
      error: issue ? `${issue.path.join(".")}: ${issue.message}` : "Dados inválidos.",
    };
  }

  const { id, dish_id, ...values } = parsed.data;
  const { error } = id
    ? await supabase.from("option_groups").update(values).eq("id", id)
    : await supabase.from("option_groups").insert({ ...values, dish_id });
  const dbError = firstError(error);
  if (dbError) return { ok: false, error: dbError };

  updateTag("menu");
  revalidatePath("/admin/menu");
  return { ok: true, message: "Grupo guardado.", done: true };
}

/** Remove um grupo de opções (as opções são apagadas em cascata). */
export async function deleteOptionGroup(id: string): Promise<ActionResult> {
  const supabase = await requireSession();
  if (!supabase) return { ok: false, error: "Base de dados não configurada." };

  const { error } = await supabase.from("option_groups").delete().eq("id", id);
  const dbError = firstError(error);
  if (dbError) return { ok: false, error: dbError };

  updateTag("menu");
  revalidatePath("/admin/menu");
  return { ok: true };
}

/** Cria ou atualiza uma opção dentro de um grupo. */
export async function saveOption(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const supabase = await requireSession();
  if (!supabase) return { ok: false, error: "Base de dados não configurada." };

  const idRaw = String(formData.get("id") ?? "");
  const parsed = optionSchema.safeParse({
    id: idRaw || undefined,
    group_id: formData.get("group_id"),
    name: formData.get("name"),
    extra_price: formData.get("extra_price") ?? 0,
    is_active: formData.get("is_active") === "on",
    sort_order: formData.get("sort_order") ?? 0,
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return {
      ok: false,
      error: issue ? `${issue.path.join(".")}: ${issue.message}` : "Dados inválidos.",
    };
  }

  const { id, group_id, ...values } = parsed.data;
  const payload = { ...values, extra_price: values.extra_price.toFixed(2) };
  const { error } = id
    ? await supabase.from("options").update(payload).eq("id", id)
    : await supabase.from("options").insert({ ...payload, group_id });
  const dbError = firstError(error);
  if (dbError) return { ok: false, error: dbError };

  updateTag("menu");
  revalidatePath("/admin/menu");
  return { ok: true, message: "Opção guardada.", done: true };
}

/** Remove uma opção do grupo. */
export async function deleteOption(id: string): Promise<ActionResult> {
  const supabase = await requireSession();
  if (!supabase) return { ok: false, error: "Base de dados não configurada." };

  const { error } = await supabase.from("options").delete().eq("id", id);
  const dbError = firstError(error);
  if (dbError) return { ok: false, error: dbError };

  updateTag("menu");
  revalidatePath("/admin/menu");
  return { ok: true };
}

/** Cria ou atualiza um alergénio da lista de referência. */
export async function saveAllergen(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const supabase = await requireSession();
  if (!supabase) return { ok: false, error: "Base de dados não configurada." };

  const originalCode = String(formData.get("original_code") ?? "");
  const parsed = allergenSchema.safeParse({
    code: formData.get("code"),
    name_pt: formData.get("name_pt"),
    sort_order: formData.get("sort_order") ?? 0,
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return {
      ok: false,
      error: issue ? `${issue.path.join(".")}: ${issue.message}` : "Dados inválidos.",
    };
  }

  const { code, name_pt, sort_order } = parsed.data;

  // Código alterado: os pratos guardam o código antigo em `allergens`.
  if (originalCode && originalCode !== code) {
    const { data: dishes, error: readError } = await supabase
      .from("dishes")
      .select("id, allergens")
      .contains("allergens", [originalCode]);
    if (readError) return { ok: false, error: readError.message };

    for (const dish of dishes ?? []) {
      const updated = dish.allergens.map((c) => (c === originalCode ? code : c));
      const { error } = await supabase
        .from("dishes")
        .update({ allergens: updated })
        .eq("id", dish.id);
      if (error) return { ok: false, error: error.message };
    }

    const { error: delError } = await supabase
      .from("allergens")
      .delete()
      .eq("code", originalCode);
    if (delError) return { ok: false, error: delError.message };
  }

  const { error } = await supabase.from("allergens").upsert({
    code,
    name_pt,
    sort_order,
  });
  const dbError = firstError(error);
  if (dbError) return { ok: false, error: dbError };

  updateTag("menu");
  revalidatePath("/admin/menu");
  return { ok: true, message: "Alergénio guardado.", done: true };
}

/** Remove um alergénio (bloqueado se algum prato o usa). */
export async function deleteAllergen(code: string): Promise<ActionResult> {
  const supabase = await requireSession();
  if (!supabase) return { ok: false, error: "Base de dados não configurada." };

  const { data: dishes, error: readError } = await supabase
    .from("dishes")
    .select("id")
    .contains("allergens", [code]);
  if (readError) return { ok: false, error: readError.message };
  if (dishes && dishes.length > 0) {
    return {
      ok: false,
      error: `Em uso por ${dishes.length} prato(s) — desmarca primeiro.`,
    };
  }

  const { error } = await supabase.from("allergens").delete().eq("code", code);
  const dbError = firstError(error);
  if (dbError) return { ok: false, error: dbError };

  updateTag("menu");
  revalidatePath("/admin/menu");
  return { ok: true };
}
