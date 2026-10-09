import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import SeoHead from "@/components/SeoHead";
import { ObjectStage } from "@/components/objects/ObjectCard";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import ObjectPaySheet from "@/components/objects/ObjectPaySheet";
import { useCreatorObject, useObjectOrders } from "@/hooks/useCreatorObjects";
import { openObjectChat } from "@/lib/objects/openObjectChat";
import { objectErrorText } from "@/lib/objects/db";
import { findSampleObject } from "@/lib/objects/samples";
import { profilePublicPath } from "@/lib/profileRoutes";
import { requireAuth } from "@/lib/requireAuth";
import {
  axisLabel,
  editionLabel,
  formatEditionQuantity,
  formatBaht,
  fulfillmentLabel,
  isEditionSoldOut,
  isSampleObjectId,
  kindLabel,
  subtypeLabel,
} from "@/lib/objects/taxonomy";

export default function ObjectDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const sample = isSampleObjectId(id) ? findSampleObject(id) : null;
  const query = useCreatorObject(sample ? undefined : id);
  const myOrders = useObjectOrders(user?.id, "buyer");
  const item = sample ?? query.data ?? null;
  const [finish, setFinish] = useState("");
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState("");
  const [payOpen, setPayOpen] = useState(false);
  const [chatting, setChatting] = useState(false);

  const activeFinish = finish || item?.finishes[0]?.name || "";
  const selectedFinish = item?.finishes.find((row) => row.name === activeFinish);
  const unitPrice =
    selectedFinish?.price_thb && selectedFinish.price_thb > 0 ? selectedFinish.price_thb : item?.price_thb ?? 0;
  const optionSoldOut = selectedFinish?.stock === 0;
  const loading = !sample && query.isLoading;
  const soldOut = item ? isEditionSoldOut(item.edition, item.edition_label) : false;
  const isOwner = !!user && !!item && user.id === item.owner_id;
  const paidForFile =
    !!item &&
    (myOrders.data ?? []).some(
      (order) => order.object_id === item.id && order.payment_status === "paid" && order.status !== "cancelled",
    );

  return (
    <main className="min-h-screen bg-[#f7f7f5] text-foreground">
      <SeoHead title={item ? item.title : "Objects"} path={`/object/${id}`} />
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
        <Link to="/?mode=objects" className="text-sm text-muted-foreground hover:text-foreground">
          กลับไป Objects
        </Link>
        {loading ? (
          <p className="py-16 text-sm text-muted-foreground">กำลังโหลดชิ้นงาน…</p>
        ) : query.isError ? (
          <p className="py-16 text-sm">{objectErrorText(query.error)}</p>
        ) : !item ? (
          <p className="py-16 text-sm">ไม่พบชิ้นงานนี้</p>
        ) : (
          <article className="mt-6 space-y-10">
            <header className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-end">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  {item.code || kindLabel(item.kind)}
                </p>
                <h1 className="mt-2 text-4xl font-semibold tracking-tight sm:text-5xl">{item.title}</h1>
                <p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground">{item.summary}</p>
              </div>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <Fact label="ชนิด" value={subtypeLabel(item.kind, item.subtype)} />
                <Fact label={item.kind === "files" ? "ฟอร์แมต" : "วัสดุ"} value={axisLabel(item.material)} />
                <Fact label="ได้ของ" value={fulfillmentLabel(item.fulfillment)} />
                <Fact label="จำนวน" value={formatEditionQuantity(item.edition, item.edition_label) || editionLabel(item.edition)} />
                <Fact label="ราคา" value={`ตั้งแต่ ${formatBaht(item.price_thb)}`} />
                <Fact label="ระยะเวลา" value={item.lead_time || "—"} />
              </dl>
            </header>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
              <ObjectStage item={item} className="min-h-[22rem]" />
              <section className="space-y-4 border bg-white p-4">
                {item.sample ? (
                  <p className="text-sm text-muted-foreground">ตัวอย่างจัดวาง ยังสั่งซื้อไม่ได้</p>
                ) : isOwner ? (
                  <p className="text-sm text-muted-foreground">นี่คือสินค้าของคุณ</p>
                ) : soldOut || optionSoldOut ? (
                  <p className="text-sm text-muted-foreground">ขายหมดแล้ว ยังทักคนทำได้</p>
                ) : (
                  <>
                    {item.finishes.length > 0 ? (
                      <div>
                        <p className="text-xs text-muted-foreground">ฟินิช</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {item.finishes.map((swatch) => (
                            <button
                              key={swatch.name}
                              type="button"
                              aria-pressed={activeFinish === swatch.name}
                              onClick={() => setFinish(swatch.name)}
                              className="inline-flex items-center gap-2 rounded-full border px-2 py-1 text-xs"
                            >
                              {swatch.image_url ? (
                                <img src={swatch.image_url} alt="" className="h-4 w-4 rounded-full border object-cover" />
                              ) : (
                                <span className="h-4 w-4 rounded-full border" style={{ backgroundColor: swatch.hex }} />
                              )}
                              {swatch.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    <p className="text-2xl font-medium">{formatBaht(unitPrice)}</p>
                    {typeof selectedFinish?.stock === "number" ? (
                      <p className="text-xs text-muted-foreground">คงเหลือ {selectedFinish.stock}</p>
                    ) : null}
                    {item.fulfillment !== "download" ? (
                      <label className="grid gap-1 text-xs text-muted-foreground">
                        จำนวน
                        <input
                          type="number"
                          min={1}
                          max={20}
                          value={qty}
                          onChange={(event) => setQty(Math.min(20, Math.max(1, Number(event.target.value) || 1)))}
                          className="h-10 w-24 rounded-md border bg-card px-3 text-sm text-foreground"
                        />
                      </label>
                    ) : null}
                    <label className="grid gap-1 text-xs text-muted-foreground">
                      ข้อความถึงคนทำ
                      <Textarea value={note} onChange={(event) => setNote(event.target.value)} rows={3} />
                    </label>
                    <Button type="button" className="w-full" onClick={() => requireAuth(user, () => setPayOpen(true))}>
                      {item.fulfillment === "download" ? "ซื้อไฟล์" : "สั่งซื้อ"}
                    </Button>
                    <p className="text-xs leading-5 text-muted-foreground">
                      จ่ายผ่าน Payso คนขายส่งของเองแล้วใส่เลขติดตามให้ดูในคำสั่งที่ซื้อ
                    </p>
                  </>
                )}
                {!item.sample && !isOwner ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    disabled={chatting}
                    onClick={() =>
                      requireAuth(user, () => {
                        setChatting(true);
                        void openObjectChat(
                          user!.id,
                          item.owner_id,
                          {
                            id: item.id,
                            title: item.title,
                            price_thb: item.price_thb,
                            cover_url: item.cover_url,
                          },
                          note,
                        )
                          .then((conversationId) => {
                            toast.success("เปิดแชทกับคนทำแล้ว");
                            navigate(`/chat/${conversationId}`);
                          })
                          .catch((error: unknown) => toast.error(objectErrorText(error)))
                          .finally(() => setChatting(false));
                      })
                    }
                  >
                    {chatting ? "กำลังเปิดแชท" : "ทักคนทำ"}
                  </Button>
                ) : null}
                {(isOwner || paidForFile) && item.downloads.length > 0 ? (
                  <ul className="space-y-1 text-sm">
                    {item.downloads.map((file) => (
                      <li key={file.label}>
                        <a href={file.url} className="underline underline-offset-2">
                          {file.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : null}
                {!item.sample && item.maker_username ? (
                  <Link
                    to={profilePublicPath({ user_id: item.owner_id, username: item.maker_username })}
                    className="block text-sm underline underline-offset-2"
                  >
                    {item.maker_name}
                  </Link>
                ) : (
                  <p className="text-sm">{item.maker_name}</p>
                )}
              </section>
            </div>

            {item.story ? (
              <section className="max-w-2xl">
                <h2 className="text-xs uppercase tracking-[0.18em] text-muted-foreground">จากคนทำ</h2>
                <p className="mt-3 text-sm leading-6">{item.story}</p>
              </section>
            ) : null}

            {!item.sample && item.reference_project_ids.length > 0 ? (
              <ObjectProjectRefs ids={item.reference_project_ids} />
            ) : null}

            <section id="sheet" className="border bg-white p-4 sm:p-8">
              <div className="flex items-baseline justify-between gap-4 border-b pb-4">
                <div>
                  <p className="text-lg font-semibold">{item.maker_name}</p>
                  <p className="text-sm text-muted-foreground">Product sheet</p>
                </div>
                <p className="text-right text-sm">
                  {item.title}
                  <br />
                  {item.code}
                </p>
              </div>
              <div className="grid gap-8 py-6 lg:grid-cols-2">
                <ObjectStage item={item} className="min-h-64" />
                <table className="w-full text-sm">
                  <tbody>
                    {item.specs.filter((spec) => spec.label !== "ตัวเลือก").map((spec) => (
                      <tr key={spec.label} className="border-b">
                        <th className="py-2 pr-4 text-left font-normal text-muted-foreground">{spec.label}</th>
                        <td className="py-2">{spec.value}</td>
                      </tr>
                    ))}
                    {item.license_note ? (
                      <tr className="border-b">
                        <th className="py-2 pr-4 text-left font-normal text-muted-foreground">ไลเซนส์</th>
                        <td className="py-2">{item.license_note}</td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
              {item.finishes.length > 0 ? (
                <div className="flex flex-wrap gap-4">
                  {item.finishes.map((swatch) => (
                    <div key={swatch.name} className="text-xs">
                      {swatch.image_url ? (
                        <img src={swatch.image_url} alt="" className="h-10 w-16 border object-cover" />
                      ) : (
                        <div className="h-10 w-16 border" style={{ backgroundColor: swatch.hex }} />
                      )}
                      <p className="mt-1">{swatch.name}</p>
                    </div>
                  ))}
                </div>
              ) : null}
              <p className="mt-6 text-[11px] text-muted-foreground">
                ขนาดเป็นเซนติเมตร สีบนจอต่างจากของจริง
              </p>
            </section>
            {user && !item.sample && !isOwner && !soldOut ? (
              <ObjectPaySheet
                open={payOpen}
                onOpenChange={setPayOpen}
                item={{ ...item, price_thb: unitPrice }}
                buyerId={user.id}
                qty={item.fulfillment === "download" ? 1 : qty}
                finish={activeFinish}
                note={note}
              />
            ) : null}
          </article>
        )}
      </div>
    </main>
  );
}

function ObjectProjectRefs({ ids }: { ids: string[] }) {
  const { data = [] } = useQuery({
    queryKey: ["object-project-refs", ids.join(",")],
    enabled: ids.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, title, cover_url")
        .in("id", ids)
        .eq("status", "Published");
      if (error) throw error;
      return data ?? [];
    },
  });
  if (!data.length) return null;
  return (
    <section className="max-w-2xl">
      <h2 className="text-xs uppercase tracking-[0.18em] text-muted-foreground">จากผลงาน</h2>
      <ul className="mt-3 grid gap-2">
        {data.map((project) => (
          <li key={project.id}>
            <Link to={`/project/${project.id}`} className="flex items-center gap-3 text-sm underline-offset-2 hover:underline">
              {project.cover_url ? (
                <img src={project.cover_url} alt="" className="h-12 w-12 rounded object-cover" />
              ) : null}
              {project.title}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
