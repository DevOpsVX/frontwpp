# Volxo - Gerenciador de Instâncias WhatsApp

Sistema moderno e profissional para gerenciamento de instâncias WhatsApp com identidade visual Volxo.

## 🎨 Características

- **Design Moderno**: Interface dark com detalhes em azul neon
- **UX/UI Avançada**: Animações suaves, feedback visual e interações intuitivas
- **Responsivo**: Funciona perfeitamente em desktop, tablet e mobile
- **Gerenciamento Completo**: Criar, reiniciar e excluir instâncias
- **QR Code Dinâmico**: Geração de QR Code com barra de progresso
- **Link de Conexão**: Compartilhe links para clientes conectarem seus números
- **Persistência de Dados**: Dados salvos no localStorage

## 🚀 Tecnologias

- **React 18** - Framework JavaScript
- **Vite** - Build tool ultra-rápido
- **Tailwind CSS** - Framework CSS utilitário
- **React Router** - Navegação entre páginas
- **Lucide React** - Ícones modernos
- **React QR Code** - Geração de QR Codes

## 📦 Instalação

```bash
# Instalar dependências
pnpm install

# Ou com npm
npm install

# Ou com yarn
yarn install
```

## 🎯 Como Usar

### Desenvolvimento

```bash
# Iniciar servidor de desenvolvimento
pnpm dev

# Ou com npm
npm run dev

# Ou com yarn
yarn dev
```

O aplicativo estará disponível em `http://localhost:5173`

### Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto (mesmo nível do `package.json`) com as seguintes variáveis para configurar a integração com o GoHighLevel:

```env

VITE_GHL_CLIENT_ID="seu-client-id-do-ghl" # opcional (há um padrão configurado para produção)

```


> **Importante:** O app já inclui um Client ID e Redirect URI padrão utilizados em produção. Defina as variáveis acima apenas se
> precisar sobrescrever esses valores (por exemplo, em ambientes de homologação ou desenvolvimento).


### Build para Produção

```bash
# Criar build otimizado
pnpm build

# Ou com npm
npm run build

# Ou com yarn
yarn build
```

### Preview da Build

```bash
# Visualizar build de produção
pnpm preview

# Ou com npm
npm run preview

# Ou com yarn
yarn preview
```

## 📱 Funcionalidades

### Dashboard (Página Principal)

- **Criar Instância**: Botão "Nova Instância" no topo direito
- **Visualizar Instâncias**: Cards com informações de cada instância
- **Pesquisar**: Campo de busca para filtrar instâncias
- **Estatísticas**: Total de instâncias e instâncias ativas
- **Ações por Instância**:
  - 🔗 **Conectar**: Abre a tela de QR Code
  - 🔄 **Reiniciar**: Reinicia a instância
  - 🗑️ **Excluir**: Remove a instância (com confirmação)

### Tela de Conexão (QR Code)

- **Gerar QR Code**: Botão para iniciar a conexão
- **Barra de Progresso**: Mostra tempo restante (45 segundos)
- **Alertas Visuais**: Aviso quando o tempo está acabando
- **Regenerar QR**: Gere um novo QR Code quando expirar
- **Link de Conexão**: Copie e compartilhe com clientes
- **Acesso Restrito**: Clientes veem apenas a tela de QR Code

## 🎨 Identidade Visual Volxo

### Cores

- **Fundo Principal**: `#0a0a0a` (Preto profundo)
- **Fundo Cards**: `#111111` (Preto suave)
- **Primary (Azul Neon)**: `#00ffff` (Cyan)
- **Texto**: `#ffffff` (Branco)
- **Texto Secundário**: Tons de cinza

### Efeitos

- **Neon Glow**: Brilho azul neon em elementos interativos
- **Text Shadow Neon**: Sombra de texto com efeito neon
- **Animações**: Transições suaves e pulse neon
- **Bordas**: Bordas sutis com transparência do azul neon

## 📁 Estrutura do Projeto

```
meu-dashboard/
├── src/
│   ├── App.jsx           # Componente principal com rotas
│   ├── main.jsx          # Ponto de entrada
│   ├── index.css         # Estilos globais + Tailwind
│   └── logo-volxo.png    # Logo da Volxo
├── index.html            # HTML base
├── package.json          # Dependências
├── vite.config.js        # Configuração Vite
├── tailwind.config.js    # Configuração Tailwind
├── postcss.config.js     # Configuração PostCSS
└── README.md             # Este arquivo
```

## 🔧 Configurações Importantes

### Tailwind CSS

O arquivo `tailwind.config.js` contém:
- Cores personalizadas da Volxo
- Sombras neon customizadas
- Animações de pulse neon
- Utilitários de text-shadow

### Vite

O arquivo `vite.config.js` está configurado para:
- Usar plugin React
- Servidor local na porta 5173
- Host acessível externamente

## 🌐 Rotas

- `/` - Dashboard principal
- `/connect/:instanceId` - Tela de conexão QR Code

## 💾 Persistência de Dados

Os dados das instâncias são salvos automaticamente no `localStorage` do navegador com a chave `volxo_whatsapp_instances`.

## 🎯 Próximos Passos

Para integrar com backend real:

1. Substituir `localStorage` por chamadas API
2. Implementar autenticação de usuários
3. Conectar com API real do WhatsApp
4. Adicionar websockets para status em tempo real
5. Implementar logs e histórico de conexões

## 📝 Licença

Desenvolvido para Volxo - Todos os direitos reservados.

## 🤝 Suporte

Para dúvidas ou suporte, entre em contato com a equipe Volxo.

---

**Desenvolvido com ❤️ e ⚡ para Volxo**

