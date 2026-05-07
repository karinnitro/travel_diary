//список поездок, добавление/редактирование/удаление, поиск, фото, звезды, связь с картой
 
const TripsModule = {

  tripToDelete: null,    //id поездки на удаление (для модального окна)

  //инициализация
  init() {
    //кнопки
    document.getElementById('btn-add-trip').addEventListener('click', () => this.openAddModal());
    document.getElementById('btn-cancel-trip').addEventListener('click', () => this.closeModal());
    document.getElementById('btn-close-view').addEventListener('click', () => this.closeViewModal());
    document.getElementById('form-trip').addEventListener('submit', e => { e.preventDefault(); this.saveTrip(); });

    //переключение вкладок посещенные/запланированные
    document.querySelectorAll('.trip-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.trip-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.trip-list').forEach(l => l.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById('list-' + tab.dataset.tab).classList.add('active');
      });
    });

    //полноэкранное фото-закрытие
    document.getElementById('close-fullscreen').addEventListener('click', () => {
      document.getElementById('fullscreen-photo').classList.remove('active');
    });
    document.getElementById('fullscreen-photo').addEventListener('click', (e) => {
      if (e.target === document.getElementById('fullscreen-photo')) {
        document.getElementById('fullscreen-photo').classList.remove('active');
      }
    });

    //счетчик символов впечатлений
    document.getElementById('trip-impressions').addEventListener('input', () => {
      const len = document.getElementById('trip-impressions').value.length;
      document.getElementById('impressions-count').textContent = len + '/500';
    });

    //звезды рейтинга
    const stars = document.querySelectorAll('#star-rating span');
    stars.forEach(star => {
      star.addEventListener('click', () => {
        const value = parseInt(star.dataset.value);
        document.getElementById('trip-rating').value = value;
        stars.forEach(s => { s.textContent = parseInt(s.dataset.value) <= value ? '★' : '☆'; });
      });
      star.addEventListener('mouseenter', () => {
        const value = parseInt(star.dataset.value);
        stars.forEach(s => { s.textContent = parseInt(s.dataset.value) <= value ? '★' : '☆'; });
      });
    });
    document.getElementById('star-rating').addEventListener('mouseleave', () => {
      const currentValue = parseInt(document.getElementById('trip-rating').value) || 0;
      stars.forEach(s => { s.textContent = parseInt(s.dataset.value) <= currentValue ? '★' : '☆'; });
    });

    //поиск по поездкам
    document.getElementById('trip-search-input').addEventListener('input', () => this.filterTrips());

    //модальное окно подтверждения удаления
    document.getElementById('btn-cancel-delete-trip').addEventListener('click', () => {
      document.getElementById('modal-confirm-delete-trip').classList.remove('active');
    });
    document.getElementById('btn-confirm-delete-trip').addEventListener('click', async () => {
      const tripId = this.tripToDelete;
      if (tripId) {
        //удалю связанный маркер
        const markers = await Storage.getMarkers();
        const marker = markers.find(m => m.trip_id === tripId);
        if (marker) await Storage.deleteMarker(marker.id);
        //удаляю поездку
        await Storage.deleteTrip(tripId);
        document.getElementById('modal-confirm-delete-trip').classList.remove('active');
        this.closeViewModal();
        this.loadTrips();
        this.tripToDelete = null;
      }
    });

    this.loadTrips();
  },

  //поиск

  //фильтр поездок
  filterTrips() {
    const query = document.getElementById('trip-search-input').value.toLowerCase();
    const cards = document.querySelectorAll('.trip-card');
    cards.forEach(card => {
      const text = card.querySelector('h4').textContent.toLowerCase();
      card.style.display = text.includes(query) ? 'flex' : 'none';
    });
  },

  //список поездок

  //загрузка и отображение поездок
  async loadTrips() {
    const trips = await Storage.getTrips();

    //сортировка по дате
    trips.sort((a, b) => {
      const dateA = a.date || a.year.toString();
      const dateB = b.date || b.year.toString();
      return dateB.localeCompare(dateA);
    });

    const visitedList = document.getElementById('list-visited');
    const plannedList = document.getElementById('list-planned');
    visitedList.innerHTML = '';
    plannedList.innerHTML = '';

    let hasVisited = false, hasPlanned = false;

    trips.forEach(trip => {
      const card = this.createTripCard(trip);
      if (trip.is_planned) { plannedList.appendChild(card); hasPlanned = true; }
      else                 { visitedList.appendChild(card); hasVisited = true; }
    });

    //заглушки
    if (!hasVisited) {
      visitedList.innerHTML = '<div style="background:rgba(255,255,255,0.6);border:1px solid rgba(132,152,89,0.1);border-radius:6px;padding:0.7rem;text-align:center;margin:0.3rem 0;width:25%;margin-left:auto;margin-right:auto;"><p style="font-family:\'Raleway\',sans-serif;font-size:0.65rem;font-weight:700;color:#849859;text-transform:uppercase;letter-spacing:0.04em;margin:0;">Здесь появятся воспоминания о ваших поездках</p></div>';
    }
    if (!hasPlanned) {
      plannedList.innerHTML = '<div style="background:rgba(255,255,255,0.6);border:1px solid rgba(132,152,89,0.1);border-radius:6px;padding:0.7rem;text-align:center;margin:0.3rem 0;width:25%;margin-left:auto;margin-right:auto;"><p style="font-family:\'Raleway\',sans-serif;font-size:0.65rem;font-weight:700;color:#849859;text-transform:uppercase;letter-spacing:0.04em;margin:0;">Планируйте будущие поездки</p></div>';
    }
  },

  createTripCard(trip) {
    const div = document.createElement('div');
    div.className = 'trip-card';
    div.innerHTML = `
      <div class="trip-card-left">
        <h4>${trip.city}, ${trip.country}</h4>
        <span>${trip.year} г.</span>
      </div>
      <div class="trip-card-right">→</div>
    `;
    div.addEventListener('click', () => this.viewTrip(trip));
    return div;
  },

  //просмотр поездки

  //открытие окна
  viewTrip(trip) {
    //фото
    let photos = [];
    const photoKey = trip.photo_key || ('td_trip_photos_' + trip.id);
    const saved = localStorage.getItem(photoKey);
    if (saved) {
      try { photos = JSON.parse(saved); } catch(e) { photos = []; }
    }
    if (photos.length === 0 && trip.photos) photos = trip.photos;
    if (photos.length === 0 && trip.photo)  photos = [trip.photo];

    let photosHTML = '';
    if (photos.length > 0) {
      photosHTML = `
        <div class="trip-photos-section">
          <div class="trip-photos-label">Фотографии (${photos.length})</div>
          <div class="trip-photos-scroll">
            ${photos.map(photo => `
              <div class="trip-photo-item" style="background-image: url('${photo}')" onclick="TripsModule.openFullscreenPhoto('${photo}')"></div>
            `).join('')}
          </div>
        </div>`;
    }

    //содержимое
    document.getElementById('view-content').innerHTML = `
      <h2 class="trip-detail-city">${trip.city}</h2>
      <p class="trip-detail-country">${trip.country}</p>
      <div class="trip-detail-info">
        <span>${trip.date || trip.year}</span>
        <span class="trip-detail-rating">${this.renderStars(trip.rating)}</span>
        <span>${trip.is_planned ? '🔵 План' : '🔴 Было'}</span>
      </div>
      <div class="trip-detail-impressions"><div class="impressions-box">${trip.impressions || 'Нет описания'}</div></div>
      ${photosHTML}
      <div class="trip-detail-buttons">
        <button class="btn-small" id="btn-show-on-map">Показать на карте</button>
        <button class="btn-small" id="btn-edit-trip">Редактировать</button>
        <button class="btn-small danger" id="btn-delete-trip">Удалить</button>
      </div>
    `;

    //кнопка показать на карте
    document.getElementById('btn-show-on-map').addEventListener('click', async () => {
      this.closeViewModal();
      App.switchSection('map');
      setTimeout(async () => {
        if (MapModule.map) {
          const markers = await Storage.getMarkers();
          const marker = markers.find(m => m.trip_id === trip.id);
          if (marker) {
            MapModule.map.setCenter([marker.latitude, marker.longitude], 12);
            MapModule.map.geoObjects.each(geo => {
              if (geo.geometry && geo.geometry.getCoordinates) {
                const coords = geo.geometry.getCoordinates();
                if (coords[0] === marker.latitude && coords[1] === marker.longitude) {
                  geo.balloon.open();
                }
              }
            });
          } else {
            MapModule.map.setCenter([55.76, 37.64], 5);
            const searchControl = new ymaps.control.SearchControl({
              options: { provider: 'yandex#search', noPlacemark: false }
            });
            MapModule.map.controls.add(searchControl);
            searchControl.search(trip.country + ' ' + trip.city);
          }
        }
      }, 500);
    });

    //кнопка редактировать
    document.getElementById('btn-edit-trip').addEventListener('click', () => {
      this.closeViewModal();
      this.openEditModal(trip);
    });

    //кнопка удалить
    document.getElementById('btn-delete-trip').addEventListener('click', () => {
      this.tripToDelete = trip.id;
      document.getElementById('modal-confirm-delete-trip').classList.add('active');
    });

    document.getElementById('modal-view').classList.add('active');
  },

  //отображение звезд
  renderStars(rating) {
    if (!rating) return '—';
    const filled = Math.round(rating / 2);
    return '★'.repeat(filled) + '☆'.repeat(5 - filled);
  },

  //открытие фото на весь эран
  openFullscreenPhoto(src) {
    document.getElementById('fullscreen-img').src = src;
    document.getElementById('fullscreen-photo').classList.add('active');
  },

  //добавление/редактирование

  //открыть модал окно добавления
  openAddModal() {
    document.getElementById('modal-title').textContent = 'Добавить путешествие';
    document.getElementById('form-trip').reset();
    document.getElementById('trip-id').value = '';
    document.getElementById('trip-rating').value = '';
    document.querySelectorAll('#star-rating span').forEach(s => { s.textContent = '☆'; });
    document.getElementById('modal-trip').classList.add('active');
  },

  //открыть модал окно редактирования
  openEditModal(trip) {
    document.getElementById('modal-title').textContent = 'Редактировать путешествие';
    document.getElementById('trip-id').value = trip.id;
    document.getElementById('trip-country').value = trip.country;
    document.getElementById('trip-city').value = trip.city;
    document.getElementById('trip-date').value = trip.date || '';
    document.getElementById('trip-impressions').value = trip.impressions || '';
    document.getElementById('trip-planned').checked = trip.is_planned || false;
    document.getElementById('modal-trip').classList.add('active');

    //звезды
    const currentRating = parseInt(trip.rating) || 0;
    document.getElementById('trip-rating').value = currentRating;
    document.querySelectorAll('#star-rating span').forEach(s => {
      s.textContent = parseInt(s.dataset.value) <= currentRating ? '★' : '☆';
    });
  },

  //закрыть модал окно формы
  closeModal() {
    document.getElementById('modal-trip').classList.remove('active');
  },

  //закрыть модал окно просмотра
  closeViewModal() {
    document.getElementById('modal-view').classList.remove('active');
  },

  //сохранение

  //собрать данные и сохранить поездку
  async saveTrip() {
    const id = document.getElementById('trip-id').value;
    const iso_planned = document.getElementById('trip-planned').checked;
    const photoFiles = document.getElementById('trip-photo').files;
    const dateValue = document.getElementById('trip-date').value;

    const tripData = {
      country:     document.getElementById('trip-country').value.trim(),
      city:        document.getElementById('trip-city').value.trim(),
      year:        dateValue ? parseInt(dateValue.split('-')[0]) : new Date().getFullYear(),
      date:        dateValue,
      impressions: document.getElementById('trip-impressions').value.trim(),
      rating:      document.getElementById('trip-rating').value || null,
      photos:      [],
      is_planned:  iso_planned
    };

    if (!tripData.country || !tripData.city || !tripData.date) {
      alert('Заполните обязательные поля: Страна, Город, Дата');
      return;
    }

    //конвертация фото
    if (photoFiles.length > 0) {
      for (let i = 0; i < photoFiles.length; i++) {
        const reader = new FileReader();
        const result = await new Promise((resolve) => {
          reader.onload = (e) => resolve(e.target.result);
          reader.readAsDataURL(photoFiles[i]);
        });
        tripData.photos.push(result);
      }
    }

    await this.doSaveTrip(id, tripData);
  },

  //отправка данных на сервер и обновление маркеров и списка
  async doSaveTrip(id, tripData) {
    // сохраняем фото в localStorage
    if (tripData.photos.length > 0) {
      const photoKey = 'td_trip_photos_' + (id || Date.now());
      localStorage.setItem(photoKey, JSON.stringify(tripData.photos));
      tripData.photo_key = photoKey;
      tripData.photo = tripData.photos[0];
    }

    let result;
    if (id) {
      result = await Storage.updateTrip(parseInt(id), tripData);
    } else {
      result = await Storage.addTrip(tripData);
    }

    if (result.ok) {
      //обновление цвета маркера при редактировании
      if (id && result.trip) {
        const markers = await Storage.getMarkers();
        const marker = markers.find(m => m.trip_id === parseInt(id));
        if (marker) {
          const newColor = result.trip.is_planned ? 'blue' : 'red';
          if (marker.color !== newColor) {
            await Storage.request('/api/markers/' + marker.id, {
              method: 'PUT',
              body: JSON.stringify({ color: newColor })
            });
          }
        }
      }

      //создание маркера для новой поездки
      if (!id && result.trip) {
        const trip = result.trip;
        try {
          const geoResult = await fetch(
            `https://geocode-maps.yandex.ru/1.x/?apikey=${MapModule.API_KEY}&format=json&geocode=${encodeURIComponent(trip.country + ' ' + trip.city)}`
          );
          const geoData = await geoResult.json();
          const pos = geoData.response.GeoObjectCollection.featureMember[0]?.GeoObject?.Point?.pos;
          if (pos) {
            const [lon, lat] = pos.split(' ').map(Number);
            const markerResult = await Storage.addMarker({
              latitude: lat, longitude: lon,
              country: trip.country, city: trip.city,
              color: trip.is_planned ? 'blue' : 'red',
              trip_id: trip.id
            });
            if (markerResult.ok && MapModule.map) {
              MapModule.addMarkerToMap(markerResult.marker.id, lat, lon,
                trip.is_planned ? 'blue' : 'red', trip.city, trip.country);
            }
          }
        } catch(e) {}
      }

      this.closeModal();

      //обновляю список и карту
      this.loadTrips();
      if (MapModule.map) MapModule.loadMarkers();

      // показываю результат
      if (id && result.trip) {
        this.viewTrip(result.trip);
      } else if (result.trip) {
        this.viewTrip(result.trip);
      } else {
        this.loadTrips();
      }
    } else {
      alert('Ошибка сохранения: ' + (result.error || 'неизвестная ошибка'));
    }
  },
};