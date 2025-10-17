# 🚀 Guia de Deploy - Volxo WhatsApp Frontend

## ✅ Código já está no GitHub!

O frontend foi enviado para: **https://github.com/DevOpsVX/frontwpp**

## 🌐 Deploy na Vercel (Recomendado)

### Opção 1: Via Interface Web (Mais Fácil)

1. **Acesse**: https://vercel.com
2. **Faça login** com sua conta GitHub
3. Clique em **Add New** → **Project**
4. **Importe** o repositório: `DevOpsVX/frontwpp`
5. Configure:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

6. **Adicione Variáveis de Ambiente**:
   ```
   VITE_API_URL=https://volxowppconect.onrender.com
   VITE_WS_URL=wss://volxowppconect.onrender.com
   ```

7. Clique em **Deploy**

8. Aguarde ~2 minutos

9. **Pronto!** Sua URL será algo como:
   ```
   https://frontwpp.vercel.app
   ```

### Opção 2: Via CLI

```bash
# 1. Instalar Vercel CLI
npm install -g vercel

# 2. Fazer login
vercel login

# 3. Navegar até a pasta
cd ~/frontwpp  # ou onde você clonou

# 4. Deploy
vercel

# 5. Configurar variáveis de ambiente
vercel env add VITE_API_URL production
# Cole: https://volxowppconect.onrender.com

vercel env add VITE_WS_URL production
# Cole: wss://volxowppconect.onrender.com

# 6. Deploy em produção
vercel --prod
```

---

## 🔧 Após o Deploy

### 1. Atualizar Backend

Acesse o Render e atualize a variável `FRONTEND_URL`:

1. https://dashboard.render.com
2. Selecione `volxowppconect`
3. **Environment** → Edite `FRONTEND_URL`
4. Cole a URL da Vercel (ex: `https://frontwpp.vercel.app`)
5. **Save Changes**

### 2. Atualizar GoHighLevel

Adicione a URL da Vercel nas Redirect URLs:

1. https://marketplace.gohighlevel.com
2. **My Apps** → Seu app
3. **Advanced Settings** → **Auth**
4. **Redirect URLs** → Adicione:
   ```
   https://frontwpp.vercel.app
   ```
5. **Save**

---

## 🌐 Deploy na Netlify (Alternativa)

### Via Interface Web

1. **Acesse**: https://app.netlify.com
2. **New site from Git**
3. **GitHub** → Autorize → Selecione `DevOpsVX/frontwpp`
4. Configure:
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
5. **Environment variables**:
   ```
   VITE_API_URL=https://volxowppconect.onrender.com
   VITE_WS_URL=wss://volxowppconect.onrender.com
   ```
6. **Deploy site**

### Via CLI

```bash
# 1. Instalar Netlify CLI
npm install -g netlify-cli

# 2. Login
netlify login

# 3. Deploy
cd ~/frontwpp
netlify deploy --prod
```

---

## 📊 Verificação

Após o deploy, teste:

1. ✅ Acesse a URL do frontend
2. ✅ Clique em "Nova Instância"
3. ✅ Verifique se redireciona para OAuth do GHL
4. ✅ Após OAuth, verifique se volta para tela de QR Code
5. ✅ Teste conexão WhatsApp

---

## 🐛 Troubleshooting

### Erro: "Failed to load module"
**Solução**: Limpe cache e rebuild
```bash
vercel --force
```

### Erro: "API not reachable"
**Solução**: Verifique se as variáveis de ambiente estão corretas

### Erro: "OAuth redirect mismatch"
**Solução**: Adicione a URL da Vercel nas Redirect URLs do GHL

---

## 🔄 Deploys Automáticos

A Vercel faz deploy automático a cada push no GitHub:

```bash
# Fazer mudanças
git add .
git commit -m "feat: nova funcionalidade"
git push

# Vercel detecta e faz deploy automaticamente!
```

---

## 📝 URLs Importantes

- **GitHub**: https://github.com/DevOpsVX/frontwpp
- **Vercel Dashboard**: https://vercel.com/dashboard
- **Backend (Render)**: https://volxowppconect.onrender.com
- **Supabase**: https://supabase.com/dashboard

---

**Desenvolvido com ❤️ para Volxo**

