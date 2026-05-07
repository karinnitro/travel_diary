//апи-запросы - авторизация, поездки, маркеры, профиль
 
const Storage = {

  BASE_URL: '',   //url сервера

  async request(url, options = {}) {
    try {
      const response = await fetch(this.BASE_URL + url, {
        credentials: 'include',                     
        headers: { 'Content-Type': 'application/json' },
        ...options,
      });
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Ошибка запроса:', error);
      return { ok: false, error: 'Сервер недоступен' };
    }
  },

  //авторизация

  //регистарция нового пользователя
  async registerUser(login, password, name) {
    const data = await this.request('/api/register', {
      method: 'POST',
      body: JSON.stringify({ login, password, name }),
    });
    return data;
  },

  //вход в систему
  async loginUser(login, password) {
    const data = await this.request('/api/login', {
      method: 'POST',
      body: JSON.stringify({ login, password }),
    });
    return data;
  },

  //выход
  async logout() {
    return await this.request('/api/logout', { method: 'POST' });
  },

  //получение текущ пользователя
  async getCurrentUser() {
    const data = await this.request('/api/me');
    return data.ok ? data.user : null;
  },

  //профиль

  //получение расширенного профиля (статус и счетчики)
  async getProfile() {
    return await this.request('/api/profile');
  },

  //обновление данных
  async updateProfile(data) {
    return await this.request('/api/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  //поездки

  //получение всех поездок
  async getTrips() {
    const data = await this.request('/api/trips');
    return data.ok ? data.trips : [];
  },

  //добавление новой поездки
  async addTrip(trip) {
    return await this.request('/api/trips', {
      method: 'POST',
      body: JSON.stringify(trip),
    });
  },

  //обноление
  async updateTrip(tripId, trip) {
    return await this.request('/api/trips/' + tripId, {
      method: 'PUT',
      body: JSON.stringify(trip),
    });
  },

  //удаление
  async deleteTrip(tripId) {
    return await this.request('/api/trips/' + tripId, {
      method: 'DELETE',
    });
  },

  //маркеры

  //получение всех маркеров
  async getMarkers() {
    const data = await this.request('/api/markers');
    return data.ok ? data.markers : [];
  },

  //добавить маркер на карту
  async addMarker(marker) {
    return await this.request('/api/markers', {
      method: 'POST',
      body: JSON.stringify(marker),
    });
  },

  //удалить
  async deleteMarker(markerId) {
    return await this.request('/api/markers/' + markerId, {
      method: 'DELETE',
    });
  },
};