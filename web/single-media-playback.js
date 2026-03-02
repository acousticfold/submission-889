// Prevent several audio/video files from playing at the same time.
// Use event delegation so dynamically inserted media elements are covered too.
document.addEventListener(
  "play",
  (event) => {
    const target = event.target;

    if (!(target instanceof HTMLMediaElement)) {
      return;
    }

    document.querySelectorAll("audio, video").forEach((media) => {
      if (media !== target) {
        media.pause();
      }
    });
  },
  true
);
