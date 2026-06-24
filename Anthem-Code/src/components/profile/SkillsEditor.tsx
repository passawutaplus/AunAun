import { useState, type KeyboardEvent } from "react";
import { X, Plus } from "lucide-react";

interface Props {
  value: string[];
  onChange: (v: string[]) => void;
}

const SkillsEditor = ({ value, onChange }: Props) => {
  const [draft, setDraft] = useState("");

  const add = () => {
    const v = draft.trim();
    if (!v) return;
    if (value.includes(v)) { setDraft(""); return; }
    onChange([...value, v]);
    setDraft("");
  };
  const remove = (s: string) => onChange(value.filter((x) => x !== s));

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      add();
    } else if (e.key === "Backspace" && !draft && value.length) {
      remove(value[value.length - 1]);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-2">
        {value.map((s) => (
          <span key={s} className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
            {s}
            <button type="button" onClick={() => remove(s)} className="hover:text-destructive">
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex items-center rounded-xl bg-secondary border border-border focus-within:ring-2 focus-within:ring-primary/30">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKey}
          placeholder="พิมพ์ทักษะแล้วกด Enter เช่น Figma, Branding, Motion"
          className="flex-1 bg-transparent px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
        />
        <button type="button" onClick={add} className="px-3 text-primary hover:text-primary/80">
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default SkillsEditor;
