'use client';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ReceiptOSItem {
  descricao: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
}

export interface ReceiptCliente {
  nome: string;
  telefone: string;
  cpf_cnpj?: string;
  endereco?: string;
}

export interface ReceiptVeiculo {
  placa: string;
  modelo: string;
  marca: string;
  cor: string;
  km_atual: number;
  ano: number;
}

export interface ReceiptEmpresa {
  nome_fantasia?: string;
  razao_social?: string;
  cnpj?: string;
  endereco?: string;
  telefone?: string;
  logo_b64?: string;
}

export interface PrintReceiptData {
  id: string;
  data_abertura: string;
  status: string;
  descricao?: string;
  forma_pagamento?: string;
  mecanico_nome?: string;
  desconto?: number;
  total_geral: number;
  clientes?: ReceiptCliente | null;
  veiculos?: ReceiptVeiculo | null;
  itens?: ReceiptOSItem[] | null;
  empresa?: ReceiptEmpresa | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

function formatDateBR(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date);
  } catch {
    return dateStr;
  }
}

const statusLabelMap: Record<string, string> = {
  ORCAMENTO: 'Orçamento',
  EXECUCAO: 'Em Execução',
  AGUARDANDO_PECA: 'Aguardando Peça',
  FINALIZADO: 'Finalizado',
  PAGO: 'Pago',
};

const pagamentoLabelMap: Record<string, string> = {
  DINHEIRO: 'Dinheiro',
  PIX: 'PIX',
  CARTAO_CREDITO: 'Cartão de Crédito',
  CARTAO_DEBITO: 'Cartão de Débito',
  BOLETO: 'Boleto',
  TRANSFERENCIA: 'Transferência',
};

function maskCnpjCpf(value?: string): string {
  if (!value) return '—';
  const digits = value.replace(/\D/g, '');
  if (digits.length === 11) {
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }
  if (digits.length === 14) {
    return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }
  return value;
}

// ─── HTML Generator ──────────────────────────────────────────────────────────

function buildReceiptHTML(data: PrintReceiptData): string {
  const empresa = data.empresa;
  const cliente = data.clientes;
  const veiculo = data.veiculos;
  const itens = data.itens || [];
  const subtotal = itens.reduce((s, i) => s + i.valor_total, 0);
  const desconto = data.desconto || 0;
  const total = data.total_geral || subtotal - desconto;
  const shortId = data.id.length > 8 ? data.id.substring(0, 8).toUpperCase() : data.id.toUpperCase();
  const statusLabel = statusLabelMap[data.status] || data.status;
  const pagamentoLabel = pagamentoLabelMap[data.forma_pagamento || ''] || data.forma_pagamento || '—';

  const logoHtml = empresa?.logo_b64
    ? `<img src="${empresa.logo_b64}" alt="Logo" style="max-width:120px;max-height:60px;margin:0 auto 8px;display:block;" />`
    : '';

  const companyLine = empresa?.nome_fantasia || 'AutoTec PRO';
  const cnpjLine = empresa?.cnpj ? `CNPJ: ${maskCnpjCpf(empresa.cnpj)}` : '';
  const enderecoLine = empresa?.endereco || '';

  const clienteNome = cliente?.nome || '—';
  const clienteTel = cliente?.telefone || '—';
  const clienteCpf = cliente?.cpf_cnpj ? maskCnpjCpf(cliente.cpf_cnpj) : '';

  const placa = veiculo?.placa || '—';
  const modeloVeiculo = veiculo
    ? [veiculo.marca, veiculo.modelo, veiculo.ano].filter(Boolean).join(' ')
    : '—';
  const cor = veiculo?.cor || '—';
  const km = veiculo?.km_atual ? veiculo.km_atual.toLocaleString('pt-BR') : '—';

  const mecanicoNome = data.mecanico_nome || '—';

  const itemsRows = itens.length > 0
    ? itens.map((item, idx) => `
        <tr>
          <td style="padding:4px 6px;text-align:center;border-bottom:1px solid #eee;font-size:11px;">${idx + 1}</td>
          <td style="padding:4px 6px;border-bottom:1px solid #eee;font-size:11px;">${item.descricao}</td>
          <td style="padding:4px 6px;text-align:center;border-bottom:1px solid #eee;font-size:11px;">${item.quantidade}</td>
          <td style="padding:4px 6px;text-align:right;border-bottom:1px solid #eee;font-size:11px;">${formatBRL(item.valor_unitario)}</td>
          <td style="padding:4px 6px;text-align:right;border-bottom:1px solid #eee;font-size:11px;font-weight:600;">${formatBRL(item.valor_total)}</td>
        </tr>`).join('')
    : `<tr><td colspan="5" style="padding:12px 6px;text-align:center;color:#999;font-size:11px;">Nenhum item cadastrado</td></tr>`;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>OS #${shortId} — ${companyLine}</title>
  <style>
    @page { margin: 10mm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: 12px;
      line-height: 1.5;
      color: #111;
      background: #fff;
      width: 300px;
      margin: 0 auto;
      padding: 16px 12px;
    }
    .center { text-align: center; }
    .bold { font-weight: 700; }
    .divider {
      border: none;
      border-top: 1px dashed #bbb;
      margin: 10px 0;
    }
    .section-title {
      font-weight: 700;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #555;
      margin-bottom: 6px;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      padding: 1px 0;
    }
    .info-label { color: #777; }
    .info-value { color: #111; font-weight: 500; }
    table { width: 100%; border-collapse: collapse; margin: 6px 0; }
    th {
      text-align: left;
      padding: 4px 6px;
      border-bottom: 2px solid #333;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #333;
    }
    th:last-child, th:nth-child(3), th:nth-child(4) { text-align: center; }
    th:nth-child(5) { text-align: right; }
    .total-section {
      margin-top: 8px;
      text-align: right;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      padding: 2px 0;
    }
    .total-row.grand {
      font-size: 14px;
      font-weight: 700;
      border-top: 2px solid #333;
      padding-top: 6px;
      margin-top: 4px;
    }
    .badge {
      display: inline-block;
      padding: 1px 8px;
      border-radius: 3px;
      font-size: 10px;
      font-weight: 600;
      background: #f0f0f0;
      border: 1px solid #ccc;
    }
    .footer {
      margin-top: 14px;
      text-align: center;
      font-size: 10px;
      color: #999;
    }
    @media print {
      body { width: 100%; }
    }
  </style>
</head>
<body>

  <!-- Company Header -->
  <div class="center">
    ${logoHtml}
    <div class="bold" style="font-size:16px;letter-spacing:1px;">${companyLine}</div>
    ${cnpjLine ? `<div style="font-size:10px;color:#666;margin-top:2px;">${cnpjLine}</div>` : ''}
    ${enderecoLine ? `<div style="font-size:10px;color:#666;margin-top:1px;">${enderecoLine}</div>` : ''}
    ${empresa?.telefone ? `<div style="font-size:10px;color:#666;margin-top:1px;">Tel: ${empresa.telefone}</div>` : ''}
  </div>

  <hr class="divider" />

  <!-- OS Header -->
  <div class="center">
    <div class="bold" style="font-size:13px;">ORDEM DE SERVIÇO <span style="font-family:monospace;">#${shortId}</span></div>
    <div style="margin-top:4px;font-size:11px;">Data: ${data.data_abertura ? formatDateBR(data.data_abertura) : '—'}</div>
    <div style="margin-top:2px;"><span class="badge">${statusLabel}</span></div>
  </div>

  ${data.descricao ? `<div style="margin-top:8px;font-size:11px;color:#555;font-style:italic;">"${data.descricao}"</div>` : ''}

  <hr class="divider" />

  <!-- Client Section -->
  <div class="section-title">Cliente</div>
  <div class="info-row"><span class="info-label">Nome:</span><span class="info-value">${clienteNome}</span></div>
  <div class="info-row"><span class="info-label">Telefone:</span><span class="info-value">${clienteTel}</span></div>
  ${clienteCpf ? `<div class="info-row"><span class="info-label">CPF/CNPJ:</span><span class="info-value">${clienteCpf}</span></div>` : ''}

  <hr class="divider" />

  <!-- Vehicle Section -->
  <div class="section-title">Veículo</div>
  <div class="info-row"><span class="info-label">Placa:</span><span class="info-value" style="font-weight:700;">${placa}</span></div>
  <div class="info-row"><span class="info-label">Modelo:</span><span class="info-value">${modeloVeiculo}</span></div>
  <div class="info-row"><span class="info-label">Cor:</span><span class="info-value">${cor}</span><span class="info-label" style="margin-left:12px;">KM:</span><span class="info-value">${km}</span></div>

  <hr class="divider" />

  <!-- Items Table -->
  <div class="section-title">Itens</div>
  <table>
    <thead>
      <tr>
        <th style="width:20px;">#</th>
        <th>Descrição</th>
        <th>Qtd</th>
        <th>Unit.</th>
        <th>Total</th>
      </tr>
    </thead>
    <tbody>
      ${itemsRows}
    </tbody>
  </table>

  <!-- Totals -->
  <div class="total-section">
    <div class="total-row">
      <span style="color:#666;">Subtotal:</span>
      <span>${formatBRL(subtotal)}</span>
    </div>
    ${desconto > 0 ? `
    <div class="total-row">
      <span style="color:#666;">Desconto:</span>
      <span style="color:#d00;">- ${formatBRL(desconto)}</span>
    </div>` : ''}
    <div class="total-row grand">
      <span>TOTAL:</span>
      <span>${formatBRL(total)}</span>
    </div>
  </div>

  <hr class="divider" />

  <!-- Payment & Mechanic -->
  <div class="info-row"><span class="info-label">Pagamento:</span><span class="info-value">${pagamentoLabel}</span></div>
  <div class="info-row"><span class="info-label">Mecânico:</span><span class="info-value">${mecanicoNome}</span></div>

  <hr class="divider" />

  <!-- Footer -->
  <div class="footer">
    <div>Obrigado pela preferência!</div>
    <div style="margin-top:2px;">${companyLine} — Gestão de Oficina</div>
  </div>

</body>
</html>`;
}

// ─── Main Function ───────────────────────────────────────────────────────────

export function openPrintWindow(data: PrintReceiptData): void {
  const html = buildReceiptHTML(data);

  const printWindow = window.open('', '_blank', 'width=350,height=600');
  if (!printWindow) {
    // If popup is blocked, fall back to document write
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(html);
      doc.close();
      iframe.contentWindow?.print();
      setTimeout(() => document.body.removeChild(iframe), 10000);
    }
    return;
  }

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();

  // Allow the browser to render before triggering print
  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.print();
    }, 150);
  };
}

// ─── Default Export (component that exposes the function) ────────────────────

export default function PrintReceipt({ data }: { data: PrintReceiptData }) {
  // This component is a utility — callers use openPrintWindow directly.
  // Rendering null; the print action is side-effect-only.
  return null;
}