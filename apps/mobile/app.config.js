// Wraps app.json so the Mapbox native-SDK download token (a secret sk.* token)
// stays in .env instead of a committed file. Expo CLI loads apps/mobile/.env
// before evaluating this config.
module.exports = ({ config }) => {
  const downloadToken = process.env.RNMAPBOX_DOWNLOAD_TOKEN
  return {
    ...config,
    plugins: (config.plugins ?? []).map((plugin) =>
      plugin === '@rnmapbox/maps'
        ? ['@rnmapbox/maps', downloadToken ? { RNMapboxMapsDownloadToken: downloadToken } : {}]
        : plugin,
    ),
  }
}
