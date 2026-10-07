import { useEffect, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { api, ApiError, jsonRequest } from "../lib/api";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowUpRight, LogOut, Pencil, Plus, Trash2, X } from "lucide-react";

type Account = {
  id: number;
  username: string;
  role: "god" | "artist";
  artistId: number | null;
};
type Artist = { id: number; name: string; bio: string; avatarUrl: string };
type Album = {
  id: number;
  title: string;
  artistId: number;
  releaseDate: string;
  coverUrl: string;
  artist: string;
};
type Track = {
  id: number;
  title: string;
  artistId: number;
  albumId: number | null;
  audioUrl: string;
  coverUrl: string;
  producer: string;
};
type Catalog = { artists: Artist[]; albums: Album[]; beats: Track[] };
type Tab = "beats" | "albums" | "artists" | "admins";
type Item = Artist | Album | Track | Account;
const labels: Record<Tab, string> = {
  beats: "Треки",
  albums: "Альбомы",
  artists: "Артисты",
  admins: "Администраторы",
};
const inputClass = "admin-input";
const buttonClass = "button admin-button";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="admin-field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function Editor({
  tab,
  item,
  catalog,
  account,
  busy,
  onSave,
  onCancel,
}: {
  tab: Tab;
  item: Item | null;
  catalog: Catalog;
  account: Account;
  busy: boolean;
  onSave: (event: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
}) {
  const track = item && "audioUrl" in item ? item : null;
  const album = item && "releaseDate" in item ? item : null;
  const artist = item && "bio" in item ? item : null;
  const admin = item && "username" in item ? item : null;
  const [artistId, setArtistId] = useState(
    String(
      track?.artistId ??
        album?.artistId ??
        admin?.artistId ??
        account.artistId ??
        catalog.artists[0]?.id ??
        "",
    ),
  );
  const isGodAccount = admin?.role === "god";
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    formRef.current?.scrollIntoView({ block: "start" });
    formRef.current
      ?.querySelector<HTMLInputElement>(
        "input:not([type='hidden']):not(:disabled)",
      )
      ?.focus({ preventScroll: true });
  }, []);
  return (
    <form ref={formRef} onSubmit={onSave} className="admin-editor">
      <div className="admin-editor-heading">
        <div>
          <span className="meta accent">
            {item ? "EDIT / " : "NEW / "}
            {labels[tab]}
          </span>
          <h2>{item ? "Редактирование" : "Новая запись"}</h2>
        </div>
        <button
          type="button"
          className="icon-button"
          aria-label="Закрыть редактор"
          onClick={onCancel}
          disabled={busy}
        >
          <X size={20} />
        </button>
      </div>
      <fieldset disabled={busy} className="admin-fields">
        {tab === "admins" ? (
          <>
            <Field label="Логин">
              <input
                className={inputClass}
                name="username"
                defaultValue={admin?.username ?? ""}
                required
                maxLength={100}
                disabled={isGodAccount}
                autoComplete="off"
              />
            </Field>
            <Field
              label={
                admin
                  ? "Новый пароль (оставьте пустым, чтобы сохранить текущий)"
                  : "Пароль"
              }
            >
              <input
                className={inputClass}
                type="password"
                name="password"
                required={!admin}
                minLength={8}
                maxLength={128}
                autoComplete="new-password"
              />
            </Field>
          </>
        ) : tab === "artists" ? (
          <>
            <Field label="Имя артиста">
              <input
                className={inputClass}
                name="name"
                defaultValue={artist?.name ?? ""}
                required
                maxLength={200}
              />
            </Field>
            <Field label="Биография">
              <textarea
                className={inputClass}
                name="bio"
                defaultValue={artist?.bio ?? ""}
                rows={4}
                maxLength={10000}
              />
            </Field>
            {artist?.avatarUrl && (
              <img
                src={artist.avatarUrl}
                alt="Аватар"
                className="admin-preview"
              />
            )}
            <Field label="Аватар">
              <input
                className={inputClass}
                type="file"
                name="avatar"
                accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
              />
            </Field>
          </>
        ) : (
          <>
            <Field label="Название">
              <input
                className={inputClass}
                name="title"
                defaultValue={track?.title ?? album?.title ?? ""}
                required
                maxLength={200}
              />
            </Field>
            {tab === "albums" && (
              <Field label="Дата релиза">
                <input
                  className={inputClass}
                  type="date"
                  name="releaseDate"
                  defaultValue={album?.releaseDate ?? ""}
                  required
                />
              </Field>
            )}
          </>
        )}
        {tab !== "artists" &&
          !isGodAccount &&
          (account.role === "god" ? (
            <Field label="Артист">
              <select
                className={inputClass}
                name="artistId"
                value={artistId}
                onChange={(event) => setArtistId(event.target.value)}
                required
              >
                <option value="">Выберите артиста</option>
                {catalog.artists.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.name}
                  </option>
                ))}
              </select>
            </Field>
          ) : (
            <input
              type="hidden"
              name="artistId"
              value={account.artistId ?? ""}
            />
          ))}
        {tab === "beats" && (
          <>
            <Field label="Альбом">
              <select
                className={inputClass}
                key={artistId}
                name="albumId"
                defaultValue={String(track?.albumId ?? "")}
              >
                <option value="">Без альбома</option>
                {catalog.albums
                  .filter((row) => String(row.artistId) === artistId)
                  .map((row) => (
                    <option key={row.id} value={row.id}>
                      {row.title}
                    </option>
                  ))}
              </select>
            </Field>
            {track?.audioUrl && (
              <audio controls src={track.audioUrl} className="admin-audio" />
            )}
            <Field label={track ? "Заменить аудиофайл" : "Аудиофайл"}>
              <input
                className={inputClass}
                type="file"
                name="audio"
                accept=".mp3,.wav,.ogg,.flac,.m4a,.aac"
                required={!track}
              />
            </Field>
          </>
        )}
        {(tab === "beats" || tab === "albums") && (
          <>
            {(track?.coverUrl || album?.coverUrl) && (
              <img
                src={track?.coverUrl || album?.coverUrl}
                alt="Обложка"
                className="admin-preview"
              />
            )}
            <Field label="Обложка">
              <input
                className={inputClass}
                type="file"
                name="cover"
                accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
              />
            </Field>
          </>
        )}
        <div className="admin-form-actions">
          <button className={buttonClass} type="submit">
            {busy ? "Сохранение…" : "Сохранить"}
          </button>
          <button
            className="button button-outline admin-button"
            type="button"
            onClick={onCancel}
          >
            Отмена
          </button>
        </div>
      </fieldset>
    </form>
  );
}

export default function AdminPage() {
  const queryClient = useQueryClient();
  const [account, setAccount] = useState<Account | null>(null);
  const [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [catalog, setCatalog] = useState<Catalog>({
    artists: [],
    albums: [],
    beats: [],
  });
  const [admins, setAdmins] = useState<Account[]>([]);
  const [tab, setTab] = useState<Tab>("beats");
  const [editor, setEditor] = useState<{ item: Item | null } | null>(null);
  const [editorKey, setEditorKey] = useState(0);

  useEffect(() => {
    let active = true;
    api<Account>("/auth/me")
      .then((value) => {
        if (active) setAccount(value);
      })
      .catch((err) => {
        if (active && (!(err instanceof ApiError) || err.status !== 401))
          setError(err instanceof Error ? err.message : "Ошибка подключения");
      })
      .finally(() => {
        if (active) setChecking(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!account) return;
    let active = true;
    setLoading(true);
    Promise.all([
      api<Catalog>("/admin/catalog"),
      account.role === "god" ? api<Account[]>("/admins") : Promise.resolve([]),
    ])
      .then(([data, users]) => {
        if (active) {
          setCatalog(data);
          setAdmins(users);
        }
      })
      .catch((err) => {
        if (active) {
          setError(err instanceof Error ? err.message : "Ошибка загрузки");
          if (err instanceof ApiError && err.status === 401) setAccount(null);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [account]);

  const handleError = (err: unknown) => {
    setError(
      err instanceof Error ? err.message : "Не удалось выполнить запрос",
    );
    if (err instanceof ApiError && err.status === 401) {
      setAccount(null);
      setEditor(null);
    }
  };

  const refresh = async () => {
    if (!account) return;
    const [data, users] = await Promise.all([
      api<Catalog>("/admin/catalog"),
      account.role === "god" ? api<Account[]>("/admins") : Promise.resolve([]),
    ]);
    setCatalog(data);
    setAdmins(users);
    await queryClient.invalidateQueries({ queryKey: ["catalog"] });
  };

  const login = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const user = await api<Account>(
        "/auth/login",
        jsonRequest("POST", {
          username: data.get("username"),
          password: data.get("password"),
        }),
      );
      setTab("beats");
      setEditor(null);
      setAccount(user);
    } catch (err) {
      handleError(err);
    } finally {
      setBusy(false);
    }
  };

  const logout = async () => {
    setBusy(true);
    setError("");
    try {
      await api("/auth/logout", { method: "POST" });
      setAccount(null);
      setEditor(null);
      setNotice("");
    } catch (err) {
      handleError(err);
    } finally {
      setBusy(false);
    }
  };

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editor) return;
    const data = new FormData(event.currentTarget);
    for (const [key, value] of [...data.entries()]) {
      if (value instanceof File && value.size === 0) data.delete(key);
    }
    const item = editor.item;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      let options: RequestInit = { method: item ? "PUT" : "POST", body: data };
      if (tab === "admins") {
        const body: Record<string, string | number> = {};
        for (const [key, value] of data.entries())
          if (typeof value === "string" && value)
            body[key] = key === "artistId" ? Number(value) : value;
        options = jsonRequest(item ? "PUT" : "POST", body);
      }
      await api(`/${tab}${item ? `/${item.id}` : ""}`, options);
      setEditor(null);
      setNotice("Изменения сохранены");
      if (tab === "admins" && item?.id === account?.id) {
        setAccount(null);
        setNotice("Пароль изменён. Войдите снова");
      } else await refresh();
    } catch (err) {
      handleError(err);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (item: Item) => {
    const message =
      tab === "artists"
        ? "Удалить артиста, все его треки, альбомы и аккаунты?"
        : "Удалить выбранную запись?";
    if (!window.confirm(message)) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await api(`/${tab}/${item.id}`, { method: "DELETE" });
      setEditor(null);
      await refresh();
      setNotice("Запись удалена");
    } catch (err) {
      handleError(err);
    } finally {
      setBusy(false);
    }
  };

  const openEditor = (item: Item | null) => {
    setEditor({ item });
    setEditorKey((value) => value + 1);
    setError("");
    setNotice("");
  };
  const items: Item[] = tab === "admins" ? admins : catalog[tab];
  const tabs: Tab[] =
    account?.role === "god"
      ? ["beats", "albums", "artists", "admins"]
      : ["beats", "albums"];

  if (!account)
    return (
      <section className="admin-login">
        <div className="login-panel">
          <div className="login-poster" aria-hidden="true">
            <span className="meta">RAW CROWNZ / ARTIST SPACE</span>
            <div className="login-poster-type">
              <span className="login-poster-echo">
                FOR
                <br />
                ARTISTS
              </span>
              <span className="display">
                FOR
                <br />
                ARTISTS
              </span>
            </div>
            <span className="login-poster-bottom meta">
              SIBERIA.
              <ArrowUpRight size={28} />
            </span>
          </div>
          <div className="login-content">
            <div className="login-heading">
              <span className="meta accent">GOOD TO SEE YOU</span>
              <h1>Welcome.</h1>
              <p>Заходите.</p>
            </div>
            {error && (
              <p role="alert" className="admin-message admin-message-error">
                {error}
              </p>
            )}
            {notice && (
              <p role="status" className="admin-message">
                {notice}
              </p>
            )}
            {checking ? (
              <p className="admin-loading" role="status">
                Проверяем сессию…
              </p>
            ) : (
              <form onSubmit={login} className="login-form">
                <fieldset disabled={busy} className="admin-fields">
                  <Field label="Логин">
                    <input
                      className={inputClass}
                      name="username"
                      autoComplete="username"
                      required
                      maxLength={100}
                      autoCapitalize="none"
                      spellCheck={false}
                    />
                  </Field>
                  <Field label="Пароль">
                    <input
                      className={inputClass}
                      name="password"
                      type="password"
                      autoComplete="current-password"
                      required
                      maxLength={128}
                    />
                  </Field>
                  <button className={buttonClass} type="submit">
                    {busy ? "Заходим…" : "Войти"}
                    <ArrowUpRight size={19} />
                  </button>
                </fieldset>
              </form>
            )}
          </div>
        </div>
      </section>
    );

  return (
    <section className="admin-workspace page-container">
      <header className="admin-topbar">
        <div>
          <span className="meta accent">
            RAW CROWNZ / {account.role === "god" ? "GOD MODE" : "ARTIST SPACE"}
          </span>
          {/* <h1>Your studio.</h1> */}
        </div>
        <div className="admin-account">
          <div>
            <strong>{account.username}</strong>
            <span>
              {account.role === "artist"
                ? "Ваши треки и альбомы"
                : "Все записи и участники"}
            </span>
          </div>
          <button
            onClick={logout}
            disabled={busy}
            className="button button-outline admin-button"
          >
            <LogOut size={16} />
            Выйти
          </button>
        </div>
      </header>
      {error && (
        <p role="alert" className="admin-message admin-message-error">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="admin-message">
          {notice}
        </p>
      )}
      <nav aria-label="Разделы админки" className="admin-tabs">
        {tabs.map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={tab === value}
            disabled={busy}
            onClick={() => {
              setTab(value);
              setEditor(null);
              setError("");
              setNotice("");
            }}
          >
            {labels[value]}
            <span>
              {String(
                value === "admins" ? admins.length : catalog[value].length,
              ).padStart(2, "0")}
            </span>
          </button>
        ))}
      </nav>
      {loading ? (
        <p className="admin-loading" role="status">
          Загрузка каталога…
        </p>
      ) : (
        <>
          <div className="admin-toolbar">
            <div>
              <h2>{labels[tab]}</h2>
              <span className="meta">{items.length} записей</span>
            </div>
            {!editor && (
              <button
                className={buttonClass}
                disabled={busy}
                onClick={() => openEditor(null)}
              >
                <Plus size={18} />
                Добавить
              </button>
            )}
          </div>
          <div className={`admin-content ${editor ? "has-editor" : ""}`}>
            {editor && (
              <Editor
                key={editorKey}
                tab={tab}
                item={editor.item}
                catalog={catalog}
                account={account}
                busy={busy}
                onSave={save}
                onCancel={() => setEditor(null)}
              />
            )}
            <div className="admin-records" aria-label={labels[tab]}>
              {items.length === 0 && (
                <p className="empty-state">
                  Здесь пока нет записей. Добавьте первую.
                </p>
              )}
              {items.map((item) => {
                const title =
                  "username" in item
                    ? item.username
                    : "name" in item
                      ? item.name
                      : item.title;
                return (
                  <article
                    key={item.id}
                    className={`admin-record ${editor?.item?.id === item.id ? "is-editing" : ""}`}
                  >
                    <div className="admin-record-copy">
                      <span className="admin-record-id meta">
                        /{String(item.id).padStart(2, "0")}
                      </span>
                      <div>
                        <h3>{title}</h3>
                        <p>
                          {"username" in item
                            ? item.role === "god"
                              ? "Суперадмин"
                              : catalog.artists.find(
                                  (row) => row.id === item.artistId,
                                )?.name
                            : "producer" in item
                              ? item.producer
                              : "artist" in item
                                ? item.artist
                                : ""}
                        </p>
                      </div>
                    </div>
                    <div className="admin-record-actions">
                      <button
                        disabled={busy}
                        className="admin-action"
                        aria-label={`Редактировать: ${title}`}
                        onClick={() => openEditor(item)}
                      >
                        <Pencil size={15} />
                        <span>Изменить</span>
                      </button>
                      {!("role" in item && item.role === "god") && (
                        <button
                          disabled={busy}
                          className="admin-action admin-action-delete"
                          aria-label={`Удалить: ${title}`}
                          onClick={() => remove(item)}
                        >
                          <Trash2 size={15} />
                          <span>Удалить</span>
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
