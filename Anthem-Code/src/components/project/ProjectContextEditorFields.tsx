import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

/** Stored in `creator_role` when the author did the whole project alone. */
export const CREATOR_ROLE_SOLO = "ฉันทำเองทั้งหมด";

export type ProjectContextForm = {
  brief: string;
  creatorRole: string;
  processNote: string;
  deliverables: string;
  durationLabel: string;
  outcomeNote: string;
};

type CreatorRoleMode = "solo" | "part";

function creatorRoleModeFromValue(role: string): CreatorRoleMode | "" {
  const trimmed = role.trim();
  if (!trimmed) return "";
  if (trimmed === CREATOR_ROLE_SOLO) return "solo";
  return "part";
}

type Props = {
  value: ProjectContextForm;
  onChange: (patch: Partial<ProjectContextForm>) => void;
  shortDescription: string;
  onShortDescriptionChange: (value: string) => void;
  /** Checked = allow filling background story fields. */
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  disabled?: boolean;
  shortDescriptionInvalid?: boolean;
};

const fieldLabel = "text-xs font-semibold text-muted-foreground";

/** Sidebar short blurb — keep brief so the right panel stays scannable. */
export const PROJECT_SHORT_DESCRIPTION_MAX = 300;

const ProjectContextEditorFields = ({
  value,
  onChange,
  shortDescription,
  onShortDescriptionChange,
  enabled,
  onEnabledChange,
  disabled,
  shortDescriptionInvalid,
}: Props) => {
  const [roleMode, setRoleMode] = useState<CreatorRoleMode | "">(() =>
    creatorRoleModeFromValue(value.creatorRole),
  );

  useEffect(() => {
    const next = creatorRoleModeFromValue(value.creatorRole);
    // Empty text after choosing "part" must keep the part mode so input stays enabled.
    if (next) setRoleMode(next);
  }, [value.creatorRole]);

  const fieldsLocked = disabled || !enabled;
  const canEditRole = roleMode === "part" && !fieldsLocked;
  const partRoleText = roleMode === "part" ? value.creatorRole : "";

  const clearRole = () => {
    setRoleMode("");
    onChange({ creatorRole: "" });
  };

  const selectRole = (next: CreatorRoleMode) => {
    if (roleMode === next) {
      clearRole();
      return;
    }
    if (next === "solo") {
      setRoleMode("solo");
      onChange({ creatorRole: CREATOR_ROLE_SOLO });
      return;
    }
    setRoleMode("part");
    onChange({
      creatorRole: value.creatorRole.trim() === CREATOR_ROLE_SOLO ? "" : value.creatorRole,
    });
  };

  return (
    <section className="space-y-3">
      <div className="space-y-1.5" id="project-short-description">
        <Label className={fieldLabel}>
          รายละเอียดแบบย่อ <span className="text-primary">*</span>
        </Label>
        <Textarea
          value={shortDescription}
          onChange={(e) =>
            onShortDescriptionChange(e.target.value.slice(0, PROJECT_SHORT_DESCRIPTION_MAX))
          }
          placeholder="สรุปสั้น ๆ ว่างานนี้คืออะไร ทำอะไร หรือจุดเด่นที่อยากให้จำ..."
          rows={3}
          maxLength={PROJECT_SHORT_DESCRIPTION_MAX}
          required
          disabled={disabled}
          aria-invalid={shortDescriptionInvalid || undefined}
          className={cn(
            "bg-card resize-y min-h-[80px] text-sm transition-colors duration-500 ease-out",
            shortDescriptionInvalid && "border-destructive focus-visible:ring-destructive/40",
          )}
          aria-required
        />
        <p className="text-[11px] text-muted-foreground text-right tabular-nums">
          {shortDescription.length}/{PROJECT_SHORT_DESCRIPTION_MAX}
        </p>
      </div>

      <div
        id="project-context-toggle"
        className={cn(
          "flex w-full items-center gap-2.5 rounded-lg bg-muted/70 px-3 py-2.5 transition-colors",
          disabled ? "opacity-50" : "hover:bg-muted",
        )}
      >
        <Checkbox
          id="project-context-enabled"
          checked={enabled}
          disabled={disabled}
          onCheckedChange={(v) => onEnabledChange(v === true)}
          aria-controls="project-context-fields"
        />
        <label
          htmlFor="project-context-enabled"
          className={cn(
            "flex min-w-0 flex-1 items-center justify-between gap-2 text-sm font-medium text-primary",
            disabled ? "cursor-not-allowed" : "cursor-pointer",
          )}
        >
          <span>เล่าเบื้องหลังผลงานเพิ่มเติม</span>
          <ChevronDown
            className={cn(
              "w-4 h-4 shrink-0 text-primary transition-transform duration-200",
              enabled && "rotate-180",
            )}
            aria-hidden
          />
        </label>
      </div>

      <div
        id="project-context-fields"
        className={cn(
          "grid transition-[grid-template-rows] duration-200 ease-out",
          enabled ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
        aria-hidden={!enabled}
      >
        <div className={cn(enabled ? "overflow-visible px-1" : "overflow-hidden")}>
          <div className={cn("space-y-3", fieldsLocked && "pointer-events-none opacity-60")}>
            <div className="space-y-2">
              <Label className={fieldLabel}>บทบาทของฉัน</Label>
              <RadioGroup
                value={roleMode || undefined}
                disabled={fieldsLocked}
                onValueChange={(next) => {
                  if (next === "solo" || next === "part") selectRole(next);
                }}
                className="gap-2"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                  <label
                    htmlFor="creator-role-solo"
                    onClick={(e) => {
                      if (fieldsLocked) return;
                      if (roleMode === "solo") {
                        e.preventDefault();
                        clearRole();
                      }
                    }}
                    className={cn(
                      "flex shrink-0 cursor-pointer items-center gap-2 rounded-md border border-border/70 bg-card px-3 py-2.5",
                      roleMode === "solo" && "border-primary/40 bg-primary/5",
                      fieldsLocked && "cursor-not-allowed opacity-50",
                    )}
                  >
                    <RadioGroupItem
                      id="creator-role-solo"
                      value="solo"
                      onClick={(e) => {
                        if (roleMode !== "solo") return;
                        e.preventDefault();
                        e.stopPropagation();
                        clearRole();
                      }}
                    />
                    <span className="whitespace-nowrap text-sm text-foreground leading-snug">
                      ฉันทำเองทั้งหมด
                    </span>
                  </label>

                  <label
                    htmlFor="creator-role-part"
                    onClick={(e) => {
                      if (fieldsLocked) return;
                      if (roleMode === "part") {
                        e.preventDefault();
                        clearRole();
                      }
                    }}
                    className={cn(
                      "flex shrink-0 cursor-pointer items-center gap-2 rounded-md border border-border/70 bg-card px-3 py-2.5",
                      roleMode === "part" && "border-primary/40 bg-primary/5",
                      fieldsLocked && "cursor-not-allowed opacity-50",
                    )}
                  >
                    <RadioGroupItem
                      id="creator-role-part"
                      value="part"
                      onClick={(e) => {
                        if (roleMode !== "part") return;
                        e.preventDefault();
                        e.stopPropagation();
                        clearRole();
                      }}
                    />
                    <span className="whitespace-nowrap text-sm text-foreground leading-snug">
                      เป็นส่วนหนึ่งในงานนี้
                    </span>
                  </label>

                  <Input
                    value={roleMode === "solo" ? "" : partRoleText}
                    onChange={(e) => {
                      if (!canEditRole) return;
                      onChange({ creatorRole: e.target.value });
                    }}
                    placeholder={
                      roleMode === "part"
                        ? "ทำหน้าที่อะไร เช่น Art Director, ออกแบบ UI"
                        : "เลือก「เป็นส่วนหนึ่งในงานนี้」เพื่อกรอกหน้าที่"
                    }
                    maxLength={80}
                    disabled={!canEditRole}
                    className={cn(
                      "min-w-0 flex-1 bg-card sm:min-w-[14rem]",
                      !canEditRole && "cursor-not-allowed opacity-60",
                    )}
                    aria-label="หน้าที่ในงานนี้"
                  />
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-1.5">
              <Label className={fieldLabel}>โจทย์ของงาน</Label>
              <Textarea
                value={value.brief}
                onChange={(e) => onChange({ brief: e.target.value })}
                placeholder="งานนี้เริ่มจากโจทย์หรือปัญหาอะไร เช่น รีแบรนด์ร้าน, ออกแบบแคมเปญ, ทำภาพประกอบให้บทความ"
                rows={3}
                maxLength={1500}
                disabled={fieldsLocked}
                className="bg-card resize-y min-h-[88px]"
              />
            </div>

            <div className="space-y-1.5">
              <Label className={fieldLabel}>วิธีคิด / ขั้นตอนทำงาน</Label>
              <Textarea
                value={value.processNote}
                onChange={(e) => onChange({ processNote: e.target.value })}
                placeholder="เล่าว่าคุณเริ่มคิดจากอะไร ทดลองอะไร หรือเลือกวิธีนี้เพราะอะไร"
                rows={3}
                maxLength={2000}
                disabled={fieldsLocked}
                className="bg-card resize-y min-h-[88px]"
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className={fieldLabel}>สิ่งที่ส่งมอบ</Label>
                <Input
                  value={value.deliverables}
                  onChange={(e) => onChange({ deliverables: e.target.value })}
                  placeholder="เช่น โลโก้, Brand guideline, ภาพประกอบ 5 ชิ้น, UI 12 หน้าจอ, วิดีโอ 30 วินาที"
                  maxLength={200}
                  disabled={fieldsLocked}
                  className="bg-card"
                />
              </div>
              <div className="space-y-1.5">
                <Label className={fieldLabel}>ระยะเวลา</Label>
                <Input
                  value={value.durationLabel}
                  onChange={(e) => onChange({ durationLabel: e.target.value })}
                  placeholder="เช่น 2 สัปดาห์, 1 เดือน, 3 วัน, โปรเจกต์ระยะยาว"
                  maxLength={60}
                  disabled={fieldsLocked}
                  className="bg-card"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className={fieldLabel}>ผลลัพธ์ / สิ่งที่ได้เรียนรู้</Label>
              <Textarea
                value={value.outcomeNote}
                onChange={(e) => onChange({ outcomeNote: e.target.value })}
                placeholder="ผลลัพธ์ที่เกิดขึ้น หรือสิ่งที่คุณได้เรียนรู้จากงานนี้ เช่น ลูกค้านำไปใช้จริง, engagement ดีขึ้น, เข้าใจกลุ่มเป้าหมายมากขึ้น"
                rows={3}
                maxLength={1500}
                disabled={fieldsLocked}
                className="bg-card resize-y min-h-[88px]"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProjectContextEditorFields;
