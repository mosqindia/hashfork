// ── Smooth Scroll (JS-driven, overrides CSS) ──
document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener('click', e => {
    const href = link.getAttribute('href');
    if (href === '#') {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth' });
      }
    }
  });
});

// ── Reveal ──
const reveals = document.querySelectorAll('.reveal');
const io = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); } });
}, { threshold: 0.12, rootMargin: '0px 0px -30px 0px' });
reveals.forEach(el => io.observe(el));

// ── Feature slider ──
const featureSlider = document.getElementById('featureSlider');
const featureSliderNav = document.getElementById('featureSliderNav');

if (featureSlider && featureSliderNav) {
  const featureSlides = Array.from(featureSlider.querySelectorAll('.feature'));
  let activeFeature = 0;
  let scrollFrame = 0;
  let dragging = false;
  let dragStartX = 0;
  let lastDragX = 0;
  let dragStartFeature = 0;
  let hasDragged = false;
  let suppressClick = false;

  const featureIndicators = featureSlides.map((slide, index) => {
    slide.setAttribute('aria-label', `${index + 1} of ${featureSlides.length}`);
    const indicator = document.createElement('button');
    indicator.type = 'button';
    indicator.className = 'feature-slider-indicator';
    indicator.setAttribute('aria-label', `Go to feature ${index + 1}`);
    indicator.addEventListener('click', () => {
      const sliderRect = featureSlider.getBoundingClientRect();
      const slideRect = slide.getBoundingClientRect();
      featureSlider.scrollTo({
        left: featureSlider.scrollLeft + slideRect.left - sliderRect.left,
        behavior: 'smooth'
      });
    });
    featureSliderNav.appendChild(indicator);
    return indicator;
  });

  function updateActiveFeature() {
    const sliderCenter = featureSlider.getBoundingClientRect().left + featureSlider.clientWidth / 2;
    let closestIndex = 0;
    let closestDistance = Infinity;

    featureSlides.forEach((slide, index) => {
      const slideRect = slide.getBoundingClientRect();
      const distance = Math.abs(slideRect.left + slideRect.width / 2 - sliderCenter);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = index;
      }
    });

    activeFeature = closestIndex;
    featureIndicators.forEach((indicator, index) => {
      indicator.setAttribute('aria-current', String(index === activeFeature));
    });
  }

  featureSlider.addEventListener('scroll', () => {
    if (scrollFrame) return;
    scrollFrame = requestAnimationFrame(() => {
      scrollFrame = 0;
      updateActiveFeature();
    });
  }, { passive: true });

  featureSlider.addEventListener('keydown', event => {
    if (event.target !== featureSlider || (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight')) return;
    event.preventDefault();
    const direction = event.key === 'ArrowRight' ? 1 : -1;
    featureIndicators[Math.max(0, Math.min(activeFeature + direction, featureSlides.length - 1))].click();
  });

  featureSlider.addEventListener('pointerdown', event => {
    if (event.pointerType !== 'mouse' || event.button !== 0 || event.target.closest('a, button, input, select, textarea')) return;
    dragging = true;
    dragStartX = event.clientX;
    lastDragX = event.clientX;
    dragStartFeature = activeFeature;
    hasDragged = false;
  });

  window.addEventListener('pointermove', event => {
    if (!dragging || event.pointerType !== 'mouse') return;
    const distance = event.clientX - dragStartX;
    if (!hasDragged && Math.abs(distance) > 3) {
      hasDragged = true;
      featureSlider.classList.add('is-dragging');
    }
    if (hasDragged) {
      event.preventDefault();
      featureSlider.scrollLeft -= (event.clientX - lastDragX) * 1.5;
    }
    lastDragX = event.clientX;
  });

  function endFeatureDrag() {
    if (!dragging) return;
    dragging = false;
    if (hasDragged) {
      suppressClick = true;
      const dragDistance = dragStartX - lastDragX;
      const swipeThreshold = Math.min(100, featureSlider.clientWidth * 0.12);
      if (Math.abs(dragDistance) >= swipeThreshold) {
        activeFeature = Math.max(
          0,
          Math.min(dragStartFeature + Math.sign(dragDistance), featureSlides.length - 1)
        );
      } else {
        updateActiveFeature();
      }
      featureIndicators[activeFeature].click();
      window.setTimeout(() => { suppressClick = false; }, 0);
    }
    featureSlider.classList.remove('is-dragging');
  }

  window.addEventListener('pointerup', endFeatureDrag);
  window.addEventListener('pointercancel', endFeatureDrag);
  featureSlider.addEventListener('click', event => {
    if (!suppressClick) return;
    event.preventDefault();
    event.stopPropagation();
    suppressClick = false;
  }, true);
  featureSlider.addEventListener('dragstart', event => event.preventDefault());
  window.addEventListener('resize', updateActiveFeature);
  updateActiveFeature();
}

// ── Products carousel ──
const productCarousel = document.getElementById('productCarousel');

if (productCarousel) {
  const productStage = document.getElementById('productStage');
  const productSlides = Array.from(productStage.querySelectorAll('.product-device'));
  const productIndicators = document.getElementById('productIndicators');
  const productCategory = document.getElementById('productCategory');
  const productTitle = document.getElementById('productTitle');
  const productDescription = document.getElementById('productDescription');
  const productPrev = document.getElementById('productPrev');
  const productNext = document.getElementById('productNext');
  let activeProduct = 0;
  let pointerStart = null;

  productStage.querySelectorAll('.product-preview-image').forEach(image => {
    const imageFrame = image.closest('.product-image-frame');
    const updateImageState = () => {
      imageFrame.classList.toggle('has-image', image.complete && image.naturalWidth > 0);
    };
    image.addEventListener('load', updateImageState);
    image.addEventListener('error', () => imageFrame.classList.remove('has-image'));
    if (image.complete) updateImageState();
  });

  const productButtons = productSlides.map((slide, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'product-indicator';
    button.setAttribute('aria-label', `Show ${slide.dataset.title}`);
    button.addEventListener('click', () => showProduct(index));
    productIndicators.appendChild(button);
    return button;
  });

  function showProduct(index) {
    activeProduct = (index + productSlides.length) % productSlides.length;
    const activeSlide = productSlides[activeProduct];
    productSlides.forEach((slide, slideIndex) => {
      const position = (slideIndex - activeProduct + productSlides.length) % productSlides.length;
      slide.classList.toggle('is-active', position === 0);
      slide.classList.toggle('is-next', position === 1);
      slide.classList.toggle('is-prev', position === productSlides.length - 1);
      slide.setAttribute('aria-hidden', String(position !== 0));
    });

    productButtons.forEach((button, buttonIndex) => {
      button.setAttribute('aria-current', String(buttonIndex === activeProduct));
    });
    productCategory.textContent = activeSlide.dataset.category;
    productTitle.textContent = activeSlide.dataset.title;
    productDescription.textContent = activeSlide.dataset.description;
  }

  productPrev.addEventListener('click', () => showProduct(activeProduct - 1));
  productNext.addEventListener('click', () => showProduct(activeProduct + 1));

  productCarousel.addEventListener('keydown', event => {
    if (event.target.closest('button')) return;
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      showProduct(activeProduct - 1);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      showProduct(activeProduct + 1);
    }
  });

  productCarousel.addEventListener('pointerdown', event => {
    if (event.target.closest('.product-controls, button, a, input, select, textarea')) return;
    if (event.button !== undefined && event.button !== 0) return;
    pointerStart = { x: event.clientX, y: event.clientY };
    productCarousel.setPointerCapture(event.pointerId);
  });

  productCarousel.addEventListener('pointerup', event => {
    if (!pointerStart) return;
    const deltaX = event.clientX - pointerStart.x;
    const deltaY = event.clientY - pointerStart.y;
    pointerStart = null;
    if (Math.abs(deltaX) < 40 || Math.abs(deltaX) < Math.abs(deltaY)) return;
    showProduct(activeProduct + (deltaX < 0 ? 1 : -1));
  });

  productCarousel.addEventListener('pointercancel', () => { pointerStart = null; });
  showProduct(activeProduct);
}

// ── Counters ──
document.querySelectorAll('.counter').forEach(el => {
  new IntersectionObserver(([e]) => {
    if (!e.isIntersecting) return;
    const t = parseFloat(el.dataset.target), d = parseInt(el.dataset.decimals), dur = 1800, s = performance.now();
    const ease = x => x < 0.5 ? 4*x*x*x : 1 - Math.pow(-2*x+2,3)/2;
    (function u(n) { const p = Math.min((n-s)/dur,1); el.textContent = (t*ease(p)).toFixed(d); if(p<1) requestAnimationFrame(u); })(s);
    e.target._counted = true;
  }, { threshold: 0.5 }).observe(el);
});

// ── Nav scroll ──
const topNav = document.getElementById('topNav');
window.addEventListener('scroll', () => topNav.classList.toggle('scrolled', scrollY > 60), { passive: true });

// ── Hero grid spotlight ──
const heroGrid = document.querySelector('.hero-grid');
const heroEl = document.getElementById('hero');
let gx = 0, gy = 0, tx = 0, ty = 0;
let mouseInHero = false;

document.addEventListener('mousemove', e => {
  const heroRect = heroEl.getBoundingClientRect();
  const gridRect = heroGrid.getBoundingClientRect();
  const activeTop = heroRect.top + heroRect.height * 0.3;
  // Only track in the bottom 70% of hero
  if (e.clientY >= activeTop && e.clientY <= heroRect.bottom) {
    mouseInHero = true;
    tx = e.clientX - gridRect.left;
    ty = e.clientY - gridRect.top;
  } else {
    mouseInHero = false;
    tx = gridRect.width / 2;
    ty = gridRect.height * 0.3;
  }
});

(function lerpGrid() {
  gx += (tx - gx) * 0.08;
  gy += (ty - gy) * 0.08;
  heroGrid.style.setProperty('--mx', gx + 'px');
  heroGrid.style.setProperty('--my', gy + 'px');
  requestAnimationFrame(lerpGrid);
})();

// ── Active nav + Side panels ──
const navAnchors = document.querySelectorAll('.nav-links a');
const sectionEls = document.querySelectorAll('section[id]');
const leftDots = document.querySelectorAll('.side-panel.left .side-dot');
const rightDots = document.querySelectorAll('.side-panel.right .side-dot');
const leftTrack = document.getElementById('leftTrack');
const rightTrack = document.getElementById('rightTrack');
const scrollPctEl = document.getElementById('scrollPct');

function updateNavAndPanels() {
  const y = scrollY + innerHeight * 0.4;
  const maxScroll = document.documentElement.scrollHeight - innerHeight;
  const pct = Math.min(scrollY / maxScroll, 1);

  // Active nav link
  let id = '', activeIndex = 0;
  sectionEls.forEach((s, i) => { if (y >= s.offsetTop) { id = s.id; activeIndex = i; } });
  navAnchors.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + id));

  // Side panel tracks
  const trackPct = (pct * 100).toFixed(0);
  if (leftTrack) leftTrack.style.height = trackPct + '%';
  if (rightTrack) rightTrack.style.height = trackPct + '%';
  if (scrollPctEl) scrollPctEl.textContent = String(trackPct).padStart(2, '0');

  // Side panel dots
  const leftIdx = Math.min(activeIndex, leftDots.length - 1);
  const rightIdx = Math.min(activeIndex, rightDots.length - 1);
  leftDots.forEach((d, i) => d.classList.toggle('active', i === leftIdx));
  rightDots.forEach((d, i) => d.classList.toggle('active', i === rightIdx));
}

window.addEventListener('scroll', updateNavAndPanels, { passive: true });
updateNavAndPanels();

// ── Mobile menu ──
const toggle = document.getElementById('navToggle'), menu = document.getElementById('mobileMenu');
const menuLinks = menu.querySelectorAll('.mobile-menu-link');
let menuOpen = false;
function openMenu() { menuOpen=true; toggle.classList.add('active'); toggle.setAttribute('aria-expanded','true'); menu.classList.add('open'); document.body.classList.add('menu-open'); }
function closeMenu() { if(!menuOpen) return; menuOpen=false; toggle.classList.remove('active'); toggle.setAttribute('aria-expanded','false'); menu.classList.remove('open'); document.body.classList.remove('menu-open'); }
toggle.addEventListener('click', () => menuOpen ? closeMenu() : openMenu());
menuLinks.forEach(l => l.addEventListener('click', closeMenu));
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });
window.addEventListener('resize', () => { if (innerWidth > 1024) closeMenu(); });

// ── Pricing toggle ──
const pToggle = document.getElementById('pricingToggle');
const mLabel = document.getElementById('monthlyLabel');
const aLabel = document.getElementById('annualLabel');
const saveBadge = document.getElementById('saveBadge');
const monthlyOpts = document.querySelectorAll('.price-option.monthly');
const annualOpts = document.querySelectorAll('.price-option.annual');
let annual = false;

function setPricing() {
  annual = !annual;
  pToggle.classList.toggle('annual', annual);
  pToggle.setAttribute('aria-checked', annual);
  mLabel.classList.toggle('active', !annual);
  aLabel.classList.toggle('active', annual);
  saveBadge.classList.toggle('show', annual);
  monthlyOpts.forEach(el => el.classList.toggle('active', !annual));
  annualOpts.forEach(el => el.classList.toggle('active', annual));
}
pToggle.addEventListener('click', setPricing);
pToggle.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setPricing(); } });

// ── FAQ accordion ──
const faqItems = document.querySelectorAll('.faq-item');
const faqToggleAll = document.getElementById('faqToggleAll');
let allExpanded = false;

document.querySelectorAll('.faq-question').forEach(btn => {
  btn.addEventListener('click', () => {
    btn.parentElement.classList.toggle('open');
    updateFaqToggleLabel();
  });
});

faqToggleAll.addEventListener('click', () => {
  allExpanded = !allExpanded;
  if (allExpanded) {
    // Staggered expand — slow cascade, each waits for the previous to start breathing
    faqItems.forEach((item, i) => {
      setTimeout(() => item.classList.add('open'), i * 220);
    });
  } else {
    // Staggered collapse — reverse order
    const total = faqItems.length;
    faqItems.forEach((item, i) => {
      setTimeout(() => item.classList.remove('open'), (total - 1 - i) * 60);
    });
  }
  // Update label after all animations complete
  setTimeout(updateFaqToggleLabel, faqItems.length * 220 + 100);
});

function updateFaqToggleLabel() {
  const openCount = document.querySelectorAll('.faq-item.open').length;
  allExpanded = openCount === faqItems.length;
  faqToggleAll.textContent = allExpanded ? 'Collapse All' : 'Expand All';
}
