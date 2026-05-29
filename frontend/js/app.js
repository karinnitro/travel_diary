//уравление экранами, навигацией, переходами
const App = {
  currentUser: null,           // текущий авторизованный пользователь

 //Инициализация приложения
  init() {
    Auth.init();               // авторизация
    this.bindNav();            // нижнее меню
    this.bindWelcome();        // кнопки на велком экране
    this.bindLanding();        // кнопка "начать" на приветственном экране
    this.restoreScreen();      // восстановление экрана после обновления
  },

  showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    sessionStorage.setItem('currentScreen', id);
  },

  // появление велком экрана после входа
  showWelcome(user) {
    this.currentUser = user;
    document.getElementById('welcome-name').textContent = user.name;

    const currentActive = document.querySelector('.screen.active');

    // плавное скрытие текущего экрана
    if (currentActive) {
      currentActive.style.transition = 'opacity 0.4s ease';
      currentActive.style.opacity = '0';
    }

    setTimeout(() => {
      if (currentActive) {
        currentActive.classList.remove('active');
        currentActive.style.opacity = '1';
      }

      // показ велком экран с анимацией
      const welcome = document.getElementById('welcome-screen');
      welcome.classList.add('active');
      welcome.style.opacity = '0';

      setTimeout(() => {
        welcome.style.transition = 'opacity 0.5s ease';
        welcome.style.opacity = '1';
      }, 50);
    }, 400);
  },

  //переход на главный экран (на карту)
  showMain() {
    this.showScreen('main-screen');
    this.switchSection('map');
  },

 //привязка кнопок велком экоана
  bindWelcome() {
    document.getElementById('btn-start').addEventListener('click', () => this.showMain());
    document.getElementById('btn-logout-welcome').addEventListener('click', () => this.logout());
  },

  //привяязка кнопки "Начать" на приветственном экране
  bindLanding() {
    const btn = document.getElementById('btn-goto-auth');
    if (btn) {
      btn.addEventListener('click', () => this.fadeToScreen('auth-screen'));
    }
  },

  fadeToScreen(screenId) {
    const landing = document.getElementById('landing-screen');
    const target = document.getElementById(screenId);

    // скрываем приветственны экран
    landing.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    landing.style.opacity = '0';
    landing.style.transform = 'scale(0.95)';

    setTimeout(() => {
      landing.classList.remove('active');
      landing.style.opacity = '1';
      landing.style.transform = 'scale(1)';

      // показываем целевой экран
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

 //привязка кнопок нижнего меню
  bindNav() {
    document.querySelectorAll('.nav-item').forEach(btn => {
      btn.addEventListener('click', () => this.switchSection(btn.dataset.section));
    });
  },

  switchSection(name) {
    // сброс активных кнопок меню
    document.querySelectorAll('.nav-item').forEach(b => {
      b.classList.remove('active');
      b.style.background = 'transparent';
      b.style.color = '#849859';
      b.style.boxShadow = 'none';
    });

    // подсветка активной кнопки
    const activeBtn = document.querySelector(`.nav-item[data-section="${name}"]`);
    activeBtn.classList.add('active');
    activeBtn.style.background = 'rgba(132, 152, 89, 0.1)';
    activeBtn.style.color = '#5a6e3a';
    activeBtn.style.boxShadow = '0 2px 8px rgba(132, 152, 89, 0.1)';

    // скрываю все панели
    document.querySelectorAll('.section-panel').forEach(p => {
      p.classList.remove('active');
      p.style.display = 'none';
    });

    // показываю нужную панель
    const panel = document.getElementById('panel-' + name);
    panel.classList.add('active');
    panel.style.display = 'block';

    // сохраняю текущий раздел
    sessionStorage.setItem('currentSection', name);

    // инициализация модулей
    if (name === 'map') {
      if (!MapModule.map) {
        MapModule.init();           // первый запуск карты
      } else {
        MapModule.loadMarkers();    // обновление маркеров
      }
    }
    if (name === 'trips') {
      TripsModule.init();           // загрузка списка поездок
    }
    if (name === 'profile') {
      ProfileModule.init();         // загрузка профиля
    }
    document.querySelectorAll('input[type="text"], input[type="date"], textarea').forEach(el => {
      if (el.id !== 'login-username' && el.id !== 'login-password' && 
          el.id !== 'reg-name' && el.id !== 'reg-username' && 
          el.id !== 'reg-password' && el.id !== 'reg-confirm' &&
          el.id !== 'trip-search-input' && el.id !== 'friend-search-input') {
        el.value = '';
      }
    });
  },

 //выход из системы
  async logout() {
    await Storage.logout();
    this.currentUser = null;
    // очищаем временные данные
    sessionStorage.removeItem('currentScreen');
    sessionStorage.removeItem('currentSection');
    this.showScreen('landing-screen');
  },

  //восстановление экрана после обновления страницы
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

// запуск приложения после загрузки 
document.addEventListener('DOMContentLoaded', () => App.init());