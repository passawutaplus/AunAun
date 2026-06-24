import { useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useAdCampaign, useAdDailyStats, logAdEvent } from "@/hooks/useAds";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import Footer from "@/components/Footer";
import {
  ArrowLeft,
  ExternalLink,
  Megaphone,
  Calendar,
  Eye,
  MousePointerClick,
  Sparkles,
  Globe,
  Building2,
  Heart,
} from "lucide-react";
import { toast } from "sonner";

const AdDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: ad, isLoading } = useAdCampaign(id);
  const { data: stats = [] } = useAdDailyStats(id, 14);

  const { data: advertiser } = useQuery({
    queryKey: ["ad-advertiser", ad?.advertiser_user_id],
    enabled: !!ad?.advertiser_user_id,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, display_name, username, avatar_url, website, bio")
        .eq("id", ad!.advertiser_user_id)
        .maybeSingle();
      return data;
    },
  });

  // log impression on detail page
  useEffect(() => {
    if (id) logAdEvent(id, "impression", "detail");
  }, [id]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        กำลังโหลด...
      </div>
    );
  }

  if (!ad) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">ไม่พบแคมเปญโฆษณานี้</p>
        <Button variant="outline" onClick={() => navigate("/")}>
          <ArrowLeft className="w-4 h-4 mr-1" /> กลับหน้าฟีด
        </Button>
      </div>
    );
  }

  const totalImp = stats.reduce((s, d) => s + d.impressions, 0);
  const totalClk = stats.reduce((s, d) => s + d.clicks, 0);
  const ctr = totalImp > 0 ? ((totalClk / totalImp) * 100).toFixed(2) + "%" : "—";

  const handleCta = () => {
    logAdEvent(ad.id, "click", "detail");
    window.open(ad.target_url, "_blank", "noopener,noreferrer");
  };

  const handleInterest = () => {
    logAdEvent(ad.id, "interest", "detail");
    toast.success("บันทึกความสนใจแล้ว · ผู้ลงโฆษณาจะเห็นความนิยมของคุณ");
  };

  return (
    <div className="min-h-screen bg-app-ambient">
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" /> กลับ
        </button>

        {/* Hero */}
        <div className="relative w-full aspect-[16/9] rounded-2xl overflow-hidden bg-muted">
          <img src={ad.image_url} alt={ad.title} className="w-full h-full object-cover" />
          <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-foreground/85 text-background backdrop-blur-md">
            <Megaphone className="w-3 h-3 inline mr-1" /> Sponsored
          </span>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Main */}
          <div className="md:col-span-2 space-y-5">
            <div>
              <Badge variant="secondary" className="uppercase text-[10px] mb-2">
                {ad.package}
              </Badge>
              <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">{ad.title}</h1>
              {ad.tagline && (
                <p className="mt-2 text-lg text-muted-foreground thai-leading-relaxed">{ad.tagline}</p>
              )}
            </div>

            {ad.promotion_text && (
              <Card className="p-4 border-primary/30 bg-primary/5 flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <p className="text-sm">{ad.promotion_text}</p>
              </Card>
            )}

            <div className="flex flex-wrap gap-3">
              <Button onClick={handleCta} size="lg" className="bg-primary hover:bg-primary/90">
                {ad.cta_label} <ExternalLink className="w-4 h-4 ml-1.5" />
              </Button>
              <Button onClick={handleInterest} variant="outline" size="lg">
                <Heart className="w-4 h-4 mr-1.5" /> ฉันสนใจ
              </Button>
            </div>

            {/* Period */}
            <Card className="p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>
                  ระยะแสดง: {new Date(ad.start_at).toLocaleDateString("th-TH")}
                  {ad.end_at && ` – ${new Date(ad.end_at).toLocaleDateString("th-TH")}`}
                </span>
              </div>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <Card className="p-4">
              <h3 className="font-medium mb-3 flex items-center gap-2">
                <Building2 className="w-4 h-4" /> ผู้ลงโฆษณา
              </h3>
              {advertiser ? (
                <Link
                  to={`/u/${advertiser.id}`}
                  className="flex items-center gap-3 hover:opacity-80"
                >
                  {advertiser.avatar_url ? (
                    <img
                      src={advertiser.avatar_url}
                      alt=""
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gradient-brand text-white flex items-center justify-center font-medium">
                      {(advertiser.display_name || "?")[0]}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-medium truncate">{advertiser.display_name || advertiser.username}</p>
                    {advertiser.bio && (
                      <p className="text-xs text-muted-foreground line-clamp-1">{advertiser.bio}</p>
                    )}
                  </div>
                </Link>
              ) : (
                <p className="text-sm text-muted-foreground">ผู้ลงโฆษณา</p>
              )}
              {advertiser?.website && (
                <a
                  href={advertiser.website}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 text-xs text-primary inline-flex items-center gap-1 hover:underline"
                >
                  <Globe className="w-3 h-3" /> {advertiser.website}
                </a>
              )}
            </Card>

            <Card className="p-4">
              <h3 className="font-medium mb-3">สถิติแคมเปญ</h3>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <Eye className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
                  <p className="text-lg font-semibold tabular-nums">
                    {ad.impressions.toLocaleString()}
                  </p>
                  <p className="text-[10px] text-muted-foreground uppercase">Impressions</p>
                </div>
                <div>
                  <MousePointerClick className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
                  <p className="text-lg font-semibold tabular-nums">
                    {ad.clicks.toLocaleString()}
                  </p>
                  <p className="text-[10px] text-muted-foreground uppercase">Clicks</p>
                </div>
                <div>
                  <Sparkles className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
                  <p className="text-lg font-semibold tabular-nums">{ctr}</p>
                  <p className="text-[10px] text-muted-foreground uppercase">CTR</p>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground mt-3 text-center">
                14 วันล่าสุด: {totalImp.toLocaleString()} imp · {totalClk.toLocaleString()} clk
              </p>
            </Card>

            <p className="text-[10px] text-muted-foreground text-center px-2">
              เนื้อหานี้คือโฆษณา · ผู้ลงโฆษณารับผิดชอบเนื้อหาและข้อเสนอ
            </p>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default AdDetailPage;
