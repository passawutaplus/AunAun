import { Link, useNavigate } from "react-router-dom";
import { openConnectChat } from "@/lib/chat/openConnectChat";
import { proxiedImageUrl } from "@/lib/imageProxy";
import { displayProfileAddress } from "@/lib/profileAddress";
import { parseProfileVisibility } from "@/lib/profileVisibility";
import ScLoader from "../main/ScLoader";
import { profileHref } from "../main/useCreators";
import { useFollows } from "../main/useFollows";
import { useMyFollowing } from "./useMyProfile";

const Lock = () => (
  <svg aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#8A8A87" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="11" width="14" height="9.5" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
);

/** "เห็นแค่คุณ" under the tabs of Saved and Following (mock .priv). */
export const OnlyYou = () => (
  <span className="mp-priv">
    <Lock />
    เห็นแค่คุณ
  </span>
);

/** Following: a card per person I follow — three newest works, name, CATEGORY · city, ทักทาย, follow toggle. */
export default function MyFollowing({ uid }: { uid: string }) {
  const navigate = useNavigate();
  const { list, pending } = useMyFollowing(uid, true);
  const follows = useFollows();

  const greet = async (id: string) => {
    // The floating chat (ChatDock) comes with the Chat step; until then the old chat room opens.
    try {
      const room = await openConnectChat(uid, id, "");
      navigate(`/chat/${room}`);
    } catch {
      // the chat page shows its own errors; stay here if the room could not be opened
    }
  };

  return (
    <>
      <OnlyYou />
      <div className="mp-cards">
        {list.map((f) => {
          const vis = parseProfileVisibility(f.public_visibility);
          const city = vis.location ? displayProfileAddress(f.profile_address, f.location, "short") : "";
          const sub = [(f.sc_categories ?? []).join(" · "), city].filter(Boolean).join(" · ");
          const name = f.username || f.display_name?.trim() || "";
          const on = follows.ids.has(f.user_id);
          const href = profileHref({ user_id: f.user_id, username: f.username });
          return (
            <div key={f.user_id} className="mp-crc">
              <Link to={href} className="mp-crc-covers" aria-label={`ดูโปรไฟล์ ${name}`}>
                {[0, 1, 2].map((i) => (f.covers[i] ? <img key={i} src={proxiedImageUrl(f.covers[i], 320)} alt="" loading="lazy" decoding="async" /> : <span key={i} />))}
              </Link>
              <span className="mp-crc-who">
                {f.avatar_url ? <img alt="" src={proxiedImageUrl(f.avatar_url, 96)} className="mp-crc-av" /> : <span aria-hidden="true" className="mp-crc-av" />}
                <Link to={href} className="mp-crc-name">
                  <span>{name}</span>
                  {sub ? <span>{sub}</span> : null}
                </Link>
                <button type="button" className="mp-ib2" aria-label={`ทักทาย ${name}`} onClick={() => void greet(f.user_id)}>
                  <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3.5a8.5 8.5 0 0 1 0 17c-1.5 0-2.9-.4-4.1-1L3.5 20.5l1.1-4.2A8.5 8.5 0 0 1 12 3.5z" /></svg>
                </button>
              </span>
              <button type="button" className="mp-fol" aria-pressed={on} onClick={() => follows.toggle(f.user_id)}>
                {on ? (
                  <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#282929" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
                ) : null}
                {on ? "ติดตามแล้ว" : "ติดตาม"}
              </button>
            </div>
          );
        })}
      </div>
      {pending ? <ScLoader label="กำลังโหลด" /> : null}
    </>
  );
}
