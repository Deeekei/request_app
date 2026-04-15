export const materialCatalog = [
  { id: 1, name: 'Арматура А500С 12 мм', object: 'аурика' },
  { id: 2, name: 'Бетон В25', object: 'аурика' },
  { id: 3, name: 'Кирпич полнотелый М150', object: 'аурум' },
  { id: 4, name: 'Щебень фракции 20–40', object: 'максимус' },
  { id: 5, name: 'Песок карьерный', object: 'максимус' },
];

export function buildMaterialOptions(requests = []) {
  const map = new Map(materialCatalog.map((item) => [item.id, item]));

  requests.forEach((request) => {
    (request.materials || []).forEach((item) => {
      if (!item.agreement_material_id) return;
      map.set(item.agreement_material_id, {
        id: item.agreement_material_id,
        name: item.material_name || `Материал ${item.agreement_material_id}`,
        object: typeof request.object === 'string' ? request.object : request.object?.value,
      });
    });
  });

  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, 'ru'));
}
