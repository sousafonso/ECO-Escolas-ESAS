// Lógica da página de avaliação
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('avaliacaoForm');
    const mensagemDiv = document.getElementById('mensagem');

    form.addEventListener('submit', async function(e) {
        e.preventDefault();

        // Coletar dados do formulário
        const escola = document.querySelector('input[name="escola"]:checked').value;
        const sala = document.getElementById('sala').value;
        const luzes_ligadas = document.querySelector('input[name="luzes_ligadas"]:checked').value;
        const luzNatural = document.querySelector('input[name="luzNatural"]:checked').value;
        const computadores = document.querySelector('input[name="computadores"]:checked').value;
        const projetor = document.querySelector('input[name="projetor"]:checked').value;
        const residuoPapel = document.querySelector('input[name="residuoPapel"]:checked').value;
        const residuoVidro = document.querySelector('input[name="residuoVidro"]:checked').value;
        const residuoPlastico = document.querySelector('input[name="residuoPlastico"]:checked').value;
        const residuoOrganico = document.querySelector('input[name="residuoOrganico"]:checked').value;

        // Calcular número de "não"
        const respostas = [luzes_ligadas, luzNatural, computadores, projetor];
        const numNao = respostas.filter(r => r === 'nao').length;

        // Determinar nível ecológico
        let nivelEcologico;
        if (numNao === 4) {
            nivelEcologico = 'nao-eficientes-energeticamente';
        } else if (numNao >= 2) {
            nivelEcologico = 'pouco-eficientes-energeticamente';
        } else {
            nivelEcologico = 'eficientes-energeticamente';
        }

        // Calcular nível de separação de resíduos
        const respostasResiduos = [residuoPapel, residuoVidro, residuoPlastico, residuoOrganico];
        const numNaoResiduos = respostasResiduos.filter(r => r === 'nao').length;

        let nivelResidual;
        if (numNaoResiduos === 0) {
            nivelResidual = 'residuos-separados-corretamente';
        } else if (numNaoResiduos <= 2) {
            nivelResidual = 'residuos-parcialmente-separados';
        } else {
            nivelResidual = 'residuos-nao-separados-corretamente';
        }

        // Preparar dados para enviar
        const avaliacao = {
            sala: sala,
            escola: escola,
            luzes: luzes_ligadas === 'sim',
            luzNatural: luzNatural === 'sim',
            computadores: computadores === 'sim',
            projetor: projetor === 'sim',
            residuoPapel: residuoPapel === 'sim',
            residuoVidro: residuoVidro === 'sim',
            residuoPlastico: residuoPlastico === 'sim',
            residuoOrganico: residuoOrganico === 'sim',
            nivelEcologico: nivelEcologico,
            numNao: numNao,
            nivelResidual: nivelResidual,
            numNaoResiduos: numNaoResiduos,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            data: new Date().toISOString()
        };

        try {
            // Salvar no Firestore
            await avaliacoesRef.add(avaliacao);

            // Mostrar mensagem de sucesso
            mostrarMensagem('Avaliação enviada com sucesso! Obrigado pela sua contribuição. 🌿', 'sucesso');

            // Resetar formulário
            form.reset();

            // Scroll para a mensagem
            mensagemDiv.scrollIntoView({ behavior: 'smooth' });

        } catch (error) {
            console.error('Erro ao salvar avaliação:', error);
            if (error && error.code === 'permission-denied') {
                mostrarMensagem('Sem permissões para gravar. Atualiza e publica as regras do Firestore (incluindo campos de resíduos) e tenta novamente.', 'erro');
            } else {
                mostrarMensagem('Erro ao enviar avaliação. Por favor, tente novamente.', 'erro');
            }
        }
    });

    function mostrarMensagem(texto, tipo) {
        mensagemDiv.textContent = texto;
        mensagemDiv.className = `mensagem ${tipo}`;
        mensagemDiv.style.display = 'block';

        // Ocultar mensagem após 5 segundos
        setTimeout(() => {
            mensagemDiv.style.display = 'none';
        }, 5000);
    }
});
