/*
 * https://github.com/morethanwords/tweb
 * Copyright (C) 2019-2021 Eduard Kuzmenko
 * https://github.com/morethanwords/tweb/blob/master/LICENSE
 *
 * Originally from:
 * https://github.com/zhukov/webogram
 * Copyright (C) 2014 Igor Zhukov <igor.beatle@gmail.com>
 * https://github.com/zhukov/webogram/blob/master/LICENSE
 */

import type {TransportType} from '../lib/mtproto/dcConfigurator';

// FORCED HTTP-only mode for restricted network environments (proxy mode)
const forceHttpMode = true; // Always force HTTP mode

const Modes = {
  test: location.search.indexOf('test=1') > 0/*  || true */,
  debug: location.search.indexOf('debug=1') > 0,
  http: true, // FORCED: Always use HTTP
  ssl: true, // Force SSL for HTTPS-only mode
  asServiceWorker: !!import.meta.env.VITE_MTPROTO_SW,
  transport: 'https' as TransportType, // FORCED: Always use HTTPS transport
  noSharedWorker: location.search.indexOf('noSharedWorker=1') > 0,
  multipleTransports: false, // FORCED: Disable multiple transports, HTTP only
  noPfs: true || location.search.indexOf('noPfs=1') > 0
};

if(import.meta.env.VITE_MTPROTO_HAS_HTTP) {
  const httpOnly = Modes.http = location.search.indexOf('http=1') > 0;
  if(httpOnly) {
    Modes.multipleTransports = false;
  }
}

// * start with HTTP first
if(Modes.multipleTransports) {
  Modes.http = true;
}

if(Modes.http) {
  Modes.transport = 'https';
}

export default Modes;
