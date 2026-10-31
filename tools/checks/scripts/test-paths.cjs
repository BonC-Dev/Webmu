const fs = require('node:fs');
const path = require('node:path');

module.exports = function artifactPath(file) {
  if (!process.env.WEBMU_ARTIFACTS) return file;
  const target = path.join(process.env.WEBMU_ARTIFACTS, file);
  fs.mkdirSync(file.endsWith('/') ? target : path.dirname(target), { recursive: true });
  return target;
};
