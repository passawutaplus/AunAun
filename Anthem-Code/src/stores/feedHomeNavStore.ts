import { create } from "zustand";
import type { FeedFilter } from "@/data/projectTypes";

type FeedHomeNavState = {
  /** Feed page has mounted and registered bridge handlers. */
  active: boolean;
  search: string;
  searchPlaceholder: string;
  filterCount: number;
  feedMode: FeedFilter;
  onSearchChange: ((value: string) => void) | null;
  onFilterClick: (() => void) | null;
  onCreateClick: (() => void) | null;
  onFeedModeChange: ((mode: FeedFilter) => void) | null;
  showCreate: boolean;
  showFirstPostLabel: boolean;
  /** True once under-hero toolbar has reached the fixed nav. */
  scrolled: boolean;
  setScrolled: (scrolled: boolean) => void;
  register: (payload: {
    search: string;
    searchPlaceholder: string;
    filterCount: number;
    feedMode: FeedFilter;
    onSearchChange: (value: string) => void;
    onFilterClick?: () => void;
    onCreateClick: () => void;
    onFeedModeChange: (mode: FeedFilter) => void;
    showCreate: boolean;
    showFirstPostLabel: boolean;
  }) => void;
  patch: (
    partial: Partial<
      Pick<
        FeedHomeNavState,
        | "search"
        | "searchPlaceholder"
        | "filterCount"
        | "feedMode"
        | "showCreate"
        | "showFirstPostLabel"
      >
    >,
  ) => void;
  unregister: () => void;
};

export const useFeedHomeNavStore = create<FeedHomeNavState>((set) => ({
  active: false,
  search: "",
  searchPlaceholder: "ค้นหาผลงาน",
  filterCount: 0,
  feedMode: "Explore",
  onSearchChange: null,
  onFilterClick: null,
  onCreateClick: null,
  onFeedModeChange: null,
  showCreate: true,
  showFirstPostLabel: false,
  scrolled: false,
  setScrolled: (scrolled) => set({ scrolled }),
  register: (payload) =>
    set({
      active: true,
      search: payload.search,
      searchPlaceholder: payload.searchPlaceholder,
      filterCount: payload.filterCount,
      feedMode: payload.feedMode,
      onSearchChange: payload.onSearchChange,
      onFilterClick: payload.onFilterClick ?? null,
      onCreateClick: payload.onCreateClick,
      onFeedModeChange: payload.onFeedModeChange,
      showCreate: payload.showCreate,
      showFirstPostLabel: payload.showFirstPostLabel,
    }),
  patch: (partial) => set(partial),
  unregister: () =>
    set({
      active: false,
      search: "",
      feedMode: "Explore",
      onSearchChange: null,
      onFilterClick: null,
      onCreateClick: null,
      onFeedModeChange: null,
      scrolled: false,
    }),
}));
