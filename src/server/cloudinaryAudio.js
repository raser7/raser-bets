import crypto from 'node:crypto';

function getCloudinaryConfig() {
  return {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
  };
}

function assertCloudinaryConfig() {
  const { cloudName, apiKey, apiSecret } = getCloudinaryConfig();

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error('Faltan variables de Cloudinary.');
  }
}

function signParams(params) {
  const { apiSecret } = getCloudinaryConfig();
  const serialized = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('&');

  return crypto
    .createHash('sha1')
    .update(`${serialized}${apiSecret}`)
    .digest('hex');
}

export async function uploadAudioToCloudinary(buffer, publicId) {
  assertCloudinaryConfig();
  const { cloudName, apiKey } = getCloudinaryConfig();

  const timestamp = Math.floor(Date.now() / 1000);
  const paramsToSign = {
    overwrite: 'true',
    public_id: publicId,
    timestamp: String(timestamp),
  };

  const signature = signParams(paramsToSign);
  const formData = new FormData();

  formData.append('file', new Blob([buffer], { type: 'audio/wav' }), `${publicId}.wav`);
  formData.append('api_key', apiKey);
  formData.append('timestamp', String(timestamp));
  formData.append('public_id', publicId);
  formData.append('overwrite', 'true');
  formData.append('signature', signature);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/video/upload`,
    {
      method: 'POST',
      body: formData,
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error?.message || 'Cloudinary no pudo guardar el audio.');
  }

  return {
    publicId: data.public_id,
    secureUrl: data.secure_url,
  };
}

export async function deleteAudioFromCloudinary(publicId) {
  assertCloudinaryConfig();
  const { cloudName, apiKey } = getCloudinaryConfig();

  if (!publicId) return;

  const timestamp = Math.floor(Date.now() / 1000);
  const paramsToSign = {
    invalidate: 'true',
    public_id: publicId,
    timestamp: String(timestamp),
  };

  const signature = signParams(paramsToSign);
  const formData = new FormData();

  formData.append('api_key', apiKey);
  formData.append('timestamp', String(timestamp));
  formData.append('public_id', publicId);
  formData.append('invalidate', 'true');
  formData.append('signature', signature);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/video/destroy`,
    {
      method: 'POST',
      body: formData,
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error?.message || 'Cloudinary no pudo borrar el audio anterior.');
  }

  return data;
}
