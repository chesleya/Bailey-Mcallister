// Home gallery: rendered from content/gallery.json (edited in Pages CMS), plus the lightbox.
(async () => {
  const gallery = document.getElementById("gallery");
  if (!gallery) return;

  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  // Squarespace URLs get a size hint; photos uploaded through Pages CMS are used as-is.
  const sized = (src, w) => /squarespace-cdn\.com/.test(src) ? `${src.split("?")[0]}?format=${w}w` : src;

  let photos = [];
  try {
    const res = await fetch("content/gallery.json", { cache: "no-cache" });
    photos = (await res.json()).photos || [];
  } catch (e) {
    gallery.innerHTML = "<p>Photos are taking a moment. Try refreshing.</p>";
    return;
  }

  gallery.innerHTML = photos.filter(p => p.image).map((p, n) => `
    <figure>
      <img src="${esc(sized(p.image, 1000))}" data-large="${esc(sized(p.image, 2500))}" data-n="${n}"
           alt="${esc([p.project, p.caption].filter(Boolean).join(" — "))}">
      <figcaption>${p.project ? `<strong>${esc(p.project)}</strong>` : ""}${esc(p.caption)}</figcaption>
    </figure>`).join("");

  // Lightbox
  const figs = [...gallery.querySelectorAll("figure")];
  const lb = document.createElement("div");
  lb.className = "lightbox";
  lb.setAttribute("role", "dialog");
  lb.setAttribute("aria-modal", "true");
  lb.innerHTML = '<button class="lb-close" aria-label="Close">&times;</button><button class="lb-prev" aria-label="Previous">&#8249;</button><img alt=""><div class="lb-cap"></div><button class="lb-next" aria-label="Next">&#8250;</button>';
  document.body.appendChild(lb);
  const img = lb.querySelector("img"), cap = lb.querySelector(".lb-cap");
  let i = 0;
  const show = n => {
    i = (n + figs.length) % figs.length;
    const src = figs[i].querySelector("img");
    img.src = src.dataset.large;
    img.alt = src.alt;
    cap.innerHTML = figs[i].querySelector("figcaption").innerHTML;
  };
  const open = n => { show(n); lb.classList.add("open"); document.body.classList.add("lb-open"); };
  const close = () => { lb.classList.remove("open"); document.body.classList.remove("lb-open"); };
  figs.forEach((f, n) => f.querySelector("img").addEventListener("click", () => open(n)));
  lb.querySelector(".lb-close").onclick = close;
  lb.querySelector(".lb-prev").onclick = e => { e.stopPropagation(); show(i - 1); };
  lb.querySelector(".lb-next").onclick = e => { e.stopPropagation(); show(i + 1); };
  lb.addEventListener("click", e => { if (e.target === lb || e.target === img) close(); });
  document.addEventListener("keydown", e => {
    if (!lb.classList.contains("open")) return;
    if (e.key === "Escape") close();
    if (e.key === "ArrowLeft") show(i - 1);
    if (e.key === "ArrowRight") show(i + 1);
  });
})();
