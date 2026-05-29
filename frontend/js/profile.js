//профиль, аватар, статистика, статусы, возраст
 
const ProfileModule = {
  sentRequestIds: [],
  //инициализация
  async init() {
    await this.loadProfile();
    this.loadFriendRequests();
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

    // статус и поздравление при изменении
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
    document.getElementById('edit-name').value = document.getElementById('profile-name').textContent;
    document.getElementById('edit-birth').value = '';
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

  // ─── ДРУЗЬЯ ───────────────────────────────

  async searchFriends() {
    const query = document.getElementById('friend-search-input').value.trim();
    if (!query || query.length < 2) {
      document.getElementById('friend-search-results').innerHTML = '';
      return;
    }
    const result = await Storage.searchUsers(query);
    const container = document.getElementById('friend-search-results');
    if (!result.ok || !result.users.length) {
      container.innerHTML = '<p style="color:#849859;font-size:0.8rem;font-family:\'Raleway\',sans-serif;">Никого не найдено</p>';
      return;
    }
    const friendsResult = await Storage.getFriends();
    const friendIds = friendsResult.ok ? friendsResult.friends.map(f => f.id) : [];
    
    container.innerHTML = result.users.map(u => {
      const avatar = localStorage.getItem('td_avatar_' + u.id);
      const avatarHTML = avatar ? '<div class="friend-avatar" style="background-image:url(\'' + avatar + '\')"></div>' : '<div class="friend-avatar"></div>';
      if (friendIds.includes(u.id)) {
        return '<div class="friend-item">' + avatarHTML + '<span>' + u.name + ' (@' + u.login + ')</span><span style="color:#849859;font-size:0.7rem;">Уже в друзьях</span></div>';
      } else if (this.sentRequestIds.includes(u.id)) {
        return '<div class="friend-item">' + avatarHTML + '<span>' + u.name + ' (@' + u.login + ')</span><span style="color:#849859;font-size:0.7rem;">Заявка отправлена</span></div>';
      } else {
        return '<div class="friend-item">' + avatarHTML + '<span>' + u.name + ' (@' + u.login + ')</span><button onclick="ProfileModule.sendRequest(' + u.id + ')">Добавить</button></div>';
      }
    }).join('');
  },

  async sendRequest(userId) {
    this.pendingFriendId = userId;
    document.getElementById('modal-friend-title').textContent = 'Добавить в друзья?';
    document.getElementById('modal-friend-message').textContent = 'Пользователь получит заявку.';
    document.getElementById('modal-confirm-friend').classList.add('active');
    
    const confirmBtn = document.getElementById('btn-confirm-friend');
    const newBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newBtn, confirmBtn);
    newBtn.addEventListener('click', async () => {
      const result = await Storage.sendFriendRequest(this.pendingFriendId);
      document.getElementById('modal-confirm-friend').classList.remove('active');
      if (result.ok) {
        this.sentRequestIds.push(this.pendingFriendId);
        this.searchFriends();
      }
      this.showInfo(result.ok ? 'Готово!' : 'Ошибка', result.ok ? 'Заявка отправлена!' : result.error);
    });
  },

  async loadFriendRequests() {
    const result = await Storage.getFriendRequests();
    const container = document.getElementById('friend-requests-list');
    if (!result.ok || !result.requests.length) {
      container.innerHTML = '<p style="color:#849859;font-size:0.8rem;">Нет входящих заявок</p>';
      return;
    }
    container.innerHTML = result.requests.map(r =>
      '<div class="friend-item"><span>' + r.from_name + ' (@' + r.from_login + ')</span><div><button onclick="ProfileModule.respondRequest(' + r.id + ', \'accept\')">✓</button><button onclick="ProfileModule.respondRequest(' + r.id + ', \'reject\')" style="background:#b5341e;margin-left:4px;">✕</button></div></div>'
    ).join('');
    const count = result.ok ? result.requests.length : 0;
    const btn = document.getElementById('btn-open-friends');
    let badge = btn.querySelector('.friend-badge');
    if (count > 0) {
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'friend-badge';
        btn.appendChild(badge);
      }
      badge.textContent = count;
    } else if (badge) {
      badge.remove();
    }
  },

  async respondRequest(requestId, action) {
    this.pendingRequestId = requestId;
    this.pendingAction = action;
    const actionText = action === 'accept' ? 'принять' : 'отклонить';
    document.getElementById('modal-friend-title').textContent = action === 'accept' ? 'Принять заявку?' : 'Отклонить заявку?';
    document.getElementById('modal-friend-message').textContent = 'Вы уверены?';
    document.getElementById('modal-confirm-friend').classList.add('active');
    
    const confirmBtn = document.getElementById('btn-confirm-friend');
    const newBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newBtn, confirmBtn);
    newBtn.addEventListener('click', async () => {
      await Storage.respondToRequest(this.pendingRequestId, this.pendingAction);
      document.getElementById('modal-confirm-friend').classList.remove('active');
      this.loadFriendRequests();
      this.loadFriends();
      // обновляем бейдж
      const requestsResult = await Storage.getFriendRequests();
      const count = requestsResult.ok ? requestsResult.requests.length : 0;
      const btn = document.getElementById('btn-open-friends');
      let badge = btn.querySelector('.friend-badge');
      if (count > 0) {
        if (!badge) {
          badge = document.createElement('span');
          badge.className = 'friend-badge';
          btn.appendChild(badge);
        }
        badge.textContent = count;
      } else if (badge) {
        badge.remove();
      }
    });
  },

  async loadFriends() {
    const result = await Storage.getFriends();
    const container = document.getElementById('friend-list-content');
    if (!result.ok || !result.friends.length) {
      container.innerHTML = '<p style="color:#849859;font-size:0.8rem;font-family:\'Raleway\',sans-serif;">Пока нет друзей</p>';
      return;
    }
    container.innerHTML = result.friends.map(f => {
      const avatar = localStorage.getItem('td_avatar_' + f.id);
      const avatarHTML = avatar ? '<div class="friend-avatar" style="background-image:url(\'' + avatar + '\')"></div>' : '<div class="friend-avatar"></div>';
      return '<div class="friend-item">' + avatarHTML + '<span>' + f.name + ' (@' + f.login + ') — ' + f.status + ' | 🌍 ' + f.visited_countries + ' стран</span><button class="btn-remove-friend" onclick="ProfileModule.removeFriend(' + f.id + ')">Удалить</button></div>';
    }).join('');
  },

  async removeFriend(friendId) {
    this.pendingFriendId = friendId;
    document.getElementById('modal-friend-title').textContent = 'Удалить друга?';
    document.getElementById('modal-friend-message').textContent = 'Вы больше не увидите статистику этого пользователя.';
    document.getElementById('modal-confirm-friend').classList.add('active');
    document.getElementById('btn-confirm-friend').onclick = async () => {
      await Storage.request('/api/friends/remove', { method: 'POST', body: JSON.stringify({ friend_id: this.pendingFriendId }) });
      document.getElementById('modal-confirm-friend').classList.remove('active');
      this.loadFriends();
    };
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
    //инфо окно
    document.getElementById('btn-close-info').addEventListener('click', () => {
      document.getElementById('modal-info').classList.remove('active');
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

       //друзья
    document.getElementById('btn-open-friends').addEventListener('click', () => {
      document.getElementById('modal-friends').classList.add('active');
      this.loadFriendRequests();
      this.loadFriends();
    });
    const btnFriends = document.getElementById('btn-open-friends');
    btnFriends.style.padding = '0.2rem 0.6rem';
    btnFriends.style.fontSize = '0.6rem';
    btnFriends.style.width = 'auto';
    document.getElementById('btn-close-friends').addEventListener('click', () => {
      document.getElementById('modal-friends').classList.remove('active');
    });
      document.getElementById('friend-search-input').addEventListener('input', () => this.searchFriends());

    setTimeout(() => {
      const b = document.getElementById('btn-open-friends');
      if (b) {
        b.setAttribute('style', 'padding: 0.7rem 2.5rem !important; font-size: 1rem !important; width: auto !important; flex: none !important; display: inline-block !important; background: #849859 !important; color: #fff !important; border: none !important; border-radius: 10px !important; margin-left: 39rem !important; transition: none !important;');
      }
    }, 200);

    document.getElementById('btn-cancel-friend').addEventListener('click', () => {
      document.getElementById('modal-confirm-friend').classList.remove('active');
    });
  },
};