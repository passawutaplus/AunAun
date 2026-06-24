import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import FeedPage from "@/pages/FeedPage";
import SeoHead from "@/components/SeoHead";
import { SITE_DESCRIPTION } from "@/lib/seo";
import { useAuth } from "@/hooks/useAuth";
import { markOnboardingVisit } from "@/lib/onboardingStorage";

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user?.id) markOnboardingVisit(user.id, "explore_feed");
  }, [user?.id]);

  return (
    <>
      <SeoHead path="/" description={SITE_DESCRIPTION} />
      <FeedPage onMyPortClick={() => navigate("/portfolio")} />
    </>
  );
};

export default Index;
