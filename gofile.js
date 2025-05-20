// gofile.js
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

const GOFILE_API = 'https://api.gofile.io';

/**
 * Upload a local file to GoFile.
 * @param {string} filePath  – path to the file on disk
 * @param {string} fileName  – desired name in GoFile
 * @param {string} [token]   – optional GoFile API token for registered uploads
 * @returns {Promise<string>} the public download page URL
 */
async function upload(filePath, fileName, token) {
  // 1) Query which server to use
  const serverRes = await axios.get(`${GOFILE_API}/getServer`, {
    params: token ? { token } : {}
  });
  if (serverRes.data.status !== 'ok') {
    throw new Error('GoFile getServer error: ' + serverRes.data.message);
  }
  const server = serverRes.data.data.server; // e.g. "srv-file7"

  // 2) Build multipart upload
  const form = new FormData();
  form.append('file', fs.createReadStream(filePath), { filename: fileName });
  if (token) form.append('token', token);

  // 3) POST to the upload endpoint
  const uploadUrl = `https://${server}.gofile.io/uploadFile`;
  const uploadRes = await axios.post(uploadUrl, form, {
    headers: form.getHeaders(),
    maxContentLength: Infinity,
    maxBodyLength: Infinity
  });
  if (uploadRes.data.status !== 'ok') {
    throw new Error('GoFile upload error: ' + uploadRes.data.message);
  }

  // 4) Return the human-friendly page URL
  return uploadRes.data.data.downloadPage;
}

module.exports = { upload };
