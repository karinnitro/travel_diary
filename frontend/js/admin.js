const AdminModule = {
  pendingDeleteId: null,

  init() {
    this.loadStats();
    this.loadUsers();
    document.getElementById('btn-confirm-delete-user').addEventListener('click', async () => {
      await Storage.request('/api/admin/users/' + this.pendingDeleteId, { method: 'DELETE' });
      document.getElementById('modal-confirm-delete-user').classList.remove('active');
      this.loadUsers();
      this.loadStats();
    });
    document.getElementById('btn-cancel-delete-user').addEventListener('click', () => {
      document.getElementById('modal-confirm-delete-user').classList.remove('active');
    });
  },

  async loadStats() {
    const data = await Storage.request('/api/admin/stats');
    if (data.ok) {
      document.getElementById('admin-stats').innerHTML =
        '<div class="admin-stat-card"><span class="admin-stat-number">' + data.stats.users + '</span><span class="admin-stat-label">Пользователей</span></div>' +
        '<div class="admin-stat-card"><span class="admin-stat-number">' + data.stats.trips + '</span><span class="admin-stat-label">Поездок</span></div>' +
        '<div class="admin-stat-card"><span class="admin-stat-number">' + data.stats.markers + '</span><span class="admin-stat-label">Маркеров</span></div>';
    }
  },

  async loadUsers() {
    const data = await Storage.request('/api/admin/users');
    if (data.ok) {
      document.getElementById('admin-users-list').innerHTML = data.users.map(u =>
        '<div class="admin-user-card"><span>' + u.name + ' (@' + u.login + ') — ' + u.status + ' | 🌍 ' + u.visited_countries + ' стран | ' + u.trips_count + ' поездок</span><button onclick="AdminModule.deleteUser(' + u.id + ')">Удалить</button></div>'
      ).join('');
    }
  },
};