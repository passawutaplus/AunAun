import { useMemo, useState } from "react";
import { Box, PauseCircle, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import SectionHeader from "@/components/admin/SectionHeader";
import DataTable, { type Column } from "@/components/admin/DataTable";
import StatusPill from "@/components/admin/StatusPill";
import KpiCard from "@/components/admin/KpiCard";
import { SearchBar, useSearch } from "@/components/admin/SearchBar";
import AdminRowActions from "@/components/admin/AdminRowActions";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import {
  CREATOR_OBJECTS_SELECT,
  fromCreatorObjects,
  fromObjectOrders,
  mapCreatorObject,
  mapObjectOrder,
  OBJECT_ORDERS_SELECT,
  objectErrorText,
} from "@/lib/objects/db";
import {
  formatBaht,
  kindLabel,
  orderStatusLabel,
  statusLabel,
  type CreatorObject,
  type ObjectOrder,
} from "@/lib/objects/taxonomy";

type ListingFilter = "all" | "Published" | "Draft" | "Paused";

export default function AdminObjectsPage() {
  const [listingFilter, setListingFilter] = useState<ListingFilter>("all");
  const [view, setView] = useState<"listings" | "orders">("listings");
  const qc = useQueryClient();
  const listings = useQuery({
    queryKey: ["admin-objects"],
    queryFn: async () => {
      const { data, error } = await fromCreatorObjects()
        .select(CREATOR_OBJECTS_SELECT)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (Array.isArray(data) ? data : [])
        .map((row) => mapCreatorObject(row as Record<string, unknown>))
        .filter((row): row is CreatorObject => !!row);
    },
  });
  const orders = useQuery({
    queryKey: ["admin-object-orders"],
    queryFn: async () => {
      const { data, error } = await fromObjectOrders()
        .select(OBJECT_ORDERS_SELECT)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (Array.isArray(data) ? data : [])
        .map((row) => mapObjectOrder(row as Record<string, unknown>))
        .filter((row): row is ObjectOrder => !!row);
    },
  });
  const setStatus = useMutation({
    mutationFn: async (input: { id: string; status: "Draft" | "Published" | "Paused" }) => {
      const { error } = await supabase.rpc("admin_set_creator_object_status" as never, {
        _id: input.id,
        _status: input.status,
      } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin-objects"] });
      void qc.invalidateQueries({ queryKey: ["creator-objects"] });
    },
  });
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc("admin_delete_creator_object" as never, { _id: id } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["admin-objects"] });
    },
  });

  const { q, setQ, filtered } = useSearch(listings.data, ["title", "code", "owner_id", "status"]);
  const rows = useMemo(() => {
    const list = filtered ?? [];
    if (listingFilter === "all") return list;
    return list.filter((row) => row.status === listingFilter);
  }, [filtered, listingFilter]);

  const published = (listings.data ?? []).filter((row) => row.status === "Published").length;
  const paused = (listings.data ?? []).filter((row) => row.status === "Paused").length;
  const openOrders = (orders.data ?? []).filter((row) => row.status !== "completed" && row.status !== "cancelled").length;

  const listingCols: Column<CreatorObject>[] = [
    {
      key: "title",
      header: "ชิ้นงาน",
      render: (row) => (
        <div>
          <p className="font-medium">{row.title}</p>
          <p className="text-[11px] text-admin-muted">{row.code} · {kindLabel(row.kind)}</p>
        </div>
      ),
    },
    {
      key: "price",
      header: "ราคา",
      render: (row) => <span className="font-mono text-xs">{formatBaht(row.price_thb)}</span>,
    },
    {
      key: "status",
      header: "สถานะ",
      render: (row) => (
        <StatusPill
          status={statusLabel(row.status)}
          tone={row.status === "Published" ? "accent" : "muted"}
        />
      ),
    },
    {
      key: "actions",
      header: "",
      render: (row) => (
        <AdminRowActions
          actions={[
            { label: "เปิดหน้าชิ้นงาน", href: `/object/${row.id}`, onClick: () => undefined },
            {
              label: row.status === "Paused" ? "เผยแพร่" : "พักขาย",
              onClick: () => {
                const next = row.status === "Paused" ? "Published" : "Paused";
                setStatus.mutate(
                  { id: row.id, status: next },
                  {
                    onSuccess: () => toast.success(next === "Paused" ? "พักขายแล้ว" : "เผยแพร่แล้ว"),
                    onError: (error) => toast.error(objectErrorText(error)),
                  },
                );
              },
            },
            {
              label: "ลบ",
              destructive: true,
              onClick: () => {
                if (!window.confirm(`ลบ "${row.title}"?`)) return;
                remove.mutate(row.id, {
                  onSuccess: () => toast.success("ลบแล้ว"),
                  onError: (error) => toast.error(objectErrorText(error)),
                });
              },
            },
          ]}
        />
      ),
    },
  ];

  const orderCols: Column<ObjectOrder>[] = [
    { key: "title", header: "ชิ้นงาน", render: (row) => row.object_title },
    { key: "qty", header: "จำนวน", render: (row) => String(row.qty) },
    { key: "status", header: "สถานะ", render: (row) => orderStatusLabel(row.status) },
    { key: "tracking", header: "เลขติดตาม", render: (row) => row.tracking_code || "—" },
    {
      key: "seller",
      header: "ผู้ขาย",
      render: (row) => (
        <a href={`/u/${row.seller_id}`} className="font-mono text-xs text-admin-accent hover:underline">
          {row.seller_id.slice(0, 8)}…
        </a>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <SectionHeader
        eyebrow="objects"
        title="Objects"
        description="ของที่ศิลปินและดีไซเนอร์ขายเอง — วัตถุ อาร์ตทอย ภาพพิมพ์ และไฟล์"
        actions={<SearchBar value={q} onChange={setQ} placeholder="ค้นหาชื่อ / รหัส…" />}
      />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard label="ทั้งหมด" value={listings.data?.length ?? 0} icon={Box} />
        <KpiCard label="เผยแพร่" value={published} icon={ShoppingBag} accent />
        <KpiCard label="พักขาย" value={paused} icon={PauseCircle} />
        <KpiCard label="คำสั่งค้าง" value={openOrders} icon={Box} />
      </div>
      <Tabs value={view} onValueChange={(next) => setView(next as "listings" | "orders")}>
        <TabsList className="h-9">
          <TabsTrigger value="listings" className="text-xs">ชิ้นงาน</TabsTrigger>
          <TabsTrigger value="orders" className="text-xs">คำสั่งซื้อ</TabsTrigger>
        </TabsList>
      </Tabs>
      {view === "listings" ? (
        <>
          <Tabs value={listingFilter} onValueChange={(next) => setListingFilter(next as ListingFilter)}>
            <TabsList className="h-9">
              <TabsTrigger value="all" className="text-xs">ทั้งหมด</TabsTrigger>
              <TabsTrigger value="Published" className="text-xs">เผยแพร่</TabsTrigger>
              <TabsTrigger value="Draft" className="text-xs">แบบร่าง</TabsTrigger>
              <TabsTrigger value="Paused" className="text-xs">พักขาย</TabsTrigger>
            </TabsList>
          </Tabs>
          <DataTable columns={listingCols} rows={rows} loading={listings.isLoading} rowKey={(row) => row.id} empty="ยังไม่มี Objects" />
        </>
      ) : (
        <DataTable columns={orderCols} rows={orders.data ?? []} loading={orders.isLoading} rowKey={(row) => row.id} empty="ยังไม่มีคำสั่งซื้อ" />
      )}
    </div>
  );
}
