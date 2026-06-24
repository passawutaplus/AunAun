import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/auth/AuthProvider";
import { normalizeHex } from "@/lib/colorUtils";
import { toast } from "sonner";

export interface PaletteColor {
  id: string;
  hex: string;
  label: string | null;
}

export interface ColorPalette {
  id: string;
  name: string;
  colors: PaletteColor[];
}

const PALETTES_KEY = (uid?: string) => ["color_palettes", uid ?? "anon"] as const;

interface PaletteRow {
  id: string;
  name: string;
  sort_order: number;
  color_palette_colors: {
    id: string;
    hex: string;
    label: string | null;
    sort_order: number;
  }[];
}

function palettesTable() {
  return supabase.from("color_palettes" as never);
}

function paletteColorsTable() {
  return supabase.from("color_palette_colors" as never);
}

function rowToPalette(row: PaletteRow): ColorPalette {
  const colors = [...(row.color_palette_colors ?? [])]
    .sort((a, b) => a.sort_order - b.sort_order || a.hex.localeCompare(b.hex))
    .map((c) => ({ id: c.id, hex: c.hex, label: c.label }));
  return { id: row.id, name: row.name, colors };
}

export function useColorPalettes() {
  const { user } = useAuth();
  const uid = user?.id;
  const qc = useQueryClient();

  const list = useQuery({
    queryKey: PALETTES_KEY(uid),
    enabled: !!uid,
    queryFn: async () => {
      const { data, error } = await palettesTable()
        .select("id, name, sort_order, color_palette_colors(id, hex, label, sort_order)")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((r) => rowToPalette(r as unknown as PaletteRow));
    },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: PALETTES_KEY(uid) });

  const createMut = useMutation({
    mutationFn: async (name: string) => {
      if (!uid) throw new Error("ต้องเข้าสู่ระบบ");
      const trimmed = name.trim() || "พาเลทของฉัน";
      const { data, error } = await palettesTable()
        .insert({ user_id: uid, name: trimmed } as never)
        .select("id")
        .single();
      if (error) throw error;
      return (data as unknown as { id: string }).id;
    },
    onSuccess: () => invalidate(),
  });

  const renameMut = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const trimmed = name.trim();
      if (!trimmed) throw new Error("ใส่ชื่อหมวด");
      const { error } = await palettesTable()
        .update({ name: trimmed, updated_at: new Date().toISOString() } as never)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("เปลี่ยนชื่อหมวดแล้ว");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await palettesTable().delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("ลบหมวดแล้ว");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addColorMut = useMutation({
    mutationFn: async ({
      paletteId,
      hex,
      label,
    }: {
      paletteId: string;
      hex: string;
      label?: string;
    }) => {
      const n = normalizeHex(hex);
      if (!n) throw new Error("Hex code ไม่ถูกต้อง");
      const palettes = list.data ?? [];
      const palette = palettes.find((p) => p.id === paletteId);
      if (palette?.colors.some((c) => c.hex === n)) {
        throw new Error("มีสีนี้ในหมวดแล้ว");
      }
      const sortOrder = palette?.colors.length ?? 0;
      const { error } = await paletteColorsTable().insert({
        palette_id: paletteId,
        hex: n,
        label: label?.trim() || null,
        sort_order: sortOrder,
      } as never);
      if (error) throw error;
      await palettesTable()
        .update({ updated_at: new Date().toISOString() } as never)
        .eq("id", paletteId);
    },
    onSuccess: () => {
      invalidate();
      toast.success("บันทึกสีแล้ว");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeColorMut = useMutation({
    mutationFn: async (colorId: string) => {
      const { error } = await paletteColorsTable().delete().eq("id", colorId);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("ลบสีแล้ว");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const moveColorMut = useMutation({
    mutationFn: async ({ colorId, targetPaletteId }: { colorId: string; targetPaletteId: string }) => {
      const palettes = list.data ?? [];
      const target = palettes.find((p) => p.id === targetPaletteId);
      const sourceColor = palettes.flatMap((p) => p.colors).find((c) => c.id === colorId);
      if (!sourceColor) throw new Error("ไม่พบสี");
      if (target?.colors.some((c) => c.hex === sourceColor.hex)) {
        throw new Error("หมวดปลายทางมีสีนี้อยู่แล้ว");
      }
      const { error } = await paletteColorsTable()
        .update({
          palette_id: targetPaletteId,
          sort_order: target?.colors.length ?? 0,
        } as never)
        .eq("id", colorId);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("ย้ายสีแล้ว");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const createPalette = async (name: string): Promise<string | null> => {
    try {
      return await createMut.mutateAsync(name);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "สร้างหมวดไม่สำเร็จ");
      return null;
    }
  };

  const addColor = async (paletteId: string, hex: string, label?: string) => {
    await addColorMut.mutateAsync({ paletteId, hex, label });
  };

  return {
    palettes: list.data ?? [],
    loading: list.isLoading,
    refetch: list.refetch,
    createPalette,
    renamePalette: (id: string, name: string) => renameMut.mutateAsync({ id, name }),
    deletePalette: (id: string) => deleteMut.mutateAsync(id),
    addColor,
    removeColor: (id: string) => removeColorMut.mutateAsync(id),
    moveColor: (colorId: string, targetPaletteId: string) =>
      moveColorMut.mutateAsync({ colorId, targetPaletteId }),
  };
}
