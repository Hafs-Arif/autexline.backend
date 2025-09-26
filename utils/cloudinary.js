const cloudinary = require('cloudinary').v2;

// Configuration via CLOUDINARY_URL or individual env vars
cloudinary.config({
  secure: true,
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadImage = async (fileBufferOrPath, options = {}) => {
  const uploadOptions = {
    folder: options.folder || 'autoshop/vehicles',
    use_filename: true,
    unique_filename: false,
    overwrite: true,
    resource_type: 'image',
    ...options
  };
  const uploader = typeof fileBufferOrPath === 'string'
    ? cloudinary.uploader.upload(fileBufferOrPath, uploadOptions)
    : new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(uploadOptions, (error, result) => {
          if (error) return reject(error);
          resolve(result);
        });
        stream.end(fileBufferOrPath);
      });
  return uploader;
};

const uploadVideo = async (fileBufferOrPath, options = {}) => {
  const uploadOptions = {
    folder: options.folder || 'autoshop/vehicles',
    use_filename: true,
    unique_filename: false,
    overwrite: true,
    resource_type: 'video',
    ...options
  };
  const uploader = typeof fileBufferOrPath === 'string'
    ? cloudinary.uploader.upload(fileBufferOrPath, uploadOptions)
    : new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(uploadOptions, (error, result) => {
          if (error) return reject(error);
          resolve(result);
        });
        stream.end(fileBufferOrPath);
      });
  return uploader;
};

module.exports = { cloudinary, uploadImage, uploadVideo }; 