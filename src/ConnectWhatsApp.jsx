import { useEffect, useRef, useState } from 'react';
import { api } from './config/api';
import QRCode from 'react-qr-code';

export default function ConnectWhatsApp({ instanceName, onClose }) {
  const [qr, setQr] = useState('');
  const [status, setStatus] = useState('Aguardando QR...');
  const esRef = useRef(null);

  useEffect(() => {
    if (!instanceName) return;

    // abre o stream e escuta
    esRef.current = api.openQrStream(instanceName, (evt, payload) => {
      if (evt === 'qr') {
        setQr(payload.qr);
        setStatus('Escaneie o QR Code');
      } else if (evt === 'status') {
        if (payload.authenticated) setStatus('Autenticado! Aguardando pronto...');
        if (payload.ready) setStatus('Conectado. Você já pode fechar.');
        if (payload.disconnected) setStatus('Desconectado.');
      } else if (evt === 'error') {
        setStatus('Falha ao solicitar conexão. Tente novamente.');
      }
    });

    return () => {
      try {
        esRef.current?.close();
      } catch {}
    };
  }, [instanceName]);

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center">
      <div className="bg-[#0b0f12] border border-[#1f2937] rounded-2xl p-6 w-[460px] flex flex-col items-center gap-4">
        <h3 className="text-xl">Escaneie o QR Code</h3>
        <div className="bg-white p-4 rounded">{qr ? <QRCode value={qr} /> : <div className="w-[256px] h-[256px]" />}</div>
        <div className="text-sm text-gray-300">{status}</div>
        <div className="flex gap-2">
          <button className="px-3 py-2 rounded bg-[#222]" onClick={onClose}>
            Fechar
          </button>
          <button
            className="px-3 py-2 rounded bg-cyan-400 text-black"
            onClick={() => {
              try { esRef.current?.close(); } catch {}
              setQr('');
              setStatus('Atualizando QR...');
              esRef.current = api.openQrStream(instanceName, (evt, payload) => {
                if (evt === 'qr') { setQr(payload.qr); setStatus('Escaneie o QR Code'); }
                if (evt === 'status') {
                  if (payload.authenticated) setStatus('Autenticado! Aguardando pronto...');
                  if (payload.ready) setStatus('Conectado. Você já pode fechar.');
                  if (payload.disconnected) setStatus('Desconectado.');
                }
                if (evt === 'error') setStatus('Falha ao solicitar conexão. Tente novamente.');
              });
            }}
          >
            Atualizar QR
          </button>
        </div>
      </div>
    </div>
  );
}
