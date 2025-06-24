// path: src/api/order/content-types/order/lifecycles.js
const sendEmail = require("../../../../utils/sendEmail");

module.exports = {
  async afterCreate(event) {
    const {
      result,
      params: { data: requestData },
    } = event;
    const orderId = result.id;

    if (!orderId) {
      console.error("❌ No se obtuvo el ID del pedido");
      return;
    }

    // 1) Crear cada order-item y al mismo tiempo generar las filas para el correo
    const items = Array.isArray(requestData.productItems)
      ? requestData.productItems
      : [];
    const rows = [];

    for (const item of items) {
      try {
        // Traemos nombre y precio del producto
        const product = await strapi.entityService.findOne(
          "api::product.product",
          item.product,
          { fields: ["name", "price"] },
        );
        if (!product) {
          console.warn(`⚠️ Producto no encontrado: ID ${item.product}`);
          continue;
        }

        // Creamos el order-item
        await strapi.entityService.create("api::order-item.order-item", {
          data: {
            order: orderId,
            product: item.product,
            quantity: item.quantity,
            unitPrice: product.price,
            publishedAt: new Date(),
          },
        });

        // Generamos la fila HTML
        const subtotal = item.quantity * product.price;
        rows.push(`
          <tr>
            <td>${product.name}</td>
            <td style="text-align:center;">${item.quantity}</td>
            <td style="text-align:right;">$${product.price.toFixed(2)}</td>
            <td style="text-align:right;">$${subtotal.toFixed(2)}</td>
          </tr>
        `);
      } catch (error) {
        console.error(`❌ Error procesando producto ${item.product}:`, error);
      }
    }

    // 2) Traer datos básicos de la orden
    let orderData;
    try {
      orderData = await strapi.entityService.findOne(
        "api::order.order",
        orderId,
        {
          fields: ["customerName", "customerEmail", "phoneNumber", "total"],
        },
      );
    } catch (error) {
      console.error("❌ Error al recuperar datos de la orden:", error);
      return;
    }

    // 3) Construir el HTML del correo
    const html = `
      <h2>🧾 Pedido #${orderId}</h2>
      <p><strong>Cliente:</strong> ${orderData.customerName}</p>
      <p><strong>Email:</strong> ${orderData.customerEmail}</p>
      <p><strong>Teléfono:</strong> ${orderData.phoneNumber}</p>
      <br/>
      <table width="100%" border="0" style="border-collapse: collapse; background-color:#f9f9f9;">
        <thead>
          <tr>
            <th style="text-align:left;">Producto</th>
            <th style="text-align:center;">Cantidad</th>
            <th style="text-align:right;">Precio</th>
            <th style="text-align:right;">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          ${rows.join("")}
          <tr>
            <td colspan="3" style="text-align:right;"><strong>Total:</strong></td>
            <td style="text-align:right;"><strong>$${(
              orderData.total || 0
            ).toFixed(2)}</strong></td>
          </tr>
        </tbody>
      </table>
      <p style="margin-top:20px;">Gracias por tu compra 🙌</p>
    `;

    // 4) Enviar el correo
    try {
      await sendEmail({
        to: orderData.customerEmail,
        subject: `🧾 Confirmación de pedido #${orderId}`,
        html,
      });
      strapi.log.info(`[EMAIL] Correo enviado a ${orderData.customerEmail}`);
    } catch (error) {
      console.error("❌ Error enviando el correo:", error);
    }
  },
};
