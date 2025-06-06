module.exports = ({ env }) => ({
  url: "http://127.0.0.1:1337",
  app: {
    keys: env.array("APP_KEYS"),
  },
});
