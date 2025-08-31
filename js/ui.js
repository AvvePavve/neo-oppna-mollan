// ui.js - Hanterar användarinterface, menyer och overlays

export class UIManager {
  constructor() {
    this.initElements();
    this.initEventListeners();
    this.fixViewportHeight();
  }

  initElements() {
    this.menuToggle = document.getElementById("menuToggle");
    this.menuDrawer = document.getElementById("menuDrawer");
    this.menuClose = document.getElementById("menuClose");
  }

  initEventListeners() {
    // Meny-hantering
    this.menuToggle.addEventListener("click", (e) => {
      const aboutOpen = document.getElementById("aboutOverlay").style.display === "flex";
      if (aboutOpen) {
        e.stopPropagation();
        return;
      }
      this.toggleMenu();
    });

    this.menuClose.addEventListener("click", () => {
      this.closeMenu();
    });

    // Stäng meny när man klickar utanför
    document.addEventListener("click", (event) => {
      const isClickInside = this.menuDrawer.contains(event.target) || 
                           this.menuToggle.contains(event.target);
      if (!isClickInside) {
        this.closeMenu();
      }
    });

    // Overlay-knappar
    document.getElementById("openAboutOverlay").addEventListener("click", (e) => {
      e.preventDefault();
      this.openOverlay("aboutOverlay");
    });

    document.getElementById("openAaaOverlay").addEventListener("click", (e) => {
      e.preventDefault();
      this.openOverlay("AaaOverlay");
    });

    document.getElementById("openSchemaOverlay").addEventListener("click", (e) => {
      e.preventDefault();
      this.openOverlay("SchemaOverlay");
    });

    // Viewport height hantering
    window.addEventListener('resize', () => this.fixViewportHeight());
    window.addEventListener('orientationchange', () => this.fixViewportHeight());
    window.addEventListener('focus', () => this.fixViewportHeight());
    window.addEventListener('touchstart', () => {
      setTimeout(() => this.fixViewportHeight(), 300);
    });
  }

  toggleMenu() {
    this.menuDrawer.classList.toggle("open");
    document.body.classList.toggle("no-scroll");
  }

  closeMenu() {
    this.menuDrawer.classList.remove("open");
    document.body.classList.remove("no-scroll");
  }

  openOverlay(id) {
    const el = document.getElementById(id);
    if (el) {
      this.closeMenu();
      setTimeout(() => {
        el.style.display = "flex";
        requestAnimationFrame(() => {
          el.classList.add("show");
          document.body.classList.add("no-scroll");
        });
      }, 300);
    }
  }

  closeOverlay(id) {
    const el = document.getElementById(id);
    if (el) {
      el.classList.remove("show");
      setTimeout(() => {
        el.style.display = "none";
        document.body.classList.remove("no-scroll");
      }, 300);
    }
  }

  closeInfo() {
    document.getElementById("infoOverlay").style.display = "none";
  }

  fixViewportHeight() {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
  }

  // Globala funktioner för HTML onclick events
  setupGlobalFunctions() {
    // Gör funktioner tillgängliga globalt för HTML onclick events
    window.closeInfo = () => this.closeInfo();
    window.closeOverlay = (id) => this.closeOverlay(id);
  }
}
