import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useMarketingContext } from "@/hooks/admin/MarketingContext";
import { useMarketingBusinesses } from "@/hooks/admin/useMarketingBusinesses";
import { MARKETING_APLUS1_DEFAULT_BUSINESS } from "@/lib/marketing/aplus1";
import { MARKETING_BUSINESS_PRESETS, MARKETING_PLATFORMS, type MarketingLanguage } from "@/lib/marketing/types";
import { MarketingCard } from "./MarketingShell";

const defaultForm = () => ({
  business_name: MARKETING_APLUS1_DEFAULT_BUSINESS.business_name,
  category: MARKETING_BUSINESS_PRESETS[0],
  product_service: MARKETING_APLUS1_DEFAULT_BUSINESS.product_service,
  target_customer: MARKETING_APLUS1_DEFAULT_BUSINESS.target_customer,
  location: MARKETING_APLUS1_DEFAULT_BUSINESS.location,
  language: "both" as MarketingLanguage,
  main_keyword: MARKETING_APLUS1_DEFAULT_BUSINESS.main_keyword,
  pain_points: MARKETING_APLUS1_DEFAULT_BUSINESS.pain_points.join(", "),
  goals: MARKETING_APLUS1_DEFAULT_BUSINESS.goals.join(", "),
  preferred_platforms: [...MARKETING_APLUS1_DEFAULT_BUSINESS.preferred_platforms],
});

export default function MarketingBusinessSetup() {
  const { uiLanguage, setLanguagePref } = useMarketingContext();
  const { activeBusiness, createBusiness, updateBusiness, isSaving } = useMarketingBusinesses();
  const [form, setForm] = useState(defaultForm);

  useEffect(() => {
    if (!activeBusiness) {
      setForm(defaultForm());
      return;
    }
    setForm({
      business_name: activeBusiness.business_name,
      category: activeBusiness.category,
      product_service: activeBusiness.product_service ?? "",
      target_customer: activeBusiness.target_customer ?? "",
      location: activeBusiness.location ?? "",
      language: activeBusiness.language,
      main_keyword: activeBusiness.main_keyword ?? "",
      pain_points: (activeBusiness.pain_points ?? []).join(", "),
      goals: (activeBusiness.goals ?? []).join(", "),
      preferred_platforms: activeBusiness.preferred_platforms ?? [],
    });
    setLanguagePref(activeBusiness.language);
  }, [activeBusiness, setLanguagePref]);

  const applyPreset = (category: string) => {
    if (category === MARKETING_BUSINESS_PRESETS[0]) {
      setForm({ ...defaultForm(), category });
      return;
    }
    setForm((f) => ({ ...f, category, business_name: category }));
  };

  const togglePlatform = (p: string) => {
    setForm((f) => ({
      ...f,
      preferred_platforms: f.preferred_platforms.includes(p)
        ? f.preferred_platforms.filter((x) => x !== p)
        : [...f.preferred_platforms, p],
    }));
  };

  const save = async () => {
    const payload = {
      business_name: form.business_name || form.category,
      category: form.category,
      product_service: form.product_service || null,
      target_customer: form.target_customer || null,
      location: form.location || null,
      language: form.language,
      main_keyword: form.main_keyword || null,
      pain_points: form.pain_points.split(",").map((s) => s.trim()).filter(Boolean),
      goals: form.goals.split(",").map((s) => s.trim()).filter(Boolean),
      preferred_platforms: form.preferred_platforms,
    };
    try {
      if (activeBusiness) await updateBusiness({ id: activeBusiness.id, patch: payload });
      else await createBusiness(payload);
      toast.success(uiLanguage === "th" ? "บันทึก scope growth Aplus1 แล้ว" : "Aplus1 growth scope saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    }
  };

  const inputClass = "marketing-input mt-1 w-full rounded-lg px-3 py-2 text-sm";

  return (
    <MarketingCard className="p-5">
      <h2 className="text-lg font-semibold text-admin-fg">
        {uiLanguage === "th" ? "ตั้งค่า growth Aplus1" : "Aplus1 growth scope"}
      </h2>
      <p className="mt-1 text-sm text-admin-muted">
        {uiLanguage === "th"
          ? "กำหนดกลุ่มเป้าหมาย creator แบรนด์จ้างงาน สตูดิโอ และช่องทางที่ทีมติดตาม"
          : "Define creator, hirer, studio targets and channels your team monitors"}
      </p>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <label className="text-sm">
          <span className="text-admin-muted">Growth preset</span>
          <select
            className={inputClass}
            value={form.category}
            onChange={(e) => applyPreset(e.target.value)}
          >
            {MARKETING_BUSINESS_PRESETS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="text-admin-muted">Scope name</span>
          <input className={inputClass} value={form.business_name} onChange={(e) => setForm((f) => ({ ...f, business_name: e.target.value }))} />
        </label>
        <label className="text-sm md:col-span-2">
          <span className="text-admin-muted">Keywords (creator / hire / collab)</span>
          <input className={inputClass} value={form.main_keyword} onChange={(e) => setForm((f) => ({ ...f, main_keyword: e.target.value }))} />
        </label>
        <label className="text-sm md:col-span-2">
          <span className="text-admin-muted">Pain points</span>
          <input className={inputClass} value={form.pain_points} onChange={(e) => setForm((f) => ({ ...f, pain_points: e.target.value }))} />
        </label>
        <label className="text-sm md:col-span-2">
          <span className="text-admin-muted">Goals</span>
          <input className={inputClass} value={form.goals} onChange={(e) => setForm((f) => ({ ...f, goals: e.target.value }))} />
        </label>
        <label className="text-sm">
          <span className="text-admin-muted">Output language</span>
          <select className={inputClass} value={form.language} onChange={(e) => setForm((f) => ({ ...f, language: e.target.value as MarketingLanguage }))}>
            <option value="th">TH</option>
            <option value="en">EN</option>
            <option value="both">Both</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="text-admin-muted">Market</span>
          <input className={inputClass} value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} />
        </label>
      </div>
      <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-admin-muted">Channels to watch</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {MARKETING_PLATFORMS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => togglePlatform(p)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium ${
              form.preferred_platforms.includes(p) ? "marketing-pill-on" : "marketing-pill-off"
            }`}
          >
            {p}
          </button>
        ))}
      </div>
      <button
        type="button"
        disabled={isSaving}
        onClick={() => void save()}
        className="marketing-btn-primary mt-6 rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-60"
      >
        {uiLanguage === "th" ? "บันทึก" : "Save"}
      </button>
    </MarketingCard>
  );
}
