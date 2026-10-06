import { Link } from "react-router-dom";
import Crown from "../components/Crown";
import PageHeading from "../components/PageHeading";
export default function AboutPage() {
  return (
    <div className="page-container">
      <PageHeading
        kicker="04 / RAW CROWNZ"
        title="Just us."
        description="Компания друзей из Сибири. Делаем музыку, которая нам нравится."
      />
      <section className="about-grid">
        <div className="about-poster">
          <Crown variant={1} />
          <span className="display">FROM SIBERIA</span>
          <span className="meta">52° N / 104° E — BRING HEADPHONES</span>
        </div>
        <div className="about-copy">
          <h2>
            Кто-то делает биты.
            <br />
            Кто-то берёт микрофон.
          </h2>
          <p>
            Мы — Raw Crownz, компания парней из Сибири. Делаем биты, читаем рэп,
            записываем диджейские миксы. У каждого свои вкусы, поэтому музыка
            получается разная.
          </p>
          <p>
            Знакомы друг с другом, обмениваемся идеями и помогаем с записями.
            Records — это место, куда складываем готовые треки и миксы.
          </p>
          <p>
            Можно включить альбом целиком или выбрать что-нибудь наугад. Если
            понравилось — загляни в профиль автора, там есть ещё.
          </p>
          <Link className="button" to="/artists">
            Meet the crew ↗
          </Link>
        </div>
      </section>
    </div>
  );
}
