import { useEffect, useMemo, useState } from 'react';
import { Download, FileUp, Library } from 'lucide-react';
import { CSV_TEMPLATE, csvToItems, decodeCsv } from '../../js/csv.js';
import { formatMoney } from '../../js/money.js';
import { formatWeight } from '../../js/weight.js';

const PREVIEW_ROWS = 15;

// Importa varios itens de uma vez: um pacote pronto do SRD 5.1 ou uma planilha
// CSV do Mestre. A planilha e lida no navegador, com previa e os erros de cada
// linha antes do envio; a API cria tudo numa transacao.
export default function ImportPanel({ api, shops = [], reload, showNotice }) {
  const [source, setSource] = useState('srd');
  const [packs, setPacks] = useState([]);
  const [attribution, setAttribution] = useState('');
  const [packId, setPackId] = useState('');
  const [csv, setCsv] = useState({ fileName: '', items: [], errors: [], ignored: [] });
  const [shopId, setShopId] = useState('');
  const [serverErrors, setServerErrors] = useState([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let current = true;
    api.listCatalogPacks?.()
      .then((data) => {
        if (!current) return;
        setPacks(data.packs);
        setAttribution(data.attribution);
        setPackId((value) => value || data.packs[0]?.id || '');
      })
      .catch(() => {});
    return () => { current = false; };
  }, [api]);

  const pack = packs.find((entry) => entry.id === packId);
  const items = useMemo(() => (source === 'srd' ? pack?.items || [] : csv.items), [source, pack, csv.items]);
  const blocked = source === 'csv' && csv.errors.length > 0;

  async function readFile(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    setServerErrors([]);

    if (!file) return;

    const { items: parsed, errors, ignored } = csvToItems(decodeCsv(await file.arrayBuffer()));
    setCsv({ fileName: file.name, items: parsed, errors, ignored });
  }

  function downloadTemplate() {
    // BOM para o Excel abrir os acentos certos.
    const url = URL.createObjectURL(new Blob([String.fromCharCode(0xfeff), CSV_TEMPLATE], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'modelo-itens-lojarpg.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  async function submit() {
    setBusy(true);
    setServerErrors([]);

    try {
      const body = { items: items.map(({ line: _line, ...item }) => item), ...(shopId ? { shopId: Number(shopId) } : {}) };
      const data = await api.importItems(body);
      await reload();
      showNotice(data.message);
      if (source === 'csv') setCsv({ fileName: '', items: [], errors: [], ignored: [] });
    } catch (error) {
      // A API aponta a posicao na lista; na planilha vale a linha.
      setServerErrors((error.details || []).map((entry) => ({ line: items[entry.row - 1]?.line ?? entry.row, message: entry.message })));
      showNotice(error.message);
    } finally {
      setBusy(false);
    }
  }

  const errors = source === 'csv' ? [...csv.errors, ...serverErrors] : serverErrors;

  return (
    <details className="surface-panel import-panel">
      <summary>
        <Library size={18} />
        Importar vários itens
      </summary>
      <div className="stack-form compact-form">
        <div className="segmented" role="radiogroup" aria-label="Origem dos itens">
          <label className="checkbox-field">
            <input type="radio" name="import-source" checked={source === 'srd'} onChange={() => { setSource('srd'); setServerErrors([]); }} />
            Pacote do SRD 5.1
          </label>
          <label className="checkbox-field">
            <input type="radio" name="import-source" checked={source === 'csv'} onChange={() => { setSource('csv'); setServerErrors([]); }} />
            Planilha CSV
          </label>
        </div>

        {source === 'srd' ? (
          <>
            <label>
              Pacote
              <select value={packId} onChange={(event) => setPackId(event.target.value)}>
                {packs.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.name} ({entry.items.length} itens)
                  </option>
                ))}
              </select>
            </label>
            {pack && <p className="form-hint">{pack.description} Preços, peso, dano e CA do livro; o estoque inicial pode ser ajustado depois.</p>}
            {attribution && <p className="form-hint attribution">{attribution}</p>}
          </>
        ) : (
          <>
            <p className="form-hint">
              Colunas: nome, categoria e preço (em PO, como 15 ou 2,5) são obrigatórias; raridade, estoque, descrição,
              preço de venda, peso (lb), dano, CA, sintonização (sim/não) e imagem são opcionais. Separador ; ou ,.
            </p>
            <div className="form-actions">
              <label className="secondary-action file-action">
                <FileUp size={17} />
                {csv.fileName ? `Trocar planilha (${csv.fileName})` : 'Escolher planilha'}
                <input type="file" accept=".csv,text/csv" onChange={readFile} className="visually-hidden" />
              </label>
              <button type="button" className="text-action" onClick={downloadTemplate}>
                <Download size={17} />
                Baixar modelo
              </button>
            </div>
          </>
        )}

        {shops.length > 1 && (
          <label>
            Vendedor que recebe os itens
            <select value={shopId} onChange={(event) => setShopId(event.target.value)}>
              <option value="">{shops.find((shop) => shop.isDefault)?.name || 'Vendedor padrão'}</option>
              {shops.filter((shop) => !shop.isDefault).map((shop) => (
                <option key={shop.id} value={shop.id}>
                  {shop.name}
                </option>
              ))}
            </select>
          </label>
        )}

        {source === 'csv' && csv.ignored.length > 0 && (
          <p className="form-hint">
            Colunas ignoradas (nenhum campo com esse nome): {csv.ignored.join(', ')}.
          </p>
        )}

        {errors.length > 0 && (
          <div className="form-error" role="alert">
            <p>Corrija a planilha e escolha de novo:</p>
            <ul>
              {errors.map((error) => (
                <li key={`${error.line}-${error.message}`}>
                  Linha {error.line}: {error.message}
                </li>
              ))}
            </ul>
          </div>
        )}

        {items.length > 0 && (
          <div className="import-preview">
            <table>
              <caption>
                Prévia: {items.length} {items.length === 1 ? 'item' : 'itens'}
                {items.length > PREVIEW_ROWS ? ` (mostrando ${PREVIEW_ROWS})` : ''}
              </caption>
              <thead>
                <tr>
                  <th scope="col">Nome</th>
                  <th scope="col">Categoria</th>
                  <th scope="col">Preço</th>
                  <th scope="col">Estoque</th>
                  <th scope="col">Atributos</th>
                </tr>
              </thead>
              <tbody>
                {items.slice(0, PREVIEW_ROWS).map((item, index) => (
                  <tr key={`${item.name}-${index}`}>
                    <td>{item.name}</td>
                    <td>{item.category}</td>
                    <td>{formatMoney(item.price)}</td>
                    <td>{item.stock}</td>
                    <td>{[item.weight !== null && item.weight !== undefined ? formatWeight(item.weight) : '', item.damage, item.armorClass && `CA ${item.armorClass}`].filter(Boolean).join(' · ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="form-hint">Itens com o nome de um que o vendedor já tem ficam de fora, para não duplicar.</p>
        <button type="button" className="primary-action" disabled={busy || items.length === 0 || blocked} onClick={submit}>
          {busy ? 'Importando...' : `Importar ${items.length} ${items.length === 1 ? 'item' : 'itens'}`}
        </button>
      </div>
    </details>
  );
}
