import { Link } from "react-router-dom";
import type { Artist } from "../lib/catalog";
import Artwork from "./Artwork";
export default function ArtistCard({
  artist,
  index = 0,
}: {
  artist: Artist;
  index?: number;
}) {
  return (
    <article className="catalog-card artist-card">
      <Link className="card-image" to={`/artists/${artist.id}`}>
        <Artwork src={artist.avatarUrl} title={artist.name} />
        <span className="image-tag">
          ARTIST / {String(index + 1).padStart(2, "0")}
        </span>
      </Link>
      <div className="card-body">
        <Link to={`/artists/${artist.id}`} className="card-title">
          {artist.name}
          <span aria-hidden="true">↗</span>
        </Link>
        <p>{artist.bio || "Участник Raw Crownz. Треки и релизы — в профиле."}</p>
      </div>
    </article>
  );
}
