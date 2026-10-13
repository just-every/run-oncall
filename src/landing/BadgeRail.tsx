import { Note } from "./Drawn";
import "./badgeRail.css";

// The closing drawing: a wooden peg rail with four lanyard badges and a coat on the last peg
// (public/brand/badge-rail.webp, drawn with blank badges and empty now and next pills). The words
// on the badges and the note are real text laid over the drawing. Sample people and times: the
// Checkout weekly rota, Priya on now and Tom next at Mon 09:00, as in the hero.
export function BadgeRail() {
  return (
    <figure className="oc-rail">
      <div className="oc-rail-stage">
        <img
          className="oc-rail-img"
          src="/brand/badge-rail.webp"
          srcSet="/brand/badge-rail-1x.webp 838w, /brand/badge-rail.webp 1676w"
          sizes="(max-width: 599px) 560px, (max-width: 1179px) 730px, 50vw"
          width="1676"
          height="1150"
          alt="A wooden peg rail with four name badges on lanyards and a blue coat on the last peg."
        />
        <ul className="oc-rail-badges">
          <li className="oc-rail-b1">
            <span className="oc-rail-pill">now</span>
            <strong>Priya Shah</strong>
          </li>
          <li className="oc-rail-b2">
            <span className="oc-rail-pill">next</span>
            <strong>Tom Okafor</strong>
            <i className="oc-rail-rule" aria-hidden="true" />
            <time>Mon 09:00</time>
          </li>
          <li className="oc-rail-b3">
            <strong>Ana Ruiz</strong>
            <i className="oc-rail-rule" aria-hidden="true" />
          </li>
          <li className="oc-rail-b4">
            <strong>Sam Lee</strong>
            <i className="oc-rail-rule" aria-hidden="true" />
          </li>
        </ul>
        <Note arrow="rail-next" className="oc-rail-note">Next up.<br />Same team.<br />You got this.</Note>
      </div>
    </figure>
  );
}
