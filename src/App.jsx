// src/App.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { apiRequest, API_ENDPOINTS } from "./config/api";
import { Plus, QrCode, Trash2 } from "lucide-react";

export default function App() {
  const navigate = useNavigate();
  const [instances, setInstances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [term, setTerm] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [errorNew, setErrorNew] = useState("");

  async function load() {
    setLoading(true);
    try {
      const data = await apiRequest(API_ENDPOINTS.listInstances());
      setInstances(Array.isArray(data) ? data : (data?.instances || []));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const t = term.trim().toLowerCase();
    if (!t) return instances;
    return instances.filter(
      (it) =>
        it?.instance_name?.toLowerCase().includes(t) ||
        it?.instance_id?.toLowerCase().includes(t)
    );
  }, [instances, term]);

  async function onCreate() {
    setErrorNew("");
    const name = (newName || "").trim();
    if (!/^[a-z0-9-]{3,40}$/.test(name)) {
      setErrorNew("Use apenas minúsculas, números e hífen (3-40).");
      return;
    }
    try {
      await apiRequest(API_ENDPOINTS.createInstance(), {
        method: "POST",
        body: { instanceName: name },
      });
      setShowNew(false);
      setNewName("");
      // Abre a tela de conexão para esta instância
      navigate(`/connect/${encodeURIComponent(name)}`);
      // E recarrega a lista em background
      load();
    } catch (e) {
      setErrorNew(String(e?.message || e));
    }
  }

  async function onDisconnect(name) {
    try {
      await apiRequest(API_ENDPOINTS.disconnect(name), { method: "POST" });
    } catch (e) {}
    load();
  }

  return (
    <div className="min-h-screen bg-[#0b0f12] text-white">
      <header className="p-4 flex items-center justify-between border-b border-[#1f2937]">
        <div className="text-2xl font-semibold">Volxo</div>
        <button
          onClick={() => setShowNew(true)}
          className="inline-flex items-center gap-2 bg-cyan-400 text-black px-3 py-2 rounded"
        >
          <Plus size={18} /> Nova Instância
        </button>
      </header>

      <main className="p-6 max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-4">
          <input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Pesquisar instâncias..."
            className="w-full bg-[#0f1520] border border-[#1f2937] rounded px-3 py-2 outline-none"
          />
          <span className="text-sm text-gray-400">
            Ativas: {instances?.length || 0}
          </span>
        </div>

        {loading ? (
          <div className="text-gray-400">Carregando...</div>
        ) : filtered.length === 0 ? (
          <div className="text-gray-400">Nenhuma instância.</div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((it) => {
              const name = it.instance_name || it.instancename || it.instanceId;
              const id = it.instance_id || it.instanceId;
              return (
                <div key={`${name}-${id}`} className="border border-[#1f2937] rounded-xl p-4 bg-[#0f1520]">
                  <div className="text-sm text-gray-400 mb-2">{name}</div>
                  <div className="text-xs text-gray-500 break-all mb-4">{id}</div>
                  <div className="flex gap-2">
                    <Link
                      to={`/connect/${encodeURIComponent(name)}`}
                      className="inline-flex items-center gap-2 bg-cyan-400 text-black px-3 py-2 rounded"
                    >
                      <QrCode size={16} /> Conectar
                    </Link>
                    <button
                      onClick={() => onDisconnect(name)}
                      className="inline-flex items-center gap-2 bg-[#222] px-3 py-2 rounded"
                    >
                      <Trash2 size={16} /> Desconectar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Modal de nova instância */}
      {showNew && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center">
          <div className="bg-[#0b0f12] border border-[#1f2937] rounded-2xl p-6 w-[480px] flex flex-col gap-4">
            <h3 className="text-xl">Nova Instância</h3>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="ex.: minha-instancia"
              className="bg-[#0f1520] border border-[#1f2937] rounded px-3 py-2 outline-none"
            />
            {errorNew && <div className="text-sm text-yellow-300">{errorNew}</div>}
            <div className="flex justify-end gap-2">
              <button className="px-3 py-2 rounded bg-[#222]" onClick={() => setShowNew(false)}>
                Cancelar
              </button>
              <button className="px-3 py-2 rounded bg-cyan-400 text-black" onClick={onCreate}>
                Continuar para Login GHL
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
