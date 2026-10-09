import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Box, MoreHorizontal, Plus } from "lucide-react";
import { toast } from "sonner";
import ObjectEditorDialog from "@/components/objects/ObjectEditorDialog";
import ObjectPaySheet from "@/components/objects/ObjectPaySheet";
import { ObjectStage } from "@/components/objects/ObjectCard";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import EmptyState from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import {
  useDeleteObject,
  useMyObjects,
  useObjectOrders,
  useSetObjectStatus,
  useUpdateObjectOrder,
} from "@/hooks/useCreatorObjects";
import { isObjectsTableMissing, objectErrorText } from "@/lib/objects/db";
import {
  formatBaht,
  orderStatusLabel,
  sellerReleaseLabel,
  statusLabel,
  type CreatorObject,
  type ObjectOrder,
  type ObjectOrderStatus,
  type ObjectStatus,
} from "@/lib/objects/taxonomy";

const PRODUCT_FILTERS: { id: "all" | ObjectStatus; label: string }[] = [
  { id: "all", label: "ทั้งหมด" },
  { id: "Published", label: "กำลังขาย" },
  { id: "Paused", label: "พักขาย" },
  { id: "Draft", label: "แบบร่าง" },
];

const ORDER_FILTERS: { id: string; label: string; match: (row: ObjectOrder) => boolean }[] = [
  { id: "all", label: "ทั้งหมด", match: () => true },
  { id: "unpaid", label: "รอชำระ", match: (row) => row.status === "unpaid" || row.status === "inquiry" },
  { id: "ship", label: "ต้องจัดส่ง", match: (row) => row.status === "confirmed" || row.status === "preparing" },
  { id: "shipped", label: "ส่งแล้ว", match: (row) => row.status === "shipped" },
  { id: "done", label: "สำเร็จ", match: (row) => row.status === "completed" },
  { id: "cancelled", label: "ยกเลิก", match: (row) => row.status === "cancelled" },
];

export default function PortfolioObjectsManagePanel() {
  const { user } = useAuth();
  const ownerId = user?.id;
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") === "selling" || params.get("tab") === "buying" ? params.get("tab")! : "listings";
  const objects = useMyObjects(ownerId);
  const selling = useObjectOrders(ownerId, "seller");
  const buying = useObjectOrders(ownerId, "buyer");
  const remove = useDeleteObject(ownerId);
  const setStatus = useSetObjectStatus(ownerId);
  const updateOrder = useUpdateObjectOrder();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<CreatorObject | null>(null);
  const [productFilter, setProductFilter] = useState<(typeof PRODUCT_FILTERS)[number]["id"]>("all");
  const [productQuery, setProductQuery] = useState("");
  const [orderFilter, setOrderFilter] = useState("all");
  const [payOrder, setPayOrder] = useState<ObjectOrder | null>(null);

  const openNew = () => {
    setEditing(null);
    setEditorOpen(true);
  };

  const setTab = (next: string) => {
    const copy = new URLSearchParams(params);
    if (next === "listings") copy.delete("tab");
    else copy.set("tab", next);
    setParams(copy, { replace: true });
    setOrderFilter("all");
  };

  const listings = useMemo(() => {
    const q = productQuery.trim().toLowerCase();
    return (objects.data ?? []).filter((item) => {
      if (productFilter !== "all" && item.status !== productFilter) return false;
      if (!q) return true;
      return item.title.toLowerCase().includes(q);
    });
  }, [objects.data, productFilter, productQuery]);

  const saveOrder = (id: string, status: ObjectOrderStatus, trackingCode?: string, ok = "อัปเดตคำสั่งแล้ว") => {
    updateOrder.mutate(
      { id, status, trackingCode },
      {
        onSuccess: () => toast.success(ok),
        onError: (error) => toast.error(objectErrorText(error)),
      },
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">ร้านของฉัน</h2>
          <p className="text-sm text-muted-foreground">ของที่ถือได้และไฟล์ที่ผู้ซื้อเอาไปใช้ได้ ไม่ใช่งานจ้างตามบรีฟ</p>
        </div>
        <Button type="button" onClick={openNew}>
          <Plus className="h-4 w-4" />
          ลงชิ้นใหม่
        </Button>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="listings">สินค้าของฉัน</TabsTrigger>
          <TabsTrigger value="selling">คำสั่งที่ขาย</TabsTrigger>
          <TabsTrigger value="buying">คำสั่งที่ซื้อ</TabsTrigger>
        </TabsList>
        <TabsContent value="listings" className="mt-4 space-y-3">
          <Input
            value={productQuery}
            onChange={(event) => setProductQuery(event.target.value)}
            placeholder="ค้นชื่อสินค้า"
            aria-label="ค้นชื่อสินค้า"
          />
          <FilterChips<"all" | ObjectStatus> options={PRODUCT_FILTERS} value={productFilter} onChange={setProductFilter} />
          {objects.isLoading ? (
            <p className="text-sm text-muted-foreground">กำลังโหลด…</p>
          ) : objects.isError ? (
            <EmptyState icon={Box} title="โหลดของไม่สำเร็จ" description={friendlyObjectError(objects.error)} />
          ) : (objects.data ?? []).length === 0 ? (
            <EmptyState
              icon={Box}
              title="ยังไม่มีสินค้า"
              description="เริ่มจากแบบร่าง แล้วเผยแพร่เมื่อมีผลงานและยืนยันตัวตนแล้ว"
              action={<Button type="button" onClick={openNew}>ลงชิ้นแรก</Button>}
            />
          ) : listings.length === 0 ? (
            <EmptyState icon={Box} title="ไม่พบสินค้าตามที่เลือก" />
          ) : (
            <ul className="grid gap-3">
              {listings.map((item) => (
                <li key={item.id} className="flex gap-3 rounded-lg border bg-card p-3">
                  <ObjectStage item={item} className="h-20 w-20 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="truncate font-medium">{item.title}</p>
                      <span className="shrink-0 text-xs text-muted-foreground">{statusLabel(item.status)}</span>
                    </div>
                    <p className="mt-1 text-base font-medium">{formatBaht(item.price_thb)}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <Button type="button" size="sm" variant="outline" onClick={() => { setEditing(item); setEditorOpen(true); }}>
                        แก้ไข
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button type="button" size="icon" variant="ghost" aria-label={`เมนู ${item.title}`}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {item.status === "Published" ? (
                            <DropdownMenuItem onClick={() => changeStatus(setStatus, item.id, "Paused")}>พักขาย</DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => changeStatus(setStatus, item.id, "Published")}>เผยแพร่</DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => {
                              if (!window.confirm(`ลบ "${item.title}"?`)) return;
                              remove.mutate(item.id, {
                                onSuccess: () => toast.success("ลบแล้ว"),
                                onError: (error) => toast.error(objectErrorText(error)),
                              });
                            }}
                          >
                            ลบ
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>
        <TabsContent value="selling" className="mt-4">
          <OrderCards
            rows={selling.data ?? []}
            loading={selling.isLoading}
            error={selling.error}
            empty="ยังไม่มีคำสั่งขาย"
            filter={orderFilter}
            onFilter={setOrderFilter}
            role="seller"
            onUpdate={saveOrder}
          />
        </TabsContent>
        <TabsContent value="buying" className="mt-4">
          <OrderCards
            rows={buying.data ?? []}
            loading={buying.isLoading}
            error={buying.error}
            empty="ยังไม่ได้สั่งชิ้นไหน"
            filter={orderFilter}
            onFilter={setOrderFilter}
            role="buyer"
            onUpdate={saveOrder}
            onPay={setPayOrder}
          />
        </TabsContent>
      </Tabs>

      {ownerId ? (
        <ObjectEditorDialog ownerId={ownerId} open={editorOpen} object={editing} onOpenChange={setEditorOpen} />
      ) : null}
      {ownerId && payOrder ? (
        <ObjectPaySheet
          open
          onOpenChange={(next) => {
            if (!next) setPayOrder(null);
          }}
          item={{
            id: payOrder.object_id,
            title: payOrder.object_title,
            owner_id: payOrder.seller_id,
            price_thb: payOrder.unit_price_thb,
            fulfillment: payOrder.fulfillment,
          }}
          buyerId={ownerId}
          qty={payOrder.qty}
          finish={payOrder.finish}
          note={payOrder.note}
          orderId={payOrder.id}
          amountSatang={payOrder.amount_satang}
        />
      ) : null}
    </div>
  );
}

function changeStatus(setStatus: ReturnType<typeof useSetObjectStatus>, id: string, status: ObjectStatus) {
  setStatus.mutate(
    { id, status },
    {
      onSuccess: () => toast.success(status === "Published" ? "เผยแพร่แล้ว" : "พักขายแล้ว"),
      onError: (error) => toast.error(objectErrorText(error)),
    },
  );
}

function friendlyObjectError(error: unknown): string {
  if (isObjectsTableMissing(error)) return "ระบบสินค้ายังไม่พร้อมบนฐานข้อมูลนี้";
  return objectErrorText(error);
}

function FilterChips<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {options.map((item) => (
        <button
          key={item.id}
          type="button"
          aria-pressed={value === item.id}
          onClick={() => onChange(item.id)}
          className={
            value === item.id
              ? "shrink-0 rounded-full bg-foreground px-3 py-1 text-xs text-background"
              : "shrink-0 rounded-full border px-3 py-1 text-xs"
          }
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

function OrderCards({
  rows,
  loading,
  error,
  empty,
  filter,
  onFilter,
  role,
  onUpdate,
  onPay,
}: {
  rows: ObjectOrder[];
  loading: boolean;
  error: unknown;
  empty: string;
  filter: string;
  onFilter: (id: string) => void;
  role: "seller" | "buyer";
  onUpdate: (id: string, status: ObjectOrderStatus, trackingCode?: string, ok?: string) => void;
  onPay?: (row: ObjectOrder) => void;
}) {
  const [tracking, setTracking] = useState<Record<string, string>>({});
  const visible = rows.filter((row) => ORDER_FILTERS.find((item) => item.id === filter)?.match(row) ?? true);
  if (loading) return <p className="text-sm text-muted-foreground">กำลังโหลด…</p>;
  if (error) return <EmptyState icon={Box} title="โหลดคำสั่งไม่สำเร็จ" description={friendlyObjectError(error)} />;
  return (
    <div className="space-y-3">
      <FilterChips options={ORDER_FILTERS.map(({ id, label }) => ({ id, label }))} value={filter} onChange={onFilter} />
      {!rows.length ? (
        <EmptyState icon={Box} title={empty} />
      ) : !visible.length ? (
        <EmptyState icon={Box} title="ไม่มีคำสั่งในสถานะนี้" />
      ) : (
        <ul className="grid gap-3">
          {visible.map((row) => {
            const release = sellerReleaseLabel(row.seller_release);
            const amount = row.amount_satang > 0 ? formatBaht(Math.round(row.amount_satang / 100)) : null;
            return (
              <li key={row.id} className="rounded-lg border bg-card p-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-medium">{row.object_title}</p>
                  <span className="shrink-0 text-xs font-medium text-orange-600">{orderStatusLabel(row.status)}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {row.finish ? `${row.finish} · ` : ""}
                  จำนวน {row.qty}
                  {amount ? ` · ${amount}` : ""}
                </p>
                {row.note ? <p className="mt-1 text-xs text-muted-foreground">{row.note}</p> : null}
                {role === "seller" && row.ship_address ? (
                  <p className="mt-2 text-xs leading-5">
                    ส่งถึง {row.ship_name} {row.ship_phone}
                    <br />
                    {row.ship_address}
                  </p>
                ) : null}
                {role === "seller" && release ? <p className="mt-2 text-xs text-muted-foreground">{release}</p> : null}
                {role === "seller" && row.seller_net_satang > 0 && row.payment_status === "paid" ? (
                  <p className="text-xs text-muted-foreground">คุณได้ {formatBaht(Math.round(row.seller_net_satang / 100))} หลังหักค่าธรรมเนียม</p>
                ) : null}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {role === "seller" && (row.status === "confirmed" || row.status === "preparing") ? (
                    <>
                      {row.status === "confirmed" ? (
                        <Button type="button" size="sm" variant="outline" onClick={() => onUpdate(row.id, "preparing", undefined, "เริ่มแพ็กแล้ว")}>
                          กำลังแพ็ก
                        </Button>
                      ) : null}
                      {row.fulfillment !== "download" ? (
                        <Input
                          className="h-8 w-40"
                          placeholder="เลขติดตาม"
                          aria-label={`เลขติดตาม ${row.object_title}`}
                          value={tracking[row.id] ?? row.tracking_code}
                          onChange={(event) => setTracking((current) => ({ ...current, [row.id]: event.target.value }))}
                        />
                      ) : null}
                      <Button
                        type="button"
                        size="sm"
                        onClick={() =>
                          onUpdate(
                            row.id,
                            "shipped",
                            row.fulfillment === "download" ? "" : (tracking[row.id] ?? row.tracking_code),
                            "บันทึกว่าส่งแล้ว",
                          )
                        }
                      >
                        {row.fulfillment === "download" ? "ส่งไฟล์แล้ว" : "ส่งแล้ว"}
                      </Button>
                    </>
                  ) : null}
                  {role === "buyer" && row.tracking_code ? (
                    <p className="text-sm">เลขติดตาม {row.tracking_code}</p>
                  ) : null}
                  {role === "seller" && row.status === "shipped" && row.tracking_code ? (
                    <p className="text-sm">เลขติดตาม {row.tracking_code}</p>
                  ) : null}
                  {role === "buyer" && row.status === "unpaid" ? (
                    <Button type="button" size="sm" onClick={() => onPay?.(row)}>
                      จ่ายต่อ
                    </Button>
                  ) : null}
                  {role === "buyer" && (row.status === "unpaid" || row.status === "inquiry") ? (
                    <Button type="button" size="sm" variant="outline" onClick={() => onUpdate(row.id, "cancelled", undefined, "ยกเลิกคำสั่งแล้ว")}>
                      ยกเลิก
                    </Button>
                  ) : null}
                  {role === "buyer" && row.status === "shipped" ? (
                    <Button type="button" size="sm" onClick={() => onUpdate(row.id, "completed", undefined, "รับของแล้ว")}>
                      ได้รับของแล้ว
                    </Button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
