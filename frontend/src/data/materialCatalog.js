export function buildMaterialCatalog(requests = []) {
  const map = new Map();

  requests.forEach((request) => {
    (request.materials || []).forEach((item) => {
      const key = item.agreement_material_id || `manual:${item.material_name || item.id}`;
      if (!key) return;

      map.set(key, {
        id: item.agreement_material_id ?? key,
        name: item.material_name || `Материал ${item.agreement_material_id || ''}`,
        unit: item.material_unit || item.unit || '',
      });
    });
  });

  return Array.from(map.values());
}
