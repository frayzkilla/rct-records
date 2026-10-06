import { Link } from "react-router-dom";
import Crown from "../components/Crown";
import PageHeading from "../components/PageHeading";
export default function AboutPage() {
  return (
    <div className="page-container">
      <PageHeading
        kicker="04 / NO FILTER"
        title="Делаем по-своему"
        description="Raw Crownz Records — независимый звук с характером."
      />
      <section className="about-grid">
        <div className="about-poster">
          <Crown variant={1} />
          <span className="display">STAY RAW.</span>
          <span className="meta">NO FILTER. NO LIMITS.</span>
        </div>
        <div className="about-copy">
          <h2>
            У каждого звука
            <br />
            есть своя корона.
          </h2>
          <p>
            RAW CROWNZ — творческое объединение, где рождаются идеи и создаётся
            стиль. Records — наше музыкальное направление.
          </p>
          <p>
            Мы растём, экспериментируем и делаем музыку, в которой слышны город,
            мечты и амбиции. Верим в искренность, звук с характером и артистов,
            которые не боятся быть собой.
          </p>
          <p>Мы — те, кто делает по-своему.</p>
          <Link className="button" to="/artists">
            Познакомиться с артистами ↗
          </Link>
        </div>
      </section>
    </div>
  );
}
