const DB = {
  getAll(table) {
    const data = localStorage.getItem('ce_' + table);
    return data ? JSON.parse(data) : [];
  },

  insert(table, item) {
    const items = this.getAll(table);
    const newItem = {
      ...item,
      id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
      createdAt: new Date().toISOString(),
    };
    items.push(newItem);
    localStorage.setItem('ce_' + table, JSON.stringify(items));
    return newItem;
  },

  update(table, id, updates) {
    const items = this.getAll(table);
    const idx = items.findIndex(i => i.id === id);
    if (idx === -1) throw new Error('Not found');
    items[idx] = { ...items[idx], ...updates };
    localStorage.setItem('ce_' + table, JSON.stringify(items));
    return items[idx];
  },

  delete(table, id) {
    const items = this.getAll(table).filter(i => i.id !== id);
    localStorage.setItem('ce_' + table, JSON.stringify(items));
  },

  where(table, field, value) {
    return this.getAll(table).filter(i => i[field] === value);
  },

  findById(table, id) {
    return this.getAll(table).find(i => i.id === id) || null;
  },

  findOne(table, field, value) {
    return this.getAll(table).find(i => i[field] === value) || null;
  },

  setAll(table, items) {
    localStorage.setItem('ce_' + table, JSON.stringify(items));
  }
};

window.DB = DB;
