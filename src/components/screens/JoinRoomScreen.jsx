import { useState } from 'react';

export default function JoinRoomScreen({ code, onJoin, onBack, busy, error }) {
  const [name, setName] = useState(() => localStorage.getItem('bigshot-player-name') ?? '');

  return (
    <main className="entry-page">
      <section className="entry-card entry-card--compact">
        <span className="eyebrow">entrar na mesa</span>
        <h1>{code}</h1>
        <p>Escolha o nome que os outros jogadores verão.</p>
        <label className="field-label" htmlFor="join-player-name">Seu nome</label>
        <input
          className="text-input"
          id="join-player-name"
          maxLength="28"
          value={name}
          onChange={(event) => setName(event.target.value)}
          autoFocus
        />
        <button
          className="primary-button entry-primary"
          type="button"
          disabled={busy || !name.trim()}
          onClick={() => {
            localStorage.setItem('bigshot-player-name', name.trim());
            onJoin(code, name.trim());
          }}
        >
          Entrar na mesa
        </button>
        <button className="local-link" type="button" onClick={onBack}>Voltar</button>
        {error && <p className="entry-error" role="alert">{error}</p>}
      </section>
    </main>
  );
}
