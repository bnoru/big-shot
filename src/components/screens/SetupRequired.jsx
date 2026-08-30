export default function SetupRequired({ onLocal }) {
  return (
    <main className="entry-page">
      <section className="entry-card">
        <span className="eyebrow">configuração necessária</span>
        <h1>Conectar o Supabase</h1>
        <p>O frontend está pronto para multiplayer, mas precisa das duas variáveis de ambiente do seu projeto Supabase.</p>
        <pre className="env-example">VITE_SUPABASE_URL=...{`\n`}VITE_SUPABASE_ANON_KEY=...</pre>
        <p className="setup-note">Execute também <code>supabase/schema.sql</code> no SQL Editor e habilite Anonymous Sign-Ins no painel de Auth.</p>
        <button className="secondary-button" type="button" onClick={onLocal}>Abrir modo local</button>
      </section>
    </main>
  );
}
