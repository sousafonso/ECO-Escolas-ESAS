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

        // Preparar dados para enviar
        const avaliacao = {
            sala: sala,
            escola: escola,
            luzes: luzes_ligadas === 'sim',
            luzNatural: luzNatural === 'sim',
            computadores: computadores === 'sim',
            projetor: projetor === 'sim',
            nivelEcologico: nivelEcologico,
            numNao: numNao,
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
            mostrarMensagem('Erro ao enviar avaliação. Por favor, tente novamente.', 'erro');
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
