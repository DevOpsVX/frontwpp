import { useEffect, useState } from 'react';
import { api } from './config/api';
import ConnectWhatsApp from './ConnectWhatsApp';

export default function App() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [err, setErr] = useState('');
  const [connecting, setConnecting] = useState(null); // instanceName

  async function load() {
    setLoading(true);
    try {
      const resp = await api.listInstances();
      setItems(resp.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function onCreate() {
    setErr('');
    try {
      if (!/^[a-z0-9-]+$/.test(newName.trim())) {
        throw new Error('Use apenas letras minúsculas, números e hífen (-).');
      }
      await api.createInstance(newName.trim());
      setModalOpen(false);
      setNewName('');
      await load();
      setConnecting(newName.trim());
    } catch (e) {
      setErr(e.message || String(e));
    }
  }

  return (
    <div className="p-6 text-white">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Volxo</h1>
        <button
          className="px-3 py-2 rounded bg-cyan-400 text-black"
          onClick={() => setModalOpen(true)}
        >
          + Nova Instância
        </button>
      </div>

      <input
        placeholder="Pesquisar instâncias..."
        className="w-full mb-4 px-3 py-2 rounded bg-[#111] border border-[#333]"
        onChange={() => {}}
      />

      {loading ? (
        <p>Carregando...</p>
      ) : items.length === 0 ? (
        <p>Nenhuma instância.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {items.map((it) => (
            <div key={it.instance_name} className="p-4 rounded bg-[#0b0f12] border border-[#1f2937]">
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-sm text-gray-400">{it.instance_name}</div>
                  <div className="text-xs text-gray-500">
                    {it.phone_number || 'sem número'}
                  </div>
                </div>
                <button
                  className="px-3 py-2 rounded bg-cyan-400 text-black"
                  onClick={() => setConnecting(it.instance_name)}
                >
                  Conectar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center">
          <div className="bg-[#0b0f12] border border-[#1f2937] rounded-xl p-5 w-[420px]">
            <h2 className="text-lg mb-3">Nova Instância</h2>
            <input
              className="w-full mb-2 px-3 py-2 rounded bg-[#111] border border-[#333]"
              placeholder="nome-da-instancia"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            {err && <div className="text-red-300 text-sm mb-2">{err}</div>}
            <div className="flex gap-2 justify-end">
              <button className="px-3 py-2 rounded bg-[#222]" onClick={() => setModalOpen(false)}>
                Cancelar
              </button>
              <button className="px-3 py-2 rounded bg-cyan-400 text-black" onClick={onCreate}>
                Continuar para Login GHL
              </button>
            </div>
          </div>
        </div>
      )}

      {connecting && (
        <ConnectWhatsApp
          instanceName={connecting}
          onClose={() => setConnecting(null)}
        />
      )}
    </div>
  );
}
