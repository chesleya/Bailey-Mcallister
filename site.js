// Editable site text and photos: content/site.json (edited in Pages CMS).
(async () => {
  let d;
  try { d = await (await fetch("content/site.json", { cache: "no-cache" })).json(); } catch (e) { return; }
  const sized = (src, w) => /squarespace-cdn\.com/.test(src) ? `${src.split("?")[0]}?format=${w}w` : src;
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  document.querySelectorAll("[data-field]").forEach(el => {
    const k = el.dataset.field, v = d[k];
    if (!v) return;
    if (k === "about_photo") el.src = sized(v, 1000);
    else if (k === "about_text") el.innerHTML = String(v).split(/\n\s*\n/).map(p => `<p>${esc(p.trim())}</p>`).join("");
    else if (k === "email") { el.href = "mailto:" + v; el.textContent = v; }
    else if (k === "instagram") el.href = v;
    else el.textContent = v;
  });
})();

// Home gallery: rendered from content/gallery.json (edited in Pages CMS), plus the lightbox.
(async () => {
  const gallery = document.getElementById("gallery");
  if (!gallery) return;

  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  // Squarespace URLs get a size hint; local photos use the 1000px copy made by the photo workflow.
  const sized = (src, w) => /squarespace-cdn\.com/.test(src) ? `${src.split("?")[0]}?format=${w}w`
    : (w <= 1000 && /^\/?images\/[^/]+$/.test(src)) ? src.replace(/images\//, "images/w1000/") : src;

  let photos = [];
  try {
    const res = await fetch("content/gallery.json", { cache: "no-cache" });
    const data = await res.json();
    // Projects (each with photos) flatten into one gallery; the older flat "photos" list still works.
    photos = data.projects
      ? data.projects.flatMap(pr => (pr.photos || []).map(ph => ({ ...ph, project: pr.name })))
      : (data.photos || []);
  } catch (e) {
    gallery.innerHTML = "<p>Photos are taking a moment. Try refreshing.</p>";
    return;
  }

  gallery.innerHTML = photos.filter(p => p.image).map((p, n) => `
    <figure>
      <img src="${esc(sized(p.image, 1000))}" data-large="${esc(sized(p.image, 2500))}" data-n="${n}" data-full="${esc(p.image)}" loading="lazy"
           alt="${esc([p.project, p.caption].filter(Boolean).join(" — "))}">
      <figcaption>${p.project ? `<strong>${esc(p.project)}</strong>` : ""}${esc(p.caption)}</figcaption>
    </figure>`).join("");

  // If a 1000px copy isn't ready yet (photo just uploaded), fall back to the original.
  gallery.querySelectorAll("img").forEach(im => im.addEventListener("error", () => {
    if (im.src !== new URL(im.dataset.full, location.href).href) im.src = im.dataset.full;
  }, { once: true }));

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
