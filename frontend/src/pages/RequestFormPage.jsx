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

const emptyRow = { agreement_material_id: '', quantity: '1' };

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
    object: 'ЖК \"Аурика\"',
    request_materials: [{ ...emptyRow }],
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
          title: data.title,
          description: data.description,
          agreement: data.agreement,
          object: typeof data.object === 'string' ? data.object : data.object?.value,
          request_materials: (data.materials || []).length
            ? (data.materials || []).map((item) => ({
                agreement_material_id: item.agreement_material_id,
                quantity: String(item.quantity),
              }))
            : [{ ...emptyRow }],
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
      request_materials: prev.request_materials.map((row, rowIndex) =>
        rowIndex === index ? { ...row, [field]: value } : row
      ),
    }));
  }

  function addMaterial() {
    setForm((prev) => ({
      ...prev,
      request_materials: [...prev.request_materials, { ...emptyRow }],
    }));
  }

  function removeMaterial(index) {
    setForm((prev) => ({
      ...prev,
      request_materials:
        prev.request_materials.length > 1
          ? prev.request_materials.filter((_, rowIndex) => rowIndex !== index)
          : [{ ...emptyRow }],
    }));
  }

  function handleObjectChange(event) {
    const nextObject = event.target.value;

    setForm((prev) => ({
      ...prev,
      object: nextObject,
      request_materials: prev.request_materials.map((row) => ({
        ...row,
        agreement_material_id: '',
      })),
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setIsSaving(true);

    const payload = {
      title: form.title,
      description: form.description,
      agreement: form.agreement,
      object: form.object,
      request_materials: form.request_materials
        .filter((item) => item.agreement_material_id && item.quantity)
        .map((item) => ({
          agreement_material_id: Number(item.agreement_material_id),
          quantity: Number(item.quantity),
        })),
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
                <label>Название</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  minLength={3}
                  required
                />
              </div>

              <div className="field">
                <label>Договор</label>
                <input
                  value={form.agreement}
                  onChange={(e) => setForm((p) => ({ ...p, agreement: e.target.value }))}
                  minLength={3}
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
            isLoading={materialsLoading}
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