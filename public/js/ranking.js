// Lógica do ranking
document.addEventListener('DOMContentLoaded', function() {
    const filterBtns = document.querySelectorAll('.filter-btn');
    const escolaFilterSelect = document.getElementById('escolaFilter');
    const mesFilterGroup = document.getElementById('mesFilterGroup');
    const mesFilterSelect = document.getElementById('mesFilter');
    const rankingContainer = document.getElementById('rankingContainer');
    const loadingDiv = document.getElementById('loading');
    let filtroAtual = 'diario';
    let escolaAtual = '';
    let mesAtual = new Date().getMonth();

    // Event listeners para filtros
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
            
            carregarRanking();
        });
    });

    // Event listener para filtro de mês
    mesFilterSelect.addEventListener('change', function() {
        mesAtual = parseInt(this.value);
        carregarRanking();
    });

    // Definir mês atual no select de mês
    mesFilterSelect.value = mesAtual;

    // Event listener para filtro de escola
    escolaFilterSelect.addEventListener('change', function() {
        escolaAtual = this.value;
        carregarRanking();
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
                return new Date(2020, 0, 1);
            default:
                return agora;
        }
    }

    // Carregar ranking
    async function carregarRanking() {
        loadingDiv.style.display = 'block';
        rankingContainer.innerHTML = '';

        try {
            const dataInicial = getDataInicial(filtroAtual);
            
            // Query com filtro de data
            const snapshot = await avaliacoesRef
                .where('timestamp', '>=', dataInicial)
                .get();

            const avaliacoes = [];
            snapshot.forEach(doc => {
                avaliacoes.push(doc.data());
            });

            // Filtrar por escola se selecionada
            const avaliacoesFiltradas = escolaAtual 
                ? avaliacoes.filter(av => av.escola === escolaAtual)
                : avaliacoes;

            // Calcular pontuação por sala
            const salasPontuacao = {};

            avaliacoesFiltradas.forEach(av => {
                if (!salasPontuacao[av.sala]) {
                    salasPontuacao[av.sala] = {
                        nome: av.sala,
                        pontos: 0,
                        totalAvaliacoes: 0,
                        ecologicas: 0,
                        poucoEcologicas: 0,
                        naoEcologicas: 0,
                        ultimoNivel: null,
                        ultimoTimestamp: null
                    };
                }

                salasPontuacao[av.sala].totalAvaliacoes++;

                const timestamp = av.timestamp ? av.timestamp.toDate() : new Date(av.data);
                if (!salasPontuacao[av.sala].ultimoTimestamp || timestamp > salasPontuacao[av.sala].ultimoTimestamp) {
                    salasPontuacao[av.sala].ultimoTimestamp = timestamp;
                    salasPontuacao[av.sala].ultimoNivel = av.nivelEcologico;
                }

                // Sistema de pontuação:
                // Energética: 3 pontos
                // Pouco eficiente energeticamente: 1 ponto
                // Não eficiente energeticamente: 0 pontos
                if (av.nivelEcologico === 'eficientes-energeticamente') {
                    salasPontuacao[av.sala].pontos += 3;
                    salasPontuacao[av.sala].ecologicas++;
                } else if (av.nivelEcologico === 'pouco-eficientes-energeticamente') {
                    salasPontuacao[av.sala].pontos += 1;
                    salasPontuacao[av.sala].poucoEcologicas++;
                } else {
                    salasPontuacao[av.sala].naoEcologicas++;
                }
            });

            // Converter para array e ordenar
            const ranking = Object.values(salasPontuacao)
                .sort((a, b) => b.pontos - a.pontos);

            // Exibir ranking
            if (ranking.length === 0) {
                rankingContainer.innerHTML = '<p style="text-align: center; padding: 40px; color: #7f8c8d;">Nenhuma avaliação encontrada para este período.</p>';
            } else {
                exibirRanking(ranking);
            }

        } catch (error) {
            console.error('Erro ao carregar ranking:', error);
            rankingContainer.innerHTML = '<p style="text-align: center; padding: 40px; color: #e74c3c;">Erro ao carregar ranking. Verifique a configuração do Firebase.</p>';
        } finally {
            loadingDiv.style.display = 'none';
        }
    }

    // Exibir ranking
    function exibirRanking(ranking) {
        rankingContainer.innerHTML = '';

        ranking.forEach((sala, index) => {
            const posicao = index + 1;
            const media = (sala.pontos / sala.totalAvaliacoes).toFixed(1);
            
            // Determinar classificação geral
            let classificacao = 'nao-ecologica';
            let classificacaoTexto = 'Ineficientes energeticamente';

            if (sala.ultimoNivel === 'eficientes-energeticamente') {
                classificacao = 'ecologica';
                classificacaoTexto = 'Eficiente energeticamente';
            } else if (sala.ultimoNivel === 'pouco-eficientes-energeticamente') {
                classificacao = 'pouco-ecologica';
                classificacaoTexto = 'Pouco eficiente energeticamente';
            }

            const itemDiv = document.createElement('div');
            itemDiv.className = `ranking-item ${posicao <= 3 ? `top-${posicao}` : ''}`;
            
            let medalEmoji = '';
            if (posicao === 1) medalEmoji = '🥇';
            else if (posicao === 2) medalEmoji = '🥈';
            else if (posicao === 3) medalEmoji = '🥉';

            itemDiv.innerHTML = `
                <div class="ranking-position">${medalEmoji} ${posicao}º</div>
                <div class="ranking-info">
                    <div class="ranking-sala">${sala.nome}</div>
                    <div class="ranking-details">
                        ${sala.totalAvaliacoes} avaliações • 
                        ${sala.ecologicas} Eficientes energeticamente, 
                        ${sala.poucoEcologicas} Pouco eficientes energeticamente, 
                        ${sala.naoEcologicas} Ineficientes energeticamente
                    </div>
                </div>
                <div class="ranking-badge ${classificacao}">
                    ${classificacaoTexto}
                </div>
                <div class="ranking-score">${sala.pontos} pts</div>
            `;

            rankingContainer.appendChild(itemDiv);
        });
    }

    // Carregar ranking inicialmente
    carregarRanking();
});
