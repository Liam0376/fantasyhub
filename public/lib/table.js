// Fantasy Hub — sortable table component

export function renderTable(tbody, rows, columns, options = {}) {
  const { emptyText = 'No data', onClick } = options;

  if (!rows || rows.length === 0) {
    tbody.innerHTML = `<tr><td colspan="${columns.length}" style="text-align:center; color:var(--text-muted); padding:40px">${emptyText}</td></tr>`;
    return;
  }

  tbody.innerHTML = rows.map((row, i) => {
    const rank = row._rank || i + 1;
    const cells = columns.map(col => {
      let val = row[col.key];
      if (col.format) val = col.format(val, row);
      const cls = col.cls ? ` ${col.cls}` : '';
      return `<td class="${cls}">${val ?? ''}</td>`;
    }).join('');
    const dataId = row.player_id || '';
    return `<tr data-id="${dataId}">${cells}</tr>`;
  }).join('');

  if (onClick) {
    tbody.querySelectorAll('tr').forEach(tr => {
      tr.style.cursor = 'pointer';
      tr.addEventListener('click', () => onClick(tr.dataset.id));
    });
  }
}

export function sortTable(data, sortKey, sortDir) {
  return [...data].sort((a, b) => {
    let av = a[sortKey], bv = b[sortKey];
    if (typeof av === 'number' && typeof bv === 'number') {
      return sortDir === 'asc' ? av - bv : bv - av;
    }
    av = String(av || '').toLowerCase();
    bv = String(bv || '').toLowerCase();
    if (av < bv) return sortDir === 'asc' ? -1 : 1;
    if (av > bv) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });
}
