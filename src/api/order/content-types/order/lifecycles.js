const sendEmail = require("../../../utils/sendEmail");

module.exports = {
  async afterCreate(event) {
    const { result } = event;

    const customerEmail = result.customer?.email;
    if (!customerEmail) return;

    const subject = "Gracias por tu pedido 🛒";
    const html = `
      <p>Hola ${result.customer.name || "cliente"},</p>
      <p>Recibimos tu pedido y lo estamos procesando.</p>
      <p><strong>Total:</strong> $${result.total}</p>
    `;

    await sendEmail({ to: customerEmail, subject, html });
  },
};
