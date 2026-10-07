import { Link } from "react-router-dom";
import Crown from "../components/Crown";
import PageHeading from "../components/PageHeading";

export default function AboutPage() {
  return (
    <div className="page-container">
      <PageHeading kicker="04 / RAW CROWNZ" title="About us" description="" />
      <section className="about-spread" aria-label="О Raw Crownz">
        <div className="about-origin">
          <div className="about-origin-top meta">
            <span>52° N / 104° E</span>
            <span> ЗВУК</span>
          </div>
          <div className="about-origin-type">
            <span className="about-origin-echo" aria-hidden="true">
              RAW
              <br />
              CROWNZ
            </span>
            <span className="display">
              RAW
              <br />
              CROWNZ
            </span>
            <Crown variant={1} />
          </div>
          <div className="about-origin-bottom">
            <span>
              From
              <br />
              <em>Siberia.</em>
            </span>
            <span className="meta">
              BEATS / BARS / MIXES
              <br />
              LISTEN ↗
            </span>
          </div>
        </div>
        <div className="about-manifesto">
          <span className="meta accent">01 / КТО</span>
          <h2>
            Люди, которые делают звук.
            <br />
            <em>HOPE YOU FIND SOMETHIN’ YOU LIKE.</em>
          </h2>
          <p>
            Представляем независимое объединение артистов в разныx жанрах, здесь
            вы можете послушать биты, рэп и миксы, которые мы сделали.
          </p>
          {/* <div className="about-note">
            <span className="meta">NO TALKIN’.</span>
            <span>JUST PRESS PLAY. LISTEN UP.</span>
            <span aria-hidden="true">↙</span>
          </div> */}
        </div>
        <div className="about-statement" aria-label="Биты, рэп, миксы">
          <span>BEATS.</span>
          <span>BARS.</span>
          <span>MIXES.</span>
        </div>
        <div className="about-archive">
          <span className="meta accent">02 / МЕСТО ДЛЯ МУЗЫКИ</span>
          <h2>
            Придумали.
            <br />
            <span>Сделали.</span>
            <br />
            <em>Оставили здесь.</em>
          </h2>
          <p>
            Все бесплатно и в открытом доступе. Слушай, делись - будем рады.
          </p>
          <Link className="button button-outline" to="/beats">
            Послушать ↗
          </Link>
        </div>
        <Link className="about-crew-link" to="/artists">
          <span className="meta">03 / ЗНАКОМИМСЯ</span>
          <span className="display">
            MEET
            <br />
            THE CREW
          </span>
          <span className="about-crew-arrow" aria-hidden="true">
            ↗
          </span>
          <span className="meta">Те, кто все это делал</span>
        </Link>
      </section>
    </div>
  );
}
