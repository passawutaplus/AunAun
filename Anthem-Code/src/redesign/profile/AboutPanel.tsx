import { instagramHandle, websiteLabel } from "../lib/contactLinks";
import { count } from "./tiles";

/** The About tab, the same on Profile and MyProfile (mock 03b: contact lives here only). */
export default function AboutPanel({
  bio,
  cats,
  tools,
  city,
  followers,
  ig,
  web,
  mail,
  instagram,
  website,
  email,
}: {
  bio: string;
  cats: readonly string[];
  tools: string;
  city: string;
  followers: number;
  /** Ready links ("" = not shown); the raw values are their labels. */
  ig: string;
  web: string;
  mail: string;
  instagram: string | null;
  website: string | null;
  email: string | null;
}) {
  return (
    <div className="pf-about">
      <h3>About</h3>
      <div className="pf-about-body">
        {bio ? <p>{bio}</p> : null}
        <dl>
          {cats.length ? (
            <>
              <dt>หมวด</dt>
              <dd>{cats.join(", ")}</dd>
            </>
          ) : null}
          {tools ? (
            <>
              <dt>เครื่องมือ</dt>
              <dd>{tools}</dd>
            </>
          ) : null}
          {city ? (
            <>
              <dt>เมือง</dt>
              <dd>{city}</dd>
            </>
          ) : null}
          <dt>ผู้ติดตาม</dt>
          <dd>{count(followers)} คน</dd>
        </dl>
        {ig || web || mail ? (
          <div className="pf-contact" aria-label="ติดต่อ">
            <h4>CONTACT</h4>
            {ig ? (
              <a href={ig} target="_blank" rel="noopener noreferrer">
                <span><svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#282929" strokeWidth="1.4"><rect x="4" y="4" width="16" height="16" rx="4.5" /><circle cx="12" cy="12" r="3.6" /></svg></span>
                <span><small>INSTAGRAM</small>{instagramHandle(instagram)}</span>
                <i aria-hidden="true">↗</i>
              </a>
            ) : null}
            {web ? (
              <a href={web} target="_blank" rel="noopener noreferrer">
                <span><svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#282929" strokeWidth="1.4" strokeLinecap="round"><circle cx="12" cy="12" r="8.5" /><path d="M3.5 12h17M12 3.5c2.5 2.6 2.5 14.4 0 17M12 3.5c-2.5 2.6-2.5 14.4 0 17" /></svg></span>
                <span><small>WEBSITE</small>{websiteLabel(website)}</span>
                <i aria-hidden="true">↗</i>
              </a>
            ) : null}
            {mail ? (
              <a href={mail}>
                <span><svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#282929" strokeWidth="1.4" strokeLinejoin="round"><rect x="3.5" y="6" width="17" height="12.5" rx="2" /><path d="M4 7l8 6 8-6" /></svg></span>
                <span><small>EMAIL</small>{email?.trim()}</span>
                <i aria-hidden="true">↗</i>
              </a>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
