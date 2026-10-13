import { Note, StatePill } from "./Drawn";
import "./handover.css";

// The hero drawing: two hands passing clip-on name badges (public/brand/handover.webp, drawn with
// blank badges). The words on the badges and the notes are real text laid over the drawing, turned
// to sit on each badge. The homepage hero and the sign-in door share it.
// Sample people and times: the Checkout weekly rota, Priya on now and Tom next at Mon 09:00.
export function Handover({ notes = true }: { notes?: boolean }) {
  return (
    <figure className="oc-handover">
      <div className="oc-handover-stage">
        <img
          className="oc-handover-img"
          src="/brand/handover.webp"
          srcSet="/brand/handover-1x.webp 846w, /brand/handover.webp 1692w"
          sizes="(max-width: 599px) 580px, (max-width: 1179px) 720px, 50vw"
          width="1692"
          height="818"
          alt="Two drawn hands passing a clip-on name badge to the next person."
        />
        <div className="oc-hb oc-hb-now">
          <StatePill state="now">now</StatePill>
          <strong>Priya Shah</strong>
          <small>Checkout · Europe/London</small>
        </div>
        <div className="oc-hb oc-hb-next">
          <StatePill state="next">next</StatePill>
          <strong>Tom Okafor</strong>
          <small>Checkout · Europe/London</small>
          <time>Mon 09:00</time>
        </div>
        {notes && (
          <>
            <Note arrow="hero-now" className="oc-handover-note oc-handover-note-now">On call now.<br />Until Mon 09:00.</Note>
            <Note arrow="hero-next" className="oc-handover-note oc-handover-note-next">Next up.<br />Same team.<br />You got this.</Note>
          </>
        )}
      </div>
    </figure>
  );
}
