"use strict";

/* =======================================================================
   1. DADOS INICIAIS E REPOSITÓRIO (LocalStorage)
   ======================================================================= */
const DADOS_INICIAIS = {
    categorias: [
        { id: "1", nome: "Logística & Estoque" },
        { id: "2", nome: "Financeiro" },
        { id: "3", nome: "Comercial & Vendas" },
        { id: "4", nome: "TI & Sistemas" }
    ],
    produtos: [
        { id: "1", nome: "Notebook Dell Inspiron", preco: 3500, quantidade: 15, vendasNoMes: 45 },
        { id: "2", nome: "Monitor LG 24''", preco: 850, quantidade: 30, vendasNoMes: 38 },
        { id: "3", nome: "Mouse Sem Fio Logitech", preco: 120, quantidade: 80, vendasNoMes: 32 },
        { id: "4", nome: "Teclado Mecânico RGB", preco: 350, quantidade: 25, vendasNoMes: 28 },
        { id: "5", nome: "Cadeira Ergonomica", preco: 1200, quantidade: 10, vendasNoMes: 15 }
    ],
    vendas: [
        { id: "1", data: "2026-05-10", valorTotal: 3500, lucro: 800 },
        { id: "2", data: "2026-05-11", valorTotal: 1700, lucro: 450 },
        { id: "3", data: "2026-05-12", valorTotal: 850, lucro: 200 }
    ],
    // Massa de dados expandida para o filtro de dias funcionar visualmente
    movimentacoesGrafico: [
        { data: "28/04", qtd: 120 }, { data: "29/04", qtd: 130 }, { data: "30/04", qtd: 140 },
        { data: "01/05", qtd: 110 }, { data: "02/05", qtd: 160 }, { data: "03/05", qtd: 90 },
        { data: "04/05", qtd: 210 }, { data: "05/05", qtd: 180 }, { data: "06/05", qtd: 250 },
        { data: "07/05", qtd: 300 }, { data: "08/05", qtd: 150 }, { data: "09/05", qtd: 170 },
        { data: "10/05", qtd: 220 }, { data: "11/05", qtd: 190 }, { data: "12/05", qtd: 280 }
    ],
    notas: []
};

// Funções de abstração do Banco de Dados
function iniciarBancoDeDados() {
    if (!localStorage.getItem("stockTechDB")) {
        localStorage.setItem("stockTechDB", JSON.stringify(DADOS_INICIAIS));
    }
}
function lerBanco() { return JSON.parse(localStorage.getItem("stockTechDB")); }
function salvarBanco(dados) { localStorage.setItem("stockTechDB", JSON.stringify(dados)); }

let todasAsNotas = [];
let idEdicao = null;
let meuGrafico = null;
const $ = id => document.getElementById(id);

/* =======================================================================
   2. INICIALIZAÇÃO GERAL (ONLOAD)
   ======================================================================= */
window.onload = () => {
    iniciarBancoDeDados();
    aplicarConfiguracoesIniciais();
    carregarCategorias();
    buscarNotasBancoLocal();
    carregarDashboard(); // Inicializa todos os componentes do Dashboard
};

function carregarDashboard() {
    const bd = lerBanco();
    const diasSelecionados = $("filtro-dias") ? parseInt($("filtro-dias").value) : 7;

    // Subdividido em funções específicas para facilitar a integração futura
    renderizarKPIs(bd.produtos, bd.vendas);
    renderizarTopProdutos(bd.produtos);
    renderizarGrafico(bd.movimentacoesGrafico, diasSelecionados);

    // [FONTE DE DADOS]: Horário gerado dinamicamente pelo navegador
    const agora = new Date();
    if($("hora-atualizacao")) {
        $("hora-atualizacao").innerText = `Hoje às ${agora.getHours()}:${agora.getMinutes().toString().padStart(2, '0')}`;
    }
}

function renderizarKPIs(produtos, vendas) {
    // [FONTE DE DADOS]: arrays 'produtos' e 'vendas' do LocalStorage
    let totalProdutos = produtos.length;
    let valorTotalEstoque = produtos.reduce((acc, p) => acc + (p.preco * p.quantidade), 0);
    let totalVendido = vendas.reduce((acc, v) => acc + v.valorTotal, 0);
    let lucroTotal = vendas.reduce((acc, v) => acc + v.lucro, 0);

    if($("kpi-produtos")) $("kpi-produtos").innerText = totalProdutos;
    if($("kpi-estoque")) $("kpi-estoque").innerText = valorTotalEstoque.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    if($("kpi-vendas")) $("kpi-vendas").innerText = totalVendido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    if($("kpi-lucro")) $("kpi-lucro").innerText = lucroTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function renderizarTopProdutos(produtos) {
    // [FONTE DE DADOS]: array 'produtos' do LocalStorage
    const lista = $("lista-top-produtos");
    if(!lista) return;

    // Cria uma cópia do array e ordena do maior para o menor em vendas
    const topProdutos = [...produtos].sort((a, b) => b.vendasNoMes - a.vendasNoMes).slice(0, 4);
    
    lista.innerHTML = ""; // Limpa a lista antes de renderizar
    topProdutos.forEach(prod => {
        lista.innerHTML += `<li><span>${prod.nome}</span> <span class="prod-vendas">${prod.vendasNoMes} un.</span></li>`;
    });
}

function renderizarGrafico(movimentacoes, dias) {
    // [FONTE DE DADOS]: array 'movimentacoesGrafico' fatiado (slice) pelo filtro de dias
    const canvas = $('graficoMovimentacoes');
    if(!canvas) return;

    const ctx = canvas.getContext('2d');
    // .slice(-dias) pega apenas os últimos "X" dias do array para refletir o filtro
    const dadosFiltrados = movimentacoes.slice(-dias);

    if (meuGrafico) meuGrafico.destroy(); // Limpa o gráfico anterior

    meuGrafico = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dadosFiltrados.map(item => item.data),
            datasets: [{
                label: 'Qtd. Movimentada',
                data: dadosFiltrados.map(item => item.qtd),
                borderColor: '#1b5e20',
                backgroundColor: 'rgba(27, 94, 32, 0.1)',
                borderWidth: 2, tension: 0.3, fill: true
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });
}

// [INTERATIVIDADE]: Filtro de dias do gráfico
if($("filtro-dias")) {
    $("filtro-dias").addEventListener("change", (e) => {
        const dias = e.target.value;
        // Atualiza as labels dos cards para refletir o dia escolhido (ex: 7D, 15D, 30D)
        document.querySelectorAll('.kpi-dias-label').forEach(label => label.innerText = `(${dias}D)`);
        carregarDashboard(); // Recarrega os dados com o novo filtro
    });
}

// [INTERATIVIDADE]: Botão Atualizar
if($("btn-atualizar")) {
    $("btn-atualizar").addEventListener("click", () => {
        mostrarToast("A atualizar métricas e banco de dados...");
        carregarDashboard();
        buscarNotasBancoLocal();
    });
}

/* =======================================================================
   4. MÓDULO DE NOTAS OPERACIONAIS (CRUD COMPLETO) - INTACTO
   ======================================================================= */
function carregarCategorias() {
    const select = $("f-categoria");
    if(!select) return;
    select.innerHTML = '<option value="">Selecione...</option>';
    lerBanco().categorias.forEach(cat => {
        select.innerHTML += `<option value="${cat.nome}">${cat.nome}</option>`;
    });
}

document.querySelectorAll('.btn-urgency').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.btn-urgency').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        if($("f-urgencia")) $("f-urgencia").value = btn.getAttribute('data-val');
    });
});

function buscarNotasBancoLocal() {
    todasAsNotas = lerBanco().notas || [];
    aplicarFiltrosERenderizar(); 
}

function aplicarFiltrosERenderizar() {
    if(!$("notas-tbody")) return;
    
    const busca = $("input-busca") ? $("input-busca").value.toLowerCase() : "";
    const urgencia = $("filter-urgencia") ? $("filter-urgencia").value : "";

    const filtradas = todasAsNotas.filter(n =>
        (n.titulo.toLowerCase().includes(busca) || n.categoria.toLowerCase().includes(busca)) &&
        (urgencia === "" || n.urgencia === urgencia)
    );

    const tbody = $("notas-tbody");
    tbody.innerHTML = ""; 

    if (filtradas.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;">Nenhuma nota encontrada...</td></tr>`;
        return;
    }

    filtradas.forEach(nota => {
        const dataFmt = new Date(nota.criadoEm).toLocaleDateString("pt-BR");
        const clSts = `badge-${nota.status.toLowerCase().replace(' ', '')}`;

        tbody.innerHTML += `
      <tr>
        <td><strong>${nota.titulo}</strong><br><small style="color:gray">${nota.descricao.substring(0, 40)}...</small></td>
        <td>${nota.categoria}</td>
        <td><span class="urgency-text" data-urgency="${nota.urgencia}">${nota.urgencia}</span></td>
        <td><span class="badge ${clSts}">${nota.status}</span></td>
        <td>${dataFmt}</td>
        <td style="text-align:center">
          <button class="btn-row" onclick="editarNota('${nota.id}')"><i class="fa-solid fa-pen"></i></button>
          <button class="btn-row del" onclick="excluirNota('${nota.id}')"><i class="fa-solid fa-trash"></i></button>
        </td>
      </tr>
    `;
    });
}

if($("input-busca")) $("input-busca").addEventListener("input", aplicarFiltrosERenderizar);
if($("filter-urgencia")) $("filter-urgencia").addEventListener("change", aplicarFiltrosERenderizar);

if($("form-nota")) {
    $("form-nota").addEventListener("submit", function (e) {
        e.preventDefault(); 
        const bd = lerBanco();
        const dadosFormulario = {
            titulo: $("f-titulo").value,
            categoria: $("f-categoria").value,
            status: $("f-status").value,
            urgencia: $("f-urgencia").value,
            descricao: $("f-descricao").value,
            criadoEm: idEdicao ? todasAsNotas.find(n => n.id === idEdicao).criadoEm : new Date().toISOString()
        };

        if (idEdicao) {
            const index = bd.notas.findIndex(n => n.id === idEdicao);
            dadosFormulario.id = idEdicao; 
            bd.notas[index] = dadosFormulario; 
        } else {
            dadosFormulario.id = Date.now().toString(); 
            bd.notas.push(dadosFormulario); 
        }

        salvarBanco(bd); 
        fecharModal();
        buscarNotasBancoLocal();
        mostrarToast(idEdicao ? "Nota atualizada!" : "Nova nota adicionada!"); 
    });
}

window.editarNota = function (id) {
    const nota = todasAsNotas.find(n => String(n.id) === String(id));
    idEdicao = nota.id;
    
    $("modal-titulo-txt").innerText = "Editar Nota";
    $("f-titulo").value = nota.titulo;
    $("f-categoria").value = nota.categoria;
    $("f-status").value = nota.status;
    $("f-descricao").value = nota.descricao;
    $("f-urgencia").value = nota.urgencia;

    document.querySelectorAll('.btn-urgency').forEach(b => {
        b.classList.remove('active');
        if (b.getAttribute('data-val') === nota.urgencia) b.classList.add('active');
    });

    $("modal-nota").classList.add("open");
};

window.excluirNota = function (id) {
    if (confirm("Tens a certeza de que pretendes excluir esta nota?")) {
        const bd = lerBanco();
        bd.notas = bd.notas.filter(n => String(n.id) !== String(id)); 
        salvarBanco(bd); 
        mostrarToast("Nota eliminada com sucesso.");
        buscarNotasBancoLocal(); 
    }
};

/* =======================================================================
   5. CONFIGURAÇÕES E UTILITÁRIOS (INTACTOS)
   ======================================================================= */
function aplicarConfiguracoesIniciais() {
    const nome = localStorage.getItem("st_nome") || "Administrador Geral";
    const email = localStorage.getItem("st_email") || "admin@stocktech.com";
    const cargo = localStorage.getItem("st_cargo") || "Gerente de Operações";
    const tema = localStorage.getItem("st_tema") || "light";

    if($("nav-name")) $("nav-name").innerText = nome.split(" ")[0];
    if($("nav-avatar")) $("nav-avatar").innerText = nome.substring(0, 2).toUpperCase();
    if($("drop-name")) $("drop-name").innerText = nome;
    if($("drop-email")) $("drop-email").innerText = email;
    if($("drop-cargo")) $("drop-cargo").innerText = cargo;

    if($("cfg-nome")) $("cfg-nome").value = nome;
    if($("cfg-email")) $("cfg-email").value = email;
    if($("cfg-cargo")) $("cfg-cargo").value = cargo;
    if($("cfg-tema")) $("cfg-tema").value = tema;

    if (tema === "dark") document.body.setAttribute("data-theme", "dark");
    else document.body.removeAttribute("data-theme");
}

if($("btn-config")) $("btn-config").addEventListener("click", () => $("modal-config").classList.add("open"));

if($("btn-salvar-config")) {
    $("btn-salvar-config").addEventListener("click", () => {
        localStorage.setItem("st_nome", $("cfg-nome").value);
        localStorage.setItem("st_email", $("cfg-email").value);
        localStorage.setItem("st_cargo", $("cfg-cargo").value);
        localStorage.setItem("st_tema", $("cfg-tema").value);
        aplicarConfiguracoesIniciais();
        $("modal-config").classList.remove("open");
        mostrarToast("Configurações atualizadas!");
    });
}

document.querySelectorAll('.config-tab').forEach(botao => {
    botao.addEventListener('click', () => {
        document.querySelectorAll('.config-tab').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.config-pane').forEach(p => p.style.display = 'none');
        botao.classList.add('active');
        $(botao.getAttribute('data-tab')).style.display = 'block';
    });
});

function fecharModal() {
    if($("modal-nota")) $("modal-nota").classList.remove("open");
    if($("form-nota")) $("form-nota").reset();
    idEdicao = null;
    
    document.querySelectorAll('.btn-urgency').forEach(b => b.classList.remove('active'));
    const btnBaixa = document.querySelector('.btn-urgency[data-val="Baixa"]');
    if(btnBaixa) btnBaixa.classList.add('active');
    if($("f-urgencia")) $("f-urgencia").value = "Baixa";
}

if($("btn-nova-nota")) $("btn-nova-nota").addEventListener("click", () => { $("modal-titulo-txt").innerText = "Nova Nota"; $("modal-nota").classList.add("open"); });
if($("btn-fechar-modal")) $("btn-fechar-modal").addEventListener("click", fecharModal);
if($("btn-cancelar")) $("btn-cancelar").addEventListener("click", (e) => { e.preventDefault(); fecharModal(); });

function mostrarToast(msg) {
    const container = $("toast-container");
    if(!container) return;
    const div = document.createElement("div");
    div.className = "toast";
    div.innerHTML = `<i class="fa-solid fa-check"></i> ${msg}`;
    container.appendChild(div);
    setTimeout(() => div.remove(), 3000); 
}