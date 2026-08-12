/**
 * byRaiMakes V3 Pre-Alpha - Cloud Functions
 * Projeto: raimake-v3-local
 *
 * getPublicProducts: endpoint HTTP público que retorna o catálogo ativo.
 * Contorna o bloqueio de cookies/terceiros do WebView do Instagram (e Safari ITP),
 * onde o cliente Angular/Firebase Auth falha ao ler o Firestore.
 * Usa firebase-admin (server-side, sem auth do usuário).
 */

const functions = require("firebase-functions");
const admin = require("firebase-admin");

// Inicializa uma única vez (lazy) — evita timeout no load do deploy
admin.initializeApp();

const db = admin.firestore();

function setCors(res) {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type");
  res.set("Cache-Control", "public, max-age=60");
}

exports.getPublicProducts = functions.https.onRequest(async (req, res) => {
  if (req.method === "OPTIONS") {
    setCors(res);
    res.status(204).send("");
    return;
  }
  setCors(res);
  try {
    const snapshot = await db
      .collection("produtos")
      .where("ativo", "==", true)
      .orderBy("createdAt", "desc")
      .get();
    const produtos = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        nome: data.nome || "",
        preco: data.preco || 0,
        imagem: data.imagem || data.img || "",
        categoria: data.categoria || "",
        descricao: data.descricao || "",
        estoque: typeof data.estoque === "number" ? data.estoque : 0,
        destaque: !!data.destaque,
      };
    });
    res.status(200).json({ produtos });
  } catch (err) {
    functions.logger.error("getPublicProducts erro", err);
    res.status(500).json({ error: "Erro ao carregar produtos" });
  }
});

exports.health = functions.https.onRequest((req, res) => {
  setCors(res);
  res.status(200).json({ status: "ok" });
});
