import { UserPlus } from 'lucide-react';
import { Link } from 'react-router-dom';

// Jogador que entrou na mesa e ainda nao criou o personagem: em vez do erro da
// API, aponta para a Loja, onde fica o formulario do personagem.
export default function NoCharacterNotice() {
  return (
    <div className="surface-panel no-character">
      <p className="empty-state">Você ainda não tem personagem nesta mesa. Crie o seu para comprar e guardar itens.</p>
      <Link className="primary-action" to="/shop">
        <UserPlus size={17} />
        Criar personagem na Loja
      </Link>
    </div>
  );
}
