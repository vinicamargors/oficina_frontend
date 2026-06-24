export interface PrintReceiptItem {
  descricao: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
  tipo?: string;
}

export interface PrintReceiptData {
  id: string;
  data_abertura?: string;
  status?: string;
  descricao?: string;
  forma_pagamento?: string;
  mecanico_nome?: string;
  desconto?: number;
  total_geral?: number;
  clientes?: { nome?: string; telefone?: string; cpf_cnpj?: string; endereco?: string } | null;
  veiculos?: { placa?: string; modelo?: string; marca?: string; cor?: string; km_atual?: number; ano?: number } | null;
  itens: PrintReceiptItem[];
  empresa?: { nome_fantasia?: string; razao_social?: string; cnpj?: string; endereco?: string; telefone?: string; email?: string; logo_b64?: string } | null;
}

const formatCurrency = (value?: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
};

const formatDate = (dateStr?: string) => {
  if (!dateStr) return 'Não informada';
  try {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date);
  } catch {
    return dateStr;
  }
};

export const openPrintWindow = (data: PrintReceiptData) => {
  try {
    const safeId = data.id ? String(data.id).substring(0, 8).toUpperCase() : 'NOVO';
    const itens = data.itens || [];

    // Separa os itens por categoria
    const pecas = itens.filter((i) => i.tipo === 'PECA');
    const maoObra = itens.filter((i) => i.tipo === 'MAO_DE_OBRA' || i.tipo === 'MAO_OBRA' || i.tipo === 'SERVICO');
    const terceirizados = itens.filter((i) => i.tipo === 'TERCEIRIZADO');

    // Função para gerar linhas de tabela blindada
    const renderTableRows = (itemsList: PrintReceiptItem[]) => {
      if (itemsList.length === 0) return `<tr><td colspan="4" style="text-align: center; color: #666; padding: 10px;">Nenhum item</td></tr>`;
      return itemsList.map(item => `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.descricao || '-'}</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantidade || 0}</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${formatCurrency(item.valor_unitario)}</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right; font-weight: bold;">${formatCurrency(item.valor_total)}</td>
        </tr>
      `).join('');
    };

    const html = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>Ordem de Serviço #${safeId}</title>
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; line-height: 1.4; margin: 0; padding: 20px; font-size: 13px; }
          .header { display: flex; justify-content: space-between; border-bottom: 2px solid #222; padding-bottom: 20px; margin-bottom: 20px; }
          .empresa-info { max-width: 60%; }
          .empresa-nome { font-size: 20px; font-weight: bold; margin: 0 0 5px 0; color: #111; text-transform: uppercase; }
          .empresa-detalhes { font-size: 12px; color: #555; }
          .os-info { text-align: right; }
          .os-title { font-size: 24px; font-weight: bold; color: #222; margin: 0 0 5px 0; letter-spacing: 1px; }
          .os-badge { display: inline-block; padding: 4px 8px; background: #eee; border-radius: 4px; font-weight: bold; font-size: 12px; margin-bottom: 5px;}
          .grid-info { display: flex; gap: 20px; margin-bottom: 25px; }
          .box { border: 1px solid #ddd; border-radius: 6px; padding: 15px; flex: 1; background: #fdfdfd; }
          .box-title { font-size: 12px; font-weight: bold; color: #888; text-transform: uppercase; margin: 0 0 10px 0; border-bottom: 1px solid #eee; padding-bottom: 5px; }
          .info-line { margin: 4px 0; }
          .info-line strong { color: #222; }
          .section-title { font-size: 14px; font-weight: bold; margin: 20px 0 10px 0; color: #111; text-transform: uppercase; background: #f0f0f0; padding: 6px 10px; border-left: 4px solid #222;}
          table { border-collapse: collapse; margin-bottom: 15px; width: 100%; }
          th { background: #fafafa; padding: 8px; text-align: left; font-size: 11px; color: #666; text-transform: uppercase; border-bottom: 2px solid #ddd; }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .totals-box { margin-top: 20px; border: 1px solid #ddd; padding: 15px; border-radius: 6px; background: #f9f9f9; width: 300px; float: right; }
          .total-line { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px; }
          .total-line.grand-total { border-top: 2px solid #ddd; padding-top: 8px; margin-top: 8px; font-size: 18px; font-weight: bold; color: #111; }
          .clearfix::after { content: ""; clear: both; display: table; }
          .footer { margin-top: 60px; text-align: center; font-size: 11px; color: #666; }
          .signature-area { display: flex; justify-content: space-around; margin-top: 80px; }
          .signature-line { width: 40%; border-top: 1px solid #333; padding-top: 5px; text-align: center; font-weight: bold; color: #333; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="empresa-info">
            ${data.empresa?.logo_b64 ? `<img src="${data.empresa.logo_b64}" alt="Logo" style="max-height: 60px; margin-bottom: 10px;">` : ''}
            <h1 class="empresa-nome">${data.empresa?.nome_fantasia || 'NOME DA OFICINA'}</h1>
            <div class="empresa-detalhes">
              ${data.empresa?.razao_social ? `Razão Social: ${data.empresa.razao_social}<br>` : ''}
              ${data.empresa?.cnpj ? `CNPJ: ${data.empresa.cnpj}<br>` : ''}
              ${data.empresa?.telefone ? `Telefone: ${data.empresa.telefone}<br>` : ''}
              ${data.empresa?.email ? `E-mail: ${data.empresa.email}<br>` : ''}
              ${data.empresa?.endereco ? `${data.empresa.endereco}` : ''}
            </div>
          </div>
          <div class="os-info">
            <h2 class="os-title">ORDEM DE SERVIÇO</h2>
            <div class="os-badge">Nº ${safeId}</div><br>
            <div class="empresa-detalhes">
              <strong>Abertura:</strong> ${formatDate(data.data_abertura)}<br>
              <strong>Status:</strong> ${data.status || 'Não informado'}<br>
              ${data.mecanico_nome ? `<strong>Responsável:</strong> ${data.mecanico_nome}` : ''}
            </div>
          </div>
        </div>

        <div class="grid-info">
          <div class="box">
            <h3 class="box-title">Dados do Cliente</h3>
            ${data.clientes ? `
              <p class="info-line"><strong>Nome:</strong> ${data.clientes.nome || 'Não informado'}</p>
              <p class="info-line"><strong>Telefone:</strong> ${data.clientes.telefone || 'Não informado'}</p>
              ${data.clientes.cpf_cnpj ? `<p class="info-line"><strong>CPF/CNPJ:</strong> ${data.clientes.cpf_cnpj}</p>` : ''}
              ${data.clientes.endereco ? `<p class="info-line"><strong>Endereço:</strong> ${data.clientes.endereco}</p>` : ''}
            ` : '<p class="info-line">Cliente não informado</p>'}
          </div>
          <div class="box">
            <h3 class="box-title">Dados do Veículo</h3>
            ${data.veiculos ? `
              <p class="info-line"><strong>Veículo:</strong> ${data.veiculos.marca || ''} ${data.veiculos.modelo || 'Não informado'} ${data.veiculos.ano ? `(${data.veiculos.ano})` : ''}</p>
              <p class="info-line"><strong>Placa:</strong> ${data.veiculos.placa ? data.veiculos.placa.toUpperCase() : 'Não informada'}</p>
              ${data.veiculos.cor ? `<p class="info-line"><strong>Cor:</strong> ${data.veiculos.cor}</p>` : ''}
              ${data.veiculos.km_atual ? `<p class="info-line"><strong>KM Atual:</strong> ${Number(data.veiculos.km_atual).toLocaleString('pt-BR')} km</p>` : ''}
            ` : '<p class="info-line">Veículo não informado</p>'}
          </div>
        </div>

        ${data.descricao ? `
          <div style="margin-bottom: 25px;">
            <strong>Descrição do Problema / Relato do Cliente:</strong><br>
            <div style="padding: 10px; border-left: 3px solid #ccc; background: #fdfdfd; margin-top: 5px; color: #444;">
              ${data.descricao.replace(/\n/g, '<br>')}
            </div>
          </div>
        ` : ''}

        <!-- PEÇAS -->
        <h3 class="section-title">Peças Utilizadas</h3>
        <table>
          <thead>
            <tr>
              <th>Descrição</th>
              <th class="text-center" style="width: 80px;">Qtd</th>
              <th class="text-right" style="width: 120px;">V. Unitário</th>
              <th class="text-right" style="width: 120px;">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${renderTableRows(pecas)}
          </tbody>
        </table>

        <!-- MÃO DE OBRA -->
        <h3 class="section-title">Mão de Obra e Serviços</h3>
        <table>
          <thead>
            <tr>
              <th>Descrição</th>
              <th class="text-center" style="width: 80px;">Qtd</th>
              <th class="text-right" style="width: 120px;">V. Unitário</th>
              <th class="text-right" style="width: 120px;">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${renderTableRows(maoObra)}
          </tbody>
        </table>

        <!-- TERCEIRIZADOS -->
        ${terceirizados.length > 0 ? `
          <h3 class="section-title">Serviços Terceirizados</h3>
          <table>
            <thead>
              <tr>
                <th>Descrição</th>
                <th class="text-center" style="width: 80px;">Qtd</th>
                <th class="text-right" style="width: 120px;">V. Unitário</th>
                <th class="text-right" style="width: 120px;">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${renderTableRows(terceirizados)}
            </tbody>
          </table>
        ` : ''}

        <div class="clearfix">
          <div class="totals-box">
            <div class="total-line">
              <span>Total Peças:</span>
              <span>${formatCurrency(pecas.reduce((acc, i) => acc + (i.valor_total || 0), 0))}</span>
            </div>
            <div class="total-line">
              <span>Total Mão de Obra/Serviços:</span>
              <span>${formatCurrency([...maoObra, ...terceirizados].reduce((acc, i) => acc + (i.valor_total || 0), 0))}</span>
            </div>
            ${data.desconto && data.desconto > 0 ? `
              <div class="total-line" style="color: #d32f2f;">
                <span>Desconto:</span>
                <span>- ${formatCurrency(data.desconto)}</span>
              </div>
            ` : ''}
            <div class="total-line grand-total">
              <span>TOTAL GERAL:</span>
              <span>${formatCurrency(data.total_geral)}</span>
            </div>
            ${data.forma_pagamento ? `
              <div class="total-line" style="margin-top: 15px; font-size: 11px; color: #666;">
                <span>Forma de Pagto:</span>
                <span><strong>${data.forma_pagamento}</strong></span>
              </div>
            ` : ''}
          </div>
        </div>

        <div class="signature-area">
          <div class="signature-line">
            ${data.empresa?.nome_fantasia || 'Oficina'}<br>
            <span style="font-weight: normal; font-size: 10px;">Assinatura do Responsável</span>
          </div>
          <div class="signature-line">
            ${data.clientes?.nome || 'Cliente'}<br>
            <span style="font-weight: normal; font-size: 10px;">Assinatura e Aceite</span>
          </div>
        </div>

        <div class="footer">
          Este documento possui validade de orçamento/comprovante de serviço.<br>
          Garantia de serviços conforme Código de Defesa do Consumidor. Peças sujeitas à garantia do fabricante.
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank', 'width=800,height=900');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      setTimeout(() => {
        printWindow.print();
      }, 250);
    }
  } catch (error) {
    console.error("Erro ao gerar impressão:", error);
    alert("Falha ao gerar o layout de impressão. Verifique o console.");
  }
};