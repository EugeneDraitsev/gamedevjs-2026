import castleRoadImage from "$lib/assets/end-demo/comic-castle-road.webp";
import escapeMachineImage from "$lib/assets/end-demo/comic-escape-machine.webp";
import prisonCellImage from "$lib/assets/end-demo/comic-prison-cell.webp";

export interface EndDemoStorySlide {
  alt: string;
  body: string;
  eyebrow: string;
  id: string;
  image: string;
  title: string;
}

export const endDemoStoryIntro = {
  kicker: "Run complete",
  title: "From cell to castle road",
  body: "Orb Knight starts locked inside the machine, rebuilds itself from recovered parts, and wins the outside gate. The demo ends after the Gate Keeper falls, with the castle-machine waiting ahead and other orbs still trapped inside.",
};

export const endDemoStorySlides: EndDemoStorySlide[] = [
  {
    id: "prison",
    eyebrow: "I",
    title: "The cell",
    body: "The run begins in a sealed chamber. Orb Knight has a blade, a locked dome, and one way out: tear the machine open from inside.",
    image: prisonCellImage,
    alt: "Orb Knight trapped inside a glowing blue containment dome in a dark clockwork prison chamber.",
  },
  {
    id: "machine",
    eyebrow: "II",
    title: "After the second boss",
    body: "Two wardens later, the engine-prison cracks. The old gears still turn behind Orb Knight, but daylight finally reaches the floor.",
    image: escapeMachineImage,
    alt: "Orb Knight leaving a dark clockwork machine through a torn opening toward daylight.",
  },
  {
    id: "castle",
    eyebrow: "III",
    title: "Gate Keeper defeated",
    body: "The outside guardian falls and the last gate opens. Ahead waits the castle-machine, too large to solve in this prototype, and the captive orbs Orb Knight still has to free.",
    image: castleRoadImage,
    alt: "Orb Knight standing on a road before a huge clockwork castle built into a mountain.",
  },
];
