import { useId, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import {
  useCreateComment,
  useDeleteComment,
  useProjectComments,
  useUpdateComment,
  type CommentTree,
  type CommentWithProfile,
} from "@/hooks/useProjectComments";
import { useBlockedUserIds } from "@/hooks/useBlockedUserIds";
import { useHiddenCommentIds } from "@/hooks/useHiddenCommentIds";
import { useUserBlocks } from "@/hooks/useCommunityPostInteractions";
import { filterCommentTree } from "@/lib/commentTree";
import { hideCommentId } from "@/lib/hiddenComments";
import { proxiedImageUrl } from "@/lib/imageProxy";
import { mapWriteFlowError } from "@/lib/writeFlowErrors";
import { loginHref } from "../lib/loginHref";
import { useBlockPerson, useCommentSmiles } from "./useWork";
import { ConfirmBox, MoreMenu, ReportBox, type MenuItem } from "./WorkMenu";

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

type Modal = { kind: "delete" | "block" | "report"; c: CommentWithProfile } | null;

/**
 * Comments of a work (mock: Work.dc.html "คอมเมนต์"): the owner's question, a box to write, then the threads.
 * Each comment has a ⋯ (old CommentOwnerMenu / CommentViewerMenu): mine → edit, delete; others' → hide,
 * block, report. Hidden comments and people blocked either way do not show (old CommentSection).
 */
export default function WorkComments({ projectId, ownerId, ownerHandle, ask, onToast }: Props) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: me } = useProfile(user?.id);
  const { data: all = [] } = useProjectComments(projectId);
  const hiddenIds = useHiddenCommentIds();
  const blockedIds = useBlockedUserIds();
  const tree = useMemo(() => filterCommentTree(all, hiddenIds, blockedIds), [all, hiddenIds, blockedIds]);
  const { data: iBlocked } = useUserBlocks(user?.id);
  const create = useCreateComment();
  const update = useUpdateComment();
  const remove = useDeleteComment();
  const block = useBlockPerson();
  const [modal, setModal] = useState<Modal>(null);
  const [editing, setEditing] = useState<{ id: string; draft: string } | null>(null);
  const toLogin = () => navigate(loginHref());
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
      toLogin();
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
    if (!smiles.toggle(id)) toLogin();
  };

  const menuFor = (c: CommentWithProfile): MenuItem[] => {
    const who = nameOf(c) || "คนนี้";
    if (user && c.user_id === user.id) {
      return [
        { key: "edit", label: "แก้ไข", onSelect: () => setEditing({ id: c.id, draft: c.content }) },
        { key: "delete", label: "ลบ", danger: true, onSelect: () => setModal({ kind: "delete", c }) },
      ];
    }
    const blocked = !!iBlocked?.has(c.user_id);
    return [
      {
        key: "hide",
        label: "ซ่อนคอมเมนต์นี้",
        onSelect: () => {
          hideCommentId(c.id);
          onToast("ซ่อนแล้วนะ");
        },
      },
      {
        key: "block",
        label: blocked ? `บล็อก ${who} แล้ว` : `บล็อก ${who}`,
        hint: "จะไม่เห็นกันและทักกันไม่ได้",
        disabled: blocked,
        onSelect: () => (user ? setModal({ kind: "block", c }) : toLogin()),
      },
      { key: "report", label: "รายงานคอมเมนต์", onSelect: () => (user ? setModal({ kind: "report", c }) : toLogin()) },
    ];
  };

  const saveEdit = async () => {
    if (!editing || update.isPending) return;
    try {
      await update.mutateAsync({ id: editing.id, project_id: projectId, content: editing.draft });
      setEditing(null);
      onToast("แก้แล้ว");
    } catch (e) {
      onToast(mapWriteFlowError(e, "แก้ไม่สำเร็จ ลองใหม่อีกทีนะ"));
    }
  };

  /** The words of a comment, or the box to edit them (Esc there cancels the edit only). */
  const textOf = (c: CommentWithProfile) =>
    editing?.id === c.id ? (
      <div className="wk-c-edit">
        <label htmlFor={`${fieldId}-e`} className="wk-sr">
          แก้คอมเมนต์
        </label>
        <textarea
          id={`${fieldId}-e`}
          rows={3}
          maxLength={2000}
          autoFocus
          value={editing.draft}
          onChange={(e) => setEditing({ id: c.id, draft: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              e.nativeEvent.stopImmediatePropagation();
              setEditing(null);
            }
          }}
        />
        <div className="wk-c-edit-row">
          <button type="button" className="wk-dlg-line" onClick={() => setEditing(null)}>
            ยกเลิก
          </button>
          <button
            type="button"
            className="wk-dlg-ink"
            disabled={!editing.draft.trim() || update.isPending}
            aria-busy={update.isPending || undefined}
            onClick={() => void saveEdit()}
          >
            บันทึก
          </button>
        </div>
      </div>
    ) : (
      <p className="wk-c-text">{c.content}</p>
    );

  const more = (c: CommentWithProfile) => <MoreMenu items={menuFor(c)} label="ตัวเลือกคอมเมนต์" place="below" buttonClass="wk-c-act" />;

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
                  {textOf(c)}
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
                    {more(c)}
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
                        {textOf(r)}
                        <div className="wk-c-acts">{more(r)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      {modal?.kind === "delete" ? (
        <ConfirmBox
          title="ลบคอมเมนต์นี้?"
          body="ลบแล้วกู้คืนไม่ได้นะ"
          yes="ลบ"
          danger
          onClose={() => setModal(null)}
          onYes={async () => {
            try {
              await remove.mutateAsync({ id: modal.c.id, project_id: projectId });
              setModal(null);
              onToast("ลบแล้ว");
            } catch (e) {
              onToast(mapWriteFlowError(e, "ลบไม่สำเร็จ ลองใหม่อีกทีนะ"));
            }
          }}
        />
      ) : null}
      {modal?.kind === "block" ? (
        <ConfirmBox
          title={`บล็อก ${nameOf(modal.c) || "คนนี้"}?`}
          body="จะไม่เห็นงานกับคอมเมนต์ของกันและกัน และทักกันไม่ได้ เลิกบล็อกได้ที่ Settings นะ"
          yes="บล็อก"
          danger
          onClose={() => setModal(null)}
          onYes={async () => {
            try {
              await block.mutateAsync(modal.c.user_id);
              setModal(null);
              onToast("บล็อกแล้ว");
            } catch (e) {
              onToast(mapWriteFlowError(e, "บล็อกไม่สำเร็จ ลองใหม่อีกทีนะ"));
            }
          }}
        />
      ) : null}
      {modal?.kind === "report" ? (
        <ReportBox
          target={{ type: "comment", id: modal.c.id }}
          ownerId={modal.c.user_id}
          ownerName={nameOf(modal.c)}
          canBlock={!iBlocked?.has(modal.c.user_id)}
          onClose={() => setModal(null)}
          onDone={(note) => {
            setModal(null);
            onToast(note);
          }}
        />
      ) : null}
    </section>
  );
}
