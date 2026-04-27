<script lang="ts">
  import {
    endDemoStoryIntro,
    endDemoStorySlides,
  } from "$lib/components/app/end-demo-story";

  interface EndDemoModalProps {
    onClose?: () => void;
    onOpenMainMenu?: () => void;
    open?: boolean;
    startIndex?: number;
  }

  let {
    onClose,
    onOpenMainMenu,
    open = true,
    startIndex = 0,
  }: EndDemoModalProps = $props();

  const slideCount = endDemoStorySlides.length;
  let activeIndex = $state(0);

  const clampSlideIndex = (index: number) =>
    Math.max(0, Math.min(slideCount - 1, Math.trunc(index)));

  const close = () => {
    onClose?.();
  };

  const openMainMenu = () => {
    onOpenMainMenu?.();
  };

  const showPrevious = () => {
    activeIndex = (activeIndex + slideCount - 1) % slideCount;
  };

  const showNext = () => {
    activeIndex = (activeIndex + 1) % slideCount;
  };

  const selectSlide = (index: number) => {
    activeIndex = clampSlideIndex(index);
  };

  const activeSlide = $derived(endDemoStorySlides[activeIndex]);

  $effect(() => {
    if (open) {
      activeIndex = clampSlideIndex(startIndex);
    }
  });
</script>

<section class="panel end-demo-panel">
  <div class="comic-shell">
    <figure class="comic-frame">
      <img
        alt={activeSlide.alt}
        decoding="async"
        fetchpriority="high"
        loading="eager"
        src={activeSlide.image}
      >
    </figure>

    <div class="story-copy">
      <p class="eyebrow">{endDemoStoryIntro.kicker}</p>
      <h2 id="end-demo-title">{endDemoStoryIntro.title}</h2>
      <p id="end-demo-copy" class="intro">{endDemoStoryIntro.body}</p>

      <div class="chapter">
        <span>{activeSlide.eyebrow}</span>
        <div>
          <h3>{activeSlide.title}</h3>
          <p>{activeSlide.body}</p>
        </div>
      </div>
    </div>
  </div>

  <div class="carousel-controls" aria-label="Comic panels">
    <button
      aria-label="Previous comic panel"
      class="icon-button"
      type="button"
      onclick={showPrevious}
    >
      <span aria-hidden="true">&lt;</span>
    </button>

    <div class="slide-dots">
      {#each endDemoStorySlides as slide, index (slide.id)}
        <button
          aria-current={index === activeIndex ? "step" : undefined}
          aria-label={`Show comic panel ${index + 1}: ${slide.title}`}
          class:active={index === activeIndex}
          type="button"
          onclick={() => selectSlide(index)}
        ></button>
      {/each}
    </div>

    <button
      aria-label="Next comic panel"
      class="icon-button"
      type="button"
      onclick={showNext}
    >
      <span aria-hidden="true">&gt;</span>
    </button>
  </div>

  <div class="demo-actions">
    <button class="text-button" type="button" onclick={close}>Close</button>
    <button class="primary" type="button" onclick={openMainMenu}>
      Main Menu
    </button>
  </div>
</section>

<style>
  .end-demo-panel {
    position: relative;
    grid-template-rows: minmax(0, 1fr) auto auto;
    gap: 0.9rem;
    inline-size: min(68rem, 100%);
    max-block-size: min(44rem, calc(100dvh - 2rem));
    overflow: hidden;
  }

  .comic-shell {
    display: grid;
    grid-template-columns: minmax(0, 1.55fr) minmax(18rem, 0.8fr);
    gap: clamp(0.85rem, 1.8vw, 1.25rem);
    min-block-size: 0;
  }

  .comic-frame {
    position: relative;
    min-block-size: 0;
    margin: 0;
    overflow: hidden;
    background: #111414;
    border: 1px solid rgba(255, 255, 255, 0.11);
    border-radius: 6px;
  }

  .comic-frame img {
    display: block;
    inline-size: 100%;
    block-size: 100%;
    min-block-size: 18rem;
    object-fit: cover;
  }

  .story-copy {
    display: grid;
    gap: 0.85rem;
    align-content: center;
    min-block-size: 0;
    padding: clamp(0.45rem, 1vw, 0.85rem) clamp(0.25rem, 0.8vw, 0.65rem);
  }

  .eyebrow,
  .intro,
  .chapter p,
  h2,
  h3 {
    margin: 0;
  }

  .eyebrow {
    font-size: 0.72rem;
    font-weight: 800;
    color: rgba(221, 200, 154, 0.7);
    text-transform: uppercase;
    letter-spacing: 0.2em;
  }

  h2 {
    max-inline-size: 14ch;
    font-family: "Palatino Linotype", "Book Antiqua", Georgia, serif;
    font-size: clamp(1.9rem, 3vw, 3rem);
    font-weight: 400;
    line-height: 0.98;
    color: #f9e9bc;
    letter-spacing: 0;
  }

  .intro {
    max-inline-size: 34rem;
    font-size: clamp(0.95rem, 1vw, 1.08rem);
    line-height: 1.55;
    color: rgba(226, 231, 222, 0.78);
  }

  .chapter {
    display: grid;
    grid-template-columns: 2rem 1fr;
    gap: 0.75rem;
    align-items: start;
    padding-block-start: 0.2rem;
  }

  .chapter span {
    display: grid;
    place-items: center;
    inline-size: 2rem;
    block-size: 2rem;
    font-size: 0.75rem;
    font-weight: 900;
    color: #0a0d0d;
    background: #d8b35f;
    border-radius: 50%;
    box-shadow: 0 0 22px rgba(216, 179, 95, 0.22);
  }

  h3 {
    font-size: clamp(1rem, 1.3vw, 1.25rem);
    line-height: 1.2;
    color: #f7f0dc;
  }

  .chapter p {
    margin-block-start: 0.28rem;
    line-height: 1.45;
    color: rgba(226, 231, 222, 0.66);
  }

  .carousel-controls {
    display: grid;
    grid-template-columns: 2.4rem 1fr 2.4rem;
    gap: 0.7rem;
    align-items: center;
    justify-self: center;
    inline-size: min(24rem, 100%);
  }

  .icon-button {
    display: grid;
    place-items: center;
    inline-size: 2.4rem;
    block-size: 2.4rem;
    padding: 0;
    font: inherit;
    font-size: 1.25rem;
    font-weight: 900;
    color: rgba(247, 240, 220, 0.88);
    cursor: pointer;
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.13);
    border-radius: 6px;
  }

  .icon-button:hover,
  .icon-button:focus-visible {
    color: #fff7db;
    background: rgba(216, 179, 95, 0.18);
    border-color: rgba(216, 179, 95, 0.38);
  }

  .slide-dots {
    display: flex;
    flex-wrap: wrap;
    gap: 0.55rem;
    justify-content: center;
  }

  .slide-dots button {
    inline-size: 0.8rem;
    block-size: 0.8rem;
    padding: 0;
    cursor: pointer;
    background: rgba(255, 255, 255, 0.22);
    border: 0;
    border-radius: 50%;
  }

  .slide-dots button.active {
    background: #d8b35f;
    box-shadow: 0 0 18px rgba(216, 179, 95, 0.52);
  }

  .demo-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.65rem;
    justify-content: flex-end;
  }

  .demo-actions button {
    min-inline-size: 7.5rem;
    min-block-size: 2.6rem;
    padding: 0.66rem 0.9rem;
    font: inherit;
    font-weight: 800;
    color: rgba(246, 251, 255, 0.88);
    cursor: pointer;
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 6px;
  }

  .demo-actions button.primary {
    color: #07100f;
    background: #d8b35f;
    border-color: rgba(216, 179, 95, 0.75);
  }

  .demo-actions button:hover,
  .demo-actions button:focus-visible {
    border-color: rgba(247, 240, 220, 0.32);
  }

  @media (max-width: 820px) {
    .end-demo-panel {
      inline-size: min(100%, 42rem);
      max-block-size: calc(100dvh - 1.4rem);
      overflow-y: auto;
    }

    .comic-shell {
      grid-template-columns: 1fr;
    }

    .comic-frame img {
      min-block-size: 0;
      max-block-size: 44dvh;
      aspect-ratio: 16 / 9;
    }

    .story-copy {
      align-content: start;
    }

    .demo-actions {
      justify-content: stretch;
    }

    .demo-actions button {
      flex: 1 1 9rem;
    }
  }
</style>
