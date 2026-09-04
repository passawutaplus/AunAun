import { Mail, Link2 } from "lucide-react";
import { useAboutEditLocale } from "@/components/profile/AboutEditLocale";

export type ContactFormValues = {
  email: string;
  website: string;
};

type Props = {
  value: ContactFormValues;
  onChange: (patch: Partial<ContactFormValues>) => void;
  hideEmail?: boolean;
};

const ContactEditor = ({ value, onChange, hideEmail = false }: Props) => {
  const { t } = useAboutEditLocale();
  return (
  <div className="space-y-3">
    {hideEmail ? null : (
      <Field
        label={t.email}
        value={value.email}
        type="email"
        icon={Mail}
        readOnly
        hint="Tied to your login account — cannot be changed here"
      />
    )}
    <Field
      label={t.website}
      value={value.website}
      onChange={(v) => onChange({ website: v })}
      icon={Link2}
      placeholder="https://..."
    />
  </div>
  );
};

const Field = ({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  icon: Icon,
  readOnly,
  hint,
}: {
  label: string;
  value: string;
  onChange?: (v: string) => void;
  type?: string;
  placeholder?: string;
  icon?: React.ComponentType<{ className?: string }>;
  readOnly?: boolean;
  hint?: string;
}) => (
  <div>
    <label className="text-xs font-medium text-muted-foreground">{label}</label>
    <div
      className={`mt-1 flex items-center rounded-xl border border-border ${
        readOnly
          ? "bg-muted/40"
          : "bg-secondary focus-within:ring-2 focus-within:ring-primary/30"
      }`}
    >
      {Icon && <Icon className="w-4 h-4 text-muted-foreground ml-3 shrink-0" />}
      <input
        type={type}
        value={value}
        readOnly={readOnly}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        placeholder={placeholder}
        className={`flex-1 bg-transparent px-3 py-2.5 text-sm text-foreground placeholder:text-xs placeholder:font-light placeholder:text-muted-foreground/40 focus:outline-none min-w-0 ${
          readOnly ? "cursor-default text-muted-foreground" : ""
        }`}
      />
    </div>
    {hint ? <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p> : null}
  </div>
);

export default ContactEditor;
