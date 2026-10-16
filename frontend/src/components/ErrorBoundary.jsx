import { Component } from 'react';
import { reportClientError } from '../js/errorReporting.js';

// Uma tela que quebra ao desenhar mostra um aviso, em vez de deixar a pagina
// em branco, e o erro vai para o log da API. Como o aviso fica no lugar do
// app inteiro (rotas incluidas), voltar no navegador tenta de novo no outro
// endereco, e ha um botao para as mesas caso a mesma tela quebre sempre.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
    this.retry = this.retry.bind(this);
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidMount() {
    window.addEventListener('popstate', this.retry);
  }

  componentWillUnmount() {
    window.removeEventListener('popstate', this.retry);
  }

  retry() {
    if (this.state.failed) {
      this.setState({ failed: false });
    }
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
          <p>O erro foi registrado. Recarregue a página ou vá para as suas mesas; suas compras e o ouro estão salvos.</p>
          <div className="row-actions">
            <button type="button" className="primary-action" onClick={() => window.location.reload()}>
              Recarregar
            </button>
            <button type="button" className="secondary-action" onClick={() => window.location.assign('/mesas')}>
              Ir para as mesas
            </button>
          </div>
        </section>
      </main>
    );
  }
}
