import { useId, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useCreateComment, useProjectComments, type CommentTree, type CommentWithProfile } from "@/hooks/useProjectComments";
import { proxiedImageUrl } from "@/lib/imageProxy";
import { SC_LINKS } from "../routes";
import { useCommentSmiles } from "./useWork";

type Props = {
  projectId: string;
  ownerId: string | null;
  /** The owner's handle, as shown on the page ("passawut.a.plus"). */
  ownerHandle: string;
  /** The owner's question from Upload "ASK VIEWERS"; without one, the same sentence for every work (owner 2026-11-28). */
  ask?: string | null;
  /** Shows a short message under the page (errors). */
  onToast: (text: string) => void;
};

const nameOf = (c: CommentWithProfile) => c.profile?.username || c.profile?.display_name?.trim() || "";
const avatarOf = (c: CommentWithProfile, px: number) => proxiedImageUrl(c.profile?.avatar_url, px * 2);

/** Every reply under a comment, oldest first, in one thread (the mock shows one level). */
function flatReplies(node: CommentTree): CommentWithProfile[] {
  const out: CommentWithProfile[] = [];
  const walk = (n: CommentTree) => {
    for (const r of n.replies) {
      out.push(r.comment);
      walk(r);
    }
  };
  walk(node);
  return out.sort((a, b) => a.created_at.localeCompare(b.created_at));
}

const countAll = (nodes: CommentTree[]): number => nodes.reduce((n, c) => n + 1 + countAll(c.replies), 0);

/** "· เมื่อกี้" right after posting (mock); older comments show the name only. */
const justNow = (iso: string) => Date.now() - new Date(iso).getTime() < 60_000;

function OwnerBadge() {
  return (
    <svg role="img" aria-label="เจ้าของงาน" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#282929" strokeWidth="1.67">
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <rect x="9" y="9" width="6" height="6" rx="1" />
    </svg>
  );
}

function Avatar({ src, size }: { src: string; size: number }) {
  return src ? (
    <img alt="" src={src} className="wk-av" style={{ width: size, height: size }} />
  ) : (
    <span aria-hidden="true" className="wk-av" style={{ width: size, height: size }} />
  );
}

/** Comments of a work (mock: Work.dc.html "คอมเมนต์"): the owner's question, a box to write, then the threads. */
export default function WorkComments({ projectId, ownerId, ownerHandle, ask, onToast }: Props) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: me } = useProfile(user?.id);
  const { data: tree = [] } = useProjectComments(projectId);
  const create = useCreateComment();
  const roots = useMemo(() => [...tree].sort((a, b) => b.comment.created_at.localeCompare(a.comment.created_at)), [tree]);
  const rootIds = useMemo(() => roots.map((r) => r.comment.id), [roots]);
  const smiles = useCommentSmiles(projectId, rootIds);

  const fieldId = useId();
  const fieldRef = useRef<HTMLTextAreaElement>(null);
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<{ id: string; handle: string } | null>(null);
  const ready = !!text.trim() && !create.isPending;

  const reply = (c: CommentWithProfile) => {
    const handle = nameOf(c);
    setReplyTo({ id: c.id, handle });
    setText(handle ? `@${handle} ` : "");
    window.setTimeout(() => fieldRef.current?.focus(), 30);
  };

  const send = async () => {
    const content = text.trim();
    if (!content || create.isPending) return;
    if (!user) {
      navigate(SC_LINKS.login);
      return;
    }
    // Still a reply only while the text starts with the @name the reply button put there.
    const parent = replyTo && (!replyTo.handle || content.startsWith(`@${replyTo.handle}`)) ? replyTo.id : null;
    try {
      await create.mutateAsync({ project_id: projectId, user_id: user.id, content, parent_id: parent, depth: parent ? 1 : 0 });
      setText("");
      setReplyTo(null);
    } catch (e) {
      onToast(e instanceof Error && e.message ? e.message : "ส่งคอมเมนต์ไม่สำเร็จ");
    }
  };

  const smile = (id: string) => {
    if (!smiles.toggle(id)) navigate(SC_LINKS.login);
  };

  const meAvatar = proxiedImageUrl(me?.avatar_url, 80);

  return (
    <section aria-labelledby="cm-h" className="wk-cm">
      <h2 id="cm-h" className="wk-h2">
        Comments <span className="wk-cm-n">{countAll(tree)}</span>
      </h2>

      <div className="wk-ask">
        <span className="wk-lbl">{ownerHandle} อยากรู้</span>
        <p>{ask?.trim() || "ตรงไหนของงานนี้ที่ทำให้คุณหยุดดูนานที่สุด"}</p>
      </div>

      <div className="wk-write">
        <Avatar src={meAvatar} size={40} />
        <label htmlFor={fieldId} className="wk-sr">เขียนคอมเมนต์</label>
        <div className="wk-field">
          <textarea
            ref={fieldRef}
            id={fieldId}
            rows={4}
            placeholder="…"
            value={text}
            maxLength={2000}
            onChange={(e) => setText(e.target.value)}
          />
          <button type="button" aria-label="ส่ง" className="wk-send" data-on={ready ? "" : undefined} onClick={() => void send()}>
            <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </button>
        </div>
      </div>

      {roots.length ? (
        <div className="wk-cm-list">
          {roots.map((node) => {
            const c = node.comment;
            const replies = flatReplies(node);
            const smiled = smiles.mine.has(c.id);
            return (
              <div key={c.id} className="wk-c">
                <Avatar src={avatarOf(c, 32)} size={32} />
                <div className="wk-c-body">
                  <span className="wk-c-name">
                    {nameOf(c)}
                    {c.user_id === ownerId ? <OwnerBadge /> : null}
                    {justNow(c.created_at) ? <span className="wk-c-time"> · เมื่อกี้</span> : null}
                  </span>
                  <p className="wk-c-text">{c.content}</p>
                  <div className="wk-c-acts">
                    {smiles.available ? (
                      <button type="button" aria-label="ยิ้ม" aria-pressed={smiled} className="wk-c-act" onClick={() => smile(c.id)}>
                        <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={smiled ? "#282929" : "#8A8A87"} strokeWidth="1.33" strokeLinecap="round">
                          <circle cx="12" cy="12" r="8.5" />
                          <path d="M8.5 14a4 4 0 0 0 7 0" />
                          <path d="M9.5 9.5h.01M14.5 9.5h.01" strokeWidth="2" />
                        </svg>
                      </button>
                    ) : null}
                    <button type="button" aria-label="ตอบกลับ" className="wk-c-act" onClick={() => reply(c)}>
                      <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8A8A87" strokeWidth="1.33" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9.5 6L4 11.5 9.5 17M4 11.5h9a6 6 0 0 1 6 6v1" />
                      </svg>
                    </button>
                  </div>
                  {replies.map((r) => (
                    <div key={r.id} className="wk-reply">
                      <Avatar src={avatarOf(r, 28)} size={28} />
                      <div className="wk-c-body">
                        <span className="wk-c-name">
                          {nameOf(r)}
                          {r.user_id === ownerId ? <OwnerBadge /> : null}
                          {justNow(r.created_at) ? <span className="wk-c-time"> · เมื่อกี้</span> : null}
                        </span>
                        <p className="wk-c-text">{r.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
