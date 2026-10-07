import { Heart } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { type Catalog, type Track, useCatalog } from "../lib/catalog";
import { useTrackLikesStore } from "../store/TrackLikesStore";

export default function LikeButton({ track }: { track: Track }) {
  const client = useQueryClient();
  const catalog = useCatalog();
  const liked = useTrackLikesStore((state) => !!state.liked[track.id]);
  const pending = useTrackLikesStore((state) => !!state.pending[track.id]);
  const error = useTrackLikesStore((state) => state.errors[track.id]);
  const toggle = useTrackLikesStore((state) => state.toggle);
  const count = catalog.data?.tracks.find((item) => item.id === track.id)?.likes ?? track.likes ?? 0;

  return (
    <span className="like-control">
      <button
        type="button"
        className={`like-button ${liked ? "is-liked" : ""}`}
        aria-label={`${liked ? "Убрать лайк" : "Лайк"}: ${track.title}`}
        aria-pressed={liked}
        aria-busy={pending}
        disabled={pending}
        onClick={async () => {
          await client.cancelQueries({ queryKey: ["catalog"] });
          const result = await toggle(track.id);
          if (!result) return;
          client.setQueryData<Catalog>(["catalog"], (data) => data && ({
            ...data,
            tracks: data.tracks.map((item) => item.id === track.id ? { ...item, likes: result.likes } : item),
          }));
        }}
      >
        <Heart size={18} fill={liked ? "currentColor" : "none"} aria-hidden="true" />
        <span className="like-count">{count}</span>
      </button>
      {error && <span className="like-error" role="alert">{error}</span>}
    </span>
  );
}
