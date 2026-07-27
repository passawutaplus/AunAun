import ProfileSkillChips from "@/components/profile/ProfileSkillChips";

const SkillsList = ({ skills }: { skills: string[] }) => {
  if (!skills.length) {
    return <p className="text-sm text-muted-foreground text-center py-6">ยังไม่มีรายการทักษะ</p>;
  }
  return <ProfileSkillChips skills={skills} />;
};

export default SkillsList;
