(() => {
    const figs = [...document.querySelectorAll(".gallery figure")];
    if (!figs.length) return;
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
      img.src = src.src.replace(/format=\d+w/, "format=2500w");
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
