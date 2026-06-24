import * as React from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/auth/AuthProvider";
import { toast } from "sonner";

export interface SavedColor {
  id: string;
  palette_id: string;
  hex: string;
  label: string | null;
  created_at: string;
}

export interface ColorPalette {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  colors: SavedColor[];
}

export function useColorPalettes() {
  const { user } = useAuth();
  const [palettes, setPalettes] = React.useState<ColorPalette[]>([]);
  const [loading, setLoading] = React.useState(true);

  const userId = user?.id ?? null;

  const load = React.useCallback(async () => {
    if (!userId) {
      setPalettes([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [pRes, cRes] = await Promise.all([
        supabase
          .from("user_color_palettes")
          .select("id, name, created_at, updated_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: true }),
        supabase
          .from("user_saved_colors")
          .select("id, palette_id, hex, label, created_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: false }),
      ]);
      if (pRes.error) toast.error(pRes.error.message);
      if (cRes.error) toast.error(cRes.error.message);
      const colorsByPal = new Map<string, SavedColor[]>();
      (cRes.data ?? []).forEach((c) => {
        const arr = colorsByPal.get(c.palette_id) ?? [];
        arr.push(c as SavedColor);
        colorsByPal.set(c.palette_id, arr);
      });
      setPalettes(
        (pRes.data ?? []).map((p) => ({
          ...(p as Omit<ColorPalette, "colors">),
          colors: colorsByPal.get(p.id) ?? [],
        })),
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "โหลดพาเลทไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Keep latest load() in a ref so the realtime effect doesn't resubscribe
  // every time `user` reference changes (TOKEN_REFRESHED etc.).
  const loadRef = React.useRef(load);
  React.useEffect(() => {
    loadRef.current = load;
  }, [load]);

  React.useEffect(() => {
    load();
  }, [load]);

  // Unique per hook instance — prevents "cannot add postgres_changes
  // callbacks after subscribe()" when multiple components mount the hook
  // (e.g. MyPalettes + SaveColorDialog) or under StrictMode double-mount.
  const instanceIdRef = React.useRef<string>("");
  if (!instanceIdRef.current) {
    instanceIdRef.current =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2);
  }

  React.useEffect(() => {
    if (!userId) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const scheduleReload = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        loadRef.current();
      }, 300);
    };
    const ch = supabase
      .channel(`palettes-${userId}-${instanceIdRef.current}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_color_palettes",
          filter: `user_id=eq.${userId}`,
        },
        scheduleReload,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_saved_colors",
          filter: `user_id=eq.${userId}`,
        },
        scheduleReload,
      )
      .subscribe();
    return () => {
      if (timer) clearTimeout(timer);
      supabase.removeChannel(ch);
    };
  }, [userId]);

  const createPalette = async (name: string): Promise<string | null> => {
    if (!user) {
      toast.error("กรุณาเข้าสู่ระบบก่อนบันทึกสี");
      return null;
    }
    const { data, error } = await supabase
      .from("user_color_palettes")
      .insert({ user_id: user.id, name: name.trim() || "พาเลทใหม่" })
      .select("id")
      .single();
    if (error) {
      toast.error(error.message);
      return null;
    }
    toast.success("สร้างหมวดสีแล้ว");
    return data.id;
  };

  const renamePalette = async (id: string, name: string) => {
    const { error } = await supabase
      .from("user_color_palettes")
      .update({ name: name.trim() || "พาเลทใหม่" })
      .eq("id", id);
    if (error) toast.error(error.message);
    else toast.success("เปลี่ยนชื่อแล้ว");
  };

  const deletePalette = async (id: string) => {
    const { error } = await supabase.from("user_color_palettes").delete().eq("id", id);
    if (error) toast.error(error.message);
    else toast.success("ลบหมวดแล้ว");
  };

  const addColor = async (paletteId: string, hex: string, label?: string) => {
    if (!user) {
      toast.error("กรุณาเข้าสู่ระบบก่อนบันทึกสี");
      return;
    }
    const { error } = await supabase.from("user_saved_colors").insert({
      user_id: user.id,
      palette_id: paletteId,
      hex,
      label: label?.trim() || null,
    });
    if (error) toast.error(error.message);
    else toast.success(`บันทึกสี ${hex} แล้ว`);
  };

  const removeColor = async (id: string) => {
    const { error } = await supabase.from("user_saved_colors").delete().eq("id", id);
    if (error) toast.error(error.message);
    else toast.success("ลบสีแล้ว");
  };

  const moveColor = async (id: string, newPaletteId: string) => {
    const { error } = await supabase
      .from("user_saved_colors")
      .update({ palette_id: newPaletteId })
      .eq("id", id);
    if (error) toast.error(error.message);
    else toast.success("ย้ายสีไปหมวดใหม่แล้ว");
  };

  return {
    palettes,
    loading,
    reload: load,
    createPalette,
    renamePalette,
    deletePalette,
    addColor,
    removeColor,
    moveColor,
  };
}
