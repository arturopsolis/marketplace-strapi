const sendEmail = require("../../../../utils/sendEmail");

module.exports = {
  async afterCreate(event) {
    console.log("[EMAIL] Lifecycle afterCreate disparado.");

    const subject = "Gracias por tu pedido 🛒";
    const html = `
      <p>Hola cliente,</p>
      <p>Recibimos tu pedido y lo estamos procesando.</p>
      <p><strong>Total:</strong> $${event.result.total}</p>
    `;

    try {
      await sendEmail({
        to: "pedidos@somnum.net",
        subject,
        html,
      });

      console.log(
        "\x1b[32m[EMAIL] SUCCESS: Correo enviado a arturo@somnum.net\x1b[0m",
      );
    } catch (err) {
      console.log("\x1b[31m[EMAIL] ERROR: Falló el envío del correo\x1b[0m");
      console.error(err.response?.body || err.message || err);
    }
  },
};
