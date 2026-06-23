// ============================================================
// POKIE CAT — Punto de entrada para AWS Lambda
// Envuelve la app Express (app.js) con serverless-http para que API Gateway
// (integración proxy) la invoque como una Lambda. Es el handler que despliega
// Ansible en las 4 Lambdas síncronas (auth, catalogo, pedidos, gastos).
// Handler configurado en Terraform: "lambda.handler".
// ============================================================
const serverless = require("serverless-http");
const app = require("./app");

module.exports.handler = serverless(app);
