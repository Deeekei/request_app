import { useEffect, useState } from 'react';
import { formatDateTime, normalizeEnum } from '../utils/formatters';
import { requestApi } from '../api/requestApi';
import { useAuth } from '../context/AuthContext';

const RESPONSIBLES = [
  { value: '', label: 'Не назначен' },
  { value: 'Шубин', label: 'Шубин' },
  { value: 'Магадеева', label: 'Магадеева' },
  { value: 'Хабибуллин', label: 'Хабибуллин' },
];

export function MaterialsTable({
  materials = [],
  highlightOverdraft = false,
  showResponsible = false,
  requestId = null,
  canEditResponsible = false
}) {
  const { token } = useAuth();
  const [localMaterials, setLocalMaterials] = useState(materials);

  useEffect(() => {
    setLocalMaterials(materials);
  }, [materials]);

  if (!localMaterials.length) {
    return <div className="empty-box">Материалы не добавлены.</div>;
  }

  async function handleResponsibleChange(materialId, newResponsible) {
    setLocalMaterials((prev) =>
      prev.map((m) => m.id === materialId ? { ...m, responsible: newResponsible } : m)
    );

    if (requestId && token) {
      try {
        await requestApi.updateMaterialResponsible(token, requestId, materialId, newResponsible || null);
      } catch (err) {
        alert('Не удалось сохранить ответственного. Пожалуйста, обновите страницу.');
      }
    }
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Материал</th>
            <th>Количество</th>
            <th>Ед. изм.</th>
            {showResponsible ? <th>Ответственный (Снабжение)</th> : null}
            <th>Добавлено</th>
            {highlightOverdraft ? <th>Статус</th> : null}
          </tr>
        </thead>

        <tbody>
          {localMaterials.map((item, index) => {
            const isOverdraft = Boolean(item.overdraft ?? item.will_overdraft);
            const isManual = Boolean(item.is_manual);

            return (
              <tr
                key={item.id || `${item.agreement_material_id || 'manual'}-${index}`}
                className={highlightOverdraft && isOverdraft ? 'overdraft-row' : ''}
              >
                <td>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div>
                      {item.material_name || `Материал ${item.agreement_material_id || ''}`}

                      {isManual ? (
                        <span
                          className="muted-pill"
                          style={{ marginLeft: 8 }}
                        >
                          вручную
                        </span>
                      ) : null}
                    </div>

                    {item.manual_comment ? (
                      <div
                        style={{
                          marginTop: 6,
                          color: '#6b7280',
                          fontSize: '13px',
                          lineHeight: '1.3',
                        }}
                      >
                        {item.manual_comment}
                      </div>
                    ) : null}
                  </div>
                </td>
                <td>{item.quantity}</td>
                <td>{normalizeEnum(item.material_unit || item.unit)}</td>

                {showResponsible ? (
                  <td>
                    {canEditResponsible ? (
                      <select
                        value={item.responsible || ''}
                        onChange={(e) => handleResponsibleChange(item.id, e.target.value)}
                        style={{ padding: '2px 4px', fontSize: '13px', border: '1px solid #ccc', borderRadius: '4px' }}
                      >
                        {RESPONSIBLES.map(r => (
                          <option key={r.value} value={r.value}>{r.label}</option>
                        ))}
                      </select>
                    ) : (
                      <span style={{ fontSize: '13px', color: item.responsible ? '#333' : '#999' }}>
                        {item.responsible || 'Не назначен'}
                      </span>
                    )}
                  </td>
                ) : null}

                <td>{formatDateTime(item.created_at)}</td>
                {highlightOverdraft ? (
                  <td>
                    {isOverdraft ? (
                      <span className="pill rejected">Перерасход</span>
                    ) : (
                      <span className="muted-pill">Норма</span>
                    )}
                  </td>
                ) : null}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}