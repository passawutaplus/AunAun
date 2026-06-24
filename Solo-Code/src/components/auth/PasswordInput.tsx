import * as React from "react";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  invalid?: boolean;
}

export const PasswordInput = React.forwardRef<HTMLInputElement, Props>(
  ({ className, invalid, ...props }, ref) => {
    const [show, setShow] = React.useState(false);
    return (
      <div className="relative">
        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          ref={ref}
          type={show ? "text" : "password"}
          className={cn(
            "input-so1o pl-9 pr-10 h-11 rounded-lg border-input/70",
            invalid && "border-destructive focus-visible:ring-destructive",
            className,
          )}
          {...props}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label={show ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
          tabIndex={-1}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    );
  },
);
PasswordInput.displayName = "PasswordInput";
