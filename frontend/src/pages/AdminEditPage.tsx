import { use, useEffect, useState } from "react";
import { Edit, Trash } from "lucide-react";
import { useNavigate } from "react-router-dom";

type ContentType = "beats" | "albums" | "artists";

interface Track {
  id: string;
  title: string;
  artist: string;
}

interface Album {
  id: string;
  title: string;
  artist: string;
}

interface Artist {
  id: string;
  name: string;
}

const EditContentPage = () => {
  const navigate = useNavigate();

  const [contentType, setContentType] = useState<ContentType>("beats");
  const [tracks, setTracks] = useState<Track[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [editData, setEditData] = useState<any>({});
  const [isEditing, setIsEditing] = useState(false);

  // const ADMIN_KEY = "rawcrownz_secret_2025";

  useEffect(() => {
    fetchData();
  }, [contentType]);

  const fetchData = async () => {
    try {
      const response = await fetch(`http://localhost:3000/api/${contentType}`);
      // const response = await fetch(`/api/${contentType}`);
      const data = await response.json();
      switch (contentType) {
        case "beats":
          setTracks(data);
          break;
        case "albums":
          setAlbums(data);
          break;
        case "artists":
          setArtists(data);
          break;
      }
    } catch (error) {
      console.error("Ошибка загрузки данных:", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Вы уверены что хотите удалить?")) {
      try {
        await fetch(`http://localhost:3000/api/${contentType}/${id}`, {
          // await fetch(`/api/${contentType}/${id}`, {
          method: "DELETE",
        });
        fetchData();
      } catch (error) {
        console.error("Ошибка удаления:", error);
      }
    }
  };

  const handleEdit = (item: any) => {
    setSelectedItem(item.id);
    setEditData(item);
    setIsEditing(true);
  };

  const handleUpdate = async () => {
    try {
      await fetch(`http://localhost:3000/api/${contentType}/${selectedItem}`, {
        // await fetch(`/api/${contentType}/${selectedItem}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(editData),
      });
      setIsEditing(false);
      fetchData();
    } catch (error) {
      console.error("Ошибка обновления:", error);
    }
  };

  const ContentList = () => {
    switch (contentType) {
      case "beats":
        return tracks.map((track) => (
          <div
            key={track.id}
            className="bg-zinc-900/80 p-4 rounded-lg hover:bg-zinc-900 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-[#D4AF37] font-mono">{track.title}</h3>
                <p className="text-zinc-400 text-sm">{track.artist}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(track)}
                  className="p-2 text-[#D4AF37] hover:bg-zinc-800 rounded-lg transition-colors"
                >
                  <Edit size={20} />
                </button>
                <button
                  onClick={() => handleDelete(track.id)}
                  className="p-2 text-red-500 hover:bg-zinc-800 rounded-lg transition-colors"
                >
                  <Trash size={20} />
                </button>
              </div>
            </div>
          </div>
        ));

      case "albums":
        return albums.map((album) => (
          <div
            key={album.id}
            className="bg-zinc-900/80 p-4 rounded-lg hover:bg-zinc-900 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-[#D4AF37] font-mono">{album.title}</h3>
                <p className="text-zinc-400 text-sm">{album.artist}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(album)}
                  className="p-2 text-[#D4AF37] hover:bg-zinc-800 rounded-lg transition-colors"
                >
                  <Edit size={20} />
                </button>
                <button
                  onClick={() => handleDelete(album.id)}
                  className="p-2 text-red-500 hover:bg-zinc-800 rounded-lg transition-colors"
                >
                  <Trash size={20} />
                </button>
              </div>
            </div>
          </div>
        ));

      case "artists":
        return artists.map((artist) => (
          <div
            key={artist.id}
            className="bg-zinc-900/80 p-4 rounded-lg hover:bg-zinc-900 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-[#D4AF37] font-mono">{artist.name}</h3>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(artist)}
                  className="p-2 text-[#D4AF37] hover:bg-zinc-800 rounded-lg transition-colors"
                >
                  <Edit size={20} />
                </button>
                <button
                  onClick={() => handleDelete(artist.id)}
                  className="p-2 text-red-500 hover:bg-zinc-800 rounded-lg transition-colors"
                >
                  <Trash size={20} />
                </button>
              </div>
            </div>
          </div>
        ));
    }
  };

  const EditForm = () => {
    if (!isEditing) return null;

    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 ">
        <div className="bg-zinc-900/80 rounded-xl p-8 max-w-md w-full border border-[#D4AF37]/30">
          <h3 className="text-xl text-[#D4AF37] mb-4">Редактирование</h3>

          {contentType === "beats" && (
            <div className="space-y-4">
              <input
                type="text"
                value={editData.title}
                onChange={(e) =>
                  setEditData({ ...editData, title: e.target.value })
                }
                className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg px-4 py-3"
              />
              <input
                type="text"
                value={editData.artist}
                onChange={(e) =>
                  setEditData({ ...editData, artist: e.target.value })
                }
                className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg px-4 py-3"
              />
            </div>
          )}

          {contentType === "albums" && (
            <div className="space-y-4">
              <input
                type="text"
                value={editData.title}
                onChange={(e) =>
                  setEditData({ ...editData, title: e.target.value })
                }
                className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg px-4 py-3"
              />
            </div>
          )}

          {contentType === "artists" && (
            <div className="space-y-4">
              <input
                type="text"
                value={editData.name}
                onChange={(e) =>
                  setEditData({ ...editData, name: e.target.value })
                }
                className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg px-4 py-3"
              />
            </div>
          )}

          <div className="flex gap-4 mt-6">
            <button
              onClick={handleUpdate}
              className="bg-[#D4AF37] text-black px-6 py-2 rounded-lg flex-1"
            >
              Сохранить
            </button>
            <button
              onClick={() => setIsEditing(false)}
              className="bg-zinc-800 px-6 py-2 rounded-lg flex-1"
            >
              Отмена
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-black text-white min-h-screen pt-24 pb-12 px-4 mb-20">
      <div className="max-w-4xl mx-auto">
        <div className="mb-12 text-center">
          <h1
            className="text-4xl md:text-5xl font-bold font-mono uppercase tracking-wider 
                        text-transparent bg-clip-text bg-gradient-to-r from-[#C9A227] to-[#D4AF37]"
          >
            🛠️ Управление контентом
          </h1>
        </div>

        <div className="flex space-x-8 mb-8 border-b border-[#C9A227]/30">
          {(["beats", "albums", "artists"] as ContentType[]).map((type) => (
            <button
              key={type}
              onClick={() => {
                setContentType(type);
                setIsEditing(false);
              }}
              className={`pb-4 px-2 text-lg font-mono uppercase tracking-wider transition-all
                ${
                  contentType === type
                    ? "text-[#D4AF37] border-b-2 border-[#D4AF37]"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
            >
              {type === "beats"
                ? "Треки"
                : type === "albums"
                ? "Альбомы"
                : "Артисты"}
            </button>
          ))}
          <button
            onClick={() => navigate("/admin")}
            className={`pb-4 px-2 text-lg font-mono uppercase tracking-wider transition-all text-zinc-400 hover:text-zinc-200`}
          >
            Добавить
          </button>
        </div>

        <div className="space-y-4">
          <ContentList />
        </div>

        <EditForm />
      </div>
    </div>
  );
};

export default EditContentPage;
