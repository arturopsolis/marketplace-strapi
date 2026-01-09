// path: src/api/order/content-types/order/lifecycles.js

const { Resend } = require("resend");

module.exports = {
  async afterCreate(event) {
    // Función para formatear dinero con comas
    function formatMoney(num) {
      if (typeof num === "number") {
        return "$" + num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
      }
      return "$0.00";
    }

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

        // Generamos la fila HTML con estilo Corazolana
        const subtotal = item.quantity * product.price;
        rows.push(`
          <tr>
            <td style="text-align:left; border-top: 1px solid #dee2e6; padding: 8px;">
              ${product.name}
            </td>
            <td style="text-align:center; border-top: 1px solid #dee2e6; padding: 8px;">
              ${item.quantity}
            </td>
            <td style="text-align:right; border-top: 1px solid #dee2e6; padding: 8px;">
              ${formatMoney(product.price)}
            </td>
            <td style="text-align:right; border-top: 1px solid #dee2e6; padding: 8px;">
              ${formatMoney(subtotal)}
            </td>
          </tr>
        `);
      } catch (error) {
        console.error(`❌ Error procesando producto ${item.product}:`, error);
      }
    }

    // 2) Traer datos completos de la orden
    let orderData;
    try {
      orderData = await strapi.entityService.findOne(
        "api::order.order",
        orderId,
        {
          fields: [
            "customerName",
            "customerEmail",
            "phoneNumber",
            "address",
            "state",
            "zipCode",
            "total",
          ],
        },
      );
    } catch (error) {
      console.error("❌ Error al recuperar datos de la orden:", error);
      return;
    }

    // 3) Construir tabla HTML
    const tableStr = `
      <table border="0" style="border-collapse: collapse; border: 1px solid #dee2e6; margin: 30px auto; text-align: left;">
        <tr>
          <th style="text-align:left; padding:8px">Producto</th>
          <th style="text-align:center; padding:8px">Cantidad</th>
          <th style="text-align:right; padding:8px">Precio</th>
          <th style="text-align:right; padding:8px">Subtotal</th>
        </tr>
        ${rows.join("")}
      </table>
    `;

    // 4) Template HTML estilo Corazolana con logo de KnitBoxing
    const htmlTemplate = `
      <img
        src="http://corazolana.com/media/images/knitboxing-logo.png"
        style="
          display: block;
          position: relative;
          width: 150px;
          margin: 30px auto;
          text-transform: upper;
        "
      />
      <p style="
        font-size: 22px;
        display: block;
        width: 100%;
        max-width: 600px;
        margin: 15px auto;
        text-align: center;
        margin-bottom: 30px;
      ">
        <strong>¡Hola ${orderData.customerName}!</strong>
      </p>

      <p style="
        font-size: 16px;
        display: block;
        width: 100%;
        max-width: 600px;
        margin: 15px auto;
        text-align: left;
        margin-bottom: 30px;
      ">
        Pronto nos pondremos en contacto contigo por WhatsApp para
        confirmar tu pedido.
        <strong>Agradecemos mucho tu preferencia.</strong>
        <br /><br />
        Estado: ${orderData.state || "No especificado"}
        <br />
        Teléfono: ${orderData.phoneNumber}<br />
        Email: ${orderData.customerEmail}<br />
        Dirección: ${orderData.address || "No especificada"}<br />
        C.P.: ${orderData.zipCode || "No especificado"}<br />
      </p>
      ${tableStr}
      <p style="text-align: center; font-size: 20px">
        <strong>TOTAL: ${formatMoney(orderData.total)}</strong>
      </p>
      <p style="
        font-size: 16px;
        display: block;
        width: 100%;
        max-width: 600px;
        margin: 15px auto;
        text-align: center;
        margin-bottom: 30px;
      ">
        (Pedido sujeto a existencias) <br />
        Te mandamos un gran abrazo 💜
      </p>
    `;

    // 5) Enviar el correo con Resend
    try {
      // Inicializar Resend con la API key
      const resend = new Resend(process.env.RESEND_API_KEY);

      // Enviar email usando Resend
      const { data, error } = await resend.emails.send({
        from: "no-reply@corazolana.com",
        to: ["knitboxing@corazolana.com"],
        cc: [orderData.customerEmail, "knitboxingmx@gmail.com"],
        subject: "Pedido de KnitBoxing",
        html: htmlTemplate,
      });

      if (error) {
        console.log("\x1b[31m ERROR: email delivery failed! \x1b[0m");
        console.error("❌ Error enviando el correo con Resend:", error);
      } else {
        console.log(
          "\x1b[32m SUCCESS: Email enviado a knitboxing@corazolana.com y cliente! \x1b[0m",
        );
        console.log("Email ID:", data.id);
        strapi.log.info(`[EMAIL] Correo enviado a ${orderData.customerEmail}`);
      }
    } catch (error) {
      console.log("\x1b[31m ERROR: email delivery failed! \x1b[0m");
      console.error("❌ Excepción al enviar el correo:", error);
    }
  },
};
