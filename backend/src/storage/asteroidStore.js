const map = new Map();

export const asteroidStore = {
  upsertMany(records) {
    for (const item of records) {
      map.set(item.id, item);
    }
  },
  getAll() {
    return Array.from(map.values());
  },
  getByIds(ids) {
    return ids.map((id) => map.get(id)).filter(Boolean);
  },
  clear() {
    map.clear();
  }
};
