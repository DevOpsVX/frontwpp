// src/App.jsx
import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useParams } from 'react-router-dom';
import {
  API_ENDPOINTS,
  apiRequest,
  reserveInstance,
  deleteInstance,
  disconnectInstance,
  resolveGhlLoginUrl,
} from './config/api';
import './index.css';
import logo from './logo-volxo.png';

// ---------------------
// Home (lista + criar)
// ---------------------
function Home() {
  const [instances, setInstances] = useState([]);
  const [loading, setLoading] = useState(false);

  // Modal state
  const [showNewModal, setShowNewModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newErr, setNewErr] = useState('');

  async function loadInstances() {
    setLoading(true);
    try {
      const data = await apiRequest(API_ENDPOINTS.listInstances());
      setInstances(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Falha ao listar instâncias:', e);
      setInstances([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadInstances();
  }, []);

  function openNew() {
    setNewName('');
    setNewErr('');
    setShowNewModal(true);
  }
  function closeNew() {
    setShowNewModal(false);
  }

  function validateName(name) {
    if (!name) return 'instanceName é obrigatório';
    if (!/^[a-z0-9-]+$/.test(name)) {
      return 'Use apenas minúsculas, números e hífens';
    }
    if (name.length > 40) return 'Máx. 40 caracteres';
    return '';
  }

  async function submitNew() {
    const name = newName.trim();
    const v = validateName(name);
    if (v) {
      setNewErr(v);
      return;
    }
    setNewErr('');
    try {
      // 1) Reservar no Supabase (garante unicidade antes do OAuth)
      await reserveInstance(name);
      // 2) Redirecionar para o OAuth do GHL com instanceName
      const url = await resolveGhlLoginUrl(name);
      window.location.href = url;
    } catch (e) {
      const msg = String(e.message || '');
      if (msg.includes('23505') || msg.toLowerCase().includes('duplicate')) {
        setNewErr('Já existe uma instância com esse nome.');
      } else {
        setNewErr(`Erro: ${msg}`);
      }
    }
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="max-w-6xl mx-auto px-4 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src={logo} alt="Volxo" className="h-8" />
          <div className="text-sm opacity-80">Gerenciador de Instâncias WhatsApp</div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadInstances}
            className="px-4 py-2 rounded bg-gray-800 hover:bg-gray-700"
          >
            Atualizar
          </button>
          <button
            onClick={openNew}
            className="px-4 py-2 rounded bg-cyan-400 text-black font-semibold hover:bg-cyan-300"
          >
            + Nova Instância
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 pb-16">
        <div className="mb-4 text-sm opacity-80">
          {loading ? 'Carregando…' : `Ativas: ${instances.length}`}
        </div>

        {instances.length === 0 ? (
          <div className="opacity-70">Nenhuma instância.</div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {instances.map((it) => (
              <InstanceCard key={it.instance_name} it={it} onChange={loadInstances} />
            ))}
          </div>
        )}
      </main>

      {showNewModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="w-[520px] max-w-[90vw] rounded-2xl bg-[#0f1114] border border-white/10 p-6 shadow-xl">
            <div className="text-lg font-semibold mb-1">Nova Instância</div>
            <div className="text-xs opacity-70 mb-4">
              Apenas letras minúsculas, números e hífens (-)
            </div>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full rounded bg-black/60 border border-white/10 px-3 py-2 outline-none focus:border-cyan-400"
              placeholder="ex.: minha-agencia-01"
            />
            {newErr && (
              <div className="text-amber-300 text-xs mt-2">
                {newErr}
              </div>
            )}
            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                onClick={closeNew}
                className="px-4 py-2 rounded bg-gray-800 hover:bg-gray-700"
              >
                Cancelar
              </button>
              <button
                onClick={submitNew}
                className="px-4 py-2 rounded bg-cyan-400 text-black font-semibold hover:bg-cyan-300"
              >
                Continuar para Login GHL
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------
// Card da instância
// ---------------------
function InstanceCard({ it, onChange }) {
  const navigate = useNavigate();

  async function onDelete() {
    try {
      await deleteInstance(it.instance_name);
      alert('Instância apagada.');
      onChange();
    } catch (e) {
      alert(`Falha ao apagar: ${e.message}`);
    }
  }

  async function onDisconnect() {
    try {
      await disconnectInstance(it.instance_name);
      alert('Desconectado.');
      onChange();
    } catch (e) {
      alert(`Falha ao desconectar: ${e.message}`);
    }
  }

  function onConnect() {
    navigate(`/connect/${encodeURIComponent(it.instance_name)}`);
  }

  return (
    <div className="rounded-xl bg-[#101215] border border-white/10 p-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="font-semibold">{it.instance_name}</div>
          {it.instance_id && (
            <div className="text-xs opacity-70 mt-1">{it.instance_id}</div>
          )}
        </div>
        <button
          onClick={onDelete}
          className="text-red-400 hover:text-red-300 text-sm"
          title="Apagar"
        >
          🗑
        </button>
      </div>

      <div className="mt-4 flex gap-2">
        <button
          onClick={onConnect}
          className="px-3 py-2 rounded bg-cyan-400 text-black text-sm font-semibold hover:bg-cyan-300"
        >
          Conectar
        </button>
        <button
          onClick={onDisconnect}
          className="px-3 py-2 rounded bg-gray-800 hover:bg-gray-700 text-sm"
        >
          Desconectar
        </button>
      </div>
    </div>
  );
}

// ---------------------
// Dummy Connect page (mantida)
// ---------------------
function ConnectPage() {
  const { instanceName } = useParams();
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="opacity-80 text-sm">
        Tela de conexão / QR para <span className="font-semibold">{instanceName}</span>.
      </div>
    </div>
  );
}

// ---------------------
// Router
// ---------------------
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/connect/:instanceName" element={<ConnectPage />} />
      </Routes>
    </BrowserRouter>
  );
}
