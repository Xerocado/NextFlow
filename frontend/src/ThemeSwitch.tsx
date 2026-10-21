import { useEffect, useState } from 'react'

type Tema = 'claro' | 'escuro'

function temaInicial(): Tema {
  try {
    const salvo = localStorage.getItem('nextflow.tema.v1')
    if (salvo === 'claro' || salvo === 'escuro') return salvo
  } catch { /* A interface funciona mesmo com armazenamento bloqueado. */ }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'escuro' : 'claro'
}

export default function ThemeSwitch() {
  const [tema, setTema] = useState<Tema>(temaInicial)
  useEffect(() => {
    document.documentElement.dataset.tema = tema
    document.documentElement.style.colorScheme = tema === 'escuro' ? 'dark' : 'light'
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', tema === 'escuro' ? '#1e2024' : '#183d54')
    try { localStorage.setItem('nextflow.tema.v1', tema) } catch { /* Preferencia opcional. */ }
  }, [tema])

  return <div className="seletor-tema" role="group" aria-label="Tema da interface">
    <button type="button" aria-label="Modo claro" title="Modo claro" aria-pressed={tema === 'claro'} onClick={() => setTema('claro')}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" /></svg>
    </button>
    <button type="button" aria-label="Modo escuro" title="Modo escuro" aria-pressed={tema === 'escuro'} onClick={() => setTema('escuro')}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M20.7 13.2A9 9 0 0 1 10.8 3.3a9 9 0 1 0 9.9 9.9Z" /></svg>
    </button>
  </div>
}
