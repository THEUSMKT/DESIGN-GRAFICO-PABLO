/* ==========================================================================
   Pablo Cavalheiro · Design Gráfico
   JavaScript puro, sem dependências.
   ========================================================================== */
(() => {
  'use strict';

  const doc = document.documentElement;
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const motionOK = () => !reducedMotion.matches;

  /* ------------------------------------------------------------------
     Imagens: WebP → JPG → moldura de espera
     Se o .webp não existir, cai para o .jpg. Se o .jpg também faltar,
     mostra uma moldura elegante no lugar da foto.
     ------------------------------------------------------------------ */
  const handleImgError = (img) => {
    const picture = img.parentElement && img.parentElement.tagName === 'PICTURE' ? img.parentElement : null;
    const sources = picture ? $$('source', picture) : [];
    if (sources.length) {
      sources.forEach((s) => s.remove());
      return; // o navegador tenta de novo com o src do <img>
    }
    const holder = img.closest('[data-img-frame]') || img.closest('.work');
    if (holder) holder.classList.add('is-missing');
  };
  $$('picture img').forEach((img) => {
    img.addEventListener('error', () => handleImgError(img));
    if (img.complete && img.currentSrc && img.naturalWidth === 0) handleImgError(img);
  });

  /* ------------------------------------------------------------------
     Entrada do hero
     ------------------------------------------------------------------ */
  requestAnimationFrame(() => {
    requestAnimationFrame(() => doc.classList.add('is-ready'));
  });

  /* ------------------------------------------------------------------
     Header: vidro ao rolar + menu mobile
     ------------------------------------------------------------------ */
  const header = $('[data-header]');
  const burger = $('[data-burger]');
  const nav = $('#menu');
  const mqDesktop = window.matchMedia('(min-width: 960px)');

  const setMenu = (open) => {
    header.classList.toggle('menu-open', open);
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
    document.body.classList.toggle('no-scroll', open);
    if (open) {
      const first = $('.nav__link', nav);
      if (first) setTimeout(() => first.focus({ preventScroll: true }), 80);
    }
  };

  if (burger && nav) {
    burger.addEventListener('click', () => setMenu(!header.classList.contains('menu-open')));
    $$('a', nav).forEach((a) => a.addEventListener('click', () => setMenu(false)));

    document.addEventListener('keydown', (e) => {
      if (!header.classList.contains('menu-open')) return;
      if (e.key === 'Escape') {
        setMenu(false);
        burger.focus();
      }
      if (e.key === 'Tab') {
        // mantém o foco dentro do menu aberto
        const focusables = [burger, ...$$('a', nav)];
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    });

    mqDesktop.addEventListener('change', (e) => { if (e.matches) setMenu(false); });
  }

  /* ------------------------------------------------------------------
     Revelação ao rolar + traços desenhados à mão
     ------------------------------------------------------------------ */
  const drawEls = $$('.u-hand__line, .strike, .hand-note__arrow, .verdict__circle svg, .quote__swoosh');
  drawEls.forEach((el) => el.classList.add('draw'));

  if ('IntersectionObserver' in window) {
    const revealIO = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        revealIO.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    $$('[data-reveal]').forEach((el) => revealIO.observe(el));

    const drawIO = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        const inHero = el.closest('.hero');
        if (inHero) el.style.setProperty('--draw-d', el.classList.contains('strike') ? '1.05s' : '1.6s');
        else el.style.setProperty('--draw-d', '.55s');
        el.classList.add('is-drawn');
        drawIO.unobserve(el);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.4 });
    drawEls.forEach((el) => drawIO.observe(el));
  } else {
    $$('[data-reveal]').forEach((el) => el.classList.add('is-visible'));
    drawEls.forEach((el) => el.classList.add('is-drawn'));
  }

  /* ------------------------------------------------------------------
     Menu: destaca a seção atual
     ------------------------------------------------------------------ */
  const navLinks = $$('.nav__link');
  if ('IntersectionObserver' in window && navLinks.length) {
    const map = new Map();
    navLinks.forEach((link) => {
      const target = $(link.getAttribute('href'));
      if (target) map.set(target, link);
    });
    const spyIO = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const link = map.get(entry.target);
        if (!link) return;
        if (entry.isIntersecting) {
          navLinks.forEach((l) => { l.classList.remove('is-active'); l.removeAttribute('aria-current'); });
          link.classList.add('is-active');
          link.setAttribute('aria-current', 'true');
        } else if (link.classList.contains('is-active')) {
          link.classList.remove('is-active');
          link.removeAttribute('aria-current');
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    map.forEach((_, section) => spyIO.observe(section));
  }

  /* ------------------------------------------------------------------
     Rolagem: header, parallax, aurora e linha do tempo (um único rAF)
     ------------------------------------------------------------------ */
  const aurora = $('.aurora');
  const parallaxEls = $$('[data-parallax]');
  const timeline = $('[data-timeline]');
  const timelineFill = $('[data-timeline-fill]');
  const steps = $$('[data-step]');
  let ticking = false;

  const onScrollFrame = () => {
    ticking = false;
    const y = window.scrollY;
    const vh = window.innerHeight;

    header.classList.toggle('is-scrolled', y > 24);

    if (motionOK()) {
      if (aurora) {
        const max = Math.max(1, document.documentElement.scrollHeight - vh);
        aurora.style.transform = `translate3d(0, ${(-(y / max) * vh * 0.25).toFixed(1)}px, 0)`;
      }
      parallaxEls.forEach((el) => {
        const r = el.parentElement.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) return;
        const speed = parseFloat(el.dataset.parallax) || 0.05;
        const offset = (r.top + r.height / 2 - vh / 2) * speed;
        el.style.transform = `translate3d(0, ${offset.toFixed(1)}px, 0)`;
      });
    }

    if (timeline && timelineFill) {
      const r = timeline.getBoundingClientRect();
      const trigger = vh * 0.62;
      const progress = clamp((trigger - r.top) / (r.height - 60), 0, 1);
      timelineFill.style.transform = `scaleY(${progress.toFixed(4)})`;
      steps.forEach((step) => {
        const sr = step.getBoundingClientRect();
        step.classList.toggle('is-active', sr.top + 28 < trigger);
      });
    }
  };

  const requestFrame = () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(onScrollFrame);
    }
  };
  window.addEventListener('scroll', requestFrame, { passive: true });
  window.addEventListener('resize', requestFrame, { passive: true });
  onScrollFrame();

  /* ------------------------------------------------------------------
     Cursor personalizado (desktop)
     ------------------------------------------------------------------ */
  const cursor = $('.cursor');
  if (cursor && finePointer.matches && motionOK()) {
    doc.classList.add('has-cursor');
    const ring = $('.cursor__ring', cursor);
    const dot = $('.cursor__dot', cursor);
    let x = -100, y = -100, rx = -100, ry = -100;
    let running = false;
    cursor.classList.add('is-hidden');

    const loop = () => {
      rx += (x - rx) * 0.2;
      ry += (y - ry) * 0.2;
      ring.style.transform = `translate3d(${rx.toFixed(2)}px, ${ry.toFixed(2)}px, 0)`;
      if (Math.abs(x - rx) > 0.1 || Math.abs(y - ry) > 0.1) {
        requestAnimationFrame(loop);
      } else {
        running = false;
      }
    };

    window.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      x = e.clientX;
      y = e.clientY;
      dot.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      cursor.classList.remove('is-hidden');
      if (!running) {
        running = true;
        requestAnimationFrame(loop);
      }
    }, { passive: true });

    const hoverSel = 'a, button, summary, [data-tilt], .work__btn, [role="button"]';
    document.addEventListener('pointerover', (e) => {
      if (e.target.closest(hoverSel)) cursor.classList.add('is-hover');
    });
    document.addEventListener('pointerout', (e) => {
      if (e.target.closest(hoverSel) && !(e.relatedTarget && e.relatedTarget.closest && e.relatedTarget.closest(hoverSel))) {
        cursor.classList.remove('is-hover');
      }
    });
    document.addEventListener('pointerdown', () => cursor.classList.add('is-down'));
    document.addEventListener('pointerup', () => cursor.classList.remove('is-down'));
    document.documentElement.addEventListener('mouseleave', () => cursor.classList.add('is-hidden'));
  }

  /* ------------------------------------------------------------------
     Botões magnéticos
     ------------------------------------------------------------------ */
  if (finePointer.matches && motionOK()) {
    $$('[data-magnetic]').forEach((el) => {
      let rect = null;
      el.addEventListener('pointerenter', () => { rect = el.getBoundingClientRect(); });
      el.addEventListener('pointermove', (e) => {
        if (!rect) rect = el.getBoundingClientRect();
        const dx = e.clientX - (rect.left + rect.width / 2);
        const dy = e.clientY - (rect.top + rect.height / 2);
        el.style.setProperty('--mx', `${(dx * 0.22).toFixed(1)}px`);
        el.style.setProperty('--my', `${(dy * 0.3).toFixed(1)}px`);
      });
      el.addEventListener('pointerleave', () => {
        rect = null;
        el.style.setProperty('--mx', '0px');
        el.style.setProperty('--my', '0px');
      });
    });
  }

  /* ------------------------------------------------------------------
     Cards com tilt 3D + brilho seguindo o mouse
     ------------------------------------------------------------------ */
  if (finePointer.matches && motionOK()) {
    $$('[data-tilt]').forEach((card) => {
      const glare = $('.svc__glare', card);
      let rect = null;
      card.addEventListener('pointerenter', () => {
        rect = card.getBoundingClientRect();
        card.classList.add('is-tilting');
      });
      card.addEventListener('pointermove', (e) => {
        if (!rect) rect = card.getBoundingClientRect();
        const px = (e.clientX - rect.left) / rect.width;
        const py = (e.clientY - rect.top) / rect.height;
        const rX = (0.5 - py) * 10;
        const rY = (px - 0.5) * 12;
        card.style.transform = `perspective(900px) rotateX(${rX.toFixed(2)}deg) rotateY(${rY.toFixed(2)}deg) translateZ(0)`;
        if (glare) {
          glare.style.transform = `translate3d(${(px * rect.width).toFixed(1)}px, ${(py * rect.height).toFixed(1)}px, 0) translate(-50%, -50%)`;
        }
      });
      card.addEventListener('pointerleave', () => {
        rect = null;
        card.classList.remove('is-tilting');
        card.style.transform = '';
      });
    });
  }

  /* ------------------------------------------------------------------
     Contadores animados
     ------------------------------------------------------------------ */
  const counters = $$('[data-count]');
  const renderCount = (el, value) => {
    const n = 'thousands' in el.dataset ? value.toLocaleString('pt-BR') : value;
    el.textContent = `${el.dataset.prefix || ''}${n}${el.dataset.suffix || ''}`;
  };
  if (counters.length && 'IntersectionObserver' in window && motionOK()) {
    counters.forEach((el) => renderCount(el, 0));
    const countIO = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        countIO.unobserve(el);
        const target = parseInt(el.dataset.count, 10) || 0;
        const duration = 1800;
        const start = performance.now();
        const tick = (now) => {
          const t = clamp((now - start) / duration, 0, 1);
          const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
          renderCount(el, Math.round(target * eased));
          if (t < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
    }, { threshold: 0.6 });
    counters.forEach((el) => countIO.observe(el));
  }

  /* ------------------------------------------------------------------
     Portfólio: filtros + lightbox
     ------------------------------------------------------------------ */
  const works = $$('.work');
  const filters = $$('.filter');
  const filterStatus = $('[data-filter-status]');

  filters.forEach((btn) => {
    btn.addEventListener('click', () => {
      const f = btn.dataset.filter;
      filters.forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
      let count = 0;
      works.forEach((w) => {
        const show = f === 'all' || w.dataset.cat === f;
        w.hidden = !show;
        w.classList.remove('is-in');
        if (show) {
          count += 1;
          w.classList.add('is-visible');
          void w.offsetWidth; // reinicia a animação
          w.classList.add('is-in');
        }
      });
      if (filterStatus) filterStatus.textContent = `${count} ${count === 1 ? 'projeto exibido' : 'projetos exibidos'}`;
    });
  });

  const lightbox = $('[data-lightbox]');
  if (lightbox && typeof lightbox.showModal === 'function') {
    const lbImg = $('[data-lightbox-img]', lightbox);
    const lbCaption = $('[data-lightbox-caption]', lightbox);
    const btnPrev = $('[data-lightbox-prev]', lightbox);
    const btnNext = $('[data-lightbox-next]', lightbox);
    let list = [];
    let index = 0;

    const show = (i) => {
      index = (i + list.length) % list.length;
      const work = list[index];
      const img = $('img', work);
      const cat = $('.work__cat', work).textContent;
      const title = $('.work__title', work).textContent;
      lbImg.src = img.currentSrc || img.src;
      lbImg.alt = img.alt;
      lbCaption.innerHTML = '';
      lbCaption.append(document.createTextNode(`${title} `));
      const small = document.createElement('span');
      small.textContent = `· ${cat} · ${index + 1}/${list.length}`;
      lbCaption.append(small);
      const single = list.length < 2;
      btnPrev.hidden = single;
      btnNext.hidden = single;
      // reinicia a animação de entrada
      const fig = $('.lightbox__figure', lightbox);
      fig.style.animation = 'none';
      void fig.offsetWidth;
      fig.style.animation = '';
    };

    works.forEach((work) => {
      $('.work__btn', work).addEventListener('click', () => {
        list = works.filter((w) => !w.hidden && !w.classList.contains('is-missing'));
        const i = list.indexOf(work);
        if (i < 0) return;
        show(i);
        lightbox.showModal();
        document.body.classList.add('no-scroll');
      });
    });

    btnPrev.addEventListener('click', () => show(index - 1));
    btnNext.addEventListener('click', () => show(index + 1));
    $('[data-lightbox-close]', lightbox).addEventListener('click', () => lightbox.close());
    lightbox.addEventListener('close', () => document.body.classList.remove('no-scroll'));
    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox || e.target.classList.contains('lightbox__inner')) lightbox.close();
    });
    lightbox.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') show(index - 1);
      if (e.key === 'ArrowRight') show(index + 1);
    });

    // gesto de deslizar no celular
    let startX = null;
    lightbox.addEventListener('pointerdown', (e) => { startX = e.clientX; });
    lightbox.addEventListener('pointerup', (e) => {
      if (startX === null || list.length < 2) return;
      const dx = e.clientX - startX;
      if (Math.abs(dx) > 60) show(index + (dx < 0 ? 1 : -1));
      startX = null;
    });
  }

  /* ------------------------------------------------------------------
     Carrossel de depoimentos
     ------------------------------------------------------------------ */
  const carousel = $('[data-carousel]');
  if (carousel) {
    const track = $('.carousel__track', carousel);
    const cards = $$('.t-card', track);
    const dotsWrap = $('[data-carousel-dots]', carousel);
    const prev = $('[data-carousel-prev]');
    const next = $('[data-carousel-next]');

    const step = () => {
      const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
      return cards[0].getBoundingClientRect().width + gap;
    };
    const maxIndex = () => Math.max(0, Math.round((track.scrollWidth - track.clientWidth) / step()));
    const current = () => Math.round(track.scrollLeft / step());
    const behavior = () => (motionOK() ? 'smooth' : 'auto');
    const goTo = (i) => track.scrollTo({ left: clamp(i, 0, maxIndex()) * step(), behavior: behavior() });

    const dots = cards.map((_, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('aria-label', `Ir para o depoimento ${i + 1}`);
      b.addEventListener('click', () => goTo(i));
      dotsWrap.append(b);
      return b;
    });

    const update = () => {
      const last = maxIndex();
      const i = Math.min(current(), last);
      dotsWrap.hidden = last === 0;
      dots.forEach((d, n) => {
        d.hidden = n > last;
        d.setAttribute('aria-current', String(n === i));
      });
      if (prev) prev.disabled = i <= 0;
      if (next) next.disabled = i >= last;
      carousel.classList.toggle('at-end', i >= last);
    };

    let raf = null;
    track.addEventListener('scroll', () => {
      if (raf) return;
      raf = requestAnimationFrame(() => { raf = null; update(); });
    }, { passive: true });
    window.addEventListener('resize', update, { passive: true });
    if (prev) prev.addEventListener('click', () => goTo(current() - 1));
    if (next) next.addEventListener('click', () => goTo(current() + 1));
    track.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') { e.preventDefault(); goTo(current() + 1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(current() - 1); }
    });
    update();
  }

  /* ------------------------------------------------------------------
     FAQ: abre um item por vez
     ------------------------------------------------------------------ */
  const faqItems = $$('.faq-item');
  faqItems.forEach((item) => {
    item.addEventListener('toggle', () => {
      if (!item.open) return;
      faqItems.forEach((other) => { if (other !== item) other.open = false; });
    });
  });
})();
