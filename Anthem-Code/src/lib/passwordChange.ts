/** Client-side checks before changing a login password. */

export function passwordChangeFormError(opts: {
  current: string;
  next: string;
  confirm: string;
  needsCurrent: boolean;
}): string | null {
  if (opts.needsCurrent && !opts.current.trim()) {
    return "ใส่รหัสผ่านเดิมเพื่อยืนยันว่าเป็นเจ้าของบัญชี";
  }
  if (opts.next.length < 8) {
    return "รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร";
  }
  if (opts.next !== opts.confirm) {
    return "รหัสผ่านยืนยันไม่ตรงกัน";
  }
  if (opts.needsCurrent && opts.current === opts.next) {
    return "รหัสใหม่ต้องไม่ซ้ำกับรหัสเดิม";
  }
  return null;
}
