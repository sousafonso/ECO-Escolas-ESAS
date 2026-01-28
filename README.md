# 🌱 ECO Escolas ESAS - Sistema de Avaliação Ecológica

Sistema web para análise e monitorização da qualidade ecológica das salas da escola ESAS, desenvolvido para o programa ECO-Escolas.

## 📋 Funcionalidades

- ✅ **Formulário de Avaliação**: Alunos podem avaliar salas sem necessidade de login
- 📊 **Dashboard de Estatísticas**: Visualização de dados com gráficos interativos
- 🏆 **Ranking de Salas**: Classificação das salas mais sustentáveis
- 📱 **Design Responsivo**: Funciona perfeitamente em dispositivos móveis
- 💾 **Persistência de Dados**: Armazenamento centralizado com Firebase Firestore
- 🔍 **Filtros Temporais**: Análise por dia, semana, mês ou período total

## 🎯 Critérios de Avaliação

Cada sala é avaliada com base em 4 critérios:
1. Luzes desligadas quando a sala está vazia
2. Aproveitamento da luz natural (estores abertos)
3. Computadores desligados quando não estão a ser usados
4. Projetor desligado no fim da aula

### Classificação Ecológica

- **Ecológica**: 0-1 respostas "não" (3 pontos)
- **Pouco Ecológica**: 2-3 respostas "não" (1 ponto)
- **Não Ecológica**: 4 respostas "não" (0 pontos)

## 🚀 Configuração e Deploy

### Pré-requisitos

1. Conta no [Firebase](https://firebase.google.com/)
2. Conta no GitHub
3. Git instalado

### Passo 1: Configurar Firebase

1. Aceda ao [Firebase Console](https://console.firebase.google.com/)
2. Crie um novo projeto ou selecione um existente
3. Adicione uma aplicação web ao projeto:
   - Clique em "Adicionar app" > "Web" (ícone </> )
   - Dê um nome à aplicação (ex: "ECO-Escolas-ESAS")
   - **Não** é necessário configurar Firebase Hosting
   - Copie as credenciais de configuração

4. Configurar Firestore Database:
   - No menu lateral, vá a "Firestore Database"
   - Clique em "Criar base de dados"
   - Escolha "Iniciar em modo de produção"
   - Selecione a localização (ex: "europe-west1")
   - Aguarde a criação da base de dados

5. Configurar regras de segurança do Firestore:
   - No Firestore Database, vá ao separador "Regras"
   - Substitua as regras pelo seguinte código:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Permitir leitura pública das avaliações
    match /avaliacoes/{document=**} {
      allow read: if true;
      allow write: if true; // Pode adicionar validação adicional aqui se necessário
    }
  }
}
```

   - Clique em "Publicar"

### Passo 2: Configurar o Projeto

1. Clone este repositório:
```bash
git clone https://github.com/sousafonso/ECO-Escolas-ESAS.git
cd ECO-Escolas-ESAS
```

2. Edite o ficheiro `public/js/firebase-config.js`:
   - Substitua as credenciais de exemplo pelas suas credenciais do Firebase
   - As credenciais estão no Firebase Console > Configurações do Projeto > Suas aplicações

```javascript
const firebaseConfig = {
    apiKey: "SUA_API_KEY_AQUI",
    authDomain: "seu-projeto.firebaseapp.com",
    projectId: "seu-projeto-id",
    storageBucket: "seu-projeto.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abcdef123456"
};
```

3. Adicione as imagens da escola:
   - Coloque o logo ECO-Escolas em `public/images/eco-escolas.png`
   - Coloque o logo ESAS em `public/images/esas.jpg`

### Passo 3: Deploy no GitHub Pages

1. Faça commit das alterações:
```bash
git add .
git commit -m "Configurar Firebase e adicionar logos"
git push origin main
```

2. Ative o GitHub Pages:
   - Vá ao repositório no GitHub
   - Aceda a "Settings" > "Pages"
   - Em "Source", selecione "GitHub Actions"
   - O deploy será feito automaticamente através do workflow

3. Aguarde o deploy:
   - Vá ao separador "Actions" no GitHub
   - Aguarde até o workflow "Deploy to GitHub Pages" completar
   - O site estará disponível em: `https://sousafonso.github.io/ECO-Escolas-ESAS/`

## 📁 Estrutura do Projeto

```
ECO-Escolas-ESAS/
├── public/
│   ├── css/
│   │   └── style.css          # Estilos do site
│   ├── js/
│   │   ├── firebase-config.js # Configuração do Firebase
│   │   ├── avaliacao.js       # Lógica do formulário
│   │   ├── dashboard.js       # Lógica das estatísticas
│   │   └── ranking.js         # Lógica do ranking
│   ├── images/
│   │   ├── eco-escolas.png    # Logo ECO-Escolas
│   │   └── esas.jpg           # Logo ESAS
│   ├── index.html             # Página de avaliação
│   ├── dashboard.html         # Página de estatísticas
│   └── ranking.html           # Página de ranking
├── .github/
│   └── workflows/
│       └── deploy.yml         # Configuração do GitHub Actions
└── README.md
```

## 🔧 Tecnologias Utilizadas

- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Gráficos**: Chart.js
- **Base de Dados**: Firebase Firestore
- **Deploy**: GitHub Pages
- **CI/CD**: GitHub Actions

## 💡 Como Usar

### Para Alunos

1. Aceda ao site: `https://sousafonso.github.io/ECO-Escolas-ESAS/`
2. Selecione a sala que está a avaliar
3. Responda às 4 questões sobre práticas ecológicas
4. Clique em "Enviar Avaliação"

### Para Consultar Estatísticas

1. Clique em "Estatísticas" no menu
2. Use os filtros para ver dados por período (diário, semanal, mensal, total)
3. Analise os gráficos de desempenho por sala e categoria

### Para Ver o Ranking

1. Clique em "Ranking" no menu
2. Veja as salas ordenadas por pontuação
3. Use os filtros para diferentes períodos

## 🔒 Segurança e Privacidade

- ✅ Não é necessário login ou registo
- ✅ Não são recolhidos dados pessoais dos alunos
- ✅ As avaliações são anónimas
- ✅ Apenas dados das salas são armazenados
- ⚠️ As credenciais do Firebase são públicas (apenas para leitura/escrita de avaliações)

## 📊 Solução para Persistência de Dados

### Desafio
O GitHub Pages apenas suporta sites estáticos (HTML, CSS, JavaScript), sem backend ou base de dados.

## 📝 Licença

Este projeto está sob a licença MIT. Veja o ficheiro [LICENSE](LICENSE) para mais detalhes.

## 👨‍💻 Autor

Afonso Sousa - [GitHub](https://github.com/sousafonso)

## 🌍 Apoio

Este projeto faz parte da iniciativa ECO-Escolas, um programa internacional da Foundation for Environmental Education (FEE) que pretende encorajar ações e reconhecer o trabalho de qualidade desenvolvido pela escola, no âmbito da Educação Ambiental para a Sustentabilidade.

---

**Juntos por um futuro mais sustentável! 🌱**