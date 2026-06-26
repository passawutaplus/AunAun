import { useMyProjects } from "@/hooks/useProjects";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface Props {
  value: string[];
  onChange: (ids: string[]) => void;
  min?: number;
  max?: number;
}

const PortfolioPicker = ({ value, onChange, min = 0, max = 6 }: Props) => {
  const { user } = useAuth();
  const { data: projects = [], isLoading } = useMyProjects(user?.id);

  const published = projects.filter((p) => p.status === "Published");

  const toggle = (id: string) => {
    if (value.includes(id)) {
      onChange(value.filter((x) => x !== id));
      return;
    }
    if (value.length >= max) return;
    onChange([...value, id]);
  };

  if (isLoading) return <p className="text-xs text-muted-foreground">กำลังโหลดผลงาน...</p>;
  if (published.length === 0) {
    return <p className="text-xs text-muted-foreground">ยังไม่มีผลงานที่เผยแพร่ — โพสต์งานในโปรไฟล์ก่อน</p>;
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        เลือกผลงาน {min > 0 ? `${min}–` : ""}{max} ชิ้น ({value.length}/{max})
      </p>
      <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
        {published.map((p) => {
          const selected = value.includes(p.id);
          const cover = p.cover_url || p.gallery_urls?.[0] || "";
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => toggle(p.id)}
              className={cn(
                "relative rounded-xl overflow-hidden border-2 aspect-[4/3] text-left transition-colors",
                selected ? "border-primary" : "border-transparent hover:border-border",
              )}
            >
              {cover ? (
                <img src={cover} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-muted grid place-items-center text-[10px] p-1">{p.title}</div>
              )}
              {selected && (
                <span className="absolute top-1 right-1 w-5 h-5 rounded-full bg-primary text-primary-foreground grid place-items-center">
                  <Check className="w-3 h-3" />
                </span>
              )}
              <span className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[10px] px-1 py-0.5 truncate">{p.title}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default PortfolioPicker;
