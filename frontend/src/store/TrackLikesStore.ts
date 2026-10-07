import { create } from "zustand";
import { api, jsonRequest } from "../lib/api";

const storageKey = "raw-crownz-likes";
type LikeResult = { likes: number; liked: boolean };
type SavedLikes = { visitorId: string; liked: Record<number, boolean> };

function createVisitorId() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function readLikes(): SavedLikes {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) ?? "null");
    if (saved && typeof saved.visitorId === "string" &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(saved.visitorId)) {
      return {
        visitorId: saved.visitorId,
        liked: Object.fromEntries(Object.entries(saved.liked ?? {}).filter(
          ([id, value]) => /^\d+$/.test(id) && value === true,
        ).map(([id]) => [id, true])),
      };
    }
  } catch {
    return { visitorId: createVisitorId(), liked: {} };
  }
  return { visitorId: createVisitorId(), liked: {} };
}

function saveLikes(value: SavedLikes) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(value));
  } catch {
    return;
  }
}

type LikesState = SavedLikes & {
  pending: Record<number, boolean>;
  errors: Record<number, string>;
  toggle: (id: number) => Promise<LikeResult | null>;
};

export const useTrackLikesStore = create<LikesState>((set, get) => ({
  ...readLikes(),
  pending: {},
  errors: {},
  toggle: async (id) => {
    const state = get();
    if (state.pending[id]) return null;
    saveLikes({ visitorId: state.visitorId, liked: state.liked });
    set({
      pending: { ...state.pending, [id]: true },
      errors: { ...state.errors, [id]: "" },
    });
    try {
      const result = await api<LikeResult>(`/beats/${id}/like`, jsonRequest("PUT", {
        visitorId: state.visitorId,
        liked: !state.liked[id],
      }));
      set((current) => {
        const liked = { ...current.liked };
        if (result.liked) liked[id] = true;
        else delete liked[id];
        saveLikes({ visitorId: current.visitorId, liked });
        return { liked, pending: { ...current.pending, [id]: false } };
      });
      return result;
    } catch {
      set((current) => ({
        pending: { ...current.pending, [id]: false },
        errors: { ...current.errors, [id]: "Не удалось сохранить лайк. Попробуй ещё раз." },
      }));
      return null;
    }
  },
}));
