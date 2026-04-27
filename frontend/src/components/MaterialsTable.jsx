import { formatDateTime, normalizeEnum } from '../utils/formatters';

export function MaterialsTable({ materials = [], highlightOverdraft = false }) {
  if (!materials.length) {
    return <div className="empty-box">Материалы не добавлены.</div>;
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Материал</th>
            <th>Количество</th>
            <th>Ед. изм.</th>
            <th>Добавлено</th>
            {highlightOverdraft ? <th>Статус</th> : null}
          </tr>
        </thead>

        <tbody>
          {materials.map((item, index) => {
            const isOverdraft = Boolean(item.overdraft ?? item.will_overdraft);
            const isManual = Boolean(item.is_manual);

            return (
              <tr
                key={item.id || `${item.agreement_material_id || 'manual'}-${index}`}
                className={highlightOverdraft && isOverdraft ? 'overdraft-row' : ''}
              >
                {/* ===== Материал + комментарий ===== */}
                <td>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>

                    {/* Название */}
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

                    {/* Комментарий */}
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

                {/* Количество */}
                <td>{item.quantity}</td>

                {/* Единица */}
                <td>{normalizeEnum(item.material_unit || item.unit)}</td>

                {/* Дата */}
                <td>{formatDateTime(item.created_at)}</td>

                {/* Перерасход */}
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