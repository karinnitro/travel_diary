//управление экранами, навигацией, переходами
const App = {
  currentUser: null,

  init() {
    Auth.init();
    this.bindNav();
    this.bindWelcome();
    this.bindLanding();
    this.restoreScreen();
  },

  showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    sessionStorage.setItem('currentScreen', id);
  },

  showWelcome(user) {
    this.currentUser = user;

    // если админ — только админ-панель
    if (user.is_admin) {
      document.querySelector('.bottom-nav').innerHTML = '<button class="nav-item" data-section="logout"><span class="nav-label">Выйти</span></button>';
      document.querySelector('.nav-item[data-section="logout"]').addEventListener('click', () => this.logout());
      this.showScreen('main-screen');
      setTimeout(() => {
        document.querySelectorAll('.section-panel').forEach(p => { p.classList.remove('active'); p.style.display = 'none'; });
        const panel = document.getElementById('panel-admin');
        if (panel) { panel.classList.add('active'); panel.style.display = 'block'; }
        AdminModule.init();
      }, 100);
      return;
    }

    // обычный пользователь — восстанавливаем нижнюю панель
    document.querySelector('.bottom-nav').innerHTML = `
      <button class="nav-item active" data-section="map"><span class="nav-label">Карта</span></button>
      <button class="nav-item" data-section="profile"><span class="nav-label">Кабинет</span></button>
      <button class="nav-item" data-section="trips"><span class="nav-label">Путешествия</span></button>
    `;
    this.bindNav();

    document.getElementById('welcome-name').textContent = user.name;

  const currentActive = document.querySelector('.screen.active');
    if (currentActive) {
      currentActive.style.transition = 'opacity 0.4s ease';
      currentActive.style.opacity = '0';
    }

    setTimeout(() => {
      if (currentActive) {
        currentActive.classList.remove('active');
        currentActive.style.opacity = '1';
      }
      const welcome = document.getElementById('welcome-screen');
      welcome.classList.add('active');
      welcome.style.opacity = '0';
      setTimeout(() => {
        welcome.style.transition = 'opacity 0.5s ease';
        welcome.style.opacity = '1';
      }, 50);
    }, 400);
  },

  showMain() {
    this.showScreen('main-screen');
    this.switchSection('map');
  },

  bindWelcome() {
    document.getElementById('btn-start').addEventListener('click', () => this.showMain());
    document.getElementById('btn-logout-welcome').addEventListener('click', () => this.logout());
  },

  bindLanding() {
    const btn = document.getElementById('btn-goto-auth');
    if (btn) {
      btn.addEventListener('click', () => this.fadeToScreen('auth-screen'));
    }
  },

  fadeToScreen(screenId) {
    const landing = document.getElementById('landing-screen');
    const target = document.getElementById(screenId);
    landing.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    landing.style.opacity = '0';
    landing.style.transform = 'scale(0.95)';
    setTimeout(() => {
      landing.classList.remove('active');
      landing.style.opacity = '1';
      landing.style.transform = 'scale(1)';
      target.classList.add('active');
      target.style.opacity = '0';
      target.style.transform = 'scale(1.05)';
      setTimeout(() => {
        target.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
        target.style.opacity = '1';
        target.style.transform = 'scale(1)';
      }, 50);
    }, 500);
  },

  bindNav() {
    document.querySelectorAll('.nav-item').forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.dataset.section === 'logout') {
          this.logout();
        } else {
          this.switchSection(btn.dataset.section);
        }
      });
    });
  },

  switchSection(name) {
    document.querySelectorAll('.nav-item').forEach(b => {
      b.classList.remove('active');
      b.style.background = 'transparent';
      b.style.color = '#849859';
      b.style.boxShadow = 'none';
    });

    if (name === 'logout') {
      this.logout();
      return;
    }

    const activeBtn = document.querySelector(`.nav-item[data-section="${name}"]`);
    if (activeBtn) {
      activeBtn.classList.add('active');
      activeBtn.style.background = 'rgba(132, 152, 89, 0.1)';
      activeBtn.style.color = '#5a6e3a';
      activeBtn.style.boxShadow = '0 2px 8px rgba(132, 152, 89, 0.1)';
    }

    document.querySelectorAll('.section-panel').forEach(p => {
      p.classList.remove('active');
      p.style.display = 'none';
    });

    const panel = document.getElementById('panel-' + name);
    if (panel) {
      panel.classList.add('active');
      panel.style.display = 'block';
    }

    sessionStorage.setItem('currentSection', name);

    if (name === 'map') {
      if (!MapModule.map) { MapModule.init(); }
      else { MapModule.loadMarkers(); }
    }
    if (name === 'trips') { TripsModule.init(); }
    if (name === 'profile') { ProfileModule.init(); }
    if (name === 'admin') { AdminModule.init(); }

    document.querySelectorAll('input[type="text"], input[type="date"], textarea').forEach(el => {
      if (el.id !== 'login-username' && el.id !== 'login-password' &&
          el.id !== 'reg-name' && el.id !== 'reg-username' &&
          el.id !== 'reg-password' && el.id !== 'reg-confirm' &&
          el.id !== 'trip-search-input' && el.id !== 'friend-search-input') {
        el.value = '';
      }
    });
  },

  async logout() {
    await Storage.logout();
    this.currentUser = null;
    sessionStorage.removeItem('currentScreen');
    sessionStorage.removeItem('currentSection');
    this.showScreen('landing-screen');
  },

  restoreScreen() {
    const savedScreen = sessionStorage.getItem('currentScreen');
    const savedSection = sessionStorage.getItem('currentSection') || 'map';
    if (!this.currentUser && !savedScreen) {
      this.showScreen('landing-screen');
      return;
    }
    if (savedScreen === 'main-screen') {
      this.showScreen('main-screen');
      this.switchSection(savedSection);
    } else if (savedScreen === 'welcome-screen') {
      this.showScreen('welcome-screen');
    } else {
      this.showScreen('landing-screen');
    }
  },
};

document.addEventListener('DOMContentLoaded', () => App.init());