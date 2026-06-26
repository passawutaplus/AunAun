import { useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import PortfolioPicker from "@/components/jobs/shared/PortfolioPicker";
import { useApplyToJob, type JobPost } from "@/hooks/useJobs";
import {
  sharedStorage,
  SHARED_MEDIA_BUCKET,
} from "@/integrations/supabase/sharedStorageClient";
import { useAuth } from "@/hooks/useAuth";
import { scoreJobMatch } from "@/lib/jobMatchScore";
import { useProfile } from "@/hooks/useProfile";
import { useMyProjects } from "@/hooks/useProjects";
import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";

interface Props {
  job: JobPost;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  matchScore?: number | null;
}

const JobApplyDialog = ({ job, open, onOpenChange, matchScore: matchProp }: Props) => {
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id);
  const { data: myProjects = [] } = useMyProjects(user?.id);
  const apply = useApplyToJob();
  const [coverLetter, setCoverLetter] = useState("");
  const [portfolioIds, setPortfolioIds] = useState<string[]>([]);
  const [rateMin, setRateMin] = useState("");
  const [rateMax, setRateMax] = useState("");
  const [readyDate, setReadyDate] = useState("");
  const [cvFile, setCvFile] = useState<File | null>(null);

  const matchScore = useMemo(() => {
    if (matchProp != null) return matchProp;
    if (!profile) return null;
    const { score } = scoreJobMatch(job, {
      skills: profile.skills ?? [],
      role: profile.role,
      location: profile.location,
      preferred_categories: (profile as { preferred_categories?: string[] }).preferred_categories ?? [],
      preferred_employment_types: (profile as { preferred_employment_types?: string[] }).preferred_employment_types ?? [],
      project_categories: myProjects.map((p) => p.category).filter(Boolean) as string[],
      project_tools: myProjects.flatMap((p) => p.tools ?? []),
    });
    return score >= 40 ? score : null;
  }, [profile, job, myProjects, matchProp]);

  const submit = async () => {
    if (!user) return;
    let cvUrl: string | null = null;
    if (cvFile) {
      const path = `anthem/${user.id}/cv/${crypto.randomUUID()}-${cvFile.name}`;
      const { error: upErr } = await sharedStorage.storage.from(SHARED_MEDIA_BUCKET).upload(path, cvFile);
      if (upErr) throw upErr;
      cvUrl = sharedStorage.storage.from(SHARED_MEDIA_BUCKET).getPublicUrl(path).data.publicUrl;
    }
    apply.mutate(
      {
        job_id: job.id,
        cover_letter: coverLetter.trim(),
        portfolio_project_ids: portfolioIds,
        proposed_rate_min: rateMin ? parseInt(rateMin) : null,
        proposed_rate_max: rateMax ? parseInt(rateMax) : null,
        ready_date: readyDate || null,
        attached_cv_url: cvUrl,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          setCoverLetter("");
          setPortfolioIds([]);
          setRateMin("");
          setRateMax("");
          setReadyDate("");
          setCvFile(null);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl">
        <DialogTitle className="thai-display flex items-center gap-2 flex-wrap">
          สมัครงาน: {job.title}
          {matchScore != null && <Badge className="bg-emerald-500/15 text-emerald-700 border-0">Match {matchScore}%</Badge>}
        </DialogTitle>
        <DialogDescription className="thai-body">
          แนบ Portfolio จากโปรไฟล์ — จุดขายสำคัญของ Aplus1
        </DialogDescription>

        <div className="space-y-3">
          <div>
            <Label className="text-xs">เลือกผลงาน (3–6 ชิ้น)</Label>
            <PortfolioPicker value={portfolioIds} onChange={setPortfolioIds} min={1} max={6} />
          </div>
          <div>
            <Label className="text-xs">ข้อความถึงผู้จ้าง</Label>
            <Textarea value={coverLetter} onChange={(e) => setCoverLetter(e.target.value)} rows={4} className="rounded-xl" placeholder="สวัสดีครับ/ค่ะ..." />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">เรทเสนอ ต่ำสุด (฿)</Label>
              <Input type="number" value={rateMin} onChange={(e) => setRateMin(e.target.value)} className="rounded-xl" />
            </div>
            <div>
              <Label className="text-xs">สูงสุด (฿)</Label>
              <Input type="number" value={rateMax} onChange={(e) => setRateMax(e.target.value)} className="rounded-xl" />
            </div>
          </div>
          <div>
            <Label className="text-xs">พร้อมเริ่มงาน</Label>
            <Input type="date" value={readyDate} onChange={(e) => setReadyDate(e.target.value)} className="rounded-xl" />
          </div>
          <div>
            <Label className="text-xs">แนบ CV (optional)</Label>
            <Input type="file" accept="application/pdf" onChange={(e) => setCvFile(e.target.files?.[0] ?? null)} className="rounded-xl" />
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">ยกเลิก</Button>
          <Button
            onClick={submit}
            disabled={apply.isPending || !coverLetter.trim() || portfolioIds.length === 0}
            className="rounded-xl bg-gradient-brand text-white border-0"
          >
            {apply.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />} ส่ง Portfolio
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default JobApplyDialog;
