import { useEffect, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { api, ApiError, jsonRequest } from "../lib/api";
import { useQueryClient } from "@tanstack/react-query";

type Account = { id: number; username: string; role: "god" | "artist"; artistId: number | null };
type Artist = { id: number; name: string; bio: string; avatarUrl: string };
type Album = { id: number; title: string; artistId: number; releaseDate: string; coverUrl: string; artist: string };
type Track = { id: number; title: string; artistId: number; albumId: number | null; audioUrl: string; coverUrl: string; producer: string };
type Catalog = { artists: Artist[]; albums: Album[]; beats: Track[] };
type Tab = "beats" | "albums" | "artists" | "admins";
type Item = Artist | Album | Track | Account;
const labels: Record<Tab, string> = { beats: "Треки", albums: "Альбомы", artists: "Артисты", admins: "Администраторы" };
const inputClass = "w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-white focus:outline-none focus:border-[var(--orange)]";
const buttonClass = "rounded-lg bg-[var(--orange)] px-5 py-3 font-semibold text-black disabled:opacity-50";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block space-y-2"><span className="text-sm text-zinc-300">{label}</span>{children}</label>;
}

function Editor({ tab, item, catalog, account, busy, onSave, onCancel }: {
  tab: Tab; item: Item | null; catalog: Catalog; account: Account; busy: boolean;
  onSave: (event: FormEvent<HTMLFormElement>) => void; onCancel: () => void;
}) {
  const track = item && "audioUrl" in item ? item : null;
  const album = item && "releaseDate" in item ? item : null;
  const artist = item && "bio" in item ? item : null;
  const admin = item && "username" in item ? item : null;
  const [artistId, setArtistId] = useState(String(track?.artistId ?? album?.artistId ?? admin?.artistId ?? account.artistId ?? catalog.artists[0]?.id ?? ""));
  const isGodAccount = admin?.role === "god";
  return (
    <form onSubmit={onSave} className="space-y-5 rounded-xl border border-[var(--orange)]/30 bg-zinc-900 p-6">
      <h2 className="text-xl text-[var(--orange)]">{item ? "Редактирование" : "Добавление"}: {labels[tab].toLowerCase()}</h2>
      <fieldset disabled={busy} className="space-y-5">
        {tab === "admins" ? <>
          <Field label="Логин"><input className={inputClass} name="username" defaultValue={admin?.username ?? ""} required maxLength={100} disabled={isGodAccount} autoComplete="off" /></Field>
          <Field label={admin ? "Новый пароль (оставьте пустым, чтобы сохранить текущий)" : "Пароль"}>
            <input className={inputClass} type="password" name="password" required={!admin} minLength={8} maxLength={128} autoComplete="new-password" />
          </Field>
        </> : tab === "artists" ? <>
          <Field label="Имя артиста"><input className={inputClass} name="name" defaultValue={artist?.name ?? ""} required maxLength={200} /></Field>
          <Field label="Биография"><textarea className={inputClass} name="bio" defaultValue={artist?.bio ?? ""} rows={4} maxLength={10000} /></Field>
          {artist?.avatarUrl && <img src={artist.avatarUrl} alt="Аватар" className="h-24 w-24 rounded-lg object-cover" />}
          <Field label="Аватар"><input className={inputClass} type="file" name="avatar" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" /></Field>
        </> : <>
          <Field label="Название"><input className={inputClass} name="title" defaultValue={track?.title ?? album?.title ?? ""} required maxLength={200} /></Field>
          {tab === "albums" && <Field label="Дата релиза"><input className={inputClass} type="date" name="releaseDate" defaultValue={album?.releaseDate ?? ""} required /></Field>}
        </>}
        {tab !== "artists" && !isGodAccount && (
          account.role === "god" ? <Field label="Артист">
            <select className={inputClass} name="artistId" value={artistId} onChange={event => setArtistId(event.target.value)} required>
              <option value="">Выберите артиста</option>
              {catalog.artists.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}
            </select>
          </Field> : <input type="hidden" name="artistId" value={account.artistId ?? ""} />
        )}
        {tab === "beats" && <>
          <Field label="Альбом"><select className={inputClass} key={artistId} name="albumId" defaultValue={String(track?.albumId ?? "")}>
            <option value="">Без альбома</option>
            {catalog.albums.filter(row => String(row.artistId) === artistId).map(row => <option key={row.id} value={row.id}>{row.title}</option>)}
          </select></Field>
          {track?.audioUrl && <audio controls src={track.audioUrl} className="w-full" />}
          <Field label={track ? "Заменить аудиофайл" : "Аудиофайл"}><input className={inputClass} type="file" name="audio" accept=".mp3,.wav,.ogg,.flac,.m4a,.aac" required={!track} /></Field>
        </>}
        {(tab === "beats" || tab === "albums") && <>
          {(track?.coverUrl || album?.coverUrl) && <img src={track?.coverUrl || album?.coverUrl} alt="Обложка" className="h-24 w-24 rounded-lg object-cover" />}
          <Field label="Обложка"><input className={inputClass} type="file" name="cover" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" /></Field>
        </>}
        <div className="flex flex-wrap gap-3">
          <button className={buttonClass} type="submit">{busy ? "Сохранение…" : "Сохранить"}</button>
          <button className="rounded-lg bg-zinc-800 px-5 py-3" type="button" onClick={onCancel}>Отмена</button>
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
  const [catalog, setCatalog] = useState<Catalog>({ artists: [], albums: [], beats: [] });
  const [admins, setAdmins] = useState<Account[]>([]);
  const [tab, setTab] = useState<Tab>("beats");
  const [editor, setEditor] = useState<{ item: Item | null } | null>(null);
  const [editorKey, setEditorKey] = useState(0);

  useEffect(() => {
    let active = true;
    api<Account>("/auth/me").then(value => { if (active) setAccount(value); }).catch(err => {
      if (active && (!(err instanceof ApiError) || err.status !== 401)) setError(err instanceof Error ? err.message : "Ошибка подключения");
    }).finally(() => { if (active) setChecking(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!account) return;
    let active = true;
    setLoading(true);
    Promise.all([api<Catalog>("/admin/catalog"), account.role === "god" ? api<Account[]>("/admins") : Promise.resolve([])])
      .then(([data, users]) => { if (active) { setCatalog(data); setAdmins(users); } })
      .catch(err => { if (active) { setError(err instanceof Error ? err.message : "Ошибка загрузки"); if (err instanceof ApiError && err.status === 401) setAccount(null); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [account]);

  const handleError = (err: unknown) => {
    setError(err instanceof Error ? err.message : "Не удалось выполнить запрос");
    if (err instanceof ApiError && err.status === 401) { setAccount(null); setEditor(null); }
  };

  const refresh = async () => {
    if (!account) return;
    const [data, users] = await Promise.all([api<Catalog>("/admin/catalog"), account.role === "god" ? api<Account[]>("/admins") : Promise.resolve([])]);
    setCatalog(data);
    setAdmins(users);
    await queryClient.invalidateQueries({ queryKey: ["catalog"] });
  };

  const login = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setBusy(true); setError(""); setNotice("");
    try {
      const user = await api<Account>("/auth/login", jsonRequest("POST", { username: data.get("username"), password: data.get("password") }));
      setTab("beats"); setEditor(null); setAccount(user);
    } catch (err) { handleError(err); } finally { setBusy(false); }
  };

  const logout = async () => {
    setBusy(true); setError("");
    try { await api("/auth/logout", { method: "POST" }); setAccount(null); setEditor(null); setNotice(""); }
    catch (err) { handleError(err); } finally { setBusy(false); }
  };

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editor) return;
    const data = new FormData(event.currentTarget);
    for (const [key, value] of [...data.entries()]) {
      if (value instanceof File && value.size === 0) data.delete(key);
    }
    const item = editor.item;
    setBusy(true); setError(""); setNotice("");
    try {
      let options: RequestInit = { method: item ? "PUT" : "POST", body: data };
      if (tab === "admins") {
        const body: Record<string, string | number> = {};
        for (const [key, value] of data.entries()) if (typeof value === "string" && value) body[key] = key === "artistId" ? Number(value) : value;
        options = jsonRequest(item ? "PUT" : "POST", body);
      }
      await api(`/${tab}${item ? `/${item.id}` : ""}`, options);
      setEditor(null); setNotice("Изменения сохранены");
      if (tab === "admins" && item?.id === account?.id) { setAccount(null); setNotice("Пароль изменён. Войдите снова"); }
      else await refresh();
    } catch (err) { handleError(err); } finally { setBusy(false); }
  };

  const remove = async (item: Item) => {
    const message = tab === "artists" ? "Удалить артиста, все его треки, альбомы и аккаунты?" : "Удалить выбранную запись?";
    if (!window.confirm(message)) return;
    setBusy(true); setError(""); setNotice("");
    try { await api(`/${tab}/${item.id}`, { method: "DELETE" }); setEditor(null); await refresh(); setNotice("Запись удалена"); }
    catch (err) { handleError(err); } finally { setBusy(false); }
  };

  const openEditor = (item: Item | null) => { setEditor({ item }); setEditorKey(value => value + 1); setError(""); setNotice(""); };
  const items: Item[] = tab === "admins" ? admins : catalog[tab];
  const tabs: Tab[] = account?.role === "god" ? ["beats", "albums", "artists", "admins"] : ["beats", "albums"];

  return <div className="min-h-screen bg-black px-4 pb-40 pt-28 text-white">
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="text-3xl font-bold text-[var(--orange)]">{account?.role === "god" ? "GOD MODE" : account ? "Кабинет артиста" : "Вход в админку"}</h1>
      {error && <p role="alert" className="rounded-lg border border-red-700 bg-red-950 p-4">{error}</p>}
      {notice && <p role="status" className="rounded-lg bg-zinc-900 p-4 text-[var(--orange)]">{notice}</p>}
      {checking ? <p>Проверка сессии…</p> : !account ?
        <form onSubmit={login} className="max-w-md space-y-5 rounded-xl border border-zinc-800 bg-zinc-900 p-6">
          <Field label="Логин"><input className={inputClass} name="username" autoComplete="username" required maxLength={100} /></Field>
          <Field label="Пароль"><input className={inputClass} name="password" type="password" autoComplete="current-password" required maxLength={128} /></Field>
          <button className={buttonClass} disabled={busy}>{busy ? "Вход…" : "Войти"}</button>
        </form> : <>
          <div className="flex items-center justify-between gap-4"><p className="text-zinc-400">{account.username}{account.role === "artist" && " · Только ваши треки и альбомы"}</p><button onClick={logout} disabled={busy} className="rounded-lg border border-zinc-700 px-4 py-2">Выйти</button></div>
          <nav aria-label="Разделы админки" className="flex flex-wrap gap-3 border-b border-zinc-800 pb-4">
            {tabs.map(value => <button key={value} disabled={busy} onClick={() => { setTab(value); setEditor(null); setError(""); setNotice(""); }} className={`rounded-lg px-4 py-2 ${tab === value ? "bg-[var(--orange)] text-black" : "bg-zinc-900"}`}>{labels[value]}</button>)}
          </nav>
          {loading ? <p>Загрузка каталога…</p> : <>
            {!editor && <button className={buttonClass} disabled={busy} onClick={() => openEditor(null)}>Добавить</button>}
            {editor && <Editor key={editorKey} tab={tab} item={editor.item} catalog={catalog} account={account} busy={busy} onSave={save} onCancel={() => setEditor(null)} />}
            <div className="space-y-3">
              {items.length === 0 && <p className="text-zinc-400">Здесь пока нет записей</p>}
              {items.map(item => <div key={item.id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-zinc-800 bg-zinc-900 p-5">
                <div><h2 className="font-semibold">{"username" in item ? item.username : "name" in item ? item.name : item.title}</h2>
                  <p className="text-sm text-zinc-400">{"username" in item ? item.role === "god" ? "Суперадмин" : catalog.artists.find(row => row.id === item.artistId)?.name : "producer" in item ? item.producer : "artist" in item ? item.artist : ""}</p>
                </div>
                <div className="flex gap-3"><button disabled={busy} className="text-[var(--orange)]" onClick={() => openEditor(item)}>Редактировать</button>
                  {!("role" in item && item.role === "god") && <button disabled={busy} className="text-red-400" onClick={() => remove(item)}>Удалить</button>}
                </div>
              </div>)}
            </div>
          </>}
        </>}
    </div>
  </div>;
}
