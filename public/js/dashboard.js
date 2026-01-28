// Lógica do dashboard
document.addEventListener('DOMContentLoaded', function() {
    const filterBtns = document.querySelectorAll('.filter-btn');
    const salaFilterSelect = document.getElementById('salaFilter');
    const loadingDiv = document.getElementById('loading');
    let filtroAtual = 'diario';
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

            // Preencher select de salas se vazio
            if (salaFilterSelect.children.length <= 1) {
                preencherSelectSalas(todasAvaliacoes);
            }

            // Filtrar por sala se selecionada
            const avaliacoesFiltradas = salaAtual 
                ? todasAvaliacoes.filter(av => av.sala === salaAtual)
                : todasAvaliacoes;

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
    function preencherSelectSalas(avaliacoes) {
        const salas = [...new Set(avaliacoes.map(av => av.sala))].sort();
        
        salas.forEach(sala => {
            const option = document.createElement('option');
            option.value = sala;
            option.textContent = sala;
            salaFilterSelect.appendChild(option);
        });
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
        document.getElementById('salasEcologicas').textContent = salasPorNivel['ecologica'] || 0;
        document.getElementById('salasPoucoEcologicas').textContent = salasPorNivel['pouco-ecologica'] || 0;
        document.getElementById('salasNaoEcologicas').textContent = salasPorNivel['nao-ecologica'] || 0;
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
            if (av.nivelEcologico === 'ecologica') {
                dadosPorSala[av.sala].ecologica++;
            } else if (av.nivelEcologico === 'pouco-ecologica') {
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
                        label: 'Ecológica',
                        data: ecologicas,
                        backgroundColor: '#27ae60',
                    },
                    {
                        label: 'Pouco Ecológica',
                        data: poucoEcologicas,
                        backgroundColor: '#f39c12',
                    },
                    {
                        label: 'Não Ecológica',
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
        const niveisEcologicos = { ecologica: 0, poucoEcologica: 0, naoEcologica: 0 };
        
        avaliacoes.forEach(av => {
            niveisEcologicos[av.nivelEcologico]++;
        });

        // Gráfico de pizza com níveis ecológicos
        const ctxSalas = document.getElementById('chartSalas').getContext('2d');
        if (chartSalas) {
            chartSalas.destroy();
        }
        chartSalas = new Chart(ctxSalas, {
            type: 'doughnut',
            data: {
                labels: ['Ecológica', 'Pouco Ecológica', 'Não Ecológica'],
                datasets: [{
                    data: [
                        niveisEcologicos.ecologica,
                        niveisEcologicos.poucoEcologica,
                        niveisEcologicos.naoEcologica
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
