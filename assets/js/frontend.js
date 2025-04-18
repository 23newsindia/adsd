document.addEventListener('DOMContentLoaded', function() {
    initAllCarousels();
    setupAjaxObserver();
});

function initAllCarousels() {
    const carousels = document.querySelectorAll('.pc-carousel-wrapper:not(.initialized)');
    carousels.forEach(carousel => {
        try {
            new ProductCarousel(carousel);
            carousel.classList.add('initialized');
        } catch (error) {
            console.error('Carousel init error:', error);
            fallbackToGrid(carousel);
        }
    });
}

function setupAjaxObserver() {
    if (typeof MutationObserver !== 'undefined') {
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.addedNodes.length) {
                    initAllCarousels();
                }
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }
}

function fallbackToGrid(carousel) {
    const container = carousel.querySelector('.pc-carousel-container');
    if (container) {
        container.style.display = 'grid';
        container.style.gridTemplateColumns = 'repeat(auto-fill, minmax(200px, 1fr))';
        container.style.gap = '20px';
    }
    const nav = carousel.querySelectorAll('.pc-carousel-prev, .pc-carousel-next');
    nav.forEach(btn => btn.style.display = 'none');
}

class ProductCarousel {
    constructor(wrapper) {
        this.wrapper = wrapper;
        this.container = wrapper.querySelector('.pc-carousel-container');
        this.slides = Array.from(this.container.children);
        this.currentIndex = 0;
        this.isMobile = window.innerWidth < 768;
        this.touchStartX = 0;
        this.touchEndX = 0;
        this.containerStartX = 0;
        this.isDragging = false;
        this.resizeTimeout = null;
        this.autoplayInterval = null;
        this.slidePositions = [];
        this.velocity = 0;
        this.lastMoveTime = 0;
        this.lastMoveX = 0;
        this.clickedElement = null;
      this.cacheKey = Date.now(); // For cache busting
        this.loadedSlug = wrapper.dataset.slug;
      this.setupMutationObserver();
        
        this.settings = {
            desktopCols: parseInt(wrapper.dataset.columns) || 5,
            visibleItems: this.isMobile ? 2 : parseInt(wrapper.dataset.columns) || 5,
            mobileColumns: parseInt(wrapper.dataset.mobileColumns) || 2,
            autoplay: wrapper.dataset.autoplay === 'true',
            autoplaySpeed: parseInt(wrapper.dataset.autoplaySpeed) || 3000,
            swipeThreshold: 50,
            swipeVelocity: 0.3
        };

        this.init();
    }

    init() {
        this.setupCarousel();
        this.setupNavigation();
        this.bindEvents();
        this.updateSlideVisibility();
        if (this.settings.autoplay) this.startAutoplay();
    }

    setupCarousel() {
        if (this.isMobile) {
            this.setupMobileLayout();
        } else {
            this.setupDesktopLayout();
        }
    }

    setupMobileLayout() {
        this.wrapper.classList.add('pc-carousel-mode');
        this.wrapper.classList.remove('pc-grid-mode');
        
        const gap = 12;
        const containerWidth = this.wrapper.offsetWidth - 40;
        const itemWidth = (containerWidth - gap) / this.settings.mobileColumns;
        
        this.container.style.display = 'flex';
        this.container.style.gap = `${gap}px`;
        this.container.style.width = 'auto';
        this.container.style.overflowX = 'auto';
        this.container.style.scrollSnapType = 'x mandatory';
        this.container.style.scrollBehavior = 'smooth';
        this.container.style.padding = '0 20px';
        this.container.style.cursor = 'grab';
        
        this.slides.forEach(slide => {
            slide.style.flex = `0 0 ${itemWidth}px`;
            slide.style.width = `${itemWidth}px`;
            slide.style.scrollSnapAlign = 'start';
        });
    }

    setupDesktopLayout() {
        this.wrapper.classList.add('pc-grid-mode');
        this.wrapper.classList.remove('pc-carousel-mode');
        
        const gap = 12;
        const itemWidth = 271.2;
        const totalWidth = (itemWidth * this.slides.length) + (gap * (this.slides.length - 1));
        
        this.container.style.display = 'flex';
        this.container.style.width = `${totalWidth}px`;
        this.container.style.gap = `${gap}px`;
        this.container.style.overflowX = 'hidden';
        this.container.style.scrollSnapType = 'none';
        this.container.style.padding = '0 20px';
        this.container.style.cursor = 'grab';
        
        this.slides.forEach(slide => {
            slide.style.flex = `0 0 ${itemWidth}px`;
            slide.style.maxWidth = `${itemWidth}px`;
            slide.style.width = `${itemWidth}px`;
            slide.style.scrollSnapAlign = 'none';
        });

        this.itemWidth = itemWidth;
        this.gap = gap;
        this.cacheSlidePositions();
    }
  
      setupNavigation() {
        const prevBtn = this.wrapper.querySelector('.pc-carousel-prev') || this.createNavButton('prev');
        const nextBtn = this.wrapper.querySelector('.pc-carousel-next') || this.createNavButton('next');
        
        this.navigateBound = direction => this.navigate(direction);
        prevBtn.addEventListener('click', () => this.navigateBound(-1));
        nextBtn.addEventListener('click', () => this.navigateBound(1));

        this.prevBtn = prevBtn;
        this.nextBtn = nextBtn;
    }

    createNavButton(direction) {
        const btn = document.createElement('button');
        btn.className = `pc-carousel-${direction}`;
        btn.setAttribute('aria-label', `${direction === 'prev' ? 'Previous' : 'Next'} products`);
        btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                d="${direction === 'prev' ? 'M15 19l-7-7 7-7' : 'M9 5l7 7-7 7'}"/>
        </svg>`;
        this.wrapper.appendChild(btn);
        return btn;
    }

    bindEvents() {
        this.boundHandleResize = this.handleResize.bind(this);
        this.boundHandleScroll = this.handleScroll.bind(this);
        this.boundHandleMouseMove = this.handleMouseMove.bind(this);
        this.boundHandleMouseEnd = this.handleMouseEnd.bind(this);
        this.boundHandleMouseStart = this.handleMouseStart.bind(this);
        this.boundHandleTouchStart = this.handleTouchStart.bind(this);
        this.boundHandleTouchMove = this.handleTouchMove.bind(this);
        this.boundHandleTouchEnd = this.handleTouchEnd.bind(this);
        
        window.addEventListener('resize', this.boundHandleResize);
        
        // Mouse events
        this.container.addEventListener('mousedown', this.boundHandleMouseStart);
        document.addEventListener('mousemove', this.boundHandleMouseMove);
        document.addEventListener('mouseup', this.boundHandleMouseEnd);
        this.container.addEventListener('mouseleave', this.boundHandleMouseEnd);

        // Touch events
        this.container.addEventListener('touchstart', this.boundHandleTouchStart, { passive: false });
        this.container.addEventListener('touchmove', this.boundHandleTouchMove, { passive: false });
        this.container.addEventListener('touchend', this.boundHandleTouchEnd);

        // Click events for product links
        this.container.addEventListener('click', (e) => {
            if (this.isDragging) {
                e.preventDefault();
                e.stopPropagation();
            }
        }, true);

        // Scroll event
        if (this.isMobile) {
            this.container.addEventListener('scroll', this.boundHandleScroll, { passive: true });
        }
    }

    handleResize() {
        if (this.resizeTimeout) clearTimeout(this.resizeTimeout);
        this.resizeTimeout = setTimeout(() => {
            const wasMobile = this.isMobile;
            this.isMobile = window.innerWidth < 768;
            
            if (wasMobile !== this.isMobile) {
                this.currentIndex = 0;
                this.settings.visibleItems = this.isMobile ? 2 : parseInt(this.wrapper.dataset.columns) || 5;
                this.setupCarousel();
                if (!this.isMobile) {
                    this.cacheSlidePositions();
                    this.updateSlidePosition();
                }
            }
            this.updateSlideVisibility();
        }, 100);
    }

    handleScroll() {
        requestAnimationFrame(() => {
            const scrollLeft = this.container.scrollLeft;
            const itemWidth = this.slides[0].offsetWidth + this.gap;
            this.currentIndex = Math.round(scrollLeft / itemWidth);
            this.updateSlideVisibility();
        });
    }

    cacheSlidePositions() {
        this.slidePositions = this.slides.map((_, index) => {
            return index * (this.itemWidth + this.gap);
        });
    }
  
      handleTouchStart(e) {
        // Store initial touch position and time
        this.touchStartTime = Date.now();
        this.touchStartX = e.touches[0].clientX;
        this.containerStartX = this.container.scrollLeft;
        this.isDragging = false; // Start as false, will be set true on move
        this.clickedElement = document.elementFromPoint(
            e.touches[0].clientX,
            e.touches[0].clientY
        )?.closest('a, button, [onclick]');
        
        // Only prevent default if we're actually going to drag
        e.preventDefault();
        if (this.settings.autoplay) this.stopAutoplay();
    }

   // Update handleTouchMove
handleTouchMove(e) {
    const currentX = e.touches[0].clientX;
    this.touchEndX = currentX; // Add this line
    const diff = this.touchStartX - currentX;
    
    if (Math.abs(diff) > 5) {
        this.isDragging = true;
        this.container.classList.add('dragging');
        this.container.scrollLeft = this.containerStartX + diff;
    }
}

    handleTouchEnd(e) {
    if (this.isDragging) {
        const deltaX = this.touchStartX - this.touchEndX; // Use stored touchEndX
        const timeDelta = Date.now() - this.touchStartTime;
        this.velocity = deltaX / timeDelta;

            if (Math.abs(this.velocity) > this.settings.swipeVelocity || 
                Math.abs(deltaX) > this.getSwipeThreshold()) {
                this.navigate(this.velocity > 0 ? 1 : -1);
            } else {
                this.snapToNearestSlide();
            }
        } else if (this.clickedElement) {
            // If not dragging and we have a clicked element, trigger click
            this.clickedElement.click();
        }

        if (this.settings.autoplay) this.startAutoplay();
        this.isDragging = false;
    }

    handleMouseStart(e) {
        if (e.button !== 0) return; // Only left mouse button
        
        this.touchStartTime = Date.now();
        this.touchStartX = e.clientX;
        this.containerStartX = this.container.scrollLeft;
        this.isDragging = false;
        this.clickedElement = e.target.closest('a, button, [onclick]');
        
        e.preventDefault();
        if (this.settings.autoplay) this.stopAutoplay();
    }

    handleMouseMove(e) {
        if (!this.touchStartX) return;
        
        const currentX = e.clientX;
        const diff = this.touchStartX - currentX;
        
        if (Math.abs(diff) > 5) {
            this.isDragging = true;
            this.container.classList.add('dragging', 'grabbing');
            this.container.scrollLeft = this.containerStartX + diff;
        }
    }

    handleMouseEnd(e) {
        if (this.isDragging) {
            this.container.classList.remove('dragging', 'grabbing');
            const deltaX = this.touchStartX - e.clientX;
            const timeDelta = Date.now() - this.touchStartTime;
            this.velocity = deltaX / timeDelta;

            if (Math.abs(this.velocity) > this.settings.swipeVelocity || 
                Math.abs(deltaX) > this.getSwipeThreshold()) {
                this.navigate(this.velocity > 0 ? 1 : -1);
            } else {
                this.snapToNearestSlide();
            }
        } else if (this.clickedElement && !e.target.closest('.pc-carousel-prev, .pc-carousel-next')) {
            // If not dragging and clicked a product (not nav button)
            this.clickedElement.click();
        }

        if (this.settings.autoplay) this.startAutoplay();
        this.isDragging = false;
        this.touchStartX = 0;
    }

    getSwipeThreshold() {
        return this.isMobile ? 
            this.container.offsetWidth * 0.2 : 
            this.settings.swipeThreshold;
    }
  
      snapToSlide() {
    if (this.isMobile) {
        const itemWidth = this.slides[0].offsetWidth + this.gap;
        const currentScroll = this.container.scrollLeft;
        const targetScroll = Math.round(currentScroll / itemWidth) * itemWidth;
        
        // Add momentum-based easing
        const distance = targetScroll - currentScroll;
        const duration = Math.min(500, Math.abs(distance) * 2);
        
        this.container.scrollTo({
            left: targetScroll,
            behavior: 'smooth'
        });
    }
        
    }

    snapToNearestSlide() {
        if (this.isMobile) {
            const scrollLeft = this.container.scrollLeft;
            const itemWidth = this.slides[0].offsetWidth + this.gap;
            this.currentIndex = Math.round(scrollLeft / itemWidth);
            this.snapToSlide();
        } else {
            const scrollLeft = -parseInt(this.container.style.transform.replace('translateX(', '').replace('px)', '')) || 0;
            const closestPosition = this.slidePositions.reduce((prev, curr) => {
                return (Math.abs(curr - scrollLeft) < Math.abs(prev - scrollLeft)) ? curr : prev;
            });
            this.currentIndex = this.slidePositions.indexOf(closestPosition);
            this.snapToSlide();
        }
    }

    navigate(direction) {
        if (this.isMobile) {
            const itemWidth = this.slides[0].offsetWidth + this.gap;
            const targetScroll = this.container.scrollLeft + (itemWidth * direction);
            this.container.scrollTo({
                left: targetScroll,
                behavior: 'smooth'
            });
        } else {
            const totalSlides = this.slides.length;
            const maxIndex = Math.max(0, totalSlides - this.settings.visibleItems);
            this.currentIndex = Math.max(0, Math.min(this.currentIndex + direction, maxIndex));
            this.updateSlidePosition();
        }
        this.updateSlideVisibility();
    }

    updateSlidePosition() {
        if (this.isMobile) return;
        const translateX = -(this.currentIndex * (this.itemWidth + this.gap));
        this.container.style.transform = `translateX(${translateX}px)`;
    }

    updateSlideVisibility() {
        if (this.isMobile) {
            this.prevBtn.style.display = 'none';
            this.nextBtn.style.display = 'none';
            return;
        }

        const totalSlides = this.slides.length;
        const maxIndex = Math.max(0, totalSlides - this.settings.visibleItems);

        this.prevBtn.disabled = this.currentIndex === 0;
        this.nextBtn.disabled = this.currentIndex >= maxIndex;

        this.prevBtn.style.display = 'flex';
        this.nextBtn.style.display = 'flex';
    }

    startAutoplay() {
        this.stopAutoplay();
        this.autoplayInterval = setInterval(() => {
            if (!this.isDragging && document.visibilityState === 'visible') {
                const atEnd = this.currentIndex >= this.slides.length - this.settings.visibleItems;
                this.navigate(atEnd ? -this.currentIndex : 1);
            }
        }, this.settings.autoplaySpeed);
    }

    stopAutoplay() {
        if (this.autoplayInterval) {
            clearInterval(this.autoplayInterval);
            this.autoplayInterval = null;
        }
    }

setupMutationObserver() {
    if (typeof MutationObserver === 'undefined') return;
    
    this.mutationObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.attributeName === 'data-slug' && 
                this.wrapper.dataset.slug !== this.loadedSlug) {
                this.reloadCarousel();
            }
        });
    });

    this.mutationObserver.observe(this.wrapper, {
        attributes: true,
        attributeFilter: ['data-slug']
    });
}

async reloadCarousel() {
    this.loadedSlug = this.wrapper.dataset.slug;
    this.cacheKey = Date.now();
    
    try {
        const response = await fetch(pc_frontend_vars.ajax_url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                action: 'pc_load_carousel',
                slug: this.loadedSlug,
                cache_buster: this.cacheKey,
                nonce: pc_frontend_vars.nonce
            })
        });

        const data = await response.json();
        if (data.success) {
            this.wrapper.innerHTML = data.data.html;
            this.init(); // Reinitialize carousel
        }
    } catch (error) {
        console.error('Carousel reload failed:', error);
    }
}





  
    destroy() {
    window.removeEventListener('resize', this.boundHandleResize);
    document.removeEventListener('mousemove', this.boundHandleMouseMove);
    document.removeEventListener('mouseup', this.boundHandleMouseEnd);
    
    if (this.container) {
        this.container.removeEventListener('mousedown', this.boundHandleMouseStart);
        this.container.removeEventListener('touchstart', this.boundHandleTouchStart);
        this.container.removeEventListener('touchmove', this.boundHandleTouchMove);
        this.container.removeEventListener('touchend', this.boundHandleTouchEnd);
        this.container.removeEventListener('scroll', this.boundHandleScroll);
        this.container.removeEventListener('mouseleave', this.boundHandleMouseEnd);
        this.container.removeEventListener('click', this.boundHandleClick);
    }
    
    this.stopAutoplay();
    
    if (this.prevBtn && this.nextBtn) {
        this.prevBtn.removeEventListener('click', this.navigateBound);
        this.nextBtn.removeEventListener('click', this.navigateBound);
    }
    
    if (this.mutationObserver) {
        this.mutationObserver.disconnect();
    }
}
}