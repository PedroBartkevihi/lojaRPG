export default function HistoryPagination({ page, label }) {
  return (
    <div className="history-pagination">
      {page.error && <p className="form-error" role="alert">{page.error}</p>}
      {page.nextCursor && (
        <button className="secondary-action" disabled={page.loading} onClick={page.loadMore} aria-label={`Mostrar mais: ${label}`}>
          {page.loading ? 'Carregando...' : 'Mostrar mais'}
        </button>
      )}
      {(page.expanded || page.error) && (
        <button className="secondary-action" disabled={page.loading} onClick={page.refresh} aria-label={`Ver registros recentes: ${label}`}>
          Ver registros recentes
        </button>
      )}
    </div>
  );
}
