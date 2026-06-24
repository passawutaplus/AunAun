export interface NewsFeedSource {
  category: string;
  emoji: string;
  source: string;
  feedUrl: string;
}

/** Curated RSS/Atom feeds for daily trends — grouped by design freelancer topics. */
export const NEWS_FEED_SOURCES: NewsFeedSource[] = [
  {
    category: "สีเทรนด์",
    emoji: "🎨",
    source: "Design Milk",
    feedUrl: "https://design-milk.com/feed/",
  },
  {
    category: "Branding",
    emoji: "🏷️",
    source: "It's Nice That",
    feedUrl: "https://www.itsnicethat.com/feed",
  },
  {
    category: "Typography",
    emoji: "✍️",
    source: "CSS-Tricks",
    feedUrl: "https://css-tricks.com/feed/",
  },
  {
    category: "AI Tools",
    emoji: "🤖",
    source: "Google AI",
    feedUrl: "https://blog.google/technology/ai/rss/",
  },
  {
    category: "Design Style",
    emoji: "🟧",
    source: "Smashing Magazine",
    feedUrl: "https://www.smashingmagazine.com/feed/",
  },
  {
    category: "Design Style",
    emoji: "🟧",
    source: "Awwwards",
    feedUrl: "https://www.awwwards.com/blog/feed.atom",
  },
  {
    category: "Motion",
    emoji: "✨",
    source: "Codrops",
    feedUrl: "https://tympanus.net/codrops/feed/",
  },
  {
    category: "Workflow",
    emoji: "🚀",
    source: "Figma Blog",
    feedUrl: "https://www.figma.com/blog/feed/atom.xml",
  },
  {
    category: "Workflow",
    emoji: "🚀",
    source: "Webflow Blog",
    feedUrl: "https://webflow.com/blog/rss.xml",
  },
];
