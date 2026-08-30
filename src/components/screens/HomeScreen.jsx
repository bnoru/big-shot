import { useState } from 'react';

export default function HomeScreen({ onCreate, onJoin, onLocal, busy, error }) {
  const [name, setName] = useState(() => localStorage.getItem('bigshot-player-name') ?? '');
  const [code, setCode] = useState('');

  function rememberName() {
    const clean = name.trim();
    if (clean) localStorage.setItem('bigshot-player-name', clean);
    return clean;
  }

  return (
    <main className="entry-page">
      <section className="entry-card">
        <span className="eyebrow">BIG SHOT ONLINE · protótipo 0.8</span>
        <h1>Mesa digital</h1>
        <p>Crie uma mesa e envie o código para mais três jogadores.</p>

        <label className="field-label" htmlFor="player-name">Seu nome</label>
        <input
          className="text-input"
          id="player-name"
          maxLength="28"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Nome na mesa"
          autoComplete="nickname"
        />

        <button
          className="primary-button entry-primary"
          type="button"
          disabled={busy || !name.trim()}
          onClick={() => onCreate(rememberName())}
        >
          Criar mesa
        </button>

        <div className="entry-divider"><span>ou</span></div>

        <label className="field-label" htmlFor="room-code">Código da mesa</label>
        <div className="join-row">
          <input
            className="text-input room-code-input"
            id="room-code"
            maxLength="6"
            value={code}
            onChange={(event) => setCode(event.target.value.toUpperCase())}
            placeholder="ABC123"
            autoCapitalize="characters"
          />
          <button
            className="secondary-button join-button"
            type="button"
            disabled={busy || !name.trim() || !code.trim()}
            onClick={() => onJoin(code, rememberName())}
          >
            Entrar
          </button>
        </div>

        {error && <p className="entry-error" role="alert">{error}</p>}

        {onLocal && (
          <button className="local-link" type="button" disabled={busy} onClick={() => onLocal(rememberName() || 'Jogador 1')}>
            Testar uma partida local
          </button>
        )}
      </section>
    </main>
  );
}
