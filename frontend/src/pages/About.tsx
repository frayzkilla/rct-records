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
      <section className="about-spread" aria-label="О Raw Crownz">
        <div className="about-origin">
          <div className="about-origin-top meta"><span>52° N / 104° E</span><span>ВЫХОД НА ЗВУК</span></div>
          <div className="about-origin-type">
            <span className="about-origin-echo" aria-hidden="true">RAW<br />CROWNZ</span>
            <span className="display">RAW<br />CROWNZ</span>
            <Crown variant={1} />
          </div>
          <div className="about-origin-bottom"><span>From<br /><em>Siberia.</em></span><span className="meta">BEATS / BARS / MIXES<br />BRING HEADPHONES ↗</span></div>
        </div>
        <div className="about-manifesto">
          <span className="meta accent">01 / БЛИЖЕ ДРУГ К ДРУГУ</span>
          <h2>Свои люди.<br /><em>Разный звук.</em></h2>
          <p>Мы — Raw Crownz, компания парней из Сибири. Кто-то делает биты. Кто-то берёт микрофон. Кто-то записывает диджейские миксы.</p>
          <p>У каждого свои вкусы. Обмениваемся идеями, помогаем с записями и делаем музыку, которую хочется слушать самим.</p>
          <div className="about-note"><span className="meta">БЕЗ ЛИШНИХ СЛОВ</span><span>Просто включи.</span><span aria-hidden="true">↙</span></div>
        </div>
        <div className="about-statement" aria-label="Биты, рэп, миксы">
          <span>BEATS.</span><span>BARS.</span><span>MIXES.</span>
        </div>
        <div className="about-archive">
          <span className="meta accent">02 / МЕСТО ДЛЯ МУЗЫКИ</span>
          <h2>Сделали.<br /><span>Записали.</span><br /><em>Оставили здесь.</em></h2>
          <p>Records — это место, куда складываем готовые треки и миксы. Можно включить альбом целиком или выбрать что-нибудь наугад. Если понравилось — загляни в профиль автора, там есть ещё.</p>
          <Link className="button button-outline" to="/beats">Открыть каталог ↗</Link>
        </div>
        <Link className="about-crew-link" to="/artists">
          <span className="meta">03 / ЗНАКОМИМСЯ</span>
          <span className="display">MEET<br />THE CREW</span>
          <span className="about-crew-arrow" aria-hidden="true">↗</span>
          <span className="meta">Те, кто стоит за звуком</span>
        </Link>
      </section>
    </div>
  );
}
