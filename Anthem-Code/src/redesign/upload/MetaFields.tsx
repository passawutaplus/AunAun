import { useMemo, useState } from "react";
import { isAudioTool, normalizeToolKey, useToolSuggestions } from "@/hooks/useToolSuggestions";
import { AI_USE_LEVEL_META, AI_USE_LEVELS, type AiUseLevel } from "@/lib/aiDisclosure";
import { getLicenseMeta, getLicensePickerOptions, isLicenseType, type LicenseType } from "@/lib/licenses";
import { LICENSE_NOTE_MAX, TOOLS_MAX } from "./model";

/**
 * Upload's TOOLS, LICENSE, AI and CATALOG fields: the old editor's ToolPicker, LicensePicker,
 * AiDisclosureToggle and series picker (same columns), in the Upload look. Styles: upload.css `.up-tool*`, `.up-opt*`.
 */

export function ToolsField({ uid, tools, onChange }: { uid: string; tools: string[]; onChange: (tools: string[]) => void }) {
  const [input, setInput] = useState("");
  const suggestions = useToolSuggestions(uid);
  const chosen = useMemo(() => new Set(tools.map(normalizeToolKey)), [tools]);
  const full = tools.length >= TOOLS_MAX;

  const add = (raw: string) => {
    const label = raw.trim().replace(/,+$/, "").trim();
    const key = normalizeToolKey(label);
    setInput("");
    if (!key || chosen.has(key) || full) return;
    onChange([...tools, label]);
  };

  const q = normalizeToolKey(input);
  const shown = useMemo(() => {
    // As the old picker: audio apps only show up once you search.
    const pool = suggestions.filter((s) => !chosen.has(normalizeToolKey(s)) && (q || !isAudioTool(s)));
    if (!q) return pool.slice(0, 5);
    return pool.filter((s) => normalizeToolKey(s).includes(q) || q.includes(normalizeToolKey(s))).slice(0, 8);
  }, [suggestions, chosen, q]);

  return (
    <div className="up-f">
      <label htmlFor="up-tools" className="up-lab">
        TOOLS
      </label>
      {tools.length ? (
        <ul className="up-tools" aria-label="เครื่องมือที่ใช้">
          {tools.map((t, i) => (
            <li key={`${t}-${i}`} className="up-tool">
              {t}
              <button type="button" className="up-tool-x" aria-label={`เอา ${t} ออก`} onClick={() => onChange(tools.filter((_, k) => k !== i))}>
                <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <input
        id="up-tools"
        className="up-fld"
        type="text"
        value={input}
        maxLength={60}
        disabled={full}
        onChange={(e) => {
          const v = e.target.value;
          if (v.endsWith(",")) add(v);
          else setInput(v);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            add(input);
          } else if (e.key === "Backspace" && !input && tools.length) {
            onChange(tools.slice(0, -1));
          }
        }}
        onBlur={() => {
          if (input.trim()) add(input);
        }}
        placeholder={full ? `ครบ ${TOOLS_MAX} อย่างแล้ว` : "Procreate, Figma…"}
      />
      {shown.length && !full ? (
        <div className="up-tool-sug" aria-label="เลือกจากที่ใช้บ่อย">
          {shown.map((s) => (
            // mousedown: pick before the field's blur adds what was typed
            <button key={s} type="button" className="up-tool-s" onMouseDown={(e) => e.preventDefault()} onClick={() => add(s)}>
              + {s}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function LicenseField({
  value,
  note,
  missing,
  onChange,
  onNote,
}: {
  value: LicenseType;
  note: string;
  missing: boolean;
  onChange: (v: LicenseType) => void;
  onNote: (v: string) => void;
}) {
  const meta = getLicenseMeta(value);
  return (
    <div className="up-f">
      <label htmlFor="up-license" className={missing ? "up-lab up-lab-miss" : "up-lab"}>
        LICENSE
      </label>
      <select
        id="up-license"
        className="up-fld up-sel"
        value={value}
        onChange={(e) => {
          if (isLicenseType(e.target.value)) onChange(e.target.value);
        }}
      >
        {getLicensePickerOptions(value).map((o) => (
          <option key={o.id} value={o.id}>
            {o.shortLabel}
          </option>
        ))}
      </select>
      <p className="up-fhint">{meta.description}</p>
      {value === "custom" ? (
        <textarea
          id="up-license-note"
          className={missing ? "up-ta up-fld-miss" : "up-ta"}
          rows={2}
          maxLength={LICENSE_NOTE_MAX}
          value={note}
          aria-label="เงื่อนไขการใช้งาน"
          aria-required="true"
          aria-invalid={missing || undefined}
          onChange={(e) => onNote(e.target.value)}
          placeholder="ใช้ในโซเชียลได้ แต่ห้ามพิมพ์ขายนะ"
        />
      ) : null}
    </div>
  );
}

export function AiField({ value, onChange }: { value: AiUseLevel | null; onChange: (v: AiUseLevel | null) => void }) {
  const opts: ReadonlyArray<readonly [AiUseLevel | null, string]> = [[null, "ไม่ใช้"], ...AI_USE_LEVELS.map((l) => [l, AI_USE_LEVEL_META[l].shortLabel] as const)];
  return (
    <div className="up-f" role="radiogroup" aria-labelledby="up-ai-l">
      <span id="up-ai-l" className="up-lab">
        AI
      </span>
      <div className="up-opts">
        {opts.map(([v, label]) => (
          <button key={label} type="button" role="radio" aria-checked={value === v} className={value === v ? "up-opt up-opt-on" : "up-opt"} onClick={() => onChange(v)}>
            {label}
          </button>
        ))}
      </div>
      <p className="up-fhint">{value ? AI_USE_LEVEL_META[value].hint : "ใช้ AI ช่วยทำไหม บอกไว้ให้คนดูรู้นะ"}</p>
    </div>
  );
}

export function CatalogField({
  catalogs,
  value,
  onChange,
}: {
  catalogs: ReadonlyArray<{ id: string; title: string }>;
  value: readonly string[];
  onChange: (ids: string[]) => void;
}) {
  const list = catalogs.filter((c) => c.title);
  return (
    <div className="up-f" role="group" aria-labelledby="up-cat-l">
      <span id="up-cat-l" className="up-lab">
        CATALOG
      </span>
      {list.length ? (
        <div className="up-opts">
          {list.map((c) => {
            const on = value.includes(c.id);
            return (
              <button
                key={c.id}
                type="button"
                data-id={c.id}
                aria-pressed={on}
                className={on ? "up-opt up-cat up-opt-on" : "up-opt up-cat"}
                onClick={() => onChange(on ? value.filter((x) => x !== c.id) : [...value, c.id])}
              >
                {c.title}
              </button>
            );
          })}
        </div>
      ) : (
        <p className="up-fhint">ยังไม่มี Catalog สร้างได้ที่ My Studio นะ</p>
      )}
    </div>
  );
}
