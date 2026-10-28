import { InlineConfirm } from '../app/autosave/InlineConfirm'
export function ImportStep({ busy, confirm, back }: { busy: boolean; confirm: () => void; back: () => void }) {
 return <section className="scheduling-panel move-in-step" aria-labelledby="move-in-import-title">
  <h2 id="move-in-import-title">3 · Import paused</h2>
  <InlineConfirm action="Confirm paused import" keep="Back to review" busy={busy} onConfirm={confirm} onCancel={back}>Keep the reviewed schedules and people paused? Nothing starts paging. You can undo this import before adopting or activating its data.</InlineConfirm>
 </section>
}
