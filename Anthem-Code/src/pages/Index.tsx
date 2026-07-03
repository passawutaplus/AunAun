import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import FeedPage from "@/pages/FeedPage";
import SeoHead from "@/components/SeoHead";
import { SITE_DESCRIPTION } from "@/lib/seo";

const Index = () => {
  const navigate = useNavigate();

  return (
    <>
      <SeoHead path="/" description={SITE_DESCRIPTION} />
      <FeedPage onMyPortClick={() => navigate("/portfolio")} />
    </>
  );
};

export default Index;
