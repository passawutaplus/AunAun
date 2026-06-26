import { Link } from "react-router-dom";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useMyStudios } from "@/hooks/useStudios";
import type { PosterEntityType } from "@/components/jobs/jobCardUtils";
import { posterEntityLabel } from "@/components/jobs/jobCardUtils";

export interface PostAsSelection {
  entityType: PosterEntityType;
  studioId: string | null;
}

interface Props {
  value: PostAsSelection;
  onChange: (v: PostAsSelection) => void;
  mode: "hiring" | "seeking";
}

const PostAsEntitySelect = ({ value, onChange, mode }: Props) => {
  const { data: studios = [] } = useMyStudios();

  const entityKey = value.studioId ? `studio:${value.studioId}` : value.entityType;

  const handleChange = (key: string) => {
    if (key.startsWith("studio:")) {
      onChange({ entityType: "studio", studioId: key.replace("studio:", "") });
      return;
    }
    onChange({ entityType: key as PosterEntityType, studioId: null });
  };

  return (
    <div className="space-y-2">
      <Label className="text-xs">โพสต์ในนาม</Label>
      <Select value={entityKey} onValueChange={handleChange}>
        <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="personal">{posterEntityLabel.personal}</SelectItem>
          {studios.map((s) => (
            <SelectItem key={s.id} value={`studio:${s.id}`}>
              Studio: {s.name}
            </SelectItem>
          ))}
          {mode === "hiring" && (
            <>
              <SelectItem value="brand">{posterEntityLabel.brand}</SelectItem>
              <SelectItem value="project">{posterEntityLabel.project}</SelectItem>
            </>
          )}
        </SelectContent>
      </Select>
      {studios.length === 0 && mode === "hiring" && (
        <Button variant="outline" size="sm" className="rounded-xl w-full" asChild>
          <Link to="/studio/new">
            <Plus className="w-4 h-4 mr-1" /> สร้าง Studio Profile
          </Link>
        </Button>
      )}
    </div>
  );
};

export default PostAsEntitySelect;
