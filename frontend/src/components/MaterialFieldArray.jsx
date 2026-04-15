const OBJECT_TITLES = {
  AURIKA: 'ЖК "Аурика"',
  AURUM: 'ЖК "Аурум"',
  MAXIMUS: 'ЖК "Максимус"',
  аурика: 'ЖК "Аурика"',
  аурум: 'ЖК "Аурум"',
  максимус: 'ЖК "Максимус"',
};

export function MaterialFieldArray({
  rows,
  onChange,
  onAdd,
  onRemove,
  materialOptions,
  currentObject,
  isLoading = false,
}) {
  return (
    <div className="stack-section">
      <div className="section-title-row">
        <div>
          <h2>Материалы</h2>
          <p>
            Выберите материал по названию
            {currentObject ? ` для объекта ${OBJECT_TITLES[currentObject] || currentObject}` : ''}.
          </p>
        </div>

        <button className="button secondary" type="button" onClick={onAdd}>
          Добавить материал
        </button>
      </div>

      <div className="stack-list">
        {rows.map((row, index) => {
          const selectedMaterial = materialOptions.find(
            (item) => String(item.id) === String(row.agreement_material_id)
          );

          const requestedQty = Number(row.quantity || 0);

          const availableQty = selectedMaterial
            ? Number(selectedMaterial.total_quantity || 0)
              - Number(selectedMaterial.reserved_quantity || 0)
              - Number(selectedMaterial.spent_quantity || 0)
            : 0;

          const willOverdraft = selectedMaterial && requestedQty > availableQty;

          return (
            <div className="material-row" key={`${index}-${row.agreement_material_id || 'new'}`}>
              <div className="field field-wide">
                <label>Материал</label>
                <select
                  value={row.agreement_material_id}
                  onChange={(event) => onChange(index, 'agreement_material_id', event.target.value)}
                  required
                  disabled={isLoading}
                >
                  <option value="">
                    {isLoading ? 'Загрузка материалов...' : 'Выберите материал'}
                  </option>

                  {materialOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.name}
                    </option>
                  ))}
                </select>

                {selectedMaterial ? (
                  <div className="meta-line wrap">
                    <span className="muted-pill">
                      Доступно: {availableQty} {selectedMaterial.unit || ''}
                    </span>
                    <span className="muted-pill">
                      Всего: {selectedMaterial.total_quantity} {selectedMaterial.unit || ''}
                    </span>
                    <span className="muted-pill">
                      Зарезервировано: {selectedMaterial.reserved_quantity} {selectedMaterial.unit || ''}
                    </span>
                    <span className="muted-pill">
                      Списано: {selectedMaterial.spent_quantity} {selectedMaterial.unit || ''}
                    </span>
                  </div>
                ) : null}

                {willOverdraft ? (
                  <div className="alert error" style={{ marginTop: '10px' }}>
                    Внимание: при текущем количестве возникнет перерасход.
                    Запрошено: {requestedQty} {selectedMaterial?.unit || ''},
                    доступно: {availableQty} {selectedMaterial?.unit || ''}.
                  </div>
                ) : null}
              </div>

              <div className="field">
                <label>Количество</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={row.quantity}
                  onChange={(event) => onChange(index, 'quantity', event.target.value)}
                  required
                />
              </div>

              <div className="material-row__action">
                <button className="button danger" type="button" onClick={() => onRemove(index)}>
                  Удалить
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}