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
      try {
        const product = await strapi.entityService.findOne(
          "api::product.product",
          item.product,
          {
            fields: ["price", "name"],
          },
        );

        if (!product) {
          console.error(`⚠️ Producto no encontrado: ID ${item.product}`);
          continue;
        }

        await strapi.entityService.create("api::order-item.order-item", {
          data: {
            product: item.product,
            quantity: item.quantity,
            unitPrice: product.price,
            order: orderId,
            publishedAt: new Date(),
          },
        });
      } catch (error) {
        console.error(`❌ Error creando order_item: ${error.message}`);
      }
    }

    // 2. Reconsultar orden con relaciones completas
    try {
      // Primero obtenemos los order_items relacionados con esta orden
      const orderItems = await strapi.entityService.findMany(
        "api::order-item.order-item",
        {
          filters: { order: orderId },
          populate: {
            product: {
              fields: ["name", "price"],
            },
          },
        },
      );

      console.log(
        "[DEBUG] Order items con productos:",
        JSON.stringify(orderItems, null, 2),
      );

      // 3. Generar tabla de productos
      const rows = orderItems
        .map((item) => {
          if (!item.product) {
            console.warn(`⚠️ Producto no encontrado para item ${item.id}`);
            return "";
          }

          const name = item.product.name || "Producto";
          const quantity = item.quantity || 0;
          const price = item.unitPrice || item.product.price || 0;
          const subtotal = quantity * price;

          return `
            <tr>
              <td>${name}</td>
              <td style="text-align:center;">${quantity}</td>
              <td style="text-align:right;">$${price.toFixed(2)}</td>
              <td style="text-align:right;">$${subtotal.toFixed(2)}</td>
            </tr>
          `;
        })
        .join("");

      // Obtenemos los datos básicos de la orden
      const orderData = await strapi.entityService.findOne(
        "api::order.order",
        orderId,
        {
          fields: ["customerName", "customerEmail", "phoneNumber", "total"],
        },
      );

      const html = `
        <h2>🧾 Pedido #${orderId}</h2>
        <p><strong>Cliente:</strong> ${orderData.customerName}</p>
        <p><strong>Email:</strong> ${orderData.customerEmail}</p>
        <p><strong>Teléfono:</strong> ${orderData.phoneNumber}</p>
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
              <td style="text-align:right;"><strong>$${orderData.total?.toFixed(2) || "0.00"}</strong></td>
            </tr>
          </tbody>
        </table>
        <p style="margin-top:20px;">Gracias por tu compra 🙌</p>
      `;

      // 4. Enviar correo al cliente
      await sendEmail({
        to: orderData.customerEmail,
        subject: `🧾 Confirmación de pedido #${orderId}`,
        html,
      });

      console.log("\x1b[32m[EMAIL] ✅ Correo enviado correctamente\x1b[0m");
    } catch (error) {
      console.error(
        "\x1b[31m[ERROR] ❌ Error al procesar el pedido:\x1b[0m",
        error,
      );
    }
  },
};
