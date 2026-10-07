import DirectionalArrow from "./DirectionalArrow";
import { Link } from "react-router-dom";
import type { Album } from "../lib/catalog";
import Artwork from "./Artwork";
export default function AlbumCard({ album }: { album: Album }) {
  return (
    <article className="catalog-card">
      <Link className="card-image" to={`/albums/${album.id}`}>
        <Artwork src={album.coverUrl} title={album.title} />
        <span className="image-tag">RELEASE / {album.year}</span>
      </Link>
      <div className="card-body">
        <Link to={`/albums/${album.id}`} className="card-title">
          {album.title}
          <span aria-hidden="true"><DirectionalArrow /></span>
        </Link>
        <Link className="artist-link" to={`/artists/${album.artistId}`}>
          {album.artist}
        </Link>
        <div className="card-bottom">
          <span>{album.tracksQuantity} треков</span>
          <span>{album.year}</span>
        </div>
      </div>
    </article>
  );
}
