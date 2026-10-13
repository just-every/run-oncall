import { Site } from "./Site";
import { Hero } from "./Hero";
import { Free } from "./sections/Free";
import { Handovers } from "./sections/Handovers";
import { Rest } from "./sections/Rest";
import { Beside } from "./sections/Beside";
import { Closing } from "./sections/Closing";
import "./drawings.css";

// The signed-out homepage, in the order of the owner's approved pages. It ends on the closing call to action.
export function Home() {
  return (
    <Site className="oc-home">
      <main id="main">
        <Hero />
        <Free />
        <Handovers />
        <Rest />
        <Beside />
        <Closing />
      </main>
    </Site>
  );
}
