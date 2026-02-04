// Lógica do dashboard
document.addEventListener('DOMContentLoaded', function() {
    const filterBtns = document.querySelectorAll('.filter-btn');
    const escolaFilterSelect = document.getElementById('escolaFilter');
    const salaFilterSelect = document.getElementById('salaFilter');
    const mesFilterGroup = document.getElementById('mesFilterGroup');
    const mesFilterSelect = document.getElementById('mesFilter');
    const loadingDiv = document.getElementById('loading');
    let filtroAtual = 'diario';
    let escolaAtual = '';
    let salaAtual = '';
    let mesAtual = new Date().getMonth();
    let chartSalas, chartCategorias;
    let chartEscola;
    let todasAvaliacoes = [];

    // Event listeners para filtros de período
    filterBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            filterBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            filtroAtual = this.dataset.filter;
            
            // Mostrar/esconder filtro de mês
            if (filtroAtual === 'mensal') {
                mesFilterGroup.style.display = 'block';
            } else {
                mesFilterGroup.style.display = 'none';
            }
            
            carregarDados();
        });
    });

    // Event listener para filtro de mês
    mesFilterSelect.addEventListener('change', function() {
        mesAtual = parseInt(this.value);
        carregarDados();
    });

    // Definir mês atual no select de mês
    mesFilterSelect.value = mesAtual;

    // Event listener para filtro de escola
    escolaFilterSelect.addEventListener('change', function() {
        escolaAtual = this.value;
        // Resetar filtro de sala quando mudar de escola
        salaAtual = '';
        salaFilterSelect.value = '';
        carregarDados();
    });

    // Event listener para filtro de sala
    salaFilterSelect.addEventListener('change', function() {
        salaAtual = this.value;
        carregarDados();
    });

    // Função para calcular data inicial baseada no filtro
    function getDataInicial(filtro) {
        const agora = new Date();
        switch(filtro) {
            case 'diario':
                agora.setHours(0, 0, 0, 0);
                return agora;
            case 'semanal':
                agora.setDate(agora.getDate() - 7);
                return agora;
            case 'mensal':
                // Usar o mês selecionado
                const anoAtual = agora.getFullYear();
                // Se o mês selecionado é anterior ao mês atual, é do ano anterior
                const ano = mesAtual > agora.getMonth() ? anoAtual - 1 : anoAtual;
                return new Date(ano, mesAtual, 1);
            case 'total':
                return new Date(2020, 0, 1); // Data bem antiga
            default:
                return agora;
        }
    }

    // Carregar dados do Firestore
    async function carregarDados() {
        loadingDiv.style.display = 'block';

        try {
            const dataInicial = getDataInicial(filtroAtual);
            
            // Query com filtro de data
            const snapshot = await avaliacoesRef
                .where('timestamp', '>=', dataInicial)
                .get();

            todasAvaliacoes = [];
            snapshot.forEach(doc => {
                todasAvaliacoes.push(doc.data());
            });

            // Preencher select de salas sempre que carregar dados
            preencherSelectSalas(todasAvaliacoes, salaAtual);

            // Filtrar por escola (para o gráfico da escola) e por sala (para gráficos/estatísticas locais)
            const avaliacoesPorEscola = escolaAtual
                ? todasAvaliacoes.filter(av => av.escola === escolaAtual)
                : todasAvaliacoes;

            // Filtrar por sala se selecionada (para as estatísticas e gráficos por sala)
            let avaliacoesFiltradas = avaliacoesPorEscola;
            if (salaAtual) {
                avaliacoesFiltradas = avaliacoesFiltradas.filter(av => av.sala === salaAtual);
            }

            // Processar e exibir dados
            processarEstatisticas(avaliacoesFiltradas);
            // Criar gráfico da escola (usa apenas o filtro de escola)
            criarGraficoEscola(avaliacoesPorEscola);
            criarGraficos(avaliacoesFiltradas);

        } catch (error) {
            console.error('Erro ao carregar dados:', error);
            alert('Erro ao carregar dados. Verifique a configuração do Firebase.');
        } finally {
            loadingDiv.style.display = 'none';
        }
    }

    // Preencher select com as salas disponíveis
    function preencherSelectSalas(avaliacoes, salaSelecionada) {
        // Filtrar avaliações por escola se selecionada
        const avaliacoesFiltradas = escolaAtual 
            ? avaliacoes.filter(av => av.escola === escolaAtual)
            : avaliacoes;

        const salas = [...new Set(avaliacoesFiltradas.map(av => av.sala))].sort();
        
        // Limpar opções existentes (exceto a primeira)
        salaFilterSelect.innerHTML = '<option value="">-- Todas as Salas --</option>';
        
        salas.forEach(sala => {
            const option = document.createElement('option');
            option.value = sala;
            option.textContent = sala;
            salaFilterSelect.appendChild(option);
        });

        if (salaSelecionada && salas.includes(salaSelecionada)) {
            salaFilterSelect.value = salaSelecionada;
        }
    }

    // Processar estatísticas
    function processarEstatisticas(avaliacoes) {
        // Contar por sala (pegar apenas a última avaliação de cada sala)
        const salasPorNivel = {};
        const ultimaAvaliacaoPorSala = {};

        avaliacoes.forEach(av => {
            const timestamp = av.timestamp ? av.timestamp.toDate() : new Date(av.data);
            if (!ultimaAvaliacaoPorSala[av.sala] || timestamp > ultimaAvaliacaoPorSala[av.sala].timestamp) {
                ultimaAvaliacaoPorSala[av.sala] = {
                    ...av,
                    timestamp: timestamp
                };
            }
        });

        // Contar níveis ecológicos
        Object.values(ultimaAvaliacaoPorSala).forEach(av => {
            salasPorNivel[av.nivelEcologico] = (salasPorNivel[av.nivelEcologico] || 0) + 1;
        });

        // Atualizar cards de estatísticas
        document.getElementById('totalAvaliacoes').textContent = avaliacoes.length;
        document.getElementById('salasEcologicas').textContent = salasPorNivel['eficientes-energeticamente'] || 0;
        document.getElementById('salasPoucoEcologicas').textContent = salasPorNivel['pouco-eficientes-energeticamente'] || 0;
        document.getElementById('salasNaoEcologicas').textContent = salasPorNivel['nao-eficientes-energeticamente'] || 0;
    }

    // Criar gráficos
    function criarGraficos(avaliacoes) {
        if (salaAtual) {
            // Se uma sala foi selecionada, mostrar gráficos específicos dessa sala
            criarGraficosSala(avaliacoes);
        } else {
            // Se não há sala selecionada, mostrar comparação entre salas
            criarGraficosComparacao(avaliacoes);
        }
    }

    // Criar gráficos de comparação (todas as salas)
    function criarGraficosComparacao(avaliacoes) {
        // Preparar dados por sala
        const dadosPorSala = {};
        
        avaliacoes.forEach(av => {
            if (!dadosPorSala[av.sala]) {
                dadosPorSala[av.sala] = {
                    ecologica: 0,
                    poucoEcologica: 0,
                    naoEcologica: 0,
                    total: 0
                };
            }
            dadosPorSala[av.sala].total++;
            if (av.nivelEcologico === 'eficientes-energeticamente') {
                dadosPorSala[av.sala].ecologica++;
            } else if (av.nivelEcologico === 'pouco-eficientes-energeticamente') {
                dadosPorSala[av.sala].poucoEcologica++;
            } else {
                dadosPorSala[av.sala].naoEcologica++;
            }
        });

        const salas = Object.keys(dadosPorSala).sort();
        const ecologicas = salas.map(s => dadosPorSala[s].ecologica);
        const poucoEcologicas = salas.map(s => dadosPorSala[s].poucoEcologica);
        const naoEcologicas = salas.map(s => dadosPorSala[s].naoEcologica);

        // Gráfico de salas
        const ctxSalas = document.getElementById('chartSalas').getContext('2d');
        if (chartSalas) {
            chartSalas.destroy();
        }
        chartSalas = new Chart(ctxSalas, {
            type: 'bar',
            data: {
                labels: salas,
                datasets: [
                    {
                        label: 'Eficiente energeticamente',
                        data: ecologicas,
                        backgroundColor: '#27ae60',
                    },
                    {
                        label: 'Pouco eficiente energeticamente',
                        data: poucoEcologicas,
                        backgroundColor: '#f39c12',
                    },
                    {
                        label: 'Ineficiente energeticamente',
                        data: naoEcologicas,
                        backgroundColor: '#e74c3c',
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                scales: {
                    x: {
                        stacked: true,
                    },
                    y: {
                        stacked: true,
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                },
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    title: {
                        display: false
                    }
                }
            }
        });

        // Preparar dados por categoria
        const categorias = {
            luzes: { sim: 0, nao: 0 },
            luzNatural: { sim: 0, nao: 0 },
            computadores: { sim: 0, nao: 0 },
            projetor: { sim: 0, nao: 0 }
        };

        avaliacoes.forEach(av => {
            categorias.luzes[av.luzes ? 'sim' : 'nao']++;
            categorias.luzNatural[av.luzNatural ? 'sim' : 'nao']++;
            categorias.computadores[av.computadores ? 'sim' : 'nao']++;
            categorias.projetor[av.projetor ? 'sim' : 'nao']++;
        });

        const nomesCategorias = [
            'Luzes Desligadas',
            'Luz Natural',
            'Computadores Desligados',
            'Projetor Desligado'
        ];
        const simData = [
            categorias.luzes.sim,
            categorias.luzNatural.sim,
            categorias.computadores.sim,
            categorias.projetor.sim
        ];
        const naoData = [
            categorias.luzes.nao,
            categorias.luzNatural.nao,
            categorias.computadores.nao,
            categorias.projetor.nao
        ];

        // Gráfico de categorias
        const ctxCategorias = document.getElementById('chartCategorias').getContext('2d');
        if (chartCategorias) {
            chartCategorias.destroy();
        }
        chartCategorias = new Chart(ctxCategorias, {
            type: 'bar',
            data: {
                labels: nomesCategorias,
                datasets: [
                    {
                        label: 'Sim',
                        data: simData,
                        backgroundColor: '#27ae60',
                    },
                    {
                        label: 'Não',
                        data: naoData,
                        backgroundColor: '#e74c3c',
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                indexAxis: 'y',
                scales: {
                    x: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                },
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    title: {
                        display: false
                    }
                }
            }
        });
    }

    // Criar gráfico de desempenho da escola ao longo do tempo
    function criarGraficoEscola(avaliacoes) {
        // Determinar intervalo e buckets conforme o filtroAtual
        const dataInicial = getDataInicial(filtroAtual);
        const buckets = [];
        let labels = [];
        const reached = []; // se o período já foi alcançado (true) ou é futuro (false)
        const now = new Date();

        if (filtroAtual === 'diario') {
            // 24 horas do dia — marcar apenas horas até à hora atual como alcançadas
            const lastHour = now.getHours();
            for (let h = 0; h < 24; h++) {
                buckets.push({ ecologica: 0, poucoEcologica: 0, naoEcologica: 0 });
                labels.push((h < 10 ? '0' + h : h) + 'h');
                reached.push(h <= lastHour);
            }
        } else if (filtroAtual === 'semanal') {
            // 7 dias a partir da dataInicial — marcar dias até hoje como alcançados
            for (let d = 0; d < 7; d++) {
                const dt = new Date(dataInicial.getTime());
                dt.setDate(dataInicial.getDate() + d);
                buckets.push({ ecologica: 0, poucoEcologica: 0, naoEcologica: 0 });
                labels.push((dt.getDate() < 10 ? '0' + dt.getDate() : dt.getDate()) + '/' + (dt.getMonth() + 1));
                // alcançado se dt <= hoje
                const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                const dtDay = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
                reached.push(dtDay.getTime() <= today.getTime());
            }
        } else if (filtroAtual === 'mensal') {
            // Dias do mês selecionado
            const ano = dataInicial.getFullYear();
            const mes = dataInicial.getMonth();
            const diasNoMes = new Date(ano, mes + 1, 0).getDate();
            for (let day = 1; day <= diasNoMes; day++) {
                buckets.push({ ecologica: 0, poucoEcologica: 0, naoEcologica: 0 });
                labels.push(day.toString());
                // alcançado se o dia <= hoje quando for o mês/ano atual, senão é passado e alcançado
                if (ano === now.getFullYear() && mes === now.getMonth()) {
                    reached.push(day <= now.getDate());
                } else {
                    reached.push(true);
                }
            }
        } else {
            // total -> últimos 12 meses (todos já alcançados até ao mês atual)
            for (let i = 11; i >= 0; i--) {
                const dt = new Date(now.getFullYear(), now.getMonth() - i, 1);
                buckets.push({ ecologica: 0, poucoEcologica: 0, naoEcologica: 0 });
                labels.push((dt.getMonth() + 1) + '/' + dt.getFullYear());
                reached.push(true);
            }
        }

        // Preencher buckets com as avaliações (avaliacoes já filtradas por escola)
        avaliacoes.forEach(av => {
            const ts = av.timestamp ? av.timestamp.toDate() : new Date(av.data);
            if (filtroAtual === 'diario') {
                // considerar só o mesmo dia de dataInicial
                if (ts.toDateString() !== dataInicial.toDateString()) return;
                const h = ts.getHours();
                if (h >= 0 && h < 24) {
                    if (av.nivelEcologico === 'eficientes-energeticamente') buckets[h].ecologica++;
                    else if (av.nivelEcologico === 'pouco-eficientes-energeticamente') buckets[h].poucoEcologica++;
                    else buckets[h].naoEcologica++;
                }
            } else if (filtroAtual === 'semanal') {
                const diff = Math.floor((ts.setHours(0,0,0,0) - dataInicial.setHours(0,0,0,0)) / (24 * 60 * 60 * 1000));
                // recomputar clean dates
                const dayIndex = Math.floor((new Date(av.timestamp ? av.timestamp.toDate() : new Date(av.data)).setHours(0,0,0,0) - new Date(dataInicial).setHours(0,0,0,0)) / (24*60*60*1000));
                if (dayIndex >= 0 && dayIndex < 7) {
                    if (av.nivelEcologico === 'eficientes-energeticamente') buckets[dayIndex].ecologica++;
                    else if (av.nivelEcologico === 'pouco-eficientes-energeticamente') buckets[dayIndex].poucoEcologica++;
                    else buckets[dayIndex].naoEcologica++;
                }
            } else if (filtroAtual === 'mensal') {
                if (ts.getMonth() === dataInicial.getMonth() && ts.getFullYear() === dataInicial.getFullYear()) {
                    const idx = ts.getDate() - 1;
                    if (av.nivelEcologico === 'eficientes-energeticamente') buckets[idx].ecologica++;
                    else if (av.nivelEcologico === 'pouco-eficientes-energeticamente') buckets[idx].poucoEcologica++;
                    else buckets[idx].naoEcologica++;
                }
            } else {
                // total agrupado por mês (últimos 12 meses)
                const now = new Date();
                const monthsDiff = (now.getFullYear() - ts.getFullYear()) * 12 + (now.getMonth() - ts.getMonth());
                const idx = 11 - monthsDiff;
                if (idx >= 0 && idx < 12) {
                    if (av.nivelEcologico === 'eficientes-energeticamente') buckets[idx].ecologica++;
                    else if (av.nivelEcologico === 'pouco-eficientes-energeticamente') buckets[idx].poucoEcologica++;
                    else buckets[idx].naoEcologica++;
                }
            }
        });

        // Determinar classificação por bucket (maior contagem; empate -> pior)
        const pontos = buckets.map(b => {
            if (b.naoEcologica >= b.poucoEcologica && b.naoEcologica >= b.ecologica) return 0; // Ineficiente
            if (b.poucoEcologica >= b.ecologica) return 1; // Pouco eficiente
            return 2; // Eficiente
        });

        // Ajustar pontos: se o período NÃO foi alcançado -> null (não mostrar);
        // se foi alcançado e não há registos -> propagar o anterior; se primeiro e sem registos -> pior (0).
        for (let i = 0; i < buckets.length; i++) {
            const total = buckets[i].ecologica + buckets[i].poucoEcologica + buckets[i].naoEcologica;
            if (!reached[i]) {
                // período futuro: não mostrar
                pontos[i] = null;
            } else {
                if (total === 0) {
                    if (i > 0 && pontos[i - 1] !== null && pontos[i - 1] !== undefined) {
                        pontos[i] = pontos[i - 1];
                    // } else {
                    //     // Sem valor anterior válido: assumir o pior por omissão (ineficiente)
                    //     pontos[i] = 0;
                    }
                }
            }
        }

        // Mapear para labels de Y
        const yLabels = ['Ineficiente energeticamente', 'Pouco eficiente energeticamente', 'Eficiente energeticamente'];

        // Criar/atualizar gráfico
        const ctx = document.getElementById('chartEscola').getContext('2d');
        if (chartEscola) chartEscola.destroy();
        // Pontos de cor por classificação: 0 -> vermelho, 1 -> laranja, 2 -> verde
        const colorMap = ['#e74c3c', '#f39c12', '#27ae60'];
        const pointColors = pontos.map(p => colorMap[p] || '#95a5a6');

        chartEscola = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Classificação da Escola',
                    data: pontos,
                    borderColor: '#2c3e50',
                    backgroundColor: 'rgba(39,174,96,0.08)',
                    tension: 0.2,
                    fill: true,
                    pointRadius: 5,
                    pointBackgroundColor: pointColors,
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                scales: {
                    y: {
                        ticks: {
                            stepSize: 1,
                            callback: function(value) {
                                return yLabels[value] || value;
                            }
                        },
                        suggestedMin: 0,
                        suggestedMax: 2
                    }
                },
                plugins: {
                    legend: { position: 'top' },
                    title: { display: true, text: 'Desempenho da Escola' }
                }
            }
        });
    }

    // Criar gráficos para uma sala específica
    function criarGraficosSala(avaliacoes) {
        // Gráfico de nível ecológico ao longo do tempo para a sala
        const niveisEcologicos = {
            'eficientes-energeticamente': 0,
            'pouco-eficientes-energeticamente': 0,
            'nao-eficientes-energeticamente': 0
        };
        
        avaliacoes.forEach(av => {
            if (niveisEcologicos[av.nivelEcologico] !== undefined) {
                niveisEcologicos[av.nivelEcologico]++;
            }
        });

        // Gráfico de pizza com níveis ecológicos
        const ctxSalas = document.getElementById('chartSalas').getContext('2d');
        if (chartSalas) {
            chartSalas.destroy();
        }
        chartSalas = new Chart(ctxSalas, {
            type: 'doughnut',
            data: {
                labels: ['Eficiente energeticamente', 'Pouco eficiente energeticamente', 'Não eficiente energeticamente'],
                datasets: [{
                    data: [
                        niveisEcologicos['eficientes-energeticamente'],
                        niveisEcologicos['pouco-eficientes-energeticamente'],
                        niveisEcologicos['nao-eficientes-energeticamente']
                    ],
                    backgroundColor: ['#27ae60', '#f39c12', '#e74c3c']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    title: {
                        display: true,
                        text: `Avaliações da ${salaAtual}`
                    }
                }
            }
        });

        // Preparar dados por categoria para a sala
        const categorias = {
            luzes: { sim: 0, nao: 0 },
            luzNatural: { sim: 0, nao: 0 },
            computadores: { sim: 0, nao: 0 },
            projetor: { sim: 0, nao: 0 }
        };

        avaliacoes.forEach(av => {
            categorias.luzes[av.luzes ? 'sim' : 'nao']++;
            categorias.luzNatural[av.luzNatural ? 'sim' : 'nao']++;
            categorias.computadores[av.computadores ? 'sim' : 'nao']++;
            categorias.projetor[av.projetor ? 'sim' : 'nao']++;
        });

        const nomesCategorias = [
            'Luzes Desligadas',
            'Luz Natural',
            'Computadores Desligados',
            'Projetor Desligado'
        ];
        const simData = [
            categorias.luzes.sim,
            categorias.luzNatural.sim,
            categorias.computadores.sim,
            categorias.projetor.sim
        ];
        const naoData = [
            categorias.luzes.nao,
            categorias.luzNatural.nao,
            categorias.computadores.nao,
            categorias.projetor.nao
        ];

        // Gráfico de categorias
        const ctxCategorias = document.getElementById('chartCategorias').getContext('2d');
        if (chartCategorias) {
            chartCategorias.destroy();
        }
        chartCategorias = new Chart(ctxCategorias, {
            type: 'bar',
            data: {
                labels: nomesCategorias,
                datasets: [
                    {
                        label: 'Sim',
                        data: simData,
                        backgroundColor: '#27ae60',
                    },
                    {
                        label: 'Não',
                        data: naoData,
                        backgroundColor: '#e74c3c',
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                indexAxis: 'y',
                scales: {
                    x: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                },
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    title: {
                        display: false
                    }
                }
            }
        });
    }

    // Carregar dados inicialmente
    carregarDados();
});
