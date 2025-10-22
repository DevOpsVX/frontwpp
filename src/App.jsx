import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { apiRequest, API_ENDPOINTS } from "./config/api";
import { Plus, QrCode, Trash2, RefreshCw } from "lucide-react";

export default function App() {
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
      setInstances(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("list instances:", e);
      setInstances([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const t = term.trim().toLowerCase();
    if (!t) return instances;
    return instances.filter((it) => {
      const name = (it.instance_name || "").toLowerCase();
      const id = (it.instance_id || "").toLowerCase();
      return name.includes(t) || id.includes(t);
    });
  }, [instances, term]);

  async function onCreate() {
    setErrorNew("");
    const name = (newName || "").trim();
    if (!/^[a-z0-9-]{3,40}$/.test(name)) {
      setErrorNew("Use apenas minúsculas, números e hífen (3-40).");
      return;
    }

    try {
      // 1. Cria a instância no backend
      await apiRequest(API_ENDPOINTS.createInstance(), {
        method: "POST",
        body: { instanceName: name },
      });

      // 2. Redireciona para o fluxo de login do GHL
      window.location.href = API_ENDPOINTS.ghlLogin(name);

    } catch (e) {
        if (e.message.includes("400")) {
            setErrorNew("Nome inválido ou já existente. Tente outro.");
        } else {
            setErrorNew(`Erro inesperado: ${e.message}`);
        }
    }
  }

  async function onDelete(instanceName) {
    if (!confirm(`Apagar a instância "${instanceName}"?`)) return;
    try {
      await apiRequest(API_ENDPOINTS.deleteInstance(instanceName), { method: "DELETE" });
      await load(); // Recarrega a lista
    } catch (e) {
      alert(`Falha ao apagar: ${e.message}`);
    }
  }

  async function onDisconnect(instanceName) {
    try {
      await apiRequest(API_ENDPOINTS.disconnect(instanceName), { method: "POST" });
    } catch (_) {}
    load();
  }

  return (
    <div className="min-h-screen bg-[#0b0f12] text-white">
      <header className="p-4 flex items-center justify-between border-b border-[#1f2937]">
        <div className="text-2xl font-semibold">Volxo</div>
        <div className="flex gap-2">
          <button
            onClick={load}
            className="inline-flex items-center gap-2 bg-[#1f2937] px-3 py-2 rounded"
            title="Recarregar"
          >
            <RefreshCw size={16} /> Atualizar
          </button>
          <button
            onClick={() => setShowNew(true)}
            className="inline-flex items-center gap-2 bg-cyan-400 text-black px-3 py-2 rounded"
          >
            <Plus size={18} /> Nova Instância
          </button>
        </div>
      </header>

      <main className="p-6 max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-4">
          <input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Pesquisar instâncias..."
            className="w-full bg-[#0f1520] border border-[#1f2937] rounded px-3 py-2 outline-none"
          />
          <span className="text-sm text-gray-400">Ativas: {instances?.length || 0}</span>
        </div>

        {loading ? (
          <div className="text-gray-400">Carregando...</div>
        ) : filtered.length === 0 ? (
          <div className="text-gray-400">Nenhuma instância.</div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((it) => {
              const name = it.instance_name;
              const isConnected = !!it.company_id;
              return (
                <div key={name} className="border border-[#1f2937] rounded-xl p-4 bg-[#0f1520]">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm text-gray-300 font-bold">{name}</div>
                    <button
                      className="text-red-300 hover:text-red-400"
                      onClick={() => onDelete(name)}
                      title="Apagar instância"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div className="text-xs text-gray-500 break-all mb-4">
                    GHL: {isConnected ? `Conectado (${it.instance_id})` : "Não conectado"}
                  </div>
                  <div className="text-xs text-gray-500 break-all mb-4">
                    WPP: {it.phone_number || "Não conectado"}
                  </div>

                  <div className="flex gap-2 mt-4">
                    {isConnected ? (
                        <Link
                            to={`/connect/${encodeURIComponent(name)}`}
                            className="inline-flex items-center gap-2 bg-green-500 text-black px-3 py-2 rounded w-full justify-center"
                            >
                            <QrCode size={16} /> Conectar WhatsApp
                        </Link>
                    ) : (
                        <button 
                            onClick={() => window.location.href = API_ENDPOINTS.ghlLogin(name)}
                            className="inline-flex items-center gap-2 bg-cyan-400 text-black px-3 py-2 rounded w-full justify-center"
                        >
                            Conectar GHL
                        </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {showNew && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center">
          <div className="bg-[#0b0f12] border border-[#1f2937] rounded-2xl p-6 w-[480px] flex flex-col gap-4">
            <h3 className="text-xl">Nova Instância</h3>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="ex.: minha-instancia-teste"
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
