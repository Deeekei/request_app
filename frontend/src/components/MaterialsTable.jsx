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
          {materials.map((item) => {
            const isOverdraft = Boolean(item.overdraft ?? item.will_overdraft);
            return (
              <tr key={item.id || item.agreement_material_id} className={highlightOverdraft && isOverdraft ? 'overdraft-row' : ''}>
                <td>{item.material_name || `Материал ${item.agreement_material_id}`}</td>
                <td>{item.quantity}</td>
                <td>{normalizeEnum(item.material_unit || item.unit)}</td>
                <td>{formatDateTime(item.created_at)}</td>
                {highlightOverdraft ? (
                  <td>
                    {isOverdraft ? <span className="pill rejected">Перерасход</span> : <span className="muted-pill">Норма</span>}
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
