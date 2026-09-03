import * as Comlink from 'comlink';

import { CryptoWorkerApi } from './crypto-api';

const api = new CryptoWorkerApi();

Comlink.expose(api);
