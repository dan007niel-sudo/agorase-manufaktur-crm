import { useState } from 'react'
import { MOCKUP_PRODUCT_MODES, type DropConcept, type MockupProductMode } from '@agorase/shared'
import { generateDropConcepts } from '../../api/creativeApi'
import { PanelHeader } from '../../components/Panel'

export interface CreativeLabViewProps {
  // Send a generated mockup prompt to the Mockup Studio tab. Lifted to App so the
  // sibling tab can pick it up without remounting (RHE-Lesson: `hidden` keeps state).
  onSendToMockupStudio: (prompt: string) => void
}

export function CreativeLabView({ onSendToMockupStudio }: CreativeLabViewProps) {
  const [theme, setTheme] = useState('')
  const [tone, setTone] = useState('')
  const [productMode, setProductMode] = useState<MockupProductMode>('Oversized Shirt')
  const [concepts, setConcepts] = useState<DropConcept[]>([])
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [error, setError] = useState('')

  async function handleGenerate() {
    if (!theme.trim()) {
      setError('Bitte gib ein Thema ein.')
      setStatus('error')
      return
    }
    setStatus('loading')
    setError('')
    try {
      const next = await generateDropConcepts({ theme: theme.trim(), tone: tone.trim(), productMode })
      setConcepts(next)
      setStatus('idle')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Creative Lab fehlgeschlagen.')
      setStatus('error')
    }
  }

  return (
    <section className="creative-lab-layout">
      <aside className="panel creative-lab-workspace">
        <PanelHeader title="Drop-Konzept" />
        <p className="helper-copy">
          Definiere Thema, Ton und Hero-Piece. Der KI-Service liefert dir Story, Palette und
          fertige Mockup-Prompts, die du direkt an das Mockup Studio übergeben kannst.
        </p>
        <label>
          Thema
          <input
            value={theme}
            onChange={(event) => setTheme(event.target.value)}
            placeholder="z. B. ruhige Stärke, urbaner Minimalismus"
          />
        </label>
        <label>
          Ton
          <input
            value={tone}
            onChange={(event) => setTone(event.target.value)}
            placeholder="z. B. clean, premium, direkt"
          />
        </label>
        <div>
          <span className="field-label">Hero-Piece</span>
          <div className="creative-lab-filters">
            {MOCKUP_PRODUCT_MODES.map((mode) => (
              <button
                key={mode}
                type="button"
                className={mode === productMode ? 'chip selected' : 'chip'}
                aria-pressed={mode === productMode}
                onClick={() => setProductMode(mode)}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>
        {status === 'error' && <div className="error-box">{error}</div>}
        <button
          type="button"
          className="primary-button"
          onClick={() => void handleGenerate()}
          disabled={status === 'loading'}
        >
          {status === 'loading' ? 'Generiere…' : 'Konzepte generieren'}
        </button>
      </aside>

      <section className="panel creative-lab-list">
        <PanelHeader title="Konzepte" />
        {concepts.length === 0 ? (
          <div className="empty-state">Noch keine Konzepte. Starte mit Thema, Ton und Hero-Piece.</div>
        ) : (
          <div className="creative-lab-cards">
            {concepts.map((concept, index) => (
              <article key={`${concept.title}-${index}`} className="creative-lab-card">
                <div className="creative-lab-card-body">
                  <span>{concept.heroPiece}</span>
                  <strong>{concept.title}</strong>
                  <small>{concept.story}</small>
                  {concept.palette.length > 0 && (
                    <div className="creative-lab-filters">
                      {concept.palette.map((color) => (
                        <span key={color} className="chip">{color}</span>
                      ))}
                    </div>
                  )}
                  {concept.printDirection && (
                    <small>
                      <strong>Print-Direction:</strong> {concept.printDirection}
                    </small>
                  )}
                  {concept.mockupPrompt && (
                    <small>
                      <strong>Mockup-Prompt:</strong> {concept.mockupPrompt}
                    </small>
                  )}
                  {concept.productionNotes.length > 0 && (
                    <small>
                      <strong>Produktion:</strong> {concept.productionNotes.join(' · ')}
                    </small>
                  )}
                </div>
                <button
                  type="button"
                  className="primary-button"
                  disabled={!concept.mockupPrompt}
                  onClick={() => onSendToMockupStudio(concept.mockupPrompt)}
                >
                  Als Mockup-Prompt übernehmen
                </button>
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  )
}
