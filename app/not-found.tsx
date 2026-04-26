export default function NotFound() {
  return (
    <main className="appShell" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <section style={{ textAlign: 'center' }}>
        <h1>404 - Not Found</h1>
        <p>The page you're looking for doesn't exist.</p>
        <a href="/" style={{ color: 'var(--accent)' }}>
          Return to CityMind
        </a>
      </section>
    </main>
  );
}
