"use strict";

module.exports = async ({ to, subject, html }) => {
  await strapi.plugins["email"].services.email.send({
    to,
    subject,
    html,
  });
};
