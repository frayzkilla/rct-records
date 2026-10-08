import { useEffect, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  ArrowDownLeft,
  ArrowUpRight,
  AudioLines,
  ChartNoAxesCombined,
  ChevronRight,
  Clock3,
  Cpu,
  Database,
  Eye,
  HardDrive,
  Image,
  ListMusic,
  RefreshCw,
  Server,
  ShieldCheck,
  Users,
  Wifi,
} from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import {
  bytes,
  dateTime,
  number,
  type Period,
  type ServerStats,
  type SiteStats,
} from "../lib/stats";
import StatsChart from "../components/StatsChart";
import Artwork from "../components/Artwork";
import "./Stats.css";

const periods: { value: Period; label: string }[] = [
  { value: "24h", label: "24 часа" },
  { value: "7d", label: "7 дней" },
  { value: "30d", label: "30 дней" },
  { value: "90d", label: "90 дней" },
  { value: "365d", label: "Год" },
];
const colors = ["#ff683b", "#87b7c1", "#c6b3e5", "#a2c489", "#dfbb78"];
const actions: Record<string, string> = {
  login: "Вход",
  logout: "Выход",
  create: "Создание",
  update: "Изменение",
  delete: "Удаление",
  artist: "артиста",
  album: "альбома",
  track: "трека",
  admin: "аккаунта",
};
const actionLabel = (value: string) =>
  value
    .split(":")
    .map((part) => actions[part] ?? part)
    .join(" ");

function Panel({
  title,
  eyebrow,
  icon,
  children,
  className = "",
  extra,
}: {
  title: string;
  eyebrow?: string;
  icon: ReactNode;
  children: ReactNode;
  className?: string;
  extra?: ReactNode;
}) {
  return (
    <article className={`stats-panel ${className}`}>
      <div className="stats-panel-heading">
        <div>
          <span className="stats-panel-eyebrow">
            {icon}
            {eyebrow}
          </span>
          <h3>{title}</h3>
        </div>
        {extra}
      </div>
      {children}
    </article>
  );
}

function Gauge({
  value,
  label,
  detail,
  icon,
  foot,
}: {
  value: number | null | undefined;
  label: string;
  detail: string;
  icon: ReactNode;
  foot?: string;
}) {
  return (
    <article className="stats-gauge">
      <div className="stats-gauge-top">
        <span>{label}</span>
        {icon}
      </div>
      <div className="stats-gauge-value">
        {value == null ? "—" : number(value)}
        <span>{value != null && "%"}</span>
      </div>
      <div
        className="stats-meter"
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value ?? undefined}
      >
        <span style={{ width: `${value ?? 0}%` }} />
      </div>
      <p>{detail}</p>
      {foot && <small>{foot}</small>}
    </article>
  );
}

function Failure({ message, retry }: { message: string; retry: () => void }) {
  return (
    <div className="stats-failure" role="alert">
      <Activity size={24} />
      <p>{message}</p>
      <button type="button" className="stats-button" onClick={retry}>
        <RefreshCw size={15} />
        Повторить
      </button>
    </div>
  );
}

function Loading({ label }: { label: string }) {
  return (
    <div className="stats-loading" role="status" aria-label={label}>
      {[0, 1, 2, 3].map((item) => (
        <div key={item} />
      ))}
    </div>
  );
}

function ServerBlock({ data }: { data: ServerStats }) {
  const uptime =
    data.uptime == null
      ? "—"
      : `${Math.floor(data.uptime / 86400)} д ${Math.floor((data.uptime % 86400) / 3600)} ч`;
  const mediaTotal = data.storage.audio.bytes + data.storage.images.bytes;
  const audioShare = mediaTotal
    ? (data.storage.audio.bytes / mediaTotal) * 100
    : 0;
  return (
    <>
      <div className="stats-gauges">
        <Gauge
          label="Процессор"
          value={data.cpu.percent}
          detail={`${data.cpu.count} логических ядер`}
          icon={<Cpu size={18} />}
          foot={
            data.cpu.load
              ? `Load ${data.cpu.load.map(number).join(" / ")}`
              : "Load average недоступен"
          }
        />
        <Gauge
          label="Оперативная память"
          value={data.memory?.percent}
          detail={`${bytes(data.memory?.used)} / ${bytes(data.memory?.total)}`}
          icon={<Database size={18} />}
          foot={`Доступно ${bytes(data.memory?.available)}`}
        />
        <Gauge
          label="Системный диск"
          value={data.disk?.percent}
          detail={`${bytes(data.disk?.used)} / ${bytes(data.disk?.total)}`}
          icon={<HardDrive size={18} />}
          foot={`Свободно ${bytes(data.disk?.free)}`}
        />
        <Gauge
          label="Swap"
          value={data.swap?.percent}
          detail={
            data.swap?.total === 0
              ? "Не используется"
              : `${bytes(data.swap?.used)} / ${bytes(data.swap?.total)}`
          }
          icon={<Activity size={18} />}
          foot={`Uptime ${uptime}`}
        />
      </div>
      <div className="stats-server-grid">
        <Panel
          title="Хранилище проекта"
          eyebrow="MEDIA STORAGE"
          icon={<HardDrive size={14} />}
          className="stats-storage"
          extra={
            <span className="stats-tag">
              {number(data.catalogTracks)} треков в каталоге
            </span>
          }
        >
          <div className="stats-storage-total">
            {bytes(mediaTotal)}
            <span>аудио и изображения</span>
          </div>
          <div
            className="stats-storage-bar"
            aria-label={`Аудио ${number(audioShare)}%, изображения ${number(mediaTotal ? 100 - audioShare : 0)}%`}
          >
            <span style={{ width: `${audioShare}%` }} />
            <span style={{ width: `${mediaTotal ? 100 - audioShare : 0}%` }} />
          </div>
          <div className="stats-media-items">
            <div>
              <span className="stats-media-icon">
                <AudioLines size={20} />
              </span>
              <div>
                <strong>Аудиозаписи</strong>
                <small>{number(data.storage.audio.count)} файлов</small>
              </div>
              <b>{bytes(data.storage.audio.bytes)}</b>
            </div>
            <div>
              <span className="stats-media-icon stats-cool">
                <Image size={20} />
              </span>
              <div>
                <strong>Изображения</strong>
                <small>{number(data.storage.images.count)} файлов</small>
              </div>
              <b>{bytes(data.storage.images.bytes)}</b>
            </div>
          </div>
          <p className="stats-note">
            Фактические файлы проекта, включая сохранённые после удаления из
            каталога.
            {data.storage.incomplete &&
              " Часть файлов недоступна для подсчёта."}
          </p>
        </Panel>
        <Panel
          title="Потоки данных"
          eyebrow="LIVE SNAPSHOT"
          icon={<Wifi size={14} />}
        >
          <div className="stats-transfer">
            <span>
              <ArrowDownLeft size={17} />
              Входящий трафик
            </span>
            <strong>
              {bytes(data.network?.received)}
              <small>/с</small>
            </strong>
          </div>
          <div className="stats-transfer">
            <span>
              <ArrowUpRight size={17} />
              Исходящий трафик
            </span>
            <strong>
              {bytes(data.network?.sent)}
              <small>/с</small>
            </strong>
          </div>
          <div className="stats-transfer">
            <span>
              <HardDrive size={17} />
              Чтение диска
            </span>
            <strong>
              {bytes(data.diskIo?.read)}
              <small>/с</small>
            </strong>
          </div>
          <div className="stats-transfer">
            <span>
              <HardDrive size={17} />
              Запись на диск
            </span>
            <strong>
              {bytes(data.diskIo?.write)}
              <small>/с</small>
            </strong>
          </div>
          <p className="stats-note">
            {data.network?.interfaces.join(" · ") ||
              "Сетевые интерфейсы недоступны"}
          </p>
        </Panel>
        <Panel
          title="Нагрузка по ядрам"
          eyebrow="CPU CORES"
          icon={<Cpu size={14} />}
        >
          <div className="stats-cores">
            {data.cpu.cores.map((value, index) => (
              <div key={index}>
                <span>CPU {index + 1}</span>
                <div className="stats-meter">
                  <span style={{ width: `${value}%` }} />
                </div>
                <b>{number(value)}%</b>
              </div>
            ))}
          </div>
          {!data.cpu.cores.length && (
            <p className="stats-note">Показатель недоступен</p>
          )}
        </Panel>
      </div>
    </>
  );
}

function SiteBlock({ data }: { data: SiteStats }) {
  const dates = data.series.map((point) => point.at);
  const cards = [
    {
      label: "Визиты",
      value: data.summary.visits,
      icon: <Users size={19} />,
      note: "Сессии · пауза до 30 минут",
    },
    {
      label: "Просмотры страниц",
      value: data.summary.views,
      icon: <Eye size={19} />,
      note: "Открытия и переходы",
    },
    {
      label: "Уникальные браузеры",
      value: data.summary.visitors,
      icon: <ChartNoAxesCombined size={19} />,
      note: "За выбранный период",
    },
    {
      label: "Прослушивания",
      value: data.summary.plays,
      icon: <AudioLines size={19} />,
      note: "Фактические старты аудио",
    },
  ];
  return (
    <>
      <div className="stats-kpis">
        {cards.map((card) => (
          <article key={card.label}>
            <div>
              <span>{card.label}</span>
              {card.icon}
            </div>
            <strong>{number(card.value)}</strong>
            <small>{card.note}</small>
          </article>
        ))}
      </div>
      <div className="stats-charts-grid">
        <Panel
          title="Посещаемость"
          eyebrow="AUDIENCE"
          icon={<Users size={14} />}
        >
          <StatsChart
            title="Посещаемость"
            dates={dates}
            startedAt={data.startedAt}
            lines={[
              {
                label: "Визиты",
                color: colors[0],
                values: data.series.map((point) => point.visits),
              },
              {
                label: "Просмотры",
                color: colors[1],
                values: data.series.map((point) => point.views),
              },
              {
                label: "Браузеры",
                color: colors[2],
                values: data.series.map((point) => point.visitors),
              },
            ]}
          />
        </Panel>
        <Panel
          title="Прослушивания"
          eyebrow="LISTENING"
          icon={<AudioLines size={14} />}
          extra={
            <span className="stats-tag">
              {number(data.summary.plays)} стартов
            </span>
          }
        >
          <StatsChart
            title="Прослушивания"
            dates={dates}
            startedAt={data.startedAt}
            lines={[
              {
                label: "Прослушивания",
                color: colors[0],
                values: data.series.map((point) => point.plays),
              },
            ]}
          />
        </Panel>
      </div>
      <div className="stats-bottom-grid">
        <Panel
          title="ТОП-3 треков"
          eyebrow="TOP 03"
          icon={<ListMusic size={14} />}
        >
          {data.topTracks.length ? (
            <ol className="stats-top-tracks">
              {data.topTracks.map((track, index) => (
                <li key={track.id}>
                  <span className="stats-rank">0{index + 1}</span>
                  <Artwork src={track.coverUrl} title={track.title} />
                  <div>
                    {track.deleted ? (
                      <strong>{track.title}</strong>
                    ) : (
                      <Link to={`/beats/${track.id}`}>{track.title}</Link>
                    )}
                    <small>
                      {track.artist || "Без артиста"}
                      {track.deleted && " · удалён"}
                    </small>
                  </div>
                  <b>
                    {number(track.plays)}
                    <small>стартов</small>
                  </b>
                </li>
              ))}
            </ol>
          ) : (
            <div className="stats-empty">
              <AudioLines size={28} />
              <p>Пока тихо</p>
              <span>Первые прослушивания появятся здесь.</span>
            </div>
          )}
        </Panel>
        <Panel
          title="Активность команды"
          eyebrow="ADMIN ACTIVITY"
          icon={<ShieldCheck size={14} />}
          extra={
            <span className="stats-tag">
              {number(data.summary.adminActions)} действий
            </span>
          }
        >
          {data.admins.length ? (
            <>
              <StatsChart
                title="Активность администраторов"
                dates={dates}
                startedAt={data.startedAt}
                lines={
                  data.admins.length <= 5
                    ? data.admins.map((admin, index) => ({
                        label: admin.username,
                        color: colors[index % colors.length],
                        values: data.series.map(
                          (point) => point.admins[String(admin.id)] ?? 0,
                        ),
                      }))
                    : [
                        ...data.admins.slice(0, 4).map((admin, index) => ({
                          label: admin.username,
                          color: colors[index],
                          values: data.series.map(
                            (point) => point.admins[String(admin.id)] ?? 0,
                          ),
                        })),
                        {
                          label: "Остальные",
                          color: colors[4],
                          values: data.series.map((point) =>
                            data.admins
                              .slice(4)
                              .reduce(
                                (sum, admin) =>
                                  sum + (point.admins[String(admin.id)] ?? 0),
                                0,
                              ),
                          ),
                        },
                      ]
                }
              />
              <div className="stats-admin-table">
                <table>
                  <thead>
                    <tr>
                      <th>Администратор</th>
                      <th>Входы</th>
                      <th>Изменения</th>
                      <th>Последнее действие</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.admins.map((admin) => (
                      <tr key={admin.id}>
                        <td>
                          <span className="stats-admin-dot" />
                          {admin.username}
                          <small>{number(admin.actions)} действий</small>
                        </td>
                        <td>{number(admin.logins)}</td>
                        <td>{number(admin.changes)}</td>
                        <td>
                          {actionLabel(admin.lastAction)}
                          <small>{dateTime(admin.lastAt)}</small>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="stats-empty">
              <ShieldCheck size={28} />
              <p>Пока нет действий</p>
              <span>Входы и изменения появятся после работы в админке.</span>
            </div>
          )}
        </Panel>
      </div>
      <p className="stats-footnote">
        <Clock3 size={14} />
        Сбор аналитики с {dateTime(data.startedAt)} · Время Иркутска, UTC+8
      </p>
    </>
  );
}

export default function Stats() {
  const [period, setPeriod] = useState<Period>("7d");
  const server = useQuery({
    queryKey: ["stats-server"],
    queryFn: () => api<ServerStats>("/stats/server"),
    retry: false,
    staleTime: Infinity,
    gcTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
  const site = useQuery({
    queryKey: ["stats-site", period],
    queryFn: () => api<SiteStats>(`/stats/site?period=${period}`),
    retry: false,
    refetchInterval: 60000,
    refetchIntervalInBackground: false,
  });
  useEffect(() => {
    const previousTitle = document.title;
    document.title = "Статистика — RAW CROWNZ";
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex, nofollow";
    document.head.append(meta);
    return () => {
      document.title = previousTitle;
      meta.remove();
    };
  }, []);
  return (
    <div className="stats-page">
      <div className="stats-breadcrumb">
        <Link to="/">RAW CROWNZ</Link>
        <ChevronRight size={12} />
        <span>Статистика</span>
      </div>
      <header className="stats-hero">
        <div>
          <span className="stats-overline">
            <span />
            RAW CROWNZ / OBSERVATORY
          </span>
        </div>
        <div className="stats-hero-mark" aria-hidden="true">
          <Activity size={62} strokeWidth={1} />
          <span>SYSTEM / INSIGHT</span>
        </div>
      </header>
      <section className="stats-section" aria-labelledby="server-heading">
        <div className="stats-section-heading">
          <div>
            <span className="stats-section-number">01</span>
            <div>
              <h2 id="server-heading">
                <Server size={20} />
                Инфраструктура
              </h2>
              <p>{server.data && ` · Обновлено ${dateTime(server.data.at)}`}</p>
            </div>
          </div>
          <button
            type="button"
            className="stats-button"
            disabled={server.isFetching}
            onClick={() => void server.refetch()}
          >
            <RefreshCw
              size={15}
              className={server.isFetching ? "stats-spin" : ""}
            />
            {server.isFetching ? "Измеряем…" : "Обновить"}
          </button>
        </div>
        {server.isPending ? (
          <Loading label="Измеряем ресурсы сервера" />
        ) : server.isError ? (
          <Failure
            message={server.error.message}
            retry={() => void server.refetch()}
          />
        ) : (
          server.data && <ServerBlock data={server.data} />
        )}
      </section>
      <section className="stats-section" aria-labelledby="site-heading">
        <div className="stats-section-heading">
          <div>
            <span className="stats-section-number">02</span>
            <div>
              <h2 id="site-heading">
                <ChartNoAxesCombined size={20} />
                Сайт
              </h2>
              <p>
                Аудитория и активность
                {site.data && ` · Обновлено ${dateTime(site.data.updatedAt)}`}
              </p>
            </div>
          </div>
          <div
            className="stats-periods"
            role="group"
            aria-label="Период аналитики"
          >
            {periods.map((item) => (
              <button
                type="button"
                key={item.value}
                aria-pressed={period === item.value}
                onClick={() => setPeriod(item.value)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
        {site.isPending ? (
          <Loading label="Загружаем аналитику" />
        ) : site.isError ? (
          <Failure
            message={site.error.message}
            retry={() => void site.refetch()}
          />
        ) : (
          site.data && <SiteBlock data={site.data} />
        )}
      </section>
      <footer className="stats-footer">
        <span>RAW CROWNZ RECORDS</span>
        <span>STRAIGHT OUTTA SIBERIA / 52° N · 104° E</span>
      </footer>
    </div>
  );
}
