import { SLOW_API_MESSAGE, useSlowHint } from '../js/useSlowHint.js';

// Blocos no formato do conteudo enquanto a API responde. Se a espera passar de
// alguns segundos, explica a demora: no plano gratuito a API dorme.
function Loading({ children }) {
  const slow = useSlowHint(true);

  return (
    <div className="skeleton-wrap" role="status">
      <span className="visually-hidden">Carregando...</span>
      {children}
      {slow && <p className="form-hint slow-hint">{SLOW_API_MESSAGE}</p>}
    </div>
  );
}

export function SkeletonCards({ count = 6, variant = 'item' }) {
  return (
    <Loading>
      <div className={variant === 'item' ? 'items-grid' : 'inventory-grid'} aria-hidden="true">
        {Array.from({ length: count }, (_, index) => (
          <div key={index} className={`skeleton-card ${variant}`}>
            <span className="skeleton circle" />
            <span className="skeleton line wide" />
            <span className="skeleton line" />
            <span className="skeleton line short" />
          </div>
        ))}
      </div>
    </Loading>
  );
}

export function SkeletonRows({ count = 3 }) {
  return (
    <Loading>
      <div aria-hidden="true">
        {Array.from({ length: count }, (_, index) => (
          <div key={index} className="skeleton-row">
            <span className="skeleton line wide" />
            <span className="skeleton line short" />
          </div>
        ))}
      </div>
    </Loading>
  );
}
