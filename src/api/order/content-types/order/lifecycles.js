const sendEmail = require("../../../../utils/sendEmail");

module.exports = {
  async afterCreate(event) {
    const { result } = event;

    const customerId = result.customer?.id || result.customer;

    if (!customerId) {
      console.log("❌ No se encontró customerId en result:", result.customer);
      return;
    }

    const customer = await strapi.entityService.findOne(
      "api::customer.customer",
      customerId,
      {
        fields: ["email", "name"],
      },
    );

    if (!customer?.email) return;

    const subject = "Gracias por tu pedido 🛒";
    const html = `
      <p>Hola ${customer.name || "cliente"},</p>
      <p>Recibimos tu pedido y lo estamos procesando.</p>
      <p><strong>Total:</strong> $${result.total}</p>
    `;

    await strapi.plugins["email"].services.email.send({
      to: customer.email,
      from: "no-reply@corazolana.com",
      subject,
      html,
    });
  },
};
