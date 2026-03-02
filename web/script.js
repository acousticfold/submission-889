// Single media playback functionality is in single-media-playback.js

document.addEventListener("DOMContentLoaded", () => {
  const tabs = Array.from(document.querySelectorAll(".content-tab"));
  const panels = Array.from(document.querySelectorAll(".tab-panel"));

  if (!tabs.length || !panels.length) {
    return;
  }

  const activateTab = (targetId) => {
    tabs.forEach((tab) => {
      const isActive = tab.dataset.tabTarget === targetId;
      tab.classList.toggle("is-active", isActive);
      tab.setAttribute("aria-selected", String(isActive));
    });

    panels.forEach((panel) => {
      const isActive = panel.id === targetId;
      panel.classList.toggle("is-active", isActive);
      panel.hidden = !isActive;
    });
  };

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => activateTab(tab.dataset.tabTarget));
  });
});

function scrollToNext() {
  const nextSection = document.querySelector('.content-tabs-shell');
  if (nextSection) {
    nextSection.scrollIntoView({ 
      behavior: 'smooth',
      block: 'start'
    });
  }
}
