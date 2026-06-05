//список поездок, добавление/редактирование/удаление, поиск, фото, звезды, связь с картой

const TripsModule = {

  tripToDelete: null,    //id поездки на удаление (для модального окна)
  mergeTripId: null,
  pendingGroupDelete: null,
  pendingRemoveFromGroup: null,

  //инициализация
  init() {
    this.currentGroup = null;
    this.pendingGroupDelete = null;
    this.pendingRemoveFromGroup = null;
    this.pendingRenameGroup = null;
    //document.getElementById('btn-add-trip').addEventListener('click', () => this.openAddModal());
    document.getElementById('btn-cancel-trip').addEventListener('click', () => this.closeModal());
    document.getElementById('form-trip').addEventListener('submit', e => { e.preventDefault(); this.saveTrip(); });

    document.getElementById('btn-cancel-remove-group').addEventListener('click', () => {
      document.getElementById('modal-confirm-remove-from-group').classList.remove('active');
    });
    document.getElementById('btn-confirm-remove-group').addEventListener('click', async () => {
      const { trip } = this.pendingRemoveFromGroup;
      if (trip) {
        await Storage.updateTrip(trip.id, { group_id: null, group_name: null });
      }
      document.getElementById('modal-confirm-remove-from-group').classList.remove('active');
      this.closeViewModal();
      this.loadTrips();
    });

    document.getElementById('btn-cancel-rename-group').addEventListener('click', () => {
      document.getElementById('modal-rename-group').classList.remove('active');
    });
    document.getElementById('btn-confirm-rename-group').addEventListener('click', async () => {
      const newName = document.getElementById('rename-group-input').value.trim();
      if (newName && this.pendingRenameGroup) {
        for (const trip of this.pendingRenameGroup) {
          await Storage.updateTrip(trip.id, { group_name: newName });
        }
      }
      document.getElementById('modal-rename-group').classList.remove('active');
      this.closeViewModal();
      this.loadTrips();
    });

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

    document.getElementById('btn-cancel-delete-group').addEventListener('click', () => {
      document.getElementById('modal-confirm-delete-group').classList.remove('active');
    });
    document.getElementById('btn-confirm-delete-group').addEventListener('click', async () => {
      const group = this.pendingGroupDelete;
      if (group) {
        for (const trip of group) {
          await Storage.updateTrip(trip.id, { group_id: null, group_name: null });
        }
      }
      document.getElementById('modal-confirm-delete-group').classList.remove('active');
      this.closeViewModal();
      this.loadTrips();
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

    document.getElementById('btn-cancel-delete-photo').addEventListener('click', () => {
      document.getElementById('modal-confirm-delete-photo').classList.remove('active');
    });
    document.getElementById('btn-confirm-delete-photo').addEventListener('click', () => {
      this.confirmDeletePhoto();
    });
    document.addEventListener('keydown', (e) => {
      if (!document.getElementById('fullscreen-photo').classList.contains('active')) return;
      if (e.key === 'ArrowRight') this.nextFullscreenPhoto();
      if (e.key === 'ArrowLeft') this.prevFullscreenPhoto();
      if (e.key === 'Escape') document.getElementById('fullscreen-photo').classList.remove('active');
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

  //загрузка и отображение поездок
  async loadTrips() {
    const trips = await Storage.getTrips();
    this.allTrips = trips;
    trips.sort((a, b) => { const dateA = a.date || a.year.toString(); const dateB = b.date || b.year.toString(); return dateB.localeCompare(dateA); });

    const visitedList = document.getElementById('list-visited');
    const plannedList = document.getElementById('list-planned');
    visitedList.innerHTML = '';
    plannedList.innerHTML = '';

    const groups = {};
    const ungrouped = [];
    trips.forEach(trip => {
      if (trip.group_id) {
        if (!groups[trip.group_id]) groups[trip.group_id] = [];
        groups[trip.group_id].push(trip);
      } else {
        ungrouped.push(trip);
      }
    });

    // отображаем группы
    Object.values(groups).forEach(group => {
      const card = this.createGroupCard(group);
      if (group[0].is_planned) plannedList.appendChild(card);
      else visitedList.appendChild(card);
    });

    // отображаем одиночные
    ungrouped.forEach(trip => {
      const card = this.createTripCard(trip);
      if (trip.is_planned) plannedList.appendChild(card);
      else visitedList.appendChild(card);
    });

    if (!visitedList.children.length) {
      visitedList.innerHTML = '<div style="background:rgba(255,255,255,0.6);border:1px solid rgba(132,152,89,0.1);border-radius:6px;padding:0.7rem;text-align:center;margin:0.3rem 0;width:25%;margin-left:auto;margin-right:auto;"><p style="font-family:\'Raleway\',sans-serif;font-size:0.65rem;font-weight:700;color:#849859;text-transform:uppercase;letter-spacing:0.04em;margin:0;">Здесь появятся воспоминания о ваших поездках</p></div>';
    }
    if (!plannedList.children.length) {
      plannedList.innerHTML = '<div style="background:rgba(255,255,255,0.6);border:1px solid rgba(132,152,89,0.1);border-radius:6px;padding:0.7rem;text-align:center;margin:0.3rem 0;width:25%;margin-left:auto;margin-right:auto;"><p style="font-family:\'Raleway\',sans-serif;font-size:0.65rem;font-weight:700;color:#849859;text-transform:uppercase;letter-spacing:0.04em;margin:0;">Планируйте будущие поездки</p></div>';
    }
  },

  createGroupCard(group) {
    const div = document.createElement('div');
    div.className = 'trip-card';
    div.innerHTML = '<div class="trip-card-left"><h4>📁 ' + (group[0].place || group[0].city) + ', ' + group[0].country + '</h4><span>' + group.length + ' поездок</span></div>';
    div.addEventListener('click', () => this.viewGroup(group));
    return div;
  },

  viewGroup(group) {
    this.currentGroup = group;
    const groupId = group[0].group_id;
    
    let html = '<h2>' + (group[0].group_name || group[0].place || group[0].city) + ', ' + group[0].country + '</h2>';
    group.forEach(trip => {
      html += '<div class="trip-card" style="margin-bottom:0.5rem;cursor:pointer;"><div class="trip-card-left"><h4>' + (trip.place || trip.city) + '</h4><span>' + trip.year + ' г.</span></div></div>';
    });
    html += '<div class="modal-buttons" style="margin-top:1rem;"><button class="btn-small" id="btn-add-to-group">Добавить в группу</button><button class="btn-small" id="btn-rename-group">Переименовать</button><button class="btn-small danger" id="btn-delete-group">Удалить группу</button><button class="btn-cancel" id="btn-close-group">Закрыть</button></div>';
    document.getElementById('view-content').innerHTML = html;
    const closeBtn = document.querySelector('.modal-close-btn');
    if (closeBtn) closeBtn.style.display = 'none';
    
    document.querySelectorAll('#view-content .trip-card').forEach((card, i) => {
      card.addEventListener('click', () => {
        const savedGroup = this.currentGroup;
        this.closeViewModal();
        setTimeout(() => {
          this.viewTrip(group[i]);
          this.currentGroup = savedGroup;
        }, 100);
      });
      card.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        this.pendingRemoveFromGroup = { trip: group[i], group: group };
        document.getElementById('modal-confirm-remove-from-group').classList.add('active');
      });
    });

    document.getElementById('btn-delete-group').addEventListener('click', () => {
      this.pendingGroupDelete = group;
      document.getElementById('modal-confirm-delete-group').classList.add('active');
    });

    document.getElementById('btn-rename-group').addEventListener('click', () => {
      document.getElementById('rename-group-input').value = group[0].group_name || group[0].place || group[0].city || '';
      this.pendingRenameGroup = group;
      document.getElementById('modal-rename-group').classList.add('active');
    });
    
    document.getElementById('btn-close-group').addEventListener('click', () => this.closeViewModal());
    
    document.getElementById('btn-add-to-group').addEventListener('click', async () => {
      this.closeViewModal();
      // получаем все поездки без группы
      const allTrips = await Storage.getTrips();
      const ungrouped = allTrips.filter(t => !t.group_id);
      if (ungrouped.length === 0) {
        this.showInfo('Нет поездок', 'Все поездки уже добавлены в группы.');
        return;
      }
      this.showAddToGroupModal(ungrouped, groupId);
    });
    
    document.getElementById('modal-view').classList.add('active');
  },

  showAddToGroupModal(trips, groupId) {
    const list = trips.map(t =>
      '<div class="friend-item"><label><input type="checkbox" value="' + t.id + '"> ' + (t.place || t.city) + ', ' + t.country + '</label></div>'
    ).join('');
    
    document.getElementById('merge-list').innerHTML = list;
    document.getElementById('merge-name').style.display = 'none';
    document.querySelector('#modal-merge h3').textContent = 'Добавить в группу';
    document.getElementById('modal-merge').classList.add('active');
    
    document.getElementById('btn-cancel-merge').onclick = () => {
      document.getElementById('modal-merge').classList.remove('active');
      document.getElementById('merge-name').style.display = 'block';
      document.querySelector('#modal-merge h3').textContent = 'Объединить поездки';
    };
    
    document.getElementById('btn-confirm-merge').onclick = async () => {
      const checkboxes = document.querySelectorAll('#merge-list input:checked');
      const ids = Array.from(checkboxes).map(cb => parseInt(cb.value));
      
      const trips = await Storage.getTrips();
      const groupTrip = trips.find(t => t.group_id === groupId);
      const groupName = groupTrip?.group_name || '';
      
      for (const id of ids) {
        await Storage.updateTrip(id, { group_id: groupId, group_name: groupName });
      }
      document.getElementById('modal-merge').classList.remove('active');
      document.getElementById('merge-name').style.display = 'block';
      document.querySelector('#modal-merge h3').textContent = 'Объединить поездки';
      this.loadTrips();
    };
  },

  findTrip(id) {
    // ищем поездку в загруженных данных
    return this.allTrips?.find(t => t.id === id);
  },

  createTripCard(trip) {
    const div = document.createElement('div');
    div.className = 'trip-card' + (trip.is_planned ? ' planned' : '');
    const title = trip.city || trip.place;
    const subtitle = trip.city ? (trip.place || trip.country) : trip.country;
    div.innerHTML = `
      <div class="trip-card-left">
        <h4>${title}</h4>
        <span>${subtitle} · ${trip.year} г.</span>
      </div>
    `;
    div.addEventListener('click', () => this.viewTrip(trip));
    return div;
  },

  //просмотр поездки

  //открытие окна
  viewTrip(trip) {
    let photos = [];
    if (trip.photo_key) {
      const saved = localStorage.getItem(trip.photo_key);
      if (saved) {
        try { photos = JSON.parse(saved); } catch (e) { photos = []; }
      }
    }
    if (photos.length === 0 && trip.photos && trip.photos.length > 0) {
      photos = trip.photos;
    }
    if (photos.length === 0 && trip.photo && trip.photo !== 'null' && trip.photo !== null) {
      photos = [trip.photo];
    }

    this.currentViewPhotos = photos;

    let photosHTML = '';
    if (photos.length > 0) {
      photosHTML = `
        <div class="trip-photos-section">
          <div class="trip-photos-label">Фотографии (${photos.length})</div>
          <div class="trip-photos-scroll">
            ${photos.map(photo => `
              <div class="trip-photo-item" style="background-image: url('${photo}')" onclick="TripsModule.openFullscreenPhoto('${photo}', TripsModule.currentViewPhotos, ${photos.indexOf(photo)})" oncontextmenu="TripsModule.deletePhoto(event, ${trip.id}, '${photo}'); return false;"></div>
            `).join('')}
          </div>
        </div>`;
    }

    //содержимое
    const title = trip.city || trip.place;
    const subtitle = trip.city ? (trip.place ? trip.place + ', ' : '') + trip.country : trip.country;
    document.getElementById('view-content').innerHTML = `
      <h2 class="trip-detail-city">${title}</h2>
      <p class="trip-detail-country">${subtitle}</p>
      <div class="trip-detail-info">
        <span>${trip.date || trip.year}</span>
        <span class="trip-detail-rating">${this.renderStars(trip.rating)}</span>
        <span>${trip.is_planned ? '🔵 Запланировано' : '🔴 Посещено'}</span>
      </div>
      <div class="trip-detail-impressions"><div class="impressions-box">${trip.impressions || 'Нет описания'}</div></div>
      ${photosHTML}
      <div class="trip-detail-buttons">
        <button class="btn-small" id="btn-show-on-map">Показать на карте</button>
        <button class="btn-small" id="btn-edit-trip">Редактировать</button>
        ${!trip.group_id ? '<button class="btn-small" id="btn-merge-trip">Объединить</button>' : ''}
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
            searchControl.search(trip.country + ' ' + (trip.city || trip.place));
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

    if (!trip.group_id) {
      document.getElementById('btn-merge-trip').addEventListener('click', async () => {
        this.closeViewModal();
        this.openMergeModal(trip);
      });
    }

    document.getElementById('btn-close-view').addEventListener('click', () => {
      this.closeViewModal();
      if (trip.group_id && this.currentGroup) {
        setTimeout(() => this.viewGroup(this.currentGroup), 200);
      }
    });

    document.getElementById('modal-view').classList.add('active');
    if (photos.length > 1) {
      setTimeout(() => {
        const inner = document.querySelector('.trip-photos-inner');
        if (inner) {
          document.getElementById('photo-scroll-left').addEventListener('click', () => {
            inner.scrollBy({ left: -170, behavior: 'smooth' });
          });
          document.getElementById('photo-scroll-right').addEventListener('click', () => {
            inner.scrollBy({ left: 170, behavior: 'smooth' });
          });
        }
      }, 100);
    }
  },

  //отображение звезд
  renderStars(rating) {
    if (!rating) return '—';
    const filled = Math.round(rating / 2);
    return '★'.repeat(filled) + '☆'.repeat(5 - filled);
  },

  currentFullscreenPhotos: [],
  currentFullscreenIndex: 0,

  openFullscreenPhoto(src, allPhotos, index) {
    this.currentFullscreenPhotos = allPhotos || [src];
    this.currentFullscreenIndex = index || 0;
    document.getElementById('fullscreen-img').src = src;
    document.getElementById('fullscreen-photo').classList.add('active');
  },

  nextFullscreenPhoto() {
    if (this.currentFullscreenPhotos.length === 0) return;
    this.currentFullscreenIndex = (this.currentFullscreenIndex + 1) % this.currentFullscreenPhotos.length;
    document.getElementById('fullscreen-img').src = this.currentFullscreenPhotos[this.currentFullscreenIndex];
  },

  prevFullscreenPhoto() {
    if (this.currentFullscreenPhotos.length === 0) return;
    this.currentFullscreenIndex = (this.currentFullscreenIndex - 1 + this.currentFullscreenPhotos.length) % this.currentFullscreenPhotos.length;
    document.getElementById('fullscreen-img').src = this.currentFullscreenPhotos[this.currentFullscreenIndex];
  },

  //добавление/редактирование

  //открыть модал окно добавления
  openAddModal() {
    document.getElementById('modal-title').textContent = 'Добавить путешествие';
    document.getElementById('form-trip').reset();
    document.getElementById('trip-id').value = '';
    document.getElementById('trip-country').value = '';
    document.getElementById('trip-city').value = '';
    document.getElementById('trip-date').value = '';
    document.getElementById('trip-impressions').value = '';
    document.getElementById('trip-rating').value = '';
    document.getElementById('trip-planned').checked = false;
    document.getElementById('impressions-count').textContent = '0/500';
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
    document.getElementById('trip-place').value = trip.place || '';

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
    const closeBtn = document.querySelector('.modal-close-btn');
    if (closeBtn) closeBtn.style.display = '';
  },

  //сохранение

  //собрать данные и сохранить поездку
  async saveTrip() {
    const id = document.getElementById('trip-id').value;
    const iso_planned = document.getElementById('trip-planned').checked;
    const photoFiles = document.getElementById('trip-photo').files;
    const dateValue = document.getElementById('trip-date').value;

    // получаем старые фото, если редактируем
    let oldPhotos = [];
    if (id) {
      const oldPhotoKey = 'td_trip_photos_' + id;
      const savedOld = localStorage.getItem(oldPhotoKey);
      if (savedOld) {
        try { oldPhotos = JSON.parse(savedOld); } catch (e) { oldPhotos = []; }
      }
    }
    console.log('ID:', id, 'Старых фото:', oldPhotos.length);


    const tripData = {
      country: document.getElementById('trip-country').value.trim(),
      city: document.getElementById('trip-city').value.trim(),
      place: document.getElementById('trip-place')?.value?.trim() || '',
      year: dateValue ? parseInt(dateValue.split('-')[0]) : new Date().getFullYear(),
      date: dateValue,
      impressions: document.getElementById('trip-impressions').value.trim(),
      rating: document.getElementById('trip-rating').value || null,
      photos: oldPhotos,
      is_planned: iso_planned
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
          reader.onload = (e) => {
            // сжимаем фото
            const img = new Image();
            img.onload = () => {
              const canvas = document.createElement('canvas');
              const maxSize = 800;
              let w = img.width, h = img.height;
              if (w > h) { h = Math.round(h * maxSize / w); w = maxSize; }
              else { w = Math.round(w * maxSize / h); h = maxSize; }
              canvas.width = w; canvas.height = h;
              canvas.getContext('2d').drawImage(img, 0, 0, w, h);
              resolve(canvas.toDataURL('image/jpeg', 0.6));
            };
            img.src = e.target.result;
          };
          reader.readAsDataURL(photoFiles[i]);
        });
        tripData.photos.push(result);
      }
    }
    tripData.photos_json = JSON.stringify(tripData.photos);
    delete tripData.photos;
    await this.doSaveTrip(id, tripData);
  },

  //отправка данных на сервер и обновление маркеров и списка
  async doSaveTrip(id, tripData) {
    const photosArray = tripData.photos_json ? JSON.parse(tripData.photos_json) : [];
    let photoKey = 'td_trip_photos_' + (id || Date.now());

    if (photosArray.length > 0 || id) {
      if (id) {
        localStorage.setItem('td_trip_photos_' + id, JSON.stringify(photosArray));
        tripData.photo_key = 'td_trip_photos_' + id;
      } else {
        localStorage.setItem(photoKey, JSON.stringify(photosArray));
        tripData.photo_key = photoKey;
      }
      tripData.photo = JSON.stringify(photosArray);
    }

    let result;
    if (id) {
      result = await Storage.updateTrip(parseInt(id), tripData);
    } else {
      result = await Storage.addTrip(tripData);
    }

    if (result.ok) {
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

      if (!id && result.trip) {
        const trip = result.trip;
        try {
          // формируем адрес для поиска
          const query = trip.place
            ? trip.place + ', ' + trip.city + ', ' + trip.country
            : trip.city + ', ' + trip.country;

          // используем поиск через API Яндекс.Карт
          const searchResult = await fetch(
            `https://search-maps.yandex.ru/v1/?text=${encodeURIComponent(query)}&type=geo&lang=ru_RU&apikey=${MapModule.API_KEY}`
          );
          const searchData = await searchResult.json();

          if (searchData.features && searchData.features.length > 0) {
            const [lon, lat] = searchData.features[0].geometry.coordinates;
            const markerResult = await Storage.addMarker({
              latitude: lat, longitude: lon,
              country: trip.country,
              city: trip.city || trip.place,
              color: trip.is_planned ? 'blue' : 'red',
              trip_id: trip.id
            });
            if (markerResult.ok && MapModule.map) {
              const markerTitle = trip.place || trip.city || trip.country;
              MapModule.addMarkerToMap(markerResult.marker.id, lat, lon,
                trip.is_planned ? 'blue' : 'red', markerTitle, trip.country);
            }
          }
        } catch (e) {
          console.log('Ошибка геокодирования:', e);
        }
      }
      this.loadTrips();
      if (MapModule.map) MapModule.loadMarkers();

      if (id && result.trip) {
        this.viewTrip(result.trip);
      } else if (result.trip) {
        this.viewTrip(result.trip);
      }
    } else {
      alert('Ошибка сохранения: ' + (result.error || 'неизвестная ошибка'));
    }
  },

  deletePhoto(e, tripId, photoSrc) {
    e.preventDefault();
    this.pendingPhotoDelete = { tripId, photoSrc };
    document.getElementById('modal-confirm-delete-photo').classList.add('active');
  },

  async confirmDeletePhoto() {
    const { tripId, photoSrc } = this.pendingPhotoDelete;
    if (!tripId) return;

    const photoKey = 'td_trip_photos_' + tripId;
    const saved = localStorage.getItem(photoKey);
    if (!saved) return;

    let photos = JSON.parse(saved);
    photos = photos.filter(p => p !== photoSrc);

    if (photos.length > 0) {
      localStorage.setItem(photoKey, JSON.stringify(photos));
    } else {
      localStorage.removeItem(photoKey);
    }

    await Storage.updateTrip(tripId, {
      photo: photos.length > 0 ? JSON.stringify(photos) : null,
      photos: JSON.stringify(photos),
      photo_key: photos.length > 0 ? photoKey : null
    });

    document.getElementById('modal-confirm-delete-photo').classList.remove('active');

    const trips = await Storage.getTrips();
    const updatedTrip = trips.find(t => t.id === tripId);
    if (updatedTrip) this.viewTrip(updatedTrip);
  },

  // открыть окно объединения
  async openMergeModal(trip) {
    const allTrips = await Storage.getTrips();
    
    // группируем: группы показываем как один пункт, одиночные — как отдельные
    const groups = {};
    const ungrouped = [];
    
    allTrips.forEach(t => {
      if (t.group_id) {
        if (!groups[t.group_id]) groups[t.group_id] = [];
        groups[t.group_id].push(t);
      } else {
        ungrouped.push(t);
      }
    });
    
    // формируем список: группы + одиночные поездки
    let list = '';
    
    // группы
    Object.values(groups).forEach(group => {
      const groupName = group[0].group_name || group[0].place || group[0].city;
      const isCurrentGroup = group[0].group_id === trip.group_id;
      list += '<div class="friend-item"><label><input type="checkbox" value="group_' + group[0].group_id + '" ' + (isCurrentGroup ? 'checked' : '') + '>  ' + groupName + ' (' + group.length + ' поездок)</label></div>';
    });
    
    // одиночные
    ungrouped.forEach(t => {
      list += '<div class="friend-item"><label><input type="checkbox" value="' + t.id + '" ' + (t.id === trip.id ? 'checked' : '') + '> ' + (t.place || t.city) + ', ' + t.country + '</label></div>';
    });
    
    document.getElementById('merge-list').innerHTML = list;
    document.getElementById('merge-name').value = trip.place || trip.city || '';
    this.mergeTripId = trip.id;
    document.getElementById('modal-merge').classList.add('active');
    
    document.getElementById('btn-cancel-merge').onclick = () => {
      document.getElementById('modal-merge').classList.remove('active');
    };
    
    document.getElementById('btn-confirm-merge').onclick = async () => {
      const checkboxes = document.querySelectorAll('#merge-list input:checked');
      const name = document.getElementById('merge-name').value.trim() || 'Объединённая поездка';
      const groupId = Date.now();
      
      const allIds = [];
      
      for (const cb of checkboxes) {
        const val = cb.value;
        if (val.startsWith('group_')) {
          // это группа — добавляем все поездки из группы
          const gId = parseInt(val.replace('group_', ''));
          const groupTrips = allTrips.filter(t => t.group_id === gId);
          groupTrips.forEach(t => allIds.push(t.id));
        } else {
          // одиночная поездка
          allIds.push(parseInt(val));
        }
      }
      
      for (const id of allIds) {
        await Storage.updateTrip(id, { group_id: groupId, group_name: name });
      }
      
      document.getElementById('modal-merge').classList.remove('active');
      this.loadTrips();
    };
  },
  // создать карточку группы
  createGroupCard(group) {
    const groupCopy = [...group]; // копия массива
    const div = document.createElement('div');
    div.className = 'trip-card';
    div.innerHTML = '<div class="trip-card-left"><h4>' + (group[0].group_name || group[0].place || group[0].city) + '</h4><span>' + group.length + ' поездок · ' + group[0].country + '</span></div>';
    div.addEventListener('click', () => this.viewGroup(groupCopy));
    return div;
  },
  showInfo(title, message) {
    document.getElementById('modal-info-title').textContent = title;
    document.getElementById('modal-info-message').textContent = message;
    document.getElementById('modal-info').classList.add('active');
    
    document.getElementById('btn-close-info').onclick = () => {
      document.getElementById('modal-info').classList.remove('active');
      // возвращаемся в группу
      if (this.currentGroup) {
        setTimeout(() => this.viewGroup(this.currentGroup), 200);
      }
    };
  }
};