# Publicar em bnoru/big-shot sem instalar nada localmente

Esta versão foi preparada especificamente para o repositório:

`https://github.com/bnoru/big-shot`

O projeto Supabase já está configurado e a URL + Publishable Key estão em `.env.production`.
Isso é apropriado para uma aplicação web: a Publishable Key não é uma chave secreta e a segurança dos dados é feita pelo RLS do Supabase. Nunca coloque uma `service_role` ou Secret Key no frontend.

## 1. Confirmar Anonymous Sign-Ins no Supabase

No Supabase:

**Authentication → Providers → Anonymous Sign-Ins**

Deixe habilitado.

## 2. Enviar os arquivos ao GitHub

Abra:

`https://github.com/bnoru/big-shot`

Se o repositório estiver vazio, use **uploading an existing file**. Se já houver arquivos, use **Add file → Upload files**.

Descompacte o ZIP desta versão e envie **o conteúdo da pasta**, não o ZIP.

É importante que, na raiz do repositório, apareçam diretamente:

- `package.json`
- `index.html`
- `vite.config.js`
- `.env.production`
- `src/`
- `public/`
- `.github/workflows/deploy.yml`

Faça o commit na branch `main`.

## 3. Ativar GitHub Pages

No repositório:

**Settings → Pages → Build and deployment → Source → GitHub Actions**

Não é necessário configurar Secrets ou Variables para o Supabase nesta versão.

## 4. Acompanhar o deploy

Abra a aba **Actions**. O workflow **Deploy Big Shot to GitHub Pages** fará automaticamente:

1. instalação do Node no servidor do GitHub;
2. instalação das dependências;
3. testes da lógica do jogo;
4. build do Vite;
5. publicação no GitHub Pages.

Quando terminar, o site deverá ficar em:

`https://bnoru.github.io/big-shot/`

## Atualizações futuras

Qualquer commit novo na branch `main` dispara outra publicação automaticamente.
