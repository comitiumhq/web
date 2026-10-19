import '../jitless';
import './unlock-api-error-transport';

import * as Comlink from 'comlink';

import { CryptoWorkerApi } from './crypto-api';

const api = new CryptoWorkerApi();

Comlink.expose(api);
