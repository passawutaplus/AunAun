import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Heading2,
  Heading3,
  Quote,
  Code,
  Link as LinkIcon,
  Image as ImageIcon,
  Undo2,
  Redo2,
  Pilcrow,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { safeUrl } from "@/lib/security";
import { toast } from "sonner";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

export function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: {
          rel: "noopener noreferrer nofollow",
          target: "_blank",
          class: "text-primary underline underline-offset-2",
        },
      }),
      Image.configure({
        HTMLAttributes: { class: "rounded-lg my-4 max-w-full h-auto" },
      }),
      Placeholder.configure({
        placeholder: placeholder || "เริ่มเขียนเนื้อหาบทความ…",
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: "prose prose-sm sm:prose-base max-w-none focus:outline-none min-h-[400px] px-4 py-3",
      },
    },
    immediatelyRender: false,
  });

  if (!editor) {
    return <div className="rounded-xl border border-border bg-muted/30 h-[480px] animate-pulse" />;
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <Toolbar editor={editor} />
      <div className="bg-background">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const setLink = () => {
    const previous = editor.getAttributes("link").href as string | undefined;
    const input = window.prompt("ใส่ URL (เว้นว่างเพื่อลบ):", previous ?? "https://");
    if (input === null) return;
    if (input === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    const safe = safeUrl(input);
    if (!safe) {
      toast.error("URL ไม่ปลอดภัย รองรับเฉพาะ http(s)");
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: safe }).run();
  };

  const addImage = () => {
    const input = window.prompt("วาง URL รูปภาพ:");
    if (!input) return;
    const safe = safeUrl(input);
    if (!safe) {
      toast.error("URL รูปไม่ปลอดภัย");
      return;
    }
    editor.chain().focus().setImage({ src: safe, alt: "" }).run();
  };

  const Btn = ({
    onClick,
    active,
    label,
    children,
  }: {
    onClick: () => void;
    active?: boolean;
    label: string;
    children: React.ReactNode;
  }) => (
    <Button
      type="button"
      size="sm"
      variant={active ? "secondary" : "ghost"}
      onClick={onClick}
      aria-label={label}
      title={label}
      className="h-8 w-8 p-0"
    >
      {children}
    </Button>
  );

  return (
    <div className="flex items-center gap-0.5 flex-wrap border-b border-border bg-muted/30 px-2 py-1.5">
      <Btn
        label="หัวข้อใหญ่ H2"
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        active={editor.isActive("heading", { level: 2 })}
      >
        <Heading2 className="h-4 w-4" />
      </Btn>
      <Btn
        label="หัวข้อย่อย H3"
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        active={editor.isActive("heading", { level: 3 })}
      >
        <Heading3 className="h-4 w-4" />
      </Btn>
      <Btn
        label="ย่อหน้า"
        onClick={() => editor.chain().focus().setParagraph().run()}
        active={editor.isActive("paragraph")}
      >
        <Pilcrow className="h-4 w-4" />
      </Btn>
      <div className="w-px h-5 bg-border mx-1" />
      <Btn
        label="ตัวหนา"
        onClick={() => editor.chain().focus().toggleBold().run()}
        active={editor.isActive("bold")}
      >
        <Bold className="h-4 w-4" />
      </Btn>
      <Btn
        label="ตัวเอียง"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        active={editor.isActive("italic")}
      >
        <Italic className="h-4 w-4" />
      </Btn>
      <Btn
        label="โค้ด"
        onClick={() => editor.chain().focus().toggleCode().run()}
        active={editor.isActive("code")}
      >
        <Code className="h-4 w-4" />
      </Btn>
      <div className="w-px h-5 bg-border mx-1" />
      <Btn
        label="bullet list"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        active={editor.isActive("bulletList")}
      >
        <List className="h-4 w-4" />
      </Btn>
      <Btn
        label="ลำดับเลข"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        active={editor.isActive("orderedList")}
      >
        <ListOrdered className="h-4 w-4" />
      </Btn>
      <Btn
        label="คำพูด"
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        active={editor.isActive("blockquote")}
      >
        <Quote className="h-4 w-4" />
      </Btn>
      <div className="w-px h-5 bg-border mx-1" />
      <Btn label="ลิงก์" onClick={setLink} active={editor.isActive("link")}>
        <LinkIcon className="h-4 w-4" />
      </Btn>
      <Btn label="แทรกรูป" onClick={addImage}>
        <ImageIcon className="h-4 w-4" />
      </Btn>
      <div className="ml-auto flex items-center gap-0.5">
        <Btn label="undo" onClick={() => editor.chain().focus().undo().run()}>
          <Undo2 className="h-4 w-4" />
        </Btn>
        <Btn label="redo" onClick={() => editor.chain().focus().redo().run()}>
          <Redo2 className="h-4 w-4" />
        </Btn>
      </div>
    </div>
  );
}
