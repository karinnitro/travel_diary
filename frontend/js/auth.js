 //вход, регистрация, переключение вкладок, пароли
const Auth = {

 //инициализация модуля авторизации
  init() {
    this.bindTabs();              // переключение вкладок вход/регистрация
    this.bindForms();             // отправка форм
    this.initPasswordToggles();   // кнопки просмотра пароля
    this.checkAutoLogin();        // проверка сохраненной сессии
  },

  // проверка есть ли пользователь
  async checkAutoLogin() {
    const user = await Storage.getCurrentUser();
    if (user) {
      App.currentUser = user;
      const nameEl = document.getElementById('welcome-name');
      if (nameEl) {
        nameEl.textContent = user.name;
      }
    }
  },

  //переключение вкладок вход/регистрация
  bindTabs() {
    document.querySelectorAll('.auth-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const target = tab.dataset.tab;

        // сброс активных вкладок
        document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));

        // активация выбранной
        tab.classList.add('active');
        document.getElementById('form-' + target).classList.add('active');
        this.clearErrors();
      });
    });
  },

  //отправка форм
  bindForms() {
    document.getElementById('form-login').addEventListener('submit', e => {
      e.preventDefault();
      this.handleLogin();
    });

    document.getElementById('form-register').addEventListener('submit', e => {
      e.preventDefault();
      this.handleRegister();
    });
  },

  //обработка входа
  async handleLogin() {
    const login = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;

    if (!login || !password) {
      this.showError('login', 'Заполните все поля');
      return;
    }

    const result = await Storage.loginUser(login, password);

    if (!result.ok) {
      this.showError('login', result.error);
      return;
    }

    App.showWelcome(result.user);
  },

  //обработка регистрации
  async handleRegister() {
    const name  = document.getElementById('reg-name').value.trim();
    const login    = document.getElementById('reg-username').value.trim();
    const password = document.getElementById('reg-password').value;
    const confirm  = document.getElementById('reg-confirm').value;

    // проверки
    if (!name || !login || !password || !confirm) {
      this.showError('register', 'Заполните все поля');
      return;
    }
    if (login.length < 3) {
      this.showError('register', 'Логин должен содержать минимум 3 символа');
      return;
    }
    if (password.length < 6) {
      this.showError('register', 'Пароль должен содержать минимум 6 символов');
      return;
    }
    if (password !== confirm) {
      this.showError('register', 'Пароли не совпадают');
      return;
    }

    const result = await Storage.registerUser(login, password, name);

    if (!result.ok) {
      this.showError('register', result.error);
      return;
    }

    App.showWelcome(result.user);
  },

  //показ ошибки
  showError(form, message) {
    const el = document.getElementById('error-' + form);
    el.textContent = message;
    el.style.display = 'block';
  },

  //очистка ошибок
  clearErrors() {
    document.querySelectorAll('.auth-error').forEach(e => {
      e.textContent = '';
      e.style.display = 'none';
    });
  },

  //кнопки просмотра пароля 
  initPasswordToggles() {
    document.querySelectorAll('.toggle-password').forEach(btn => {
      btn.addEventListener('click', () => {
        const input = document.getElementById(btn.dataset.target);
        const img   = btn.querySelector('.eye-icon');

        if (input.type === 'password') {
          input.type = 'text';
          img.src    = 'img/open.png';
          img.alt    = 'Скрыть';
        } else {
          input.type = 'password';
          img.src    = 'img/close.png';
          img.alt    = 'Показать';
        }
      });
    });
  },
};