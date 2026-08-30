# Big Shot Online

Versão 0.11: cor verde no lugar do marfim e seleção de cores pelo anfitrião no lobby.

Protótipo web multiplayer inspirado em Big Shot, preparado para GitHub Pages + Supabase.

## Estado atual — v0.10

- tabuleiro central com arte própria;
- 18 espaços de leilão em HTML;
- distribuição válida dos 72 cubos;
- corretor e dado;
- leilões, passes e empréstimos;
- colocação de cubos e resolução de lotes;
- pontuação final, incluindo lotes x2;
- lobby multiplayer para quatro jogadores;
- salas por código;
- sincronização pelo Supabase Realtime;
- deploy automático pelo GitHub Actions;
- configuração de produção já ligada ao projeto Supabase Big Shot.

## Publicação

Consulte `GITHUB_SETUP.md`. Não é necessário instalar Node/npm no computador.

Repositório alvo: `bnoru/big-shot`

URL esperada após ativar o Pages: `https://bnoru.github.io/big-shot/`

## Segurança

O frontend usa apenas a URL pública e a Publishable Key do Supabase. A autorização dos dados é feita por Row Level Security (RLS) e funções RPC no banco. Nunca use uma Secret Key ou `service_role` no frontend.
