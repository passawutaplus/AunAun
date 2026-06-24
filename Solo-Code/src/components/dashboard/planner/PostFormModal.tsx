import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, AlertCircle, UserPlus, Trash2, Eye, ImageIcon, Loader2 } from "lucide-react";
import { sanitizeText, safeUrl } from "@/lib/security";
import { toast } from "sonner";
import {
  Platform,
  Post,
  Status,
  PLATFORM_META,
  STATUS_META,
  todayISO,
  colorForClient,
} from "./contentMeta";
import { AiAssistButton } from "./AiAssistButton";
import { PostPreviewMockup } from "./PostPreviewMockup";
import { PostPreviewDialog } from "./PostPreviewDialog";
import { uploadCompressedImage } from "@/lib/imageCompress";
import { useAuth } from "@/auth/AuthProvider";

const NEW_CLIENT_VALUE = "__new__";

type Props = {
  mode: "create" | "edit";
  open?: boolean;
  onOpenChange?: (o: boolean) => void;
  trigger?: React.ReactNode;
  initial?: Post | null;
  clientOptions: { id: string; name: string }[];
  onSave: (p: Post) => void;
  onDelete?: (id: string) => void;
  onAddClient?: (name: string) => Promise<string> | string;
};

export function PostFormModal({
  mode,
  open: openProp,
  onOpenChange,
  trigger,
  initial,
  clientOptions,
  onSave,
  onDelete,
  onAddClient,
}: Props) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const open = openProp ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const { user } = useAuth();

  const [clientId, setClientId] = React.useState("");
  const [newClientName, setNewClientName] = React.useState("");
  const [title, setTitle] = React.useState("");
  const [date, setDate] = React.useState(todayISO);
  const [time, setTime] = React.useState("10:00");
  const [platforms, setPlatforms] = React.useState<Platform[]>([]);
  const [customPlatforms, setCustomPlatforms] = React.useState<string[]>([]);
  const [otherInput, setOtherInput] = React.useState("");
  const [status, setStatus] = React.useState<Status>("draft");
  const [link, setLink] = React.useState("");
  const [caption, setCaption] = React.useState("");
  const [imageUrl, setImageUrl] = React.useState("");
  const [uploading, setUploading] = React.useState(false);
  const [showPreview, setShowPreview] = React.useState(false);
  const [fullPreview, setFullPreview] = React.useState(false);
  const [touched, setTouched] = React.useState(false);

  const isAddingNew = clientId === NEW_CLIENT_VALUE;
  const showOtherInput = platforms.includes("other");

  // Hydrate when editing or opening
  React.useEffect(() => {
    if (open && initial) {
      setClientId(initial.clientId);
      setTitle(initial.title);
      setDate(initial.date);
      setTime(initial.time);
      setPlatforms(initial.platforms);
      setCustomPlatforms(initial.customPlatforms ?? []);
      setStatus(initial.status);
      setLink(initial.link ?? "");
      setCaption(initial.caption ?? "");
      setImageUrl(initial.imageUrl ?? "");
      setNewClientName("");
      setOtherInput("");
      setTouched(false);
    } else if (open && !initial) {
      reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial?.id]);

  const reset = () => {
    setClientId("");
    setNewClientName("");
    setTitle("");
    setDate(todayISO);
    setTime("10:00");
    setPlatforms([]);
    setCustomPlatforms([]);
    setOtherInput("");
    setStatus("draft");
    setLink("");
    setCaption("");
    setImageUrl("");
    setShowPreview(false);
    setTouched(false);
  };

  const togglePlatform = (p: Platform) =>
    setPlatforms((arr) => (arr.includes(p) ? arr.filter((x) => x !== p) : [...arr, p]));

  const addCustomPlatform = () => {
    const v = sanitizeText(otherInput, 30);
    if (!v) return;
    if (customPlatforms.includes(v)) return;
    setCustomPlatforms([...customPlatforms, v]);
    setOtherInput("");
  };

  const handleImageUpload = async (file: File) => {
    if (!user?.id) {
      toast.error("กรุณาเข้าสู่ระบบก่อน");
      return;
    }
    setUploading(true);
    try {
      const url = await uploadCompressedImage({
        file,
        bucket: "brief-references",
        userId: user.id,
        prefix: "planner",
      });
      setImageUrl(url);
      toast.success("อัปโหลดรูปสำเร็จ");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "อัปโหลดล้มเหลว");
    } finally {
      setUploading(false);
    }
  };

  const errors = {
    client: touched && !clientId ? "เลือกลูกค้า" : "",
    newClient:
      touched && isAddingNew && !sanitizeText(newClientName, 80) ? "กรอกชื่อลูกค้าใหม่" : "",
    title: touched && !sanitizeText(title, 120) ? "กรอกหัวข้อคอนเทนต์" : "",
    platforms: touched && platforms.length === 0 ? "เลือกอย่างน้อย 1 แพลตฟอร์ม" : "",
    other:
      touched && showOtherInput && customPlatforms.length === 0
        ? "ระบุชื่อแพลตฟอร์มอื่นๆ อย่างน้อย 1 อัน"
        : "",
    link:
      touched && link.trim() && safeUrl(link) === null ? "ลิงก์ไม่ถูกต้อง (ใช้ http/https)" : "",
  };

  const submit = async () => {
    setTouched(true);
    const cleanTitle = sanitizeText(title, 120);
    if (!clientId || !cleanTitle || platforms.length === 0) return;
    if (showOtherInput && customPlatforms.length === 0) return;
    const safeLink = link.trim() ? safeUrl(link) : "";
    if (link.trim() && safeLink === null) return;

    let finalClientId = clientId;
    if (isAddingNew) {
      const name = sanitizeText(newClientName, 80);
      if (!name) return;
      if (!onAddClient) {
        toast.error("ไม่สามารถเพิ่มลูกค้าใหม่ได้");
        return;
      }
      try {
        finalClientId = await Promise.resolve(onAddClient(name));
      } catch {
        toast.error("เพิ่มลูกค้าใหม่ไม่สำเร็จ");
        return;
      }
    }

    const post: Post = {
      id: initial?.id ?? crypto.randomUUID(),
      clientId: finalClientId,
      title: cleanTitle,
      date,
      time,
      platforms,
      customPlatforms: showOtherInput ? customPlatforms : [],
      status,
      link: safeLink || undefined,
      caption: sanitizeText(caption, 2200) || undefined,
      imageUrl: imageUrl || undefined,
      approvalStatus: initial?.approvalStatus ?? "none",
      clientFeedback: initial?.clientFeedback ?? "",
      visionCanvasId: initial?.visionCanvasId,
    };

    onSave(post);
    toast.success(mode === "create" ? "เพิ่มโพสต์แล้ว" : "บันทึกการแก้ไขแล้ว");
    if (mode === "create") reset();
    setOpen(false);
  };

  const handleDelete = () => {
    if (!initial?.id || !onDelete) return;
    if (!confirm("ลบโพสต์นี้?")) return;
    onDelete(initial.id);
    setOpen(false);
    toast.success("ลบโพสต์แล้ว");
  };

  const platformLabels = [
    ...platforms.filter((p) => p !== "other").map((p) => PLATFORM_META[p].label),
    ...customPlatforms,
  ];

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o && mode === "create") reset();
      }}
    >
      {trigger ? (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      ) : mode === "create" ? (
        <DialogTrigger asChild>
          <Button className="rounded-xl gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-elevated">
            <Plus className="h-4 w-4" />
            Add New Post
          </Button>
        </DialogTrigger>
      ) : null}

      <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "เพิ่มคอนเทนต์ใหม่" : "แก้ไขโพสต์"}</DialogTitle>
          <DialogDescription>
            {mode === "create" ? "วางแผนโพสต์สำหรับลูกค้าของคุณ" : "อัปเดตรายละเอียดโพสต์"}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-1.5">
            <Label>
              ลูกค้า <span className="text-destructive">*</span>
            </Label>
            <Select
              value={clientId}
              onValueChange={(v) => {
                setClientId(v);
                setTouched(true);
              }}
            >
              <SelectTrigger className={`rounded-xl ${errors.client ? "border-destructive" : ""}`}>
                <SelectValue placeholder="เลือกลูกค้า" />
              </SelectTrigger>
              <SelectContent>
                {clientOptions.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    <span className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${colorForClient(c.id)}`} />
                      {c.name}
                    </span>
                  </SelectItem>
                ))}
                {onAddClient && (
                  <SelectItem value={NEW_CLIENT_VALUE} className="text-primary font-medium">
                    <span className="inline-flex items-center gap-1.5">
                      <UserPlus className="h-3.5 w-3.5" /> เพิ่มลูกค้าใหม่
                    </span>
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
            {errors.client && <ErrorText>{errors.client}</ErrorText>}
            {isAddingNew && (
              <div className="grid gap-1.5 mt-2">
                <Label>
                  ชื่อลูกค้าใหม่ <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  placeholder="เช่น Nimbus Co."
                  maxLength={80}
                  className={`rounded-xl ${errors.newClient ? "border-destructive" : ""}`}
                />
                {errors.newClient && <ErrorText>{errors.newClient}</ErrorText>}
              </div>
            )}
          </div>

          <div className="grid gap-1.5">
            <Label>
              หัวข้อ / Topic <span className="text-destructive">*</span>
            </Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="เช่น เปิดตัวสินค้าใหม่"
              maxLength={120}
              className={`rounded-xl ${errors.title ? "border-destructive" : ""}`}
            />
            {errors.title && <ErrorText>{errors.title}</ErrorText>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>วันที่</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="rounded-xl"
              />
            </div>
            <div className="grid gap-1.5">
              <Label>เวลา</Label>
              <Input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="rounded-xl"
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label>
              แพลตฟอร์ม <span className="text-destructive">*</span>
            </Label>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(PLATFORM_META) as Platform[]).map((p) => {
                const M = PLATFORM_META[p];
                const active = platforms.includes(p);
                const Icon = M.icon;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => {
                      togglePlatform(p);
                      setTouched(true);
                    }}
                    className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition-all ${
                      active
                        ? "bg-primary text-primary-foreground border-primary shadow-soft"
                        : "bg-background border-border hover:border-primary/50"
                    }`}
                  >
                    <Icon className={`h-3.5 w-3.5 ${active ? "" : M.color}`} />
                    {M.label}
                  </button>
                );
              })}
            </div>
            {errors.platforms && <ErrorText>{errors.platforms}</ErrorText>}

            {showOtherInput && (
              <div className="mt-2 space-y-1.5">
                <div className="flex gap-2">
                  <Input
                    value={otherInput}
                    onChange={(e) => setOtherInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addCustomPlatform();
                      }
                    }}
                    placeholder="ระบุ เช่น LINE OA, X, Threads"
                    maxLength={30}
                    className="rounded-xl text-xs"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={addCustomPlatform}
                    className="rounded-xl"
                  >
                    เพิ่ม
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {customPlatforms.map((c) => (
                    <span
                      key={c}
                      className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-[10px]"
                    >
                      {c}
                      <button
                        type="button"
                        onClick={() => setCustomPlatforms(customPlatforms.filter((x) => x !== c))}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                {errors.other && <ErrorText>{errors.other}</ErrorText>}
              </div>
            )}
          </div>

          <div className="grid gap-1.5">
            <Label>รูปภาพ (optional)</Label>
            <div className="flex items-center gap-2">
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleImageUpload(f);
                }}
                className="rounded-xl text-xs"
                disabled={uploading}
              />
              {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
            </div>
            {imageUrl && (
              <div className="mt-1 flex items-center gap-2">
                <img src={imageUrl} alt="" className="h-16 w-16 rounded-lg object-cover border" />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setImageUrl("")}
                  className="text-xs"
                >
                  ลบรูป
                </Button>
              </div>
            )}
          </div>

          <div className="grid gap-1.5">
            <div className="flex items-center justify-between">
              <Label>แคปชัน</Label>
              <AiAssistButton
                topic={title}
                platforms={platformLabels}
                onCaption={(t) => setCaption(t)}
                onHashtags={(t) => setCaption((c) => (c ? `${c}\n\n${t}` : t))}
              />
            </div>
            <Textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="แคปชันสำหรับโพสต์... (กด AI Assist ให้ช่วยเขียนได้)"
              maxLength={2200}
              rows={4}
              className="rounded-xl text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>สถานะ</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as Status)}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(STATUS_META) as Status[]).map((s) => (
                    <SelectItem key={s} value={s}>
                      {STATUS_META[s].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Reference Link</Label>
              <Input
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="https://..."
                maxLength={500}
                className={`rounded-xl ${errors.link ? "border-destructive" : ""}`}
              />
              {errors.link && <ErrorText>{errors.link}</ErrorText>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-xl gap-1.5 text-xs"
              onClick={() => setShowPreview((s) => !s)}
            >
              <Eye className="h-3.5 w-3.5" />
              {showPreview ? "ซ่อน Preview" : "Preview"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-xl gap-1.5 text-xs border-primary/40 text-primary hover:bg-primary/5"
              onClick={() => setFullPreview(true)}
            >
              <ImageIcon className="h-3.5 w-3.5" /> พรีวิวเหมือนจริง
            </Button>
            {showPreview && (
              <div className="col-span-2 mt-3">
                <PostPreviewMockup imageUrl={imageUrl} caption={caption} />
              </div>
            )}
          </div>
        </div>

        <PostPreviewDialog
          open={fullPreview}
          onOpenChange={setFullPreview}
          imageUrl={imageUrl}
          caption={caption}
        />

        <DialogFooter className="flex-row gap-2 sm:justify-between">
          {mode === "edit" && onDelete && (
            <Button
              variant="ghost"
              onClick={handleDelete}
              className="rounded-xl text-destructive hover:text-destructive gap-1"
            >
              <Trash2 className="h-4 w-4" /> ลบ
            </Button>
          )}
          <div className="flex gap-2 ml-auto">
            <Button variant="ghost" onClick={() => setOpen(false)} className="rounded-xl">
              ยกเลิก
            </Button>
            <Button onClick={submit} className="rounded-xl bg-primary hover:bg-primary/90">
              {mode === "create" ? "บันทึก" : "อัปเดต"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ErrorText({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] text-destructive flex items-center gap-1">
      <AlertCircle className="h-3 w-3" /> {children}
    </p>
  );
}
