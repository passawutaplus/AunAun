import type { ReactNode } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Mail, MapPin, Phone } from "lucide-react";
import LineMarkIcon from "@/components/icons/LineMarkIcon";
import type {
  AboutCvModel,
  CvContactItem,
  CvEntryModel,
  CvSectionKey,
  CvSectionModel,
} from "@/lib/aboutCvModel";

/**
 * The three CV arrangements. They render the same AboutCvModel — only the
 * placement differs. Sizes live in index.css (`.cv-a`, `.cv-b`, `.cv-c`).
 */

type TemplateProps = { model: AboutCvModel; initials: string };

const THAI = /[\u0E00-\u0E7F]/;

/** Thai marks sit on their base letter; tracking would pull them apart, so tag Thai text. */
const th = (text: string) => (THAI.test(text) ? { "data-th": "true" as const } : {});

const SELF_EXPLAINING: CvContactItem["kind"][] = ["email", "phone", "profile", "portfolio", "website"];

function pick(model: AboutCvModel, keys: CvSectionKey[]): CvSectionModel[] {
  return keys.flatMap((key) => model.sections.filter((s) => s.key === key));
}

function splitName(name: string): { first: string; rest: string } {
  const [first = "", ...rest] = name.trim().split(/\s+/);
  return { first, rest: rest.join(" ") };
}

/** Largest size (in design px) at which the longest word still fits the box. */
function fitFont(text: string, maxPx: number, boxPx: number): string {
  const longest = Math.max(1, ...text.split(/\s+/).map((w) => w.length));
  const px = Math.max(26, Math.min(maxPx, Math.floor(boxPx / (0.6 * longest))));
  return `calc(${px} * var(--u))`;
}

function Photo({ model, initials }: TemplateProps) {
  if (!model.showPhoto) return null;
  return (
    <div className="cv-photo">
      {model.portraitUrl ? (
        <img src={model.portraitUrl} alt="" decoding="async" />
      ) : (
        <span style={{ fontSize: "calc(44 * var(--u))" }}>{initials}</span>
      )}
    </div>
  );
}

function Qr({ value, className }: { value: string; className: string }) {
  return (
    <div className={`cv-qr ${className}`} aria-label="QR code">
      <QRCodeSVG value={value} size={96} level="M" marginSize={0} bgColor="#ffffff" fgColor="#111111" />
    </div>
  );
}

function ContactLine({ item }: { item: CvContactItem }) {
  return (
    <p className="cv-contact-line">
      {SELF_EXPLAINING.includes(item.kind) ? null : <span className="cv-contact-label">{item.label}</span>}
      <span>{item.value}</span>
    </p>
  );
}

function EntryTitle({ entry }: { entry: CvEntryModel }) {
  return entry.href ? (
    <a href={entry.href} target="_blank" rel="noopener noreferrer" className="cv-entry-link">
      {entry.title}
    </a>
  ) : (
    <>{entry.title}</>
  );
}

function Bullets({ items }: { items: string[] }) {
  if (!items.length) return null;
  return (
    <ul className="cv-bullets">
      {items.map((b) => (
        <li key={b}>{b}</li>
      ))}
    </ul>
  );
}

function SubLines({ lines }: { lines: string[] }) {
  return (
    <>
      {lines.map((line) => (
        <div key={line} className="cv-entry-sub">
          {line}
        </div>
      ))}
    </>
  );
}

/** Lists shared by every template: skills, software, languages, location, personal details. */
function sideBlocks(model: AboutCvModel) {
  const { labels } = model;
  return {
    personal: model.personal.length
      ? { title: labels.blocks.personal, body: (
          <div>
            {model.personal.map((p) => (
              <div key={p.key}>
                {p.label}: {p.value}
              </div>
            ))}
          </div>
        ) }
      : null,
    skills: model.craftSkills.length
      ? { title: labels.blocks.skills, body: (
          <ul>
            {model.craftSkills.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        ) }
      : null,
    software: model.software.length
      ? { title: labels.blocks.software, body: <p>{model.software.join(" · ")}</p> }
      : null,
    languages: model.languages.length
      ? { title: labels.blocks.languages, body: (
          <div>
            {model.languages.map((l) => (
              <div key={l}>{l}</div>
            ))}
          </div>
        ) }
      : null,
    location: model.place ? { title: labels.blocks.location, body: <p>{model.place}</p> } : null,
  };
}

type Block = { title: string; body: ReactNode } | null;

// ── A · Editorial split ──────────────────────────────────────────────────────
export function TemplateEditorial({ model, initials }: TemplateProps) {
  const blocks = sideBlocks(model);
  const left = pick(model, ["education"]);
  const right = pick(model, ["experience", "projects", "certification", "awards", "references"]);
  const leftBlocks: Block[] = [blocks.personal, blocks.skills, blocks.software, blocks.languages, blocks.location];
  const { first, rest } = splitName(model.name);
  const photo = model.showPhoto;

  return (
    <div className="cv-a">
      <div className="cv-a-top">
        <span {...th(model.name)}>{model.name}</span>
        <span {...th(model.desiredRole)}>{model.desiredRole.toUpperCase()}</span>
      </div>

      <div className="cv-a-hero" data-photo={photo ? "on" : "off"}>
        {photo ? <Photo model={model} initials={initials} /> : null}
        <div className="cv-a-hero-copy">
          <div>
            {model.name ? (
              <div className="cv-a-name" style={{ fontSize: fitFont(model.name, 54, 325) }}>
                {first}
                {rest ? (
                  <>
                    <br />
                    {rest}
                  </>
                ) : null}
              </div>
            ) : null}
            {model.desiredRole ? <div className="cv-a-role" {...th(model.desiredRole)}>
                {model.desiredRole}
              </div> : null}
            {model.name || model.desiredRole ? <span className="cv-a-rule" aria-hidden /> : null}
          </div>
          {model.bio ? <div className="cv-a-bio">{model.bio}</div> : null}
        </div>
      </div>

      <div className="cv-a-cols">
        <div className="cv-a-col l cv-fit">
          {left.map((section) => (
            <section key={section.key} className="cv-a-section">
              <h2 {...th(section.title)}>{section.title}</h2>
              {section.entries.map((e, i) => (
                <ASectionEntry key={`${e.title}-${i}`} entry={e} />
              ))}
            </section>
          ))}
          {leftBlocks.map((b) =>
            b ? (
              <section key={b.title} className="cv-a-block">
                <h2 {...th(b.title)}>{b.title}</h2>
                {b.body}
              </section>
            ) : null,
          )}
        </div>
        <div className="cv-a-col r cv-fit">
          {right.map((section) => (
            <section key={section.key} className="cv-a-section">
              <h2 {...th(section.title)}>{section.title}</h2>
              {section.entries.map((e, i) => (
                <ASectionEntry key={`${e.title}-${i}`} entry={e} />
              ))}
            </section>
          ))}
        </div>
      </div>

      <div className="cv-a-foot">
        <div className="cv-a-contacts">
          {model.contacts.map((c) => (
            <ContactLine key={c.key} item={c} />
          ))}
        </div>
        {model.qrTarget ? <Qr value={model.qrTarget} className="cv-a-qr" /> : null}
      </div>
    </div>
  );
}

function ASectionEntry({ entry }: { entry: CvEntryModel }) {
  return (
    <div className="cv-entry cv-a-entry" data-period={entry.period ? "on" : "off"}>
      {entry.period ? <span>{entry.period}</span> : null}
      <div>
        <div className="cv-entry-title">
          <EntryTitle entry={entry} />
        </div>
        <SubLines lines={entry.lines} />
        <Bullets items={entry.bullets} />
      </div>
    </div>
  );
}

// ── B · Bold index ───────────────────────────────────────────────────────────
export function TemplateIndex({ model, initials }: TemplateProps) {
  const blocks = sideBlocks(model);
  const main = pick(model, ["experience", "projects", "education", "certification", "awards"]);
  const refs = pick(model, ["references"])[0];
  const lists: Block[] = [blocks.skills, blocks.software, blocks.languages];
  const { first, rest } = splitName(model.name);
  const contactBlockOn = model.contacts.length > 0 || !!model.qrTarget || !!model.place;

  return (
    <div className="cv-b">
      <div className="cv-b-left cv-fit">
        <Photo model={model} initials={initials} />
        {contactBlockOn ? (
          <>
            <h2 {...th(model.labels.blocks.contact)}>{model.labels.blocks.contact}</h2>
            <div className="cv-b-contacts">
              {model.contacts.map((c) => (
                <ContactLine key={c.key} item={c} />
              ))}
              {model.place ? <p className="cv-contact-line">{model.place}</p> : null}
            </div>
            {model.qrTarget ? <Qr value={model.qrTarget} className="cv-b-qr" /> : null}
          </>
        ) : null}
        {blocks.personal ? (
          <>
            <h2 {...th(blocks.personal.title)}>{blocks.personal.title}</h2>
            <div className="cv-b-contacts">{blocks.personal.body}</div>
          </>
        ) : null}
        <div className="cv-b-spacer" />
        {model.name ? (
          <div className="cv-b-name" style={{ fontSize: fitFont(model.name, 48, 212) }}>
            {first}
            {rest ? (
              <>
                <br />
                {rest}.
              </>
            ) : (
              "."
            )}
          </div>
        ) : null}
        {model.desiredRole ? <div className="cv-b-role" {...th(model.desiredRole)}>
            {model.desiredRole}
          </div> : null}
        {model.bio ? <div className="cv-b-bio">{model.bio}</div> : null}
      </div>

      <div className="cv-b-right cv-fit">
        {main.map((section) => (
          <section key={section.key} className="cv-b-section">
            <h2 {...th(section.title)}>{section.title}</h2>
            {section.entries.map((e, i) => (
              <div key={`${e.title}-${i}`} className="cv-entry">
                <div className="cv-b-entry-title">
                  <EntryTitle entry={e} />
                  {e.lines[0] ? ` | ${e.lines[0]}` : ""}
                </div>
                {e.lines.slice(1).map((line) => (
                  <div key={line} className="cv-entry-sub">
                    {line}
                  </div>
                ))}
                {e.period ? <div className="cv-b-entry-title">{e.period}</div> : null}
                <Bullets items={e.bullets} />
              </div>
            ))}
          </section>
        ))}
        {lists.map((b) =>
          b ? (
            <section key={b.title} className="cv-b-section">
              <h2 {...th(b.title)}>{b.title}</h2>
              <div className="cv-b-pairs">{b.body}</div>
            </section>
          ) : null,
        )}
        {refs ? (
          <section className="cv-b-section" style={{ marginTop: "auto" }}>
            <h2 {...th(refs.title)}>{refs.title}</h2>
            <div className="cv-b-pairs">
              {refs.entries.map((e, i) => (
                <div key={`${e.title}-${i}`}>
                  <b>{e.title}</b>
                  {e.lines.map((line) => (
                    <div key={line} className="cv-entry-sub">
                      {line}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}

// ── C · Wide grid ────────────────────────────────────────────────────────────
const HEADER_ICON: Partial<Record<CvContactItem["kind"], ReactNode>> = {
  phone: <Phone aria-hidden />,
  email: <Mail aria-hidden />,
  line: <LineMarkIcon aria-hidden />,
};

export function TemplateGrid({ model, initials }: TemplateProps) {
  const blocks = sideBlocks(model);
  const main = pick(model, ["experience", "projects", "education", "certification", "awards", "references"]);
  const headerContacts = model.contacts.filter((c) => c.kind in HEADER_ICON);
  const links = model.contacts.filter((c) => !(c.kind in HEADER_ICON));
  const { first, rest } = splitName(model.name);
  const sideLists: Block[] = [blocks.skills, blocks.software, blocks.languages, blocks.personal];
  const hasSide =
    model.showPhoto || links.length > 0 || !!model.qrTarget || sideLists.some(Boolean);

  return (
    <div className="cv-c">
      <div className="cv-c-head">
        <div className="min-w-0">
          {rest ? (
            <>
              <div className="cv-c-first">{first}</div>
              <div className="cv-c-last" style={{ fontSize: fitFont(rest, 64, 400) }}>
                {rest}
              </div>
            </>
          ) : (
            <div className="cv-c-last" style={{ fontSize: fitFont(first, 64, 400) }}>
              {first}
            </div>
          )}
        </div>
        {headerContacts.length > 0 || model.place ? (
          <div className="cv-c-contacts">
            {headerContacts.map((c) => (
              <span key={c.key}>
                {HEADER_ICON[c.kind]}
                {c.value}
              </span>
            ))}
            {model.place ? (
              <span>
                <MapPin aria-hidden />
                {model.place}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="cv-c-grid" data-side={hasSide ? "on" : "off"}>
        <div className="cv-c-main cv-fit">
          {model.desiredRole ? <div className="cv-c-role" {...th(model.desiredRole)}>
              {model.desiredRole}
            </div> : null}
          {model.bio ? <div className="cv-c-bio">{model.bio}</div> : null}
          {main.map((section) => (
            <section key={section.key}>
              <div className="cv-c-h" {...th(section.title)}>
                <span>{section.title}</span>
                <span className="x" aria-hidden>
                  +
                </span>
              </div>
              {section.entries.map((e, i) => (
                <div key={`${e.title}-${i}`} className="cv-entry">
                  <div className="cv-c-row">
                    <b className="cv-entry-title">
                      <EntryTitle entry={e} />
                    </b>
                    {e.period ? <span>{e.period}</span> : null}
                  </div>
                  <SubLines lines={e.lines} />
                  <Bullets items={e.bullets} />
                </div>
              ))}
            </section>
          ))}
        </div>
        {hasSide ? (
          <div className="cv-c-side cv-fit">
            <Photo model={model} initials={initials} />
            {links.length > 0 || model.qrTarget ? (
              <>
                <div
                  className="cv-c-h"
                  style={model.showPhoto ? undefined : { marginTop: 0 }}
                  {...th(model.labels.blocks.links)}
                >
                  <span>{model.labels.blocks.links}</span>
                </div>
                {links.map((c) => (
                  <ContactLine key={c.key} item={c} />
                ))}
                {model.qrTarget ? <Qr value={model.qrTarget} className="cv-c-qr" /> : null}
              </>
            ) : null}
            {sideLists.map((b) =>
              b ? (
                <section key={b.title}>
                  <div className="cv-c-h" {...th(b.title)}>
                    <span>{b.title}</span>
                  </div>
                  {b.body}
                </section>
              ) : null,
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function CvTemplateBody({ model, initials }: TemplateProps) {
  if (model.template === "index") return <TemplateIndex model={model} initials={initials} />;
  if (model.template === "grid") return <TemplateGrid model={model} initials={initials} />;
  return <TemplateEditorial model={model} initials={initials} />;
}
