import { config } from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { showError } from '../common/utils/index';
import { startHttpServer } from '../common/utils/start-server';
import { cyan } from '../common/utils/style';

config({ quiet: true });

const { HTTP_PORT } = process.env;
const port = Number(HTTP_PORT) || 8181;

startHttpServer({ port }, function (req, res) {
  const __dirname = path.resolve(path.dirname(''));
  const file_path =
    __dirname + (req.url === '/' ? '/front/index.html' : '/front' + (req.url ?? ''));
  fs.readFile(file_path, function (err, data) {
    if (err) {
      res.writeHead(404);
      res.end(JSON.stringify(err));
      return;
    }
    res.writeHead(200);
    res.end(data);
  });
})
  .then(() => {
    console.log(cyan(`\n🚀 Server running on http://localhost:${port}\n`));
  })
  .catch(showError);
