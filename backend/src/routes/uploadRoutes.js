import { createHash, randomUUID } from 'node:crypto';
import { Router } from 'express';
import { getCloudinaryConfig, ITEM_IMAGE_UPLOAD } from '../config/uploads.js';
import { itemImageRateLimiter } from '../middlewares/rateLimiters.js';
import { requireGameMaster } from '../middlewares/roleMiddleware.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// Assinatura do Cloudinary: os parametros em ordem alfabetica, no formato
// chave=valor separados por &, seguidos do segredo, em SHA-1.
export function signCloudinaryParams(params, apiSecret) {
  const payload = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&');

  return createHash('sha1').update(`${payload}${apiSecret}`).digest('hex');
}

export const uploadRoutes = Router();

uploadRoutes.use(requireGameMaster);

uploadRoutes.get('/config', (_req, res) => {
  res.json({ itemImages: Boolean(getCloudinaryConfig()), maxBytes: ITEM_IMAGE_UPLOAD.maxBytes });
});

// A assinatura cobre pasta, nome do arquivo (gerado aqui), formatos e a
// reducao para 800 px, e o Cloudinary recusa um envio que mude qualquer um
// deles. Com o nome fixo e overwrite=false, cada assinatura cria no maximo um
// arquivo, mesmo reenviada durante a hora em que vale. O limite de 5 MB e do
// formulario; no servidor do Cloudinary vale o teto do plano.
uploadRoutes.post(
  '/item-image',
  itemImageRateLimiter,
  asyncHandler(async (req, res) => {
    const config = getCloudinaryConfig();

    if (!config) {
      throw new ApiError(503, 'O envio de imagens não está configurado. Cole a URL da imagem.');
    }

    const params = {
      allowed_formats: ITEM_IMAGE_UPLOAD.allowedFormats,
      folder: `lojarpg/mesa-${req.campaign.id}`,
      overwrite: 'false',
      public_id: `item-${randomUUID()}`,
      timestamp: Math.floor(Date.now() / 1000),
      transformation: ITEM_IMAGE_UPLOAD.transformation
    };

    res.json({
      uploadUrl: `https://api.cloudinary.com/v1_1/${config.cloudName}/image/upload`,
      fields: { ...params, api_key: config.apiKey, signature: signCloudinaryParams(params, config.apiSecret) },
      maxBytes: ITEM_IMAGE_UPLOAD.maxBytes
    });
  })
);
