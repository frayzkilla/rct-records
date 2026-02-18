import { useEffect, useState } from "react";
import { Plus, Upload, ImagePlus, UserPlus, Disc } from "lucide-react";
import { useNavigate } from "react-router-dom";

type Tab = "tracks" | "albums" | "artists";

const AdminPage = () => {
  const navigate = useNavigate();

  const [tab, setTab] = useState<Tab>("tracks");
  const [artists, setArtists] = useState<{ id: string; name: string }[]>([]);
  const [albums, setAlbums] = useState<{ id: string; title: string }[]>([]);

  const [trackTitle, setTrackTitle] = useState("");
  const [trackAudio, setTrackAudio] = useState<File | null>(null);
  const [trackCover, setTrackCover] = useState<File | null>(null);
  const [trackArtistId, setTrackArtistId] = useState("");
  const [trackAlbumId, setTrackAlbumId] = useState("");

  const [albumTitle, setAlbumTitle] = useState("");
  const [albumDate, setAlbumDate] = useState("");
  const [albumCover, setAlbumCover] = useState<File | null>(null);
  const [albumArtistId, setAlbumArtistId] = useState("");

  const [artistName, setArtistName] = useState("");
  const [artistBio, setArtistBio] = useState("");
  const [artistAvatar, setArtistAvatar] = useState<File | null>(null);

  //   const ADMIN_KEY = "rawcrownz_secret_2025";

  useEffect(() => {
    // fetch("http://localhost:3000/api/artists")
    fetch("/api/artists")
      .then((res) => res.json())
      .then(setArtists)
      .catch((err) => console.error("Ошибка при загрузке артистов", err));

    // fetch("http://localhost:3000/api/albums")
    fetch("/api/albums")
      .then((res) => res.json())
      .then(setAlbums);
  }, []);

  const upload = async (endpoint: string, data: FormData) => {
    try {
      // await fetch(`http://localhost:3000/api/${endpoint}`, {
      await fetch(`/api/${endpoint}`, {
        method: "POST",
        body: data,
      });
      alert("Успешно отправлено");
    } catch (error) {
      alert("Ошибка при отправке");
      console.error(error);
    }
  };

  const handleTrackSubmit = async () => {
    const formData = new FormData();
    formData.append("title", trackTitle);
    formData.append("artistId", trackArtistId);
    if (trackAlbumId) formData.append("albumId", trackAlbumId);
    if (trackAudio) formData.append("audio", trackAudio);
    if (trackCover) formData.append("cover", trackCover);
    await upload("beats", formData);
  };

  const handleAlbumSubmit = async () => {
    const formData = new FormData();
    formData.append("title", albumTitle);
    formData.append("releaseDate", albumDate);
    formData.append("artistId", albumArtistId);
    if (albumCover) formData.append("cover", albumCover);
    await upload("albums", formData);
  };

  const handleArtistSubmit = async () => {
    const formData = new FormData();
    formData.append("name", artistName);
    formData.append("bio", artistBio);
    if (artistAvatar) formData.append("avatar", artistAvatar);
    await upload("artists", formData);
  };

  const FileInput = ({
    onChange,
    file,
    label,
    icon: Icon,
  }: {
    onChange: (file: File | null) => void;
    file: File | null;
    label: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    icon: any;
  }) => (
    <div className="relative">
      <input
        type="file"
        onChange={(e) => onChange(e.target.files?.[0] || null)}
        className="opacity-0 absolute w-full h-full cursor-pointer"
      />
      <div
        className="bg-zinc-800/50 border border-zinc-700 rounded-lg px-4 py-3 
                    flex items-center justify-between hover:bg-zinc-800 transition-colors"
      >
        <span className="text-zinc-400 truncate">{file?.name || label}</span>
        <Icon className="text-[#D4AF37] flex-shrink-0" size={20} />
      </div>
    </div>
  );

  return (
    <div className="bg-black text-white min-h-screen pt-24 pb-12 px-4 mb-24">
      <div className="max-w-4xl mx-auto">
        <div className="mb-12 text-center">
          <h1
            className="text-4xl md:text-5xl font-bold font-mono uppercase tracking-wider 
                        text-transparent bg-clip-text bg-gradient-to-r from-[#C9A227] to-[#D4AF37]"
          >
            🎚️ RAW ADMIN
          </h1>
          <p className="text-zinc-400 mt-2">Управление контентом</p>
        </div>

        <div className="flex space-x-8 mb-12 border-b border-[#C9A227]/30">
          {(["tracks", "albums", "artists"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`pb-4 px-2 text-lg font-mono uppercase tracking-wider transition-all
                ${
                  tab === t
                    ? "text-[#D4AF37] border-b-2 border-[#D4AF37]"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
            >
              {t === "tracks"
                ? "Треки"
                : t === "albums"
                  ? "Альбомы"
                  : "Артисты"}
            </button>
          ))}
          <button
            onClick={() => navigate("/adminEdit")}
            className={`pb-4 px-2 text-lg font-mono uppercase tracking-wider transition-all text-zinc-400 hover:text-zinc-200`}
          >
            Удалить/редактировать
          </button>
        </div>

        <div className="bg-zinc-900/80 backdrop-blur-sm rounded-xl p-8 shadow-2xl border border-[#C9A227]/20">
          {tab === "tracks" && (
            <div className="space-y-6">
              <h2 className="text-2xl font-mono text-[#D4AF37] mb-6 flex items-center gap-2">
                <Disc size={24} /> Добавить новый трек
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Название трека
                  </label>
                  <input
                    type="text"
                    value={trackTitle}
                    onChange={(e) => setTrackTitle(e.target.value)}
                    className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg px-4 py-3 
                             focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Артист
                  </label>
                  <select
                    value={trackArtistId}
                    onChange={(e) => setTrackArtistId(e.target.value)}
                    className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg px-4 py-3 
                             focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
                  >
                    <option value="">Выберите артиста</option>
                    {artists.map((a) => (
                      <option key={a.id} value={a.id} className="bg-zinc-800">
                        {a.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Альбом (опционально)
                  </label>
                  <select
                    value={trackAlbumId}
                    onChange={(e) => setTrackAlbumId(e.target.value)}
                    className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg px-4 py-3 
                             focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
                  >
                    <option value="">Не привязан к альбому</option>
                    {albums.map((a) => (
                      <option key={a.id} value={a.id} className="bg-zinc-800">
                        {a.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">
                      Аудио файл
                    </label>
                    <FileInput
                      onChange={setTrackAudio}
                      file={trackAudio}
                      label="Выберите аудиофайл"
                      icon={Upload}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">
                      Обложка
                    </label>
                    <FileInput
                      onChange={setTrackCover}
                      file={trackCover}
                      label="Выберите обложку"
                      icon={ImagePlus}
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={handleTrackSubmit}
                className="w-full bg-[#C9A227] hover:bg-[#D4AF37] text-black font-bold py-3 px-6 rounded-lg
                         transition-all transform hover:scale-[1.02] flex items-center justify-center gap-2"
              >
                <Plus size={20} />
                Добавить трек
              </button>
            </div>
          )}

          {tab === "albums" && (
            <div className="space-y-6">
              <h2 className="text-2xl font-mono text-[#D4AF37] mb-6 flex items-center gap-2">
                <Disc size={24} /> Добавить новый альбом
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Название альбома
                  </label>
                  <input
                    type="text"
                    value={albumTitle}
                    onChange={(e) => setAlbumTitle(e.target.value)}
                    className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg px-4 py-3 
                             focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Дата релиза
                  </label>
                  <input
                    type="date"
                    value={albumDate}
                    onChange={(e) => setAlbumDate(e.target.value)}
                    className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg px-4 py-3 
                             focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Артист
                  </label>
                  <select
                    value={albumArtistId}
                    onChange={(e) => setAlbumArtistId(e.target.value)}
                    className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg px-4 py-3 
                             focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
                  >
                    <option value="">Выберите артиста</option>
                    {artists.map((a) => (
                      <option key={a.id} value={a.id} className="bg-zinc-800">
                        {a.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Обложка альбома
                  </label>
                  <FileInput
                    onChange={setAlbumCover}
                    file={albumCover}
                    label="Выберите обложку"
                    icon={ImagePlus}
                  />
                </div>
              </div>

              <button
                onClick={handleAlbumSubmit}
                className="w-full bg-[#C9A227] hover:bg-[#D4AF37] text-black font-bold py-3 px-6 rounded-lg
                         transition-all transform hover:scale-[1.02] flex items-center justify-center gap-2"
              >
                <Plus size={20} />
                Добавить альбом
              </button>
            </div>
          )}

          {tab === "artists" && (
            <div className="space-y-6">
              <h2 className="text-2xl font-mono text-[#D4AF37] mb-6 flex items-center gap-2">
                <UserPlus size={24} /> Добавить нового артиста
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Имя артиста
                  </label>
                  <input
                    type="text"
                    value={artistName}
                    onChange={(e) => setArtistName(e.target.value)}
                    className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg px-4 py-3 
                             focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Аватар
                  </label>
                  <FileInput
                    onChange={setArtistAvatar}
                    file={artistAvatar}
                    label="Выберите аватар"
                    icon={ImagePlus}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Биография
                  </label>
                  <textarea
                    value={artistBio}
                    onChange={(e) => setArtistBio(e.target.value)}
                    className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg px-4 py-3 
                             focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent h-32"
                  />
                </div>
              </div>

              <button
                onClick={handleArtistSubmit}
                className="w-full bg-[#C9A227] hover:bg-[#D4AF37] text-black font-bold py-3 px-6 rounded-lg
                         transition-all transform hover:scale-[1.02] flex items-center justify-center gap-2"
              >
                <Plus size={20} />
                Добавить артиста
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminPage;
