import { Component } from 'react';
import { reportClientError } from '../js/errorReporting.js';

// Uma tela que quebra ao desenhar mostra um aviso, em vez de deixar a pagina
// em branco, e o erro vai para o log da API.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error, info) {
    reportClientError({ message: error?.message || String(error), stack: `${error?.stack || ''}\n${info?.componentStack || ''}`, kind: 'render' });
  }

  render() {
    if (!this.state.failed) {
      return this.props.children;
    }

    return (
      <main className="auth-screen">
        <section className="surface-panel crash-panel" role="alert">
          <h1>Algo deu errado nesta tela</h1>
          <p>O erro foi registrado. Recarregue a página para continuar; suas compras e o ouro estão salvos.</p>
          <button type="button" className="primary-action" onClick={() => window.location.reload()}>
            Recarregar
          </button>
        </section>
      </main>
    );
  }
}
