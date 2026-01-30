// Lógica do dashboard
document.addEventListener('DOMContentLoaded', function() {
    const filterBtns = document.querySelectorAll('.filter-btn');
    const escolaFilterSelect = document.getElementById('escolaFilter');
    const salaFilterSelect = document.getElementById('salaFilter');
    const loadingDiv = document.getElementById('loading');
    let filtroAtual = 'diario';
    let escolaAtual = '';
    let salaAtual = '';
    let chartSalas, chartCategorias;
    let todasAvaliacoes = [];

    // Event listeners para filtros de período
    filterBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            filterBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            filtroAtual = this.dataset.filter;
            carregarDados();
        });
    });

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
                agora.setMonth(agora.getMonth() - 1);
                return agora;
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

            // Filtrar por escola e sala se selecionadas
            let avaliacoesFiltradas = todasAvaliacoes;
            
            if (escolaAtual) {
                avaliacoesFiltradas = avaliacoesFiltradas.filter(av => av.escola === escolaAtual);
            }
            
            if (salaAtual) {
                avaliacoesFiltradas = avaliacoesFiltradas.filter(av => av.sala === salaAtual);
            }

            // Processar e exibir dados
            processarEstatisticas(avaliacoesFiltradas);
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
