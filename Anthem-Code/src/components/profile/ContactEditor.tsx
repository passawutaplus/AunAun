import { Mail, Link2, MessageCircle } from "lucide-react";

export type ContactFormValues = {
  email: string;
  phone: string;
  website: string;
  lineId: string;
  facebook: string;
  instagram: string;
};

type Props = {
  value: ContactFormValues;
  onChange: (patch: Partial<ContactFormValues>) => void;
};

const ContactEditor = ({ value, onChange }: Props) => (
  <div className="space-y-3">
    <Field label="อีเมล" value={value.email} onChange={(v) => onChange({ email: v })} type="email" icon={Mail} />
    <Field label="เบอร์มือถือ" value={value.phone} onChange={(v) => onChange({ phone: v })} placeholder="0812345678" />
    <Field
      label="เว็บไซต์ / Portfolio"
      value={value.website}
      onChange={(v) => onChange({ website: v })}
      icon={Link2}
      placeholder="https://..."
    />
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <Field label="LINE ID" value={value.lineId} onChange={(v) => onChange({ lineId: v })} icon={MessageCircle} />
      <Field label="Facebook" value={value.facebook} onChange={(v) => onChange({ facebook: v })} />
      <Field label="Instagram" value={value.instagram} onChange={(v) => onChange({ instagram: v })} prefix="@" />
    </div>
  </div>
);

const Field = ({
  label,
  value,
  onChange,
  type = "text",
  prefix,
  placeholder,
  icon: Icon,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  prefix?: string;
  placeholder?: string;
  icon?: React.ComponentType<{ className?: string }>;
}) => (
  <div>
    <label className="text-xs font-medium text-muted-foreground">{label}</label>
    <div className="mt-1 flex items-center rounded-xl bg-secondary border border-border focus-within:ring-2 focus-within:ring-primary/30">
      {Icon && <Icon className="w-4 h-4 text-muted-foreground ml-3 shrink-0" />}
      {prefix && <span className="pl-3 text-muted-foreground text-sm shrink-0">{prefix}</span>}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 bg-transparent px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none min-w-0"
      />
    </div>
  </div>
);

export default ContactEditor;
