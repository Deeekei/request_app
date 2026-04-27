import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { requestApi } from '../api/requestApi';
import { Alert } from '../components/Alert';
import { MaterialFieldArray } from '../components/MaterialFieldArray';
import { PageHeader } from '../components/PageHeader';
import { useAuth } from '../context/AuthContext';

const objectOptions = [
  { value: 'ЖК "Аурика"', label: 'ЖК "Аурика"' },
  { value: 'ЖК "Аурум"', label: 'ЖК "Аурум"' },
  { value: 'ЖК "Максимус"', label: 'ЖК "Максимус"' },
];


function generateRowKey() {
  return globalThis.crypto?.randomUUID?.() ?? `row_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function createEmptyRow() {
  return {
    id: null,
    agreement_material_id: '',
    is_manual: false,
    manual_name: '',
    manual_unit: '',
    manual_comment: '',
    quantity: '1',
    rowKey: generateRowKey(),
  };
}

function normalizeDateForInput(value) {
  if (!value) return '';
  if (typeof value === 'string') return value.slice(0, 10);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

function mapMaterialToFormRow(item) {
  return {
    rowKey: item.id ? `saved_${item.id}` : generateRowKey(),
    id: item.id ?? null,
    agreement_material_id: item.is_manual ? '' : (item.agreement_material_id ?? ''),
    is_manual: Boolean(item.is_manual),
    manual_name: item.is_manual ? (item.material_name || '') : '',
    manual_unit: item.is_manual ? (item.material_unit || item.unit || '') : '',
    manual_comment: item.is_manual ? (item.manual_comment || '') : '',
    quantity: item.quantity != null ? String(item.quantity) : '1',
  };
}

function buildMaterialPayload(item) {
  const quantity = Number(item.quantity);

  if (!quantity || quantity <= 0) {
    return null;
  }

  if (item.is_manual) {
    if (!item.manual_name?.trim() || !item.manual_unit) {
      return null;
    }

    return {
      is_manual: true,
      agreement_material_id: null,
      manual_name: item.manual_name.trim(),
      manual_unit: item.manual_unit,
      manual_comment: item.manual_comment?.trim() || null,
      quantity,
    };
  }

  if (!item.agreement_material_id) {
    return null;
  }

  return {
    is_manual: false,
    agreement_material_id: Number(item.agreement_material_id),
    quantity,
  };
}

export function RequestFormPage({ mode }) {
  const { token } = useAuth();
  const { requestId } = useParams();
  const navigate = useNavigate();

  const [materialOptions, setMaterialOptions] = useState([]);
  const [materialsLoading, setMaterialsLoading] = useState(false);

  const [form, setForm] = useState({
    title: '',
    description: '',
    agreement: '',
    section: '',
    delivery_date: '',
    object: 'ЖК "Аурика"',
    request_materials: [createEmptyRow()],
  });

  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(mode === 'edit');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (mode !== 'edit' || !requestId) return;

    let cancelled = false;
    setIsLoading(true);

    requestApi.getById(token, requestId)
      .then((data) => {
        if (cancelled) return;

        setForm({
          title: data.title || '',
          description: data.description || '',
          agreement: data.agreement || '',
          section: data.section || '',
          delivery_date: normalizeDateForInput(data.delivery_date),
          object: typeof data.object === 'string' ? data.object : data.object?.value,
          request_materials: (data.materials || []).length
            ? data.materials.map(mapMaterialToFormRow)
            : [createEmptyRow()],
        });
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [mode, requestId, token]);

  useEffect(() => {
    if (!form.object) {
      setMaterialOptions([]);
      return;
    }

    let cancelled = false;
    setMaterialsLoading(true);

    requestApi.getMaterialsByObject(token, form.object)
      .then((data) => {
        if (cancelled) return;
        setMaterialOptions(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setMaterialOptions([]);
      })
      .finally(() => {
        if (!cancelled) setMaterialsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token, form.object]);

  function updateMaterial(index, field, value) {
    setForm((prev) => ({
      ...prev,
      request_materials: prev.request_materials.map((row, rowIndex) => {
        if (rowIndex !== index) return row;

        if (field === 'material_selector') {
          if (value === '__manual__') {
            return {
              ...row,
              is_manual: true,
              agreement_material_id: '',
            };
          }

          return {
            ...row,
            is_manual: false,
            agreement_material_id: value,
            manual_name: '',
            manual_unit: '',
            manual_comment: '',
          };
        }

        return {
          ...row,
          [field]: value,
        };
      }),
    }));
  }

  function addMaterial() {
    setForm((prev) => ({
      ...prev,
      request_materials: [...prev.request_materials, createEmptyRow()],
    }));
  }

  function removeMaterial(index) {
    setForm((prev) => ({
      ...prev,
      request_materials:
        prev.request_materials.length > 1
          ? prev.request_materials.filter((_, rowIndex) => rowIndex !== index)
          : [createEmptyRow()],
    }));
  }

  function handleObjectChange(event) {
    const nextObject = event.target.value;

    setForm((prev) => ({
      ...prev,
      object: nextObject,
      request_materials: prev.request_materials.map((row) => (
        row.is_manual
          ? row
          : {
              ...row,
              agreement_material_id: '',
            }
      )),
    }));
  }

  function validateForm() {
    if (!form.title.trim()) return 'Укажите название заявки';
    if (!form.agreement.trim()) return 'Укажите шифр проекта';
    if (!form.section.trim()) return 'Укажите секцию';
    if (!form.delivery_date) return 'Укажите дату доставки';

    if (!form.request_materials.length) {
      return 'Добавьте хотя бы один материал';
    }

    for (const item of form.request_materials) {
      if (!item.quantity || Number(item.quantity) <= 0) {
        return 'Укажите корректное количество для каждого материала';
      }

      if (item.is_manual) {
        if (!item.manual_name?.trim()) {
          return 'Для ручного материала укажите название';
        }
        if (!item.manual_unit) {
          return 'Для ручного материала укажите единицу измерения';
        }
      } else if (!item.agreement_material_id) {
        return 'Выберите материал из договора или переключитесь на ручной ввод';
      }
    }

    return '';
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSaving(true);

    const payload = {
      title: form.title.trim(),
      description: form.description?.trim() || '',
      agreement: form.agreement.trim(),
      section: form.section.trim(),
      delivery_date: form.delivery_date,
      object: form.object,
      request_materials: form.request_materials
        .map(buildMaterialPayload)
        .filter(Boolean),
    };

    try {
      const saved = mode === 'edit'
        ? await requestApi.update(token, requestId, payload)
        : await requestApi.create(token, payload);

      navigate(`/requests/${saved.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="page-section">
      <PageHeader
        title={mode === 'edit' ? 'Редактирование заявки' : 'Создание заявки'}
        subtitle="Форма для работы с черновиком заявки."
        actions={<Link className="button ghost" to="/requests">К списку</Link>}
      />

      {error ? <Alert type="error">{error}</Alert> : null}
      {isLoading ? <div className="empty-box">Загрузка формы...</div> : null}

      {!isLoading ? (
        <form className="form-shell" onSubmit={handleSubmit}>
          <div className="details-card">
            <div className="form-grid two-columns">
              <div className="field">
                <label>Наименование заявки</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  minLength={3}
                  required
                />
              </div>

              <div className="field">
                <label>Шифр проекта</label>
                <input
                  value={form.agreement}
                  onChange={(e) => setForm((p) => ({ ...p, agreement: e.target.value }))}
                  minLength={3}
                  required
                />
              </div>

              <div className="field">
                <label>Секция</label>
                <input
                  value={form.section}
                  onChange={(e) => setForm((p) => ({ ...p, section: e.target.value }))}
                  required
                />
              </div>

              <div className="field">
                <label>Дата доставки</label>
                <input
                  type="date"
                  value={form.delivery_date}
                  onChange={(e) => setForm((p) => ({ ...p, delivery_date: e.target.value }))}
                  required
                />
              </div>

              <div className="field field-wide">
                <label>Примечание</label>
                <textarea
                  value={form.description || ''}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  rows={5}
                />
              </div>

              <div className="field">
                <label>Объект</label>
                <select value={form.object} onChange={handleObjectChange}>
                  {objectOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <MaterialFieldArray
            rows={form.request_materials}
            onChange={updateMaterial}
            onAdd={addMaterial}
            onRemove={removeMaterial}
            materialOptions={materialOptions}
            currentObject={form.object}
            isLoading={materialsLoading || isSaving}
          />

          <div className="actions-row">
            <button className="button primary" type="submit" disabled={isSaving}>
              {isSaving ? 'Сохранение...' : mode === 'edit' ? 'Сохранить изменения' : 'Создать заявку'}
            </button>
          </div>
        </form>
      ) : null}
    </section>
  );
}
