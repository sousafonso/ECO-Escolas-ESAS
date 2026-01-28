// Configuração do Firebase
// IMPORTANTE: Substitua estas credenciais pelas suas próprias do Firebase Console
const firebaseConfig = {
    apiKey: "AIzaSyCsKMUIRnSnSzaKd0hd-pZ9BPKmEONewC4",
    authDomain: "eco-escolas-esas.firebaseapp.com",
    projectId: "eco-escolas-esas",
    storageBucket: "eco-escolas-esas.firebasestorage.app",
    messagingSenderId: "980788232245",
    appId: "1:980788232245:web:b0a2a3ac2cf7c757fe317c"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);

// Inicializar Firestore
const db = firebase.firestore();

// Referência para a coleção de avaliações
const avaliacoesRef = db.collection('avaliacoes');

// Testar ligação ao Firebase
console.log("Firebase config:", firebaseConfig);
console.log("Firestore ref:", avaliacoesRef);

// Tentar ler documentos
avaliacoesRef.limit(1).get()
  .then(snapshot => {
    console.log("✅ Conexão bem-sucedida!");
    console.log("Total de avaliações:", snapshot.size);
    snapshot.forEach(doc => {
      console.log("Exemplo de documento:", doc.data());
    });
  })
  .catch(error => {
    console.error("❌ Erro na conexão:", error);
  });


