import { HydrationUnit } from "../base/hydration/unit";
import { Site, type SiteVariant } from "./Site";
import { Hero } from "./Hero";
import { Free } from "./sections/Free";
import { Handovers } from "./sections/Handovers";
import { Rest } from "./sections/Rest";
import { Beside } from "./sections/Beside";
import { Closing } from "./sections/Closing";
import "./drawings.css";

// The signed-out homepage, in the order of the owner's approved pages. It ends on the closing call to action.
export function Home({ variant = "instance" }: { variant?: SiteVariant }) {
  return (
    <Site className="oc-home" variant={variant}>
      <main id="main">
        <HydrationUnit><Hero variant={variant} /></HydrationUnit>
        <HydrationUnit><Free variant={variant} /></HydrationUnit>
        <HydrationUnit><Handovers /></HydrationUnit>
        <HydrationUnit><Rest /></HydrationUnit>
        <HydrationUnit><Beside /></HydrationUnit>
        <HydrationUnit><Closing variant={variant} /></HydrationUnit>
      </main>
    </Site>
  );
}
