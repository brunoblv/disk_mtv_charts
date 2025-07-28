import Link from 'next/link';
import styles from './page.module.css'; // Importa os estilos do CSS Module

export default function HomePage() {
  return (
    <main className={styles.container}>
      <h1 className={styles.title}>
        Disk MTV - Last.fm Charts
      </h1>

      <div className={styles.cardsGrid}>
        {/* Card de Álbuns */}
        <Link href="/albums" className={styles.card}>
            <span className={styles.icon}>💿</span>
            <h2>Ranking de Álbuns</h2>
            <p>Visualize o ranking dos álbuns mais ouvidos no período.</p>
        </Link>

        {/* Card de Músicas */}
        <Link href="/songs" className={styles.card}>
            <span className={styles.icon}>🎵</span>
            <h2>Ranking de Músicas</h2>
            <p>Explore o ranking das  músicas mais tocadas.</p>
        </Link>
      </div>
    </main>
  );
}