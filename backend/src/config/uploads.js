// Upload de imagens dos itens direto do navegador para o Cloudinary. A API so
// assina o pedido (o segredo nunca sai daqui) e depois guarda a URL final em
// imageUrl, como uma URL colada. Sem CLOUDINARY_URL, o upload fica desligado e
// o formulario mostra so o campo de URL.
//
// CLOUDINARY_URL tem o formato do painel do Cloudinary:
//   cloudinary://<api_key>:<api_secret>@<cloud_name>
export function getCloudinaryConfig(value = process.env.CLOUDINARY_URL) {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);

    if (url.protocol !== 'cloudinary:' || !url.username || !url.password || !url.hostname) {
      return null;
    }

    return {
      cloudName: url.hostname,
      apiKey: decodeURIComponent(url.username),
      apiSecret: decodeURIComponent(url.password)
    };
  } catch (_error) {
    return null;
  }
}

// Limites do envio: tipos de imagem comuns, ate 5 MB no navegador, e o
// Cloudinary reduz a imagem para no maximo 800 x 800 antes de guardar.
export const ITEM_IMAGE_UPLOAD = {
  maxBytes: 5 * 1024 * 1024,
  allowedFormats: 'jpg,jpeg,png,webp,gif',
  transformation: 'c_limit,w_800,h_800'
};
