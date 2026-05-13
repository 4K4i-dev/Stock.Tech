"use strict";

const API_BASE = "http://localhost:3000";
const API_NOTAS = `${API_BASE}/notas`;
const API_PRODUTOS = `${API_BASE}/produtos`;
const API_VENDAS = `${API_BASE}/vendas`;
const API_GRAFICO = `${API_BASE}/movimentacoesGrafico`;
const API_CATEGORIAS = `${API_BASE}/categorias`;

let todasAsNotas = [];
let idEdicao = null;
let meuGrafico = null;

const $ = id => document.getElementById(id);

/* =======================================================================
   INICIALIZAÇÃO DO SITE
   ======================================================================= */
window.onload = async () => {
    aplicarConfiguracoesIniciais();
    await carregarCategorias();
    await buscarNotasAPI();
    await carregarDashboard();
};

/* =======================================================================
   SISTEMA DE CONFIGURAÇÕES (LOCALSTORAGE)
   ======================================================================= */
function aplicarConfiguracoesIniciais() {
    const nome = localStorage.getItem("st_nome") || "Administrador Geral";
    const email = localStorage.getItem("st_email") || "admin@stocktech.com";
    const cargo = localStorage.getItem("st_cargo") || "Gerente de Operações";
    const tema = localStorage.getItem("st_tema") || "light";

    $("nav-name").innerText = nome.split(" ")[0];
    $("nav-avatar").innerText = nome.substring(0, 2).toUpperCase();
    $("drop-name").innerText = nome;
    $("drop-email").innerText = email;
    $("drop-cargo").innerText = cargo;

    $("cfg-nome").value = nome;
    $("cfg-email").value = email;
    $("cfg-cargo").value = cargo;
    $("cfg-tema").value = tema;

    if (tema === "dark") {
        document.body.setAttribute("data-theme", "dark");
    } else {
        document.body.removeAttribute("data-theme");
    }
}

$("btn-salvar-config").addEventListener("click", () => {
    localStorage.setItem("st_nome", $("cfg-nome").value);
    localStorage.setItem("st_email", $("cfg-email").value);
    localStorage.setItem("st_cargo", $("cfg-cargo").value);
    localStorage.setItem("st_tema", $("cfg-tema").value);

    aplicarConfiguracoesIniciais();
    $("modal-config").classList.remove("open");
    mostrarToast("Configurações salvas com sucesso!");
});

document.querySelectorAll('.config-tab').forEach(botao => {
    botao.addEventListener('click', () => {
        document.querySelectorAll('.config-tab').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.config-pane').forEach(p => p.style.display = 'none');
        botao.classList.add('active');
        $(botao.getAttribute('data-tab')).style.display = 'block';
    });
});

$("btn-config").addEventListener("click", () => {
    $("modal-config").classList.add("open");
});

/* =======================================================================
   DASHBOARD RELACIONAL E GRÁFICOS
   ======================================================================= */
$("btn-atualizar").addEventListener("click", () => {
    mostrarToast("Buscando dados...");
    carregarDashboard();
    buscarNotasAPI();
});

$("filtro-dias").addEventListener("change", (e) => {
    const dias = e.target.value;
    document.querySelectorAll('.kpi-dias-label').forEach(label => {
        label.innerText = `(${dias}D)`;
    });
    carregarDashboard();
});

async function carregarDashboard() {
    const agora = new Date();
    $("hora-atualizacao").innerText = `Hoje às ${agora.getHours()}:${agora.getMinutes().toString().padStart(2, '0')}`;

    try {
        const resProd = await fetch(API_PRODUTOS);
        const produtos = await resProd.json();

        const resVendas = await fetch(API_VENDAS);
        const vendas = await resVendas.json();

        const resGrafico = await fetch(API_GRAFICO);
        const movimentacoes = await resGrafico.json();

        // Cálculo dinâmico baseado em produtos e vendas reais
        let totalProdutos = produtos.length;
        let valorTotalEstoque = produtos.reduce((acc, p) => acc + (p.preco * p.quantidade), 0);
        let totalVendido = vendas.reduce((acc, v) => acc + v.valorTotal, 0);
        let lucroTotal = vendas.reduce((acc, v) => acc + v.lucro, 0);

        $("kpi-produtos").innerText = totalProdutos;
        $("kpi-estoque").innerText = valorTotalEstoque.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        $("kpi-vendas").innerText = totalVendido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        $("kpi-lucro").innerText = lucroTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

        // Top Produtos
        produtos.sort((a, b) => b.vendasNoMes - a.vendasNoMes);
        const lista = $("lista-top-produtos");
        lista.innerHTML = "";
        produtos.slice(0, 4).forEach(prod => {
            lista.innerHTML += `<li><span>${prod.nome}</span> <span class="prod-vendas">${prod.vendasNoMes} un.</span></li>`;
        });

        const diasSelecionados = $("filtro-dias").value;
        montarGrafico(movimentacoes, diasSelecionados);

    } catch (erro) {
        console.warn("Erro no Dashboard. O JSON Server está ligado?");
    }
}

function montarGrafico(movimentacoes, dias) {
    const ctx = $('graficoMovimentacoes').getContext('2d');
    const dadosFiltrados = movimentacoes.slice(-parseInt(dias));

    if (meuGrafico) meuGrafico.destroy();

    meuGrafico = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dadosFiltrados.map(item => item.data),
            datasets: [{
                label: 'Qtd. Movimentada',
                data: dadosFiltrados.map(item => item.qtd),
                borderColor: '#1b5e20',
                backgroundColor: 'rgba(27, 94, 32, 0.1)',
                borderWidth: 2, tension: 0.3, fill: true, pointBackgroundColor: '#1b5e20'
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });
}

/* =======================================================================
   CRUD DAS NOTAS OPERACIONAIS
   ======================================================================= */
async function carregarCategorias() {
    const select = $("f-categoria");
    select.innerHTML = '<option value="">Selecione...</option>';
    try {
        const res = await fetch(API_CATEGORIAS);
        const categorias = await res.json();
        categorias.forEach(cat => select.innerHTML += `<option value="${cat.nome}">${cat.nome}</option>`);
    } catch (erro) {
        console.warn("Usando fallback de categorias");
    }
}

document.querySelectorAll('.btn-urgency').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.btn-urgency').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        $("f-urgencia").value = btn.getAttribute('data-val');
    });
});

async function buscarNotasAPI() {
    try {
        const resposta = await fetch(API_NOTAS);
        if (!resposta.ok) throw new Error("Falha no Fetch");
        todasAsNotas = await resposta.json();
        aplicarFiltrosERenderizar();
    } catch (erro) {
        $("notas-tbody").innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 20px;">⚠️ <b>Atenção:</b> Ligue o JSON Server!</td></tr>`;
    }
}

document.getElementById("form-nota").addEventListener("submit", async function (e) {
    e.preventDefault();

    const dados = {
        titulo: $("f-titulo").value,
        categoria: $("f-categoria").value,
        status: $("f-status").value,
        urgencia: $("f-urgencia").value,
        descricao: $("f-descricao").value,
        criadoEm: idEdicao ? todasAsNotas.find(n => n.id === idEdicao).criadoEm : new Date().toISOString()
    };

    try {
        if (idEdicao) {
            await fetch(`${API_NOTAS}/${idEdicao}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(dados) });
            mostrarToast("Nota atualizada!");
        } else {
            await fetch(API_NOTAS, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(dados) });
            mostrarToast("Nova nota adicionada!");
        }
        fecharModal();
        buscarNotasAPI();
    } catch (erro) {
        alert("Erro ao salvar! Verifique se o JSON Server está ligado.");
    }
});

function aplicarFiltrosERenderizar() {
    const busca = $("input-busca").value.toLowerCase();
    const urgencia = $("filter-urgencia").value;

    const filtradas = todasAsNotas.filter(n =>
        (n.titulo.toLowerCase().includes(busca) || n.categoria.toLowerCase().includes(busca)) &&
        (urgencia === "" || n.urgencia === urgencia)
    );

    const tbody = $("notas-tbody");
    tbody.innerHTML = "";

    if (filtradas.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:20px;">Nenhuma nota encontrada...</td></tr>`;
        return;
    }

    filtradas.forEach(nota => {
        const dataFmt = new Date(nota.criadoEm).toLocaleDateString("pt-BR");
        const clSts = `badge-${nota.status.toLowerCase().replace(' ', '')}`;

        tbody.innerHTML += `
      <tr>
        <td><strong>${nota.titulo}</strong><br><small style="color:var(--text-muted)">${nota.descricao.substring(0, 40)}...</small></td>
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

window.excluirNota = async function (id) {
    if (confirm("Você tem certeza que quer excluir esta nota?")) {
        await fetch(`${API_NOTAS}/${id}`, { method: "DELETE" });
        mostrarToast("Nota apagada do banco.");
        buscarNotasAPI();
    }
};

function fecharModal() {
    $("modal-nota").classList.remove("open");
    $("form-nota").reset();
    idEdicao = null;
    document.querySelectorAll('.btn-urgency').forEach(b => b.classList.remove('active'));
    document.querySelector('.btn-urgency[data-val="Baixa"]').classList.add('active');
}

$("btn-nova-nota").addEventListener("click", () => {
    $("modal-titulo-txt").innerText = "Nova Nota";
    $("modal-nota").classList.add("open");
});
$("btn-fechar-modal").addEventListener("click", fecharModal);
$("btn-cancelar").addEventListener("click", (e) => { e.preventDefault(); fecharModal(); });
$("input-busca").addEventListener("input", aplicarFiltrosERenderizar);
$("filter-urgencia").addEventListener("change", aplicarFiltrosERenderizar);

function mostrarToast(msg) {
    const container = $("toast-container");
    const div = document.createElement("div");
    div.className = "toast";
    div.innerHTML = `<i class="fa-solid fa-check"></i> ${msg}`;
    container.appendChild(div);
    setTimeout(() => div.remove(), 3000);
}