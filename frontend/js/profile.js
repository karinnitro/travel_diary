//профиль, аватар, статистика, статусы, возраст
 
const ProfileModule = {

  //инициализация
  async init() {
    await this.loadProfile();
    this.bindEvents();
  },

  //загрузка и отображение данных
  async loadProfile() {
    const data = await Storage.getProfile();
    if (!data.ok) return;

    const user = data.user;

    //имя и логин
    document.getElementById('profile-name').textContent = user.name;
    document.getElementById('profile-login').textContent = '@' + user.login;

    //возраст 
    if (user.birth_date) {
      const age = this.calculateAge(user.birth_date);
      document.getElementById('profile-age').textContent = age + ' ' + this.getAgeWord(age);
      document.getElementById('profile-age').style.display = 'block';
    } else {
      document.getElementById('profile-age').style.display = 'none';
    }

    //счетчики
    document.getElementById('stat-countries').textContent = user.visited_countries || 0;
    document.getElementById('stat-cities').textContent = user.visited_cities || 0;

    // татус и поздравление при изменении
    document.getElementById('profile-status').textContent = user.status;
    const oldStatus = localStorage.getItem('td_status_' + user.id);
    if (oldStatus && oldStatus !== user.status) {
      this.showCongrats(user.name, user.status);
    }
    localStorage.setItem('td_status_' + user.id, user.status);

    //подсветка текущего уровня
    document.querySelectorAll('.status-level-card').forEach(card => {
      card.classList.remove('active-level');
      const level = card.dataset.level;
      if ((level === 'novice'   && user.status.includes('Новичок')) ||
          (level === 'amateur'  && user.status.includes('Любитель')) ||
          (level === 'expert'   && user.status.includes('Эксперт'))) {
        card.classList.add('active-level');
      }
    });

    //дата регистрации
    document.getElementById('profile-date').textContent =
      'На сайте с ' + new Date(user.created_at).toLocaleDateString('ru-RU');

    //аватар
    this.userId = user.id;
    this.loadSavedAvatar(user.id);
  },

  //аватар
  //загрузка сохраненного аватара
  loadSavedAvatar(userId) {
    const saved      = localStorage.getItem('td_avatar_' + userId);
    const img        = document.getElementById('profile-avatar-img');
    const placeholder = document.getElementById('profile-avatar-placeholder');
    const changeBtn  = document.getElementById('btn-avatar-change');
    const deleteBtn  = document.getElementById('btn-avatar-delete');

    if (saved) {
      img.src = saved;
      img.style.display = 'block';
      placeholder.style.display = 'none';
      changeBtn.textContent = 'Сменить фото';
      deleteBtn.style.display = 'inline-block';
    } else {
      img.style.display = 'none';
      placeholder.style.display = 'block';
      changeBtn.textContent = 'Добавить фото';
      deleteBtn.style.display = 'none';
    }
  },

  //сохранение аватара
  setAvatar(avatarData) {
    if (!this.userId) return;
    localStorage.setItem('td_avatar_' + this.userId, avatarData);
    this.loadSavedAvatar(this.userId);
  },

  //удаление аватара
  deleteAvatar() {
    if (!this.userId) return;
    localStorage.removeItem('td_avatar_' + this.userId);
    this.loadSavedAvatar(this.userId);
  },

  //редактирование профиля
  //открытие модального окна редактирования
  openEditProfile() {
    document.getElementById('edit-name').value =
      document.getElementById('profile-name').textContent;
    document.getElementById('modal-edit-profile').classList.add('active');
  },

  //сохранение изменений
  async saveProfile() {
    const name   = document.getElementById('edit-name').value.trim();
    const gender = document.getElementById('edit-gender').value;
    const birth  = document.getElementById('edit-birth').value;

    if (!name) {
      alert('Введите имя');
      return;
    }

    const result = await Storage.updateProfile({ name, gender, birth_date: birth });
    if (result.ok) {
      document.getElementById('modal-edit-profile').classList.remove('active');
      await this.loadProfile();   //перезагрузка данных
    }
  },

  //поздравление с новым статусом
  //показ поздравления (модальное окно)
  showCongrats(name, status) {
    document.getElementById('congrats-name').textContent = name;
    document.getElementById('congrats-status').textContent = status;
    document.getElementById('modal-congrats').classList.add('active');
  },

  //возраст
  //рассчитать возраст
  calculateAge(birthDate) {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  },

  //склонение слова год
  getAgeWord(age) {
    const last    = age % 10;
    const lastTwo = age % 100;
    if (lastTwo >= 11 && lastTwo <= 14) return 'лет';
    if (last === 1)  return 'год';
    if (last >= 2 && last <= 4) return 'года';
    return 'лет';
  },

  //привязка кнопок
  //все обработчики событий
  bindEvents() {
    // аватар
    document.getElementById('btn-avatar-change').addEventListener('click', () => {
      document.getElementById('profile-avatar-input').click();
    });
    document.getElementById('btn-avatar-delete').addEventListener('click', () => {
      this.deleteAvatar();
    });

    //сжатие и загрузка фото
    document.getElementById('profile-avatar-input').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas  = document.createElement('canvas');
          const maxSize = 500;
          let w = img.width;
          let h = img.height;
          if (w > h) { h = Math.round(h * maxSize / w); w = maxSize; }
          else       { w = Math.round(w * maxSize / h); h = maxSize; }
          canvas.width  = w;
          canvas.height = h;
          canvas.getContext('2d').drawImage(img, 0, 0, w, h);
          const compressed = canvas.toDataURL('image/jpeg', 0.85);
          this.setAvatar(compressed);
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    });

    //выход
    document.getElementById('btn-logout-profile').addEventListener('click', () => {
      document.getElementById('modal-confirm-logout').classList.add('active');
    });
    document.getElementById('btn-cancel-logout').addEventListener('click', () => {
      document.getElementById('modal-confirm-logout').classList.remove('active');
    });
    document.getElementById('btn-confirm-logout').addEventListener('click', () => {
      document.getElementById('modal-confirm-logout').classList.remove('active');
      App.logout();
    });

    //поздравление
    document.getElementById('btn-close-congrats').addEventListener('click', () => {
      document.getElementById('modal-congrats').classList.remove('active');
    });

    //редактирование профиля
    document.getElementById('btn-edit-profile').addEventListener('click', () => {
      this.openEditProfile();
    });
    document.getElementById('btn-cancel-edit-profile').addEventListener('click', () => {
      document.getElementById('modal-edit-profile').classList.remove('active');
    });
    document.getElementById('btn-save-profile').addEventListener('click', () => {
      this.saveProfile();
    });
  },
};