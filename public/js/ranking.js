// Lógica do ranking
document.addEventListener('DOMContentLoaded', function() {
    const filterBtns = document.querySelectorAll('.filter-btn');
    const tipoRankingBtns = document.querySelectorAll('.tipo-ranking-btn');
    const escolaFilterSelect = document.getElementById('escolaFilter');
    const mesFilterGroup = document.getElementById('mesFilterGroup');
    const mesFilterSelect = document.getElementById('mesFilter');
    const rankingContainer = document.getElementById('rankingContainer');
    const loadingDiv = document.getElementById('loading');
    let filtroAtual = 'diario';
    let tipoRankingAtual = 'energetico';
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

    // Event listeners para tipo de ranking
    tipoRankingBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            tipoRankingBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            tipoRankingAtual = this.dataset.tipo;
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

    function calcularNivelResidual(avaliacao) {
        if (avaliacao.nivelResidual) {
            return avaliacao.nivelResidual;
        }

        const camposResiduos = ['residuoPapel', 'residuoVidro', 'residuoPlastico', 'residuoOrganico'];
        const temTodosCampos = camposResiduos.every(campo => typeof avaliacao[campo] === 'boolean');

        if (!temTodosCampos) {
            return null;
        }

        const numNaoResiduos = camposResiduos.filter(campo => avaliacao[campo] === false).length;

        if (numNaoResiduos === 0) return 'residuos-separados-corretamente';
        if (numNaoResiduos <= 2) return 'residuos-parcialmente-separados';
        return 'residuos-nao-separados-corretamente';
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
                        pontosEnergia: 0,
                        totalAvaliacoesEnergia: 0,
                        ecologicas: 0,
                        poucoEcologicas: 0,
                        naoEcologicas: 0,
                        pontosResidual: 0,
                        totalAvaliacoesResidual: 0,
                        residuosCorretos: 0,
                        residuosParciais: 0,
                        residuosIncorretos: 0,
                        ultimoNivelEnergetico: null,
                        ultimoNivelResidual: null,
                        ultimoTimestamp: null
                    };
                }

                salasPontuacao[av.sala].totalAvaliacoesEnergia++;

                const timestamp = av.timestamp ? av.timestamp.toDate() : new Date(av.data);
                if (!salasPontuacao[av.sala].ultimoTimestamp || timestamp > salasPontuacao[av.sala].ultimoTimestamp) {
                    salasPontuacao[av.sala].ultimoTimestamp = timestamp;
                    salasPontuacao[av.sala].ultimoNivelEnergetico = av.nivelEcologico;
                }

                // Sistema de pontuação:
                // Energética: 3 pontos
                // Pouco eficiente energeticamente: 1 ponto
                // Não eficiente energeticamente: 0 pontos
                if (av.nivelEcologico === 'eficientes-energeticamente') {
                    salasPontuacao[av.sala].pontosEnergia += 3;
                    salasPontuacao[av.sala].ecologicas++;
                } else if (av.nivelEcologico === 'pouco-eficientes-energeticamente') {
                    salasPontuacao[av.sala].pontosEnergia += 1;
                    salasPontuacao[av.sala].poucoEcologicas++;
                } else {
                    salasPontuacao[av.sala].naoEcologicas++;
                }

                // Sistema de pontuação residual:
                // Resíduos separados corretamente: 3 pontos
                // Resíduos parcialmente separados: 1 ponto
                // Resíduos não separados corretamente: 0 pontos
                const nivelResidual = calcularNivelResidual(av);
                if (nivelResidual) {
                    salasPontuacao[av.sala].totalAvaliacoesResidual++;

                    if (timestamp >= salasPontuacao[av.sala].ultimoTimestamp) {
                        salasPontuacao[av.sala].ultimoNivelResidual = nivelResidual;
                    }

                    if (nivelResidual === 'residuos-separados-corretamente') {
                        salasPontuacao[av.sala].pontosResidual += 3;
                        salasPontuacao[av.sala].residuosCorretos++;
                    } else if (nivelResidual === 'residuos-parcialmente-separados') {
                        salasPontuacao[av.sala].pontosResidual += 1;
                        salasPontuacao[av.sala].residuosParciais++;
                    } else {
                        salasPontuacao[av.sala].residuosIncorretos++;
                    }
                }
            });

            // Converter para array e ordenar
            let ranking = Object.values(salasPontuacao);

            if (tipoRankingAtual === 'residual') {
                ranking = ranking.filter(sala => sala.totalAvaliacoesResidual > 0)
                    .sort((a, b) => b.pontosResidual - a.pontosResidual);
            } else {
                ranking = ranking.sort((a, b) => b.pontosEnergia - a.pontosEnergia);
            }

            // Exibir ranking
            if (ranking.length === 0) {
                rankingContainer.innerHTML = '<p style="text-align: center; padding: 40px; color: #7f8c8d;">Nenhuma avaliação encontrada para este período.</p>';
            } else {
                exibirRanking(ranking, tipoRankingAtual);
            }

        } catch (error) {
            console.error('Erro ao carregar ranking:', error);
            rankingContainer.innerHTML = '<p style="text-align: center; padding: 40px; color: #e74c3c;">Erro ao carregar ranking. Verifique a configuração do Firebase.</p>';
        } finally {
            loadingDiv.style.display = 'none';
        }
    }

    // Exibir ranking
    function exibirRanking(ranking, tipoRanking) {
        rankingContainer.innerHTML = '';

        ranking.forEach((sala, index) => {
            const posicao = index + 1;
            
            let classificacao = 'nao-ecologica';
            let classificacaoTexto = '';
            let detalhes = '';
            let score = 0;

            if (tipoRanking === 'residual') {
                // Regras: escolher a categoria com maior número de registos;
                // em caso de empate, escolher a pior (incorretos > parciais > corretos)
                if (sala.residuosIncorretos >= sala.residuosParciais && sala.residuosIncorretos >= sala.residuosCorretos) {
                    classificacao = 'nao-ecologica';
                    classificacaoTexto = 'Resíduos mal separados';
                } else if (sala.residuosParciais >= sala.residuosCorretos) {
                    classificacao = 'pouco-ecologica';
                    classificacaoTexto = 'Separação residual parcial';
                } else {
                    classificacao = 'ecologica';
                    classificacaoTexto = 'Resíduos bem separados';
                }

                detalhes = `${sala.totalAvaliacoesResidual} avaliações residuais • ${sala.residuosCorretos} Separados corretamente, ${sala.residuosParciais} Separados parcialmente, ${sala.residuosIncorretos} Separados incorretamente`;
                score = sala.pontosResidual;
            } else {
                // Regras: escolher a categoria com maior número de registos;
                // em caso de empate, escolher a pior (naoEcologicas > poucoEcologicas > ecologicas)
                if (sala.naoEcologicas >= sala.poucoEcologicas && sala.naoEcologicas >= sala.ecologicas) {
                    classificacao = 'nao-ecologica';
                    classificacaoTexto = 'Ineficiente energeticamente';
                } else if (sala.poucoEcologicas >= sala.ecologicas) {
                    classificacao = 'pouco-ecologica';
                    classificacaoTexto = 'Pouco eficiente energeticamente';
                } else {
                    classificacao = 'ecologica';
                    classificacaoTexto = 'Eficiente energeticamente';
                }

                detalhes = `${sala.totalAvaliacoesEnergia} avaliações • ${sala.ecologicas} Eficientes energeticamente, ${sala.poucoEcologicas} Pouco eficientes energeticamente, ${sala.naoEcologicas} Ineficientes energeticamente`;
                score = sala.pontosEnergia;
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
                        ${detalhes}
                    </div>
                </div>
                <div class="ranking-badge ${classificacao}">
                    ${classificacaoTexto}
                </div>
                <div class="ranking-score">${score} pts</div>
            `;

            rankingContainer.appendChild(itemDiv);
        });
    }

    // Carregar ranking inicialmente
    carregarRanking();
});
