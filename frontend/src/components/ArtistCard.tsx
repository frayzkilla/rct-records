import DirectionalArrow from "./DirectionalArrow";
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
    <article className={`crew-card crew-card-${index % 5}`}>
      <div className="crew-card-top meta">
        <span>RC / {String(index + 1).padStart(2, "0")}</span>
        <span>THE PEOPLE BEHIND THE SOUND</span>
      </div>
      <Link className="crew-portrait" to={`/artists/${artist.id}`} aria-label={`Профиль: ${artist.name}`}>
        <Artwork src={artist.avatarUrl} title={artist.name} />
        <span className="crew-portrait-label meta" aria-hidden="true">RAW CROWNZ / SIBERIA</span>
      </Link>
      <div className="crew-copy">
        <h2><Link to={`/artists/${artist.id}`}>{artist.name}</Link></h2>
        <p>{artist.bio || "Участник Raw Crownz. Треки и релизы — в профиле."}</p>
        <Link className="crew-profile" to={`/artists/${artist.id}`}>
          <span className="meta">Треки и релизы</span><span aria-hidden="true"><DirectionalArrow /></span>
        </Link>
      </div>
    </article>
  );
}
