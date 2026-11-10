/**
 * Page tour scripts (Brand Book voice: short English label, plain body in th / en / zh from lib/i18n/tour, no hype).
 * Targets are `data-tour` attributes on the page; optional steps drop out when their target is not on screen.
 */
import type { GuideTourStep } from "@/components/tour/GuideTour";
import { TOUR_CHAT, TOUR_HOME, TOUR_STUDIO } from "@/lib/i18n/tour";
import {
  ActionQueueScene,
  CollabPlanScene,
  CommandSearchScene,
  RequestStatusScene,
  SaveToCollectionScene,
  SwitchModeScene,
} from "@/components/tour/TourScenes";

export const HOME_TOUR: GuideTourStep[] = [
  {
    id: "welcome",
    title: "Welcome",
    body: TOUR_HOME.welcome,
  },
  {
    id: "mode",
    title: "Showcase or Creators",
    body: TOUR_HOME.mode,
    target: "home-mode",
    optional: true,
    scene: <SwitchModeScene />,
  },
  {
    id: "search",
    title: "Search",
    body: TOUR_HOME.search,
    target: "home-search",
    optional: true,
  },
  {
    id: "filters",
    title: "Filters",
    body: TOUR_HOME.filters,
    target: "home-toolbar",
    optional: true,
  },
  {
    id: "feed",
    title: "Save what you like",
    body: TOUR_HOME.feed,
    target: "home-feed",
    optional: true,
    scene: <SaveToCollectionScene />,
  },
  {
    id: "create",
    title: "Show your work",
    body: TOUR_HOME.create,
    target: "create",
    optional: true,
  },
  {
    id: "final",
    title: "You're set",
    body: TOUR_HOME.final,
  },
];

export const STUDIO_TOUR: GuideTourStep[] = [
  {
    id: "welcome",
    title: "My Studio",
    body: TOUR_STUDIO.welcome,
  },
  {
    id: "nav",
    title: "Menu",
    body: TOUR_STUDIO.nav,
    target: "studio-nav",
    optional: true,
  },
  {
    id: "search",
    title: "Search anything",
    body: TOUR_STUDIO.search,
    target: "studio-search",
    optional: true,
    scene: <CommandSearchScene />,
  },
  {
    id: "queue",
    title: "Today",
    body: TOUR_STUDIO.queue,
    target: "studio-queue",
    optional: true,
    scene: <ActionQueueScene />,
  },
  {
    id: "stats",
    title: "At a glance",
    body: TOUR_STUDIO.stats,
    target: "studio-stats",
    optional: true,
  },
  {
    id: "inbox",
    title: "Hire & Collab",
    body: TOUR_STUDIO.inbox,
    target: "studio-nav",
    optional: true,
    scene: <RequestStatusScene />,
  },
  {
    id: "final",
    title: "That's it",
    body: TOUR_STUDIO.final,
  },
];

export const CHAT_TOUR: GuideTourStep[] = [
  {
    id: "welcome",
    title: "Chat",
    body: TOUR_CHAT.welcome,
  },
  {
    id: "list",
    title: "Conversations",
    body: TOUR_CHAT.list,
    target: "chat-list",
    optional: true,
  },
  {
    id: "thread",
    title: "Cards in chat",
    body: TOUR_CHAT.thread,
    target: "chat-thread",
    optional: true,
  },
  {
    id: "plan",
    title: "Plan & Tasks",
    body: TOUR_CHAT.plan,
    target: "chat-side",
    optional: true,
    scene: <CollabPlanScene />,
  },
  {
    id: "composer",
    title: "Reply",
    body: TOUR_CHAT.composer,
    target: "chat-composer",
    optional: true,
  },
  {
    id: "final",
    title: "That's it",
    body: TOUR_CHAT.final,
  },
];
