//маркеры, кластеризация, поиск, добавление и удаление

const MapModule = {
  map: null,                    // объект карты
  clusterer: null,              // кластеризатор маркеров
  API_KEY: '8fcd6d78-1747-469c-9180-b15a5352bbe5',
  currentCoords: null,          // координаты для нового маркера
  markerToDelete: null,         // id маркера на удаление

  //инициализация, загрузка апи
  init() {
    this.loadYandexMaps();
    this.bindModal();           // окно добавления маркера
    this.bindConfirmModal();    // окно подтверждения удаления
  },

  //загрузка скрипта карт
  loadYandexMaps() {
    const script = document.createElement('script');
    script.src = `https://api-maps.yandex.ru/2.1/?apikey=${this.API_KEY}&lang=ru_RU`;
    script.onload = () => this.onMapsLoaded();
    document.head.appendChild(script);
  },

  //настройка карты
  onMapsLoaded() {
    ymaps.ready(() => {
      // создание карты
      this.map = new ymaps.Map('map-container', {
        center: [55.76, 37.64],
        zoom: 4,
        controls: ['zoomControl']
      });

      //кластеризатор 
      this.clusterer = new ymaps.Clusterer({
        preset: 'islands#darkGreenClusterIcons',
        groupByCoordinates: false,
        clusterDisableClickZoom: false,
        clusterHideIconOnBalloonOpen: false,
        geoObjectHideIconOnBalloonOpen: false
      });
      this.map.geoObjects.add(this.clusterer);

      //поиск по карте
      const searchControl = new ymaps.control.SearchControl({
        options: {
          provider: 'yandex#search',
          noPlacemark: true
        }
      });
      this.map.controls.add(searchControl);

      //при выборе результата то открываем окно добавления
      searchControl.events.add('resultselect', (e) => {
        const index = e.get('index');
        searchControl.getResult(index).then((result) => {
          const coords = result.geometry.getCoordinates();
          this.showAddDialog(coords);
        });
      });

      //загружаю сохраненные маркеры с сервера
      this.loadMarkers();

      //нажатие по карте - открывается окно добавления
      this.map.events.add('click', (e) => {
        const coords = e.get('coords');
        this.showAddDialog(coords);
      });
    });
  },

  //добавление маркера

  //привязка кнопок модального окна маркера
  bindModal() {
    document.getElementById('btn-save-marker').addEventListener('click', () => this.saveMarker());
    document.getElementById('btn-cancel-marker').addEventListener('click', () => this.closeMarkerModal());
  },

  //показ окна добавления маркера
  async showAddDialog(coords) {
    this.currentCoords = coords;
    document.getElementById('marker-country').value = '';
    document.getElementById('marker-city').value = '';
    document.getElementById('marker-place').value = '';
    document.querySelector('input[name="marker-type"][value="red"]').checked = true;
    document.getElementById('modal-marker').classList.add('active');

    // автоопределение адреса через геокодер Яндекс
    try {
      const geoResult = await fetch(
        `https://geocode-maps.yandex.ru/1.x/?apikey=${this.API_KEY}&format=json&geocode=${coords[0]},${coords[1]}&sco=latlong`
      );
      const geoData = await geoResult.json();
      const geoObject = geoData.response.GeoObjectCollection.featureMember[0]?.GeoObject;
      if (geoObject) {
        const address = geoObject.metaDataProperty.GeocoderMetaData.Address;
        const country = address.Components.find(c => c.kind === 'country')?.name || '';
        const city = address.Components.find(c => c.kind === 'locality')?.name || '';
        const place = geoObject.name || '';
        document.getElementById('marker-country').value = country;
        document.getElementById('marker-city').value = city;
        if (place !== city) {
          document.getElementById('marker-place').value = place;
        }
      }
    } catch (e) { }
  },

  //закрытие окна маркера
  closeMarkerModal() {
    document.getElementById('modal-marker').classList.remove('active');
    this.currentCoords = null;
  },

  //сохранение маркера
  async saveMarker() {
    const country = document.getElementById('marker-country').value.trim();
    const city = document.getElementById('marker-city').value.trim();
    const place = document.getElementById('marker-place').value.trim();
    const color = document.querySelector('input[name="marker-type"]:checked').value;

    if (!country && !city && !place) {
      alert('Введите хотя бы страну, город или место');
      return;
    }
    const finalCity = city || place;
    const title = city || place;
    const subtitle = city ? (place || '') : '';

    const tripResult = await Storage.addTrip({
      country: country,
      city: city,
      place: place,
      year: new Date().getFullYear(),
      date: '',
      impressions: '',
      rating: null,
      photo: null,
      photos: [],
      photo_key: null,
      is_planned: color === 'blue'
    });

    //создаю маркер, привязанный к поездке
    if (tripResult.ok) {
      const markerResult = await Storage.addMarker({
        latitude: this.currentCoords[0],
        longitude: this.currentCoords[1],
        country: country,
        city: city,
        color: color,
        trip_id: tripResult.trip.id
      });

      if (markerResult.ok) {
        this.addMarkerToMap(
          markerResult.marker.id,
          this.currentCoords[0],
          this.currentCoords[1],
          color,
          title,
          country
        );
      }
    }

    this.closeMarkerModal();
  },

  //отображение маркеров

  //загрузка и рисунок маркеров
  async loadMarkers() {
    this.clusterer.removeAll();
    const markers = await Storage.getMarkers();
    markers.forEach(marker => {
      this.addMarkerToMap(
        marker.id,
        marker.latitude,
        marker.longitude,
        marker.color,
        marker.city || marker.country,
        marker.country
      );
    });
  },

  addMarkerToMap(id, lat, lon, color, title, country) {
    const placemark = new ymaps.Placemark([lat, lon], {
      balloonContentHeader: `<strong style="font-family:'Raleway',sans-serif;font-size:0.9rem;color:#5a6e3a;text-transform:uppercase;letter-spacing:0.04em;">${title || 'Точка'}</strong>`,
      balloonContentBody: `
        <p style="font-family:'Raleway',sans-serif;font-size:0.8rem;color:#849859;margin:6px 0;">${country || ''}</p>
        <div style="display:flex;align-items:center;gap:8px;margin:10px 0;">
          <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${color === 'red' ? '#e04a3a' : '#4a8ce0'};"></span>
          <span style="font-family:'Raleway',sans-serif;font-size:0.75rem;font-weight:600;color:#333;text-transform:uppercase;letter-spacing:0.04em;">${color === 'red' ? 'Посещено' : 'Запланировано'}</span>
        </div>
        <button 
          onclick="MapModule.deleteMarker(${id})" 
          style="padding:8px 14px;background:#b5341e;color:#fff;border:none;border-radius:10px;cursor:pointer;font-family:'Raleway',sans-serif;font-size:0.75rem;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;width:100%;">
          Удалить
        </button>
      `
    }, {
      preset: color === 'red' ? 'islands#redIcon' : 'islands#blueIcon'
    });

    this.clusterer.add(placemark);
  },

  //удаление маркера

  //показ окна подтверждения
  async deleteMarker(id) {
    this.markerToDelete = id;
    document.getElementById('modal-confirm-delete').classList.add('active');
  },

  //подтверждение удаления
  async confirmDeleteMarker() {
    const id = this.markerToDelete;
    if (id) {
      await Storage.deleteMarker(id);
      this.loadMarkers();
      this.map.balloon.close();
    }
    this.closeConfirmModal();
  },

  //закртыие окна 
  closeConfirmModal() {
    document.getElementById('modal-confirm-delete').classList.remove('active');
    this.markerToDelete = null;
  },

  //привязка кнопок удаления
  bindConfirmModal() {
    document.getElementById('btn-confirm-delete').addEventListener('click', () => this.confirmDeleteMarker());
    document.getElementById('btn-cancel-delete').addEventListener('click', () => this.closeConfirmModal());
  },
};