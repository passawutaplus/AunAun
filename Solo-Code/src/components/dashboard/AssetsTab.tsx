import * as React from "react";
import { getFaviconUrl } from "@/lib/favicon";
import { safeHref } from "@/lib/security";
import { useSupabaseRecords } from "@/hooks/useSupabaseRecords";
import { Loader2 as LoaderIcon } from "lucide-react";
import { PageFooterActions } from "@/components/dashboard/PageFooterActions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/ui/empty-state";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Type,
  Palette,
  Image as ImageIcon,
  Plus,
  Pencil,
  Trash2,
  Link as LinkIcon,
  Code2,
  Download,
  ExternalLink,
  Copy,
  Check,
  ShieldCheck,
  AlertTriangle,
  Upload,
  Loader2,
  X,
  KeyRound,
  Eye,
  EyeOff,
  Search,
  Globe,
} from "lucide-react";

import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { compressImageFile, dataUrlToBlob } from "@/lib/imageCompress";
import { assertFileSignature, type AllowedKind } from "@/lib/fileSignature";
import { useAuth } from "@/auth/AuthProvider";

type License = "Free" | "Paid" | "Trial";
type UsageScope = "Personal" | "Commercial" | "Both";
type Font = {
  id: string;
  name: string;
  project: string;
  license: License;
  usage: UsageScope;
  downloadUrl?: string;
  weights?: string[];
  sampleText?: string;
};
type BrandFile = {
  id: string;
  label: string;
  url: string;
  kind: "svg" | "png" | "ai" | "pdf" | "other";
  storagePath?: string;
};
type DoDontVersion = { id: string; label: string; text: string };
type Brand = {
  id: string;
  client: string;
  colors: string[];
  fonts: string[];
  logoNote: string;
  doDont?: string;
  doDontVersions?: DoDontVersion[];
  /** ขอบเขตการใช้งานแบรนด์นี้ — ใช้เตือน license ฟอนต์ที่จับคู่ */
  projectScope?: UsageScope;
  files: BrandFile[];
  brandVoice?: string;
};
type LinkAsset = {
  id: string;
  client: string;
  label: string;
  url: string;
  category: string;
  description?: string;
};
type Snippet = { id: string; project: string; title: string; code: string; language: string };
type CredentialType = "password" | "apiKey" | "wifi" | "other";
type Credential = {
  id: string;
  client: string;
  project?: string;
  label: string;
  username?: string;
  secret: string;
  url?: string;
  notes?: string;
  type: CredentialType;
};

const LICENSE_COLOR: Record<License, string> = {
  Free: "bg-success/15 text-success",
  Paid: "bg-warning/20 text-warning-foreground",
  Trial: "bg-primary-soft text-primary",
};

const uid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;

type AssetRow = {
  id: string;
  user_id: string;
  kind: string;
  label: string;
  payload: Record<string, unknown>;
};

function makeAssetOpts<T extends { id: string }>(kind: string, labelOf: (x: T) => string) {
  return {
    table: "asset_items" as const,
    cacheKey: `asset_items.${kind}`,
    filterEq: { column: "kind", value: kind },
    fromRow: (r: AssetRow) => ({ id: r.id, ...(r.payload as object) }) as T,
    toRow: (item: T, userId: string) => {
      const { id, ...rest } = item as T & { id: string };
      return { id, user_id: userId, kind, label: labelOf(item), payload: rest };
    },
  };
}

export function AssetsTab() {
  // ใช้ Supabase persist — เก็บถาวรข้ามอุปกรณ์/อัปเดตเว็บ
  const fontsHook = useSupabaseRecords<Font, AssetRow>(makeAssetOpts<Font>("font", (f) => f.name));
  const brandsHook = useSupabaseRecords<Brand, AssetRow>(
    makeAssetOpts<Brand>("brand", (b) => b.client),
  );
  const linksHook = useSupabaseRecords<LinkAsset, AssetRow>(
    makeAssetOpts<LinkAsset>("link", (l) => l.label),
  );
  const snippetsHook = useSupabaseRecords<Snippet, AssetRow>(
    makeAssetOpts<Snippet>("snippet", (s) => s.title),
  );
  const credentialsHook = useSupabaseRecords<Credential, AssetRow>(
    makeAssetOpts<Credential>("credential", (c) => c.label),
  );
  const fonts = fontsHook.items;
  const setFonts = fontsHook.setItems;
  const brands = brandsHook.items;
  const setBrands = brandsHook.setItems;
  const links = linksHook.items;
  const setLinks = linksHook.setItems;
  const snippets = snippetsHook.items;
  const setSnippets = snippetsHook.setItems;
  const credentials = credentialsHook.items;
  const setCredentials = credentialsHook.setItems;
  const isLoading =
    fontsHook.isLoading ||
    brandsHook.isLoading ||
    linksHook.isLoading ||
    snippetsHook.isLoading ||
    credentialsHook.isLoading;

  const [editingFont, setEditingFont] = React.useState<Font | "new" | null>(null);
  const [editingBrand, setEditingBrand] = React.useState<Brand | "new" | null>(null);
  const [editingLink, setEditingLink] = React.useState<LinkAsset | "new" | null>(null);
  const [editingSnippet, setEditingSnippet] = React.useState<Snippet | "new" | null>(null);
  const [editingCredential, setEditingCredential] = React.useState<Credential | "new" | null>(null);
  const [vaultBrand, setVaultBrand] = React.useState<Brand | null>(null);

  // ── Workspace filter + global search
  const [workspace, setWorkspace] = React.useState<string>("__all__");
  const [search, setSearch] = React.useState("");
  const workspaces = React.useMemo(() => {
    const set = new Set<string>();
    fonts.forEach((f) => f.project && set.add(f.project));
    brands.forEach((b) => b.client && set.add(b.client));
    links.forEach((l) => l.client && set.add(l.client));
    snippets.forEach((s) => s.project && set.add(s.project));
    credentials.forEach((c) => c.client && set.add(c.client));
    return Array.from(set).sort((a, b) => a.localeCompare(b, "th"));
  }, [fonts, brands, links, snippets, credentials]);

  const matchWs = React.useCallback(
    (value?: string) =>
      workspace === "__all__" || (value ?? "").toLowerCase() === workspace.toLowerCase(),
    [workspace],
  );
  const q = search.trim().toLowerCase();
  const matchQ = React.useCallback(
    (...fields: (string | undefined)[]) =>
      !q || fields.some((f) => (f ?? "").toLowerCase().includes(q)),
    [q],
  );

  const filteredFonts = React.useMemo(
    () => fonts.filter((f) => matchWs(f.project) && matchQ(f.name, f.project, f.license)),
    [fonts, matchWs, matchQ],
  );
  const filteredBrands = React.useMemo(
    () =>
      brands.filter(
        (b) =>
          matchWs(b.client) &&
          matchQ(b.client, b.brandVoice, b.fonts.join(" "), b.colors.join(" ")),
      ),
    [brands, matchWs, matchQ],
  );
  const filteredLinks = React.useMemo(
    () =>
      links.filter((l) => matchWs(l.client) && matchQ(l.label, l.url, l.category, l.description)),
    [links, matchWs, matchQ],
  );
  const filteredSnippets = React.useMemo(
    () => snippets.filter((s) => matchWs(s.project) && matchQ(s.title, s.code, s.language)),
    [snippets, matchWs, matchQ],
  );
  const filteredCredentials = React.useMemo(
    () =>
      credentials.filter(
        (c) => matchWs(c.client) && matchQ(c.label, c.username, c.url, c.notes, c.type),
      ),
    [credentials, matchWs, matchQ],
  );

  function saveFont(f: Font) {
    setFonts((arr) => {
      const idx = arr.findIndex((x) => x.id === f.id);
      if (idx >= 0) {
        const next = [...arr];
        next[idx] = f;
        toast.success("อัปเดตฟอนต์แล้ว");
        return next;
      }
      toast.success("เพิ่มฟอนต์แล้ว");
      return [...arr, f];
    });
    setEditingFont(null);
  }
  function deleteFont(id: string) {
    setFonts((arr) => arr.filter((x) => x.id !== id));
    toast.success("ลบฟอนต์แล้ว");
  }

  function saveBrand(b: Brand) {
    setBrands((arr) => {
      const idx = arr.findIndex((x) => x.id === b.id);
      if (idx >= 0) {
        const next = [...arr];
        next[idx] = b;
        toast.success("อัปเดต Brand แล้ว");
        return next;
      }
      toast.success("เพิ่ม Brand แล้ว");
      return [...arr, b];
    });
    setEditingBrand(null);
  }
  function deleteBrand(id: string) {
    setBrands((arr) => arr.filter((x) => x.id !== id));
    toast.success("ลบ Brand แล้ว");
  }

  function saveLink(l: LinkAsset) {
    setLinks((arr) => {
      const idx = arr.findIndex((x) => x.id === l.id);
      if (idx >= 0) {
        const next = [...arr];
        next[idx] = l;
        toast.success("อัปเดตลิงก์แล้ว");
        return next;
      }
      toast.success("เพิ่มลิงก์แล้ว");
      return [...arr, l];
    });
    setEditingLink(null);
  }
  function deleteLink(id: string) {
    setLinks((arr) => arr.filter((x) => x.id !== id));
    toast.success("ลบลิงก์แล้ว");
  }

  function saveSnippet(s: Snippet) {
    setSnippets((arr) => {
      const idx = arr.findIndex((x) => x.id === s.id);
      if (idx >= 0) {
        const next = [...arr];
        next[idx] = s;
        toast.success("อัปเดต Snippet แล้ว");
        return next;
      }
      toast.success("เพิ่ม Snippet แล้ว");
      return [...arr, s];
    });
    setEditingSnippet(null);
  }
  function deleteSnippet(id: string) {
    setSnippets((arr) => arr.filter((x) => x.id !== id));
    toast.success("ลบ Snippet แล้ว");
  }

  function saveCredential(c: Credential) {
    setCredentials((arr) => {
      const idx = arr.findIndex((x) => x.id === c.id);
      if (idx >= 0) {
        const next = [...arr];
        next[idx] = c;
        toast.success("อัปเดต Credential แล้ว");
        return next;
      }
      toast.success("เพิ่ม Credential แล้ว");
      return [...arr, c];
    });
    setEditingCredential(null);
  }
  function deleteCredential(id: string) {
    setCredentials((arr) => arr.filter((x) => x.id !== id));
    toast.success("ลบ Credential แล้ว");
  }

  return (
    <TooltipProvider delayDuration={150}>
      <div className="space-y-5">
        <div>
          <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" /> Assets — ศูนย์กลางทรัพยากรงานออกแบบ
            <span className="text-[10px] font-normal text-muted-foreground ml-1">
              · ตรวจสิทธิฟอนต์ก่อนส่งงานใน{" "}
              <a href="/dashboard?tab=mydata&sub=legal" className="text-primary hover:underline">
                Legal Desk
              </a>
            </span>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            รวมฟอนต์ · สีแบรนด์ · ลิงก์ไฟล์ · โค้ดสั้น · รหัสผ่าน ของลูกค้าทุกรายในที่เดียว
          </p>
        </div>

        {/* Workspace filter + global search */}
        <div className="flex flex-col sm:flex-row gap-2">
          <Select value={workspace} onValueChange={setWorkspace}>
            <SelectTrigger className="w-full sm:w-56 rounded-xl">
              <SelectValue placeholder="เลือก Workspace / ลูกค้า" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">ทั้งหมด ({workspaces.length} workspace)</SelectItem>
              {workspaces.map((w) => (
                <SelectItem key={w} value={w}>
                  {w}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหาทุกอย่าง — ชื่อฟอนต์ · สี · URL · ฯลฯ"
              className="pl-9 rounded-xl"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="ล้างคำค้น"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {isLoading && (
          <div className="text-xs text-muted-foreground flex items-center gap-2">
            <LoaderIcon className="h-3 w-3 animate-spin" /> กำลังโหลดข้อมูลจากคลาวด์…
          </div>
        )}

        <Tabs defaultValue="fonts" className="w-full">
          <TabsList className="grid w-full grid-cols-5 max-w-3xl">
            <TabsTrigger value="fonts" className="gap-1.5 text-xs">
              <Type className="h-3.5 w-3.5" /> Fonts
              <span className="ml-0.5 text-[10px] text-muted-foreground">
                {filteredFonts.length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="brands" className="gap-1.5 text-xs">
              <Palette className="h-3.5 w-3.5" /> Brands
              <span className="ml-0.5 text-[10px] text-muted-foreground">
                {filteredBrands.length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="links" className="gap-1.5 text-xs">
              <LinkIcon className="h-3.5 w-3.5" /> Links
              <span className="ml-0.5 text-[10px] text-muted-foreground">
                {filteredLinks.length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="snippets" className="gap-1.5 text-xs">
              <Code2 className="h-3.5 w-3.5" /> Snippets
              <span className="ml-0.5 text-[10px] text-muted-foreground">
                {filteredSnippets.length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="credentials" className="gap-1.5 text-xs">
              <KeyRound className="h-3.5 w-3.5" /> Vault
              <span className="ml-0.5 text-[10px] text-muted-foreground">
                {filteredCredentials.length}
              </span>
            </TabsTrigger>
          </TabsList>

          {/* ── Fonts ── */}
          <TabsContent value="fonts" className="mt-4">
            <Card className="animate-fade-up">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Type className="h-4 w-4 text-primary" /> Font Manager
                </CardTitle>
                <Button
                  size="sm"
                  onClick={() => setEditingFont("new")}
                  className="gap-1.5 rounded-xl"
                >
                  <Plus className="h-3.5 w-3.5" /> เพิ่มฟอนต์
                </Button>
              </CardHeader>
              <CardContent>
                {filteredFonts.length === 0 ? (
                  fonts.length === 0 ? (
                    <EmptyState
                      icon={Type}
                      title="ยังไม่มีฟอนต์ในคลัง"
                      description="รวมฟอนต์ที่ใช้บ่อย พร้อมระบุสิทธิ์การใช้งานเพื่อกันปัญหาลิขสิทธิ์ภายหลัง"
                      action={{
                        label: "เพิ่มฟอนต์แรกของคุณ",
                        onClick: () => setEditingFont("new"),
                        icon: Plus,
                      }}
                    />
                  ) : (
                    <p className="text-xs text-muted-foreground py-6 text-center">
                      ไม่พบรายการในเงื่อนไขที่กรอง
                    </p>
                  )
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {filteredFonts.map((f) => (
                      <FontRow
                        key={f.id}
                        font={f}
                        onEdit={() => setEditingFont(f)}
                        onDelete={() => deleteFont(f.id)}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Brands ── */}
          <TabsContent value="brands" className="mt-4">
            <Card className="animate-fade-up">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Palette className="h-4 w-4 text-primary" /> Brand Guidelines
                </CardTitle>
                <Button
                  size="sm"
                  onClick={() => setEditingBrand("new")}
                  className="gap-1.5 rounded-xl"
                >
                  <Plus className="h-3.5 w-3.5" /> เพิ่ม Brand
                </Button>
              </CardHeader>
              <CardContent>
                {filteredBrands.length === 0 ? (
                  brands.length === 0 ? (
                    <EmptyState
                      icon={Palette}
                      title="ยังไม่มี Brand"
                      description="คุมโทนแบรนด์ลูกค้า — สี · ฟอนต์ · ข้อควรระวัง · ไฟล์โลโก้ ครบใน Card เดียว"
                      action={{
                        label: "เพิ่ม Brand แรกของคุณ",
                        onClick: () => setEditingBrand("new"),
                        icon: Plus,
                      }}
                    />
                  ) : (
                    <p className="text-xs text-muted-foreground py-6 text-center">
                      ไม่พบรายการในเงื่อนไขที่กรอง
                    </p>
                  )
                ) : (
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {filteredBrands.map((b) => (
                      <BrandCard
                        key={b.id}
                        brand={b}
                        fonts={fonts}
                        onEdit={() => setEditingBrand(b)}
                        onDelete={() => deleteBrand(b.id)}
                        onOpenVault={() => setVaultBrand(b)}
                        onUpdate={(updated) =>
                          setBrands((arr) => arr.map((x) => (x.id === updated.id ? updated : x)))
                        }
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Links ── */}
          <TabsContent value="links" className="mt-4">
            <Card className="animate-fade-up">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <LinkIcon className="h-4 w-4 text-primary" /> ลิงก์ไฟล์งาน
                </CardTitle>
                <Button
                  size="sm"
                  onClick={() => setEditingLink("new")}
                  className="gap-1.5 rounded-xl"
                >
                  <Plus className="h-3.5 w-3.5" /> เพิ่มลิงก์
                </Button>
              </CardHeader>
              <CardContent>
                {filteredLinks.length === 0 ? (
                  links.length === 0 ? (
                    <EmptyState
                      icon={LinkIcon}
                      title="ยังไม่มีลิงก์"
                      description="รวมลิงก์ Figma · Canva · Drive ของแต่ละโปรเจกต์ ค้นหาง่าย ส่งงานไว"
                      action={{
                        label: "เพิ่มลิงก์แรกของคุณ",
                        onClick: () => setEditingLink("new"),
                        icon: Plus,
                      }}
                    />
                  ) : (
                    <p className="text-xs text-muted-foreground py-6 text-center">
                      ไม่พบรายการในเงื่อนไขที่กรอง
                    </p>
                  )
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {filteredLinks.map((l) => (
                      <LinkRow
                        key={l.id}
                        link={l}
                        onEdit={() => setEditingLink(l)}
                        onDelete={() => deleteLink(l.id)}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Snippets ── */}
          <TabsContent value="snippets" className="mt-4">
            <Card className="animate-fade-up">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Code2 className="h-4 w-4 text-primary" /> Quick Snippets
                </CardTitle>
                <Button
                  size="sm"
                  onClick={() => setEditingSnippet("new")}
                  className="gap-1.5 rounded-xl"
                >
                  <Plus className="h-3.5 w-3.5" /> เพิ่ม Snippet
                </Button>
              </CardHeader>
              <CardContent>
                {filteredSnippets.length === 0 ? (
                  snippets.length === 0 ? (
                    <EmptyState
                      icon={Code2}
                      title="ยังไม่มี Snippet"
                      description="เก็บโค้ด CSS / utility · หรือข้อความตอบลูกค้าที่ใช้บ่อย — ก๊อปไปวางได้ทันที"
                      action={{
                        label: "เพิ่ม Snippet แรกของคุณ",
                        onClick: () => setEditingSnippet("new"),
                        icon: Plus,
                      }}
                    />
                  ) : (
                    <p className="text-xs text-muted-foreground py-6 text-center">
                      ไม่พบรายการในเงื่อนไขที่กรอง
                    </p>
                  )
                ) : (
                  <div className="grid gap-3 md:grid-cols-2">
                    {filteredSnippets.map((s) => (
                      <SnippetCard
                        key={s.id}
                        snippet={s}
                        onEdit={() => setEditingSnippet(s)}
                        onDelete={() => deleteSnippet(s.id)}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Credentials Vault ── */}
          <TabsContent value="credentials" className="mt-4">
            <Card className="animate-fade-up">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <KeyRound className="h-4 w-4 text-primary" /> Credentials Vault
                </CardTitle>
                <Button
                  size="sm"
                  onClick={() => setEditingCredential("new")}
                  className="gap-1.5 rounded-xl"
                >
                  <Plus className="h-3.5 w-3.5" /> เพิ่ม Credential
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2">
                  <AlertTriangle className="h-3.5 w-3.5 text-warning shrink-0 mt-0.5" />
                  <p className="text-[11px] leading-tight text-warning-foreground">
                    เก็บแบบ user-scoped บนคลาวด์ — เห็นเฉพาะบัญชีคุณเท่านั้น แต่
                    <strong>ไม่ใช่ E2E encryption</strong> ระดับ Password Manager
                    ไม่แนะนำให้เก็บรหัสที่สำคัญสุด ๆ
                  </p>
                </div>
                {filteredCredentials.length === 0 ? (
                  credentials.length === 0 ? (
                    <EmptyState
                      icon={KeyRound}
                      title="ยังไม่มี Credential"
                      description="เก็บรหัสผ่าน WordPress · API Key · Wi-Fi ของลูกค้า — ซ่อนเป็นจุดอัตโนมัติ"
                      action={{
                        label: "เพิ่ม Credential แรก",
                        onClick: () => setEditingCredential("new"),
                        icon: Plus,
                      }}
                    />
                  ) : (
                    <p className="text-xs text-muted-foreground py-6 text-center">
                      ไม่พบรายการในเงื่อนไขที่กรอง
                    </p>
                  )
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {filteredCredentials.map((c) => (
                      <CredentialCard
                        key={c.id}
                        cred={c}
                        onEdit={() => setEditingCredential(c)}
                        onDelete={() => deleteCredential(c.id)}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <FontDialog editing={editingFont} onClose={() => setEditingFont(null)} onSave={saveFont} />
        <BrandDialog
          editing={editingBrand}
          onClose={() => setEditingBrand(null)}
          onSave={saveBrand}
        />
        <LinkDialog editing={editingLink} onClose={() => setEditingLink(null)} onSave={saveLink} />
        <SnippetDialog
          editing={editingSnippet}
          onClose={() => setEditingSnippet(null)}
          onSave={saveSnippet}
        />
        <CredentialDialog
          editing={editingCredential}
          onClose={() => setEditingCredential(null)}
          onSave={saveCredential}
        />
        <BrandVaultDialog
          brand={vaultBrand}
          onClose={() => setVaultBrand(null)}
          onUpdate={(updated) => {
            setBrands((arr) => arr.map((b) => (b.id === updated.id ? updated : b)));
            setVaultBrand(updated);
          }}
        />

        <PageFooterActions feature="assets" label="Assets" />
      </div>
    </TooltipProvider>
  );
}

// ============= Font row with hover preview =============
function FontRow({
  font: f,
  onEdit,
  onDelete,
}: {
  font: Font;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const sample = (f.sampleText && f.sampleText.trim()) || "The quick brown fox · ทดสอบฟอนต์ ๑๒๓";
  return (
    <div className="group rounded-xl border border-border/60 bg-card p-3 hover:border-primary/40 transition">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate" style={{ fontFamily: f.name }}>
            {f.name}
          </p>
          <p className="text-[11px] text-muted-foreground truncate">{f.project || "—"}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${LICENSE_COLOR[f.license]}`}
          >
            {f.license}
          </span>
          <Badge variant="secondary" className="text-[10px]">
            {f.usage === "Both" ? "P+C" : f.usage}
          </Badge>
        </div>
      </div>
      <p
        className="mt-2 text-base text-foreground/80 truncate"
        style={{ fontFamily: f.name }}
        aria-hidden="true"
      >
        {sample}
      </p>
      {f.weights && f.weights.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {f.weights.map((w) => (
            <Badge key={w} variant="outline" className="text-[9px] py-0 px-1.5">
              {w}
            </Badge>
          ))}
        </div>
      )}
      <div className="mt-2 flex items-center justify-between">
        <div>
          {f.downloadUrl && safeHref(f.downloadUrl) && (
            <a
              href={safeHref(f.downloadUrl)!}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
            >
              <ExternalLink className="h-3 w-3" /> แหล่งที่มา
            </a>
          )}
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onEdit}
            aria-label={`แก้ไข ${f.name}`}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive"
            onClick={onDelete}
            aria-label={`ลบ ${f.name}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============= Brand Card =============
function ColorChip({ hex }: { hex: string }) {
  const [copied, setCopied] = React.useState(false);
  const onClick = async () => {
    try {
      await navigator.clipboard.writeText(hex);
      setCopied(true);
      toast.success(`คัดลอก ${hex} แล้ว`);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      toast.error("คัดลอกไม่สำเร็จ");
    }
  };
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          className="relative h-7 w-7 rounded-md border border-border/60 hover:scale-110 transition focus:outline-none focus:ring-2 focus:ring-primary"
          style={{ backgroundColor: hex }}
          aria-label={`คัดลอก ${hex}`}
        >
          {copied && (
            <span className="absolute inset-0 flex items-center justify-center bg-foreground/70 rounded-md">
              <Check className="h-3.5 w-3.5 text-background" />
            </span>
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top">{copied ? "Copied!" : hex}</TooltipContent>
    </Tooltip>
  );
}

// React.memo: BrandCard มีรูป/สี/ข้อมูลเยอะ — กัน re-render เวลา state อื่นใน Assets เปลี่ยน
const BrandCard = React.memo(function BrandCard({
  brand: b,
  fonts,
  onEdit,
  onDelete,
  onOpenVault,
  onUpdate,
}: {
  brand: Brand;
  fonts: Font[];
  onEdit: () => void;
  onDelete: () => void;
  onOpenVault: () => void;
  onUpdate: (b: Brand) => void;
}) {
  const versions = b.doDontVersions ?? [];
  const [activeVer, setActiveVer] = React.useState<string>("main");
  const [editing, setEditing] = React.useState(false);
  const activeText =
    activeVer === "main"
      ? (b.doDont ?? "")
      : (versions.find((v) => v.id === activeVer)?.text ?? "");
  const [draft, setDraft] = React.useState(activeText);

  React.useEffect(() => {
    setDraft(activeText);
  }, [activeText, activeVer, b.id]);

  const saveDraft = () => {
    if (activeVer === "main") {
      onUpdate({ ...b, doDont: draft.trim() || undefined });
    } else {
      onUpdate({
        ...b,
        doDontVersions: versions.map((v) =>
          v.id === activeVer ? { ...v, text: draft.trim() } : v,
        ),
      });
    }
    setEditing(false);
    toast.success("บันทึก Do & Don't แล้ว");
  };

  const addVersion = () => {
    const label = window.prompt("ชื่อเวอร์ชันย่อย เช่น 'Social', 'Print'");
    if (!label || !label.trim()) return;
    const v: DoDontVersion = { id: uid(), label: label.trim().slice(0, 24), text: "" };
    onUpdate({ ...b, doDontVersions: [...versions, v] });
    setActiveVer(v.id);
    setEditing(true);
  };

  const removeVersion = (id: string) => {
    onUpdate({ ...b, doDontVersions: versions.filter((v) => v.id !== id) });
    if (activeVer === id) setActiveVer("main");
  };

  // ── License conflict detection: brand projectScope vs fonts used
  const conflicts = React.useMemo(() => {
    if (!b.projectScope || b.projectScope === "Personal") return [] as Font[];
    // ถ้า project = Commercial หรือ Both → ฟอนต์ Personal-only ใช้ไม่ได้
    return b.fonts
      .map((name) => fonts.find((f) => f.name.toLowerCase() === name.toLowerCase()))
      .filter((f): f is Font => !!f && f.usage === "Personal");
  }, [b.fonts, b.projectScope, fonts]);

  return (
    <div className="group rounded-xl border border-border/60 bg-card p-3 space-y-2 hover:border-primary/40">
      <div className="flex items-center justify-between">
        <div className="min-w-0 flex items-center gap-1.5">
          <p className="text-sm font-semibold truncate">{b.client}</p>
          {b.projectScope && (
            <Badge variant="outline" className="text-[9px] uppercase shrink-0">
              {b.projectScope}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={onOpenVault}
                aria-label="Asset Vault"
              >
                <ImageIcon className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Brand Asset Vault ({b.files.length})</TooltipContent>
          </Tooltip>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition"
            onClick={onEdit}
            aria-label={`แก้ไข ${b.client}`}
          >
            <Pencil className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-destructive opacity-0 group-hover:opacity-100 transition"
            onClick={onDelete}
            aria-label={`ลบ ${b.client}`}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
      <div className="flex flex-wrap gap-1">
        {b.colors.map((c) => (
          <ColorChip key={c} hex={c} />
        ))}
      </div>
      <div className="flex flex-wrap gap-1">
        {b.fonts.map((name) => {
          const matched = fonts.find((f) => f.name.toLowerCase() === name.toLowerCase());
          const isConflict = conflicts.some((c) => c.id === matched?.id);
          return (
            <Tooltip key={name}>
              <TooltipTrigger asChild>
                <Badge
                  variant={isConflict ? "outline" : "secondary"}
                  className={`text-[10px] gap-1 ${isConflict ? "border-warning text-warning-foreground bg-warning/15" : ""}`}
                >
                  {isConflict && <AlertTriangle className="h-2.5 w-2.5" />}
                  {name}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                {isConflict
                  ? `⚠ ${matched?.name} เป็น Personal-use เท่านั้น แต่โปรเจกต์นี้เป็น ${b.projectScope}`
                  : matched
                    ? `License: ${matched.license} · Usage: ${matched.usage === "Both" ? "Personal+Commercial" : matched.usage}`
                    : "ฟอนต์นี้ยังไม่มีในคลัง — กดเพิ่มในแท็บ Fonts"}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>

      {conflicts.length > 0 && (
        <div className="flex items-start gap-1.5 rounded-md border border-warning/40 bg-warning/10 px-2 py-1.5">
          <AlertTriangle className="h-3 w-3 text-warning shrink-0 mt-0.5" />
          <p className="text-[11px] leading-tight text-warning-foreground">
            ฟอนต์ {conflicts.map((c) => c.name).join(", ")} ใช้สำหรับงานส่วนตัวเท่านั้น —
            อย่าใช้ในงานเชิงพาณิชย์
          </p>
        </div>
      )}

      {b.logoNote && <p className="text-[11px] text-muted-foreground">{b.logoNote}</p>}

      {b.brandVoice && (
        <div className="rounded-md bg-primary/5 border border-primary/20 px-2 py-1.5">
          <p className="text-[10px] uppercase tracking-wide text-primary font-semibold mb-0.5">
            Brand Voice
          </p>
          <p className="text-[11px] text-foreground/80 leading-tight">{b.brandVoice}</p>
        </div>
      )}

      {/* Do & Don't (with sub-versions) */}
      <div className="rounded-md bg-muted/60 p-2 space-y-1.5">
        <div className="flex items-center justify-between gap-1">
          <div className="flex items-center gap-1 flex-wrap">
            <button
              type="button"
              onClick={() => setActiveVer("main")}
              className={`text-[10px] px-1.5 py-0.5 rounded ${activeVer === "main" ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}
            >
              หลัก
            </button>
            {versions.map((v) => (
              <span key={v.id} className="inline-flex items-center">
                <button
                  type="button"
                  onClick={() => setActiveVer(v.id)}
                  className={`text-[10px] px-1.5 py-0.5 rounded ${activeVer === v.id ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {v.label}
                </button>
                {activeVer === v.id && (
                  <button
                    type="button"
                    onClick={() => removeVersion(v.id)}
                    className="ml-0.5 text-muted-foreground hover:text-destructive"
                    aria-label={`ลบเวอร์ชัน ${v.label}`}
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                )}
              </span>
            ))}
            <button
              type="button"
              onClick={addVersion}
              className="text-[10px] px-1 py-0.5 rounded text-muted-foreground hover:text-foreground"
              aria-label="เพิ่มเวอร์ชันย่อย"
            >
              <Plus className="h-2.5 w-2.5" />
            </button>
          </div>
          {!editing && (
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5"
              onClick={() => setEditing(true)}
              aria-label="แก้ไข Do & Don't"
            >
              <Pencil className="h-3 w-3" />
            </Button>
          )}
        </div>
        {editing ? (
          <div className="space-y-1">
            <Textarea
              rows={2}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Do: ใช้บนพื้นขาว · Don't: บีบ/ยืดสัดส่วน"
              maxLength={200}
              className="text-[11px]"
            />
            <div className="flex justify-end gap-1">
              <Button
                size="sm"
                variant="ghost"
                className="h-6 text-[11px]"
                onClick={() => {
                  setDraft(activeText);
                  setEditing(false);
                }}
              >
                ยกเลิก
              </Button>
              <Button size="sm" className="h-6 text-[11px]" onClick={saveDraft}>
                บันทึก
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-[11px] text-foreground/80 whitespace-pre-wrap min-h-[1rem]">
            {activeText || (
              <span className="text-muted-foreground italic">
                ยังไม่มีข้อความ — กดดินสอเพื่อเพิ่ม
              </span>
            )}
          </p>
        )}
      </div>
    </div>
  );
});

// ============= Link row =============
function LinkRow({
  link: l,
  onEdit,
  onDelete,
}: {
  link: LinkAsset;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const favicon = getFaviconUrl(l.url);
  const [faviconBroken, setFaviconBroken] = React.useState(false);
  return (
    <div className="group flex items-center gap-3 rounded-xl border border-border/60 bg-card p-3 hover:border-primary/40">
      <div className="h-9 w-9 shrink-0 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
        {favicon && !faviconBroken ? (
          <img src={favicon} alt="" className="h-5 w-5" onError={() => setFaviconBroken(true)} />
        ) : (
          <Globe className="h-4 w-4 text-muted-foreground" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-[10px]">
            {l.category}
          </Badge>
          <p className="text-sm font-medium truncate">{l.label}</p>
        </div>
        {l.description ? (
          <p className="text-[11px] text-muted-foreground truncate">{l.description}</p>
        ) : (
          <p className="text-[11px] text-muted-foreground truncate">
            {l.client} · {l.url}
          </p>
        )}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Button
          asChild
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          aria-label="เปิดลิงก์"
          disabled={!safeHref(l.url)}
        >
          <a href={safeHref(l.url) ?? "#"} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 opacity-0 group-hover:opacity-100 transition"
          onClick={onEdit}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-destructive opacity-0 group-hover:opacity-100 transition"
          onClick={onDelete}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

// ============= Snippet card =============
const SnippetCard = React.memo(function SnippetCard({
  snippet: s,
  onEdit,
  onDelete,
}: {
  snippet: Snippet;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(s.code);
      toast.success("คัดลอกโค้ดแล้ว");
    } catch {
      toast.error("คัดลอกไม่สำเร็จ");
    }
  };
  return (
    <div className="rounded-xl border border-border/60 bg-card p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate">{s.title}</p>
          <p className="text-[11px] text-muted-foreground truncate">
            {s.project} · {s.language}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={copy}
            aria-label="คัดลอกโค้ด"
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive"
            onClick={onDelete}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      <pre className="text-[11px] bg-muted rounded-md p-2 overflow-x-auto max-h-32">
        <code>{s.code}</code>
      </pre>
    </div>
  );
});

// ============= Font dialog =============
function FontDialog({
  editing,
  onClose,
  onSave,
}: {
  editing: Font | "new" | null;
  onClose: () => void;
  onSave: (f: Font) => void;
}) {
  const open = !!editing;
  const isNew = editing === "new";
  const [name, setName] = React.useState("");
  const [project, setProject] = React.useState("");
  const [license, setLicense] = React.useState<License>("Free");
  const [usage, setUsage] = React.useState<UsageScope>("Both");
  const [downloadUrl, setDownloadUrl] = React.useState("");
  const [weightsText, setWeightsText] = React.useState("");
  const [sampleText, setSampleText] = React.useState("");

  React.useEffect(() => {
    if (editing && editing !== "new") {
      setName(editing.name);
      setProject(editing.project);
      setLicense(editing.license);
      setUsage(editing.usage ?? "Both");
      setDownloadUrl(editing.downloadUrl ?? "");
      setWeightsText((editing.weights ?? []).join(", "));
      setSampleText(editing.sampleText ?? "");
    } else {
      setName("");
      setProject("");
      setLicense("Free");
      setUsage("Both");
      setDownloadUrl("");
      setWeightsText("");
      setSampleText("");
    }
  }, [editing]);

  function submit() {
    if (!name.trim()) {
      toast.error("กรุณากรอกชื่อฟอนต์");
      return;
    }
    const weights = weightsText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    onSave({
      id: !editing || editing === "new" ? uid() : editing.id,
      name: name.trim(),
      project: project.trim(),
      license,
      usage,
      downloadUrl: downloadUrl.trim() || undefined,
      weights: weights.length > 0 ? weights : undefined,
      sampleText: sampleText.trim() || undefined,
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isNew ? "เพิ่มฟอนต์ใหม่" : "แก้ไขฟอนต์"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>ชื่อฟอนต์ *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Inter, Sarabun..."
              maxLength={60}
            />
          </div>
          <div className="space-y-1.5">
            <Label>โปรเจ็คที่ใช้</Label>
            <Input
              value={project}
              onChange={(e) => setProject(e.target.value)}
              placeholder="ชื่อโปรเจ็ค / ลูกค้า"
              maxLength={80}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label>License</Label>
              <Select value={license} onValueChange={(v) => setLicense(v as License)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Free">Free</SelectItem>
                  <SelectItem value="Paid">Paid</SelectItem>
                  <SelectItem value="Trial">Trial</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Usage</Label>
              <Select value={usage} onValueChange={(v) => setUsage(v as UsageScope)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Personal">Personal</SelectItem>
                  <SelectItem value="Commercial">Commercial</SelectItem>
                  <SelectItem value="Both">Personal + Commercial</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>น้ำหนัก (Weights, คั่นด้วย ,)</Label>
            <Input
              value={weightsText}
              onChange={(e) => setWeightsText(e.target.value)}
              placeholder="Regular, 500, 700, Bold"
              maxLength={120}
            />
          </div>
          <div className="space-y-1.5">
            <Label>ข้อความตัวอย่าง (Preview)</Label>
            <Input
              value={sampleText}
              onChange={(e) => setSampleText(e.target.value)}
              placeholder="The quick brown fox · ทดสอบฟอนต์"
              maxLength={120}
            />
          </div>
          <div className="space-y-1.5">
            <Label>ลิงก์ดาวน์โหลด / แหล่งที่มา</Label>
            <Input
              value={downloadUrl}
              onChange={(e) => setDownloadUrl(e.target.value)}
              placeholder="https://fonts.google.com/..."
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            ยกเลิก
          </Button>
          <Button onClick={submit}>{isNew ? "เพิ่ม" : "บันทึก"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============= Brand dialog =============
function BrandDialog({
  editing,
  onClose,
  onSave,
}: {
  editing: Brand | "new" | null;
  onClose: () => void;
  onSave: (b: Brand) => void;
}) {
  const open = !!editing;
  const isNew = editing === "new";
  const [client, setClient] = React.useState("");
  const [colorsText, setColorsText] = React.useState("");
  const [fontsText, setFontsText] = React.useState("");
  const [logoNote, setLogoNote] = React.useState("");
  const [doDont, setDoDont] = React.useState("");
  const [brandVoice, setBrandVoice] = React.useState("");
  const [projectScope, setProjectScope] = React.useState<UsageScope>("Commercial");

  React.useEffect(() => {
    if (editing && editing !== "new") {
      setClient(editing.client);
      setColorsText(editing.colors.join(", "));
      setFontsText(editing.fonts.join(", "));
      setLogoNote(editing.logoNote);
      setDoDont(editing.doDont ?? "");
      setBrandVoice(editing.brandVoice ?? "");
      setProjectScope(editing.projectScope ?? "Commercial");
    } else {
      setClient("");
      setColorsText("#0F172A, #3B82F6, #F1F5F9");
      setFontsText("Inter");
      setLogoNote("");
      setDoDont("");
      setBrandVoice("");
      setProjectScope("Commercial");
    }
  }, [editing]);

  function submit() {
    if (!client.trim()) {
      toast.error("กรุณากรอกชื่อลูกค้า / Brand");
      return;
    }
    const colors = colorsText
      .split(/[,\s]+/)
      .map((s) => s.trim())
      .filter((s) => /^#?[0-9a-fA-F]{3,8}$/.test(s))
      .map((s) => (s.startsWith("#") ? s : `#${s}`));
    const fonts = fontsText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const prev = editing && editing !== "new" ? editing : null;
    onSave({
      id: !editing || editing === "new" ? uid() : editing.id,
      client: client.trim(),
      colors,
      fonts,
      logoNote: logoNote.trim(),
      doDont: doDont.trim() || undefined,
      doDontVersions: prev?.doDontVersions ?? [],
      projectScope,
      files: prev?.files ?? [],
      brandVoice: brandVoice.trim() || undefined,
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isNew ? "เพิ่ม Brand" : "แก้ไข Brand"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>ชื่อลูกค้า / Brand *</Label>
            <Input
              value={client}
              onChange={(e) => setClient(e.target.value)}
              placeholder="Nimbus Co."
              maxLength={80}
            />
          </div>
          <div className="space-y-1.5">
            <Label>สี (HEX คั่นด้วย ,)</Label>
            <Input
              value={colorsText}
              onChange={(e) => setColorsText(e.target.value)}
              placeholder="#0F172A, #3B82F6, #F1F5F9"
            />
            <div className="flex gap-1 pt-1">
              {colorsText
                .split(/[,\s]+/)
                .map((s) => s.trim())
                .filter((s) => /^#?[0-9a-fA-F]{3,8}$/.test(s))
                .map((s) => (s.startsWith("#") ? s : `#${s}`))
                .map((c) => (
                  <div
                    key={c}
                    className="h-6 w-6 rounded border border-border/60"
                    style={{ backgroundColor: c }}
                    title={c}
                  />
                ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>ฟอนต์ (คั่นด้วย ,)</Label>
            <Input
              value={fontsText}
              onChange={(e) => setFontsText(e.target.value)}
              placeholder="Inter, Manrope"
            />
          </div>
          <div className="space-y-1.5">
            <Label>ขอบเขตการใช้งานโปรเจกต์</Label>
            <Select value={projectScope} onValueChange={(v) => setProjectScope(v as UsageScope)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Personal">Personal — งานส่วนตัว</SelectItem>
                <SelectItem value="Commercial">Commercial — ใช้เชิงพาณิชย์</SelectItem>
                <SelectItem value="Both">Both — ทั้งสองแบบ</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[10px] text-muted-foreground">
              ระบบจะเตือนถ้าใส่ฟอนต์ Personal-only ในโปรเจกต์ Commercial
            </p>
          </div>
          <div className="space-y-1.5">
            <Label>โน้ต Logo / การใช้งาน</Label>
            <Textarea
              rows={2}
              value={logoNote}
              onChange={(e) => setLogoNote(e.target.value)}
              placeholder="Min size 24px / ใช้พื้นอ่อนเท่านั้น..."
              maxLength={200}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Do & Don't (ข้อควรระวัง)</Label>
            <Textarea
              rows={2}
              value={doDont}
              onChange={(e) => setDoDont(e.target.value)}
              placeholder="Do: ใช้บนพื้นขาว · Don't: บีบ/ยืดสัดส่วน"
              maxLength={200}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Brand Voice / โทนการสื่อสาร</Label>
            <Textarea
              rows={2}
              value={brandVoice}
              onChange={(e) => setBrandVoice(e.target.value)}
              placeholder="ทางการ · อบอุ่น · พูดกับ Gen Z แบบเพื่อน"
              maxLength={200}
            />
            <p className="text-[10px] text-muted-foreground">
              ใช้เป็น reference เวลาเขียน copy หรือ caption ให้แบรนด์นี้
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            ยกเลิก
          </Button>
          <Button onClick={submit}>{isNew ? "เพิ่ม" : "บันทึก"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============= Link dialog =============
function LinkDialog({
  editing,
  onClose,
  onSave,
}: {
  editing: LinkAsset | "new" | null;
  onClose: () => void;
  onSave: (l: LinkAsset) => void;
}) {
  const open = !!editing;
  const isNew = editing === "new";
  const [client, setClient] = React.useState("");
  const [label, setLabel] = React.useState("");
  const [url, setUrl] = React.useState("");
  const [category, setCategory] = React.useState("Figma");
  const [description, setDescription] = React.useState("");

  React.useEffect(() => {
    if (editing && editing !== "new") {
      setClient(editing.client);
      setLabel(editing.label);
      setUrl(editing.url);
      setCategory(editing.category);
      setDescription(editing.description ?? "");
    } else {
      setClient("");
      setLabel("");
      setUrl("");
      setCategory("Figma");
      setDescription("");
    }
  }, [editing]);

  function submit() {
    if (!label.trim() || !url.trim()) {
      toast.error("กรอก label และ URL");
      return;
    }
    onSave({
      id: !editing || editing === "new" ? uid() : editing.id,
      client: client.trim(),
      label: label.trim(),
      url: url.trim(),
      category,
      description: description.trim() || undefined,
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isNew ? "เพิ่มลิงก์" : "แก้ไขลิงก์"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label>ลูกค้า / โปรเจกต์</Label>
              <Input value={client} onChange={(e) => setClient(e.target.value)} maxLength={60} />
            </div>
            <div className="space-y-1.5">
              <Label>หมวด</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Figma">Figma</SelectItem>
                  <SelectItem value="Canva">Canva</SelectItem>
                  <SelectItem value="Drive">Google Drive</SelectItem>
                  <SelectItem value="Dropbox">Dropbox</SelectItem>
                  <SelectItem value="Other">อื่นๆ</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>ชื่อลิงก์ *</Label>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Final UI · v3"
              maxLength={80}
            />
          </div>
          <div className="space-y-1.5">
            <Label>URL *</Label>
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://figma.com/..."
            />
          </div>
          <div className="space-y-1.5">
            <Label>คำอธิบาย (Description)</Label>
            <Textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="เช่น ไฟล์ UI final ของ Sprint 3 — ห้ามแก้โดยตรง"
              maxLength={160}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            ยกเลิก
          </Button>
          <Button onClick={submit}>{isNew ? "เพิ่ม" : "บันทึก"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============= Snippet dialog =============
function SnippetDialog({
  editing,
  onClose,
  onSave,
}: {
  editing: Snippet | "new" | null;
  onClose: () => void;
  onSave: (s: Snippet) => void;
}) {
  const open = !!editing;
  const isNew = editing === "new";
  const [project, setProject] = React.useState("");
  const [title, setTitle] = React.useState("");
  const [code, setCode] = React.useState("");
  const [language, setLanguage] = React.useState("CSS");

  React.useEffect(() => {
    if (editing && editing !== "new") {
      setProject(editing.project);
      setTitle(editing.title);
      setCode(editing.code);
      setLanguage(editing.language);
    } else {
      setProject("");
      setTitle("");
      setCode("");
      setLanguage("CSS");
    }
  }, [editing]);

  function submit() {
    if (!title.trim() || !code.trim()) {
      toast.error("กรอกชื่อและโค้ด");
      return;
    }
    onSave({
      id: !editing || editing === "new" ? uid() : editing.id,
      project: project.trim(),
      title: title.trim(),
      code,
      language,
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isNew ? "เพิ่ม Snippet" : "แก้ไข Snippet"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label>โปรเจกต์</Label>
              <Input value={project} onChange={(e) => setProject(e.target.value)} maxLength={60} />
            </div>
            <div className="space-y-1.5">
              <Label>ภาษา</Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CSS">CSS</SelectItem>
                  <SelectItem value="HTML">HTML</SelectItem>
                  <SelectItem value="JS">JavaScript</SelectItem>
                  <SelectItem value="TS">TypeScript</SelectItem>
                  <SelectItem value="Other">อื่นๆ</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>ชื่อ *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} />
          </div>
          <div className="space-y-1.5">
            <Label>โค้ด *</Label>
            <Textarea
              rows={6}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="font-mono text-xs"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            ยกเลิก
          </Button>
          <Button onClick={submit}>{isNew ? "เพิ่ม" : "บันทึก"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============= Brand Vault Dialog =============
function detectKind(nameOrUrl: string): BrandFile["kind"] {
  const u = nameOrUrl.toLowerCase().split("?")[0];
  if (u.endsWith(".svg")) return "svg";
  if (u.endsWith(".png")) return "png";
  if (u.endsWith(".ai")) return "ai";
  if (u.endsWith(".pdf")) return "pdf";
  return "other";
}

const ACCEPTED_UPLOAD =
  ".svg,.png,.jpg,.jpeg,.webp,.pdf,image/svg+xml,image/png,image/jpeg,image/webp,application/pdf";
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5MB hard cap (compressed to ~200KB for raster images)
const STORAGE_BUCKET = "brand-logos";
const ALLOWED_MIME = new Set([
  "image/svg+xml",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "application/pdf",
]);

function BrandVaultDialog({
  brand,
  onClose,
  onUpdate,
}: {
  brand: Brand | null;
  onClose: () => void;
  onUpdate: (b: Brand) => void;
}) {
  const { user } = useAuth();
  const [label, setLabel] = React.useState("");
  const [url, setUrl] = React.useState("");
  const [uploading, setUploading] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    setLabel("");
    setUrl("");
  }, [brand?.id]);

  if (!brand) return null;

  const addFile = () => {
    if (!label.trim() || !url.trim()) {
      toast.error("กรอกชื่อและลิงก์ไฟล์");
      return;
    }
    const file: BrandFile = {
      id: uid(),
      label: label.trim(),
      url: url.trim(),
      kind: detectKind(url),
    };
    onUpdate({ ...brand, files: [...brand.files, file] });
    setLabel("");
    setUrl("");
    toast.success("เพิ่มไฟล์แล้ว");
  };

  const handleUploadClick = () => fileInputRef.current?.click();

  const handleFiles = async (list: FileList | null) => {
    if (!list || list.length === 0) return;
    if (!user?.id) {
      toast.error("กรุณาเข้าสู่ระบบก่อนอัปโหลด");
      return;
    }
    setUploading(true);
    try {
      const newFiles: BrandFile[] = [];
      for (const file of Array.from(list)) {
        if (file.size > MAX_UPLOAD_BYTES) {
          toast.error(`${file.name} เกิน 5MB`);
          continue;
        }
        const mime = file.type || "";
        if (!ALLOWED_MIME.has(mime)) {
          toast.error(`${file.name}: รองรับเฉพาะ PNG/JPG/WEBP/SVG/PDF`);
          continue;
        }
        // Verify magic-byte signature matches MIME (anti-spoofing)
        try {
          const ALLOWED: readonly AllowedKind[] = ["jpeg", "png", "webp", "svg", "pdf"];
          await assertFileSignature(file, ALLOWED);
        } catch (err) {
          toast.error(
            `${file.name}: ${err instanceof Error ? err.message : "ไฟล์ไม่ผ่านการตรวจสอบ"}`,
          );
          continue;
        }
        let blob: Blob = file;
        let uploadType = mime;
        let ext = file.name.includes(".") ? file.name.split(".").pop()!.toLowerCase() : "bin";
        // Compress raster images to ~200KB jpeg
        if (
          mime === "image/png" ||
          mime === "image/jpeg" ||
          mime === "image/jpg" ||
          mime === "image/webp"
        ) {
          try {
            const dataUrl = await compressImageFile(file);
            blob = dataUrlToBlob(dataUrl);
            uploadType = "image/jpeg";
            ext = "jpg";
          } catch (err) {
            toast.error(`${file.name}: ${err instanceof Error ? err.message : "บีบอัดไม่สำเร็จ"}`);
            continue;
          }
        }
        const path = `${user.id}/${brand.id}/${uid()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(path, blob, { contentType: uploadType, upsert: false });
        if (upErr) {
          toast.error(`อัปโหลด ${file.name} ไม่สำเร็จ: ${upErr.message}`);
          continue;
        }
        const { data: pub } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
        newFiles.push({
          id: uid(),
          label: file.name,
          url: pub.publicUrl,
          kind: detectKind(file.name),
          storagePath: path,
        });
      }
      if (newFiles.length > 0) {
        onUpdate({ ...brand, files: [...brand.files, ...newFiles] });
        toast.success(`อัปโหลดสำเร็จ ${newFiles.length} ไฟล์`);
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeFile = async (file: BrandFile) => {
    if (file.storagePath) {
      const { error } = await supabase.storage.from(STORAGE_BUCKET).remove([file.storagePath]);
      if (error) {
        toast.error(`ลบไฟล์ในคลังไม่สำเร็จ: ${error.message}`);
        return;
      }
    }
    onUpdate({ ...brand, files: brand.files.filter((f) => f.id !== file.id) });
    toast.success("ลบไฟล์แล้ว");
  };

  const copyUrl = async (u: string) => {
    try {
      await navigator.clipboard.writeText(u);
      toast.success("คัดลอกลิงก์แล้ว");
    } catch {
      toast.error("คัดลอกไม่สำเร็จ");
    }
  };

  return (
    <Dialog open={!!brand} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-primary" /> Asset Vault — {brand.client}
          </DialogTitle>
          <DialogDescription>
            อัปโหลดหรือฝากลิงก์ไฟล์โลโก้ต้นฉบับ (.svg / .png / .ai / .pdf) — สูงสุด 10MB ต่อไฟล์
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {/* Upload zone */}
          <div className="rounded-lg border border-dashed border-border/80 bg-muted/30 p-4 text-center space-y-2">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={ACCEPTED_UPLOAD}
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
            <Upload className="h-5 w-5 mx-auto text-muted-foreground" />
            <p className="text-[11px] text-muted-foreground">SVG · PNG · AI · PDF</p>
            <Button
              type="button"
              size="sm"
              onClick={handleUploadClick}
              disabled={uploading}
              className="gap-1.5"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> กำลังอัปโหลด...
                </>
              ) : (
                <>
                  <Upload className="h-3.5 w-3.5" /> อัปโหลดไฟล์
                </>
              )}
            </Button>
          </div>

          {brand.files.length === 0 ? (
            <div className="text-xs text-muted-foreground py-4 text-center border border-dashed rounded-lg">
              ยังไม่มีไฟล์ในคลัง
            </div>
          ) : (
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {brand.files.map((f) => (
                <div
                  key={f.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-border/60 p-2"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-[10px] uppercase">
                        {f.kind}
                      </Badge>
                      {f.storagePath && (
                        <Badge variant="outline" className="text-[9px]">
                          uploaded
                        </Badge>
                      )}
                      <p className="text-sm font-medium truncate">{f.label}</p>
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate">{f.url}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => copyUrl(f.url)}
                      aria-label="คัดลอกลิงก์"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      asChild
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      aria-label="ดาวน์โหลด"
                      disabled={!safeHref(f.url)}
                    >
                      <a
                        href={safeHref(f.url) ?? "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        download
                      >
                        <Download className="h-3.5 w-3.5" />
                      </a>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      onClick={() => removeFile(f)}
                      aria-label="ลบ"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-2 rounded-lg border border-border/60 p-3 bg-muted/30">
            <p className="text-[11px] font-medium text-muted-foreground">หรือฝากลิงก์ภายนอก</p>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="ชื่อไฟล์ (Logo Primary SVG)"
              maxLength={80}
            />
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://drive.google.com/..."
            />
            <Button onClick={addFile} size="sm" variant="outline" className="w-full gap-1.5">
              <Plus className="h-3.5 w-3.5" /> เพิ่มลิงก์เข้าคลัง
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            ปิด
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============= Credential Card (secure, hide-by-default) =============
const CRED_TYPE_LABEL: Record<CredentialType, string> = {
  password: "รหัสผ่าน",
  apiKey: "API Key",
  wifi: "Wi-Fi",
  other: "อื่นๆ",
};

const CredentialCard = React.memo(function CredentialCard({
  cred: c,
  onEdit,
  onDelete,
}: {
  cred: Credential;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [revealed, setRevealed] = React.useState(false);

  const copySecret = async () => {
    try {
      await navigator.clipboard.writeText(c.secret);
      toast.success("คัดลอกแล้ว · clipboard จะถูกล้างใน 30 วิ");
      setTimeout(() => {
        navigator.clipboard.writeText("").catch(() => undefined);
      }, 30000);
    } catch {
      toast.error("คัดลอกไม่สำเร็จ");
    }
  };

  return (
    <div className="group rounded-xl border border-border/60 bg-card p-3 space-y-2 hover:border-primary/40 transition">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <Badge variant="secondary" className="text-[10px]">
              {CRED_TYPE_LABEL[c.type]}
            </Badge>
            <p className="text-sm font-semibold truncate">{c.label}</p>
          </div>
          {c.client && (
            <p className="text-[11px] text-muted-foreground truncate">
              {c.client}
              {c.project ? ` · ${c.project}` : ""}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onEdit}
            aria-label="แก้ไข"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive"
            onClick={onDelete}
            aria-label="ลบ"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      {c.username && (
        <div className="flex items-center justify-between gap-2 text-[11px]">
          <span className="text-muted-foreground">User:</span>
          <code className="flex-1 truncate font-mono">{c.username}</code>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => {
              navigator.clipboard.writeText(c.username!).catch(() => undefined);
              toast.success("คัดลอก username");
            }}
            aria-label="คัดลอก username"
          >
            <Copy className="h-3 w-3" />
          </Button>
        </div>
      )}
      <div className="flex items-center justify-between gap-2 rounded-md bg-muted/60 px-2 py-1.5">
        <code className="flex-1 truncate font-mono text-[12px] select-all">
          {revealed ? c.secret : "•".repeat(Math.min(c.secret.length, 16))}
        </code>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => setRevealed((v) => !v)}
          aria-label={revealed ? "ซ่อน" : "เผย"}
        >
          {revealed ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={copySecret}
          aria-label="คัดลอกค่า"
        >
          <Copy className="h-3 w-3" />
        </Button>
      </div>
      {c.url && safeHref(c.url) && (
        <a
          href={safeHref(c.url)!}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
        >
          <ExternalLink className="h-3 w-3" /> เปิดหน้าเข้าระบบ
        </a>
      )}
      {c.notes && (
        <p className="text-[11px] text-muted-foreground whitespace-pre-wrap">{c.notes}</p>
      )}
    </div>
  );
});

// ============= Credential dialog =============
function CredentialDialog({
  editing,
  onClose,
  onSave,
}: {
  editing: Credential | "new" | null;
  onClose: () => void;
  onSave: (c: Credential) => void;
}) {
  const open = !!editing;
  const isNew = editing === "new";
  const [client, setClient] = React.useState("");
  const [project, setProject] = React.useState("");
  const [label, setLabel] = React.useState("");
  const [type, setType] = React.useState<CredentialType>("password");
  const [username, setUsername] = React.useState("");
  const [secret, setSecret] = React.useState("");
  const [url, setUrl] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [showSecret, setShowSecret] = React.useState(false);

  React.useEffect(() => {
    if (editing && editing !== "new") {
      setClient(editing.client);
      setProject(editing.project ?? "");
      setLabel(editing.label);
      setType(editing.type);
      setUsername(editing.username ?? "");
      setSecret(editing.secret);
      setUrl(editing.url ?? "");
      setNotes(editing.notes ?? "");
    } else {
      setClient("");
      setProject("");
      setLabel("");
      setType("password");
      setUsername("");
      setSecret("");
      setUrl("");
      setNotes("");
    }
    setShowSecret(false);
  }, [editing]);

  function submit() {
    if (!label.trim() || !secret.trim()) {
      toast.error("กรอกชื่อและรหัส");
      return;
    }
    onSave({
      id: !editing || editing === "new" ? uid() : editing.id,
      client: client.trim(),
      project: project.trim() || undefined,
      label: label.trim(),
      type,
      username: username.trim() || undefined,
      secret,
      url: url.trim() || undefined,
      notes: notes.trim() || undefined,
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-primary" />
            {isNew ? "เพิ่ม Credential" : "แก้ไข Credential"}
          </DialogTitle>
          <DialogDescription className="text-[11px]">
            เก็บแบบ user-scoped บนคลาวด์ · ไม่ใช่ E2E encryption
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label>ลูกค้า</Label>
              <Input
                value={client}
                onChange={(e) => setClient(e.target.value)}
                maxLength={60}
                placeholder="บริษัท A"
              />
            </div>
            <div className="space-y-1.5">
              <Label>ประเภท</Label>
              <Select value={type} onValueChange={(v) => setType(v as CredentialType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="password">รหัสผ่าน</SelectItem>
                  <SelectItem value="apiKey">API Key</SelectItem>
                  <SelectItem value="wifi">Wi-Fi</SelectItem>
                  <SelectItem value="other">อื่นๆ</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>โปรเจกต์ (ถ้ามี)</Label>
            <Input value={project} onChange={(e) => setProject(e.target.value)} maxLength={60} />
          </div>
          <div className="space-y-1.5">
            <Label>ชื่อ Credential *</Label>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="WordPress Admin · OpenAI Key..."
              maxLength={80}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Username / Email</Label>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              maxLength={120}
              autoComplete="off"
            />
          </div>
          <div className="space-y-1.5">
            <Label>รหัส / Secret *</Label>
            <div className="relative">
              <Input
                type={showSecret ? "text" : "password"}
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                className="pr-9 font-mono"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowSecret((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={showSecret ? "ซ่อน" : "เผย"}
              >
                {showSecret ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>URL (ถ้ามี)</Label>
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://admin.example.com"
            />
          </div>
          <div className="space-y-1.5">
            <Label>โน้ต</Label>
            <Textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={300}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            ยกเลิก
          </Button>
          <Button onClick={submit}>{isNew ? "เพิ่ม" : "บันทึก"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
