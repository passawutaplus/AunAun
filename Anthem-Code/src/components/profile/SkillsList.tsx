const SkillsList = ({ skills }: { skills: string[] }) => {
  if (!skills.length) {
    return <p className="text-sm text-muted-foreground text-center py-6">ยังไม่มีรายการทักษะ</p>;
  }
  return (
    <div className="flex flex-wrap gap-2">
      {skills.map((s) => (
        <span
          key={s}
          className="inline-flex items-center px-3.5 py-1.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20"
        >
          {s}
        </span>
      ))}
    </div>
  );
};

export default SkillsList;
