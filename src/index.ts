import express, { Express, Request, Response } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import RouteV1 from '@routes/v1/index';
import path from 'path';
import fs from 'fs';

dotenv.config();

const app: Express = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
const Port = process.env.PORT || 3000;
const publicFolderPath = path.resolve(__dirname, '../public');
const folder = ['./public', './public/images', './public/images/user'];
let corsOptions = {
  origin: '*',
};
app.use(cors<Request>(corsOptions));
app.use('/public', express.static(publicFolderPath));
app.use('/v1', RouteV1);

app.get('/', (req: Request, res: Response) => {
  res.send('Express + TypeScript Server');
});

const CheckFolder = (data) => {
  if (!fs.existsSync(data)) {
    fs.mkdirSync(data);
  }
};

async function init() {
  folder.map((data) => {
    CheckFolder(data);
  });
}

app.listen(Port, () => {
  console.log('express run at port: ', Port);
  init();
});
