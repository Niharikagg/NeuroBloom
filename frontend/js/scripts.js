/* 
  ================================================================
  NEUROBLOOM — INTERACTIVE SCRIPT
  ================================================================
  Handles navigation states, scroll-triggered animations,
  and micro-interactions for assessments and smooth internal links.
*/

document.addEventListener('DOMContentLoaded', () => {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  /** 
    * --- NAVIGATION ---
    * Updates navbar styling when scrolling down to improve design consistency.
    */
  const navbar = document.getElementById('navbar');
  window.addEventListener('scroll', () => {
    // Add the 'scrolled' class if the page has been scrolled more than 50px vertically.
    if (navbar && window.scrollY > 50) {
      navbar.classList.add('scrolled');
    } else if (navbar) {
      navbar.classList.remove('scrolled');
    }
  });

  /** 
    * --- SCROLL ANIMATIONS (INTERSECTION OBSERVER) ---
    * Triggers entrance animations when specific elements become visible on screen.
    */
  const observerOptions = {
    threshold: 0.1,         // Triggers when 10% of the element is visible.
    rootMargin: '0px 0px -50px 0px' // Slightly offset the trigger point for a smoother reveal.
  };

  if (prefersReducedMotion || document.body.classList.contains('low-stimulation')) {
    document.querySelectorAll('.feat-card, .step, .test-card, .insight-card, .stat-item, .screening-inner').forEach(el => {
      el.style.opacity = '1';
      el.style.transform = 'none';
      el.style.transition = 'none';
    });
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        // Fade and Slide In: Reset opacity and transformation to final state.
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
        
        // --- PROGRESS BAR REVEAL ---
        // Special logic for Insight Card bars within the "How it Works" section.
        if (entry.target.classList.contains('insight-card')) {
          const bar = entry.target.querySelector('.ic-fill');
          if (bar) {
            // Momentarily reset width to zero then back to target value to trigger CSS transition.
            const targetWidth = bar.style.width;
            bar.style.width = '0';
            setTimeout(() => bar.style.width = targetWidth, 100);
          }
        }
      }
    });
  }, observerOptions);

  // Monitor all major layout components for entrance animations.
  document.querySelectorAll('.feat-card, .step, .test-card, .insight-card, .stat-item, .screening-inner').forEach(el => {
    // Set initial invisible state for a smooth reveal effect.
    el.style.opacity = '0';
    el.style.transform = 'translateY(30px)';
    el.style.transition = 'all 1s cubic-bezier(0.16, 1, 0.3, 1)';
    observer.observe(el); // Let the observer handle the timing.
  });
});

/** 
  * --- SMOOTH SCROLL HELPER ---
  * Scrolls to a specific element by ID with a custom vertical offset (for sticky headers).
  * @param {string} id - The ID attribute of the element to scroll to.
  */
function scrollToSection(id) {
  const element = document.getElementById(id);
  if (!element) return;
  
  const offset = 80; // Account for the height of the sticky navigation.
  const bodyRect = document.body.getBoundingClientRect().top;
  const elementRect = element.getBoundingClientRect().top;
  const elementPosition = elementRect - bodyRect;
  const offsetPosition = elementPosition - offset;

  // Utilize the browser's native smooth scroll API.
  window.scrollTo({
    top: offsetPosition,
    behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches || document.body.classList.contains('low-stimulation')
      ? 'auto'
      : 'smooth'
  });
}

/** 
  * --- INTERACTIVE QUESTION CARDS ---
  * Small logic to handle selection states in the Assessment demo.
  */

// Activates the highlight on a specific question card when clicked.
function activateQuestion(el) {
  document.querySelectorAll('.q-card').forEach(card => card.classList.remove('active'));
  el.classList.add('active');
}

// Handles selecting an option within a question card (e.g., "Always", "Sometimes").
function selectOption(el, event) {
  // Prevent the click event from triggering parent card activation logic again.
  if (event) event.stopPropagation();
  const parent = el.parentElement;
  
  // Highlight only the selected option in this group.
  parent.querySelectorAll('.q-opt').forEach(opt => opt.classList.remove('sel'));
  el.classList.add('sel');
}

// Expose functions to window for HTML onclick attributes (since this is a module)
window.scrollToSection = scrollToSection;
window.activateQuestion = activateQuestion;
window.selectOption = selectOption;
