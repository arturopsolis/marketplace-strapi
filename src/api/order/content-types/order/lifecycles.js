const sendEmail = require("../../../../utils/sendEmail");

module.exports = {
  async afterCreate(event) {
    const { result, params } = event;
    const orderId = result.id;

    if (!orderId) {
      console.error("❌ No se obtuvo el ID del pedido");
      return;
    }

    const productItems = params.data.productItems || [];

    // 1. Crear y publicar cada order_item
    for (const item of productItems) {
      const product = await strapi.entityService.findOne(
        "api::product.product",
        item.product,
        {
          fields: ["price"],
        },
      );

      const createdItem = await strapi.entityService.create(
        "api::order-item.order-item",
        {
          data: {
            product: item.product,
            quantity: item.quantity,
            unitPrice: product.price,
            order: orderId,
          },
        },
      );

      // 🔁 Publicar manualmente el order_item
      await strapi.entityService.update(
        "api::order-item.order-item",
        createdItem.id,
        {
          data: {
            publishedAt: new Date(),
          },
        },
      );
    }

    // 2. Reconsultar orden con relaciones completas
    const fullOrder = await strapi.entityService.findOne(
      "api::order.order",
      orderId,
      {
        populate: {
          order_items: {
            populate: ["product"],
          },
          customer: true,
        },
      },
    );

    console.log("[DEBUG] order_items en fullOrder:", fullOrder.order_items);

    // 3. Generar tabla de productos
    const rows = (fullOrder.order_items || [])
      .map((item) => {
        const name = item.product?.name || "Producto";
        const quantity = item.quantity || 0;
        const price = item.unitPrice || 0;
        const subtotal = quantity * price;

        return `
          <tr>
            <td>${name}</td>
            <td style="text-align:center;">${quantity}</td>
            <td style="text-align:right;">$${price}</td>
            <td style="text-align:right;">$${subtotal}</td>
          </tr>
        `;
      })
      .join("");

    const html = `
      <h2>🧾 Pedido #${fullOrder.id}</h2>
      <p><strong>Cliente:</strong> ${fullOrder.customerName}</p>
      <p><strong>Email:</strong> ${fullOrder.customerEmail}</p>
      <p><strong>Teléfono:</strong> ${fullOrder.phoneNumber}</p>
      <br />
      <table width="100%" border="0" style="border-collapse: collapse; background-color: #f9f9f9;">
        <thead>
          <tr>
            <th style="text-align:left;">Producto</th>
            <th style="text-align:center;">Cantidad</th>
            <th style="text-align:right;">Precio</th>
            <th style="text-align:right;">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
          <tr>
            <td colspan="3" style="text-align:right;"><strong>Total:</strong></td>
            <td style="text-align:right;"><strong>$${fullOrder.total}</strong></td>
          </tr>
        </tbody>
      </table>
      <p style="margin-top:20px;">Gracias por tu compra 🙌</p>
    `;

    // 4. Enviar correo al cliente
    await sendEmail({
      to: fullOrder.customerEmail,
      subject: `🧾 Confirmación de pedido #${fullOrder.id}`,
      html,
    });

    console.log("\x1b[32m[EMAIL] ✅ Correo enviado correctamente\x1b[0m");
  },
};
