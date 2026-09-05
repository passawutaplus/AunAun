import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
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
  const entityKey = value.studioId ? "personal" : value.entityType;

  const handleChange = (key: string) => {
    onChange({ entityType: key as PosterEntityType, studioId: null });
  };

  return (
    <div className="space-y-2">
      <Label className="text-xs">โพสต์ในนาม</Label>
      <Select value={entityKey} onValueChange={handleChange}>
        <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="personal">{posterEntityLabel.personal}</SelectItem>
          {mode === "hiring" && (
            <>
              <SelectItem value="brand">{posterEntityLabel.brand}</SelectItem>
              <SelectItem value="project">{posterEntityLabel.project}</SelectItem>
            </>
          )}
        </SelectContent>
      </Select>
    </div>
  );
};

export default PostAsEntitySelect;
