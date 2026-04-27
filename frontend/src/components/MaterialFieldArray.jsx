import { useEffect, useMemo, useRef, useState } from 'react';

const OBJECT_TITLES = {
  AURIKA: 'ЖК "Аурика"',
  AURUM: 'ЖК "Аурум"',
  MAXIMUS: 'ЖК "Максимус"',
  аурика: 'ЖК "Аурика"',
  аурум: 'ЖК "Аурум"',
  максимус: 'ЖК "Максимус"',
};

const MANUAL_OPTION_VALUE = '__manual__';
const MAX_VISIBLE_MATERIALS = 30;

const unitOptions = [
  { value: 'шт', label: 'шт' },
  { value: 'м', label: 'м' },
  { value: 'м2', label: 'м²' },
  { value: 'м3', label: 'м³' },
  { value: 'кг', label: 'кг' },
  { value: 'т', label: 'т' },
  { value: 'л', label: 'л' },
  { value: 'мешок', label: 'мешок' },
  { value: 'компл', label: 'компл' },
];

function normalizeSearch(value) {
  return String(value || '').trim().toLowerCase();
}

function MaterialSearchSelect({
  value,
  selectedMaterial,
  materialOptions,
  onChange,
  isLoading,
}) {
  const rootRef = useRef(null);
  const selectedName = selectedMaterial?.name || '';
  const [query, setQuery] = useState(selectedName);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // При ручном вводе не подставляем в поисковое поле текст «Ввести вручную».
    // Иначе фильтр начинает искать эту фразу и скрывает остальные материалы.
    if (value === MANUAL_OPTION_VALUE) {
      if (!isOpen && query) {
        setQuery('');
      }
      return;
    }

    if (selectedMaterial) {
      setQuery(selectedName);
      return;
    }

    // Во время поиска parent-компонент сбрасывает выбранный material_id.
    // Не стираем query в этот момент, иначе ввод пропадает после первой буквы.
    if (!isOpen) {
      setQuery('');
    }
  }, [selectedMaterial, selectedName, value, isOpen, query]);

  useEffect(() => {
    function handleDocumentMouseDown(event) {
      if (!rootRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleDocumentMouseDown);
    return () => document.removeEventListener('mousedown', handleDocumentMouseDown);
  }, []);

  const filteredOptions = useMemo(() => {
    const normalizedQuery = normalizeSearch(query);

    if (!normalizedQuery) {
      return materialOptions.slice(0, MAX_VISIBLE_MATERIALS);
    }

    return materialOptions
      .filter((option) => normalizeSearch(option.name).includes(normalizedQuery))
      .slice(0, MAX_VISIBLE_MATERIALS);
  }, [materialOptions, query]);

  function handleInputChange(event) {
    setQuery(event.target.value);
    setIsOpen(true);

    if (value) {
      onChange('');
    }
  }

  function handleSelect(optionId) {
    const option = materialOptions.find((item) => String(item.id) === String(optionId));
    if (option) {
      setQuery(option.name);
    }
    onChange(optionId);
    setIsOpen(false);
  }

  function handleManualSelect() {
    // Включаем ручной ввод, но оставляем список материалов доступным.
    setQuery('');
    onChange(MANUAL_OPTION_VALUE);
    setIsOpen(true);
  }

  function handleBlur() {
    window.setTimeout(() => {
      if (value === MANUAL_OPTION_VALUE) {
        setQuery('');
      } else if (!selectedMaterial) {
        setQuery('');
      } else {
        setQuery(selectedName);
      }
      setIsOpen(false);
    }, 120);
  }

  const dropdownVisible = isOpen && !isLoading;

  return (
    <div className="material-combobox" ref={rootRef}>
      <input
        type="text"
        value={query}
        onChange={handleInputChange}
        onFocus={() => setIsOpen(true)}
        onBlur={handleBlur}
        placeholder={
          isLoading
            ? 'Загрузка материалов...'
            : value === MANUAL_OPTION_VALUE
              ? 'Ручной ввод включён. Можно продолжить поиск материала'
              : 'Начните вводить название материала'
        }
        disabled={isLoading}
        autoComplete="off"
        required={!value}
      />

      {dropdownVisible ? (
        <div className="material-combobox__menu" role="listbox">
          <button
            className={`material-combobox__option material-combobox__option--manual${value === MANUAL_OPTION_VALUE ? ' is-selected' : ''}`}
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={handleManualSelect}
          >
            Ввести вручную
          </button>

          {filteredOptions.length ? (
            filteredOptions.map((option) => (
              <button
                className="material-combobox__option"
                type="button"
                key={option.id}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => handleSelect(option.id)}
              >
                <span>{option.name}</span>
                {option.unit ? <small>{option.unit}</small> : null}
              </button>
            ))
          ) : (
            <div className="material-combobox__empty">
              Ничего не найдено. Можно выбрать «Ввести вручную».
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

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
            {' '}Начните вводить название — список отфильтруется автоматически. Если нужного материала нет, выберите «Ввести вручную».
          </p>
        </div>

        <button className="button secondary" type="button" onClick={onAdd}>
          Добавить материал
        </button>
      </div>

      <div className="stack-list">
        {rows.map((row, index) => {
          const isManual = Boolean(row.is_manual);

          const selectedMaterial = materialOptions.find(
            (item) => String(item.id) === String(row.agreement_material_id)
          );

          const requestedQty = Number(row.quantity || 0);

          const availableQty = selectedMaterial
            ? Number(selectedMaterial.total_quantity || 0)
              - Number(selectedMaterial.reserved_quantity || 0)
              - Number(selectedMaterial.spent_quantity || 0)
            : 0;

          const willOverdraft = !isManual && selectedMaterial && requestedQty > availableQty;

          return (
            <div
              className="material-row"
              key={row.rowKey || row.id || `row-${index}`}
            >
              <div className="field field-wide">
                <label>Материал</label>

                <MaterialSearchSelect
                  value={isManual ? MANUAL_OPTION_VALUE : (row.agreement_material_id ?? '')}
                  selectedMaterial={selectedMaterial}
                  materialOptions={materialOptions}
                  isLoading={isLoading}
                  onChange={(nextValue) => onChange(index, 'material_selector', nextValue)}
                />

                {!isManual && selectedMaterial ? (
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

              {isManual ? (
                <>
                  <div className="field field-wide">
                    <label>Название материала</label>
                    <input
                      type="text"
                      value={row.manual_name || ''}
                      onChange={(event) => onChange(index, 'manual_name', event.target.value)}
                      placeholder="Введите название материала"
                      required
                      disabled={isLoading}
                    />
                  </div>

                  <div className="field">
                    <label>Ед. изм.</label>
                    <select
                      value={row.manual_unit || ''}
                      onChange={(event) => onChange(index, 'manual_unit', event.target.value)}
                      required
                      disabled={isLoading}
                    >
                      <option value="">Выберите ед. изм.</option>
                      {unitOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="field field-wide">
                    <label>Комментарий</label>
                    <input
                      type="text"
                      value={row.manual_comment || ''}
                      onChange={(event) => onChange(index, 'manual_comment', event.target.value)}
                      placeholder="При необходимости укажите комментарий"
                      disabled={isLoading}
                    />
                  </div>
                </>
              ) : null}

              <div className="field">
                <label>Количество</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={row.quantity}
                  onChange={(event) => onChange(index, 'quantity', event.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="material-row__action">
                <button
                  className="button danger"
                  type="button"
                  onClick={() => onRemove(index)}
                  disabled={isLoading}
                >
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
